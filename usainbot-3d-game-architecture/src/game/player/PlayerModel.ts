import * as THREE from "three";
import { createCanMesh } from "../gasoil/canMesh";
import { createUsainBotMaterials } from "./model/materials";
import { PROPORTIONS, buildUsainBotRig } from "./model/UsainBotRig";
import type { UsainBotRig } from "./model/UsainBotRig";
import { HEAD } from "./model/headGeometry";
import { UsainBotAnimator } from "./model/UsainBotAnimator";
import type { AnimInput } from "./model/UsainBotAnimator";

/**
 * Fachada visual del jugador. Player solo conoce `group`, `update`
 * y los puntos de anclaje. Hoy: UsainBot procedural (SkinnedMesh +
 * animación procedural). Mañana: GLB + AnimationMixer, misma interfaz.
 */
export class PlayerModel {
  readonly group: THREE.Group;
  private rig: UsainBotRig;
  private animator: UsainBotAnimator;
  private glow: THREE.MeshBasicMaterial;
  private glowBase: THREE.Color;
  private flash = 0;
  private time = 0;

  constructor() {
    const materials = createUsainBotMaterials();
    this.rig = buildUsainBotRig(materials);
    this.group = this.rig.group;
    // La lata de GasOil va en el torso; el animador la coloca en la mano.
    const can = createCanMesh();
    this.rig.torso.add(can);
    this.animator = new UsainBotAnimator(this.rig, can);
    this.glow = materials.glow as THREE.MeshBasicMaterial;
    this.glowBase = this.glow.color.clone();
  }

  /** Eventos de la animación de beber (sonido, partículas). */
  set onDrinkMoment(cb: ((moment: "open" | "gulp" | "ahh" | "crush") => void) | null) {
    this.animator.onDrinkMoment = cb;
  }

  /** Destello de energía en las luces del traje (al terminar de beber). */
  energyFlash(): void {
    this.flash = 1;
  }

  update(dt: number, input: AnimInput): void {
    this.time += dt;
    this.animator.update(dt, input);
    // Luces del traje: pulso con turbo, destello tras beber
    this.flash = Math.max(0, this.flash - dt * 1.5);
    const turbo = input.sprinting ? 0.6 + Math.sin(this.time * 30) * 0.25 : 0;
    const k = 1 + turbo + this.flash * 2.2;
    this.glow.color.copy(this.glowBase).multiplyScalar(k);
  }

  /** Segundos seguidos en reposo (para bocadillos, poses, etc.). */
  get idleSeconds(): number {
    return this.animator.idleSeconds;
  }

  /** Posición de mundo de ambos tobillos (estelas, polvo, huellas…). */
  getFeet(outL: THREE.Vector3, outR: THREE.Vector3): void {
    this.rig.footL.getWorldPosition(outL);
    this.rig.footR.getWorldPosition(outR);
  }

  /** Punto de mundo sobre la coronilla (anclaje de bocadillos). */
  getHeadTop(out: THREE.Vector3): THREE.Vector3 {
    this.rig.head.getWorldPosition(out);
    out.y += PROPORTIONS.headCenter + HEAD.hh;
    return out;
  }
}
