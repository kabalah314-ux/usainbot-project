import * as THREE from "three";
import { SkinnedModelBuilder } from "../../utils/SkinnedModelBuilder";
import { HEAD, createHeadGeometries, headSurface } from "./headGeometry";
import type { UsainBotMaterials } from "./materials";
import { PALETTE as C } from "./palette";

/**
 * Proporciones (metros), medidas sobre la ilustración (~1.95 m):
 * cabeza enorme (≈27 % de la altura), torso corto, piernas largas.
 */
export const PROPORTIONS = {
  hipHeight: 0.88,
  legOffsetX: 0.115,
  legOffsetY: -0.02,
  waistY: 0.06,
  shoulderX: 0.24,
  shoulderY: 0.4,
  headY: 0.48,
  /** Centro de la cabeza por encima del hueso del cuello. */
  headCenter: 0.27,
  thigh: 0.39,
  shin: 0.37,
  upperArm: 0.28,
} as const;

export interface UsainBotRig {
  group: THREE.Group;
  root: THREE.Bone;
  hips: THREE.Bone;
  torso: THREE.Bone;
  head: THREE.Bone;
  armL: THREE.Bone;
  armR: THREE.Bone;
  elbowL: THREE.Bone;
  elbowR: THREE.Bone;
  legL: THREE.Bone;
  legR: THREE.Bone;
  kneeL: THREE.Bone;
  kneeR: THREE.Bone;
  footL: THREE.Bone;
  footR: THREE.Bone;
  /**
   * Distancia del tobillo a la suela, MEDIDA sobre la geometría real
   * (pose de bind). El apoyo de pies la usa para que la suela quede en y = 0.
   */
  soleDepth: number;
}

/** thetaStart que coloca u = 0.5 de la textura en el frente (+Z). */
const FRONT = Math.PI;
const HALF_PI = Math.PI / 2;
/** Rotación que orienta el eje de un cilindro a lo largo de X. */
const ALONG_X: readonly [number, number, number] = [0, 0, HALF_PI];

const box = (w: number, h: number, d: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 10, open = false): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, FRONT, Math.PI * 2);
const ball = (r: number, ws = 8, hs = 6): THREE.BufferGeometry =>
  new THREE.SphereGeometry(r, ws, hs);

