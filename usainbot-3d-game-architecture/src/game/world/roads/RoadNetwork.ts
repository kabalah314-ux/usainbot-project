import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RoadData } from "../../data/cityLayout";
import { toon } from "../../utils/materials";
import { asphaltTexture, crosswalkTexture, roadTexture, sidewalkTexture } from "../../utils/textures";
import type { MapData } from "../map/MapData";
import type { Rect } from "../zones/Zone";
import type { GroundMap } from "../GroundMap";

const Y = { sidewalk: 0.03, road: 0.034, junction: 0.036, crosswalk: 0.042 };
const CROSSWALK_DEPTH = 3.2;

interface Interval {
  a: number;
  b: number;
}

/** Resta intervalos de corte a [a, b]. */
function subtract(a: number, b: number, cuts: Interval[]): Interval[] {
  let pieces: Interval[] = [{ a, b }];
  for (const c of cuts) {
    const next: Interval[] = [];
    for (const p of pieces) {
      if (c.b <= p.a || c.a >= p.b) {
        next.push(p);
        continue;
      }
      if (c.a > p.a) next.push({ a: p.a, b: c.a });
      if (c.b < p.b) next.push({ a: c.b, b: p.b });
    }
    pieces = next;
  }
  return pieces.filter((p) => p.b - p.a > 0.01);
}

/** Rect de un tramo: s = a lo largo del eje de la carretera, t = transversal. */
function rectFor(road: RoadData, s0: number, s1: number, t0: number, t1: number): Rect {
  return road.axis === "x"
    ? { minX: s0, maxX: s1, minZ: road.at + t0, maxZ: road.at + t1 }
    : { minX: road.at + t0, maxX: road.at + t1, minZ: s0, maxZ: s1 };
}

const contains = (r: Rect, x: number, z: number): boolean =>
  x > r.minX + 0.01 && x < r.maxX - 0.01 && z > r.minZ + 0.01 && z < r.maxZ - 0.01;

/**
 * Genera la red viaria a partir de datos (ROADS): calzadas con marcas,
 * cruces, aceras cortadas en las intersecciones, esquinas y pasos de cebra.
 * Todo en 4 mallas (calzada, cruces, aceras, cebras).
 */
export class RoadNetwork {
  readonly roads: readonly RoadData[];
  readonly junctions: Rect[] = [];

  constructor(roads: readonly RoadData[]) {
    this.roads = roads;
  }

