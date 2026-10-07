import * as THREE from "three";
import { StaticBatcher } from "../utils/StaticBatcher";
import { toon } from "../utils/materials";
import { createCanvasTexture } from "../utils/textures";
import { GASOIL_BRAND } from "../data/cityLayout";
import type { RaceData } from "../data/types";

const POOL = 8;
const GATE_H = 5.2;

export type GateRole = "start" | "next" | "later" | "finish" | "hidden";

interface Gate {
  group: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  banner: THREE.Mesh;
}

const COLORS: Record<Exclude<GateRole, "hidden">, THREE.Color> = {
  start: new THREE.Color(0.35, 2.2, 1.2),
  next: new THREE.Color(2.4, 1.9, 0.3),
  later: new THREE.Color(0.25, 0.9, 1.1),
  finish: new THREE.Color(2.4, 0.5, 0.7),
};

const VEHICLE_COLORS = {
  next: new THREE.Color(0.35, 1.0, 2.8),
  later: new THREE.Color(0.2, 0.5, 1.3),
};

function checkerTexture(): THREE.CanvasTexture {
  return createCanvasTexture(128, 32, (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 4; y++) {
        ctx.fillStyle = (x + y) % 2 ? "#15191f" : "#f6f2ea";
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }
  });
}

/**
 * Arcos de carrera low poly (pool fijo, se reutilizan entre carreras):
 * dos postes GasOil + travesaño + anillo luminoso (HDR → bloom).
 * El siguiente checkpoint brilla en amarillo; los posteriores, tenues.
 */
export class RaceGates {
  readonly group = new THREE.Group();
  private gates: Gate[] = [];
  private time = 0;

  constructor() {
    const frameMat = toon({ vertexColors: true });
    const bannerMat = new THREE.MeshBasicMaterial({ map: checkerTexture(), side: THREE.DoubleSide });
    // Un poste (geometría compartida por todos los arcos)
    const pb = new StaticBatcher();
    pb.setBase(0, 0, 0);
    pb.box(0.55, GATE_H, 0.55, GASOIL_BRAND.charcoal, 0, GATE_H / 2, 0);
    pb.box(0.62, 0.9, 0.62, GASOIL_BRAND.orange, 0, 0.45, 0);
    pb.box(0.62, 0.25, 0.62, GASOIL_BRAND.yellow, 0, GATE_H - 0.3, 0);
    const postGeo = (pb.build(frameMat, true, false) as THREE.Mesh).geometry;
    for (let i = 0; i < POOL; i++) {
      const frame = new THREE.Group();
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.castShadow = true;
        post.userData.side = side;
        frame.add(post);
      }
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLORS.next.clone(),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), ringMat);
      ring.position.y = GATE_H * 0.55;
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.9), bannerMat);
      banner.position.y = GATE_H - 0.2;
      const group = new THREE.Group();
      group.add(frame, ring, banner);
      group.visible = false;
      this.group.add(group);
      this.gates.push({ group, ring, ringMat, banner });
      // Los postes se reparten según el ancho (escala X del marco, no de los postes)
      group.userData.frame = frame;
    }
  }

  /** Coloca los arcos de una carrera: [salida, cp1…cpN, meta]. */
  layout(race: RaceData): void {
    const points: Array<[number, number]> = [[race.start.x, race.start.z], ...race.checkpoints, race.finish];
    this.gates.forEach((g, i) => {
      if (i >= points.length) {
        g.group.visible = false;
        return;
      }
      const [x, z] = points[i];
      const prev = i > 0 ? points[i - 1] : [x - Math.sin(race.start.yaw), z - Math.cos(race.start.yaw)];
      const next = i < points.length - 1 ? points[i + 1] : null;
      // Orientación: perpendicular a la dirección de llegada (en curvas, bisectriz)
      let dx = x - prev[0];
      let dz = z - prev[1];
      if (next && i > 0) {
        dx = dx / (Math.hypot(dx, dz) || 1) + (next[0] - x) / (Math.hypot(next[0] - x, next[1] - z) || 1);
        dz = dz / (Math.hypot(x - prev[0], z - prev[1]) || 1) + (next[1] - z) / (Math.hypot(next[0] - x, next[1] - z) || 1);
      }
      g.group.position.set(x, 0, z);
      g.group.rotation.y = Math.atan2(dx, dz);
      const half = race.gateWidth / 2;
      const frame = g.group.userData.frame as THREE.Group;
      for (const post of frame.children) post.position.x = (post.userData.side as number) * half;
      g.ring.scale.set(half * 0.8, GATE_H * 0.42, 1);
      g.banner.scale.set(race.gateWidth, 1, 1);
    });
  }

  /** Rol visual de cada arco (índice sobre [salida, checkpoints…, meta]). */
  setRoles(roles: GateRole[], vehicle = false): void {
    this.gates.forEach((g, i) => {
      const role = roles[i] ?? "hidden";
      g.group.visible = role !== "hidden";
      if (role === "hidden") return;
      // Carreras en coche: checkpoints con la identidad AZUL de conducción
      g.ringMat.color.copy(vehicle && (role === "next" || role === "later") ? VEHICLE_COLORS[role] : COLORS[role]);
      g.ringMat.opacity = role === "later" ? 0.35 : 0.9;
      g.banner.visible = role === "start" || role === "finish";
      g.group.userData.role = role;
    });
  }

  hideAll(): void {
    for (const g of this.gates) g.group.visible = false;
  }

  update(dt: number): void {
    this.time += dt;
    for (const g of this.gates) {
      if (!g.group.visible) continue;
      const pulse = g.group.userData.role === "next" ? 1 + Math.sin(this.time * 7) * 0.06 : 1;
      g.ring.rotation.z += dt * (g.group.userData.role === "next" ? 1.6 : 0.4);
      g.ring.scale.z = pulse;
    }
  }
}
