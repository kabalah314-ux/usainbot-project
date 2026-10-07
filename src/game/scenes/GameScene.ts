import type * as THREE from "three";
import type { IScene } from "../core/SceneManager";
import { gameSettings } from "../data/config";
import type { InputManager } from "../core/input/InputManager";
import type { World } from "../world/World";
import type { Player } from "../player/Player";
import type { PlayerController } from "../player/PlayerController";
import type { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import type { EffectsManager, EffectFlags } from "../effects/EffectsManager";
import type { Collider } from "../world/colliders";

/** Lo que la escena necesita del sistema de vehículos (sin acoplarse a él). */
export interface VehicleSceneHook {
  /** Hay vehículo activo (conduciendo o subiendo/bajando). */
  readonly busy: boolean;
  update(dt: number, controlsLocked: boolean): void;
  /** Datos para la cámara de conducción, o null si va a pie. */
  camera(): { target: THREE.Vector3; yaw: number; speedRatio: number } | null;
}

/**
 * Escena jugable (barrio). Fases del frame: lógica → física → cámara → efectos.
 * A pie: PlayerController + física del jugador. En coche: delega en el hook
 * de vehículos (VehicleManager), que mueve el coche y sienta al jugador.
 */
export class GameScene implements IScene {
  static readonly NAME = "game";

  readonly name = GameScene.NAME;
  readonly root: THREE.Scene;

  private world: World;
  private player: Player;
  private controller: PlayerController;
  private rig: ThirdPersonCamera;
  private input: InputManager;
  private effects: EffectsManager;
  /** Qué efectos permite la calidad gráfica actual. */
  effectFlags: EffectFlags = { trails: true, dust: true };
  /** Bloquea el control (diálogos, cuenta atrás…). El mundo sigue vivo. */
  controlsLocked = false;
  /** Colisiones del jugador: estáticas del mundo + dinámicas (NPCs, coches). */
  playerColliders: readonly Collider[] = [];
  vehicle: VehicleSceneHook | null = null;
  private static readonly NO_INPUT = { x: 0, y: 0 };

  constructor(
    root: THREE.Scene,
    world: World,
    player: Player,
    controller: PlayerController,
    rig: ThirdPersonCamera,
    input: InputManager,
    effects: EffectsManager
  ) {
    this.root = root;
    this.world = world;
    this.player = player;
    this.controller = controller;
    this.rig = rig;
    this.input = input;
    this.effects = effects;
    this.playerColliders = world.getColliders();
  }

  enter(): void {
    this.rig.reset(this.player.yaw);
    this.updateCamera(0.016, false);
  }

  exit(): void {
    // Reservado: limpiar estado al cambiar de zona.
  }

  update(dt: number): void {
    // 1. LÓGICA + 2. FÍSICA
    this.world.update(dt, this.player.root.position);
    if (this.vehicle?.busy) {
      this.vehicle.update(dt, this.controlsLocked);
    } else {
      if (this.controlsLocked) {
        this.player.setMoveInput(0, 0);
        this.player.setTurboHeld(false);
        this.player.setJumpHeld(false);
      } else {
        this.controller.update();
      }
      this.player.update(dt, this.playerColliders, this.world.bounds, this.world.groundAt);
    }

    // 3. CÁMARA
    this.updateCamera(dt, !this.controlsLocked);

    // 4. EFECTOS
    this.effects.update(dt, this.player, this.effectFlags);
  }

  private updateCamera(dt: number, useInput: boolean): void {
    const p = this.player;
    const car = this.vehicle?.camera() ?? null;
    this.rig.update(dt, {
      target: car ? car.target : p.root.position,
      playerYaw: car ? car.yaw : p.yaw,
      speedRatio: car ? car.speedRatio : p.speedRatio,
      look: useInput ? this.input.getLookAxis() : GameScene.NO_INPUT,
      pointer: useInput && gameSettings.camera.mouseLook ? this.input.getPointerDelta() : GameScene.NO_INPUT,
      recenter: useInput && this.input.wasPressed("cameraReset"),
      sprinting: !car && p.turboActive && p.state === "run" && p.speedRatio > 0.9,
      colliders: this.world.getColliders(),
      turbo: !car && p.turboActive ? 1 : 0,
      closeUp: !car && p.isDrinking ? 1 : 0,
      mode: car ? "vehicle" : "foot",
    });
  }
}