  build(group: THREE.Group, map: MapData, groundMap: GroundMap | null = null): void {
    const surface = (r: Rect, y: number): void => groundMap?.addRect(r.minX, r.maxX, r.minZ, r.maxZ, y);
    const roadParts: THREE.BufferGeometry[] = [];
    const junctionParts: THREE.BufferGeometry[] = [];
    const walkRects: Rect[] = [];
    const zebraParts: THREE.BufferGeometry[] = [];

    const pairs: Array<{ x: RoadData; z: RoadData; rect: Rect }> = [];
    for (const xr of this.roads.filter((r) => r.axis === "x")) {
      for (const zr of this.roads.filter((r) => r.axis === "z")) {
        const hx = zr.width / 2;
        const hz = xr.width / 2;
        if (zr.at + hx <= xr.from || zr.at - hx >= xr.to) continue;
        if (xr.at + hz <= zr.from || xr.at - hz >= zr.to) continue;
        const rect = { minX: zr.at - hx, maxX: zr.at + hx, minZ: xr.at - hz, maxZ: xr.at + hz };
        pairs.push({ x: xr, z: zr, rect });
        this.junctions.push(rect);
      }
    }

    for (const road of this.roads) {
      const hw = road.width / 2;
      const others = this.roads.filter((r) => r.axis !== road.axis);
      map.roads.push({ ...rectFor(road, road.from, road.to, -hw, hw), name: road.name, sidewalk: road.sidewalk, axis: road.axis });

      // Calzada: tramos entre cruces
      const roadCuts: Interval[] = [];
      for (const o of others) {
        const oh = o.width / 2;
        if (road.at + hw <= o.from || road.at - hw >= o.to) continue;
        roadCuts.push({ a: o.at - oh, b: o.at + oh });
      }
      for (const p of subtract(road.from, road.to, roadCuts)) {
        roadParts.push(this.strip(road, p.a, p.b, -hw, hw, Y.road, true));
        surface(rectFor(road, p.a, p.b, -hw, hw), Y.road);
      }

      // Aceras a ambos lados, cortadas por los corredores perpendiculares
      for (const side of [-1, 1]) {
        const t0 = side < 0 ? -hw - road.sidewalk : hw;
        const t1 = side < 0 ? -hw : hw + road.sidewalk;
        const cuts: Interval[] = [];
        for (const o of others) {
          const lo = road.at + t0;
          const hi = road.at + t1;
          if (hi <= o.from || lo >= o.to) continue;
          const corridor = o.width / 2 + o.sidewalk;
          cuts.push({ a: o.at - corridor, b: o.at + corridor });
        }
        for (const p of subtract(road.from, road.to, cuts)) walkRects.push(rectFor(road, p.a, p.b, t0, t1));
      }
    }

    // Cruces, esquinas y pasos de cebra
    for (const { x: xr, z: zr, rect } of pairs) {
      junctionParts.push(this.plane(rect, Y.junction));
      surface(rect, Y.junction);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner: Rect = {
            minX: sx < 0 ? rect.minX - zr.sidewalk : rect.maxX,
            maxX: sx < 0 ? rect.minX : rect.maxX + zr.sidewalk,
            minZ: sz < 0 ? rect.minZ - xr.sidewalk : rect.maxZ,
            maxZ: sz < 0 ? rect.minZ : rect.maxZ + xr.sidewalk,
          };
          const cx = (corner.minX + corner.maxX) / 2;
          const cz = (corner.minZ + corner.maxZ) / 2;
          const inX = cx >= xr.from - zr.sidewalk && cx <= xr.to + zr.sidewalk;
          const inZ = cz >= zr.from - xr.sidewalk && cz <= zr.to + xr.sidewalk;
          if (inX && inZ && !walkRects.some((w) => contains(w, cx, cz))) walkRects.push(corner);
        }
      }
      // Cebra en cada brazo que continúa más allá del cruce
      if (xr.from < rect.minX - 1) zebraParts.push(this.zebra(xr, rect.minX - 0.6 - CROSSWALK_DEPTH, rect.minX - 0.6));
      if (xr.to > rect.maxX + 1) zebraParts.push(this.zebra(xr, rect.maxX + 0.6, rect.maxX + 0.6 + CROSSWALK_DEPTH));
      if (zr.from < rect.minZ - 1) zebraParts.push(this.zebra(zr, rect.minZ - 0.6 - CROSSWALK_DEPTH, rect.minZ - 0.6));
      if (zr.to > rect.maxZ + 1) zebraParts.push(this.zebra(zr, rect.maxZ + 0.6, rect.maxZ + 0.6 + CROSSWALK_DEPTH));
    }

    const road = roadTexture();
    road.repeat.set(1, 1);
    this.addMesh(group, roadParts, toon({ map: road }));
    const asphalt = asphaltTexture();
    this.addMesh(group, junctionParts, toon({ map: asphalt }));
    for (const w of walkRects) surface(w, Y.sidewalk);
    const walk = sidewalkTexture();
    this.addMesh(group, walkRects.map((r) => this.plane(r, Y.sidewalk, 2)), toon({ map: walk }));
    const zebra = crosswalkTexture();
    zebra.repeat.set(1, 1);
    this.addMesh(group, zebraParts, toon({ map: zebra, alphaTest: 0.5 }));
  }

  /** Calzada con UV: u transversal (0..1, marcas viales), v a lo largo (tile 8 m). */
  private strip(road: RoadData, s0: number, s1: number, t0: number, t1: number, y: number, marked: boolean): THREE.BufferGeometry {
    const r = rectFor(road, s0, s1, t0, t1);
    const g = this.plane(r, y);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const s = road.axis === "x" ? x : z;
      const t = road.axis === "x" ? z - road.at : x - road.at;
      const u = (t - t0) / (t1 - t0);
      uv.setXY(i, marked ? u : x / 8, marked ? s / 8 : z / 8);
    }
    return g;
  }

  private zebra(road: RoadData, s0: number, s1: number): THREE.BufferGeometry {
    const hw = road.width / 2 - 0.6;
    const g = this.plane(rectFor(road, s0, s1, -hw, hw), Y.crosswalk);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    const stripes = Math.round((hw * 2) / 2);
    for (let i = 0; i < pos.count; i++) {
      const t = road.axis === "x" ? pos.getZ(i) - road.at : pos.getX(i) - road.at;
      uv.setXY(i, ((t + hw) / (hw * 2)) * stripes, 0.5);
    }
    return g;
  }

  private plane(r: Rect, y: number, tile = 8): THREE.BufferGeometry {
    const g = new THREE.PlaneGeometry(r.maxX - r.minX, r.maxZ - r.minZ);
    g.rotateX(-Math.PI / 2);
    g.translate((r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, -pos.getZ(i) / tile);
    return g;
  }

  private addMesh(group: THREE.Group, parts: THREE.BufferGeometry[], material: THREE.Material): void {
    if (parts.length === 0) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.ground = true;
    group.add(mesh);
  }
}
