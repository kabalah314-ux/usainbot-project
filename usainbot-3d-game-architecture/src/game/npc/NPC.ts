import * as THREE from "three";
import { damp, dampAngle } from "../utils/math";
import type { Collider } from "../world/colliders";
import type { NPCData } from "../data/types";
import { buildNPCRig } from "./NPCModel";
import type { NPCRig } from "./NPCModel";
import type { NPCBehavior } from "./behaviors";

/** Animación que el comportamiento pide cada frame. */
export type NPCAnim = "idle" | "walk" | "talk" | "wave" | "point" | "sweep" | "startled";

export interface NPCContext {
  playerPos: THREE.Vector3;
  time: number;
  /** El jugador va en coche (y a qué velocidad): los vecinos se apartan del susto. */
  playerInVehicle: boolean;
  playerSpeed: number;
  getNPC(id: string): NPC | undefined;
}

const REACT_DISTANCE = 6;
const GREET_DISTANCE = 3.2;

/**
 * Vecino del barrio. Datos + modelo + comportamiento intercambiable.
 * Preparado para rutinas futuras: el comportamiento decide destino y
 * animación; el NPC solo se mueve, gira y anima.
 */
export class NPC {
  readonly data: NPCData;
  readonly root = new THREE.Group();
  readonly collider: Collider;
  behavior: NPCBehavior | null = null;
  /** true mientras el jugador habla con él (lo decide el diálogo). */
  talking = false;
  anim: NPCAnim = "idle";
  /** Hacia dónde quiere mirar este frame (null = orientación libre). */
  lookAt: THREE.Vector3 | null = null;
  moveTarget: THREE.Vector3 | null = null;
  moveSpeed = 1.4;
  /** Distancia al jugador (la calcula update). */
  playerDistance = Infinity;
  private rig: NPCRig;
  private phase = Math.random() * 10;
  private greeted = false;
  private greetTimer = 0;
  private tmp = new THREE.Vector3();

  constructor(data: NPCData) {
    this.data = data;
    this.rig = buildNPCRig(data.appearance);
    this.root.add(this.rig.group);
    this.root.position.set(data.position[0], 0, data.position[1]);
    this.root.rotation.y = data.yaw;
    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3() };
    this.syncCollider();
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  update(dt: number, ctx: NPCContext): void {
    this.playerDistance = this.position.distanceTo(ctx.playerPos);
    this.lookAt = null;
    this.moveTarget = null;
    this.anim = "idle";

    // Comportamiento base (rutina)
    this.behavior?.update(this, dt, ctx);

    // Reacción al jugador: se detiene, lo mira y saluda una vez
    const near = this.playerDistance < REACT_DISTANCE;
    const car = ctx.playerInVehicle;
    if (car && this.playerDistance < 8 && ctx.playerSpeed > 3.5) {
      // ¡Un coche! Se para, lo mira y levanta los brazos (sin saludar)
      this.moveTarget = null;
      this.lookAt = ctx.playerPos;
      this.anim = "startled";
    } else if (car) {
      if (near) this.lookAt = ctx.playerPos;
    } else if (this.talking) {
      this.moveTarget = null;
      this.lookAt = ctx.playerPos;
      this.anim = "talk";
    } else if (near) {
      if (this.playerDistance < 3.5) this.moveTarget = null;
      if (!this.moveTarget) this.lookAt = ctx.playerPos;
      if (!this.greeted && this.playerDistance < GREET_DISTANCE) {
        this.greeted = true;
        this.greetTimer = 1.6;
      }
    } else if (this.playerDistance > 14) {
      this.greeted = false;
    }
    if (this.greetTimer > 0) {
      this.greetTimer -= dt;
      if (!this.talking) this.anim = "wave";
    }

    // Movimiento
    if (this.moveTarget) {
      this.tmp.subVectors(this.moveTarget, this.position);
      this.tmp.y = 0;
      const dist = this.tmp.length();
      if (dist > 0.05) {
        const step = Math.min(dist, this.moveSpeed * dt);
        this.position.addScaledVector(this.tmp.normalize(), step);
        this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(this.tmp.x, this.tmp.z), 8, dt);
        if (this.anim === "idle") this.anim = "walk";
      }
    } else if (this.lookAt) {
      this.tmp.subVectors(this.lookAt, this.position);
      this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(this.tmp.x, this.tmp.z), 6, dt);
    }

    this.animate(dt, ctx.time);
    this.syncCollider();
  }

  private animate(dt: number, time: number): void {
    const r = this.rig;
    const d = (v: number, t: number, l = 10): number => damp(v, t, l, dt);
    let legL = 0;
    let legR = 0;
    let armLx = 0;
    let armRx = 0;
    let armLz = 0.08;
    let armRz = -0.08;
    let torsoX = 0;
    let headX = 0;
    let headY = 0;
    let hipsY = 0.9;

    const breathe = Math.sin(time * 2 + this.phase);
    switch (this.anim) {
      case "walk": {
        this.phase += dt * this.moveSpeed * 4.2;
        const s = Math.sin(this.phase);
        const amp = Math.min(0.9, 0.35 + this.moveSpeed * 0.15);
        legL = s * amp;
        legR = -s * amp;
        armLx = -s * amp * 0.8;
        armRx = s * amp * 0.8;
        hipsY = 0.9 + Math.abs(Math.cos(this.phase)) * 0.04;
        torsoX = this.moveSpeed > 2.5 ? 0.15 : 0.03;
        break;
      }
      case "talk":
        armRx = -0.7 + Math.sin(time * 4 + this.phase) * 0.35;
        armRz = -0.3;
        armLx = -0.3 + Math.sin(time * 3.1) * 0.2;
        headX = Math.sin(time * 5) * 0.06;
        break;
      case "startled":
        armLz = 2.5;
        armRz = -2.5;
        torsoX = -0.15;
        headX = -0.1;
        hipsY = 0.9 + Math.abs(Math.sin(time * 14)) * 0.05;
        break;
      case "wave":
        armRz = -2.6 + Math.sin(time * 12) * 0.3;
        headY = 0.1;
        break;
      case "point":
        armRx = -1.5;
        armRz = -0.1;
        headX = -0.1;
        break;
      case "sweep":
        armLx = -0.8 + Math.sin(time * 3) * 0.3;
        armRx = -0.6 + Math.sin(time * 3) * 0.3;
        torsoX = 0.18;
        break;
      default:
        armLz = 0.08 + breathe * 0.02;
        armRz = -0.08 - breathe * 0.02;
        headY = Math.sin(time * 0.5 + this.phase) * 0.35;
    }
    r.legL.rotation.x = d(r.legL.rotation.x, legL, 14);
    r.legR.rotation.x = d(r.legR.rotation.x, legR, 14);
    r.armL.rotation.x = d(r.armL.rotation.x, armLx);
    r.armR.rotation.x = d(r.armR.rotation.x, armRx);
    r.armL.rotation.z = d(r.armL.rotation.z, armLz);
    r.armR.rotation.z = d(r.armR.rotation.z, armRz);
    r.torso.rotation.x = d(r.torso.rotation.x, torsoX, 6);
    r.head.rotation.x = d(r.head.rotation.x, headX, 6);
    r.head.rotation.y = d(r.head.rotation.y, this.lookAt ? 0 : headY, 3);
    r.hips.position.y = d(r.hips.position.y, hipsY + breathe * 0.004, 12);
  }

  private syncCollider(): void {
    const p = this.position;
    this.collider.min.set(p.x - 0.32, 0, p.z - 0.32);
    this.collider.max.set(p.x + 0.32, 1.8, p.z + 0.32);
  }
}
