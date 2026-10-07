import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Inventory } from "../inventory/Inventory";
import type { Player } from "../player/Player";
import type { POI, POIRegistry } from "../world/poi/POIRegistry";
import type { POICategory } from "../data/poi";
import type { RaceManager } from "../race/RaceManager";
import type { LocationData, RaceData } from "../data/types";
import type { RequiredMode } from "../data/missionTypes";
import { ITEMS } from "../data/items";
import { RACES } from "../data/races";
import type { MissionManager } from "./MissionManager";
import type { Mission, MissionObjective } from "./Mission";

export interface TrackerContext {
  bus: EventBus;
  missions: MissionManager;
  player: Player;
  inventory: Inventory;
  pois: POIRegistry;
  races: RaceManager;
  /** Posición viva de un NPC (para TALK_TO_NPC / DELIVER_ITEM). */
  npcPosition(id: string): THREE.Vector3 | null;
  npcName(id: string): string;
  placePlayer(x: number, z: number, yaw: number): void;
  /** Estado de conducción (el vehículo es un sistema aparte). */
  vehicle(): { inVehicle: boolean; speed: number; position: THREE.Vector3; id: string; poi: string };
  notify(text: string, kind?: "info" | "success" | "warn"): void;
}

const DEFAULT_RADIUS = 4;

/**
 * Completa los objetivos de la misión activa según su tipo:
 * por eventos (hablar, comprar, beber, entregar…) o por estado cada frame
 * (llegar a un sitio, recoger/entregar en un punto, usar turbo, carreras).
 * Los objetivos son secuenciales y respetan `requiredMode`
 * (A PIE / EN VEHÍCULO / CUALQUIERA): si llegas de la forma incorrecta,
 * NO se completa y se avisa.
 */
export class ObjectiveTracker {
  private ctx: TrackerContext;
  private current: MissionObjective | null = null;
  private turboTime = 0;
  private parkTime = 0;
  private warnedMode = false;
  /** Objetivo de carrera esperando a que el jugador esté en el modo correcto. */
  private pendingRace = false;
  private dynamic: POI = { id: "objective_target", name: "", category: "TARGET", position: new THREE.Vector3() };

  constructor(ctx: TrackerContext) {
    this.ctx = ctx;
    const { bus } = ctx;
    bus.on("inventory:changed", () => this.check());
    bus.on("machine:used", (e) => this.onEvent("BUY_ITEM", (o) => !o.data.item || o.data.item === e.itemId));
    bus.on("gasoil:drink", () => {
      bus.emit("item:used", { itemId: "gasoil_can" });
    });
    bus.on("item:used", (e) => this.onEvent("USE_ITEM", (o) => !o.data.item || o.data.item === e.itemId));
    bus.on("object:interact", (e) => this.onEvent("INTERACT_OBJECT", (o) => o.data.object === e.objectId));
    bus.on("vehicle:enter", (e) => this.onEvent("ENTER_VEHICLE", (o) => !o.data.vehicle || o.data.vehicle === e.vehicleId));
    bus.on("vehicle:exit", (e) =>
      this.onEvent("EXIT_VEHICLE", (o) => {
        if (o.data.vehicle && o.data.vehicle !== e.vehicleId) return false;
        const loc = o.data.location;
        return !loc || this.distanceTo(loc) < (loc.radius ?? 12);
      })
    );
    bus.on("npc:talkEnd", (e) => {
      this.onEvent("TALK_TO_NPC", (o) => o.data.npc === e.npcId);
      this.onEvent("DELIVER_ITEM", (o) => {
        if (!o.data.npc || o.data.npc !== e.npcId || !o.data.item) return false;
        return this.ctx.inventory.remove(o.data.item, o.data.count ?? 1);
      });
    });
  }

  /** Objetivo actual de la misión activa. */
  get objective(): MissionObjective | null {
    return this.ctx.missions.active?.currentObjective ?? null;
  }

