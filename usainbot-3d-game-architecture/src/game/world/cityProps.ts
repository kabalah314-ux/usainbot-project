import * as THREE from "three";
import type { StaticBatcher } from "../utils/StaticBatcher";
import { aabb } from "./colliders";
import type { Collider } from "./colliders";
import type { ZoneContext } from "./zones/Zone";
import { SIGN_UV } from "./signs";
import { GASOIL_UV } from "../gasoil/branding";
import { GASOIL_BRAND } from "../data/cityLayout";

/**
 * Mobiliario urbano del barrio (se suma a Props.ts). Todo va al
 * StaticBatcher / QuadBatcher de la zona: no crea mallas nuevas.
 */
const DARK = 0x2f353c;
const METAL = 0x7b848d;

/** Convierte coordenadas locales de un objeto girado a mundo. */
export function localToWorld(x: number, z: number, rotY: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

export function addMailbox(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number, color = 0x2f6fb3): void {
  b.setBase(x, 0, z, rotY);
  b.box(0.1, 1.0, 0.1, DARK, 0, 0.5, 0);
  b.box(0.42, 0.34, 0.6, color, 0, 1.15, 0);
  b.cyl(0.21, 0.21, 0.6, 8, color, 0, 1.32, 0, Math.PI / 2, 0, 0);
  b.box(0.04, 0.22, 0.12, 0xd8322b, 0.23, 1.35, -0.1);
  cols.push(aabb(x, z, 0.4, 0.4, 1.4));
}

export function addDumpster(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number, color = 0x2e7d4f): void {
  b.setBase(x, 0, z, rotY);
  b.box(2.2, 1.3, 1.3, color, 0, 0.75, 0);
  b.box(2.3, 0.12, 1.4, 0x1f5a37, 0, 1.45, -0.05, -0.12, 0, 0);
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-0.5, 0.5]) b.cyl(0.1, 0.1, 0.1, 8, DARK, sx, 0.08, sz, 0, 0, Math.PI / 2);
  }
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  cols.push(aabb(x, z, 2.3 * c + 1.4 * s, 2.3 * s + 1.4 * c, 1.5));
}

/** Valla recta (alineada con X o Z) con postes y dos travesaños. */
export function addFence(
  b: StaticBatcher,
  cols: Collider[],
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  color = 0xf4f1ea,
  height = 1.1
): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.2) return;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const rot = alongX ? 0 : Math.PI / 2;
  b.setBase((x0 + x1) / 2, 0, (z0 + z1) / 2, rot);
  b.box(len, 0.1, 0.08, color, 0, height * 0.45, 0);
  b.box(len, 0.1, 0.08, color, 0, height * 0.85, 0);
  const posts = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= posts; i++) b.box(0.14, height, 0.14, color, -len / 2 + (i * len) / posts, height / 2, 0);
  cols.push(
    aabb((x0 + x1) / 2, (z0 + z1) / 2, alongX ? len : 0.3, alongX ? 0.3 : len, height)
  );
}

/**
 * Línea de bolardos (zonas peatonales): huecos de ~1,4 m → UsainBot pasa,
 * el coche (≈2,1 m de ancho) no. Así correr sigue teniendo sentido.
 */
export function addBollards(b: StaticBatcher, cols: Collider[], x0: number, z0: number, x1: number, z1: number, spacing = 1.75): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / spacing));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    b.setBase(x, 0, z);
    b.cyl(0.14, 0.17, 0.9, 8, DARK, 0, 0.45, 0);
    b.cyl(0.155, 0.155, 0.12, 8, 0xf2c21c, 0, 0.72, 0);
    cols.push(aabb(x, z, 0.3, 0.3, 0.9));
  }
}

/** Muro bajo de piedra/obra (linderos, perímetro). */
export function addWall(
  b: StaticBatcher,
  cols: Collider[] | null,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  color = 0xd8ccb4,
  height = 1.3
): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  if (len < 0.2) return;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  b.setBase(cx, 0, cz, alongX ? 0 : Math.PI / 2);
  b.box(len, height, 0.45, color, 0, height / 2, 0);
  b.box(len + 0.1, 0.12, 0.6, 0xf0e8d6, 0, height + 0.06, 0);
  cols?.push(aabb(cx, cz, alongX ? len : 0.5, alongX ? 0.5 : len, height));
}

export function addHedge(b: StaticBatcher, cols: Collider[], x0: number, z0: number, x1: number, z1: number, h = 1.2): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  b.setBase(cx, 0, cz, alongX ? 0 : Math.PI / 2);
  b.box(len, h, 0.9, 0x3d8f45, 0, h / 2, 0);
  b.box(len - 0.1, 0.25, 0.75, 0x4fa852, 0, h + 0.1, 0);
  cols.push(aabb(cx, cz, alongX ? len : 0.9, alongX ? 0.9 : len, h));
}

