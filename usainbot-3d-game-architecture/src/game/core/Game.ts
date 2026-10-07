import * as THREE from "three";
import "../ui/styles.css";
import { GameLoop } from "./GameLoop";
import { Time } from "./Time";
import { InputManager } from "./input/InputManager";
import { SceneManager } from "./SceneManager";
import { DebugSystem } from "./DebugSystem";
import { HUD } from "../ui/HUD";
import type { HudState } from "../ui/HUD";
import { MenuManager } from "../ui/MenuManager";
import { SpeechBubble } from "../ui/SpeechBubble";
import { DialogueBox } from "../ui/DialogueBox";
import { Waypoint } from "../ui/Waypoint";
import { Minimap } from "../ui/map/Minimap";
import { WorldMapOverlay } from "../ui/map/WorldMapOverlay";
import { renderMapBase } from "../ui/map/MapRenderer";
import { EventBus } from "./EventBus";
import { Inventory } from "../inventory/Inventory";
import { InteractionSystem } from "../interaction/InteractionSystem";
import { GasOilService } from "../gasoil/GasOilService";
import { MissionNavigator } from "../missions/MissionNavigator";
import type { NavTarget } from "../missions/MissionNavigator";
import type { MissionScript } from "../missions/scripts/MissionScript";
import { MissionDirector } from "../missions/scripts/MissionDirector";
import { ObjectiveTracker } from "../missions/ObjectiveTracker";
import { RaceManager } from "../race/RaceManager";
import { GasOilPickups } from "../gasoil/GasOilPickups";
import type { Vehicle } from "../vehicles/VehicleManager";
import { GASOIL_ITEM, ITEMS } from "../data/items";
import { NPCS } from "../data/npcs";
import type { NPC } from "../npc/NPC";
import { GameScene } from "../scenes/GameScene";
import { World } from "../world/World";
import { Player } from "../player/Player";
import { PlayerController } from "../player/PlayerController";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { MissionManager } from "../missions/MissionManager";
import { MissionState } from "../missions/Mission";
import { NPCManager } from "../npc/NPCManager";
import { VehicleManager } from "../vehicles/VehicleManager";
import { DialogueManager } from "../dialogue/DialogueManager";
import { AudioManager } from "../audio/AudioManager";
import { SaveManager } from "../save/SaveManager";
import type { SaveData } from "../save/SaveManager";
import { gameSettings } from "../data/config";
import { defaultMissions } from "../data/missions";
import { idleTaunts, tauntSettings } from "../data/taunts";
import { disposeObject3D } from "../utils/dispose";
import { damp } from "../utils/math";
import { Renderer } from "../render/Renderer";
import { EffectsManager } from "../effects/EffectsManager";
import { QUALITY_CYCLE, QUALITY_PRESETS } from "../data/graphics";
import type { QualityName, QualityPreset } from "../data/graphics";

/**
 * Orquestador de USAINBOT.
 * Posee el renderer, los sistemas y define el orden del frame:
 *
 *   entrada → escena (lógica → física → cámara → efectos) → NPCs, carreras,
 *   objetivos → render → UI (HUD, minimapa, waypoint, diálogos)
 *
 * main.ts solo llama a `new Game(container)` y `game.start()`.
 */
export class Game {
  readonly time = new Time();
  readonly bus = new EventBus();
  readonly input = new InputManager();
  readonly scenes = new SceneManager();
  readonly missions = new MissionManager();
  readonly npcs = new NPCManager();
  readonly vehicles = new VehicleManager();
  readonly dialogue = new DialogueManager();
  readonly audio = new AudioManager();
  readonly save = new SaveManager();
  readonly interaction = new InteractionSystem();
  readonly inventory = new Inventory(this.bus);
  readonly races = new RaceManager(this.bus);
  readonly hud = new HUD();
  readonly menu = new MenuManager();
  readonly debug = new DebugSystem();
  readonly bubble = new SpeechBubble();
  readonly dialogueBox = new DialogueBox(this.dialogue);
  readonly waypoint = new Waypoint();
  readonly world: World;
  readonly player: Player;
  readonly controller: PlayerController;
  readonly cameraRig: ThirdPersonCamera;
  readonly gasoil: GasOilService;
  readonly tracker: ObjectiveTracker;
  readonly navigator: MissionNavigator;
  readonly pickups: GasOilPickups;
  readonly minimap: Minimap;
  readonly worldMap: WorldMapOverlay;
  readonly effects: EffectsManager;
  private scripts: MissionScript[] = [new MissionDirector()];

