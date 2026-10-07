import * as THREE from "three";
import type { Collider, WorldBounds } from "../world/colliders";
import type { GroundQuery } from "../world/GroundMap";
import type { InteractionSystem } from "../interaction/InteractionSystem";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { InputManager } from "../core/input/InputManager";
import type { EventBus } from "../core/EventBus";
import type { Player } from "../player/Player";
import { resolveCircleVsAABB } from "../utils/physics";
import { dampAngle } from "../utils/math";
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
  /** Colisiones del mundo + NPCs + tráfico (NO incluye los coches del jugador). */
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
const tmpL = new THREE.Vector3();

/**
 * Puntos de entrada/salida alrededor del coche (x, z locales; +x = conductor).
 * Orden = preferencia para SALIR; para ENTRAR se elige el más cercano al jugador.
 */
const SIDE_SPOTS: Array<[number, number]> = [
  [2.0, -0.1], // puerta del conductor
  [-2.0, -0.1], // lado del pasajero
  [1.95, 1.45], // conductor, delante
  [1.95, -1.65], // conductor, detrás
  [-1.95, 1.45], // pasajero, delante
  [-1.95, -1.65], // pasajero, detrás
  [0, -3.3], // maletero
  [0, 3.4], // morro
];
/** Anillos de búsqueda si ninguna posición preferida está libre. */
const RING_RADII = [2.7, 3.5, 4.5, 5.8];
const RING_STEPS = 12;