/** Poste con placa(s) de calle a doble cara. */
export function addStreetSign(ctx: ZoneContext, x: number, z: number, keyA: string, rotA: number, keyB?: string): void {
  const b = ctx.props;
  b.setBase(x, 0, z);
  b.cyl(0.06, 0.07, 3.6, 8, 0x2c5f3f, 0, 1.8, 0);
  b.box(2.3, 0.62, 0.05, 0x1e6b3c, 0, 3.2, 0, 0, rotA, 0);
  ctx.signs.addDouble(x, 3.2, z, rotA, 2.2, 0.55, SIGN_UV[keyA]);
  if (keyB) {
    b.setBase(x, 0, z);
    b.box(2.3, 0.62, 0.05, 0x1e6b3c, 0, 3.85, 0, 0, rotA + Math.PI / 2, 0);
    ctx.signs.addDouble(x, 3.85, z, rotA + Math.PI / 2, 2.2, 0.55, SIGN_UV[keyB]);
  }
  ctx.colliders.push(aabb(x, z, 0.25, 0.25, 3.6));
}

/** Cartel publicitario de GasOil sobre postes (anuncio por delante y por detrás). */
export function addGasOilBillboard(
  ctx: ZoneContext,
  x: number,
  z: number,
  rotY: number,
  ad: number,
  backAd = (ad + 1) % 4,
  scale = 1,
  elevation = 0
): void {
  const b = ctx.props;
  const w = 8 * scale;
  const h = 4 * scale;
  const y = elevation + 3.4 * scale + h / 2;
  b.setBase(x, elevation, z, rotY);
  for (const px of [-w * 0.3, w * 0.3]) b.box(0.35, 3.4 * scale + 0.2, 0.35, DARK, px, (3.4 * scale) / 2, 0);
  b.box(w + 0.4, h + 0.4, 0.3, GASOIL_BRAND.charcoal, 0, 3.4 * scale + h / 2, 0);
  b.box(w + 0.6, 0.2, 0.9, METAL, 0, 3.4 * scale - 0.1, 0.4);
  const [fx, fz] = localToWorld(x, z, rotY, 0, 0.17);
  const [bx, bz] = localToWorld(x, z, rotY, 0, -0.17);
  ctx.gasoil.add(fx, y, fz, rotY, w, h, GASOIL_UV.ads[ad]);
  ctx.gasoil.add(bx, y, bz, rotY + Math.PI, w, h, GASOIL_UV.ads[backAd]);
  if (elevation === 0) {
    for (const px of [-w * 0.3, w * 0.3]) {
      const [cx, cz] = localToWorld(x, z, rotY, px, 0);
      ctx.colliders.push(aabb(cx, cz, 0.5, 0.5, 3.4 * scale));
    }
  }
}

/** Líneas de aparcamiento en batería. `dir` = hacia dónde se abren las plazas (+1/-1 en Z). */
export function addParkingRow(b: StaticBatcher, x0: number, x1: number, z: number, depth: number, dir: 1 | -1, slot = 2.8): void {
  const n = Math.floor((x1 - x0) / slot);
  for (let i = 0; i <= n; i++) {
    b.setBase(x0 + i * slot, 0.03, z + (dir * depth) / 2);
    b.box(0.14, 0.02, depth, 0xf1eee6, 0, 0, 0);
  }
  b.setBase((x0 + x1) / 2, 0.03, z);
  b.box(n * slot, 0.02, 0.14, 0xf1eee6, 0, 0, 0);
}

/** Barrera de "próximamente" con señal (salidas de la zona). */
export function addRoadBlock(ctx: ZoneContext, x: number, z: number, width: number, rotY: number, signKey: string): void {
  const b = ctx.props;
  b.setBase(x, 0, z, rotY);
  const n = Math.round(width / 2.4);
  for (let i = 0; i < n; i++) {
    const lx = -width / 2 + 1.2 + i * 2.4;
    for (const sx of [-1.0, 1.0]) b.box(0.1, 1.1, 0.1, METAL, lx + sx, 0.55, 0);
    for (let k = 0; k < 5; k++) b.box(0.4, 0.3, 0.08, k % 2 ? 0xf6f2ea : 0xd8322b, lx - 0.8 + k * 0.4, 0.9, 0);
  }
  b.box(0.2, 3.4, 0.2, DARK, -width / 2 - 0.6, 1.7, 0);
  b.box(0.2, 3.4, 0.2, DARK, width / 2 + 0.6, 1.7, 0);
  b.box(width + 1.4, 1.6, 0.12, 0x1b1f26, 0, 3.6, 0);
  const [sx, sz] = localToWorld(x, z, rotY, 0, 0.08);
  const [bx, bz] = localToWorld(x, z, rotY, 0, -0.08);
  ctx.signs.add(sx, 3.6, sz, rotY, width + 1.2, 1.4, SIGN_UV[signKey]);
  ctx.signs.add(bx, 3.6, bz, rotY + Math.PI, width + 1.2, 1.4, SIGN_UV[signKey]);
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  ctx.colliders.push(aabb(x, z, (width + 1.4) * c + 0.5 * s, (width + 1.4) * s + 0.5 * c, 3));
}

/** Rótulo de tienda sobre la planta baja (lo pinta el atlas de carteles). */
export function addShopSign(ctx: ZoneContext, x: number, y: number, z: number, rotY: number, key: string, w = 6): void {
  ctx.props.setBase(x, 0, z, rotY);
  ctx.props.box(w + 0.3, w / 4 + 0.3, 0.2, 0x1b1f26, 0, y, -0.12);
  const [sx, sz] = localToWorld(x, z, rotY, 0, 0.0);
  ctx.signs.add(sx, y, sz, rotY, w, w / 4, SIGN_UV[key]);
}

export const tmpVec = new THREE.Vector3();
