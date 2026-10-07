import * as THREE from "three";

/** Cualquier cosa con la que se pueda interactuar con E. */
export interface Interactable {
  id: string;
  /** Posición de mundo (referencia viva). También se usa para la orientación. */
  position: THREE.Vector3;
  radius: number;
  /** Texto del aviso, p. ej. "Hablar con Tito". */
  prompt(): string;
  enabled?(): boolean;
  interact(): void;
  /**
   * Distancia personalizada (p. ej. un coche mide hasta su carrocería, no
   * hasta su centro → se puede usar desde cualquier lado).
   */
  distanceTo?(p: THREE.Vector3): number;
  /** Radio de pre-filtro alrededor de `position` (evita cálculos caros lejos). */
  cullRadius?: number;
  /** Indicador en el mundo sobre el objeto ("[E] ENTRAR"). */
  worldLabel?(): string;
  /** Punto de anclaje del indicador (por defecto `position`). */
  anchor?: THREE.Vector3;
  anchorHeight?: number;
  /** Menor = más prioritario a igual distancia (p. ej. vehículos). */
  priority?: number;
}

const tmp = new THREE.Vector3();

/**
 * Elige UN único interactuable prioritario cerca del jugador (distancia +
 * penalización si queda a la espalda) y lo ejecuta al pulsar E.
 * Pre-filtro barato por distancia al centro antes de `enabled()`.
 */
export class InteractionSystem {
  private items = new Map<string, Interactable>();
  current: Interactable | null = null;

  register(item: Interactable): void {
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  update(playerPos: THREE.Vector3, playerYaw: number): void {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    const fx = Math.sin(playerYaw);
    const fz = Math.cos(playerYaw);
    for (const item of this.items.values()) {
      tmp.subVectors(item.position, playerPos);
      tmp.y = 0;
      const center = tmp.length();
      if (center > (item.cullRadius ?? item.radius)) continue;
      if (item.enabled && !item.enabled()) continue;
      const d = item.distanceTo ? item.distanceTo(playerPos) : center;
      if (d > item.radius) continue;
      const facing = center > 0.01 ? (tmp.x * fx + tmp.z * fz) / center : 1;
      const score = (d + (item.priority ?? 0)) * (facing > 0 ? 1 : 1.8);
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    this.current = best;
  }

  /** Ejecuta la interacción actual. Devuelve true si había algo. */
  tryInteract(): boolean {
    if (!this.current) return false;
    this.current.interact();
    return true;
  }
}
