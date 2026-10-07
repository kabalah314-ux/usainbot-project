import * as THREE from "three";
import { aabb } from "../colliders";
import type { BuildingSpec } from "../buildings";
import type { MapBuildingKind } from "../map/MapData";
import { addAwning, addRooftop } from "../Props";
import { createGoldStatue } from "../Statue";
import { waterTexture } from "../../utils/textures";
import type { StaticBatcher } from "../../utils/StaticBatcher";
import type { Collider } from "../colliders";
import type { ZoneContext } from "./Zone";

let rooftopSeed = 900;

/** Edificio con fachada del atlas + toldo + azotea + colisión + mapa. */
export function addFacade(ctx: ZoneContext, spec: BuildingSpec, kind: MapBuildingKind, awning = true): void {
  ctx.facades.push(spec);
  ctx.colliders.push(aabb(spec.x, spec.z, spec.w, spec.d, spec.h));
  if (awning) addAwning(ctx.props, spec);
  addRooftop(ctx.props, spec, rooftopSeed++);
  ctx.map.building(kind, spec.x - spec.w / 2, spec.x + spec.w / 2, spec.z - spec.d / 2, spec.z + spec.d / 2);
}

/** Agua animada (fuentes, estanques, piscinas). */
export function addWater(ctx: ZoneContext, geometry: THREE.BufferGeometry, y: number, repeat = 2): THREE.Mesh {
  const map = waterTexture();
  map.repeat.set(repeat, repeat);
  ctx.waterMaps.push(map);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshPhongMaterial({ map, specular: 0xe8fbff, shininess: 90, transparent: true, opacity: 0.93 })
  );
  mesh.position.y = y;
  mesh.receiveShadow = true;
  ctx.group.add(mesh);
  return mesh;
}

/** Fuente con la estatua dorada de UsainBot (reutiliza el esqueleto del personaje). */
export function addStatueFountain(ctx: ZoneContext, x: number, z: number): void {
  const b = ctx.props;
  const stone = 0xdccfb6;
  const stoneDark = 0xb9ab92;
  b.setBase(x, 0, z);
  b.cyl(3.45, 3.6, 0.75, 40, stone, 0, 0.38, 0);
  b.cyl(3.62, 3.62, 0.08, 40, stoneDark, 0, 0.1, 0);
  b.cyl(1.05, 1.25, 0.6, 20, stoneDark, 0, 1.0, 0);
  b.cyl(0.72, 0.82, 1.4, 20, stone, 0, 1.95, 0);
  b.cyl(1.0, 0.9, 0.28, 20, stoneDark, 0, 2.78, 0);
  const pool = new THREE.CircleGeometry(3.1, 40);
  pool.rotateX(-Math.PI / 2);
  pool.translate(x, 0, z);
  addWater(ctx, pool, 0.77);
  const statue = createGoldStatue();
  statue.scale.setScalar(1.45);
  statue.position.set(x, 2.92, z);
  ctx.group.add(statue);
  ctx.colliders.push(aabb(x, z, 6.3, 6.3, 5.8));
}

/**
 * Muro recto con huecos (puertas). Genera la geometría y las colisiones
 * de cada tramo. Solo tramos alineados con los ejes.
 */
export function addWallWithGaps(
  b: StaticBatcher,
  cols: Collider[],
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  gaps: Array<[number, number]>,
  color: number,
  height: number,
  thickness = 0.5
): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const a = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const bEnd = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const fixed = alongX ? z0 : x0;
  const sorted = [...gaps].sort((p, q) => p[0] - q[0]);
  let cursor = a;
  const pieces: Array<[number, number]> = [];
  for (const [g0, g1] of sorted) {
    if (g0 > cursor) pieces.push([cursor, g0]);
    cursor = Math.max(cursor, g1);
  }
  if (cursor < bEnd) pieces.push([cursor, bEnd]);
  for (const [p0, p1] of pieces) {
    const len = p1 - p0;
    const mid = (p0 + p1) / 2;
    const cx = alongX ? mid : fixed;
    const cz = alongX ? fixed : mid;
    b.setBase(cx, 0, cz, alongX ? 0 : Math.PI / 2);
    b.box(len + (alongX ? thickness : thickness), height, thickness, color, 0, height / 2, 0);
    cols.push(aabb(cx, cz, alongX ? len + thickness : thickness, alongX ? thickness : len + thickness, height));
  }
  // Dinteles sobre los huecos
  for (const [g0, g1] of sorted) {
    const mid = (g0 + g1) / 2;
    b.setBase(alongX ? mid : fixed, 0, alongX ? fixed : mid, alongX ? 0 : Math.PI / 2);
    b.box(g1 - g0, Math.max(0.1, height - 3.4), thickness, color, 0, 3.4 + (height - 3.4) / 2, 0);
  }
}
