import * as THREE from "three";
import { clamp, damp, lerp } from "../../utils/math";
import type { PlayerState } from "../Player";
import { PROPORTIONS } from "./UsainBotRig";
import type { UsainBotRig } from "./UsainBotRig";

/** Lo que el animador necesita saber del jugador en cada frame. */
export interface AnimInput {
  state: PlayerState;
  /** 0..1 respecto a la velocidad máxima de sprint. */
  speedRatio: number;
  sprinting: boolean;
  verticalVelocity: number;
  /** Eventos de este frame. */
  doubleJumped: boolean;
  landed: boolean;
  /** 0..1 de la animación DRINKING_GASOIL, -1 si no está bebiendo. */
  drinkT: number;
  /** IN_VEHICLE: dirección del volante (-1..1). */
  steer?: number;
}

/** Fotograma clave de la mano: [t, x, y, z] en espacio del torso. */
type HandKey = readonly [number, number, number, number];

/**
 * Coreografía de "beber GasOil como un refresco" (mano derecha, espacio torso).
 * MOUTH en y/z se sustituye en tiempo real por la posición real de la boca.
 */
const MOUTH = 99;
const DRINK_KEYS: HandKey[] = [
  [0.0, -0.28, 0.0, 0.08],
  [0.13, -0.3, 0.06, -0.14], // la saca del "bolsillo" trasero
  [0.3, -0.13, 0.28, 0.36], // la mira con orgullo
  [0.4, -0.05, MOUTH, MOUTH], // a la boca
  [0.7, -0.05, MOUTH, MOUTH], // glup, glup, glup
  [0.8, -0.15, 0.25, 0.34], // "¡AHHH!"
  [0.88, -0.1, 0.3, 0.3], // la aplasta
  [1.0, -0.28, 0.0, 0.08],
];
/** Inclinación de la lata (rad, eje X del torso) en cada tramo. */
const CAN_TILT_KEYS: Array<readonly [number, number]> = [
  [0.0, 0],
  [0.3, -0.25],
  [0.42, -1.75],
  [0.7, -2.05],
  [0.8, -0.35],
  [1.0, 0],
];

const smooth = (x: number): number => x * x * (3 - 2 * x);

function sampleKeys<T extends readonly number[]>(keys: readonly T[], t: number): number[] {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b[0]) {
      const k = smooth((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
    }
  }
  return keys[keys.length - 1].slice(1);
}

const tmpS = new THREE.Vector3();
const tmpT = new THREE.Vector3();
const tmpE = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpX = new THREE.Vector3();
const tmpY = new THREE.Vector3();
const tmpZ = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpEuler = new THREE.Euler();
const tmpQ = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const HAND_LENGTH = 0.32;

/**
 * IK analítica de 2 huesos (hombro → codo → mano) en espacio del torso.
 * Devuelve la rotación del hombro (Euler XYZ) y el ángulo del codo (eje X).
 */
function solveArmIK(
  shoulder: THREE.Vector3,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  upper: number,
  lower: number,
  out: Euler3
): number {
  tmpD.subVectors(target, shoulder);
  const dist = clamp(tmpD.length(), Math.abs(upper - lower) + 0.01, upper + lower - 0.005);
  tmpD.normalize();
  const a = (upper * upper - lower * lower + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  tmpP.copy(pole).addScaledVector(tmpD, -pole.dot(tmpD)).normalize();
  tmpE.copy(shoulder).addScaledVector(tmpD, a).addScaledVector(tmpP, h);
  const d1 = tmpX.subVectors(tmpE, shoulder).normalize();
  const reach = tmpT.copy(shoulder).addScaledVector(tmpD, dist);
  const d2 = tmpY.subVectors(reach, tmpE).normalize();
  const cosE = clamp(d1.dot(d2), -1, 1);
  const elbow = -Math.acos(cosE);
  const sinE = Math.sin(elbow);
  if (Math.abs(sinE) < 1e-4) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return elbow;
  }
  const y = tmpZ.copy(d1).negate();
  const z = new THREE.Vector3().copy(d1).multiplyScalar(cosE).sub(d2).divideScalar(sinE);
  const x = new THREE.Vector3().crossVectors(y, z);
  tmpM.makeBasis(x, y, z);
  tmpEuler.setFromRotationMatrix(tmpM, "XYZ");
  out[0] = tmpEuler.x;
  out[1] = tmpEuler.y;
  out[2] = tmpEuler.z;
  return elbow;
}

