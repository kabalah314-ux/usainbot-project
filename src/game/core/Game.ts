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
import { TimeOfDay } from "../world/TimeOfDay";
import { buildPedGraph } from "../world/nav/PedGraph";
import { ROADS } from "../data/cityLayout";
import { PedestrianManager } from "../npc/PedestrianManager";
import { TrafficManager } from "../traffic/TrafficManager";
import type { TrafficCar } from "../traffic/TrafficManager";
import { BarkSystem } from "../ui/BarkSystem";
import { ReactionSystem } from "../life/ReactionSystem";
import { EventManager } from "../life/EventManager";
import { createAmbientEvents } from "../life/events";
import { AmbientManager } from "../audio/AmbientManager";
import { BARKS } from "../data/life";
import { MISSION_TYPE_STYLE, missionIconSVG } from "../data/missionTypes";
import { GiverMarkers, ObjectiveProp, WorldPrompt } from "../ui/WorldMarkers";
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
  // --- Fase 7: marcadores de misión en el mundo e indicador de interacción
  giverMarkers!: GiverMarkers;
  readonly worldPrompt = new WorldPrompt();
  readonly objectiveProp = new ObjectiveProp();
  // --- Ciudad viva
  readonly timeOfDay = new TimeOfDay();
  readonly barks = new BarkSystem();
  readonly reactions = new ReactionSystem(this.barks);
  readonly ambient = new AmbientManager(this.audio);
  peds!: PedestrianManager;
  traffic!: TrafficManager;
  events!: EventManager;
  private walkers: THREE.Vector3[] = [];
  private lifeNPCs: NPC[] = [];
  private lifeTime = 0;
  private hornAnchor = new THREE.Vector3();

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
    root.add(this.player.root, this.waypoint.beacon, this.races.gates.group, this.objectiveProp.group);
    this.giverMarkers = new GiverMarkers(root);
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
    // --- Ciudad viva: peatones (grafo de aceras) y tráfico (bucles por carril)
    const graph = buildPedGraph(ROADS, this.world.machines);
    this.peds = new PedestrianManager(graph, root, this.world.groundAt, (id) => this.npcs.get(id));
    for (const ped of this.peds.peds) {
      const npc = ped.npc;
      this.interaction.register({
        id: `talk_${npc.data.id}`,
        position: npc.position,
        radius: 2.2,
        prompt: () => `Hablar con ${npc.data.name}`,
        enabled: () => npc.root.visible && !npc.claimed,
        interact: () => this.talkTo(npc),
      });
    }
    this.traffic = new TrafficManager(root, this.world.groundAt);

    // Vehículos: sistema independiente (VehicleManager + VehicleController)
    const notifyV = (text: string, kind: "info" | "success" | "warn" = "info"): void => this.hud.toast(text, kind);
    const vehicleObstacles = [...this.world.getColliders(), ...this.npcs.colliders, ...this.traffic.colliders];
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
    scene.playerColliders = [...this.world.getColliders(), ...this.npcs.colliders, ...this.vehicles.colliders, ...this.traffic.colliders];
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
    // Progresión clara: solo tres misiones al principio; el resto se
    // desbloquea al completarlas (campo `unlocks` de cada misión).
    this.missions.loadFromData(defaultMissions, {
      mission_002: L, mission_003: L, mission_004: L, mission_005: L, mission_006: L,
      mission_008: L, mission_009: L, mission_010: L, mission_012: L, mission_013: L, mission_014: L,
    });
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
        // Carrera en coche: se coloca el coche (con el jugador dentro) en la salida
        if (this.vehicles.inVehicle) this.vehicles.placeActive(x, z, yaw);
        else this.player.teleport(x, z, yaw, this.world.groundAt);
        this.cameraRig.reset(yaw);
      },
      notify,
    });
    this.navigator = new MissionNavigator(this.missions, this.world.pois, this.tracker, this.races);
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
    // Los mensajes técnicos van al panel de debug (no a la pantalla del jugador)
    this.debug.onMessage = null;

    // --- Microeventos, llamadas de NPCs y hora del día
    this.events = new EventManager({
      player: this.player,
      vehicles: this.vehicles,
      peds: this.peds,
      traffic: this.traffic,
      barks: this.barks,
      interaction: this.interaction,
      inventory: this.inventory,
      races: this.races,
      pois: this.world.pois,
      gasoil: this.gasoil,
      bus: this.bus,
      missions: this.missions,
      machines: this.world.machines,
      graph,
      notify,
      sfx: (name) => this.audio.playSfx(name),
      puff: (at) => this.effects.puff(at),
    });
    for (const ev of createAmbientEvents()) this.events.register(ev);
    this.reactions.callouts.push({
      npcId: "npc_chispa",
      text: "¡Eh, tú! ¡El robot rápido! ¡Ven aquí!",
      radius: 14,
      cooldown: 30,
      last: -1e9,
      condition: () => this.missions.get("mission_007")?.state === MissionState.Available && !this.missions.active,
    });
    this.applyTimeOfDay();
    this.timeOfDay.onPhaseChange = (phase) => {
      this.applyTimeOfDay();
      const info = this.timeOfDay.info;
      this.hud.toast(phase === "NIGHT" ? `${info.icon} Se hace de noche: menos gente y más robots` : `${info.icon} ${info.label}`, "info");
    };

    // --- UI
    const MAP_PPM = 1.5;
    const mapBase = renderMapBase(this.world.map, MAP_PPM);
    this.minimap = new Minimap(this.world.map, this.world.pois, mapBase, MAP_PPM);
    this.worldMap = new WorldMapOverlay(this.world.map, this.world.pois, mapBase, MAP_PPM);
    this.hud.mount(container);
    this.minimap.mount(container);
    this.waypoint.mount(container);
    this.bubble.mount(container);
    this.barks.mount(container);
    this.dialogueBox.mount(container);
    this.worldPrompt.mount(container);
    this.worldMap.mount(container);
    this.menu.mount(container);
    this.debug.mount(container);
    this.menu.onActivate = (slot: string) => {
      const loaded = this.save.login(slot || "jugador");
      this.hud.toast(loaded ? `Sesión "${this.save.activeSlot}" cargada` : `Sesión "${slot || "jugador"}" iniciada`, "success");
      this.resume();
    };
    this.save.attach(
      () => this.createSaveData(),
      (data) => this.restoreSave(data)
    );

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
    // Continúa la última sesión de este navegador (o empieza una nueva)
    const last = this.save.lastSlot();
    this.menu.showStart(last ?? "jugador", this.save.hasSave(last ?? "jugador"));
    this.debug.log(`Barrio cargado: ${this.world.zones.length} zonas · ${this.npcs.count} vecinos.`);
    this.loop.start();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Restaura una partida guardada (dinero, inventario, misiones, posiciones). */
  private restoreSave(data: SaveData): void {
    this.inventory.addMoney(data.money - this.inventory.money);
    for (const [item, n] of Object.entries(data.inventory ?? {})) {
      const have = this.inventory.count(item);
      if (n > have) this.inventory.add(item, n - have);
      else if (n < have) this.inventory.remove(item, have - n);
    }
    for (const [id, m] of Object.entries(data.missions ?? {})) {
      const mission = this.missions.get(id);
      if (!mission) continue;
      const state = m.state as MissionState;
      if (state === MissionState.Completed) mission.setState(MissionState.Completed);
      else if (state === MissionState.Locked) mission.setState(MissionState.Locked);
    }
    const v = data.vehicle;
    const car = this.vehicles.get(v?.current ?? this.vehicles.currentId);
    if (car && v) {
      this.vehicles.currentId = car.data.id;
      car.position.set(v.position[0], this.world.groundAt(v.position[0], v.position[2]), v.position[2]);
      car.yaw = v.yaw;
      car.updateVisuals(0);
    }
    const p = data.player;
    if (p) {
      this.player.teleport(p.position[0], p.position[2], p.yaw, this.world.groundAt);
      this.player.stats.restore(p.stats ?? {});
    }
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
      `<div class="ub-menu__inventory"><b>INVENTARIO</b><span>GASOIL ×${gasoil}</span><span>TURBO ${Math.round(this.player.stats.turbo)}%</span><span>₲ ${this.inventory.money}</span></div>` +
        this.missionListHTML()
    );
  }

  /** Lista de misiones (pausa) con el icono y color de cada tipo. */
  private missionListHTML(): string {
    const order = { ACTIVE: 0, AVAILABLE: 1, COMPLETED: 2, FAILED: 3, LOCKED: 4 } as Record<string, number>;
    const label: Record<string, string> = { ACTIVE: "EN CURSO", AVAILABLE: "DISPONIBLE", COMPLETED: "COMPLETADA", FAILED: "FALLIDA" };
    const list = this.missions
      .all()
      .filter((m) => m.state !== MissionState.Locked)
      .sort((a, b) => order[a.state] - order[b.state]);
    const locked = this.missions.all().length - list.length;
    const rows = list
      .map((m) => {
        const st = MISSION_TYPE_STYLE[m.data.missionType];
        const giver = m.giver ? (this.npcs.get(m.giver)?.data.name ?? "") : "";
        return `<li class="ub-mlist__row ub-mlist__row--${m.state.toLowerCase()}" style="--mt:${st.color}">
          <span class="ub-mlist__icon">${missionIconSVG(m.data.missionType, 15)}</span>
          <span class="ub-mlist__title">${m.title}</span>
          <span class="ub-mlist__type">${st.short}</span>
          <span class="ub-mlist__giver">${giver}</span>
          <span class="ub-mlist__state">${label[m.state] ?? m.state}</span>
        </li>`;
      })
      .join("");
    return `<div class="ub-mlist"><b>MISIONES</b><ul>${rows}</ul>${locked > 0 ? `<em>+${locked} por desbloquear</em>` : ""}</div>`;
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
      const m = this.missions
        .all()
        .find((x) => x.giver === poi.id && (x.state === MissionState.Available || x.state === MissionState.Active));
      poi.hidden = !m;
      // El marcador del NPC toma el color/icono del tipo de su misión (AZUL = coche)
      poi.missionType = m?.data.missionType;
    }
  }

  /** "[E] ENTRAR" sobre el coche (u otro objeto con indicador) si es el objetivo de interacción. */
  private updateWorldPrompt(w: number, h: number, skipGameplay: boolean): void {
    const cur = this.interaction.current;
    const show = !skipGameplay && !this.dialogue.active && !this.vehicles.busy && !!cur?.worldLabel;
    this.worldPrompt.update(show && cur ? (cur.anchor ?? cur.position) : null, cur?.anchorHeight ?? 2.2, cur?.worldLabel?.() ?? "", this.camera, w, h);
    const obj = this.tracker.objective;
    this.objectiveProp.update(0.016, obj, obj ? this.inventory.has(obj.data.item ?? "", obj.data.count ?? 1) : false, (x, z) => this.world.groundAt(x, z));
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
      if (this.input.wasPressed("confirm") || pausePressed) this.menu.activate();
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
      this.updateLife(dt, pos, car ? Math.abs(car.speed) : 0);
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
    this.minimap.update(
      pos,
      p.yaw,
      this.cameraRig.yaw,
      target?.poi ?? null,
      this.races.route(),
      this.vehicles.busy,
      target?.missionType ?? null,
      this.races.race?.mode === "vehicle"
    );
    // El mapa se lee por BARRIOS (distritos), no por zonas internas.
    const zoneName = this.world.districtAt(pos.x, pos.z)?.name ?? "Calles del barrio";
    this.worldMap.update(pos, p.yaw, target?.poi ?? null, target?.label ?? "", zoneName, this.vehicles.busy, target?.missionType ?? null);
    this.updateWorldPrompt(w, h, skipGameplay);
    this.giverMarkers.update(dt, this.world.pois, (id) => this.npcs.get(id) ?? null, pos, this.paused);
    this.barks.update(dt, this.camera, w, h, this.paused || this.worldMap.open);
    this.debug.update(dt, this.renderer.gl, this.player, this.scenes, this.missions, this.paused, this.inputLabel(), [
      `GRAFICOS   ${this.renderer.qualityPreset.label} (F3)`,
      `ZONA       ${zoneName}`,
      `ESTADO     ${p.status} · ${this.vehicles.mode}`,
      `VEHÍCULO   ${this.vehicles.current?.data.name ?? "—"}${this.vehicles.inVehicle ? ` · ${Math.round(Math.abs(this.vehicles.active?.speed ?? 0) * 3.6)} km/h` : ""}`,
      `OBJ.MODO   ${this.missions.active ? this.tracker.requiredModeOf() : "—"} · ${this.missions.active?.data.missionType ?? "—"}`,
      `GASOIL     ×${this.inventory.count(GASOIL_ITEM)}`,
      `SUELO      y=${p.groundHeight.toFixed(3)} pies=${pos.y.toFixed(3)}`,
      `TURBO      ${p.stats.turbo.toFixed(0)}${p.turboActive ? " ACTIVO" : ""}`,
      `OBJETIVO   ${target ? `${target.poi.id} ${Math.round(target.poi.position.distanceTo(pos))}m` : "—"}`,
      `HORA       ${this.timeOfDay.clock} ${this.timeOfDay.phase}`,
      `PEATONES   ${this.peds.activeCount}/${this.peds.peds.length} · COCHES ${this.traffic.activeCount}/${this.traffic.cars.length}`,
      `EVENTOS    ${this.events.active.join(", ") || "—"} (últ.: ${this.events.log[0] ?? "—"})`,
      `AMBIENTE   ${this.ambient.summary() || "—"}`,
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
      // E = interactuar: dentro del coche, SALIR (misma tecla que para entrar)
      if (this.input.wasPressed("interact") || this.input.wasPressed("exitVehicle")) vm.requestExit();
      if (this.input.wasPressed("drink")) {
        this.hud.toast("GasOil solo a pie: aparca y baja (E)", "warn");
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

  /** Densidad de peatones/tráfico según la franja horaria. */
  private applyTimeOfDay(): void {
    const info = this.timeOfDay.info;
    this.peds.density = info.peds;
    this.peds.robotChance = info.robots;
    this.traffic.density = info.cars;
  }

  /**
   * Ciudad viva por frame: peatones, tráfico, reacciones, microeventos,
   * hora del día (luz), brillo de las máquinas GasOil y capas de ambiente.
   */
  private updateLife(dt: number, pos: THREE.Vector3, carSpeed: number): void {
    const p = this.player;
    const inCar = this.vehicles.busy;
    this.lifeTime += dt;
    this.peds.update(dt, pos, inCar, carSpeed);

    // Obstáculos para el tráfico: vecinos y peatones visibles cercanos
    this.walkers.length = 0;
    this.lifeNPCs.length = 0;
    for (const npc of this.npcs.all()) {
      if (!npc.root.visible) continue;
      this.lifeNPCs.push(npc);
      if (npc.playerDistance < 90) this.walkers.push(npc.position);
    }
    let peopleNear = 0;
    for (const npc of this.peds.visible()) {
      this.lifeNPCs.push(npc);
      this.walkers.push(npc.position);
      if (npc.playerDistance < 25) peopleNear++;
    }
    const playerCar = this.vehicles.current?.position ?? null;
    this.traffic.update(dt, {
      player: pos,
      playerCar,
      walkers: this.walkers,
      camera: this.camera,
      onHorn: (car: TrafficCar) => {
        if (car.mesh.position.distanceTo(pos) < 50) this.audio.playSfx("horn");
        this.barks.say(car.mesh.position, BARKS.horn[Math.floor(Math.random() * BARKS.horn.length)], 2, `car_${car.id}`, "alert", 2.2);
      },
      onBrokenPuff: (car: TrafficCar) => this.effects.puff(this.hornAnchor.copy(car.mesh.position).setY(car.mesh.position.y + 0.9)),
    });

    this.reactions.update(
      dt,
      this.lifeNPCs,
      {
        playerPos: pos,
        playerSpeed: p.speed,
        inVehicle: inCar,
        vehicleSpeed: carSpeed,
        turboActive: p.turboActive,
        turboStarted: p.justTurboStarted,
        onFoot: !inCar,
      },
      (id) => this.npcs.get(id) ?? this.peds.peds.find((x) => x.npc.data.id === id)?.npc
    );
    this.events.update(dt);

    // Hora del día → luz suave
    this.timeOfDay.update(dt);
    const light = this.timeOfDay.daylight();
    this.world.environment.setDaylight(light.sun, light.sky, light.tint);
    // Las máquinas y anuncios de GasOil "laten" (más de noche)
    const night = this.timeOfDay.phase === "NIGHT" ? 0.18 : 0;
    this.world.gasoilMaterial.color.setScalar(1.06 + night + Math.sin(this.lifeTime * 2.6) * 0.06);

    // Capas de sonido ambiental (preparadas)
    let carsNear = 0;
    for (const c of this.traffic.cars) if (c.active && c.mesh.position.distanceTo(pos) < 40) carsNear++;
    let machineDistance = Infinity;
    for (const m of this.world.machines) machineDistance = Math.min(machineDistance, Math.hypot(m.x - pos.x, m.z - pos.z));
    this.ambient.update(dt, {
      listener: pos,
      zoneId: this.world.zoneAt(pos.x, pos.z)?.id ?? null,
      phase: this.timeOfDay.phase,
      carsNear,
      peopleNear,
      machineDistance,
      playerSpeed: p.speed,
      inVehicle: inCar,
    });
  }

  /** Datos de partida listos para guardar (el sistema definitivo llegará más adelante). */
  createSaveData(): SaveData {
    const p = this.player;
    const veh = this.vehicles.serialize();
    const missions: SaveData["missions"] = {};
    for (const m of this.missions.all()) missions[m.id] = { state: m.state, objective: m.currentObjective?.id ?? null };
    return {
      version: 2,
      savedAt: 0,
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
    const info = this.timeOfDay.info;
    this.minimap.setZone(
      `${(this.world.districtAt(pos.x, pos.z)?.name ?? "Calles del barrio").toUpperCase()} · ${info.icon} ${this.timeOfDay.clock}`
    );
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
      prompt: skipGameplay || this.dialogue.active
        ? null
        : this.vehicles.inVehicle
          ? "SALIR DEL VEHÍCULO"
          : current && !this.vehicles.busy
            ? current.prompt()
            : null,
      missionType: mission ? mission.data.missionType : null,
      objectiveMode: this.missions.active ? this.tracker.requiredModeOf() : "ANY",
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
    this.save.dispose(); // auto-guarda la partida al cerrar
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
    this.barks.dispose();
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
