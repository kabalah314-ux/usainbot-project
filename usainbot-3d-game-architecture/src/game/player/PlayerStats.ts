import type { PlayerStatsData } from "../data/types";
import { turboSettings } from "../data/items";

/**
 * Estadísticas en tiempo real del jugador.
 * Parten de la configuración central; las mejoras (fases futuras)
 * modificarán `values` sin tocar la lógica de movimiento.
 */
export class PlayerStats {
  readonly base: Readonly<PlayerStatsData>;
  values: PlayerStatsData;
  energy: number;
  /** Reserva de TURBO (se gasta con SHIFT, se recarga con GasOil). */
  turbo: number = turboSettings.start;
  maxTurbo: number = turboSettings.max;

  constructor(data: PlayerStatsData) {
    this.base = { ...data };
    this.values = { ...data };
    this.energy = data.maxEnergy;
  }

  get turboFull(): boolean {
    return this.turbo >= this.maxTurbo - 0.001;
  }

  /** Suma turbo sin pasar del máximo. Devuelve lo que realmente entró. */
  addTurbo(amount: number): number {
    const before = this.turbo;
    this.turbo = Math.min(this.maxTurbo, this.turbo + amount);
    return this.turbo - before;
  }

  get maxEnergy(): number {
    return this.values.maxEnergy;
  }

  /** Parte serializable para el sistema de guardado (fase futura). */
  serialize(): Record<string, number> {
    return {
      maxSpeed: this.values.maxSpeed,
      sprintMultiplier: this.values.sprintMultiplier,
      maxEnergy: this.values.maxEnergy,
      energy: this.energy,
      turbo: this.turbo,
    };
  }

  restore(data: Record<string, number>): void {
    if (typeof data.maxSpeed === "number") this.values.maxSpeed = data.maxSpeed;
    if (typeof data.sprintMultiplier === "number") {
      this.values.sprintMultiplier = data.sprintMultiplier;
    }
    if (typeof data.maxEnergy === "number") this.values.maxEnergy = data.maxEnergy;
    if (typeof data.energy === "number") this.energy = data.energy;
    if (typeof data.turbo === "number") this.turbo = Math.min(this.maxTurbo, data.turbo);
  }
}
