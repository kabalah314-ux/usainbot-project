import * as THREE from "three";
import type { RaceData } from "../data/types";
import type { EventBus } from "../core/EventBus";
import type { POI, POIRegistry } from "../world/poi/POIRegistry";
import { RACES } from "../data/races";
import { RaceGates } from "./RaceGates";
import type { GateRole } from "./RaceGates";

export type RacePhase = "idle" | "preview" | "countdown" | "running" | "result";

export interface RaceHudInfo {
  name: string;
  phase: RacePhase;
  time: number;
  limit: number;
  checkpoint: number;
  total: number;
  distanceToFinish: number;
  countdown: string | null;
  result: { success: boolean; time: number } | null;
  /** Estado de las reglas (p. ej. "GASOIL ✓ · TURBO ✗") o null. */
  rules: string | null;
  mode: "on_foot" | "vehicle";
}

/** Lo que la carrera necesita saber del jugador cada frame. */
export interface RacerStatus {
  inVehicle: boolean;
  turboActive: boolean;
}

export type RaceFinishCallback = (success: boolean, time: number, reason?: string) => void;

const COUNT_STEP = 0.85;
const RESULT_TIME = 3;

/**
 * Carreras A → B: vista previa del recorrido, cuenta atrás 3-2-1-GO,
 * cronómetro, checkpoints en orden, tiempo límite y resultado.
 * No sabe nada de misiones: avisa por callback y por el bus de eventos.
 */
export class RaceManager {
  readonly gates = new RaceGates();
  race: RaceData | null = null;
  phase: RacePhase = "idle";
  private time = 0;
  private countdownT = 0;
  private lastCount = -1;
  private next = 0;
  private resultT = 0;
  private result: { success: boolean; time: number } | null = null;
  private onFinish: RaceFinishCallback | null = null;
  private drank = false;
  private turboTime = 0;
  private reason: string | undefined;
  private pois: POIRegistry | null = null;
  private bus: EventBus;
  private target: POI = { id: "race_target", name: "", category: "CHECKPOINT", position: new THREE.Vector3() };
  private points: Array<[number, number]> = [];

  constructor(bus: EventBus) {
    this.bus = bus;
    bus.on("gasoil:drink", () => {
      if (this.phase === "running") this.drank = true;
    });
  }

  /** Registra los POIs de salida/meta de todas las carreras (ocultos hasta usarlas). */
  attachPOIs(pois: POIRegistry): void {
    this.pois = pois;
    for (const r of Object.values(RACES)) {
      pois.define(`race_start_${r.id}`, `Salida: ${r.name}`, "RACE_START", r.start.x, r.start.z).hidden = true;
      pois.define(`race_finish_${r.id}`, `Meta: ${r.name}`, "RACE_FINISH", r.finish[0], r.finish[1]).hidden = true;
    }
  }

  private showPOIs(race: RaceData | null, start: boolean, finish: boolean): void {
    if (!this.pois) return;
    for (const r of Object.values(RACES)) {
      const s = this.pois.get(`race_start_${r.id}`);
      const f = this.pois.get(`race_finish_${r.id}`);
      if (s) s.hidden = !(race?.id === r.id && start);
      if (f) f.hidden = !(race?.id === r.id && finish);
    }
  }

  /** ¿Debe bloquearse el control del jugador? (cuenta atrás) */
  get locksControls(): boolean {
    return this.phase === "countdown";
  }

  get active(): boolean {
    return this.phase === "countdown" || this.phase === "running";
  }

  /** Muestra el recorrido (salida, checkpoints y meta) mientras vas a la salida. */
  preview(race: RaceData): void {
    if (this.active) return;
    this.setRace(race);
    this.phase = "preview";
    this.applyRoles();
    this.showPOIs(race, true, true);
  }

  /**
   * Empieza la carrera. Con cuenta atrás, el jugador ya debe estar en la salida
   * (placePlayer lo coloca exactamente en la línea).
   */
  start(race: RaceData, placePlayer: (x: number, z: number, yaw: number) => void, onFinish: RaceFinishCallback): void {
    this.setRace(race);
    this.onFinish = onFinish;
    this.drank = false;
    this.turboTime = 0;
    this.reason = undefined;
    this.showPOIs(race, false, true);
    this.time = 0;
    this.next = 0;
    this.result = null;
    if (race.placeAtStart) placePlayer(race.start.x, race.start.z, race.start.yaw);
    if (race.countdown) {
      this.phase = "countdown";
      this.countdownT = 0;
      this.lastCount = -1;
    } else {
      this.phase = "running";
      this.bus.emit("race:countdown", { value: 0 });
    }
    this.applyRoles();
  }

  cancel(): void {
    this.showPOIs(null, false, false);
    this.phase = "idle";
    this.race = null;
    this.gates.hideAll();
  }