  /** Estado que exige el objetivo actual (para HUD y waypoint). */
  requiredModeOf(obj: MissionObjective | null = this.objective): RequiredMode {
    if (!obj) return "ANY";
    const d = obj.data;
    if (d.requiredMode) return d.requiredMode;
    if (d.onFoot) return "ON_FOOT";
    if (d.type === "DRIVE_TO_LOCATION" || d.type === "PARK_VEHICLE" || d.type === "EXIT_VEHICLE") return "VEHICLE";
    if (d.type === "TALK_TO_NPC" || (d.type === "DELIVER_ITEM" && d.npc) || d.type === "USE_ITEM" || d.type === "USE_TURBO") return "ON_FOOT";
    const race = d.race ? RACES[d.race] : undefined;
    if (race) return race.mode === "vehicle" ? "VEHICLE" : "ON_FOOT";
    return "ANY";
  }

  update(dt: number): void {
    const mission = this.ctx.missions.active;
    const obj = mission?.currentObjective ?? null;
    if (obj !== this.current) {
      this.current = obj;
      if (obj && mission) this.enter(mission, obj);
    }
    if (!obj || !mission) return;
    const player = this.ctx.player;
    const d = obj.data;
    const type = d.type;
    const drive = this.ctx.vehicle();
    if (this.pendingRace) this.tryStartRace(mission, obj);

    if (type === "GO_TO_LOCATION" || type === "REACH_CHECKPOINT") {
      const loc = this.locationOf(obj);
      if (loc && this.distanceTo(loc) < (loc.radius ?? DEFAULT_RADIUS) && this.modeOk(obj)) this.complete(mission, obj);
    } else if (type === "DRIVE_TO_LOCATION") {
      const loc = d.location;
      if (loc && this.distanceTo(loc) < (loc.radius ?? 10) && this.modeOk(obj)) this.complete(mission, obj);
    } else if (type === "PARK_VEHICLE") {
      const loc = d.location;
      const inside = !!loc && this.distanceTo(loc) < (loc.radius ?? 6);
      const parked = inside && this.modeOk(obj) && Math.abs(drive.speed) < (d.maxSpeed ?? 0.8);
      this.parkTime = parked ? this.parkTime + dt : 0;
      if (this.parkTime >= (d.hold ?? 1)) this.complete(mission, obj);
    } else if (type === "COLLECT_ITEM") {
      // Con ubicación: se recoge al llegar (a pie o con el coche, según el modo)
      const loc = d.location;
      const item = d.item ?? "";
      const count = d.count ?? 1;
      if (loc && !this.ctx.inventory.has(item, count) && this.distanceTo(loc) < (loc.radius ?? 2.5) && this.modeOk(obj)) {
        this.ctx.inventory.add(item, count - this.ctx.inventory.count(item));
        this.ctx.notify(`Recogido: ${ITEMS[item]?.name ?? item}${count > 1 ? ` ×${count}` : ""}`, "success");
      }
      this.check();
    } else if (type === "DELIVER_ITEM" && d.location && !d.npc) {
      // Entrega en un punto (p. ej. desde la ventanilla del coche)
      const loc = d.location;
      const item = d.item ?? "";
      if (this.distanceTo(loc) < (loc.radius ?? 6) && this.modeOk(obj) && this.ctx.inventory.remove(item, d.count ?? 1)) {
        this.ctx.notify(`¡Entregado! ${ITEMS[item]?.name ?? item}`, "success");
        this.complete(mission, obj);
      }
    } else if (type === "USE_TURBO") {
      const zone = d.location;
      const inZone = !zone || this.distanceTo(zone) < (zone.radius ?? 10);
      if (player.turboActive && inZone) this.turboTime += dt;
      if (this.turboTime >= (d.seconds ?? 1)) this.complete(mission, obj);
    }
  }

  /** Siguiente checkpoint/meta de cualquier carrera en curso (con o sin misión). */
  raceTarget(): POI | null {
    return this.ctx.races.navTarget();
  }

