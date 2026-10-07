import * as THREE from "three";
import type { Player } from "../player/Player";
import { DustSystem } from "./DustSystem";
import { SpeedTrail } from "./SpeedTrail";

export interface EffectFlags {
  trails: boolean;
  dust: boolean;
}

const TRAIL_COLOR = new THREE.Color(0.37, 0.97, 0.84).multiplyScalar(2.4);
const STEP_DISTANCE = 1.35;

/**
 * Efectos visuales ligados al jugador: polvo al pisar/saltar/aterrizar y
 * estelas de luz en los pies durante el sprint. Solo lee estado del Player.
 */
export class EffectsManager {
  private dust = new DustSystem();
  /** Humo estilizado del turbo (naranja/carbón). */
  private smoke = new DustSystem(64, new THREE.MeshBasicMaterial({ color: 0x6b5a4e, transparent: true, opacity: 0.55, depthWrite: false }));
  /** Chispas de energía al terminar de beber GasOil (HDR → bloom). */
  private sparks = new DustSystem(48, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.3, 0.3) }));
  private smokeAccum = 0;
  private skidAccum = 0;
  private trailL = new SpeedTrail(TRAIL_COLOR, 0.09);
  private trailR = new SpeedTrail(TRAIL_COLOR, 0.09);
  private camera: THREE.Camera;
  private footL = new THREE.Vector3();
  private footR = new THREE.Vector3();
  private stepAccum = 0;
  private stepLeft = true;

  /** Humo de neumáticos (derrape / freno de mano), limitado por tiempo. */
  skid(dt: number, a: THREE.Vector3, b: THREE.Vector3): void {
    this.skidAccum += dt;
    if (this.skidAccum < 0.06) return;
    this.skidAccum = 0;
    this.smoke.emit(a, 1, 0.6, 0.5, 0.3);
    this.smoke.emit(b, 1, 0.6, 0.5, 0.3);
  }

  /** Polvo del choque. */
  crash(at: THREE.Vector3): void {
    this.dust.emit(at, 10, 3, 1.2, 0.3);
  }

  /** Estallido de energía (al terminar de beber GasOil). */
  energyBurst(at: THREE.Vector3): void {
    const p = at.clone();
    p.y += 1.0;
    this.sparks.emit(p, 18, 2.8, 2.2, 0.07);
  }

  constructor(root: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    this.smoke.gravity = -0.9;
    this.sparks.gravity = -1.5;
    root.add(this.dust.mesh, this.smoke.mesh, this.sparks.mesh, this.trailL.mesh, this.trailR.mesh);
  }

  update(dt: number, player: Player, flags: EffectFlags): void {
    player.model.getFeet(this.footL, this.footR);
    const speed = player.speed;

    if (flags.dust) {
      if (player.justLanded) {
        this.dust.emit(player.root.position, 12, 2.6, 0.9, 0.2);
      } else if (player.justJumped) {
        this.dust.emit(player.root.position, 6, 1.6, 0.6, 0.15);
      }
      if (player.state === "run" && speed > 4) {
        this.stepAccum += speed * dt;
        if (this.stepAccum > STEP_DISTANCE) {
          this.stepAccum = 0;
          const foot = this.stepLeft ? this.footL : this.footR;
          this.stepLeft = !this.stepLeft;
          this.dust.emit(foot, speed > 9 ? 3 : 2, 0.7, 0.5, speed > 9 ? 0.16 : 0.11);
        }
      }
    }
    this.dust.update(dt);

    // Humo del turbo: ráfagas detrás de los pies
    if (flags.dust && player.turboActive && player.onGround) {
      this.smokeAccum += dt;
      if (this.smokeAccum > 0.05) {
        this.smokeAccum = 0;
        this.smoke.emit(this.stepLeft ? this.footL : this.footR, 1, 0.4, 0.8, 0.22);
      }
    }
    if (player.justTurboStarted) this.smoke.emit(player.root.position, 8, 3.2, 0.6, 0.28);
    this.smoke.update(dt);
    this.sparks.update(dt);

    const sprinting =
      flags.trails &&
      player.turboActive &&
      speed > 3;
    const camPos = this.camera.position;
    this.trailL.update(dt, this.footL, sprinting, camPos);
    this.trailR.update(dt, this.footR, sprinting, camPos);
  }
}
