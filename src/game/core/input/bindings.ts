/**
 * Controles de PC (teclado + ratón). El gameplay solo conoce ACCIONES;
 * aquí se decide qué tecla las activa.
 *
 *   WASD mover · FLECHAS cámara · SPACE saltar · SHIFT turbo
 *   E interactuar · G tomar GasOil · ESC pausa · M mapa · H ayuda · C centrar cámara
 */
export type InputAction =
  | "jump"
  | "turbo"
  | "interact"
  | "drink"
  | "exitVehicle"
  | "pause"
  | "map"
  | "help"
  | "cameraReset"
  | "debug"
  | "quality"
  | "confirm";

export type InputDevice = "keyboard" | "gamepad";

/** Índices del "standard mapping" de la Gamepad API (soporte silencioso). */
export const PAD = {
  cross: 0,
  circle: 1,
  square: 2,
  triangle: 3,
  l1: 4,
  r1: 5,
  l2: 6,
  r2: 7,
  select: 8,
  start: 9,
  l3: 10,
  r3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

export const keyboardBindings: Record<InputAction, string[]> = {
  jump: ["Space"],
  turbo: ["ShiftLeft", "ShiftRight"],
  interact: ["KeyE"],
  drink: ["KeyG"],
  // Salir del coche = E (interact). Sin tecla separada.
  exitVehicle: [],
  pause: ["Escape"],
  map: ["KeyM"],
  help: ["KeyH"],
  cameraReset: ["KeyC"],
  debug: ["F2", "F3"],
  quality: ["F4"],
  confirm: ["Enter", "Space"],
};

/** El mando sigue funcionando, pero la interfaz solo muestra teclado y ratón. */
export const gamepadBindings: Record<InputAction, number[]> = {
  jump: [PAD.cross],
  turbo: [PAD.r1, PAD.r2],
  interact: [PAD.triangle],
  drink: [PAD.circle],
  exitVehicle: [],
  pause: [PAD.start],
  map: [PAD.select],
  help: [],
  cameraReset: [PAD.l1],
  debug: [],
  quality: [],
  confirm: [PAD.cross, PAD.start],
};

export const moveKeys = {
  up: ["KeyW"],
  down: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
};

/** Cámara: flechas (control principal). */
export const lookKeys = {
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
};