type Euler3 = [number, number, number];

/** Pose objetivo: ángulos de cada articulación (radianes). */
interface Pose {
  hipsY: number;
  hipsYaw: number;
  torso: Euler3;
  head: Euler3;
  armL: Euler3;
  armR: Euler3;
  elbowL: number;
  elbowR: number;
  legL: number;
  legR: number;
  spread: number;
  kneeL: number;
  kneeR: number;
  footL: number;
  footR: number;
  /** Punta del pie hacia fuera (rad). */
  toeOut: number;
}

const createPose = (): Pose => ({
  hipsY: PROPORTIONS.hipHeight,
  hipsYaw: 0,
  torso: [0, 0, 0],
  head: [0, 0, 0],
  armL: [0, 0, 0],
  armR: [0, 0, 0],
  elbowL: 0,
  elbowR: 0,
  legL: 0,
  legR: 0,
  spread: 0,
  kneeL: 0,
  kneeR: 0,
  footL: 0,
  footR: 0,
  toeOut: 0,
});

const set3 = (t: Euler3, x: number, y: number, z: number): void => {
  t[0] = x;
  t[1] = y;
  t[2] = z;
};

/** Segundos quieto antes de cruzarse de brazos. */
const CROSS_ARMS_DELAY = 0.9;
const FLIP_DURATION = 0.42;

/** Brazos cruzados (resuelto con IK sobre la ilustración, espacio del torso). */
const CROSSED = {
  armL: [0.295, -1.181, 0.633] as const,
  armR: [0.16, 1.13, -0.622] as const,
  elbowL: -1.69,
  elbowR: -1.798,
};
const TAU = Math.PI * 2;

/**
 * Animación procedural exagerada estilo arcade.
 * Calcula una pose objetivo según el estado y amortigua hacia ella,
 * así las transiciones (correr → saltar → aterrizar) salen solas.
 * Cuando llegue el GLB con clips, esta clase se sustituye por un
 * AnimationMixer sin tocar Player.
 */
export class UsainBotAnimator {
  private rig: UsainBotRig;
  private pose = createPose();
  private phase = 0;
  private time = 0;
  private idleTime = 0;
  private flip = -1;
  private squash = 0;
  private grounded = true;
  private can: THREE.Object3D | null;
  private shoulderR = new THREE.Vector3(-PROPORTIONS.shoulderX, PROPORTIONS.shoulderY, 0);
  private shoulderL = new THREE.Vector3(PROPORTIONS.shoulderX, PROPORTIONS.shoulderY, 0);
  private hand = new THREE.Vector3();
  private poleR = new THREE.Vector3(-0.75, -0.6, -0.3).normalize();
  private poleL = new THREE.Vector3(0.8, -0.2, -0.55).normalize();
  private hipHand = new THREE.Vector3(0.3, 0.06, -0.02);
  /** Se dispara al pasar por el "¡AHH!" (efectos/sonido). */
  onDrinkMoment: ((moment: "open" | "gulp" | "ahh" | "crush") => void) | null = null;
  private lastDrinkT = -1;

  constructor(rig: UsainBotRig, can: THREE.Object3D | null = null) {
    this.rig = rig;
    this.can = can;
    if (can) can.visible = false;
  }

  /** Segundos seguidos en reposo (la pose chulesca empieza tras CROSS_ARMS_DELAY). */
  get idleSeconds(): number {
    return this.idleTime;
  }

