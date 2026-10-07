import * as THREE from "three";
import { PHASES, timeSettings } from "../data/life";
import type { DayPhase } from "../data/life";

const ORDER: DayPhase[] = ["MORNING", "DAY", "EVENING", "NIGHT"];
const NIGHT_TINT = new THREE.Color(0.32, 0.36, 0.55);
const DUSK_TINT = new THREE.Color(1.0, 0.72, 0.55);
const DAY_TINT = new THREE.Color(1, 1, 1);

/**
 * Hora del día simple: MORNING · DAY · EVENING · NIGHT.
 * Cambia la densidad de peatones/tráfico (data/life.ts) y la luz de forma suave.
 */
export class TimeOfDay {
  /** Hora de juego 0..24. */
  hour: number = timeSettings.startHour;
  private tint = new THREE.Color();
  onPhaseChange: ((phase: DayPhase) => void) | null = null;
  private lastPhase: DayPhase;

  constructor() {
    this.lastPhase = this.phase;
  }

  get phase(): DayPhase {
    const h = this.hour;
    if (h >= PHASES.NIGHT.from || h < PHASES.MORNING.from) return "NIGHT";
    if (h >= PHASES.EVENING.from) return "EVENING";
    if (h >= PHASES.DAY.from) return "DAY";
    return "MORNING";
  }

  get info(): (typeof PHASES)[DayPhase] {
    return PHASES[this.phase];
  }

  /** "08:40" */
  get clock(): string {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  update(dt: number): void {
    this.hour = (this.hour + dt / timeSettings.secondsPerHour) % 24;
    const phase = this.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.onPhaseChange?.(phase);
    }
  }

  /** Factores de luz: sol, cielo y tinte de la niebla. */
  daylight(): { sun: number; sky: number; tint: THREE.Color } {
    const h = this.hour;
    // 0 de noche … 1 a mediodía, con amaneceres/atardeceres suaves
    const day = THREE.MathUtils.clamp(Math.sin(((h - 5.5) / 15) * Math.PI), 0, 1);
    const dusk = Math.max(0, 1 - Math.abs(h - 20) / 2.2) + Math.max(0, 1 - Math.abs(h - 6.5) / 1.5) * 0.6;
    this.tint.copy(NIGHT_TINT).lerp(DAY_TINT, day).lerp(DUSK_TINT, Math.min(0.6, dusk * 0.6));
    return { sun: 0.25 + 0.75 * day, sky: 0.55 + 0.45 * day, tint: this.tint };
  }

  /** Salta a la siguiente franja (útil para pruebas y futuro "dormir"). */
  skipToNextPhase(): void {
    const next = ORDER[(ORDER.indexOf(this.phase) + 1) % ORDER.length];
    this.hour = PHASES[next].from + 0.01;
  }
}
