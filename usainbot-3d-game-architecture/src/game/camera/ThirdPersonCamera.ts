import * as THREE from "three";
import { gameSettings } from "../data/config";
import { clamp, damp, dampAngle, wrapAngle } from "../utils/math";
import { rayVsAABB } from "../utils/physics";
import type { Collider } from "../world/colliders";

/** Datos que la escena entrega a la cámara cada frame. */
export interface CameraFrame {
  target: THREE.Vector3;
  playerYaw: number;
  /** 0..1 respecto a la carrera normal. */
  speedRatio: number;
  /** Stick derecho / flechas. */
  look: { x: number; y: number };
  /** Arrastre de ratón (píxeles). */
  pointer: { x: number; y: number };
  recenter: boolean;
  sprinting: boolean;
  colliders: readonly Collider[];
  /** 0..1 intensidad del turbo (aleja la cámara y vibra un poco). */
  turbo?: number;
  /** 0..1 primer plano (p. ej. mientras bebe GasOil). */
  closeUp?: number;
  /** "vehicle": cámara de conducción (detrás del coche, más lejos, más FOV con la velocidad). */
  mode?: "foot" | "vehicle";
}

/**
 * Cámara en tercera persona estilo PS2:
 * - Sigue sola por detrás cuando corres (seguimiento "perezoso").
 * - Stick derecho / flechas / arrastre para orbitar manualmente.
 * - L1 (Q) la recoloca detrás del personaje.
 * - Se acerca al chocar con edificios para no atravesarlos.
 */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = gameSettings.camera.defaultPitch;

  private camera: THREE.PerspectiveCamera;
  private distance = gameSettings.camera.distance;
  private manualTimer = Infinity;
  private recentering = false;
  private initialized = false;
  private focus = new THREE.Vector3();
  private turboK = 0;
  /** Velocidad de giro actual (flechas suavizadas). */
  private lookVel = { x: 0, y: 0 };
  private closeK = 0;
  private shakeT = 0;
  private mode: "foot" | "vehicle" = "foot";
  /** Transición suave al cambiar de modo (subir/bajar del coche). */
  private blend = 0;
  private shakeImpulse = 0;
  private vehicleK = 0;
  private dir = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  /** Dirección hacia delante de la cámara en XZ (para el movimiento). */
  getForward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** Sacudida puntual (choques). */
  shake(amount: number): void {
    this.shakeImpulse = Math.min(1, this.shakeImpulse + amount);
  }

  /** Coloca la cámara justo detrás del jugador. */
  reset(playerYaw: number): void {
    this.yaw = playerYaw + Math.PI;
    this.pitch = gameSettings.camera.defaultPitch;
    this.manualTimer = Infinity;
    this.recentering = false;
    this.initialized = false;
  }

  /** Fase de cámara. */
  update(dt: number, f: CameraFrame): void {
    const s = gameSettings.camera;

    // --- Control manual
    this.lookVel.x = damp(this.lookVel.x, f.look.x, s.keyLookResponse, dt);
    this.lookVel.y = damp(this.lookVel.y, f.look.y, s.keyLookResponse, dt);
    if (Math.abs(this.lookVel.x) < 0.002) this.lookVel.x = 0;
    if (Math.abs(this.lookVel.y) < 0.002) this.lookVel.y = 0;
    const manual =
      f.look.x !== 0 || f.look.y !== 0 || f.pointer.x !== 0 || f.pointer.y !== 0;
    if (manual) {
      this.manualTimer = 0;
      this.recentering = false;
    } else {
      this.manualTimer += dt;
    }
    this.yaw -= this.lookVel.x * s.stickYawSpeed * dt + f.pointer.x * s.mouseSensitivity;
    this.pitch += f.pointer.y * s.mouseSensitivity - this.lookVel.y * s.stickPitchSpeed * dt;

    // --- Cambio de modo (a pie ↔ coche): mezcla suave del punto de mira
    const mode = f.mode ?? "foot";
    if (mode !== this.mode) {
      this.mode = mode;
      this.blend = 0.6;
    }
    this.blend = Math.max(0, this.blend - dt);
    const inCar = mode === "vehicle";
    this.vehicleK = damp(this.vehicleK, inCar ? 1 : 0, 4, dt);

    // --- Recentrado (C) y seguimiento automático
    const behind = f.playerYaw + Math.PI;
    if (f.recenter) this.recentering = true;
    if (this.recentering) {
      this.yaw = dampAngle(this.yaw, behind, s.recenterSpeed, dt);
      this.pitch = damp(this.pitch, s.defaultPitch, s.recenterSpeed, dt);
      if (Math.abs(wrapAngle(behind - this.yaw)) < 0.01) this.recentering = false;
    } else if (inCar && this.manualTimer > 0.6 && f.speedRatio > 0.04) {
      // Conducción: se coloca detrás del coche (también en marcha atrás)
      this.yaw = dampAngle(this.yaw, behind, s.vehicleFollowSpeed * Math.min(1, 0.35 + f.speedRatio), dt);
      this.pitch = damp(this.pitch, s.vehicleDefaultPitch, 1.5, dt);
    } else if (!inCar && this.manualTimer > s.autoFollowDelay && f.speedRatio > 0.05) {
      // Seguimiento por componente lateral: no gira 180° si corres hacia la cámara.
      const delta = wrapAngle(behind - this.yaw);
      this.yaw += Math.sin(delta) * s.autoFollowSpeed * f.speedRatio * dt;
      this.pitch = damp(this.pitch, s.defaultPitch, 1.2, dt);
    }
    this.pitch = clamp(this.pitch, s.minPitch, s.maxPitch);

    // --- Punto de mira (retraso vertical suave en los saltos)
    const targetY = f.target.y + s.targetHeight + (s.vehicleTargetHeight - s.targetHeight) * this.vehicleK;
    if (!this.initialized) {
      this.focus.set(f.target.x, targetY, f.target.z);
    } else if (this.blend > 0) {
      this.focus.x = damp(this.focus.x, f.target.x, 9, dt);
      this.focus.z = damp(this.focus.z, f.target.z, 9, dt);
      this.focus.y = damp(this.focus.y, targetY, 7, dt);
    } else {
      this.focus.x = f.target.x;
      this.focus.z = f.target.z;
      this.focus.y = damp(this.focus.y, targetY, 7, dt);
    }

    // --- Posición orbital + colisión con edificios
    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    this.turboK = damp(this.turboK, f.turbo ?? 0, 3, dt);
    this.closeK = damp(this.closeK, f.closeUp ?? 0, 4, dt);
    const footDist = s.distance * (1 + 0.16 * this.turboK) * (1 - 0.35 * this.closeK);
    const carDist = s.vehicleDistance * (1 + 0.22 * f.speedRatio);
    const wanted = footDist + (carDist - footDist) * this.vehicleK;
    const allowed = this.clipDistance(wanted, f.colliders);
    this.distance =
      !this.initialized || allowed < this.distance
        ? allowed
        : damp(this.distance, allowed, 4, dt);

    this.camera.position.copy(this.focus).addScaledVector(this.dir, this.distance);
    if (this.turboK > 0.01) {
      // Vibración suave (no marea): senos desfasados, amplitud de centímetros
      this.shakeT += dt;
      const a = 0.03 * this.turboK;
      this.camera.position.x += Math.sin(this.shakeT * 37) * a;
      this.camera.position.y += Math.sin(this.shakeT * 43 + 1.3) * a;
    }
    if (this.shakeImpulse > 0.01) {
      this.shakeT += dt;
      const a = 0.25 * this.shakeImpulse;
      this.camera.position.x += Math.sin(this.shakeT * 61) * a;
      this.camera.position.y += Math.sin(this.shakeT * 53 + 2) * a;
      this.shakeImpulse = damp(this.shakeImpulse, 0, 6, dt);
    }
    if (this.camera.position.y < 0.25) this.camera.position.y = 0.25;
    this.camera.lookAt(this.focus);

    // --- FOV más abierto al esprintar
    const targetFov = inCar ? s.fov + (s.vehicleFov - s.fov) * f.speedRatio * f.speedRatio : f.sprinting ? s.sprintFov : s.fov;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = damp(this.camera.fov, targetFov, 5, dt);
      this.camera.updateProjectionMatrix();
    }
    this.initialized = true;
  }

  private clipDistance(maxDist: number, colliders: readonly Collider[]): number {
    const s = gameSettings.camera;
    let dist = maxDist;
    for (const c of colliders) {
      const hit = rayVsAABB(this.focus, this.dir, dist, c);
      if (hit < dist) dist = hit;
    }
    if (dist < maxDist) dist -= s.collisionPadding;
    return Math.max(s.minDistance, dist);
  }
}
