import * as THREE from "three";
import { gameSettings } from "../data/config";
import { turboSettings } from "../data/items";
import { clamp, dampAngle } from "../utils/math";
import { resolveCircleVsAABB } from "../utils/physics";
import type { Collider, WorldBounds } from "../world/colliders";
import type { GroundQuery } from "../world/GroundMap";
import { PlayerModel } from "./PlayerModel";
import { PlayerStats } from "./PlayerStats";

/** "drinking" = DRINKING_GASOIL · "vehicle" = IN_VEHICLE (estado de animación). */
export type PlayerState = "idle" | "run" | "air" | "drinking" | "vehicle";

/** Estado de juego del jugador (lo que se permite hacer depende de él). */
export type PlayerStatus = "IDLE" | "MOVING" | "JUMPING" | "TURBO" | "DRINKING_GASOIL" | "IN_VEHICLE";

/** Altura máxima que se sube andando (escalones, bordillos, alfombras). */
const STEP_UP = 0.35;
/** Bajada máxima que se "pega" al suelo sin pasar a caer (bajar escalones). */
const SNAP_DOWN = 0.12;
const FLAT_GROUND: GroundQuery = () => 0;

interface DrinkAction {
  elapsed: number;
  duration: number;
  applyAt: number;
  applied: boolean;
  onApply: () => void;
  onEnd: () => void;
}

/**
 * Jugador: cuerpo, estadísticas y física cinemática arcade
 * (doble salto, coyote time, buffer de salto, salto de altura variable),
 * TURBO con reserva y el estado DRINKING_GASOIL.
 * No lee la entrada (PlayerController) ni conoce el modelo concreto (PlayerModel).
 */
export class Player {
  readonly root = new THREE.Group();
  readonly stats: PlayerStats;
  readonly model: PlayerModel;
  readonly velocity = new THREE.Vector3();
  state: PlayerState = "idle";
  onGround = true;
  /** true mientras el turbo está realmente activo (SHIFT + reserva + movimiento). */
  turboActive = false;
  /** Eventos del último frame (los leen efectos, audio, misiones…). */
  justLanded = false;
  justJumped = false;
  justTurboStarted = false;
  /** Altura del suelo bajo el jugador (según el GroundMap). */
  groundHeight = 0;
  /** IN_VEHICLE: lo gestiona VehicleManager (sin física a pie, sin saltar, beber ni turbo). */
  inVehicle = false;

  private moveDir = new THREE.Vector2();
  private targetVel = new THREE.Vector3();
  private jumpQueued = false;
  private jumpHeld = false;
  private turboHeld = false;
  private jumpsUsed = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private drink: DrinkAction | null = null;

  constructor() {
    this.stats = new PlayerStats(gameSettings.player);
    this.model = new PlayerModel();
    this.root.add(this.model.group);
  }

  /** Dirección deseada en mundo; la magnitud (0..1) dosifica la velocidad. */
  setMoveInput(x: number, z: number): void {
    this.moveDir.set(x, z);
  }

  /** SHIFT mantenido. El turbo solo se activa si hay reserva. */
  setTurboHeld(held: boolean): void {
    this.turboHeld = held;
  }

  /** Compatibilidad: antes SHIFT era sprint libre. */
  setSprinting(on: boolean): void {
    this.setTurboHeld(on);
  }

  get sprinting(): boolean {
    return this.turboActive;
  }

  queueJump(): void {
    if (!this.drink && !this.inVehicle) this.jumpQueued = true;
  }

  /** Estado de juego actual (IDLE, MOVING, JUMPING, TURBO, DRINKING_GASOIL, IN_VEHICLE). */
  get status(): PlayerStatus {
    if (this.inVehicle) return "IN_VEHICLE";
    if (this.drink) return "DRINKING_GASOIL";
    if (!this.onGround) return "JUMPING";
    if (this.turboActive) return "TURBO";
    return this.speed > 0.5 ? "MOVING" : "IDLE";
  }

  /**
   * Sentado al volante: la raíz sigue al asiento del vehículo y el modelo
   * usa la pose de conducción (manos al volante, gira la cabeza en las curvas).
   */
  updateSeated(dt: number, seat: THREE.Vector3, yaw: number, steer: number): void {
    this.root.position.copy(seat);
    this.root.rotation.y = yaw;
    this.velocity.set(0, 0, 0);
    this.turboActive = false;
    this.justTurboStarted = false;
    this.justLanded = false;
    this.justJumped = false;
    this.state = "vehicle";
    this.model.update(dt, { state: "vehicle", speedRatio: 0, sprinting: false, verticalVelocity: 0, doubleJumped: false, landed: false, drinkT: -1, steer });
  }

  /** Solo anima (transiciones de entrar/salir): sin física ni entrada. */
  updatePassive(dt: number, moving: boolean): void {
    this.velocity.set(0, 0, 0);
    this.turboActive = false;
    this.state = moving ? "run" : "idle";
    this.model.update(dt, { state: this.state, speedRatio: moving ? 0.25 : 0, sprinting: false, verticalVelocity: 0, doubleJumped: false, landed: false, drinkT: -1 });
  }