function remapUV(
  g: THREE.BufferGeometry,
  fn: (u: number, v: number) => [number, number]
): THREE.BufferGeometry {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = fn(uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  return g;
}

type B = SkinnedModelBuilder;
type M = UsainBotMaterials;
type Side = 1 | -1;

function buildHips(b: B, hips: THREE.Bone, m: M): void {
  // Cadera: franja amarilla a ambos lados (u espejado) en la parte alta de la textura
  const pelvis = remapUV(cyl(0.19, 0.2, 0.18, 14, true), (u, v) => [
    0.5 + Math.abs(u - 0.5),
    0.6 + v * 0.4,
  ]);
  b.part(hips, pelvis, m.shorts, { position: [0, -0.02, 0], scale: [1, 1, 0.72] });
  b.part(hips, box(0.2, 0.1, 0.15), m.flat, { position: [0, -0.1, 0], color: C.green });
  b.part(hips, cyl(0.192, 0.192, 0.025, 14), m.flat, {
    position: [0, 0.07, 0],
    scale: [1, 1, 0.72],
    color: C.greenDark,
  });
}

function buildTorso(b: B, torso: THREE.Bone, m: M): void {
  // Camiseta de tirantes (torso en V) + hombros metálicos con los tirantes encima
  b.part(torso, cyl(0.2, 0.176, 0.46, 14, true), m.tank, {
    position: [0, 0.19, 0],
    scale: [1, 1, 0.62],
  });
  b.part(torso, new THREE.SphereGeometry(1, 14, 5, 0, Math.PI * 2, 0, HALF_PI), m.flat, {
    position: [0, 0.42, 0],
    scale: [0.2, 0.07, 0.124],
    color: C.metal,
  });
  for (const s of [1, -1] as Side[]) {
    b.part(torso, box(0.07, 0.022, 0.255), m.flat, {
      position: [s * 0.12, 0.468, 0],
      rotation: [0, 0, -s * 0.26],
      color: C.yellow,
    });
  }

  // Pantalla del pecho: marco, retroiluminación y cristal con datos
  b.part(torso, box(0.155, 0.31, 0.02), m.flat, {
    position: [0, 0.2, 0.118],
    rotation: [0.05, 0, 0],
    color: C.metalDark,
  });
  b.part(torso, box(0.128, 0.28, 0.02), m.glow, {
    position: [0, 0.2, 0.124],
    rotation: [0.05, 0, 0],
    color: C.glow,
    outline: false,
  });
  b.part(torso, box(0.12, 0.27, 0.004), m.glass, {
    position: [0, 0.2, 0.137],
    rotation: [0.05, 0, 0],
    outline: false,
  });

  // Cuello robótico con circuitos
  b.part(torso, cyl(0.085, 0.09, 0.03, 12), m.flat, {
    position: [0, 0.425, -0.01],
    color: C.metalDark,
  });
  b.part(torso, cyl(0.06, 0.066, 0.18, 10), m.flat, {
    position: [0, 0.5, -0.015],
    color: C.metal,
  });
  for (const [x, h] of [
    [0.024, 0.09],
    [-0.028, 0.07],
  ] as const) {
    b.part(torso, box(0.01, h, 0.01), m.glow, {
      position: [x, 0.5, 0.045],
      color: C.glow,
      outline: false,
    });
  }
}

function buildHead(b: B, head: THREE.Bone, m: M): void {
  const hc = PROPORTIONS.headCenter;
  const { front, back } = createHeadGeometries();
  b.part(head, front, m.face, { position: [0, hc, 0] });
  b.part(head, back, m.face, { position: [0, hc, 0] });

  // Orejas grandes
  for (const s of [1, -1] as Side[]) {
    b.part(head, ball(1, 8, 6), m.flat, {
      position: [s * HEAD.hw * 0.97, hc - 0.025, -0.012],
      scale: [0.026, 0.054, 0.036],
      color: C.skin,
    });
    b.part(head, ball(1, 6, 4), m.flat, {
      position: [s * (HEAD.hw * 0.97 + 0.014), hc - 0.025, -0.006],
      scale: [0.012, 0.032, 0.02],
      color: C.skinDark,
      outline: false,
    });
  }

  // Nariz ancha (volumen en el perfil)
  const nose = headSurface(0, -0.064, new THREE.Vector3());
  b.part(head, ball(1, 8, 6), m.flat, {
    position: [0, hc + nose.y, nose.z - 0.006],
    scale: [0.024, 0.018, 0.02],
    color: C.skin,
    outline: false,
  });

  // Visor holográfico: dos lentes rectangulares (la derecha sobresale de la cara)
  const eyeY = hc + 0.006;
  const lensZ = headSurface(0.09, 0.006, new THREE.Vector3()).z + 0.022;
  b.part(head, box(0.178, 0.088, 0.006), m.glass, {
    position: [-0.094, eyeY, lensZ],
    rotation: [0, -0.38, 0],
    outline: false,
  });
  b.part(head, box(0.15, 0.088, 0.006), m.glass, {
    position: [0.085, eyeY, lensZ],
    rotation: [0, 0.38, 0],
    outline: false,
  });
  b.part(head, box(0.03, 0.018, 0.006), m.glass, {
    position: [0, eyeY + 0.02, lensZ + 0.03],
    outline: false,
  });

  // Pieza metálica en la sien izquierda que sujeta el visor
  b.part(head, box(0.032, 0.075, 0.11), m.flat, {
    position: [HEAD.hw - 0.008, eyeY, 0.1],
    rotation: [0, 0.32, 0],
    color: C.metal,
  });
  b.part(head, box(0.006, 0.035, 0.06), m.glow, {
    position: [HEAD.hw + 0.01, eyeY, 0.1],
    rotation: [0, 0.32, 0],
    color: C.glow,
    outline: false,
  });
}

function buildArm(b: B, arm: THREE.Bone, elbow: THREE.Bone, m: M, s: Side): void {
  // Hombrera esférica grande (la izquierda con anillo de luz)
  b.part(arm, ball(0.095, 12, 8), m.flat, {
    position: [s * 0.01, 0.012, 0],
    scale: [1, 0.92, 1],
    color: C.metal,
  });
  b.part(arm, cyl(0.07, 0.07, 0.02, 12), m.flat, { position: [0, -0.07, 0], color: C.metalDark });
  if (s > 0) {
    const dir = new THREE.Vector3(0.765, 0, 0.644);
    const rot: [number, number, number] = [0, -0.7, -HALF_PI];
    const at = (d: number): [number, number, number] => [dir.x * d + 0.01, 0.012, dir.z * d];
    b.part(arm, cyl(0.052, 0.052, 0.016, 14), m.flat, {
      position: at(0.088),
      rotation: rot,
      color: C.metalDark,
    });
    b.part(arm, cyl(0.038, 0.038, 0.02, 14), m.glow, {
      position: at(0.094),
      rotation: rot,
      color: C.glow,
      outline: false,
    });
  }
  b.part(arm, cyl(0.05, 0.046, 0.2, 8), m.flat, { position: [0, -0.16, 0], color: C.metal });
  b.part(arm, box(0.024, 0.14, 0.06), m.flat, { position: [s * 0.046, -0.16, 0], color: C.gold });

  // Codo con discos de articulación, antebrazo robusto con placas doradas y puño
  b.part(elbow, ball(0.055), m.flat, { color: C.metalDark });
  for (const side of [1, -1] as Side[]) {
    b.part(elbow, cyl(0.036, 0.036, 0.02, 12), m.flat, {
      position: [side * 0.054, 0, 0],
      rotation: ALONG_X,
      color: C.metalLight,
    });
    b.part(elbow, cyl(0.016, 0.016, 0.024, 8), m.flat, {
      position: [side * 0.056, 0, 0],
      rotation: ALONG_X,
      color: C.metalDark,
      outline: false,
    });
  }
  b.part(elbow, cyl(0.056, 0.045, 0.22, 8), m.flat, { position: [0, -0.13, 0], color: C.metal });
  b.part(elbow, box(0.08, 0.16, 0.035), m.flat, { position: [0, -0.12, 0.04], color: C.gold });
  b.part(elbow, box(0.03, 0.12, 0.045), m.flat, { position: [s * 0.046, -0.13, -0.01], color: C.gold });
  b.part(elbow, cyl(0.047, 0.047, 0.03, 10), m.flat, { position: [0, -0.25, 0], color: C.metalDark });
  b.part(elbow, box(0.08, 0.085, 0.09), m.flat, { position: [0, -0.3, 0.005], color: C.metal });
  b.part(elbow, box(0.075, 0.055, 0.08), m.flat, { position: [0, -0.36, 0.015], color: C.metalDark });
  b.part(elbow, box(0.026, 0.055, 0.03), m.flat, { position: [-s * 0.045, -0.3, 0.04], color: C.metal });
}

function buildLeg(
  b: B,
  leg: THREE.Bone,
  knee: THREE.Bone,
  foot: THREE.Bone,
  m: M,
  s: Side
): void {
  // Muslo: malla con panel amarillo exterior (u desplazado en la pierna derecha)
  const du = s > 0 ? 0 : 0.5;
  const thigh = remapUV(cyl(0.1, 0.09, 0.23, 12, true), (u, v) => [u + du, v * 0.6]);
  b.part(leg, thigh, m.shorts, { position: [0, -0.1, 0] });
  b.part(leg, cyl(0.07, 0.058, 0.2, 8), m.flat, { position: [0, -0.3, 0], color: C.metal });
  b.part(leg, box(0.02, 0.13, 0.06), m.flat, { position: [s * 0.066, -0.3, -0.01], color: C.gold });
  b.part(leg, box(0.02, 0.1, 0.04), m.flat, { position: [-s * 0.062, -0.3, 0], color: C.metalDark });
  for (const [x, y] of [
    [0.02, -0.26],
    [-0.018, -0.33],
  ] as const) {
    b.part(leg, box(0.016, 0.016, 0.01), m.glow, {
      position: [s * x, y, 0.066],
      color: C.glow,
      outline: false,
    });
  }

  // Rodilla mecánica con rótula y discos laterales
  b.part(knee, ball(0.068), m.flat, { color: C.metalDark });
  b.part(knee, box(0.1, 0.13, 0.05), m.flat, {
    position: [0, 0.005, 0.058],
    rotation: [-0.12, 0, 0],
    color: C.metal,
  });
  b.part(knee, box(0.024, 0.024, 0.01), m.glow, {
    position: [0, 0.01, 0.087],
    color: C.glow,
    outline: false,
  });
  for (const side of [1, -1] as Side[]) {
    b.part(knee, cyl(0.04, 0.04, 0.022, 12), m.flat, {
      position: [side * 0.07, 0, 0],
      rotation: ALONG_X,
      color: C.metalLight,
    });
    b.part(knee, cyl(0.02, 0.02, 0.026, 8), m.flat, {
      position: [side * 0.072, 0, 0],
      rotation: ALONG_X,
      color: C.gold,
      outline: false,
    });
  }

  // Espinilla: metal con gemelo de bronce y circuitos
  b.part(knee, cyl(0.06, 0.043, 0.32, 8), m.flat, { position: [0, -0.2, 0], color: C.metal });
  b.part(knee, box(0.07, 0.19, 0.05), m.flat, { position: [s * 0.02, -0.14, -0.045], color: C.gold });
  b.part(knee, box(0.02, 0.2, 0.05), m.flat, { position: [s * 0.052, -0.18, -0.01], color: C.gold });
  b.part(knee, box(0.05, 0.22, 0.03), m.flat, { position: [0, -0.19, 0.045], color: C.metalLight });
  for (const [x, y, z] of [
    [0.05, -0.12, 0.02],
    [0.047, -0.22, 0.02],
    [0, -0.1, 0.062],
  ] as const) {
    b.part(knee, box(0.012, 0.012, 0.012), m.glow, {
      position: [s * x, y, z],
      color: C.glow,
      outline: false,
    });
  }

  // Tobillo + zapatilla verde con franjas doradas, puntera de rejilla y suela gris
  b.part(foot, ball(0.045), m.flat, { color: C.metalDark });
  b.part(foot, cyl(0.056, 0.06, 0.03, 10), m.flat, { position: [0, 0.012, -0.01], color: C.green });
  b.part(foot, box(0.13, 0.1, 0.25), m.shoe, { position: [0, -0.035, 0.035] });
  b.part(foot, cyl(0.05, 0.05, 0.128, 10), m.flat, {
    position: [0, -0.045, 0.16],
    rotation: ALONG_X,
    color: C.toeMesh,
  });
  b.part(foot, box(0.136, 0.07, 0.05), m.flat, { position: [0, -0.025, -0.085], color: C.gold });
  b.part(foot, box(0.142, 0.014, 0.33), m.flat, { position: [0, -0.07, 0.045], color: C.green });
  b.part(foot, box(0.14, 0.03, 0.34), m.flat, { position: [0, -0.087, 0.045], color: C.sole });
}

/** Construye UsainBot como un SkinnedMesh con 14 huesos. Mira hacia +Z. */
export function buildUsainBotRig(m: UsainBotMaterials): UsainBotRig {
  const P = PROPORTIONS;
  const b = new SkinnedModelBuilder();

  const root = b.bone("root", null, [0, 0, 0]);
  const hips = b.bone("hips", root, [0, P.hipHeight, 0]);
  const torso = b.bone("torso", hips, [0, P.waistY, 0]);
  const head = b.bone("head", torso, [0, P.headY, 0]);
  const armL = b.bone("armL", torso, [P.shoulderX, P.shoulderY, 0]);
  const elbowL = b.bone("elbowL", armL, [0, -P.upperArm, 0]);
  const armR = b.bone("armR", torso, [-P.shoulderX, P.shoulderY, 0]);
  const elbowR = b.bone("elbowR", armR, [0, -P.upperArm, 0]);
  const legL = b.bone("legL", hips, [P.legOffsetX, P.legOffsetY, 0]);
  const kneeL = b.bone("kneeL", legL, [0, -P.thigh, 0]);
  const footL = b.bone("footL", kneeL, [0, -P.shin, 0]);
  const legR = b.bone("legR", hips, [-P.legOffsetX, P.legOffsetY, 0]);
  const kneeR = b.bone("kneeR", legR, [0, -P.thigh, 0]);
  const footR = b.bone("footR", kneeR, [0, -P.shin, 0]);

  buildHips(b, hips, m);
  buildTorso(b, torso, m);
  buildHead(b, head, m);
  buildArm(b, armL, elbowL, m, 1);
  buildArm(b, armR, elbowR, m, -1);
  buildLeg(b, legL, kneeL, footL, m, 1);
  buildLeg(b, legR, kneeR, footR, m, -1);

  const group = b.build(m.outline);
  const body = group.children.find((o) => (o as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
  body.geometry.computeBoundingBox();
  const footY = P.hipHeight + P.legOffsetY - P.thigh - P.shin;
  const soleDepth = footY - (body.geometry.boundingBox?.min.y ?? 0);
  return {
    soleDepth,
    group,
    root,
    hips,
    torso,
    head,
    armL,
    armR,
    elbowL,
    elbowR,
    legL,
    legR,
    kneeL,
    kneeR,
    footL,
    footR,
  };
}
