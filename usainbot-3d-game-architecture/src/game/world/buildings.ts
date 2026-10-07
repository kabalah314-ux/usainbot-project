import * as THREE from "three";
import { facadeCell } from "./buildingAtlas";
import type { FacadeCell } from "./buildingAtlas";

/** Especificación de un edificio caja (centro en planta, tamaño y estilo). */
export interface BuildingSpec {
  x: number;
  z: number;
  /** Tamaño en X y en Z (m). */
  w: number;
  d: number;
  h: number;
  style: number;
  /** Normal de la fachada que da a la calle (para toldos, carteles…). */
  front?: THREE.Vector3;
}

const GROUND_FLOOR = 4.2;
const FLOOR = 3.1;
const BAY = 3.2;

const up = new THREE.Vector3(0, 1, 0);

/**
 * Genera la geometría de muchos edificios en un único BufferGeometry
 * (posiciones, normales, uv "en repeticiones" y atributo de celda del atlas).
 * ~36 vértices por edificio: la ciudad entera es trivial para la GPU.
 */
export function buildBuildingsGeometry(specs: readonly BuildingSpec[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const cell: number[] = [];
  const idx: number[] = [];

  const quad = (
    corners: THREE.Vector3[],
    normal: THREE.Vector3,
    uMax: number,
    vMax: number,
    style: number,
    kind: FacadeCell
  ): void => {
    const base = pos.length / 3;
    const c = facadeCell(style, kind);
    const uvs = [0, 0, uMax, 0, uMax, vMax, 0, vMax];
    for (let i = 0; i < 4; i++) {
      pos.push(corners[i].x, corners[i].y, corners[i].z);
      nor.push(normal.x, normal.y, normal.z);
      uv.push(uvs[i * 2], uvs[i * 2 + 1]);
      cell.push(c[0], c[1], c[2], c[3]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const center = new THREE.Vector3();
  const right = new THREE.Vector3();
  const n = new THREE.Vector3();
  const faces: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (const b of specs) {
    const groundH = Math.min(GROUND_FLOOR, b.h * 0.45);
    const floors = Math.max(1, Math.round((b.h - groundH) / FLOOR));

    for (const f of faces) {
      n.set(f[0], f[1], f[2]);
      const halfDepth = n.x !== 0 ? b.w / 2 : b.d / 2;
      const width = n.x !== 0 ? b.d : b.w;
      right.crossVectors(up, n);
      center.set(b.x + n.x * halfDepth, 0, b.z + n.z * halfDepth);
      const bays = Math.max(1, Math.round(width / BAY));
      const corner = (s: number, y: number): THREE.Vector3 =>
        new THREE.Vector3(center.x + right.x * s, y, center.z + right.z * s);
      const hw = width / 2;
      quad([corner(-hw, 0), corner(hw, 0), corner(hw, groundH), corner(-hw, groundH)], n, bays, 1, b.style, "ground");
      quad([corner(-hw, groundH), corner(hw, groundH), corner(hw, b.h), corner(-hw, b.h)], n, bays, floors, b.style, "upper");
    }

    const x0 = b.x - b.w / 2;
    const x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2;
    const z1 = b.z + b.d / 2;
    quad(
      [
        new THREE.Vector3(x0, b.h, z1),
        new THREE.Vector3(x1, b.h, z1),
        new THREE.Vector3(x1, b.h, z0),
        new THREE.Vector3(x0, b.h, z0),
      ],
      up,
      b.w / 4,
      b.d / 4,
      b.style,
      "roof"
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aCell", new THREE.Float32BufferAttribute(cell, 4));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

export const BUILDING_METRICS = { GROUND_FLOOR, FLOOR, BAY } as const;
