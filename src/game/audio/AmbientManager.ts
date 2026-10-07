import type * as THREE from "three";
import type { DayPhase } from "../data/life";
import type { AudioManager } from "./AudioManager";

/** Capas de ambiente previstas (cada una tendrá su bucle de audio). */
export type AmbientLayer = "city" | "traffic" | "park" | "machines" | "crowd" | "night" | "footsteps";

export interface AmbientInput {
  listener: THREE.Vector3;
  zoneId: string | null;
  phase: DayPhase;
  /** Coches activos a menos de 40 m. */
  carsNear: number;
  /** Peatones visibles a menos de 25 m. */
  peopleNear: number;
  /** Distancia a la máquina GasOil más cercana. */
  machineDistance: number;
  playerSpeed: number;
  inVehicle: boolean;
}

/**
 * Sonido ambiental (arquitectura preparada). Calcula cada 0,25 s el volumen
 * objetivo de cada capa según zona, hora, tráfico, gente y máquinas, y se lo
 * pasa a AudioManager.setAmbientLayer (hoy sin samples: se guardan los
 * niveles y el panel de depuración los muestra). Añadir el audio real
 * = cargar los bucles en AudioManager; esta lógica no cambia.
 */
export class AmbientManager {
  readonly levels: Record<AmbientLayer, number> = {
    city: 0,
    traffic: 0,
    park: 0,
    machines: 0,
    crowd: 0,
    night: 0,
    footsteps: 0,
  };
  private audio: AudioManager;
  private t = 0;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  update(dt: number, input: AmbientInput): void {
    this.t += dt;
    if (this.t < 0.25) return;
    this.t = 0;
    const night = input.phase === "NIGHT";
    const target: Record<AmbientLayer, number> = {
      city: night ? 0.25 : 0.5,
      traffic: Math.min(1, input.carsNear / 4) * (input.inVehicle ? 0.5 : 1),
      park: input.zoneId === "park" ? (night ? 0.3 : 0.8) : 0,
      machines: Math.max(0, 1 - input.machineDistance / 12),
      crowd: Math.min(1, input.peopleNear / 6) * (input.zoneId === "commercial" ? 1 : 0.6),
      night: night ? 0.7 : input.phase === "EVENING" ? 0.2 : 0,
      footsteps: !input.inVehicle && input.playerSpeed > 0.5 ? Math.min(1, input.playerSpeed / 8) : 0,
    };
    for (const layer of Object.keys(target) as AmbientLayer[]) {
      // Suavizado para que las capas no salten al cambiar de zona
      this.levels[layer] += (target[layer] - this.levels[layer]) * 0.35;
      this.audio.setAmbientLayer(layer, this.levels[layer]);
    }
  }

  /** Resumen de una línea (debug). */
  summary(): string {
    return (Object.keys(this.levels) as AmbientLayer[])
      .filter((k) => this.levels[k] > 0.05)
      .map((k) => `${k}:${this.levels[k].toFixed(1)}`)
      .join(" ");
  }
}