  /** A dónde debe ir el jugador para el objetivo actual (null = no aplica). */
  navTarget(): POI | null {
    const raceTarget = this.ctx.races.navTarget();
    if (raceTarget) return raceTarget;
    const obj = this.objective;
    if (!obj) return null;
    const d = obj.data;
    if (d.waypoint) {
      const poi = d.waypoint.startsWith("nearest:")
        ? this.ctx.pois.nearest(d.waypoint.slice(8) as POICategory, this.ctx.player.root.position)
        : this.ctx.pois.get(d.waypoint);
      if (poi) return poi;
    }
    // Objetivo que exige coche y el jugador va a pie → primero, al coche
    if (this.requiredModeOf(obj) === "VEHICLE" && !this.ctx.vehicle().inVehicle && d.type !== "ENTER_VEHICLE") {
      const car = this.ctx.pois.get(this.ctx.vehicle().poi);
      if (car) return car;
    }
    if ((d.type === "TALK_TO_NPC" || d.type === "DELIVER_ITEM") && d.npc) {
      const giver = this.ctx.pois.get(d.npc);
      if (giver && !giver.hidden) return giver;
      const pos = this.ctx.npcPosition(d.npc);
      if (pos) return this.setDynamic(pos.x, pos.z, this.ctx.npcName(d.npc), "MISSION_NPC");
    }
    if (d.location && (d.type === "COLLECT_ITEM" || d.type === "DELIVER_ITEM")) {
      return this.setDynamic(d.location.x, d.location.z, d.location.label ?? "OBJETIVO", "TARGET");
    }
    if ((d.type === "COLLECT_ITEM" || d.type === "BUY_ITEM") && !this.ctx.inventory.has(d.item ?? "", d.count ?? 1)) {
      return this.ctx.pois.nearest("GASOIL_MACHINE", this.ctx.player.root.position);
    }
    if (d.type === "ENTER_VEHICLE") {
      const poi = this.ctx.pois.get(this.ctx.vehicle().poi);
      if (poi) return poi;
    }
    if (d.type === "EXIT_VEHICLE") return null;
    if ((d.type === "DRIVE_TO_LOCATION" || d.type === "PARK_VEHICLE") && d.location) {
      return this.setDynamic(d.location.x, d.location.z, d.location.label ?? "APARCAMIENTO", "PARKING");
    }
    const loc = this.locationOf(obj);
    if (loc && (d.type !== "USE_TURBO" || this.distanceTo(loc) > (loc.radius ?? 10))) {
      const isRaceStart = !!d.race && d.type === "GO_TO_LOCATION";
      return this.setDynamic(loc.x, loc.z, loc.label ?? (isRaceStart ? "SALIDA DE LA CARRERA" : "OBJETIVO"), isRaceStart ? "RACE_START" : "TARGET");
    }
    return null;
  }

  private enter(mission: Mission, obj: MissionObjective): void {
    this.turboTime = 0;
    this.parkTime = 0;
    this.warnedMode = false;
    const inCar = this.ctx.vehicle().inVehicle;
    // Objetivos que ya se cumplen al empezar (ya estaba a pie / ya estaba en el coche)
    if ((obj.data.type === "EXIT_VEHICLE" && !inCar) || (obj.data.type === "ENTER_VEHICLE" && inCar)) {
      queueMicrotask(() => this.complete(mission, obj));
      return;
    }
    const d = obj.data;
    const base = d.race ? RACES[d.race] : undefined;
    if (d.type === "GO_TO_LOCATION" && base) this.ctx.races.preview(base);
    // La carrera empieza cuando el jugador está en el modo correcto (a pie / en coche).
    // Así, bajarse del coche en una carrera de coche no provoca fallos en bucle.
    this.pendingRace = (d.type === "RACE_TO_LOCATION" || d.type === "COMPLETE_TIMER") && !!base;
    if (this.pendingRace) this.tryStartRace(mission, obj);
  }

