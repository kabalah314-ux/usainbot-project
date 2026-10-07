import * as THREE from "three";
import { damp, dampAngle } from "../utils/math";
import type { Collider } from "../world/colliders";
import type { NPCData } from "../data/types";
import { createCanMesh } from "../gasoil/canMesh";
import { buildNPCRig } from "./NPCModel";
import type { NPCRig } from "./NPCModel";
import type { NPCBehavior } from "./behaviors";

/** Animación que el comportamiento pide cada frame. */
export type NPCAnim =
  | "idle"
  | "walk"
  | "talk"
  | "wave"
  | "point"
  | "sweep"
  | "startled"
  | "sit"
  | "drink"
  | "use"
  | "lowbattery"
  | "tired";

/** Estado lógico del NPC (lo pide el diseño: IDLE · WALKING · TALKING · SITTING · PAUSED). */
export type NPCState = "IDLE" | "WALKING" | "TALKING" | "SITTING" | "PAUSED";

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
 * Vecino del barrio (con nombre o peatón genérico). Datos + modelo +
 * comportamiento intercambiable: el comportamiento decide destino y
 * animación; el NPC se mueve, gira, reacciona y anima.
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
  /** Lo marca el comportamiento cuando espera a propósito (PAUSED). */
  paused = false;
  /** Distancia al jugador (la calcula update). */
  playerDistance = Infinity;
  state: NPCState = "IDLE";
  /** Es un robot (bebe GasOil, se queda sin batería…). */
  readonly robot: boolean;
  /** Lo controla un evento ambiental (el gestor de peatones no lo recicla). */
  claimed = false;
  /** Enfriamiento de frases de reacción. */
  barkCooldown = 0;
  private rig: NPCRig;
  private outline: THREE.Mesh | null = null;
  private body: THREE.Mesh | null = null;
  private can: THREE.Object3D | null = null;
  private detailed = true;
  private phase = Math.random() * 10;
  private greeted = false;
  private greetTimer = 0;
  private reactTimer = 0;
  private reactFrom = new THREE.Vector3();
  private dodgeTimer = 0;
  private dodgeVel = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(data: NPCData) {
    this.data = data;
    this.rig = buildNPCRig(data.appearance);
    this.robot = data.appearance.robot === true;
    this.root.add(this.rig.group);
    this.root.position.set(data.position[0], 0, data.position[1]);
    this.root.rotation.y = data.yaw;
    for (const child of this.rig.group.children) {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) continue;
      if ((mesh.material as THREE.Material).side === THREE.BackSide) this.outline = mesh;
      else this.body = mesh;
    }
    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3() };
    this.syncCollider();
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /** Posición "de casa" (NPCs con nombre vuelven aquí tras apartarse). */
  get home(): THREE.Vector3 {
    return this.tmp.set(this.data.position[0], this.position.y, this.data.position[1]);
  }

  /** Susto: se gira hacia `from`, levanta los brazos y (si está cerca) se aparta. */
  react(from: THREE.Vector3, duration = 0.9, dodge = 0): void {
    this.reactTimer = duration;
    this.reactFrom.copy(from);
    if (dodge > 0) {
      this.dodgeVel.subVectors(this.position, from).setY(0);
      if (this.dodgeVel.lengthSq() < 1e-4) this.dodgeVel.set(1, 0, 0);
      this.dodgeVel.normalize().multiplyScalar(dodge);
      this.dodgeTimer = 0.35;
    }
  }

  /** Nivel de detalle: lejos, sin contorno ni sombra (ahorro de draw calls). */
  setDetail(near: boolean): void {
    if (near === this.detailed) return;
    this.detailed = near;
    if (this.outline) this.outline.visible = near;
    if (this.body) this.body.castShadow = near;
  }

  /** Lata de GasOil en la mano derecha (se crea la primera vez). */
  showCan(visible: boolean): void {
    if (!visible && !this.can) return;
    if (!this.can) {
      this.can = createCanMesh();
      this.can.scale.setScalar(1.3);
      this.can.position.set(-0.02, -0.68, 0.07);
      this.rig.armR.add(this.can);
    }
    this.can.visible = visible;
  }

  update(dt: number, ctx: NPCContext): void {
    this.playerDistance = this.position.distanceTo(ctx.playerPos);
    this.lookAt = null;
    this.moveTarget = null;
    this.anim = "idle";
    this.paused = false;
    this.barkCooldown = Math.max(0, this.barkCooldown - dt);
    const start = this.tmp.copy(this.position);
    const sx = start.x;
    const sz = start.z;

    // Comportamiento base (rutina)
    this.behavior?.update(this, dt, ctx);
    const chosen = this.anim as NPCAnim; // lo puede haber cambiado el comportamiento
    const seated = chosen === "sit";
    const busy = chosen === "lowbattery" || chosen === "drink" || chosen === "use";

    // Reacción puntual (turbo, carrera, coche): se gira y se sorprende
    if (this.reactTimer > 0) {
      this.reactTimer -= dt;
      this.moveTarget = null;
      this.lookAt = this.reactFrom;
      if (!busy) this.anim = "startled";
    }

    // Reacción continua al jugador
    const near = this.playerDistance < REACT_DISTANCE;
    const car = ctx.playerInVehicle;
    if (this.reactTimer > 0) {
      // ya reaccionando
    } else if (car && this.playerDistance < 8 && ctx.playerSpeed > 3.5 && !busy) {
      // ¡Un coche! Se para, lo mira y levanta los brazos (sin saludar)
      this.moveTarget = null;
      this.lookAt = ctx.playerPos;
      this.anim = "startled";
    } else if (car) {
      if (near) this.lookAt = ctx.playerPos;
    } else if (this.talking) {
      this.moveTarget = null;
      this.lookAt = ctx.playerPos;
      this.anim = seated ? "sit" : "talk";
    } else if (near && !busy) {
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
      if (!this.talking && !seated && !busy && this.reactTimer <= 0) this.anim = "wave";
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
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.position.addScaledVector(this.dodgeVel, dt);
    }

    // Estado lógico
    const moved = Math.hypot(this.position.x - sx, this.position.z - sz) > 0.002;
    this.state =
      this.anim === "sit"
        ? "SITTING"
        : this.talking || this.anim === "talk"
          ? "TALKING"
          : moved
            ? "WALKING"
            : this.paused
              ? "PAUSED"
              : "IDLE";

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
        const running = this.moveSpeed > 2.5;
        this.phase += dt * this.moveSpeed * (running ? 3.2 : 4.2);
        const s = Math.sin(this.phase);
        const amp = Math.min(running ? 1.1 : 0.9, 0.35 + this.moveSpeed * 0.15);
        legL = s * amp;
        legR = -s * amp;
        armLx = -s * amp * 0.8;
        armRx = s * amp * 0.8;
        hipsY = 0.9 + Math.abs(Math.cos(this.phase)) * (running ? 0.07 : 0.04);
        torsoX = running ? 0.2 : 0.03;
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
      case "sit":
        // Sentado en el banco: piernas hacia delante, espalda apoyada
        hipsY = 0.52;
        legL = -1.5;
        legR = -1.45;
        torsoX = -0.12;
        armLx = -0.35;
        armRx = -0.35;
        headY = Math.sin(time * 0.4 + this.phase) * 0.4;
        break;
      case "drink":
        // Bebiendo GasOil como un refresco: brazo a la boca, cabeza atrás
        armRx = -2.55 + Math.sin(time * 8) * 0.05;
        armRz = -0.35;
        headX = -0.45;
        torsoX = -0.08;
        armLz = 0.5;
        break;
      case "use":
        // Pulsando botones de la máquina
        armRx = -1.35 + Math.sin(time * 9) * 0.12;
        armRz = -0.05;
        headX = 0.15;
        break;
      case "lowbattery":
        // Sin energía: encorvado, brazos colgando, algún tic
        torsoX = 0.55;
        headX = 0.55 + (Math.sin(time * 13) > 0.97 ? -0.3 : 0);
        armLx = 0.25;
        armRx = 0.2;
        armLz = 0.02;
        armRz = -0.02;
        hipsY = 0.84;
        break;
      case "tired":
        // Agotado tras "echar una carrera": manos en las rodillas
        torsoX = 0.7;
        armLx = -0.7;
        armRx = -0.7;
        hipsY = 0.8 + Math.abs(Math.sin(time * 6)) * 0.02;
        headX = -0.3;
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