  update(dt: number, a: AnimInput): void {
    this.time += dt;
    if (a.doubleJumped) this.flip = 0;
    if (a.landed) this.squash = 1;

    const p = this.pose;
    let lambda: number;
    this.grounded = a.state !== "air" && a.state !== "vehicle";
    if (a.state === "vehicle") {
      this.idleTime = 0;
      this.drivePose(p, a.steer ?? 0);
      lambda = 14;
    } else if (a.state === "drinking") {
      this.idleTime = 0;
      this.drinkPose(p, a.drinkT);
      lambda = 18;
    } else if (a.state === "run") {
      this.idleTime = 0;
      this.runPose(dt, a, p);
      lambda = 24;
    } else if (a.state === "air") {
      this.idleTime = 0;
      this.airPose(a, p);
      lambda = 11;
    } else {
      this.idleTime += dt;
      this.idlePose(p);
      lambda = this.idleTime > CROSS_ARMS_DELAY ? 7 : 12;
    }

    if (this.flip >= 0) this.tuckPose(p);

    // Aplastamiento al aterrizar (squash & stretch de dibujo animado)
    this.squash = Math.max(0, this.squash - dt * 6);
    const k = this.squash;
    p.kneeL += 0.7 * k;
    p.kneeR += 0.7 * k;
    p.legL -= 0.35 * k;
    p.legR -= 0.35 * k;
    p.hipsY -= 0.1 * k;
    this.rig.root.scale.set(1 + 0.07 * k, 1 - 0.1 * k, 1 + 0.07 * k);

    // Pies: mantener la suela más o menos paralela al suelo
    p.footL = -(p.legL + p.kneeL) * 0.55;
    p.footR = -(p.legR + p.kneeR) * 0.55;

    this.apply(p, lambda, dt);
    this.groundFeet(a);
    this.updateCan(a.drinkT);
    this.updateFlip(dt, a);
  }

  private runPose(dt: number, a: AnimInput, p: Pose): void {
    const r = clamp(a.speedRatio, 0, 1);
    this.phase += dt * (5 + 11 * r);
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const stride = (0.4 + 0.8 * r) * (a.sprinting ? 1.15 : 1);
    const lean = 0.08 + 0.14 * r + (a.sprinting ? 0.12 : 0);

    p.legL = -s * stride;
    p.legR = s * stride;
    p.kneeL = 0.2 + (0.5 + 1.1 * r) * Math.max(0, c);
    p.kneeR = 0.2 + (0.5 + 1.1 * r) * Math.max(0, -c);
    p.spread = 0.02;
    p.toeOut = 0;

    // Brazos de velocista: codo a 90° y braceo amplio
    const armSwing = stride * 0.95;
    const bend = lerp(0.4, 1.45, clamp(r * 1.6, 0, 1));
    set3(p.armL, s * armSwing, 0, 0.1);
    set3(p.armR, -s * armSwing, 0, -0.1);
    p.elbowL = -(bend + 0.25 * s);
    p.elbowR = -(bend - 0.25 * s);

    p.hipsY = PROPORTIONS.hipHeight - 0.03 * r + Math.abs(s) * 0.07 * r;
    p.hipsYaw = -s * 0.12 * r;
    set3(p.torso, lean, s * 0.2 * r, 0);
    set3(p.head, -lean * 0.7, -s * 0.12 * r, 0);
  }

  private airPose(a: AnimInput, p: Pose): void {
    // Mezcla entre "subiendo" (puño arriba) y "cayendo" (brazos abiertos)
    const up = clamp((a.verticalVelocity + 1.5) / 5, 0, 1);
    p.legL = lerp(-0.5, -1.05, up);
    p.kneeL = lerp(0.7, 1.45, up);
    p.legR = lerp(-0.05, 0.4, up);
    p.kneeR = lerp(0.35, 0.55, up);
    p.spread = 0.06;
    p.toeOut = 0.1;
    set3(p.armL, lerp(-0.7, -2.7, up), 0, lerp(1.25, 0.25, up));
    set3(p.armR, lerp(-0.7, 0.55, up), 0, lerp(-1.25, -0.45, up));
    p.elbowL = lerp(-0.45, -0.3, up);
    p.elbowR = lerp(-0.45, -1.0, up);
    p.hipsY = PROPORTIONS.hipHeight;
    p.hipsYaw = 0;
    set3(p.torso, lerp(0.02, 0.1, up), 0, 0);
    set3(p.head, lerp(0.1, -0.15, up), 0, 0);
  }

  private tuckPose(p: Pose): void {
    p.legL = -1.7;
    p.legR = -1.5;
    p.kneeL = 2.2;
    p.kneeR = 2.1;
    set3(p.armL, -1.1, 0, 0.35);
    set3(p.armR, -1.1, 0, -0.35);
    p.elbowL = -2.0;
    p.elbowR = -2.0;
    set3(p.torso, 0.45, 0, 0);
    set3(p.head, 0.2, 0, 0);
  }

