import type * as THREE from "three";
import type { Player } from "../player/Player";
import type { VehicleManager } from "../vehicles/VehicleManager";
import type { PedestrianManager } from "../npc/PedestrianManager";
import type { TrafficManager } from "../traffic/TrafficManager";
import type { BarkSystem } from "../ui/BarkSystem";
import type { InteractionSystem } from "../interaction/InteractionSystem";
import type { Inventory } from "../inventory/Inventory";
import type { RaceManager } from "../race/RaceManager";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { GasOilService } from "../gasoil/GasOilService";
import type { EventBus } from "../core/EventBus";
import type { MissionManager } from "../missions/MissionManager";
import type { GasOilMachineSpec } from "../world/zones/Zone";
import type { PedGraph } from "../world/nav/PedGraph";
import { lifeSettings } from "../data/life";

/** Servicios que un evento ambiental puede usar (sin tocar el resto del juego). */
export interface AmbientContext {
  player: Player;
  vehicles: VehicleManager;
  peds: PedestrianManager;
  traffic: TrafficManager;
  barks: BarkSystem;
  interaction: InteractionSystem;
  inventory: Inventory;
  races: RaceManager;
  pois: POIRegistry;
  gasoil: GasOilService;
  bus: EventBus;
  missions: MissionManager;
  machines: readonly GasOilMachineSpec[];
  graph: PedGraph;
  notify(text: string, kind?: "info" | "success" | "warn"): void;
  sfx(name: "deny" | "pickup" | "win" | "fail" | "crash" | "buy" | "mission"): void;
  puff(at: THREE.Vector3): void;
}

/**
 * Microevento: trigger (canStart) → start → comportamiento (update) → fin.
 * Deben ser cortos, ligeros y no depender de nada más que del contexto.
 */
export interface AmbientEvent {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  /** Segundos mínimos entre dos apariciones del mismo evento. */
  readonly cooldown: number;
  /** Duración máxima de seguridad (s). */
  readonly maxDuration: number;
  canStart(ctx: AmbientContext): boolean;
  /** Devuelve false si al final no pudo empezar. */
  start(ctx: AmbientContext): boolean;
  /** Devuelve true cuando ha terminado. */
  update(dt: number, ctx: AmbientContext): boolean;
  end(ctx: AmbientContext): void;
}

interface Running {
  event: AmbientEvent;
  t: number;
}

/**
 * Lanza microeventos al azar cada 18–32 s (ponderados, con enfriamiento y
 * un máximo simultáneo). `trigger(id)` fuerza uno (pruebas / futuras misiones).
 */
export class EventManager {
  private events: AmbientEvent[] = [];
  private running: Running[] = [];
  private lastEnd = new Map<string, number>();
  private time = 0;
  private next: number = lifeSettings.eventInterval[0] * 0.6;
  private ctx: AmbientContext;
  /** Historial corto para el panel de depuración. */
  readonly log: string[] = [];

  constructor(ctx: AmbientContext) {
    this.ctx = ctx;
  }

  register(event: AmbientEvent): void {
    this.events.push(event);
  }

  get active(): string[] {
    return this.running.map((r) => r.event.id);
  }

  /** Fuerza un evento concreto (si sus condiciones se cumplen). */
  trigger(id: string): boolean {
    const ev = this.events.find((e) => e.id === id);
    if (!ev || this.running.some((r) => r.event === ev) || !ev.canStart(this.ctx)) return false;
    return this.begin(ev);
  }

  update(dt: number): void {
    this.time += dt;
    for (const r of [...this.running]) {
      r.t += dt;
      let done = false;
      try {
        done = r.event.update(dt, this.ctx) || r.t > r.event.maxDuration;
      } catch (err) {
        console.error(`[EventManager] ${r.event.id}`, err);
        done = true;
      }
      if (done) this.finish(r);
    }
    this.next -= dt;
    if (this.next > 0 || this.running.length >= lifeSettings.maxConcurrentEvents) return;
    const [a, b] = lifeSettings.eventInterval;
    this.next = a + Math.random() * (b - a);
    const options = this.events.filter(
      (e) =>
        !this.running.some((r) => r.event === e) &&
        this.time - (this.lastEnd.get(e.id) ?? -1e9) > e.cooldown &&
        e.canStart(this.ctx)
    );
    if (options.length === 0) return;
    let total = options.reduce((s, e) => s + e.weight, 0) * Math.random();
    for (const e of options) {
      total -= e.weight;
      if (total <= 0) {
        this.begin(e);
        break;
      }
    }
  }

  private begin(ev: AmbientEvent): boolean {
    if (!ev.start(this.ctx)) return false;
    this.running.push({ event: ev, t: 0 });
    this.log.unshift(ev.id);
    this.log.length = Math.min(this.log.length, 4);
    this.ctx.bus.emit("ambient:event", { id: ev.id, phase: "start" });
    return true;
  }

  private finish(r: Running): void {
    try {
      r.event.end(this.ctx);
    } catch (err) {
      console.error(`[EventManager] end ${r.event.id}`, err);
    }
    this.running = this.running.filter((x) => x !== r);
    this.lastEnd.set(r.event.id, this.time);
    this.ctx.bus.emit("ambient:event", { id: r.event.id, phase: "end" });
  }
}