/**
 * Garaje y vehículos: spawn, ENTRAR desde cualquier lado (E), conducción
 * (VehicleController), SALIR con E y posición de salida segura.
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
  private entrySpot = new THREE.Vector3();
  private entryLocal = new THREE.Vector3();
  private approach = 0;
  private hopHeight = 1.2;
  private startYaw = 0;
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
    this.register(vehicle);
    root.add(vehicle.root);
    pois.add({ id: `vehicle_${data.id}`, name: data.name, category: "VEHICLE", position: vehicle.root.position });
    this.registerInteraction(vehicle, interaction);
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

  /** Lista de vehículos interactuables (el tráfico NO se registra aquí). */
  register(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.data.id, vehicle);
    this.colliders.push(...vehicle.colliders);
  }

  /**
   * [E] ENTRAR desde cualquier lado: la distancia se mide hasta la huella del
   * coche (rectángulo orientado), no hasta la puerta. Con varios coches, el
   * InteractionSystem elige el más cercano (un único objetivo).
   */
  private registerInteraction(vehicle: Vehicle, interaction: InteractionSystem): void {
    const data = vehicle.data;
    interaction.register({
      id: `drive_${data.id}`,
      position: vehicle.root.position,
      radius: VI.interactionDistance,
      cullRadius: VI.footprintHalfLength + VI.interactionDistance + 0.5,
      priority: -0.3,
      prompt: () => `ENTRAR · ${data.name}`,
      worldLabel: () => "ENTRAR",
      anchor: vehicle.root.position,
      anchorHeight: 2.1,
      enabled: () => this.mode === "on_foot" && data.drivable,
      distanceTo: (p) => this.distanceToBody(vehicle, p),
      interact: () => this.requestEnter(vehicle),
    });
  }

  /** Distancia en planta desde `p` hasta la carrocería (0 si está encima). */
  distanceToBody(v: Vehicle, p: THREE.Vector3): number {
    const f = v.forward(tmpL);
    const dx = p.x - v.position.x;
    const dz = p.z - v.position.z;
    const along = dx * f.x + dz * f.z;
    const side = dx * -f.z + dz * f.x;
    const ox = Math.max(0, Math.abs(side) - VI.footprintHalfWidth);
    const oz = Math.max(0, Math.abs(along) - VI.footprintHalfLength);
    return Math.hypot(ox, oz);
  }

  get(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  get count(): number {
    return this.vehicles.size;
  }

  /**
   * E cerca del coche. Busca el punto de entrada libre más cercano al jugador
   * (lateral, diagonal, morro o maletero), corre hasta él y salta al asiento.
   */
  requestEnter(vehicle: Vehicle): boolean {
    const d = this.deps;
    if (!d || this.mode !== "on_foot") return false;
    const p = d.player;
    if (p.isDrinking) {
      d.notify("Termina de beber antes de subir al coche", "warn");
      return false;
    }
    if (!p.onGround || p.inVehicle) return false;
    const obstacles = d.obstacles();
    const pos = p.root.position;
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const [lx, lz] of SIDE_SPOTS) {
      this.toWorld(vehicle, lx, lz, tmpA);
      const gy = d.ground(tmpA.x, tmpA.z, vehicle.position.y + 0.4);
      if (!this.isFree(tmpA.x, gy, tmpA.z, 0.3, obstacles, true)) continue;
      const dist = Math.hypot(tmpA.x - pos.x, tmpA.z - pos.z);
      if (dist < bestD) {
        bestD = dist;
        best = [lx, lz];
      }
    }
    // Sin hueco ideal (coche encajado): entra desde donde está el jugador
    if (best) {
      this.entryLocal.set(best[0], 0, best[1]);
    } else {
      const f = vehicle.forward(tmpL);
      const dx = pos.x - vehicle.position.x;
      const dz = pos.z - vehicle.position.z;
      this.entryLocal.set(dx * -f.z + dz * f.x, 0, dx * f.x + dz * f.z);
    }
    this.toWorld(vehicle, this.entryLocal.x, this.entryLocal.z, this.entrySpot);
    this.entrySpot.y = d.ground(this.entrySpot.x, this.entrySpot.z, vehicle.position.y + 0.4);
    this.approach = Math.min(VI.approachMaxDuration, Math.max(0.05, pos.distanceTo(this.entrySpot) / 6));
    // Salto más alto desde morro/maletero (pasa por encima del capó o del alerón)
    this.hopHeight = 1.15 + 0.3 * Math.abs(this.entryLocal.z);
    this.active = vehicle;
    this.currentId = vehicle.data.id;
    this.mode = "entering";
    this.t = 0;
    this.from.copy(pos);
    this.startYaw = p.yaw;
    if (this.entryLocal.x > 1) vehicle.setDoor(true);
    return true;
  }

  /** E (o mando) dentro del coche: salir. Si va rápido, primero frena solo. */
  requestExit(): void {
    if (this.mode === "driving") this.exitRequested = true;
  }

  /** Coloca el coche activo (salida de carreras en vehículo). */
  placeActive(x: number, z: number, yaw: number): void {
    const v = this.active;
    const d = this.deps;
    if (!v || !d) return;
    v.position.set(x, d.ground(x, z, 1), z);
    v.yaw = yaw;
    v.velocity.set(0, 0);
    v.speed = 0;
    v.updateVisuals(0);
  }

  /** Lógica por frame mientras hay vehículo activo (la escena llama a esto en vez de a la física a pie). */
  update(dt: number, controlsLocked: boolean): void {
    const d = this.deps;
    const v = this.active;
    if (!d || !v) return;
    const p = d.player;

    if (this.mode === "entering") {
      this.t += dt;
      this.driveStep(v, NO_DRIVE, dt);
      // El punto de entrada se mueve con el coche (si aún rodaba)
      this.toWorld(v, this.entryLocal.x, this.entryLocal.z, this.entrySpot);
      if (this.t < this.approach) {
        // 1) Carrera corta hasta el punto de entrada mirando al coche
        const k = this.t / this.approach;
        p.root.position.lerpVectors(this.from, this.entrySpot, k);
        p.root.position.y = d.ground(p.root.position.x, p.root.position.z, v.position.y + 0.4);
        const faceCar = Math.atan2(v.position.x - p.root.position.x, v.position.z - p.root.position.z);
        p.root.rotation.y = dampAngle(p.root.rotation.y, faceCar, 14, dt);
        this.startYaw = p.root.rotation.y;
        p.updatePassive(dt, "run");
      } else {
        // 2) Salto por encima de la carrocería hasta el asiento (descapotable)
        const k = Math.min(1, (this.t - this.approach) / VI.hopDuration);
        v.localPoint(v.model.seat, tmpB);
        const e = k * k * (3 - 2 * k);
        p.root.position.lerpVectors(this.entrySpot, tmpB, e);
        p.root.position.y += 4 * this.hopHeight * k * (1 - k);
        p.root.rotation.y = this.startYaw + angleDiff(this.startYaw, v.yaw) * e;
        p.updatePassive(dt, "air", k < 0.5 ? 3 : -3);
        if (k > 0.6) v.setDoor(false);
        if (k >= 1) {
          this.mode = "driving";
          p.inVehicle = true;
          this.seat(dt, 0);
          d.bus.emit("vehicle:enter", { vehicleId: v.data.id });
        }
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
          v.localPoint(v.model.seat, this.from);
          this.startYaw = v.yaw;
          const f = v.forward(tmpL);
          const dx = this.exitSpot.x - v.position.x;
          const dz = this.exitSpot.z - v.position.z;
          const localX = dx * -f.z + dz * f.x;
          const localZ = dx * f.x + dz * f.z;
          this.hopHeight = 1.1 + 0.3 * Math.min(3, Math.abs(localZ));
          if (localX > 1 && Math.abs(localZ) < 1.2) v.setDoor(true);
        } else {
          d.notify("No hay sitio para bajar aquí: muévete un poco", "warn");
        }
      }
      return;
    }

    if (this.mode === "exiting") {
      this.t += dt;
      this.driveStep(v, NO_DRIVE, dt);
      const k = Math.min(1, this.t / VI.exitDuration);
      const e = k * k * (3 - 2 * k);
      p.inVehicle = false;
      p.root.position.lerpVectors(this.from, this.exitSpot, e);
      p.root.position.y += 4 * this.hopHeight * k * (1 - k);
      p.root.rotation.y = this.startYaw;
      p.updatePassive(dt, "air", k < 0.5 ? 3 : -3);
      if (k > 0.7) v.setDoor(false);
      if (k >= 1) {
        p.teleport(this.exitSpot.x, this.exitSpot.z, v.yaw, d.ground);
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

  private toWorld(v: Vehicle, lx: number, lz: number, out: THREE.Vector3): THREE.Vector3 {
    const f = v.forward(tmpL);
    return out.set(v.position.x - f.z * lx + f.x * lz, v.position.y, v.position.z + f.x * lx + f.z * lz);
  }

  /**
   * Posición de salida segura: primero las preferidas (laterales, diagonales,
   * maletero, morro) y, si ninguna vale, anillos alrededor del coche.
   * Cada candidata debe estar: dentro del mapa, sobre suelo alcanzable (no
   * encima del coche ni de otro objeto), libre de paredes/coches/NPCs con
   * margen y sin muro entre el coche y el punto.
   */
  private findExitSpot(v: Vehicle, out: THREE.Vector3): boolean {
    const d = this.deps;
    if (!d) return false;
    const obstacles = d.obstacles();
    const candidates: Array<[number, number]> = [...SIDE_SPOTS];
    for (const r of RING_RADII) {
      for (let i = 0; i < RING_STEPS; i++) {
        const a = (i / RING_STEPS) * Math.PI * 2;
        candidates.push([Math.sin(a) * r * 0.75, Math.cos(a) * r]);
      }
    }
    for (const [lx, lz] of candidates) {
      this.toWorld(v, lx, lz, tmpA);
      const { x, z } = tmpA;
      const B = d.bounds;
      if (x < B.minX + 0.5 || x > B.maxX - 0.5 || z < B.minZ + 0.5 || z > B.maxZ - 0.5) continue;
      const gy = d.ground(x, z, v.position.y + 0.4);
      if (gy > v.position.y + 0.4) continue;
      if (!this.isFree(x, gy, z, VI.exitClearance, obstacles, true)) continue;
      // Camino libre desde el coche (no "atravesar" un muro fino)
      let clear = true;
      for (let s = 0.35; s < 1; s += 0.15) {
        const sx = v.position.x + (x - v.position.x) * s;
        const sz = v.position.z + (z - v.position.z) * s;
        if (!this.isFree(sx, gy, sz, 0.18, obstacles, false)) {
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

  /** ¿Cabe el jugador aquí? `withCars` = comprobar también los coches del jugador. */
  private isFree(x: number, y: number, z: number, r: number, obstacles: readonly Collider[], withCars: boolean): boolean {
    for (const c of obstacles) {
      if (c.max.y < 0.25) continue; // bordillos y alfombras
      tmpC.set(x, y + 0.1, z);
      if (resolveCircleVsAABB(tmpC, r, c)) return false;
    }
    if (!withCars) return true;
    for (const c of this.colliders) {
      tmpC.set(x, y + 0.1, z);
      if (resolveCircleVsAABB(tmpC, r, c)) return false;
    }
    return true;
  }
}

function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}
