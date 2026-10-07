import * as THREE from "three";

/**
 * Cabeza de caricatura de UsainBot.
 *
 * - Forma de huevo: cráneo amplio, mandíbula que se estrecha y hocico/barbilla
 *   adelantados (sonrisa prominente de la ilustración).
 * - UV por proyección planar frontal → la textura de la cara es literalmente
 *   la "vista de frente": se dibuja sin distorsión esférica.
 * - Dos hemisferios (frontal/trasero) en un atlas 2:1 [cara | nuca] para que
 *   ningún triángulo cruce la costura; normales analíticas para que no se note.
 */
export const HEAD = {
  /** Semiejes en metros (ancho, alto, fondo). */
  hw: 0.17,
  hh: 0.25,
  hd: 0.19,
} as const;

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpT1 = new THREE.Vector3();
const tmpT2 = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

/** Deforma una dirección de la esfera unidad → punto de la cabeza (metros, centro en 0). */
export function headPoint(dir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  let x = dir.x;
  const y = dir.y;
  let z = dir.z;
  if (y < 0) x *= 1 - 0.3 * y * y; // mandíbula que se estrecha
  if (z > 0) {
    const bump = Math.exp(-(((y + 0.5) / 0.32) ** 2));
    z += 0.24 * bump * z * z; // hocico / sonrisa adelantada
  }
  if (y > 0.35 && z < 0) z *= 1 + 0.08 * (y - 0.35); // occipital algo más lleno
  return out.set(x * HEAD.hw, y * HEAD.hh, z * HEAD.hd);
}

/** Punto de la superficie para una posición "de frente" (x, y en metros). */
export function headSurface(x: number, y: number, out: THREE.Vector3): THREE.Vector3 {
  const nx = x / HEAD.hw;
  const ny = y / HEAD.hh;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return headPoint(tmpDir.set(nx, ny, nz), out);
}

function analyticNormal(dir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const h = 1e-3;
  const ref = Math.abs(dir.y) > 0.95 ? tmpC.set(1, 0, 0) : tmpC.set(0, 1, 0);
  tmpT1.crossVectors(dir, ref).normalize();
  tmpT2.crossVectors(dir, tmpT1).normalize();
  headPoint(dir, out);
  headPoint(tmpA.copy(dir).addScaledVector(tmpT1, h).normalize(), tmpA);
  headPoint(tmpB.copy(dir).addScaledVector(tmpT2, h).normalize(), tmpB);
  tmpA.sub(out);
  tmpB.sub(out);
  out.crossVectors(tmpA, tmpB).normalize();
  if (out.dot(dir) < 0) out.negate();
  return out;
}

function buildHemisphere(front: boolean, widthSeg: number, heightSeg: number): THREE.BufferGeometry {
  // En SphereGeometry, phi ∈ [0, π] es el hemisferio +Z (frente).
  const geo = new THREE.SphereGeometry(1, widthSeg, heightSeg, front ? 0 : Math.PI, Math.PI);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute;
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const dir = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    // Atlas: mitad izquierda = cara (vista frontal), derecha = nuca (vista trasera)
    const u = front ? 0.25 + dir.x * 0.25 : 0.75 - dir.x * 0.25;
    uv.setXY(i, u, 0.5 + dir.y * 0.5);
    headPoint(dir, p);
    analyticNormal(dir, n);
    pos.setXYZ(i, p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}

export function createHeadGeometries(): { front: THREE.BufferGeometry; back: THREE.BufferGeometry } {
  return { front: buildHemisphere(true, 14, 18), back: buildHemisphere(false, 10, 18) };
}
