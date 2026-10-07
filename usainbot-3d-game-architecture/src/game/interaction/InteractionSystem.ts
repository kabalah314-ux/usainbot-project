import * as THREE from "three";

/** Cualquier cosa con la que se pueda interactuar con △ / E. */
export interface Interactable {
  id: string;
  /** Posición de mundo (referencia viva). */
  position: THREE.Vector3;
  radius: number;
  /** Texto del aviso, p. ej. "Hablar con Tito". */
  prompt(): string;
  enabled?(): boolean;
  interact(): void;
}

const tmp = new THREE.Vector3();

/**
 * Elige el interactuable más adecuado cerca del jugador (distancia +
 * penalización si queda a la espalda) y lo ejecuta al pulsar △.
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
      if (item.enabled && !item.enabled()) continue;
      tmp.subVectors(item.position, playerPos);
      tmp.y = 0;
      const d = tmp.length();
      if (d > item.radius) continue;
      const facing = d > 0.01 ? (tmp.x * fx + tmp.z * fz) / d : 1;
      const score = d * (facing > 0 ? 1 : 1.8);
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
