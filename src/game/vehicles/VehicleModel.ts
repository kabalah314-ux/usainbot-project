import * as THREE from "three";
import { StaticBatcher } from "../utils/StaticBatcher";
import { toon } from "../utils/materials";
import type { VehicleData } from "../data/types";

/**
 * Modelo low poly del BOLT-MOBILE: descapotable de proporciones exageradas
 * (ruedas enormes, capó largo, alerón) con los colores de UsainBot.
 * Mira hacia +Z; el suelo está en y = 0. Descapotable a propósito: se ve
 * a UsainBot conduciendo (con la cabeza de caricatura por fuera).
 *
 * Draw calls: carrocería 1 + puerta 1 + cristal 1 + faros 1 + pilotos 1 + ruedas 4.
 */
export interface VehicleModel {
  group: THREE.Group;
  /** Carrocería (se inclina con aceleraciones: balanceo arcade). */
  body: THREE.Group;
  door: THREE.Group;
  wheels: THREE.Object3D[];
  steerPivots: THREE.Object3D[];
  tailMaterial: THREE.MeshBasicMaterial;
  /** Anclaje local del jugador sentado (raíz del personaje). */
  seat: THREE.Vector3;
  /** Punto junto a la puerta del conductor (lado +X). */
  doorPoint: THREE.Vector3;
}

export const CAR = { length: 4.5, width: 2.1, wheelRadius: 0.46, wheelX: 1.0, wheelZ: 1.45 } as const;

const DARK = 0x1b1f26;
const METAL = 0xa9b3bb;
const GOLD = 0xc99a4a;
const INTERIOR = 0x3a2a24;
const SEAT = 0x2f353c;

let wheelGeometry: THREE.BufferGeometry | null = null;

function buildWheelGeometry(): THREE.BufferGeometry {
  const b = new StaticBatcher();
  b.setBase(0, 0, 0);
  const r = CAR.wheelRadius;
  b.cyl(r, r, 0.36, 16, 0x1c1f24, 0, 0, 0, 0, 0, Math.PI / 2);
  b.cyl(r * 0.62, r * 0.62, 0.38, 12, GOLD, 0, 0, 0, 0, 0, Math.PI / 2);
  // Radios visibles en las caras (así se nota que la rueda gira)
  b.box(0.4, r * 1.15, 0.08, DARK, 0, 0, 0);
  b.box(0.4, 0.08, r * 1.15, DARK, 0, 0, 0);
  b.cyl(0.08, 0.08, 0.42, 8, METAL, 0, 0, 0, 0, 0, Math.PI / 2);
  const mesh = b.build(toon({ vertexColors: true })) as THREE.Mesh;
  return mesh.geometry;
}

