import { ROADS } from "../../data/cityLayout";

const EPS = 0.2;

/**
 * Utilidades de calzada: ningún objeto puede quedar sobre el asfalto.
 * Se usan al colocar farolas, máquinas expendedoras y mobiliario urbano.
 */
export function isOnRoad(x: number, z: number, margin = 0): boolean {
  for (const r of ROADS) {
    const along = r.axis === "x" ? x : z;
    const across = r.axis === "x" ? z : x;
    if (along < r.from || along > r.to) continue;
    if (Math.abs(across - r.at) < r.width / 2 + margin + EPS) return true;
  }
  return false;
}

/**
 * Devuelve (x, z) fuera de la calzada, sobre la acera más cercana.
 * Si ya está fuera, devuelve la posición sin cambios.
 */
export function offRoad(x: number, z: number, push = 0.8): [number, number] {
  for (const r of ROADS) {
    const along = r.axis === "x" ? x : z;
    const across = r.axis === "x" ? z : x;
    if (along < r.from || along > r.to) continue;
    const h = r.width / 2 + EPS;
    const d = across - r.at;
    if (Math.abs(d) < h) {
      const target = r.at + (d >= 0 ? h + push : -(h + push));
      return r.axis === "x" ? [x, target] : [target, z];
    }
  }
  return [x, z];
}
