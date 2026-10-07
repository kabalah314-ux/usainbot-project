import * as THREE from "three";
import type { StaticBatcher } from "../utils/StaticBatcher";
import { addWindSway, toon } from "../utils/materials";
import { billboardTexture } from "../utils/textures";
import { createRng, randPick, randRange } from "../utils/random";
import { aabb } from "./colliders";
import type { Collider } from "./colliders";
import type { BuildingSpec } from "./buildings";
import { FACADE_STYLES } from "./buildingAtlas";

/**
 * Props de la ciudad. Los de color liso se añaden a un StaticBatcher
 * (todo el mobiliario = 1 draw call). Los árboles son instancias.
 */

const DARK = 0x2f353c;
const METAL = 0x6b737c;
const WOOD = 0xa56d3d;

/** AABB de un rectángulo rotado (colisiones de props girados). */
export function rotatedAabb(x: number, z: number, w: number, d: number, rotY: number, h: number): Collider {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  return aabb(x, z, w * c + d * s, w * s + d * c, h);
}

export function addLamp(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number): void {
  b.setBase(x, 0, z, rotY);
  b.cyl(0.2, 0.24, 0.35, 8, DARK, 0, 0.17, 0);
  b.cyl(0.07, 0.1, 4.4, 8, DARK, 0, 2.3, 0);
  b.box(0.08, 0.08, 1.25, DARK, 0, 4.45, 0.55, -0.12, 0, 0);
  b.box(0.46, 0.18, 0.64, DARK, 0, 4.36, 1.15);
  b.box(0.34, 0.05, 0.48, 0xfff1bf, 0, 4.25, 1.15);
  cols.push(aabb(x, z, 0.45, 0.45, 4.6));
}

export function addBench(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number): void {
  b.setBase(x, 0, z, rotY);
  for (const sx of [-0.75, 0.75]) {
    b.box(0.08, 0.46, 0.5, DARK, sx, 0.23, 0);
    b.box(0.08, 0.5, 0.08, DARK, sx, 0.7, -0.24);
    b.box(0.08, 0.06, 0.5, DARK, sx, 0.66, 0.02);
  }
  for (const [y, zz] of [
    [0.47, 0.12],
    [0.47, -0.08],
  ] as const) {
    b.box(1.8, 0.05, 0.18, WOOD, 0, y, zz);
  }
  b.box(1.8, 0.14, 0.05, WOOD, 0, 0.72, -0.25, -0.12, 0, 0);
  b.box(1.8, 0.14, 0.05, WOOD, 0, 0.9, -0.27, -0.12, 0, 0);
  cols.push(rotatedAabb(x, z, 1.9, 0.6, rotY, 0.95));
}

export function addBin(b: StaticBatcher, cols: Collider[], x: number, z: number): void {
  b.setBase(x, 0, z);
  b.cyl(0.28, 0.24, 0.8, 10, 0x2e7d4f, 0, 0.4, 0);
  b.cyl(0.31, 0.31, 0.07, 10, DARK, 0, 0.83, 0);
  b.cyl(0.29, 0.29, 0.04, 10, 0xf2c21c, 0, 0.62, 0);
  cols.push(aabb(x, z, 0.6, 0.6, 0.9));
}

export function addHydrant(b: StaticBatcher, cols: Collider[], x: number, z: number): void {
  b.setBase(x, 0, z);
  b.cyl(0.13, 0.16, 0.55, 8, 0xd63a2f, 0, 0.28, 0);
  b.cyl(0.09, 0.13, 0.14, 8, 0xd63a2f, 0, 0.62, 0);
  b.box(0.42, 0.08, 0.08, 0xe8e2d6, 0, 0.42, 0);
  b.cyl(0.18, 0.18, 0.05, 8, 0xe8e2d6, 0, 0.03, 0);
  cols.push(aabb(x, z, 0.35, 0.35, 0.75));
}

export function addCar(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number, color: number): void {
  b.setBase(x, 0, z, rotY);
  b.box(1.82, 0.6, 4.0, color, 0, 0.62, 0);
  b.box(1.62, 0.5, 2.0, 0x9fd3ec, 0, 1.17, -0.25);
  b.box(1.66, 0.09, 1.9, color, 0, 1.46, -0.25);
  b.box(1.68, 0.44, 0.1, color, 0, 1.15, 0.72, 0.5, 0, 0);
  b.box(1.9, 0.18, 0.16, DARK, 0, 0.42, 2.02);
  b.box(1.9, 0.18, 0.16, DARK, 0, 0.42, -2.02);
  b.box(0.36, 0.12, 0.05, 0xfff4cf, 0.62, 0.72, 2.02);
  b.box(0.36, 0.12, 0.05, 0xfff4cf, -0.62, 0.72, 2.02);
  b.box(0.36, 0.12, 0.05, 0xd8322b, 0.62, 0.72, -2.02);
  b.box(0.36, 0.12, 0.05, 0xd8322b, -0.62, 0.72, -2.02);
  for (const [wx, wz] of [
    [0.86, 1.3],
    [-0.86, 1.3],
    [0.86, -1.3],
    [-0.86, -1.3],
  ] as const) {
    b.cyl(0.36, 0.36, 0.26, 12, 0x1c1f24, wx, 0.36, wz, 0, 0, Math.PI / 2);
    b.cyl(0.2, 0.2, 0.28, 8, 0xb9c0c7, wx, 0.36, wz, 0, 0, Math.PI / 2);
  }
  cols.push(rotatedAabb(x, z, 1.95, 4.15, rotY, 1.5));
}