  private idlePose(p: Pose): void {
    const breathe = Math.sin(this.time * 2.1);
    p.hipsY = PROPORTIONS.hipHeight - 0.006 + breathe * 0.004;
    p.hipsYaw = 0;
    p.legL = 0;
    p.legR = 0;
    p.kneeL = 0.04;
    p.kneeR = 0.04;

    if (this.idleTime > CROSS_ARMS_DELAY) {
      // Pose de la ilustración: piernas abiertas, puntas fuera, brazos cruzados
      // (codos abiertos, antebrazo derecho por delante). Ángulos resueltos por IK.
      p.spread = 0.12;
      p.toeOut = 0.32;
      set3(p.armL, CROSSED.armL[0], CROSSED.armL[1], CROSSED.armL[2]);
      set3(p.armR, CROSSED.armR[0], CROSSED.armR[1], CROSSED.armR[2]);
      p.elbowL = CROSSED.elbowL;
      p.elbowR = CROSSED.elbowR;
      set3(p.torso, -0.03 + breathe * 0.01, 0, 0);
      set3(p.head, -0.08, -0.16 + Math.sin(this.time * 0.5) * 0.08, -0.06);
    } else {
      p.spread = 0.06;
      p.toeOut = 0.15;
      set3(p.armL, 0, 0, 0.12);
      set3(p.armR, 0, 0, -0.12);
      p.elbowL = -0.2;
      p.elbowR = -0.2;
      set3(p.torso, breathe * 0.015, 0, 0);
      set3(p.head, 0, Math.sin(this.time * 0.7) * 0.2, 0);
    }
  }

  /**
   * DRINKING_GASOIL: pose de refresco energético. Brazo derecho por IK hasta
   * la boca real (sigue a la cabeza), mano izquierda en la cadera, cabeza
   * hacia atrás en los tragos y tembleque robótico al terminar.
   */
  private drinkPose(p: Pose, t: number): void {
    const sip = t > 0.4 && t < 0.72;
    const gulp = sip ? Math.sin((t - 0.4) * 60) : 0;
    const ahh = t > 0.72 && t < 0.86 ? Math.sin(t * 190) * (0.86 - t) * 4 : 0;

    // Cabeza: mira la lata → echa la cabeza atrás al beber → sacudida al acabar
    let headX = 0;
    let headY = 0;
    if (t < 0.36) {
      const k = smooth(clamp((t - 0.15) / 0.15, 0, 1));
      headX = 0.3 * k;
      headY = -0.25 * k;
    } else if (t < 0.74) {
      headX = lerp(0.3, -0.55, smooth(clamp((t - 0.36) / 0.08, 0, 1))) + gulp * 0.05;
    } else {
      headX = lerp(-0.55, 0, smooth(clamp((t - 0.74) / 0.2, 0, 1)));
    }
    set3(p.head, headX, headY, ahh * 0.35);
    set3(p.torso, (sip ? -0.12 : t > 0.3 && t < 0.8 ? -0.05 : 0.02) + gulp * 0.02, 0.12 * Math.sin(t * Math.PI), ahh * 0.12);

    // Piernas: postura chulesca, rodilla derecha "suelta" en los tragos
    p.spread = 0.12;
    p.toeOut = 0.3;
    p.legL = 0;
    p.legR = sip ? -0.12 : 0;
    p.kneeL = 0.05;
    p.kneeR = sip ? 0.32 : 0.05;
    p.hipsYaw = 0.1 * Math.sin(t * Math.PI);

    // Mano derecha: fotogramas clave; la boca se calcula con la cabeza actual
    const key = sampleKeys(DRINK_KEYS, t);
    const head = this.rig.head;
    const mouth = tmpS.set(0, PROPORTIONS.headCenter - 0.13, 0.25).applyEuler(head.rotation).add(head.position);
    const toMouth = t > 0.3 && t < 0.8;
    const mouthK = t < 0.4 ? smooth(clamp((t - 0.3) / 0.1, 0, 1)) : t > 0.7 ? 1 - smooth(clamp((t - 0.7) / 0.1, 0, 1)) : 1;
    const ky = key[1] >= MOUTH - 1 ? mouth.y : key[1];
    const kz = key[2] >= MOUTH - 1 ? mouth.z : key[2];
    this.hand.set(key[0], toMouth ? lerp(0.28, ky, mouthK) : ky, toMouth ? lerp(0.36, kz, mouthK) : kz);
    if (toMouth) this.hand.y = lerp(0.28, mouth.y, mouthK);
    p.elbowR = solveArmIK(this.shoulderR, this.hand, this.poleR, PROPORTIONS.upperArm, HAND_LENGTH, p.armR);

    // Mano izquierda en la cadera (brazo en jarra) durante casi toda la acción
    const onHip = smooth(clamp(t / 0.12, 0, 1)) * (1 - smooth(clamp((t - 0.86) / 0.14, 0, 1)));
    if (onHip > 0.01) {
      const rest = tmpP.set(0.28, 0.0, 0.05);
      const target = rest.lerp(this.hipHand, onHip);
      p.elbowL = solveArmIK(this.shoulderL, target, this.poleL, PROPORTIONS.upperArm, HAND_LENGTH, p.armL);
    } else {
      set3(p.armL, 0, 0, 0.12);
      p.elbowL = -0.2;
    }
    p.hipsY = PROPORTIONS.hipHeight;

    // Momentos para efectos y sonido
    const moments: Array<[number, "open" | "gulp" | "ahh" | "crush"]> = [
      [0.3, "open"],
      [0.45, "gulp"],
      [0.55, "gulp"],
      [0.65, "gulp"],
      [0.74, "ahh"],
      [0.86, "crush"],
    ];
    for (const [at, m] of moments) if (this.lastDrinkT < at && t >= at) this.onDrinkMoment?.(m);
    this.lastDrinkT = t;
  }

