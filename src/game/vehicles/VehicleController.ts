import * as THREE from "three";
import { clamp, damp } from "../utils/math";
import { resolveCircleVsAABB } from "../utils/physics";
import type { Collider, WorldBounds } from "../world/colliders";
import type { GroundQuery } from "../world/GroundMap";
import type { Vehicle } from "./Vehicle";

export interface DriveInput {
  /** 1 = W (acelerar) · -1 = S (frenar / marcha atrás). */
  throttle: number;
  /** 1 = D (derecha) · -1 = A (izquierda). */
  steer: number;
  handbrake: boolean;
}

export const NO_DRIVE: DriveInput = { throttle: 0, steer: 0, handbrake: true };

const STEP = 0.3;
const tmpF = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpN = new THREE.Vector2();

/**
 * Conducción ARCADE (sin simulación de ruedas): velocidad longitudinal +
 * velocidad en mundo que "alcanza" a la dirección del coche según el agarre
 * (con el freno de mano el agarre cae → derrape). Colisión con 3 círculos a
 * lo largo del coche contra las cajas del mundo: el coche rebota y se desliza
 * por las paredes, nunca las atraviesa y nunca vuelca.
 */
export class VehicleController {
  /** Devuelve la velocidad del impacto más fuerte del frame (0 = sin choque). */
  update(
    v: Vehicle,
    input: DriveInput,
    dt: number,
    colliders: readonly Collider[],
    bounds: WorldBounds,
    ground: GroundQuery
  ): number {
    const h = v.data.handling;
    const f = v.forward(tmpF);
    // La velocidad del motor persiste entre frames (la velocidad en mundo la
    // "persigue" según el agarre). Solo un choque la recalcula.
    let speed = v.speed;

    // --- Acelerador / freno / marcha atrás
    const t = clamp(input.throttle, -1, 1);
    v.braking = false;
    if (t > 0.05) {
      if (speed < -0.5) {
        speed += h.braking * t * dt;
        v.braking = true;
      } else {
        speed += h.acceleration * t * (1 - (Math.max(0, speed) / h.maxSpeed) * 0.55) * dt;
      }
    } else if (t < -0.05) {
      if (speed > 0.5) {
        speed -= h.braking * -t * dt;
        v.braking = true;
      } else {
        speed -= h.acceleration * 0.75 * -t * dt;
      }
    } else {
      speed -= Math.sign(speed) * Math.min(Math.abs(speed), h.friction * dt);
    }
    if (input.handbrake) {
      speed -= Math.sign(speed) * Math.min(Math.abs(speed), h.handbrakeDecel * dt);
      v.braking = true;
    }
    speed = clamp(speed, -h.reverseSpeed, h.maxSpeed);

    // --- Dirección (no gira parado; pierde algo de giro a alta velocidad)
    v.steer = damp(v.steer, clamp(input.steer, -1, 1), h.steerResponse, dt);
    const abs = Math.abs(speed);
    const steerFactor = clamp(abs / h.fullSteerSpeed, 0, 1) * (1 - h.highSpeedSteerLoss * clamp(abs / h.maxSpeed, 0, 1));
    const boost = input.handbrake && abs > 4 ? h.handbrakeTurnBoost : 1;
    v.yaw += -v.steer * h.turnSpeed * steerFactor * Math.sign(speed) * boost * dt;
    v.forward(f);

    // --- Agarre lateral (derrape con freno de mano)
    const grip = input.handbrake ? h.handbrakeGrip : h.grip;
    const k = 1 - Math.exp(-grip * dt);
    v.velocity.x += (f.x * speed - v.velocity.x) * k;
    v.velocity.y += (f.z * speed - v.velocity.y) * k;
    const lateral = Math.abs(v.velocity.x * f.z - v.velocity.y * f.x);
    v.skidding = lateral > 3.5 && v.velocity.length() > 6;

    // --- Movimiento por subpasos + colisión
    const pos = v.position;
    const travel = v.velocity.length() * dt;
    const steps = Math.min(12, Math.max(1, Math.ceil(travel / STEP)));
    let impact = 0;
    let hit = false;
    for (let s = 0; s < steps; s++) {
      pos.x += (v.velocity.x * dt) / steps;
      pos.z += (v.velocity.y * dt) / steps;
      const n = this.resolve(v, colliders);
      if (n) {
        hit = true;
        const vn = v.velocity.x * n.x + v.velocity.y * n.y;
        if (vn < 0) {
          impact = Math.max(impact, -vn);
          v.velocity.x -= n.x * vn * (1 + h.bounce);
          v.velocity.y -= n.y * vn * (1 + h.bounce);
        }
      }
    }
    const margin = h.collisionRadius;
    pos.x = clamp(pos.x, bounds.minX + margin, bounds.maxX - margin);
    pos.z = clamp(pos.z, bounds.minZ + margin, bounds.maxZ - margin);
    pos.y = ground(pos.x, pos.z, pos.y + 0.45);

    const along = v.velocity.x * f.x + v.velocity.y * f.z;
    v.speed = hit ? along : speed;
    return impact;
  }

  /** Empuja los círculos fuera de las cajas. Devuelve la normal media del choque. */
  private resolve(v: Vehicle, colliders: readonly Collider[]): THREE.Vector2 | null {
    const h = v.data.handling;
    const f = v.forward(tmpF);
    const pos = v.position;
    let px = 0;
    let pz = 0;
    for (const o of h.collisionOffsets) {
      tmpC.set(pos.x + f.x * o, pos.y + 0.2, pos.z + f.z * o);
      const bx = tmpC.x;
      const bz = tmpC.z;
      for (const c of colliders) {
        if (c.max.y < 0.25) continue; // bordillos y alfombras no paran el coche
        resolveCircleVsAABB(tmpC, h.collisionRadius, c);
      }
      const dx = tmpC.x - bx;
      const dz = tmpC.z - bz;
      if (dx !== 0 || dz !== 0) {
        pos.x += dx;
        pos.z += dz;
        px += dx;
        pz += dz;
      }
    }
    const len = Math.hypot(px, pz);
    return len > 1e-6 ? tmpN.set(px / len, pz / len) : null;
  }
}
