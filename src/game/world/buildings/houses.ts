import * as THREE from "three";
import { rotatedAabb } from "../Props";
import { addFence, addHedge, addMailbox, localToWorld } from "../cityProps";
import type { ZoneContext } from "../zones/Zone";

/** Hacia dónde mira la fachada principal. */
export type Facing = "n" | "s" | "e" | "w";

export const FACING_ROT: Record<Facing, number> = {
  s: 0,
  e: Math.PI / 2,
  n: Math.PI,
  w: -Math.PI / 2,
};

export interface HouseSpec {
  x: number;
  z: number;
  facing: Facing;
  style: number;
  floors?: 1 | 2;
  /** Ancho de fachada y fondo (m). */
  w?: number;
  d?: number;
  /** Profundidad del jardín delantero (m) hasta la valla. */
  yard?: number;
}

const WALLS = [0xf6e7c8, 0xa7d3e8, 0xf2b8a2, 0xc9e4a6, 0xf7d774, 0xd9c2ee];
const ROOFS = [0xb5452f, 0x3f5d7d, 0x7a4b2a, 0x2e6e4a, 0x8e3b5e];
const DOORS = [0x2f6fb3, 0xd8322b, 0x2e7d4f, 0x6b3d22, 0x1b1f26];
const TRIM = 0xfbf8f1;
const GLASS = 0x8fc9e8;

/** Prisma triangular unitario con normales planas (tejados a dos aguas). */
export function prismGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1).toNonIndexed();
  g.computeVertexNormals();
  return g;
}

/**
 * Añade un tejado a dos aguas: cumbrera a lo largo de X local.
 * (Ver cálculo de ejes en la construcción: sx → ancho, sy → largo, sz → alto.)
 */
export function addGableRoof(
  ctx: ZoneContext,
  length: number,
  width: number,
  height: number,
  baseY: number,
  color: number,
  lx = 0,
  lz = 0
): void {
  const sz = height / 1.5;
  ctx.props.add(prismGeometry(), color, lx, baseY + 0.5 * sz, lz, -Math.PI / 2, 0, Math.PI / 2, width / 2 / 0.866, length, sz);
}

/**
 * Vivienda unifamiliar low poly: cuerpo, tejado a dos aguas, porche,
 * ventanas, chimenea, jardín con valla, buzón y árbol.
 */
export function addHouse(ctx: ZoneContext, spec: HouseSpec): void {
  const b = ctx.props;
  const rot = FACING_ROT[spec.facing];
  const w = spec.w ?? 10;
  const d = spec.d ?? 9;
  const floors = spec.floors ?? 1;
  const h = floors * 3.2;
  const yard = spec.yard ?? 6;
  const s = spec.style;
  const wall = WALLS[s % WALLS.length];
  const roof = ROOFS[s % ROOFS.length];
  const door = DOORS[s % DOORS.length];

  b.setBase(spec.x, 0, spec.z, rot);
  b.box(w + 0.3, 0.35, d + 0.3, 0xbfb6a6, 0, 0.17, 0);
  b.box(w, h, d, wall, 0, h / 2 + 0.3, 0);
  // Tejado + aleros
  addGableRoof(ctx, w + 0.8, d + 1.0, floors === 2 ? 2.6 : 2.2, h + 0.3, roof);
  b.setBase(spec.x, 0, spec.z, rot);
  b.box(w + 0.8, 0.18, d + 1.0, TRIM, 0, h + 0.35, 0);
  // Chimenea
  b.box(0.9, 2.2, 0.9, 0xa0523a, w * 0.28, h + 1.5, -d * 0.18);
  b.box(1.1, 0.2, 1.1, 0x5a3526, w * 0.28, h + 2.65, -d * 0.18);

  // Fachada: puerta, ventanas y porche
  const fz = d / 2;
  b.box(1.4, 2.4, 0.12, TRIM, 0, 1.5, fz + 0.02);
  b.box(1.1, 2.2, 0.14, door, 0, 1.45, fz + 0.03);
  b.box(0.1, 0.1, 0.1, 0xe8c35a, 0.38, 1.4, fz + 0.12);
  for (let f = 0; f < floors; f++) {
    const y = 0.3 + f * 3.2 + 1.85;
    for (const wx of f === 0 ? [-w * 0.3, w * 0.3] : [-w * 0.3, 0, w * 0.3]) {
      b.box(1.7, 1.5, 0.1, TRIM, wx, y, fz + 0.02);
      b.box(1.4, 1.2, 0.12, GLASS, wx, y, fz + 0.03);
      b.box(1.9, 0.12, 0.3, TRIM, wx, y - 0.8, fz + 0.1);
    }
    for (const side of [-1, 1]) {
      b.box(0.1, 1.2, 1.4, GLASS, side * (w / 2 + 0.03), y, 0);
      b.box(0.12, 1.5, 1.7, TRIM, side * (w / 2 + 0.01), y, 0);
    }
  }
  b.box(3.4, 0.25, 2.0, 0xd9d2c3, 0, 0.42, fz + 1.0);
  for (const px of [-1.5, 1.5]) b.box(0.18, 2.6, 0.18, TRIM, px, 1.65, fz + 1.85);
  b.box(3.8, 0.15, 2.3, roof, 0, 3.0, fz + 1.05, 0.18, 0, 0);

  ctx.colliders.push(rotatedAabb(spec.x, spec.z, w + 0.3, d + 0.3, rot, h + 2));
  const [pcx, pcz] = localToWorld(spec.x, spec.z, rot, 0, fz + 1.2);
  ctx.colliders.push(rotatedAabb(pcx, pcz, 3.6, 1.2, rot, 3));

  // Jardín delantero: valla con cancela, seto lateral, buzón y árbol
  const gz = fz + yard;
  const half = w / 2 + 1.5;
  const fence = (ax: number, az: number, bx: number, bz: number): void => {
    const [x0, z0] = localToWorld(spec.x, spec.z, rot, ax, az);
    const [x1, z1] = localToWorld(spec.x, spec.z, rot, bx, bz);
    addFence(b, ctx.colliders, x0, z0, x1, z1, TRIM, 0.95);
  };
  fence(-half, gz, -1.3, gz);
  fence(1.3, gz, half, gz);
  const [hx0, hz0] = localToWorld(spec.x, spec.z, rot, half, fz + 0.8);
  const [hx1, hz1] = localToWorld(spec.x, spec.z, rot, half, gz - 0.6);
  addHedge(b, ctx.colliders, hx0, hz0, hx1, hz1, 1.0);
  const [mx, mz] = localToWorld(spec.x, spec.z, rot, 2.2, gz + 0.5);
  addMailbox(b, ctx.colliders, mx, mz, rot, door);
  const [tx, tz] = localToWorld(spec.x, spec.z, rot, -w * 0.32, fz + yard * 0.5);
  ctx.trees.add(ctx.colliders, tx, tz, 0.85);
  // Camino de entrada
  const [px0, pz0] = localToWorld(spec.x, spec.z, rot, -0.8, fz + 2);
  const [px1, pz1] = localToWorld(spec.x, spec.z, rot, 0.8, gz);
  ctx.ground.rect("pavement", Math.min(px0, px1), Math.max(px0, px1), Math.min(pz0, pz1), Math.max(pz0, pz1));

  const c = Math.abs(Math.cos(rot));
  const sn = Math.abs(Math.sin(rot));
  const ew = w * c + d * sn;
  const ed = w * sn + d * c;
  ctx.map.building("house", spec.x - ew / 2, spec.x + ew / 2, spec.z - ed / 2, spec.z + ed / 2);
}