  private container: HTMLElement;
  private renderer: Renderer;
  private gameScene: GameScene;
  private sprintFx = 0;
  private camera: THREE.PerspectiveCamera;
  private loop: GameLoop;
  private paused = false;
  private started = false;
  private announced = false;
  private disposed = false;
  private tauntIndex = 0;
  private tauntShownAt = -1;
  private headTop = new THREE.Vector3();
  private talkingTo: NPC | null = null;
  private zoneId = "";
  private navTarget: NavTarget | null = null;
  private lockLostAt = -1;
  private lastDriveMode = "on_foot";
  private wheelL = new THREE.Vector3();
  private skidA = new THREE.Vector3();
  private skidB = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.container = container;

    // --- Render: pipeline HDR + calidad gráfica (ver render/Renderer.ts)
    this.renderer = new Renderer(container);
    const c = gameSettings.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, container.clientWidth / Math.max(1, container.clientHeight), c.near, c.far);

    // --- Mundo: primer barrio + jugador en su dormitorio (apoyado en el suelo real)
    const root = new THREE.Scene();
    this.world = new World(root);
    this.player = new Player();
    this.player.teleport(this.world.spawn.position.x, this.world.spawn.position.z, this.world.spawn.yaw, this.world.groundAt);
    root.add(this.player.root, this.waypoint.beacon, this.races.gates.group);
    this.cameraRig = new ThirdPersonCamera(this.camera);
    this.controller = new PlayerController(this.player, this.input, this.cameraRig, (action) => this.onPlayerAction(action));

    this.effects = new EffectsManager(root, this.camera);
    const scene = new GameScene(root, this.world, this.player, this.controller, this.cameraRig, this.input, this.effects);
    this.gameScene = scene;
    this.scenes.register(scene);
    this.renderer.onQualityChange = (name, preset) => this.applyQuality(name, preset);
    this.applyQuality(this.renderer.qualityName, this.renderer.qualityPreset);

    // --- NPCs (pisan el suelo real y colisionan) + vehículo del garaje
    this.npcs.ground = this.world.groundAt;
    this.npcs.spawnAll(NPCS, root, this.world.pois);
    for (const npc of this.npcs.all()) {
      this.interaction.register({
        id: `talk_${npc.data.id}`,
        position: npc.position,
        radius: 2.6,
        prompt: () => `Hablar con ${npc.data.name}`,
        interact: () => this.talkTo(npc),
      });
    }
    // Vehículos: sistema independiente (VehicleManager + VehicleController)
    const notifyV = (text: string, kind: "info" | "success" | "warn" = "info"): void => this.hud.toast(text, kind);
    const vehicleObstacles = [...this.world.getColliders(), ...this.npcs.colliders];
    this.vehicles.init({
      player: this.player,
      input: this.input,
      bus: this.bus,
      obstacles: () => vehicleObstacles,
      bounds: this.world.bounds,
      ground: this.world.groundAt,
      notify: notifyV,
    });
    this.vehicles.spawnInGarage(root, this.interaction, this.world.pois, { openGarage: (v) => this.openGarage(v) });
    scene.playerColliders = [...this.world.getColliders(), ...this.npcs.colliders, ...this.vehicles.colliders];
    const vm = this.vehicles;
    scene.vehicle = {
      get busy() {
        return vm.busy;
      },
      update: (dt, locked) => vm.update(dt, locked),
      camera: () => {
        const v = vm.active;
        // Cámara de conducción desde que se sienta hasta que termina de bajar
        if (!v || vm.mode === "on_foot" || (vm.mode === "entering" && !this.player.inVehicle)) return null;
        return { target: v.position, yaw: v.yaw, speedRatio: Math.min(1, Math.abs(v.speed) / v.data.handling.maxSpeed) };
      },
    };
    this.dialogue.onChange((speaker) => {
      if (speaker === null && this.talkingTo) {
        const npc = this.talkingTo;
        npc.talking = false;
        this.talkingTo = null;
        this.bus.emit("npc:talkEnd", { npcId: npc.data.id });
      }
    });

    // --- GasOil (máquinas, latas sueltas, beber) + misiones + carreras
    const notify = (text: string, kind: "info" | "success" | "warn" = "info"): void => this.hud.toast(text, kind);
    this.gasoil = new GasOilService(this.bus, this.inventory, this.player, notify);
    this.gasoil.registerMachines(this.world.machines, this.interaction);
    this.pickups = new GasOilPickups(this.inventory, this.world.pois, this.world.groundAt, () => {
      this.audio.playSfx("pickup");
      notify("+1 GASOIL · pulsa G para beberlo", "success");
    });
    root.add(this.pickups.group);
    const L = MissionState.Locked;
    this.missions.loadFromData(defaultMissions, { mission_002: L, mission_003: L, mission_004: L, mission_005: L, mission_006: L });
    this.races.attachPOIs(this.world.pois);
    this.tracker = new ObjectiveTracker({
      bus: this.bus,
      missions: this.missions,
      player: this.player,
      inventory: this.inventory,
      pois: this.world.pois,
      races: this.races,
      npcPosition: (id) => this.npcs.get(id)?.position ?? null,
      npcName: (id) => this.npcs.get(id)?.data.name ?? id,
      vehicle: () => {
        const v = this.vehicles.active ?? this.vehicles.current;
        return {
          inVehicle: this.vehicles.inVehicle,
          speed: this.vehicles.inVehicle && v ? v.speed : 0,
          position: this.player.root.position,
          id: v?.data.id ?? "",
          poi: `vehicle_${this.vehicles.currentId}`,
        };
      },
      placePlayer: (x, z, yaw) => {
        this.player.teleport(x, z, yaw, this.world.groundAt);
        this.cameraRig.reset(yaw);
      },
      notify,
    });
    this.navigator = new MissionNavigator(this.missions, this.world.pois, this.tracker);
    for (const script of this.scripts) {
      script.attach({
        bus: this.bus,
        missions: this.missions,
        dialogue: this.dialogue,
        inventory: this.inventory,
        pois: this.world.pois,
        notify,
        celebrate: (title, sub) => this.hud.banner(title, sub),
      });
    }
    this.wireFeedback();
    this.debug.onMessage = (text, kind) => this.hud.postMessage(text, kind);

    // --- UI
    const MAP_PPM = 2;
    const mapBase = renderMapBase(this.world.map, MAP_PPM);
    this.minimap = new Minimap(this.world.map, this.world.pois, mapBase, MAP_PPM);
    this.worldMap = new WorldMapOverlay(this.world.map, this.world.pois, mapBase, MAP_PPM);
    this.hud.mount(container);
    this.minimap.mount(container);
    this.waypoint.mount(container);
    this.bubble.mount(container);
    this.dialogueBox.mount(container);
    this.worldMap.mount(container);
    this.menu.mount(container);
    this.debug.mount(container);
    this.menu.onActivate = () => this.resume();

    // --- Eventos
    this.input.attach(this.renderer.domElement);
    this.input.onGamepadChange = (connected) => this.debug.log(connected ? "Mando conectado" : "Mando desconectado");
    window.addEventListener("resize", this.onResize);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    this.renderer.domElement.addEventListener("pointerdown", this.onCanvasPointer);

    this.loop = new GameLoop(this.time, this.onFrame);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.scenes.setActive(GameScene.NAME);
    this.paused = true;
    this.menu.showStart();
    this.debug.log(`Barrio cargado: ${this.world.zones.length} zonas · ${this.npcs.count} vecinos.`);
    this.loop.start();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private resume(): void {
    this.audio.unlock();
    this.paused = false;
    this.menu.hide();
    this.renderer.resetPerformance();
    if (gameSettings.camera.mouseLook) this.input.requestPointerLock();
    if (!this.announced) {
      this.announced = true;
      this.hud.showZone("MANSIÓN USAINBOT");
      this.hud.toast("Sal de casa: Tito Tuercas te espera en el garaje", "info");
    }
  }

  private pause(): void {
    this.paused = true;
    this.audio.setTurbo(0);
    this.input.releasePointerLock();
    const gasoil = this.inventory.count(GASOIL_ITEM);
    this.menu.showPause(
      `<div class="ub-menu__inventory"><b>INVENTARIO</b><span>GASOIL ×${gasoil}</span><span>TURBO ${Math.round(this.player.stats.turbo)}%</span><span>₲ ${this.inventory.money}</span></div>`
    );
  }

  private onCanvasPointer = (): void => {
    this.audio.unlock();
    if (gameSettings.camera.mouseLook && !this.paused && !this.menu.visible) this.input.requestPointerLock();
  };

  /** Al perder la captura del ratón (ESC del navegador) en pleno juego → pausa. */
  private onPointerLockChange = (): void => {
    if (!gameSettings.camera.mouseLook) return;
    if (this.input.pointerLocked || this.paused || this.menu.visible || this.worldMap.open) return;
    this.lockLostAt = performance.now();
    this.pause();
  };

  /** Acciones del jugador que no son movimiento (E, G, SHIFT sin turbo). */
  private onPlayerAction(action: string): void {
    if (action === "interact") {
      if (this.interaction.tryInteract()) this.audio.playSfx("interact");
    } else if (action === "drink") {
      const result = this.gasoil.drink();
      if (result === "no_gasoil" || result === "turbo_full") this.audio.playSfx("deny");
    } else if (action === "turbo_empty") {
      this.hud.denyTurbo();
      this.audio.playSfx("deny");
      this.bus.emit("turbo:denied", {});
    }
  }

  /** Sonido, partículas y HUD conectados a los eventos del juego. */
  private wireFeedback(): void {
    const bus = this.bus;
    this.player.model.onDrinkMoment = (m) => {
      this.audio.playSfx(m === "open" ? "can_open" : m);
    };
    bus.on("gasoil:drink", () => {
      this.hud.flashTurbo();
      this.effects.energyBurst(this.player.root.position);
    });
    bus.on("machine:used", () => this.audio.playSfx("buy"));
    bus.on("race:countdown", (e) => {
      this.audio.playSfx(e.value > 0 ? "countdown" : "go");
      if (e.value === 0 && gameSettings.camera.mouseLook) this.input.requestPointerLock();
    });
    bus.on("race:checkpoint", () => this.audio.playSfx("checkpoint"));
    bus.on("race:finish", (e) => {
      this.audio.playSfx(e.success ? "win" : "fail");
      this.hud.banner(e.success ? "¡CARRERA COMPLETADA!" : "CARRERA FALLIDA", e.success ? `Tiempo ${fmt(e.time)}` : "Vuelve a la salida y reinténtalo");
    });
    // Recompensas y desbloqueos (genérico para todas las misiones)
    this.missions.onChange((change) => {
      if (change.next === MissionState.Completed) {
        const m = change.mission;
        this.inventory.addMoney(m.reward);
        for (const id of m.data.unlocks ?? []) this.missions.unlock(id);
        this.hud.banner("¡MISIÓN COMPLETADA!", `${m.title} · +${m.reward} ₲`);
        this.audio.playSfx("mission");
        this.debug.log(`Misión completada: ${m.title}`, "success");
      }
      this.refreshGiverMarkers();
    });
    this.refreshGiverMarkers();
  }

  /** El "!" solo aparece en NPCs con una misión disponible o en curso. */
  private refreshGiverMarkers(): void {
    for (const poi of this.world.pois.byCategory("MISSION_NPC")) {
      poi.hidden = !this.missions
        .all()
        .some((m) => m.giver === poi.id && (m.state === MissionState.Available || m.state === MissionState.Active));
    }
  }

  private openGarage(vehicle: Vehicle): void {
    if (this.dialogue.active) return;
    const d = vehicle.data;
    const h = d.handling;
    this.dialogue.open({
      speaker: "GARAJE USAINBOT",
      lines: [
        `Vehículo actual: ${d.name}. ${d.description}`,
        `Velocidad máx.: ${Math.round(h.maxSpeed * 3.6)} km/h · Aceleración: ${h.acceleration} · Agarre: ${h.grip}.`,
        d.drivable ? "Listo para salir: acércate a la puerta y pulsa E. Selección de vehículo, mejoras y pintura: próximamente." : "Conducción: PRÓXIMAMENTE.",
        { speaker: "UsainBot", text: "Total, corriendo llego antes." },
      ],
    });
  }

  /** Habla con un NPC: primero el director de misiones, si no, sus frases. */
  private talkTo(npc: NPC): void {
    if (this.dialogue.active || this.player.isDrinking) return;
    this.talkingTo = npc;
    npc.talking = true;
    this.bus.emit("npc:talk", { npcId: npc.data.id });
    for (const script of this.scripts) {
      if (script.handleTalk(npc.data.id, npc.data.name)) return;
    }
    const lines = npc.data.lines;
    const line = lines[Math.floor(Math.random() * lines.length)] ?? "…";
    this.dialogue.open({ speaker: npc.data.name, lines: [line] });
  }

  /** Frame principal: orden fijo, sin lógica suelta. */
  private onFrame = (dt: number): void => {
    // 0. Entrada: menús, mapa, diálogo, ayuda
    this.input.poll();
    if (this.input.wasPressed("debug")) this.debug.toggle();
    if (this.input.wasPressed("quality")) this.cycleQuality();
    if (this.input.wasPressed("help")) this.hud.toggleHelp();

    // ESC justo después de perder la captura del ratón ya pausó: no des-pausar
    const escEcho = performance.now() - this.lockLostAt < 350;
    const pausePressed = this.input.wasPressed("pause") && !escEcho;
    const inDialogue = this.dialogue.active;
    let skipGameplay = this.paused;
    if (this.menu.visible) {
      if (this.input.wasPressed("confirm") || pausePressed) this.resume();
      skipGameplay = true; // no consumir el SPACE del menú como salto
    } else if (this.worldMap.open) {
      if (this.input.wasPressed("map") || pausePressed) this.worldMap.toggle(false);
      skipGameplay = true;
    } else if (inDialogue) {
      if (this.input.wasPressed("interact") || this.input.wasPressed("confirm")) this.dialogueBox.press();
    } else if (pausePressed) {
      this.pause();
      skipGameplay = true;
    } else if (this.input.wasPressed("map")) {
      this.worldMap.toggle(true);
      skipGameplay = true;
    }
    this.gameScene.controlsLocked = inDialogue || this.dialogue.active || this.races.locksControls;

    // 1. Mundo (la escena organiza: lógica → física → cámara → efectos)
    const pos = this.player.root.position;
    const p = this.player;
    if (!skipGameplay) {
      this.scenes.active?.update(dt);
      const car = this.vehicles.active;
      this.npcs.update(dt, pos, this.vehicles.busy, car ? Math.abs(car.speed) : 0);
      this.pickups.update(dt, pos);
      this.races.update(dt, pos, { inVehicle: this.vehicles.busy, turboActive: p.turboActive });
      this.tracker.update(dt);
      this.missions.update(dt);
      this.vehicles.updateParked(dt);
      this.updateVehicleFeedback(dt);
      this.dialogueBox.update(dt);
      if (!this.dialogue.active && !p.isDrinking && !this.vehicles.busy) this.interaction.update(pos, p.yaw);
      else this.interaction.current = null;
      this.updateZone();
      if (p.justTurboStarted) this.audio.playSfx("turbo_start");
    }
    this.audio.setTurbo(!skipGameplay && p.turboActive ? Math.min(1, p.speed / 17) : 0);
    this.navTarget = this.navigator.current();

    // 2. Render (sensación de velocidad según el turbo)
    const turboTarget = !skipGameplay && p.turboActive && p.state === "run"
      ? Math.min(1, p.speed / (p.stats.base.maxSpeed * p.stats.values.sprintMultiplier))
      : 0;
    this.sprintFx = damp(this.sprintFx, turboTarget, turboTarget > this.sprintFx ? 4 : 6, dt);
    const scene = this.scenes.active;
    if (scene) this.renderer.render(scene.root, this.camera, dt, { speed: this.sprintFx });

    // 3. UI
    if (!skipGameplay) {
      const dropped = this.renderer.trackPerformance(dt);
      if (dropped) this.debug.log(`Rendimiento bajo: calidad → ${QUALITY_PRESETS[dropped].label}`, "warn");
    }
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const target = this.navTarget;
    this.waypoint.update(dt, target, pos, this.camera, this.cameraRig.yaw, w, h, !this.paused && !this.worldMap.open);
    this.minimap.update(pos, p.yaw, this.cameraRig.yaw, target?.poi ?? null, this.races.route(), this.vehicles.busy);
    const zoneName = this.world.zoneAt(pos.x, pos.z)?.name ?? "Calles del barrio";
    this.worldMap.update(pos, p.yaw, target?.poi ?? null, target?.label ?? "", zoneName, this.vehicles.busy);
    this.debug.update(dt, this.renderer.gl, this.player, this.scenes, this.missions, this.paused, this.inputLabel(), [
      `GRAFICOS   ${this.renderer.qualityPreset.label} (F3)`,
      `ZONA       ${zoneName}`,
      `ESTADO     ${p.status} · ${this.vehicles.mode}`,
      `SUELO      y=${p.groundHeight.toFixed(3)} pies=${pos.y.toFixed(3)}`,
      `TURBO      ${p.stats.turbo.toFixed(0)}${p.turboActive ? " ACTIVO" : ""}`,
      `OBJETIVO   ${target ? `${target.poi.id} ${Math.round(target.poi.position.distanceTo(pos))}m` : "—"}`,
    ]);
    this.hud.update(dt, this.buildHudState(skipGameplay), !skipGameplay);
    this.updateTaunt();
    this.input.endFrame();
  };

  /**
   * Coche: F para salir, G bloqueado (GasOil solo a pie), motor, derrapes,
   * choques y sonidos de puerta al cambiar de modo.
   */
  private updateVehicleFeedback(dt: number): void {
    const vm = this.vehicles;
    const v = vm.active;
    if (vm.mode !== this.lastDriveMode) {
      if (vm.mode === "entering" || vm.mode === "exiting") this.audio.playSfx("door");
      if (vm.mode === "driving" && this.lastDriveMode === "entering") this.audio.playSfx("engine_start");
      this.lastDriveMode = vm.mode;
    }
    if (vm.mode === "driving" && !this.dialogue.active) {
      if (this.input.wasPressed("exitVehicle")) vm.requestExit();
      if (this.input.wasPressed("drink")) {
        this.hud.toast("GasOil solo a pie: aparca y baja (F)", "warn");
        this.audio.playSfx("deny");
      }
      if (this.input.wasPressed("turbo")) this.hud.denyTurbo();
    }
    this.audio.setEngine(v && vm.mode !== "on_foot" ? Math.min(1, Math.abs(v.speed) / v.data.handling.maxSpeed) : null);
    if (v && vm.mode === "driving") {
      if (v.skidding || (v.braking && Math.abs(v.speed) > 8)) {
        v.localPoint(this.wheelL.set(0.95, 0.1, -1.45), this.skidA);
        v.localPoint(this.wheelL.set(-0.95, 0.1, -1.45), this.skidB);
        this.effects.skid(dt, this.skidA, this.skidB);
      }
      const impact = vm.consumeImpact();
      if (impact > 0) {
        this.cameraRig.shake(Math.min(1, impact / 14));
        this.audio.playSfx("crash");
        v.localPoint(this.wheelL.set(0, 0.5, 2.3), this.skidA);
        this.effects.crash(this.skidA);
      }
    }
  }

  /** Datos de partida listos para guardar (el sistema definitivo llegará más adelante). */
  createSaveData(): Omit<SaveData, "savedAt"> {
    const p = this.player;
    const veh = this.vehicles.serialize();
    const missions: SaveData["missions"] = {};
    for (const m of this.missions.all()) missions[m.id] = { state: m.state, objective: m.currentObjective?.id ?? null };
    return {
      version: 2,
      money: this.inventory.money,
      inventory: this.inventory.serialize().items,
      missions,
      completedMissions: this.missions.all().filter((m) => m.state === MissionState.Completed).map((m) => m.id),
      player: {
        mode: veh.playerInVehicle ? "in_vehicle" : "on_foot",
        position: [p.root.position.x, p.root.position.y, p.root.position.z],
        yaw: p.yaw,
        stats: p.stats.serialize(),
      },
      vehicle: { current: veh.current, position: veh.position, yaw: veh.yaw },
      upgrades: {},
    };
  }

  private updateZone(): void {
    const pos = this.player.root.position;
    const zone = this.world.zoneAt(pos.x, pos.z);
    const id = zone?.id ?? "streets";
    this.minimap.setZone((zone?.name ?? "Calles del barrio").toUpperCase());
    if (id === this.zoneId) return;
    const first = this.zoneId === "";
    this.zoneId = id;
    if (!first && zone) this.hud.showZone(zone.name.toUpperCase());
  }

  /** Bocadillo chulesco cuando UsainBot se queda posando (como en la ilustración). */
  private updateTaunt(): void {
    const idle = this.player.state === "idle" ? this.player.model.idleSeconds : 0;
    if (this.paused || this.dialogue.active || this.worldMap.open || this.races.active || idle < tauntSettings.delay) {
      if (this.tauntShownAt >= 0) {
        this.tauntShownAt = -1;
        this.tauntIndex = (this.tauntIndex + 1) % idleTaunts.length;
        this.bubble.hide();
      }
      return;
    }
    if (this.tauntShownAt < 0) {
      this.tauntShownAt = idle;
    } else if (idle - this.tauntShownAt > tauntSettings.duration) {
      this.tauntShownAt = idle;
      this.tauntIndex = (this.tauntIndex + 1) % idleTaunts.length;
    }
    this.bubble.show(idleTaunts[this.tauntIndex]);
    this.player.model.getHeadTop(this.headTop);
    this.bubble.follow(this.headTop, this.camera, this.container.clientWidth, this.container.clientHeight);
  }

  private cycleQuality(): void {
    const i = QUALITY_CYCLE.indexOf(this.renderer.qualityName);
    const next = QUALITY_CYCLE[(i + 1) % QUALITY_CYCLE.length];
    this.renderer.setQuality(next, true);
    this.debug.log(`Calidad gráfica: ${QUALITY_PRESETS[next].label}`, "success");
  }

  /** Propaga la calidad a los sistemas que dependen de ella (sombras, efectos). */
  private applyQuality(_name: QualityName, preset: QualityPreset): void {
    this.world.environment.setShadowQuality(preset.shadowMapSize, preset.shadowRadius, preset.shadowExtent);
    this.gameScene.effectFlags = { trails: preset.trails, dust: preset.dust };
  }

  private inputLabel(): string {
    if (this.input.activeDevice === "gamepad") return "MANDO";
    return gameSettings.camera.mouseLook ? "TECLADO + RATÓN" : "TECLADO (cámara con flechas)";
  }

  private buildHudState(skipGameplay: boolean): HudState {
    const mission = this.missions.active ?? this.missions.firstAvailable();
    const p = this.player;
    const current = this.interaction.current;
    const target = this.navTarget;
    const giver = mission?.giver ? this.npcs.get(mission.giver)?.data.name : null;
    return {
      speed: p.speed,
      state: p.state,
      turbo: p.stats.turbo / p.stats.maxTurbo,
      turboActive: p.turboActive,
      money: this.inventory.money,
      gasoil: this.inventory.count(GASOIL_ITEM),
      missionTitle: mission ? mission.title : null,
      missionState: mission ? mission.state : null,
      objective: this.missions.active?.currentObjective?.description ?? (mission && giver ? `Habla con ${giver}` : null),
      objectiveDistance: target ? Math.hypot(target.poi.position.x - p.root.position.x, target.poi.position.z - p.root.position.z) : null,
      prompt: !skipGameplay && !this.dialogue.active && current ? current.prompt() : null,
      device: this.input.activeDevice,
      race: this.races.hud(p.root.position),
      mode: this.vehicles.busy ? "vehicle" : "foot",
      vehicleName: this.vehicles.active?.data.name ?? null,
      vehicleSpeed: this.vehicles.active?.speed ?? 0,
    };
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.resize();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Limpieza completa (se llama al desmontar la app). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.audio.stopMusic();
    this.input.releasePointerLock();
    this.input.detach();
    this.bus.clear();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.renderer.domElement.removeEventListener("pointerdown", this.onCanvasPointer);
    this.hud.dispose();
    this.minimap.dispose();
    this.worldMap.dispose();
    this.waypoint.dispose();
    this.dialogueBox.dispose();
    this.bubble.dispose();
    this.menu.dispose();
    this.debug.dispose();
    const scene = this.scenes.active;
    if (scene) disposeObject3D(scene.root);
    this.renderer.dispose();
  }
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, "0")}:${(t - m * 60).toFixed(2).padStart(5, "0")}`;
}

/** Referencia para el garaje/tienda futura (precio y datos de la lata). */
export const GASOIL_DATA = ITEMS[GASOIL_ITEM];
