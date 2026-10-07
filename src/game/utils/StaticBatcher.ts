import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const tmpLocal = new THREE.Matrix4();
const tmpFull = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();

/**
 * Agrupa muchos props estáticos de color liso en UNA malla (1 draw call).
 * Uso: setBase(x, y, z, rotY) para el origen del prop y luego
 * box()/cyl()/add() en coordenadas locales.
 */
export class StaticBatcher {
  private parts: THREE.BufferGeometry[] = [];
  private base = new THREE.Matrix4();

  get size(): number {
    return this.parts.length;
  }

  setBase(x: number, y: number, z: number, rotY = 0, scale = 1): this {
    tmpQuat.setFromEuler(tmpEuler.set(0, rotY, 0));
    this.base.compose(tmpPos.set(x, y, z), tmpQuat, tmpScale.setScalar(scale));
    return this;
  }

  add(
    geometry: THREE.BufferGeometry,
    color: number,
    lx = 0,
    ly = 0,
    lz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1
  ): this {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.deleteAttribute("uv");
    tmpQuat.setFromEuler(tmpEuler.set(rx, ry, rz));
    tmpLocal.compose(tmpPos.set(lx, ly, lz), tmpQuat, tmpScale.set(sx, sy, sz));
    tmpFull.multiplyMatrices(this.base, tmpLocal);
    g.applyMatrix4(tmpFull);

    const count = g.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    tmpColor.set(color);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  box(
    w: number,
    h: number,
    d: number,
    color: number,
    lx = 0,
    ly = 0,
    lz = 0,
    rx = 0,
    ry = 0,
    rz = 0
  ): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, lx, ly, lz, rx, ry, rz);
  }

  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    segments: number,
    color: number,
    lx = 0,
    ly = 0,
    lz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    openEnded = false
  ): this {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, openEnded);
    return this.add(geo, color, lx, ly, lz, rx, ry, rz);
  }

  build(material: THREE.Material, castShadow = true, receiveShadow = true): THREE.Mesh | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    this.parts.forEach((g) => g.dispose());
    this.parts = [];
    if (!merged) throw new Error("[StaticBatcher] geometrías incompatibles");
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}
