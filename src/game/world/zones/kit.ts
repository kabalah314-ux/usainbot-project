import * as THREE from "three";
import { aabb } from "../colliders";
import { rotatedAabb } from "../Props";
import type { Collider } from "../colliders";
import type { StaticBatcher } from "../../utils/StaticBatcher";

/**
 * Props industriales / de costa reutilizables entre zonas (puerto, playa,
 * centro…). Todo se añade al StaticBatcher compartido: 0 draw calls extra.
 */

/** Grúa de puerto: mástil, pluma, contrapeso, cable y gancho. */
export function addCrane(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  rotY: number,
  reach = 5.5
): void {
  b.setBase(x, 0, z, rotY);
  b.box(1.4, 0.4, 1.4, 0x2f353c, 0, 0.2, 0);
  b.box(0.45, 8.4, 0.45, 0xf2c21c, 0, 4.4, 0);
  b.box(reach + 0.9, 0.26, 0.26, 0xf2c21c, (reach + 0.9) / 2 - 0.2, 8.5, 0);
  b.box(1.3, 0.7, 0.7, 0x2f353c, -0.7, 8.3, 0);
  b.box(0.06, 3.6, 0.06, 0x2f353c, reach - 0.2, 6.6, 0);
  b.box(0.34, 0.3, 0.34, 0x2f353c, reach - 0.2, 4.7, 0);
  b.cyl(0.1, 0.1, 0.5, 8, 0x2f353c, reach - 0.2, 8.7, 0);
  cols.push(rotatedAabb(x, z, 1.4, 1.4, rotY, 8.8));
}

/** Contenedor marítimo (colores vivos, como los del puerto). */
export function addContainer(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  rotY: number,
  color: number
): void {
  b.setBase(x, 0, z, rotY);
  b.box(2.4, 2.6, 6, color, 0, 1.3, 0);
  for (let i = -2; i <= 2; i++) b.box(2.46, 2.3, 0.06, 0x2f353c, 0, 1.3, i * 1.15);
  b.box(2.46, 0.1, 6.05, 0x2f353c, 0, 2.6, 0);
  cols.push(rotatedAabb(x, z, 2.4, 6, rotY, 2.6));
}

/** Palmera costera: tronco inclinado y 6 frondas. */
export function addPalm(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  phase = 0,
  scale = 1
): void {
  b.setBase(x, 0, z, phase, scale);
  b.cyl(0.08, 0.15, 3.4, 8, 0x9a7b4f, 0.05, 1.7, 0, 0.1, 0, 0.05);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(0.2, 0.03, 1.5, i % 2 ? 0x3f9b4a : 0x4fae4c, Math.sin(a) * 0.55, 3.42, Math.cos(a) * 0.55, 0.55, a, 0);
  }
  b.add(new THREE.IcosahedronGeometry(0.08, 0), 0x6b3d22, 0.02, 3.4, 0.02);
  cols.push(aabb(x, z, 0.3, 0.3, 3.6));
}

/** Sombrilla de playa (base + pértiga + tela). */
export function addUmbrella(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  rotY: number,
  color: number
): void {
  b.setBase(x, 0, z, rotY);
  b.cyl(0.13, 0.15, 0.1, 8, 0x7b848d, 0, 0.05, 0);
  b.cyl(0.025, 0.025, 1.9, 6, 0x7b848d, 0, 1.0, 0);
  b.add(new THREE.ConeGeometry(0.85, 0.34, 8), color, 0, 2.0, 0);
  cols.push(aabb(x, z, 0.25, 0.25, 2.1));
}

/** Toldo/tienda de playa (caseta con techo a dos aguas). */
export function addBeachHut(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  rotY: number,
  color: number
): void {
  b.setBase(x, 0, z, rotY);
  b.box(2.4, 2.0, 1.8, 0xf6f2ea, 0, 1.0, 0);
  b.box(2.6, 0.1, 2.0, color, 0, 2.05, 0, 0.25, 0, 0);
  b.box(1.6, 0.08, 0.5, 0x2f353c, 0, 1.1, 1.1);
  b.box(1.2, 0.7, 0.05, 0x9fd3ec, 0, 1.4, 0.91);
  cols.push(rotatedAabb(x, z, 2.4, 1.8, rotY, 2.2));
}

/** Máquina expendedora genérica decorativa (sin lógica). */
export function addVendingBox(
  b: StaticBatcher,
  cols: Collider[],
  x: number,
  z: number,
  rotY: number,
  color: number
): void {
  b.setBase(x, 0, z, rotY);
  b.box(0.9, 1.8, 0.7, 0x1b1f26, 0, 0.9, 0);
  b.box(0.8, 0.5, 0.05, color, 0, 1.35, 0.36);
  b.box(0.7, 0.5, 0.05, 0x9fd3ec, 0, 0.7, 0.36);
  cols.push(rotatedAabb(x, z, 0.9, 0.7, rotY, 1.8));
}

/**
 * Fila de casas en bloque: la usan varias zonas para llenar huecos de vivienda
 * sin pisar calles (deja margen con los bordes indicados).
 */
export function addHouseRow(
  ctx: {
    props: StaticBatcher;
    colliders: Collider[];
    trees: { add(c: Collider[], x: number, z: number, s?: number): void };
    [k: string]: unknown;
  },
  opts: {
    x0: number;
    x1: number;
    z: number;
    facing: "n" | "s" | "e" | "w";
    styleBase: number;
    floors: 1 | 2;
    w?: number;
    d?: number;
    yard?: number;
  },
  addHouse: (ctx: never, spec: never) => void
): void {
  const w = opts.w ?? 5;
  const n = Math.max(1, Math.floor((opts.x1 - opts.x0) / (w + 0.7)));
  const step = (opts.x1 - opts.x0) / n;
  for (let i = 0; i < n; i++) {
    const x = opts.x0 + step * (i + 0.5);
    addHouse(ctx as never, {
      x,
      z: opts.z,
      facing: opts.facing,
      style: (opts.styleBase + i) % 8,
      floors: opts.floors,
      w,
      d: opts.d ?? 6.5,
      yard: opts.yard ?? 3,
    } as never);
    ctx.trees.add(ctx.colliders, x + step * 0.35, opts.z + (opts.facing === "n" ? 2.6 : -2.6), 0.75);
  }
}

/** Referencia compartida por si una zona quiere colisiones rápidas. */
export const KitColliders = { aabb, rotatedAabb };