  update(dt: number, player: THREE.Vector3, status: RacerStatus = { inVehicle: false, turboActive: false }): void {
    this.gates.update(dt);
    const race = this.race;
    if (!race) return;

    if (this.phase === "countdown") {
      this.countdownT += dt;
      const count = 3 - Math.floor(this.countdownT / COUNT_STEP);
      if (count !== this.lastCount && count >= 1) {
        this.lastCount = count;
        this.bus.emit("race:countdown", { value: count });
      }
      if (this.countdownT >= COUNT_STEP * 3) {
        this.phase = "running";
        this.countdownT = 0;
        this.bus.emit("race:countdown", { value: 0 });
      }
      return;
    }

    if (this.phase === "running") {
      this.time += dt;
      this.countdownT += dt;
      if (status.turboActive) this.turboTime += dt;
      // Modo de la carrera: a pie o en vehículo (sin trampas)
      if (race.mode === "on_foot" && status.inVehicle) {
        this.reason = "¡Era una carrera A PIE! Nada de coche.";
        this.finish(false);
        return;
      }
      if (race.mode === "vehicle" && !status.inVehicle) {
        this.reason = "Esta carrera es EN VEHÍCULO.";
        this.finish(false);
        return;
      }
      const total = race.checkpoints.length + 1;
      const [tx, tz] = this.nextPoint();
      if (Math.hypot(player.x - tx, player.z - tz) < race.radius) {
        this.next++;
        if (this.next >= total) {
          let ok = this.time <= race.timeLimit;
          if (!ok) this.reason = "Tiempo agotado";
          if (ok && race.rules?.mustDrinkGasOil && !this.drank) {
            ok = false;
            this.reason = "Regla: había que BEBER GasOil (G) durante la carrera";
          }
          if (ok && race.rules?.mustUseTurbo && this.turboTime < 0.5) {
            ok = false;
            this.reason = "Regla: había que usar el TURBO (SHIFT)";
          }
          this.finish(ok);
          return;
        }
        this.bus.emit("race:checkpoint", { raceId: race.id, index: this.next, total: race.checkpoints.length });
        this.applyRoles();
      }
      if (this.time > race.timeLimit) {
        this.reason = "Tiempo agotado";
        this.finish(false);
      }
      return;
    }

    if (this.phase === "result") {
      this.resultT += dt;
      if (this.resultT > RESULT_TIME) {
        this.phase = "idle";
        this.race = null;
        this.result = null;
        this.gates.hideAll();
        this.showPOIs(null, false, false);
      }
    }
  }

  /** Objetivo del waypoint durante la carrera (siguiente checkpoint o meta). */
  navTarget(): POI | null {
    if (!this.race || (this.phase !== "running" && this.phase !== "countdown")) return null;
    const [x, z] = this.nextPoint();
    const last = this.next >= this.race.checkpoints.length;
    this.target.position.set(x, 0, z);
    this.target.category = last ? "RACE" : "CHECKPOINT";
    this.target.name = last ? "META" : `CHECKPOINT ${this.next + 1}/${this.race.checkpoints.length}`;
    return this.target;
  }

  /** Recorrido para dibujarlo en el minimapa/mapa. */
  route(): Array<[number, number]> | null {
    return this.race && this.phase !== "idle" ? this.points : null;
  }

  hud(player: THREE.Vector3): RaceHudInfo | null {
    const race = this.race;
    if (!race || this.phase === "idle" || this.phase === "preview") return null;
    let dist = 0;
    if (this.phase !== "result") {
      let [px, pz] = [player.x, player.z];
      const rest = [...race.checkpoints.slice(this.next), race.finish];
      for (const [x, z] of rest) {
        dist += Math.hypot(x - px, z - pz);
        [px, pz] = [x, z];
      }
    }
    const count = 3 - Math.floor(this.countdownT / COUNT_STEP);
    const countdown =
      this.phase === "countdown" ? String(Math.max(1, count)) : this.phase === "running" && this.countdownT < 0.7 ? "GO!" : null;
    return {
      name: race.name,
      phase: this.phase,
      time: this.phase === "result" && this.result ? this.result.time : this.time,
      limit: race.timeLimit,
      checkpoint: Math.min(this.next, race.checkpoints.length),
      total: race.checkpoints.length,
      distanceToFinish: dist,
      countdown,
      result: this.result,
      rules: this.rulesText(race),
      mode: race.mode,
    };
  }

  private rulesText(race: RaceData): string | null {
    const r = race.rules;
    if (!r || (!r.mustDrinkGasOil && !r.mustUseTurbo)) return null;
    const parts: string[] = [];
    if (r.mustDrinkGasOil) parts.push(`GASOIL ${this.drank ? "✓" : "✗"}`);
    if (r.mustUseTurbo) parts.push(`TURBO ${this.turboTime >= 0.5 ? "✓" : "✗"}`);
    return parts.join(" · ");
  }

  private setRace(race: RaceData): void {
    this.race = race;
    this.points = [[race.start.x, race.start.z], ...race.checkpoints, race.finish];
    this.gates.layout(race);
  }

  private nextPoint(): [number, number] {
    const race = this.race as RaceData;
    return this.next < race.checkpoints.length ? race.checkpoints[this.next] : race.finish;
  }

  private finish(success: boolean): void {
    const race = this.race as RaceData;
    this.phase = "result";
    this.resultT = 0;
    this.result = { success, time: this.time };
    this.gates.hideAll();
    const reason = success ? undefined : this.reason;
    this.bus.emit("race:finish", { raceId: race.id, success, time: this.time, reason });
    const cb = this.onFinish;
    this.onFinish = null;
    cb?.(success, this.time, reason);
  }

  private applyRoles(): void {
    const race = this.race;
    if (!race) return;
    const n = race.checkpoints.length;
    const roles: GateRole[] = [];
    // [salida, cp0..cpN-1, meta]
    roles.push(this.phase === "preview" || this.phase === "countdown" ? "start" : "hidden");
    for (let i = 0; i < n; i++) {
      if (this.phase === "running") roles.push(i < this.next ? "hidden" : i === this.next ? "next" : "later");
      else roles.push("later");
    }
    roles.push(this.phase === "running" && this.next >= n ? "finish" : "finish");
    this.gates.setRoles(roles);
  }
}