  /**
   * IN_VEHICLE: sentado (muslos hacia delante, rodillas dobladas), manos al
   * volante que giran con la dirección y cabeza mirando hacia la curva.
   */
  private drivePose(p: Pose, steer: number): void {
    p.hipsY = 0.3;
    p.hipsYaw = 0;
    p.spread = 0.1;
    p.toeOut = 0.15;
    p.legL = -1.45;
    p.legR = -1.45;
    p.kneeL = 1.35;
    p.kneeR = 1.35;
    set3(p.torso, -0.12, 0, steer * -0.05);
    set3(p.head, 0.05, -steer * 0.35, 0);
    set3(p.armL, -1.05 - steer * 0.25, 0.25, 0.25 - steer * 0.25);
    set3(p.armR, -1.05 + steer * 0.25, -0.25, -0.25 - steer * 0.25);
    p.elbowL = -0.55;
    p.elbowR = -0.55;
  }

  /** Lata en la mano: aparece al sacarla, se inclina al beber, se aplasta y desaparece. */
  private updateCan(t: number): void {
    const can = this.can;
    if (!can) return;
    if (t < 0) {
      can.visible = false;
      this.lastDrinkT = -1;
      return;
    }
    const visible = t > 0.12 && t < 0.95;
    can.visible = visible;
    if (!visible) return;
    const r = this.rig;
    // Posición = mano real (tras el suavizado), orientación en espacio del torso
    r.torso.updateWorldMatrix(true, true);
    const hand = tmpT.set(0, -0.335, 0.035);
    r.elbowR.localToWorld(hand);
    r.torso.worldToLocal(hand);
    can.position.copy(hand);
    const tilt = sampleKeys(CAN_TILT_KEYS, t)[0];
    can.quaternion.setFromAxisAngle(AXIS_X, tilt);
    tmpQ.setFromAxisAngle(tmpY.set(0, 1, 0), 0.4);
    can.quaternion.multiply(tmpQ);
    const pop = t < 0.18 ? smooth((t - 0.12) / 0.06) : 1;
    const crush = t > 0.86 ? smooth(clamp((t - 0.86) / 0.04, 0, 1)) : 0;
    const vanish = t > 0.9 ? 1 - smooth((t - 0.9) / 0.05) : 1;
    can.scale.set(pop * (1 + crush * 0.3) * vanish, pop * (1 - crush * 0.6) * vanish, pop * (1 + crush * 0.3) * vanish);
  }

