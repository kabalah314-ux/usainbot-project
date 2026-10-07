import type { MissionData, ObjectiveData } from "../data/types";

/**
 * Estados de una misión.
 * Const object + union (en vez de enum): misma usabilidad,
 * compatible con cualquier configuración de TypeScript.
 */
export const MissionState = {
  Locked: "LOCKED",
  Available: "AVAILABLE",
  Active: "ACTIVE",
  Completed: "COMPLETED",
  Failed: "FAILED",
} as const;

export type MissionState = (typeof MissionState)[keyof typeof MissionState];

export interface MissionStateChange {
  mission: Mission;
  previous: MissionState;
  next: MissionState;
}

export class MissionObjective {
  readonly data: ObjectiveData;
  readonly id: string;
  readonly description: string;
  readonly target: number;
  readonly waypoint: string | null;
  progress = 0;

  constructor(data: ObjectiveData) {
    this.data = data;
    this.id = data.id;
    this.description = data.description;
    this.target = data.target;
    this.waypoint = data.waypoint ?? null;
  }

  get complete(): boolean {
    return this.progress >= this.target;
  }

  addProgress(amount = 1): void {
    this.progress = Math.min(this.target, this.progress + amount);
  }
}

/**
 * Misión con ciclo de vida completo.
 * La fase 1 valida datos y estados; los objetivos concretos
 * (tracking de eventos) se conectan al diseñar las misiones definitivas.
 */
export class Mission {
  readonly data: MissionData;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly reward: number;
  readonly timeLimit: number | null;
  readonly objectives: MissionObjective[];
  readonly giver: string | null;
  state: MissionState;

  private elapsed = 0;
  private listeners: ((change: MissionStateChange) => void)[] = [];

  constructor(data: MissionData, initial: MissionState = MissionState.Available) {
    this.data = data;
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.reward = data.reward;
    this.timeLimit = data.timeLimit;
    this.objectives = data.objectives.map((o) => new MissionObjective(o));
    this.giver = data.giver ?? null;
    this.state = initial;
  }

  onStateChange(cb: (change: MissionStateChange) => void): void {
    this.listeners.push(cb);
  }

  setState(next: MissionState): void {
    if (this.state === next) return;
    const previous = this.state;
    this.state = next;
    for (const cb of this.listeners) cb({ mission: this, previous, next });
  }

  start(): void {
    if (this.state === MissionState.Available || this.state === MissionState.Locked) {
      this.elapsed = 0;
      this.setState(MissionState.Active);
    }
  }

  complete(): void {
    if (this.state === MissionState.Active) this.setState(MissionState.Completed);
  }

  fail(): void {
    if (this.state === MissionState.Active) this.setState(MissionState.Failed);
  }

  /**
   * Rebobina hasta un objetivo (p. ej. carrera fallida → volver a la salida).
   * Ese objetivo y los siguientes quedan sin progreso; la misión sigue activa.
   */
  rewindTo(objectiveId: string): void {
    const index = this.objectives.findIndex((o) => o.id === objectiveId);
    if (index < 0) return;
    for (let i = index; i < this.objectives.length; i++) this.objectives[i].progress = 0;
  }

  /** Reinicia la misión por completo (vuelve a estar disponible). */
  reset(): void {
    for (const o of this.objectives) o.progress = 0;
    this.elapsed = 0;
    this.setState(MissionState.Available);
  }

  get objectiveIndex(): number {
    const current = this.currentObjective;
    return current ? this.objectives.indexOf(current) : this.objectives.length;
  }

  /** Primer objetivo sin completar (los objetivos son secuenciales). */
  get currentObjective(): MissionObjective | null {
    return this.objectives.find((o) => !o.complete) ?? null;
  }

  /**
   * Avanza un objetivo. Solo cuenta si es el objetivo actual (orden
   * secuencial) y la misión está activa. Devuelve true si avanzó.
   */
  completeObjective(objectiveId: string): boolean {
    if (this.state !== MissionState.Active) return false;
    const objective = this.currentObjective;
    if (!objective || objective.id !== objectiveId) return false;
    objective.addProgress();
    if (this.allObjectivesDone) this.complete();
    return true;
  }

  get allObjectivesDone(): boolean {
    return this.objectives.length > 0 && this.objectives.every((o) => o.complete);
  }

  /** Avance del límite de tiempo (misiones con contrarreloj). */
  update(dt: number): void {
    if (this.state !== MissionState.Active || this.timeLimit === null) return;
    this.elapsed += dt;
    if (this.elapsed >= this.timeLimit) this.fail();
  }

  get remaining(): number | null {
    return this.timeLimit === null ? null : Math.max(0, this.timeLimit - this.elapsed);
  }
}
