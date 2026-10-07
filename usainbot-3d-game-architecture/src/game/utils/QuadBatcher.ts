import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** [u0, v0, u1, v1] dentro de un atlas. */
export type UVRect = readonly [number, number, number, number];

/** Rectángulo en píxeles de canvas → UV (CanvasTexture usa flipY). */
export function cellUV(x: number, y: number, w: number, h: number, W: number, H: number): UVRect {
  return [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H];
}

/**
 * Muchos planos texturizados (carteles, rótulos, pantallas) que comparten
 * un atlas → una sola malla y una draw call.
 */
export class QuadBatcher {
  private parts: THREE.BufferGeometry[] = [];

  /** Plano de w×h mirando a +Z, girado rotX y luego rotY, centrado en (x,y,z). */
  add(x: number, y: number, z: number, rotY: number, w: number, h: number, uv: UVRect, rotX = 0): this {
    const g = new THREE.PlaneGeometry(w, h);
    const attr = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      attr.setXY(i, uv[0] + attr.getX(i) * (uv[2] - uv[0]), uv[1] + attr.getY(i) * (uv[3] - uv[1]));
    }
    if (rotX) g.rotateX(rotX);
    if (rotY) g.rotateY(rotY);
    g.translate(x, y, z);
    this.parts.push(g);
    return this;
  }

  /** Cartel a doble cara (dos planos espalda con espalda). */
  addDouble(x: number, y: number, z: number, rotY: number, w: number, h: number, uv: UVRect): this {
    const ox = Math.sin(rotY) * 0.02;
    const oz = Math.cos(rotY) * 0.02;
    this.add(x + ox, y, z + oz, rotY, w, h, uv);
    return this.add(x - ox, y, z - oz, rotY + Math.PI, w, h, uv);
  }

  build(material: THREE.Material): THREE.Mesh | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    this.parts.forEach((g) => g.dispose());
    this.parts = [];
    if (!merged) return null;
    const mesh = new THREE.Mesh(merged, material);
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = false;
    return mesh;
  }
}