  /**
   * Apoyo de pies: con el personaje en el suelo, la cadera se coloca a la
   * altura exacta que dejan las piernas (FK real de muslo, espinilla y pie),
   * de modo que la suela más baja toca y = 0 del modelo (= suelo real).
   * Así los pies no se hunden al correr, aterrizar, beber o usar turbo.
   */
  private groundFeet(a: AnimInput): void {
    if (!this.grounded) return;
    const r = this.rig;
    const P = PROPORTIONS;
    const legDrop = (leg: THREE.Bone, knee: THREE.Bone, foot: THREE.Bone): number => {
      const th = leg.rotation.x;
      const kn = knee.rotation.x;
      const pitch = th + kn + foot.rotation.x;
      const vertical = (P.thigh * Math.cos(th) + P.shin * Math.cos(th + kn)) * Math.cos(leg.rotation.z);
      const sole = r.soleDepth * Math.cos(pitch) + (pitch > 0 ? 0.215 : 0.125) * Math.abs(Math.sin(pitch));
      return vertical + sole;
    };
    const need = Math.max(legDrop(r.legL, r.kneeL, r.footL), legDrop(r.legR, r.kneeR, r.footR));
    // Fase de vuelo al correr rápido (los dos pies en el aire, nunca bajo el suelo)
    const flight = a.state === "run" ? Math.max(0, Math.cos(this.phase * 2)) * 0.05 * clamp(a.speedRatio, 0, 1) : 0;
    r.hips.position.y = need - P.legOffsetY + flight;
  }

  private updateFlip(dt: number, a: AnimInput): void {
    if (this.flip < 0) return;
    this.flip += dt / FLIP_DURATION;
    if (this.flip >= 1 || a.state !== "air") {
      this.flip = -1;
      this.rig.hips.rotation.x = 0;
      return;
    }
    // Mortal hacia delante alrededor de la cadera (ease-out)
    const t = 1 - (1 - this.flip) * (1 - this.flip);
    this.rig.hips.rotation.x = t * TAU;
  }

  private apply(p: Pose, lambda: number, dt: number): void {
    const r = this.rig;
    const d = (current: number, target: number): number => damp(current, target, lambda, dt);

    r.hips.position.y = d(r.hips.position.y, p.hipsY);
    r.hips.rotation.y = d(r.hips.rotation.y, p.hipsYaw);
    r.torso.rotation.set(
      d(r.torso.rotation.x, p.torso[0]),
      d(r.torso.rotation.y, p.torso[1]),
      d(r.torso.rotation.z, p.torso[2])
    );
    r.head.rotation.set(
      d(r.head.rotation.x, p.head[0]),
      d(r.head.rotation.y, p.head[1]),
      d(r.head.rotation.z, p.head[2])
    );
    r.armL.rotation.set(
      d(r.armL.rotation.x, p.armL[0]),
      d(r.armL.rotation.y, p.armL[1]),
      d(r.armL.rotation.z, p.armL[2])
    );
    r.armR.rotation.set(
      d(r.armR.rotation.x, p.armR[0]),
      d(r.armR.rotation.y, p.armR[1]),
      d(r.armR.rotation.z, p.armR[2])
    );
    r.elbowL.rotation.x = d(r.elbowL.rotation.x, p.elbowL);
    r.elbowR.rotation.x = d(r.elbowR.rotation.x, p.elbowR);
    r.legL.rotation.x = d(r.legL.rotation.x, p.legL);
    r.legR.rotation.x = d(r.legR.rotation.x, p.legR);
    r.legL.rotation.z = d(r.legL.rotation.z, p.spread);
    r.legR.rotation.z = d(r.legR.rotation.z, -p.spread);
    r.kneeL.rotation.x = d(r.kneeL.rotation.x, p.kneeL);
    r.kneeR.rotation.x = d(r.kneeR.rotation.x, p.kneeR);
    r.footL.rotation.x = d(r.footL.rotation.x, p.footL);
    r.footR.rotation.x = d(r.footR.rotation.x, p.footR);
    r.footL.rotation.y = d(r.footL.rotation.y, p.toeOut);
    r.footR.rotation.y = d(r.footR.rotation.y, -p.toeOut);
    r.footL.rotation.z = d(r.footL.rotation.z, -p.spread);
    r.footR.rotation.z = d(r.footR.rotation.z, p.spread);
  }
}
