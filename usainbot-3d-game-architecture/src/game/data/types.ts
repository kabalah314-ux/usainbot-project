/**
 * Tipos de datos de USAINBOT.
 * Los valores ajustables viven en `config.ts` y `missions.ts`;
 * el código de gameplay nunca escribe números "mágicos".
 */

export interface PlayerStatsData {
  /** Velocidad de carrera base con el stick a tope (m/s). */
  maxSpeed: number;
  /** Multiplicador de velocidad con TURBO (SHIFT). */
  sprintMultiplier: number;
  /** Aceleración horizontal en el suelo. */
  acceleration: number;
  /** Control horizontal en el aire. */
  airControl: number;
  /** Velocidad de giro del personaje hacia la dirección del stick. */
  turnSpeed: number;
  /** Velocidad vertical inicial al saltar (m/s). */
  jumpForce: number;
  /** Velocidad vertical del doble salto (m/s). */
  doubleJumpForce: number;
  /** Saltos totales permitidos (2 = doble salto). */
  maxJumps: number;
  /** Gravedad (m/s²). */
  gravity: number;
  /** Gravedad extra al caer (salto menos "flotante"). */
  fallGravityMultiplier: number;
  /** Gravedad extra si se suelta el botón de salto pronto (salto corto). */
  jumpCutMultiplier: number;
  /** Margen para saltar tras dejar un borde (s). */
  coyoteTime: number;
  /** Margen para registrar un salto pulsado justo antes de aterrizar (s). */
  jumpBuffer: number;
  /** Radio horizontal de colisión (m). */
  radius: number;
  /** Energía base (sirve de referencia para turbo/mejoras). */
  maxEnergy: number;
}

export interface InputSettings {
  /** Zona muerta radial del stick izquierdo. */
  moveDeadzone: number;
  /** Zona muerta radial del stick derecho. */
  lookDeadzone: number;
  /** Umbral para considerar pulsado un gatillo analógico. */
  triggerThreshold: number;
}

export interface CameraSettings {
  fov: number;
  /** FOV durante el sprint (sensación de velocidad). */
  sprintFov: number;
  near: number;
  far: number;
  /** Distancia de la cámara al jugador (m). */
  distance: number;
  /** Distancia mínima al acercarse por colisión (m). */
  minDistance: number;
  /** Altura del punto de mira sobre los pies del jugador (m). */
  targetHeight: number;
  /** Radianes por píxel al arrastrar con el ratón. */
  mouseSensitivity: number;
  /** Cámara con el ratón (false = solo flechas). */
  mouseLook: boolean;
  /** Suavizado de la cámara con flechas (mayor = responde antes). */
  keyLookResponse: number;
  /** Cámara de conducción. */
  vehicleDistance: number;
  vehicleTargetHeight: number;
  vehicleDefaultPitch: number;
  vehicleFollowSpeed: number;
  vehicleFov: number;
  /** Velocidad de giro con flechas / stick derecho (rad/s). */
  stickYawSpeed: number;
  stickPitchSpeed: number;
  minPitch: number;
  maxPitch: number;
  defaultPitch: number;
  /** Segundos sin tocar la cámara antes de que vuelva a seguir al jugador. */
  autoFollowDelay: number;
  /** Intensidad del seguimiento automático por detrás. */
  autoFollowSpeed: number;
  /** Velocidad del recentrado (L1). */
  recenterSpeed: number;
  /** Separación con las paredes al recortar la distancia (m). */
  collisionPadding: number;
}

export interface WorldSettings {
  groundSize: number;
  fogNear: number;
  fogFar: number;
  skyColor: number;
}

export interface GameSettings {
  camera: CameraSettings;
  input: InputSettings;
  player: PlayerStatsData;
  world: WorldSettings;
}

// ---------------- Misiones ----------------

/** Tipos de objetivo soportados por ObjectiveTracker. */
export type ObjectiveType =
  | "TALK_TO_NPC"
  | "GO_TO_LOCATION"
  | "COLLECT_ITEM"
  | "DELIVER_ITEM"
  | "INTERACT_OBJECT"
  | "BUY_ITEM"
  | "USE_ITEM"
  | "RACE_TO_LOCATION"
  | "REACH_CHECKPOINT"
  | "COMPLETE_TIMER"
  | "USE_TURBO"
  | "ENTER_VEHICLE"
  | "EXIT_VEHICLE"
  | "DRIVE_TO_LOCATION"
  | "PARK_VEHICLE";

export interface LocationData {
  x: number;
  z: number;
  /** Radio de llegada (m). */
  radius?: number;
  /** Nombre que muestra el waypoint. */
  label?: string;
}

export interface ObjectiveData {
  id: string;
  description: string;
  /** Progresos necesarios para completar el objetivo. */
  target: number;
  type?: ObjectiveType;
  /** POI al que apunta el waypoint. Admite "nearest:CATEGORIA". */
  waypoint?: string;
  /** TALK_TO_NPC / DELIVER_ITEM. */
  npc?: string;
  /** COLLECT / BUY / USE / DELIVER. */
  item?: string;
  count?: number;
  /** GO_TO_LOCATION / REACH_CHECKPOINT / USE_TURBO (zona donde debe usarse). */
  location?: LocationData;
  /** RACE_TO_LOCATION / COMPLETE_TIMER, o GO_TO_LOCATION hasta la salida de una carrera. */
  race?: string;
  /** USE_TURBO: segundos de turbo necesarios. */
  seconds?: number;
  /** INTERACT_OBJECT. */
  object?: string;
  /** Solo cuenta A PIE (GO_TO_LOCATION / REACH_CHECKPOINT). */
  onFoot?: boolean;
  /** PARK_VEHICLE: velocidad máxima (m/s) y segundos quieto. */
  maxSpeed?: number;
  hold?: number;
  /** ENTER_VEHICLE / DRIVE: vehículo concreto (por defecto, el actual). */
  vehicle?: string;
}

