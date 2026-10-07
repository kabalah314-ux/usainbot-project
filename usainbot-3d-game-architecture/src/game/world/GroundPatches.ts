import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toon } from "../utils/materials";
import type { GroundMap } from "./GroundMap";
import {
  asphaltTexture,
  grassTexture,
  plazaTexture,
  sandTexture,
  sidewalkTexture,
  tileTexture,
  woodTexture,
} from "../utils/textures";

export type GroundKind = "pavement" | "plaza" | "asphalt" | "lawn" | "wood" | "tile" | "sand";

/** Tamaño del tile (m) y altura por defecto de cada tipo de suelo. */
const KINDS: Record<GroundKind, { tile: number; y: number }> = {
  lawn: { tile: 6, y: 0.008 },
  sand: { tile: 4, y: 0.012 },
  pavement: { tile: 2, y: 0.02 },
  asphalt: { tile: 8, y: 0.022 },
  plaza: { tile: 3, y: 0.026 },
  wood: { tile: 2, y: 0.04 },
  tile: { tile: 1.5, y: 0.045 },
};

/**
 * Parches de suelo con UV en espacio de mundo (las texturas continúan sin
 * costuras entre parches). Un material y una malla por tipo de suelo.
 */
export class GroundPatches {
  private parts = new Map<GroundKind, THREE.BufferGeometry[]>();
  private groundMap: GroundMap | null;

  /** Si recibe un GroundMap, cada parche registra su altura como suelo caminable. */
  constructor(groundMap: GroundMap | null = null) {
    this.groundMap = groundMap;
  }

  /** Altura por defecto de un tipo de suelo (para colocar cosas encima). */
  static heightOf(kind: GroundKind): number {
    return KINDS[kind].y;
  }

  rect(kind: GroundKind, minX: number, maxX: number, minZ: number, maxZ: number, y?: number): this {
    const h = y ?? KINDS[kind].y;
    const g = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
    g.rotateX(-Math.PI / 2);
    g.translate((minX + maxX) / 2, h, (minZ + maxZ) / 2);
    this.groundMap?.addRect(minX, maxX, minZ, maxZ, h);
    return this.push(kind, g);
  }

  circle(kind: GroundKind, x: number, z: number, r: number, y?: number): this {
    const h = y ?? KINDS[kind].y;
    const g = new THREE.CircleGeometry(r, 40);
    g.rotateX(-Math.PI / 2);
    g.translate(x, h, z);
    this.groundMap?.addCircle(x, z, r, h);
    return this.push(kind, g);
  }

  private push(kind: GroundKind, g: THREE.BufferGeometry): this {
    const tile = KINDS[kind].tile;
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, -pos.getZ(i) / tile);
    const list = this.parts.get(kind) ?? [];
    list.push(g);
    this.parts.set(kind, list);
    return this;
  }

  build(group: THREE.Group): void {
    for (const [kind, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, toon({ map: textureFor(kind) }));
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.userData.ground = true;
      group.add(mesh);
    }
    this.parts.clear();
  }
}

function textureFor(kind: GroundKind): THREE.Texture {
  const tex =
    kind === "pavement"
      ? sidewalkTexture()
      : kind === "plaza"
        ? plazaTexture()
        : kind === "asphalt"
          ? asphaltTexture()
          : kind === "lawn"
            ? grassTexture(1)
            : kind === "wood"
              ? woodTexture()
              : kind === "tile"
                ? tileTexture()
                : sandTexture();
  tex.repeat.set(1, 1);
  return tex;
}
