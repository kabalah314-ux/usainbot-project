import * as THREE from "three";
import type { InputManager } from "../core/input/InputManager";
import type { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import type { Player } from "./Player";

/**
 * Traduce la entrada (acciones/ejes de mando) en intenciones del jugador.
 * Movimiento relativo a la cámara, como en los juegos de PS2:
 * "arriba" en el stick = alejarse de la cámara.
 */
export class PlayerController {
  private player: Player;
  private input: InputManager;
  private rig: ThirdPersonCamera;
  private onInteract: ((message: string) => void) | null;
  private tmpFwd = new THREE.Vector3();

  constructor(
    player: Player,
    input: InputManager,
    rig: ThirdPersonCamera,
    onInteract?: (message: string) => void
  ) {
    this.player = player;
    this.input = input;
    this.rig = rig;
    this.onInteract = onInteract ?? null;
  }

  /** Fase de lógica: leer input y emitir intenciones. */
  update(): void {
    const axis = this.input.getMoveAxis();
    const fwd = this.rig.getForward(this.tmpFwd);
    // derecha de la cámara = (-fwd.z, fwd.x); se conserva la magnitud del stick
    const dx = fwd.x * axis.y - fwd.z * axis.x;
    const dz = fwd.z * axis.y + fwd.x * axis.x;
    this.player.setMoveInput(dx, dz);

    const p = this.player;
    p.setTurboHeld(this.input.isDown("turbo"));
    p.setJumpHeld(this.input.isDown("jump"));
    if (this.input.wasPressed("jump")) p.queueJump();
    // SHIFT sin reserva: aviso "NO TURBO" (no se activa nada)
    if (this.input.wasPressed("turbo") && !p.isDrinking && !p.canTurbo) this.onInteract?.("turbo_empty");

    // Mientras bebe (DRINKING_GASOIL) no se inician otras interacciones
    if (p.isDrinking) return;
    if (this.input.wasPressed("interact")) this.onInteract?.("interact");
    if (this.input.wasPressed("drink")) this.onInteract?.("drink");
  }
}
