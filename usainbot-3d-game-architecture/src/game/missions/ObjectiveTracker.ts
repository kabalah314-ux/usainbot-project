import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Inventory } from "../inventory/Inventory";
import type { Player } from "../player/Player";
import type { POI, POIRegistry } from "../world/poi/POIRegistry";
import type { POICategory } from "../data/poi";
import type { RaceManager } from "../race/RaceManager";
import type { LocationData } from "../data/types";
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
 * (llegar a un sitio, llevar un objeto, usar turbo, carreras).
 * Los objetivos son secuenciales: solo cuenta el objetivo actual.
 */
export class ObjectiveTracker {
  private ctx: TrackerContext;
  private current: MissionObjective | null = null;
  private turboTime = 0;
  private parkTime = 0;
  private warnedFoot = false;
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
        if (o.data.npc !== e.npcId || !o.data.item) return false;
        return this.ctx.inventory.remove(o.data.item, o.data.count ?? 1);
      });
    });
  }

  /** Objetivo actual de la misión activa. */
  get objective(): MissionObjective | null {
    return this.ctx.missions.active?.currentObjective ?? null;
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
    const type = obj.data.type;

    const drive = this.ctx.vehicle();
    if (type === "GO_TO_LOCATION" || type === "REACH_CHECKPOINT") {
      const loc = this.locationOf(obj);
      if (loc && this.distanceTo(loc) < (loc.radius ?? DEFAULT_RADIUS)) {
        if (this.needsFoot(obj) && drive.inVehicle) {
          if (!this.warnedFoot) this.ctx.notify("Baja del coche (F): esto se hace A PIE", "warn");
          this.warnedFoot = true;
        } else {
          this.complete(mission, obj);
        }
      }
    } else if (type === "DRIVE_TO_LOCATION") {
      const loc = obj.data.location;
      if (loc && drive.inVehicle && this.distanceTo(loc) < (loc.radius ?? 10)) this.complete(mission, obj);
    } else if (type === "PARK_VEHICLE") {
      const loc = obj.data.location;
      const parked = !!loc && drive.inVehicle && this.distanceTo(loc) < (loc.radius ?? 6) && Math.abs(drive.speed) < (obj.data.maxSpeed ?? 0.8);
      this.parkTime = parked ? this.parkTime + dt : 0;
      if (this.parkTime >= (obj.data.hold ?? 1)) this.complete(mission, obj);
    } else if (type === "COLLECT_ITEM") {
      this.check();
    } else if (type === "USE_TURBO") {
      const zone = obj.data.location;
      const inZone = !zone || this.distanceTo(zone) < (zone.radius ?? 10);
      if (player.turboActive && inZone) this.turboTime += dt;
      if (this.turboTime >= (obj.data.seconds ?? 1)) this.complete(mission, obj);
    }
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
    if ((d.type === "TALK_TO_NPC" || d.type === "DELIVER_ITEM") && d.npc) {
      const giver = this.ctx.pois.get(d.npc);
      if (giver) return giver;
      const pos = this.ctx.npcPosition(d.npc);
      if (pos) return this.setDynamic(pos.x, pos.z, this.ctx.npcName(d.npc), "MISSION_NPC");
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
      return this.setDynamic(loc.x, loc.z, loc.label ?? (isRaceStart ? "SALIDA DE LA CARRERA" : "OBJETIVO"), isRaceStart ? "RACE" : "TARGET");
    }
    return null;
  }

  private enter(mission: Mission, obj: MissionObjective): void {
    this.turboTime = 0;
    this.parkTime = 0;
    this.warnedFoot = false;
    if (obj.data.type === "EXIT_VEHICLE" && !this.ctx.vehicle().inVehicle) {
      // Ya estaba a pie: el objetivo se da por cumplido
      queueMicrotask(() => this.complete(mission, obj));
      return;
    }
    const d = obj.data;
    const race = d.race ? RACES[d.race] : undefined;
    if (d.type === "GO_TO_LOCATION" && race) this.ctx.races.preview(race);
    if ((d.type === "RACE_TO_LOCATION" || d.type === "COMPLETE_TIMER") && race) {
      if (race.rules?.mustDrinkGasOil && !this.ctx.inventory.has("gasoil_can")) {
        this.ctx.notify("No llevas GasOil y esta carrera exige beberlo: hay máquinas por el camino (ϟ)", "warn");
      }
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

  /** GO_TO a la salida de una carrera a pie también exige ir a pie. */
  private needsFoot(obj: MissionObjective): boolean {
    if (obj.data.onFoot) return true;
    const race = obj.data.race ? RACES[obj.data.race] : undefined;
    return !!race && race.mode === "on_foot";
  }

  private locationOf(obj: MissionObjective): LocationData | null {
    if (obj.data.location) return obj.data.location;
    const race = obj.data.race ? RACES[obj.data.race] : undefined;
    if (race) return { x: race.start.x, z: race.start.z, radius: DEFAULT_RADIUS };
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
