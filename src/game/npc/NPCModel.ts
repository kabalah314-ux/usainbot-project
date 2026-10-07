import * as THREE from "three";
import { SkinnedModelBuilder } from "../utils/SkinnedModelBuilder";
import { createOutlineMaterial, createToonGradient } from "../utils/outline";
import type { NPCAppearance } from "../data/types";

export interface NPCRig {
  group: THREE.Group;
  root: THREE.Bone;
  hips: THREE.Bone;
  torso: THREE.Bone;
  head: THREE.Bone;
  armL: THREE.Bone;
  armR: THREE.Bone;
  legL: THREE.Bone;
  legR: THREE.Bone;
}

/** Materiales compartidos por todos los NPCs (se compilan una sola vez). */
let shared: { flat: THREE.MeshToonMaterial; outline: THREE.Material } | null = null;
function materials(): { flat: THREE.MeshToonMaterial; outline: THREE.Material } {
  if (!shared) {
    shared = {
      flat: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: createToonGradient() }),
      outline: createOutlineMaterial(0x15110f, 0.012),
    };
  }
  return shared;
}

const box = (w: number, h: number, d: number): THREE.BufferGeometry => new THREE.BoxGeometry(w, h, d);

/**
 * Vecino caricaturesco low poly (cabeza grande, estilo del juego).
 * Un SkinnedMesh + contorno por NPC con 8 huesos; los materiales se comparten.
 */
export function buildNPCRig(a: NPCAppearance): NPCRig {
  const m = materials().flat;
  const b = new SkinnedModelBuilder();
  const shoes = a.shoes ?? 0x2f353c;

  const root = b.bone("root", null, [0, 0, 0]);
  const hips = b.bone("hips", root, [0, 0.9, 0]);
  const torso = b.bone("torso", hips, [0, 0.05, 0]);
  const head = b.bone("head", torso, [0, 0.6, 0]);
  const armL = b.bone("armL", torso, [0.27, 0.5, 0]);
  const armR = b.bone("armR", torso, [-0.27, 0.5, 0]);
  const legL = b.bone("legL", hips, [0.1, -0.04, 0]);
  const legR = b.bone("legR", hips, [-0.1, -0.04, 0]);

  b.part(hips, box(0.38, 0.22, 0.25), m, { position: [0, 0, 0], color: a.pants });
  for (const leg of [legL, legR]) {
    b.part(leg, box(0.16, 0.78, 0.18), m, { position: [0, -0.42, 0], color: a.pants });
    b.part(leg, box(0.18, 0.11, 0.3), m, { position: [0, -0.84, 0.05], color: shoes });
  }
  b.part(torso, box(0.44, 0.56, 0.27), m, { position: [0, 0.28, 0], color: a.shirt });
  b.part(torso, box(0.46, 0.08, 0.29), m, { position: [0, 0.02, 0], color: a.pants });
  if (a.accessory === "apron") {
    b.part(torso, box(0.36, 0.62, 0.02), m, { position: [0, 0.18, 0.145], color: 0xf6f2ea });
  }
  if (a.accessory === "backpack") {
    b.part(torso, box(0.34, 0.42, 0.18), m, { position: [0, 0.3, -0.22], color: 0xd8322b });
  }
  for (const [arm, s] of [
    [armL, 1],
    [armR, -1],
  ] as const) {
    b.part(arm, box(0.13, 0.34, 0.14), m, { position: [s * 0.02, -0.16, 0], color: a.shirt });
    b.part(arm, box(0.11, 0.3, 0.12), m, { position: [s * 0.02, -0.46, 0], color: a.skin });
    b.part(arm, new THREE.SphereGeometry(0.075, 6, 5), m, { position: [s * 0.02, -0.64, 0], color: a.skin });
  }
  b.part(head, new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), m, { position: [0, 0.03, 0], color: a.skin });
  b.part(head, new THREE.SphereGeometry(1, 12, 10), m, { position: [0, 0.22, 0], scale: [0.17, 0.19, 0.17], color: a.skin });
  b.part(head, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), m, {
    position: [0, 0.26, -0.01],
    scale: [0.18, 0.17, 0.18],
    color: a.hair,
  });
  b.part(head, new THREE.SphereGeometry(1, 6, 4), m, { position: [0, 0.2, 0.17], scale: [0.03, 0.035, 0.03], color: a.skin, outline: false });
  for (const s of [1, -1]) {
    b.part(head, box(0.035, 0.05, 0.02), m, { position: [s * 0.06, 0.25, 0.158], color: 0x15110f, outline: false });
  }
  b.part(head, box(0.1, 0.018, 0.02), m, { position: [0, 0.14, 0.158], color: 0x6b2a1f, outline: false });
  if (a.accessory === "glasses") {
    b.part(head, box(0.26, 0.06, 0.03), m, { position: [0, 0.25, 0.168], color: 0x15110f, outline: false });
  }
  if (a.hat != null) {
    b.part(head, new THREE.CylinderGeometry(0.18, 0.185, 0.12, 12), m, { position: [0, 0.4, 0], color: a.hat });
    b.part(head, box(0.26, 0.03, 0.18), m, { position: [0, 0.35, 0.16], color: a.hat });
  }

  const group = b.build(materials().outline);
  const height = a.height ?? 1;
  root.scale.setScalar(height);
  // Suela exactamente en y = 0 (medido en la geometría, no a ojo)
  const body = group.children.find((o) => (o as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
  body.geometry.computeBoundingBox();
  root.position.y = -(body.geometry.boundingBox?.min.y ?? 0) * height;
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group, root, hips, torso, head, armL, armR, legL, legR };
}