  private tryStartRace(mission: Mission, obj: MissionObjective): void {
    const d = obj.data;
    const base = d.race ? RACES[d.race] : undefined;
    if (!base || !this.modeOk(obj)) return;
    this.pendingRace = false;
    {
      const race = base.dynamic ? this.fromHere(base) : base;
      if (race.rules?.mustDrinkGasOil && !this.ctx.inventory.has("gasoil_can")) {
        this.ctx.notify("No llevas GasOil y esta carrera exige beberlo: hay máquinas por el camino (ϟ)", "warn");
      }
      if (race.dynamic) this.ctx.notify(`¡CONTRARRELOJ! ${Math.round(race.timeLimit)} s`, "info");
      this.ctx.races.start(race, this.ctx.placePlayer, (success, time, reason) => {
        if (success) {
          this.ctx.notify(`¡CARRERA COMPLETADA! ${formatTime(time)}`, "success");
          this.complete(mission, obj);
        } else {
          this.ctx.notify(`CARRERA FALLIDA · ${reason ?? "vuelve a intentarlo"}`, "warn");
          this.rewind(mission, obj);
        }
      });
    }
  }

  /** Contrarreloj "desde donde estés": salida = posición actual, límite según la distancia. */
  private fromHere(base: RaceData): RaceData {
    const p = this.ctx.player.root.position;
    const dyn = base.dynamic ?? { speed: 10, detour: 1.3, margin: 4 };
    const dist = Math.hypot(base.finish[0] - p.x, base.finish[1] - p.z);
    const limit = Math.max(8, Math.round(((dist * dyn.detour) / dyn.speed + dyn.margin) * 10) / 10);
    return { ...base, start: { x: p.x, z: p.z, yaw: this.ctx.player.yaw }, timeLimit: limit };
  }

  /** Tras fallar: vuelve al último "ir a…" anterior (o repite el objetivo). */
  private rewind(mission: Mission, obj: MissionObjective): void {
    const index = mission.objectives.indexOf(obj);
    let to = obj;
    for (let i = index - 1; i >= 0; i--) {
      if (mission.objectives[i].data.type === "GO_TO_LOCATION") {
        to = mission.objectives[i];
        break;
      }
    }
    mission.rewindTo(to.id);
    this.current = null; // fuerza a "entrar" de nuevo en el objetivo
  }

  private check(): void {
    const mission = this.ctx.missions.active;
    const obj = mission?.currentObjective;
    if (!mission || !obj || obj.data.type !== "COLLECT_ITEM") return;
    if (this.ctx.inventory.has(obj.data.item ?? "", obj.data.count ?? 1)) this.complete(mission, obj);
  }

  private onEvent(type: string, match: (o: MissionObjective) => boolean): void {
    const mission = this.ctx.missions.active;
    const obj = mission?.currentObjective;
    if (!mission || !obj || obj.data.type !== type) return;
    if (match(obj)) this.complete(mission, obj);
  }

  private complete(mission: Mission, obj: MissionObjective): void {
    if (!mission.completeObjective(obj.id)) return;
    const next = mission.currentObjective;
    if (next) this.ctx.notify(`OBJETIVO: ${next.description}`, "info");
  }

  /** ¿El jugador está en el estado que exige el objetivo? Si no, avisa una vez. */
  private modeOk(obj: MissionObjective): boolean {
    const need = this.requiredModeOf(obj);
    const inCar = this.ctx.vehicle().inVehicle;
    const ok = need === "ANY" || (need === "VEHICLE" ? inCar : !inCar);
    if (!ok && !this.warnedMode) {
      this.warnedMode = true;
      this.ctx.notify(need === "VEHICLE" ? "Esto se hace EN COCHE: sube a tu vehículo (E)" : "Esto se hace A PIE: sal del coche (E)", "warn");
    }
    return ok;
  }

  private locationOf(obj: MissionObjective): LocationData | null {
    if (obj.data.location) return obj.data.location;
    const race = obj.data.race ? RACES[obj.data.race] : undefined;
    if (race) return { x: race.start.x, z: race.start.z, radius: race.mode === "vehicle" ? 9 : DEFAULT_RADIUS };
    return null;
  }

  private distanceTo(loc: LocationData): number {
    const p = this.ctx.player.root.position;
    return Math.hypot(p.x - loc.x, p.z - loc.z);
  }

  private setDynamic(x: number, z: number, name: string, category: POICategory): POI {
    this.dynamic.position.set(x, 0, z);
    this.dynamic.name = name;
    this.dynamic.category = category;
    return this.dynamic;
  }
}

/** 00:18.42 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
}