export function buildVehicleModel(data: VehicleData): VehicleModel {
  const Y = data.color;
  const G = data.accent;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  // ---------------- Carrocería (1 malla) ----------------
  const b = new StaticBatcher();
  b.setBase(0, 0, 0);
  b.box(1.9, 0.3, 4.2, DARK, 0, 0.42, 0); // chasis
  b.box(1.75, 0.52, 1.95, Y, 0, 0.78, 1.25); // vano motor
  b.box(1.75, 0.52, 1.35, Y, 0, 0.78, -1.55); // maletero
  b.box(0.2, 0.55, 4.35, Y, -0.97, 0.76, 0); // lateral pasajero
  b.box(0.2, 0.55, 1.85, Y, 0.97, 0.76, 1.25); // lateral conductor (delante de la puerta)
  b.box(0.2, 0.55, 1.35, Y, 0.97, 0.76, -1.55); // lateral conductor (detrás)
  b.box(1.95, 0.2, 1.9, Y, 0, 1.1, 1.3, 0.07, 0, 0); // capó
  b.box(1.95, 0.24, 1.3, Y, 0, 1.12, -1.55, -0.05, 0, 0); // tapa trasera
  b.box(2.0, 0.42, 0.45, Y, 0, 0.72, 2.3); // morro
  // Pasos de rueda exagerados (medio cilindro)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.46, 12, 1, false, 0, Math.PI), Y, sx * CAR.wheelX, 0.5, sz * CAR.wheelZ, 0, 0, Math.PI / 2);
    }
  }
  // Franjas de carreras y taloneras verdes (colores de UsainBot)
  for (const sx of [-0.24, 0.24]) {
    b.box(0.26, 0.02, 1.9, G, sx, 1.215, 1.3, 0.07, 0, 0);
    b.box(0.26, 0.02, 1.3, G, sx, 1.245, -1.55, -0.05, 0, 0);
  }
  b.box(0.08, 0.2, 3.2, G, -1.08, 0.58, 0);
  b.box(0.08, 0.2, 3.2, G, 1.08, 0.58, 0);
  // Parachoques, rejilla, escapes
  b.box(2.15, 0.26, 0.28, DARK, 0, 0.5, 2.55);
  b.box(2.15, 0.26, 0.28, DARK, 0, 0.52, -2.3);
  b.box(1.1, 0.22, 0.06, DARK, 0, 0.8, 2.53);
  for (const x of [-0.45, 0.45]) b.cyl(0.08, 0.1, 0.35, 8, METAL, x, 0.42, -2.4, Math.PI / 2, 0, 0);
  // Habitáculo: suelo, salpicadero, asientos, volante
  b.box(1.7, 0.06, 1.25, INTERIOR, 0, 0.58, -0.3);
  b.box(1.72, 0.32, 0.3, DARK, 0, 1.05, 0.36);
  for (const x of [-0.45, 0.45]) {
    b.box(0.62, 0.16, 0.62, SEAT, x, 0.66, -0.32);
    b.box(0.62, 0.8, 0.16, SEAT, x, 1.0, -0.72, -0.15, 0, 0);
    b.box(0.2, 0.8, 0.17, Y, x, 1.0, -0.73, -0.15, 0, 0);
    b.box(0.42, 0.28, 0.14, SEAT, x, 1.5, -0.8);
  }
  b.cyl(0.03, 0.03, 0.45, 6, DARK, 0.45, 1.05, 0.28, -1.0, 0, 0);
  b.add(new THREE.TorusGeometry(0.19, 0.035, 6, 14), DARK, 0.45, 1.13, 0.12, -1.0, 0, 0);
  b.box(0.1, 0.04, 0.3, G, 0.45, 1.13, 0.12, -1.0, 0, 0);
  // Marco del parabrisas, arco antivuelco, retrovisores, alerón
  b.box(1.8, 0.07, 0.07, DARK, 0, 1.58, 0.36);
  for (const sx of [-0.9, 0.9]) b.box(0.07, 0.62, 0.07, DARK, sx, 1.28, 0.48, -0.38, 0, 0);
  for (const sx of [-0.55, 0.55]) b.cyl(0.05, 0.05, 0.85, 8, METAL, sx, 1.4, -1.0);
  b.box(1.2, 0.1, 0.1, METAL, 0, 1.82, -1.0);
  for (const sx of [-1.07, 1.07]) {
    b.box(0.08, 0.08, 0.2, DARK, sx, 1.2, 0.55);
    b.box(0.2, 0.14, 0.05, G, sx * 1.07, 1.28, 0.6);
  }
  for (const sx of [-0.62, 0.62]) b.box(0.08, 0.38, 0.12, DARK, sx, 1.4, -2.0);
  b.box(2.05, 0.08, 0.48, G, 0, 1.6, -2.05);
  b.box(0.08, 0.3, 0.5, DARK, -1.03, 1.52, -2.05);
  b.box(0.08, 0.3, 0.5, DARK, 1.03, 1.52, -2.05);
  const bodyMesh = b.build(toon({ vertexColors: true })) as THREE.Mesh;
  bodyMesh.castShadow = true;
  body.add(bodyMesh);

  // ---------------- Puerta del conductor (bisagra delante) ----------------
  const door = new THREE.Group();
  door.position.set(0.97, 0.76, 0.32);
  const db = new StaticBatcher();
  db.setBase(0, 0, 0);
  db.box(0.18, 0.55, 1.12, Y, 0, 0, -0.56);
  db.box(0.06, 0.2, 1.1, G, 0.1, -0.18, -0.56);
  db.box(0.04, 0.05, 0.22, DARK, 0.11, 0.12, -0.85);
  const doorMesh = db.build(toon({ vertexColors: true })) as THREE.Mesh;
  doorMesh.castShadow = true;
  door.add(doorMesh);
  body.add(door);

  // ---------------- Parabrisas (transparente) ----------------
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.74, 0.55, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.35, depthWrite: false })
  );
  glass.position.set(0, 1.3, 0.46);
  glass.rotation.x = -0.38;
  body.add(glass);

  // ---------------- Faros y pilotos (HDR → brillan con el bloom) ----------------
  const lights = (color: THREE.Color, z: number, w: number): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } => {
    const mat = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.BoxGeometry(w, 0.18, 0.06);
    const merged = new THREE.Group();
    const left = new THREE.Mesh(geo, mat);
    left.position.set(0.63, 0.9, z);
    const right = new THREE.Mesh(geo, mat);
    right.position.set(-0.63, 0.9, z);
    merged.add(left, right);
    body.add(merged);
    return { mesh: left, mat };
  };
  lights(new THREE.Color(2.4, 2.3, 1.8), 2.53, 0.46);
  const tail = lights(new THREE.Color(1.1, 0.08, 0.08), -2.22, 0.4);

  // ---------------- Ruedas (geometría compartida) ----------------
  if (!wheelGeometry) wheelGeometry = buildWheelGeometry();
  const wheelMat = toon({ vertexColors: true });
  const wheels: THREE.Object3D[] = [];
  const steerPivots: THREE.Object3D[] = [];
  for (const sz of [1, -1]) {
    for (const sx of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * CAR.wheelX, CAR.wheelRadius, sz * CAR.wheelZ);
      const wheel = new THREE.Mesh(wheelGeometry, wheelMat);
      wheel.castShadow = true;
      pivot.add(wheel);
      group.add(pivot);
      wheels.push(wheel);
      if (sz > 0) steerPivots.push(pivot);
    }
  }

  return {
    group,
    body,
    door,
    wheels,
    steerPivots,
    tailMaterial: tail.mat,
    seat: new THREE.Vector3(0.45, 0.4, -0.3),
    doorPoint: new THREE.Vector3(1.85, 0, -0.1),
  };
}
