import * as THREE from "three";
import type { Collider, WorldBounds } from "../world/colliders";
import type { GroundQuery } from "../world/GroundMap";
import type { InteractionSystem } from "../interaction/InteractionSystem";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { InputManager } from "../core/input/InputManager";
import type { EventBus } from "../core/EventBus";
import type { Player } from "../player/Player";
import { resolveCircleVsAABB } from "../utils/physics";
import { GARAGE_SLOTS, VEHICLES, garageSettings, vehicleInteraction as VI } from "../data/vehicles";
import { Vehicle } from "./Vehicle";
import { VehicleController, NO_DRIVE } from "./VehicleController";
import type { DriveInput } from "./VehicleController";

export { Vehicle } from "./Vehicle";

/** ON_FOOT → (entering) → IN_VEHICLE → (exiting) → ON_FOOT */
export type DriveMode = "on_foot" | "entering" | "driving" | "exiting";

export interface GarageUI {
  openGarage(vehicle: Vehicle): void;
}

export interface VehicleDeps {
  player: Player;
  input: InputManager;
  bus: EventBus;
  /** Colisiones estáticas del mundo + NPCs (NO incluye los coches). */
  obstacles: () => readonly Collider[];
  bounds: WorldBounds;
  ground: GroundQuery;
  notify(text: string, kind?: "info" | "success" | "warn"): void;
}

export interface VehicleSaveData {
  current: string;
  position: [number, number, number];
  yaw: number;
  playerInVehicle: boolean;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
/** Salidas candidatas (local al coche): lado conductor, pasajero, detrás, delante… */
const EXIT_CANDIDATES: Array<[number, number]> = [
  [2.1, -0.1],
  [2.1, 1.2],
  [-2.1, -0.1],
  [0, -3.3],
  [0, 3.4],
  [3.0, -0.1],
];

/**
 * Garaje y vehículos: spawn en el garaje, entrar/salir con transición,
 * conducción (VehicleController) y posición de salida segura.
 * El jugador cambia de estado (Player.inVehicle) pero su lógica no se mezcla.
 */
export class VehicleManager {
  private vehicles = new Map<string, Vehicle>();
  /** Colisiones de los coches para el jugador a pie (referencias vivas). */
  readonly colliders: Collider[] = [];
  currentId: string = garageSettings.currentVehicle;
  mode: DriveMode = "on_foot";
  /** Vehículo que conduce ahora (o en transición). */
  active: Vehicle | null = null;
  private controller = new VehicleController();
  private deps: VehicleDeps | null = null;
  private t = 0;
  private from = new THREE.Vector3();
  private exitSpot = new THREE.Vector3();
  private exitRequested = false;
  private lastImpact = 0;

  init(deps: VehicleDeps): void {
    this.deps = deps;
  }

  get inVehicle(): boolean {
    return this.mode === "driving";
  }

  /** Mientras hay vehículo activo (o transición), la escena delega en el manager. */
  get busy(): boolean {
    return this.mode !== "on_foot";
  }

  get current(): Vehicle | undefined {
    return this.vehicles.get(this.currentId);
  }

  /** Coloca el vehículo actual en la primera plaza del garaje. */
  spawnInGarage(root: THREE.Object3D, interaction: InteractionSystem, pois: POIRegistry, ui: GarageUI): Vehicle | null {
    const data = VEHICLES[this.currentId];
    const slot = GARAGE_SLOTS[0];
    if (!data || !slot) return null;
    const vehicle = new Vehicle(data, slot.x, slot.z, slot.yaw);
    this.vehicles.set(data.id, vehicle);
    root.add(vehicle.root);
    this.colliders.push(...vehicle.colliders);
    pois.add({ id: `vehicle_${data.id}`, name: data.name, category: "VEHICLE", position: vehicle.root.position });

    // [E] CONDUCIR — el punto de interacción sigue a la puerta del coche
    const doorWorld = new THREE.Vector3();
    interaction.register({
      id: `drive_${data.id}`,
      position: doorWorld,
      radius: VI.enterRadius,
      prompt: () => `CONDUCIR ${data.name}`,
      enabled: () => {
        vehicle.localPoint(vehicle.model.doorPoint, doorWorld);
        doorWorld.y = 0;
        return this.mode === "on_foot" && data.drivable;
      },
      interact: () => this.requestEnter(vehicle),
    });
    // Banco de trabajo del garaje: datos del vehículo actual (selección/mejoras: futuro)
    interaction.register({
      id: "garage_bench",
      position: new THREE.Vector3(-18.3, 0, 150),
      radius: 2,
      prompt: () => "Garaje: vehículo actual",
      enabled: () => this.mode === "on_foot",
      interact: () => ui.openGarage(vehicle),
    });
    return vehicle;
  }

