import * as THREE from "three";
import type { Collider } from "../world/colliders";
import type { VehicleData } from "../data/types";
import { damp } from "../utils/math";
import { buildVehicleModel } from "./VehicleModel";
import type { VehicleModel } from "./VehicleModel";

/**
 * Vehículo en el mundo: estado físico (lo mueve VehicleController) + modelo.
 * Independiente del jugador: se queda donde lo aparcas.
 */
export class Vehicle {
  readonly data: VehicleData;
  readonly model: VehicleModel;
  readonly root: THREE.Group;
  /** Velocidad en mundo (x, z) y velocidad longitudinal con signo. */
  readonly velocity = new THREE.Vector2();
  speed = 0;
  yaw: number;
  /** Dirección suavizada (-1 izquierda … 1 derecha, como la tecla D). */
  steer = 0;
  braking = false;
  skidding = false;
  /** Colisiones para el jugador A PIE (3 cajas a lo largo del coche). */
  readonly colliders: Collider[];
  private doorOpen = 0;
  private doorTarget = 0;
  private lastSpeed = 0;
  private roll = 0;
  private pitch = 0;
  private tmp = new THREE.Vector3();

  constructor(data: VehicleData, x: number, z: number, yaw: number) {
    this.data = data;
    this.model = buildVehicleModel(data);
    this.root = this.model.group;
    this.yaw = yaw;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
    this.colliders = data.handling.collisionOffsets.map(() => ({ min: new THREE.Vector3(), max: new THREE.Vector3() }));
    this.syncColliders();
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /** Vector hacia delante (mundo). */
  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  setDoor(open: boolean): void {
    this.doorTarget = open ? 1 : 0;
  }

  /** Punto de mundo de un anclaje local de la carrocería. */
  localPoint(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    this.model.body.updateWorldMatrix(true, false);
    return out.copy(local).applyMatrix4(this.model.body.matrixWorld);
  }

  /** Visuales: ruedas, dirección, puerta, luces de freno y balanceo. */
  updateVisuals(dt: number): void {
    const m = this.model;
    this.root.rotation.y = this.yaw;
    const spin = (this.speed / 0.46) * dt;
    for (const w of m.wheels) w.rotation.x += spin;
    for (const p of m.steerPivots) p.rotation.y = -this.steer * 0.5;
    this.doorOpen = damp(this.doorOpen, this.doorTarget, 12, dt);
    m.door.rotation.y = -1.15 * this.doorOpen;
    const k = this.braking ? 2.8 : 1.1;
    m.tailMaterial.color.setRGB(1.0 * k, 0.07 * k, 0.07 * k);
    // Balanceo arcade (cosmético, el coche nunca vuelca)
    const accel = dt > 0 ? (this.speed - this.lastSpeed) / dt : 0;
    this.lastSpeed = this.speed;
    const lateral = this.steer * Math.min(1, Math.abs(this.speed) / 12) * Math.sign(this.speed);
    this.roll = damp(this.roll, lateral * 0.06, 6, dt);
    this.pitch = damp(this.pitch, THREE.MathUtils.clamp(-accel * 0.006, -0.05, 0.05), 6, dt);
    m.body.rotation.set(this.pitch, 0, this.roll);
    this.syncColliders();
  }

  syncColliders(): void {
    const f = this.forward(this.tmp);
    const h = this.data.handling;
    const r = h.collisionRadius * 0.95;
    h.collisionOffsets.forEach((o, i) => {
      const cx = this.position.x + f.x * o;
      const cz = this.position.z + f.z * o;
      this.colliders[i].min.set(cx - r, 0, cz - r);
      this.colliders[i].max.set(cx + r, 1.4, cz + r);
    });
  }
}
