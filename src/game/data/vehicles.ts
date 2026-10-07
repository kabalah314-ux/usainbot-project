import type { VehicleData } from "./types";

/**
 * Vehículos: TODO el manejo se ajusta aquí (nada de números sueltos en el código).
 * Conducción arcade: fácil, estable, sin vuelcos. El coche es MOVILIDAD;
 * la velocidad de verdad sigue siendo UsainBot a pie (no entra en parques,
 * callejones ni rutas peatonales).
 */
export const VEHICLES: Record<string, VehicleData> = {
  bolt_mobile: {
    id: "bolt_mobile",
    name: "BOLT-MOBILE",
    description: "Descapotable amarillo y verde de UsainBot. Lo usa para llevar los trofeos (y porque queda bien).",
    color: 0xf2c21c,
    accent: 0x2e9a42,
    drivable: true,
    handling: {
      maxSpeed: 27, // m/s (≈ 97 km/h)
      acceleration: 11,
      braking: 26,
      reverseSpeed: 8,
      turnSpeed: 2.3, // rad/s a velocidad media
      friction: 3.2, // frenada al soltar el acelerador (m/s²)
      grip: 7.5, // agarre lateral (mayor = menos derrape)
      steerResponse: 7,
      fullSteerSpeed: 5, // por debajo gira menos (no gira parado)
      highSpeedSteerLoss: 0.45,
      handbrakeDecel: 14,
      handbrakeGrip: 1.6, // derrape con freno de mano
      handbrakeTurnBoost: 1.5,
      bounce: 0.25, // rebote contra paredes
      collisionRadius: 1.0,
      /** Centros de los círculos de colisión a lo largo del coche (m). */
      collisionOffsets: [-1.35, 0, 1.35],
    },
  },
};

/** Plazas del garaje de la mansión (orientadas hacia la puerta, al norte). */
export const GARAGE_SLOTS = [{ id: "garage_bay_1", x: -25, z: 150.5, yaw: Math.PI }];

export const garageSettings = {
  /** Vehículo activo del jugador (lo recuerda el garaje y se guarda). */
  currentVehicle: "bolt_mobile",
  /** Punto de salida del garaje (entrada de coches). */
  exit: { x: -25, z: 126, yaw: Math.PI },
} as const;

/**
 * Entrar / salir del vehículo (E en ambos casos). Todo configurable aquí.
 */
export const vehicleInteraction = {
  /**
   * vehicleInteractionDistance: distancia máxima (m) desde la CARROCERÍA del
   * coche (no desde su centro) para mostrar "[E] ENTRAR". Funciona desde
   * cualquier lado: laterales, morro, maletero y diagonales.
   */
  interactionDistance: 2.3,
  /** Media huella del coche para medir esa distancia (m). */
  footprintHalfWidth: 1.1,
  footprintHalfLength: 2.35,
  /** Carrera hasta el punto de entrada (s máx.) y salto al asiento (s). */
  approachMaxDuration: 0.35,
  hopDuration: 0.45,
  /** Salto de salida (s). */
  exitDuration: 0.5,
  /** Solo se sale cuando el coche va por debajo de esto (antes frena solo). */
  exitMaxSpeed: 1.5,
  /** Radio libre necesario para la posición de entrada/salida. */
  exitClearance: 0.45,
} as const;