  get(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  get count(): number {
    return this.vehicles.size;
  }

  /** E junto a la puerta. Devuelve false si no se puede (p. ej. bebiendo). */
  requestEnter(vehicle: Vehicle): boolean {
    const d = this.deps;
    if (!d || this.mode !== "on_foot") return false;
    if (d.player.isDrinking) {
      d.notify("Termina de beber antes de subir al coche", "warn");
      return false;
    }
    if (!d.player.onGround) return false;
    this.active = vehicle;
    this.currentId = vehicle.data.id;
    this.mode = "entering";
    this.t = 0;
    this.from.copy(d.player.root.position);
    vehicle.setDoor(true);
    return true;
  }

  /** F: salir. Si va rápido, primero frena solo. */
  requestExit(): void {
    if (this.mode === "driving") this.exitRequested = true;
  }

  /** Lógica por frame mientras hay vehículo activo (la escena llama a esto en vez de a la física a pie). */
  update(dt: number, controlsLocked: boolean): void {
    const d = this.deps;
    const v = this.active;
    if (!d || !v) return;
    const p = d.player;

    if (this.mode === "entering") {
      this.t += dt;
      const k = Math.min(1, this.t / (VI.enterDuration * 0.5));
      if (k < 1) {
        // Camina hasta la puerta y mira hacia el coche
        v.localPoint(v.model.doorPoint, tmpA);
        tmpA.y = d.ground(tmpA.x, tmpA.z);
        p.root.position.lerpVectors(this.from, tmpA, k);
        p.root.rotation.y = Math.atan2(v.position.x - tmpA.x, v.position.z - tmpA.z);
        p.updatePassive(dt, true);
      } else {
        this.seat(dt, 0);
        v.setDoor(false);
      }
      this.driveStep(v, NO_DRIVE, dt);
      if (this.t >= VI.enterDuration) {
        this.mode = "driving";
        p.inVehicle = true;
        d.bus.emit("vehicle:enter", { vehicleId: v.data.id });
      }
      return;
    }

    if (this.mode === "driving") {
      p.inVehicle = true;
      let input: DriveInput = NO_DRIVE;
      if (!controlsLocked && !this.exitRequested) {
        const axis = d.input.getMoveAxis();
        input = {
          throttle: Math.max(-1, Math.min(1, axis.y * 1.42)),
          steer: Math.max(-1, Math.min(1, axis.x * 1.42)),
          handbrake: d.input.isDown("jump"),
        };
      }
      if (this.exitRequested) input = { throttle: 0, steer: 0, handbrake: true };
      this.driveStep(v, input, dt);
      this.seat(dt, v.steer);
      if (this.exitRequested && Math.abs(v.speed) < VI.exitMaxSpeed) {
        this.exitRequested = false;
        if (this.findExitSpot(v, this.exitSpot)) {
          this.mode = "exiting";
          this.t = 0;
          v.setDoor(true);
        } else {
          d.notify("No hay sitio para bajar aquí: muévete un poco", "warn");
        }
      }
      return;
    }

    if (this.mode === "exiting") {
      this.t += dt;
      this.driveStep(v, NO_DRIVE, dt);
      if (this.t < VI.exitDuration * 0.45) {
        this.seat(dt, 0);
      } else {
        p.inVehicle = false;
        p.root.position.copy(this.exitSpot);
        p.root.rotation.y = v.yaw;
        p.updatePassive(dt, false);
        v.setDoor(false);
      }
      if (this.t >= VI.exitDuration) {
        p.teleport(this.exitSpot.x, this.exitSpot.z, v.yaw, d.ground);
        p.inVehicle = false;
        this.mode = "on_foot";
        this.active = null;
        d.bus.emit("vehicle:exit", { vehicleId: v.data.id });
      }
    }
  }

  /** Coches aparcados (sin conductor): terminan de frenar y actualizan visuales. */
  updateParked(dt: number): void {
    for (const v of this.vehicles.values()) {
      if (v === this.active) continue;
      if (Math.abs(v.speed) > 0.01 || v.velocity.lengthSq() > 1e-4) this.driveStep(v, NO_DRIVE, dt);
      else v.updateVisuals(dt);
    }
  }

  /** Impacto del último frame (para cámara, sonido y polvo). */
  consumeImpact(): number {
    const i = this.lastImpact;
    this.lastImpact = 0;
    return i;
  }

  serialize(): VehicleSaveData {
    const v = this.current;
    const p = v?.position ?? new THREE.Vector3();
    return { current: this.currentId, position: [p.x, p.y, p.z], yaw: v?.yaw ?? 0, playerInVehicle: this.mode === "driving" };
  }

  private driveStep(v: Vehicle, input: DriveInput, dt: number): void {
    const d = this.deps;
    if (!d) return;
    const impact = this.controller.update(v, input, dt, d.obstacles(), d.bounds, d.ground);
    if (impact > 5 && v === this.active) {
      this.lastImpact = Math.max(this.lastImpact, impact);
      d.bus.emit("vehicle:crash", { vehicleId: v.data.id, impact });
    }
    v.updateVisuals(dt);
  }

  private seat(dt: number, steer: number): void {
    const d = this.deps;
    const v = this.active;
    if (!d || !v) return;
    v.localPoint(v.model.seat, tmpA);
    d.player.updateSeated(dt, tmpA, v.yaw, steer);
  }

  /**
   * Posición de salida segura: libre de colisiones (con margen), dentro del
   * mapa, sobre suelo alcanzable y SIN pared entre el coche y el punto.
   */
  private findExitSpot(v: Vehicle, out: THREE.Vector3): boolean {
    const d = this.deps;
    if (!d) return false;
    const obstacles = [...d.obstacles()];
    const f = v.forward(tmpB);
    const rx = -f.z;
    const rz = f.x; // lado +X local del coche (conductor)
    for (const [lx, lz] of EXIT_CANDIDATES) {
      const x = v.position.x + rx * lx + f.x * lz;
      const z = v.position.z + rz * lx + f.z * lz;
      const B = d.bounds;
      if (x < B.minX + 0.5 || x > B.maxX - 0.5 || z < B.minZ + 0.5 || z > B.maxZ - 0.5) continue;
      const gy = d.ground(x, z, v.position.y + 0.4);
      if (!this.isFree(x, gy, z, VI.exitClearance, obstacles, v)) continue;
      // Camino libre desde el coche (no atravesar un muro fino)
      let clear = true;
      for (let s = 0.35; s < 1; s += 0.15) {
        const sx = v.position.x + (x - v.position.x) * s;
        const sz = v.position.z + (z - v.position.z) * s;
        if (!this.isFree(sx, gy, sz, 0.18, obstacles, null)) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;
      out.set(x, gy, z);
      return true;
    }
    return false;
  }

  private isFree(x: number, y: number, z: number, r: number, obstacles: readonly Collider[], car: Vehicle | null): boolean {
    for (const c of obstacles) {
      tmpC.set(x, y + 0.1, z);
      if (resolveCircleVsAABB(tmpC, r, c)) return false;
    }
    if (car) {
      for (const c of car.colliders) {
        tmpC.set(x, y + 0.1, z);
        if (resolveCircleVsAABB(tmpC, r, c)) return false;
      }
    }
    return true;
  }
}