export function addCone(b: StaticBatcher, x: number, z: number): void {
  b.setBase(x, 0, z);
  b.box(0.5, 0.05, 0.5, DARK, 0, 0.025, 0);
  b.cyl(0.03, 0.25, 0.7, 10, 0xff7b29, 0, 0.38, 0);
  b.cyl(0.13, 0.17, 0.1, 10, 0xf6f2ea, 0, 0.42, 0);
}

export function addBarrier(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number): void {
  b.setBase(x, 0, z, rotY);
  for (const sx of [-1.1, 1.1]) {
    b.box(0.08, 1.0, 0.08, METAL, sx, 0.5, 0);
    b.box(0.5, 0.06, 0.5, DARK, sx, 0.03, 0);
  }
  for (let i = 0; i < 6; i++) {
    b.box(0.4, 0.28, 0.06, i % 2 ? 0xf6f2ea : 0xd8322b, -1.0 + i * 0.4, 0.8, 0);
  }
  cols.push(rotatedAabb(x, z, 2.4, 0.5, rotY, 1.0));
}

export function addCrate(b: StaticBatcher, cols: Collider[], x: number, z: number, rotY: number, s = 0.9): void {
  b.setBase(x, 0, z, rotY);
  b.box(s, s, s, 0xb58a52, 0, s / 2, 0);
  b.box(s + 0.02, 0.08, s + 0.02, 0x7e5a31, 0, s * 0.2, 0);
  b.box(s + 0.02, 0.08, s + 0.02, 0x7e5a31, 0, s * 0.8, 0);
  cols.push(rotatedAabb(x, z, s, s, rotY, s));
}

/** Icosaedro con normales por cara: aspecto facetado low poly. */
function faceted(radius: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  g.computeVertexNormals();
  return g;
}

export function addBush(b: StaticBatcher, x: number, z: number, s: number, color = 0x3f9b4a, y = 0): void {
  b.setBase(x, y, z);
  b.add(faceted(s), color, 0, s * 0.75, 0, 0, x * 0.7, 0, 1, 0.8, 1);
}

export function addPlanter(b: StaticBatcher, cols: Collider[], x: number, z: number): void {
  b.setBase(x, 0, z);
  b.box(1.5, 0.55, 1.5, 0xc9b99c, 0, 0.3, 0);
  b.box(1.3, 0.05, 1.3, 0x5b3a22, 0, 0.58, 0);
  addBush(b, x, z, 0.62, 0x44a852, 0.1);
  cols.push(aabb(x, z, 1.5, 1.5, 0.6));
}

/** Pretil, máquinas de aire y depósitos en la azotea. */
export function addRooftop(b: StaticBatcher, spec: BuildingSpec, seed: number): void {
  const rng = createRng(seed);
  const trim = FACADE_STYLES[spec.style % FACADE_STYLES.length].trim;
  const t = 0.3;
  const ph = 0.7;
  b.setBase(spec.x, spec.h, spec.z);
  b.box(spec.w + 0.2, ph, t, trim, 0, ph / 2, spec.d / 2 - t / 2 + 0.1);
  b.box(spec.w + 0.2, ph, t, trim, 0, ph / 2, -spec.d / 2 + t / 2 - 0.1);
  b.box(t, ph, spec.d, trim, spec.w / 2 - t / 2 + 0.1, ph / 2, 0);
  b.box(t, ph, spec.d, trim, -spec.w / 2 + t / 2 - 0.1, ph / 2, 0);

  const units = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < units; i++) {
    const ux = randRange(rng, -spec.w / 2 + 1.5, spec.w / 2 - 1.5);
    const uz = randRange(rng, -spec.d / 2 + 1.5, spec.d / 2 - 1.5);
    b.box(1.3, 0.9, 1.0, 0xc3c9ce, ux, 0.45, uz);
    b.cyl(0.36, 0.36, 0.06, 10, 0x4a525a, ux, 0.92, uz);
  }
  if (rng() > 0.45) {
    const tx = randRange(rng, -spec.w / 2 + 2, spec.w / 2 - 2);
    const tz = randRange(rng, -spec.d / 2 + 2, spec.d / 2 - 2);
    for (const [lx, lz] of [
      [0.7, 0.7],
      [-0.7, 0.7],
      [0.7, -0.7],
      [-0.7, -0.7],
    ] as const) {
      b.box(0.1, 1.2, 0.1, DARK, tx + lx, 0.6, tz + lz);
    }
    b.cyl(1.05, 1.05, 1.7, 12, 0x8e5b37, tx, 2.05, tz);
    b.cyl(0.05, 1.12, 0.6, 12, 0x5d3a22, tx, 3.2, tz);
  }
  if (rng() > 0.6) {
    b.cyl(0.04, 0.04, 3.2, 6, METAL, randRange(rng, -1, 1), 1.6, randRange(rng, -1, 1));
  }
}

