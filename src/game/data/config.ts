import type { GameSettings } from "./types";

/**
 * Configuración global del juego: fuente única de verdad.
 * Cambiar el "feel" del juego se hace aquí, no en el código.
 */
export const gameSettings: GameSettings = {
  camera: {
    fov: 60,
    sprintFov: 70,
    near: 0.2,
    far: 420,
    distance: 5.4,
    minDistance: 1.4,
    targetHeight: 1.55,
    mouseSensitivity: 0.005,
    mouseLook: false,
    keyLookResponse: 9,
    vehicleDistance: 7.4,
    vehicleTargetHeight: 1.5,
    vehicleDefaultPitch: 0.26,
    vehicleFollowSpeed: 3.2,
    vehicleFov: 72,
    stickYawSpeed: 2.6,
    stickPitchSpeed: 1.3,
    minPitch: -0.15,
    maxPitch: 1.05,
    defaultPitch: 0.24,
    autoFollowDelay: 1.1,
    autoFollowSpeed: 1.0,
    recenterSpeed: 10,
    collisionPadding: 0.3,
  },
  input: {
    moveDeadzone: 0.2,
    lookDeadzone: 0.15,
    triggerThreshold: 0.35,
  },
  player: {
    maxSpeed: 8.5,
    sprintMultiplier: 2.0,
    acceleration: 12,
    airControl: 4,
    turnSpeed: 15,
    jumpForce: 8.2,
    doubleJumpForce: 7.4,
    maxJumps: 2,
    gravity: 22,
    fallGravityMultiplier: 1.4,
    jumpCutMultiplier: 2.2,
    coyoteTime: 0.12,
    jumpBuffer: 0.14,
    radius: 0.38,
    maxEnergy: 100,
  },
  world: {
    groundSize: 700,
    fogNear: 70,
    fogFar: 280,
    skyColor: 0xc6e6f5,
  },
};