/** Línea de diálogo: texto del NPC o { speaker, text } para otros personajes. */
export type DialogueLine = string | { speaker: string; text: string };

export interface MissionDialogue {
  /** Al ofrecer la misión; al cerrarse, la misión empieza. */
  offer: DialogueLine[];
  /** Si hablas con quien la dio mientras está activa (por id de objetivo o "default"). */
  reminders?: Record<string, DialogueLine[]>;
  /** Objetivo final TALK_TO_NPC con quien la dio. */
  complete?: DialogueLine[];
  /** Después de completarla. */
  after?: DialogueLine[];
  /** Al entregar un objeto (DELIVER_ITEM) al NPC destinatario. */
  deliver?: DialogueLine[];
}

export interface MissionData {
  id: string;
  title: string;
  description: string;
  /** Recompensa en dinero (₲). */
  reward: number;
  /** Límite de tiempo en segundos o null si no tiene límite. */
  timeLimit: number | null;
  objectives: ObjectiveData[];
  /** Id del NPC que ofrece la misión (su POI se marca con "!"). */
  giver?: string;
  dialogue?: MissionDialogue;
  /** Misiones que se desbloquean al completarla. */
  unlocks?: string[];
  /** Objetos que el NPC entrega al aceptar la misión. */
  startItems?: Record<string, number>;
}

/** A pie (lo principal en USAINBOT) o en vehículo (preparado). */
export type RaceMode = "on_foot" | "vehicle";

/**
 * Tipos de carrera. Implementados: sprint (A→B), checkpoints, time_trial.
 * Preparados en datos: obstacles, shortcuts, vs_npc, vehicle.
 */
export type RaceKind = "sprint" | "checkpoints" | "time_trial" | "obstacles" | "shortcuts" | "vs_npc";

export interface RaceRules {
  /** Hay que BEBER GasOil durante la carrera. */
  mustDrinkGasOil?: boolean;
  /** Hay que usar el turbo al menos un momento. */
  mustUseTurbo?: boolean;
}

export interface RaceData {
  id: string;
  name: string;
  mode: RaceMode;
  kind: RaceKind[];
  rules?: RaceRules;
  /** Salida (A) y orientación inicial (rad). */
  start: { x: number; z: number; yaw: number };
  checkpoints: Array<[number, number]>;
  /** Meta (B). */
  finish: [number, number];
  /** Tiempo límite (s). */
  timeLimit: number;
  /** Radio de paso por checkpoint (m). */
  radius: number;
  /** Anchura de los arcos (m). */
  gateWidth: number;
  /** Cuenta atrás 3-2-1-GO (false = empieza al instante, p. ej. COMPLETE_TIMER). */
  countdown: boolean;
  /** Si hay que situarse en la salida antes de empezar. */
  placeAtStart: boolean;
}

// -------- Puntos de extensión para fases futuras --------

export interface VehicleHandling {
  maxSpeed: number;
  acceleration: number;
  braking: number;
  reverseSpeed: number;
  turnSpeed: number;
  friction: number;
  grip: number;
  steerResponse: number;
  fullSteerSpeed: number;
  highSpeedSteerLoss: number;
  handbrakeDecel: number;
  handbrakeGrip: number;
  handbrakeTurnBoost: number;
  bounce: number;
  collisionRadius: number;
  collisionOffsets: number[];
}

export interface VehicleData {
  id: string;
  name: string;
  description: string;
  color: number;
  accent: number;
  drivable: boolean;
  handling: VehicleHandling;
}

export interface NPCAppearance {
  skin: number;
  shirt: number;
  pants: number;
  hair: number;
  shoes?: number;
  /** Gorra/sombrero (color) o null. */
  hat?: number | null;
  /** Escala de altura (1 = 1.8 m aprox.). */
  height?: number;
  /** Complemento visual. */
  accessory?: "none" | "apron" | "cap" | "backpack" | "glasses";
}

export type NPCBehaviorData =
  | { type: "idle"; lookAround?: boolean }
  | { type: "patrol"; path: Array<[number, number]>; speed?: number; pause?: number }
  | { type: "chat"; partner: string }
  | { type: "work"; gesture: "wave" | "point" | "sweep" };

export interface NPCData {
  id: string;
  name: string;
  /** Posición inicial [x, z] y orientación (rad). */
  position: [number, number];
  yaw: number;
  appearance: NPCAppearance;
  behavior: NPCBehaviorData;
  /** Frases al hablar con él (se rotan). */
  lines: string[];
  /** Si da misiones: marca de POI y diálogos por misión. */
  missionGiver?: boolean;
}

export interface UpgradeData {
  id: string;
  name: string;
  cost: number;
  stat: keyof PlayerStatsData;
  bonus: number;
}
