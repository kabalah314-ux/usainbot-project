import * as THREE from "three";

/** AABB usado para colisiones baratas (resolución por XZ + suelo a y=0). */
export interface Collider {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function aabb(
  cx: number,
  cz: number,
  width: number,
  depth: number,
  height: number
): Collider {
  return {
    min: new THREE.Vector3(cx - width / 2, 0, cz - depth / 2),
    max: new THREE.Vector3(cx + width / 2, height, cz + depth / 2),
  };
}

/** Límites horizontales jugables del sandbox. */
export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
