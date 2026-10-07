import type * as THREE from "three";
import { clamp } from "./math";
import type { Collider } from "../world/colliders";

/**
 * Resolviendo un círculo (jugador, visto desde arriba) contra un AABB.
 * Empuja `pos` por XZ fuera de la caja. Devuelve true si hubo solapamiento.
 * Simple y predecible: colisiones estilo consola, sin física compleja.
 */
export function resolveCircleVsAABB(
  pos: THREE.Vector3,
  radius: number,
  box: Collider
): boolean {
  if (pos.y >= box.max.y) return false; // por encima de la caja
  const cx = clamp(pos.x, box.min.x, box.max.x);
  const cz = clamp(pos.z, box.min.z, box.max.z);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return false;

  if (distSq > 1e-10) {
    const dist = Math.sqrt(distSq);
    const push = (radius - dist) / dist;
    pos.x += dx * push;
    pos.z += dz * push;
  } else {
    // Centro dentro de la caja: salir por el eje más corto.
    const toMinX = pos.x - (box.min.x - radius);
    const toMaxX = box.max.x + radius - pos.x;
    const toMinZ = pos.z - (box.min.z - radius);
    const toMaxZ = box.max.z + radius - pos.z;
    const min = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
    if (min === toMinX) pos.x = box.min.x - radius;
    else if (min === toMaxX) pos.x = box.max.x + radius;
    else if (min === toMinZ) pos.z = box.min.z - radius;
    else pos.z = box.max.z + radius;
  }
  return true;
}

/**
 * Rayo contra AABB (método de slabs). Devuelve la distancia de impacto
 * dentro de [0, maxDist] o Infinity. `dir` debe estar normalizado.
 * Lo usa la cámara para no meterse dentro de los edificios.
 */
export function rayVsAABB(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist: number,
  box: Collider
): number {
  let tMin = 0;
  let tMax = maxDist;
  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
  for (const axis of axes) {
    const o = origin[axis];
    const d = dir[axis];
    const min = box.min[axis];
    const max = box.max[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < min || o > max) return Infinity;
      continue;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  // Origen dentro de la caja: se ignora (no hay nada que recortar).
  return tMin > 0 ? tMin : Infinity;
}