  setJumpHeld(held: boolean): void {
    this.jumpHeld = held;
  }

  /** ¿Puede arrancar el turbo ahora mismo? */
  get canTurbo(): boolean {
    return !this.drink && !this.inVehicle && this.stats.turbo >= turboSettings.minToActivate;
  }

  // ---------------- DRINKING_GASOIL ----------------

  get isDrinking(): boolean {
    return this.drink !== null;
  }

  /** 0..1 de la animación de beber, o -1 si no está bebiendo. */
  get drinkProgress(): number {
    return this.drink ? Math.min(1, this.drink.elapsed / this.drink.duration) : -1;
  }

  /**
   * Empieza a beber. `onApply` se ejecuta una sola vez en `applyAt` (0..1):
   * ahí se gasta la lata y sube el turbo. Devuelve false si no es posible.
   */
  startDrinking(duration: number, applyAt: number, onApply: () => void, onEnd: () => void = () => undefined): boolean {
    if (this.drink || !this.onGround || this.inVehicle) return false;
    this.drink = { elapsed: 0, duration, applyAt, applied: false, onApply, onEnd };
    this.jumpQueued = false;
    this.turboActive = false;
    return true;
  }

  /** Coloca al jugador (inicio de partida, carreras, cargar partida). */
  teleport(x: number, z: number, yaw: number, ground: GroundQuery = FLAT_GROUND): void {
    this.groundHeight = ground(x, z, Infinity);
    this.root.position.set(x, this.groundHeight, z);
    this.root.rotation.y = yaw;
    this.velocity.set(0, 0, 0);
    this.onGround = true;
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** 0..1 respecto a la velocidad de carrera normal (la usa la cámara). */
  get speedRatio(): number {
    return Math.min(1, this.speed / this.stats.values.maxSpeed);
  }

  get yaw(): number {
    return this.root.rotation.y;
  }

  /** Fase de física: turbo, velocidad, saltos, gravedad, colisiones, suelo y animación. */
  update(dt: number, colliders: readonly Collider[], bounds: WorldBounds, ground: GroundQuery = FLAT_GROUND): void {
    const s = this.stats.values;
    const wasGrounded = this.onGround;
    const wasTurbo = this.turboActive;
    let doubleJumped = false;
    const vyBefore = this.velocity.y;
    const drinking = this.drink !== null;

    // --- Turbo: SHIFT + reserva + intención de moverse
    const mag = drinking ? 0 : Math.min(1, this.moveDir.length());
    const wantsTurbo = this.turboHeld && !drinking && mag > 0.1;
    if (wantsTurbo && (this.turboActive ? this.stats.turbo > 0 : this.canTurbo)) {
      this.turboActive = true;
      // Derrape (dirección deseada ≠ dirección de la velocidad) quema más turbo
      const sp = this.speed;
      const ml = this.moveDir.length();
      const aligned = sp > 1 && ml > 0 ? (this.velocity.x * this.moveDir.x + this.velocity.z * this.moveDir.y) / (sp * ml) : 1;
      const drain = turboSettings.drainPerSecond * (aligned < 0.9 ? turboSettings.skidDrainMultiplier : 1);
      this.stats.turbo = Math.max(0, this.stats.turbo - drain * dt);
      if (this.stats.turbo <= 0) this.turboActive = false;
    } else {
      this.turboActive = false;
    }
    this.justTurboStarted = this.turboActive && !wasTurbo;

    // --- Movimiento horizontal
    const maxSpeed = s.maxSpeed * (this.turboActive ? s.sprintMultiplier : 1);
    if (mag > 0.01) {
      const k = (maxSpeed * mag) / this.moveDir.length();
      this.targetVel.set(this.moveDir.x * k, 0, this.moveDir.y * k);
    } else {
      this.targetVel.set(0, 0, 0);
    }
    if (this.justTurboStarted && this.onGround) {
      // Arranque del turbo: empujón en la dirección de carrera
      const k = turboSettings.launchKick / Math.max(0.001, this.moveDir.length());
      this.velocity.x += this.moveDir.x * k;
      this.velocity.z += this.moveDir.y * k;
    }
    // Con turbo se pierde agarre: acelera recto, pero cuesta cambiar de dirección.
    let accel = this.onGround ? s.acceleration : s.airControl;
    if (this.turboActive && this.onGround) {
      const speedNow = this.speed;
      const aligned =
        speedNow > 0.5 ? (this.velocity.x * this.targetVel.x + this.velocity.z * this.targetVel.z) / (speedNow * maxSpeed) : 1;
      accel *= aligned > 0.9 ? 1 : turboSettings.gripMultiplier;
    }
    const blend = 1 - Math.exp(-accel * dt);
    this.velocity.x += (this.targetVel.x - this.velocity.x) * blend;
    this.velocity.z += (this.targetVel.z - this.velocity.z) * blend;

    // --- Saltos
    const fresh = this.jumpQueued;
    this.jumpQueued = false;
    this.jumpBufferTimer = fresh ? s.jumpBuffer : this.jumpBufferTimer - dt;
    if (this.onGround) {
      this.coyoteTimer = s.coyoteTime;
      this.jumpsUsed = 0;
    } else {
      this.coyoteTimer -= dt;
    }
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && this.jumpsUsed === 0) {
      this.velocity.y = s.jumpForce;
      this.jumpsUsed = 1;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.onGround = false;
    } else if (fresh && !this.onGround) {
      if (this.jumpsUsed === 0) this.jumpsUsed = 1; // cayó de un borde
      if (this.jumpsUsed < s.maxJumps) {
        this.velocity.y = s.doubleJumpForce;
        this.jumpsUsed++;
        this.jumpBufferTimer = 0;
        doubleJumped = true;
      }
    }

    // --- Gravedad: caída más rápida y salto corto al soltar SPACE
    let gravity = s.gravity;
    if (this.velocity.y < 0) gravity *= s.fallGravityMultiplier;
    else if (!this.jumpHeld && this.velocity.y > 0) gravity *= s.jumpCutMultiplier;
    this.velocity.y -= gravity * dt;

    // --- Horizontal por subpasos (≤ 0,25 m) + colisiones: no se atraviesan
    // tabiques finos ni a velocidad de turbo ni con pocos FPS.
    const pos = this.root.position;
    const travel = this.speed * dt;
    const steps = Math.min(10, Math.max(1, Math.ceil(travel / 0.25)));
    const sx = (this.velocity.x * dt) / steps;
    const sz = (this.velocity.z * dt) / steps;
    for (let i = 0; i < steps; i++) {
      pos.x += sx;
      pos.z += sz;
      for (const c of colliders) resolveCircleVsAABB(pos, s.radius, c);
    }
    pos.x = clamp(pos.x, bounds.minX, bounds.maxX);
    pos.z = clamp(pos.z, bounds.minZ, bounds.maxZ);

    // --- Vertical contra el SUELO REAL (GroundMap), no contra y = 0
    pos.y += this.velocity.y * dt;
    const floor = ground(pos.x, pos.z, Math.max(pos.y, this.groundHeight) + STEP_UP);
    this.groundHeight = floor;
    if (pos.y <= floor) {
      pos.y = floor; // aterriza o sube un escalón
      this.velocity.y = 0;
      this.onGround = true;
    } else if (wasGrounded && this.velocity.y <= 0 && pos.y - floor <= SNAP_DOWN) {
      pos.y = floor; // baja un escalón pegado al suelo
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    const landed = !wasGrounded && this.onGround;
    this.justLanded = landed;
    this.justJumped = this.velocity.y > 0 && this.velocity.y > vyBefore + 1;

    // --- Orientación hacia la dirección de movimiento (menos giro con turbo)
    if (mag > 0.1) {
      const targetYaw = Math.atan2(this.moveDir.x, this.moveDir.y);
      const turn = s.turnSpeed * (this.turboActive ? turboSettings.turnSpeedMultiplier * 2 : 1);
      this.root.rotation.y = dampAngle(this.root.rotation.y, targetYaw, turn, dt);
    } else if (drinking && this.speed > 0.5) {
      this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(this.velocity.x, this.velocity.z), 6, dt);
    }

    // --- DRINKING_GASOIL: temporizador con prioridad sobre todo lo demás
    if (this.drink) {
      const d = this.drink;
      d.elapsed += dt;
      if (!d.applied && d.elapsed >= d.duration * d.applyAt) {
        d.applied = true;
        d.onApply();
      }
      if (d.elapsed >= d.duration) {
        this.drink = null;
        d.onEnd();
      }
    }

    // --- Estado + animación
    const hSpeed = this.speed;
    this.state = this.drink ? "drinking" : !this.onGround ? "air" : hSpeed > 0.5 ? "run" : "idle";
    this.model.update(dt, {
      state: this.state,
      speedRatio: Math.min(1, hSpeed / (s.maxSpeed * s.sprintMultiplier)),
      sprinting: this.turboActive,
      verticalVelocity: this.velocity.y,
      doubleJumped,
      landed,
      drinkT: this.drinkProgress,
    });
  }

  /** Snapshot para el futuro sistema de guardado. */
  serialize(): { position: [number, number, number]; stats: Record<string, number> } {
    const p = this.root.position;
    return { position: [p.x, p.y, p.z], stats: this.stats.serialize() };
  }

  restore(data: { position: [number, number, number]; stats: Record<string, number> }): void {
    this.root.position.set(data.position[0], data.position[1], data.position[2]);
    this.velocity.set(0, 0, 0);
    this.stats.restore(data.stats);
  }
}