/** Toldo a rayas sobre la planta baja de la fachada principal. */
export function addAwning(b: StaticBatcher, spec: BuildingSpec): void {
  if (!spec.front) return;
  const n = spec.front;
  const style = FACADE_STYLES[spec.style % FACADE_STYLES.length];
  const width = (n.x !== 0 ? spec.d : spec.w) - 1.4;
  const halfDepth = n.x !== 0 ? spec.w / 2 : spec.d / 2;
  const rotY = Math.atan2(n.x, n.z);
  b.setBase(spec.x + n.x * halfDepth, 0, spec.z + n.z * halfDepth, rotY);
  const segments = Math.max(2, Math.round(width / 1.1));
  const segW = width / segments;
  for (let i = 0; i < segments; i++) {
    const color = i % 2 ? 0xf6f2ea : style.accent;
    b.box(segW, 0.06, 1.5, color, -width / 2 + segW * (i + 0.5), 3.55, 0.7, 0.38, 0, 0);
    b.box(segW, 0.24, 0.05, color, -width / 2 + segW * (i + 0.5), 3.18, 1.4);
  }
}

/** Árboles instanciados (tronco + 2 copas) con balanceo por viento en GPU. */
export class TreeField {
  private trees: Array<{ x: number; z: number; s: number; color: THREE.Color }> = [];
  private rng = createRng(77);
  private greens = [0x3f9b4a, 0x4fae4c, 0x2f8a45, 0x5cb85a];

  add(cols: Collider[], x: number, z: number, scale = 1): void {
    const color = new THREE.Color(randPick(this.rng, this.greens));
    this.trees.push({ x, z, s: scale * randRange(this.rng, 0.85, 1.15), color });
    cols.push(aabb(x, z, 0.5, 0.5, 3));
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    const n = this.trees.length;
    if (n === 0) return group;
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.2, 7),
      toon({ color: 0x8a5a33 }),
      n
    );
    const crownMat = toon({ color: 0xffffff });
    addWindSway(crownMat, 0.045);
    const low = new THREE.InstancedMesh(faceted(1), crownMat, n);
    const top = new THREE.InstancedMesh(faceted(1), crownMat, n);
    const m = new THREE.Object3D();
    const light = new THREE.Color();
    this.trees.forEach((t, i) => {
      m.rotation.set(0, i * 1.7, 0);
      m.position.set(t.x, 1.1 * t.s, t.z);
      m.scale.setScalar(t.s);
      m.updateMatrix();
      trunk.setMatrixAt(i, m.matrix);
      m.position.set(t.x, 2.7 * t.s, t.z);
      m.scale.set(1.55 * t.s, 1.25 * t.s, 1.55 * t.s);
      m.updateMatrix();
      low.setMatrixAt(i, m.matrix);
      m.position.set(t.x + 0.2 * t.s, 3.75 * t.s, t.z - 0.1 * t.s);
      m.scale.set(1.05 * t.s, 0.95 * t.s, 1.05 * t.s);
      m.updateMatrix();
      top.setMatrixAt(i, m.matrix);
      low.setColorAt(i, t.color);
      top.setColorAt(i, light.copy(t.color).offsetHSL(0.01, 0.02, 0.07));
    });
    for (const mesh of [trunk, low, top]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}

export function createBillboard(main: string, sub: string): THREE.Group {
  const group = new THREE.Group();
  const frameMat = toon({ color: 0x2b333c });
  const postGeo = new THREE.BoxGeometry(0.25, 3, 0.25);
  for (const x of [-2.4, 2.4]) {
    const post = new THREE.Mesh(postGeo, frameMat);
    post.position.set(x, 1.5, 0);
    post.castShadow = true;
    group.add(post);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.4, 0.18), frameMat);
  frame.position.y = 3.6;
  frame.castShadow = true;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.0),
    new THREE.MeshBasicMaterial({ map: billboardTexture(main, sub) })
  );
  face.position.set(0, 3.6, 0.1);
  group.add(frame, face);
  return group;
}
