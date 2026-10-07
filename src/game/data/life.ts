/**
 * Ciudad viva: TODOS los valores ajustables (densidad, radios, horarios,
 * frases). Nada de números sueltos por el código.
 */
export type DayPhase = "MORNING" | "DAY" | "EVENING" | "NIGHT";

export const lifeSettings = {
  /** Peatones del pool (se reutilizan: nunca se crean/destruyen en juego). */
  maxPedestrians: 18,
  /** Coches de tráfico del pool. */
  maxTrafficCars: 9,
  /** Los peatones aparecen en nodos a esta distancia del jugador (m). */
  pedSpawnMin: 28,
  pedSpawnMax: 80,
  /** Más lejos que esto, el peatón se recicla cerca del jugador. */
  pedDespawn: 100,
  /** Detalle completo (contorno + sombra) por debajo de esta distancia. */
  detailRadius: 45,
  /** Lógica reducida (actualización a menor frecuencia) más allá. */
  reducedLogicRadius: 70,
  /** Tráfico: aparece fuera de cámara o a más de esta distancia. */
  carSpawnMin: 70,
  carDespawn: 135,
  /** Lógica completa de tráfico (detección de obstáculos) dentro de este radio. */
  carLogicRadius: 95,
  carCruise: 10,
  carCornerSpeed: 5,
  /** Distancia a la que un coche empieza a frenar por algo delante (m). */
  carLookAhead: 11,
  /** Eventos ambientales: cada cuánto se intenta lanzar uno (s) y cuántos a la vez. */
  eventInterval: [18, 32] as [number, number],
  maxConcurrentEvents: 2,
} as const;

export const timeSettings = {
  /** Segundos reales por hora de juego (24 h = 8 min). */
  secondsPerHour: 20,
  startHour: 8,
} as const;

/** Densidad de peatones / tráfico y luz por franja horaria. */
export const PHASES: Record<DayPhase, { from: number; label: string; icon: string; peds: number; cars: number; robots: number }> = {
  MORNING: { from: 6, label: "MAÑANA", icon: "☀", peds: 0.9, cars: 0.85, robots: 0.3 },
  DAY: { from: 11, label: "DÍA", icon: "☀", peds: 1.0, cars: 0.75, robots: 0.3 },
  EVENING: { from: 18, label: "TARDE", icon: "◐", peds: 0.85, cars: 1.0, robots: 0.35 },
  NIGHT: { from: 22, label: "NOCHE", icon: "☾", peds: 0.4, cars: 0.45, robots: 0.7 },
};

/** Frases cortas de reacción (se eligen al azar). */
export const BARKS = {
  fastPass: ["¡¿Pero qué demonios?!", "¡Uaaah!", "¿Eso era un rayo?", "¡Mi peinado!", "¡Frena, hombre!"],
  turbo: ["¡Ey!", "¡Oye!", "¡Cuidado con el turbo!", "¡Casi me despeinas!", "¡Huele a GasOil!"],
  carSlow: ["Bonito coche.", "¡Qué amarillo!", "¿Ese coche es tuyo?", "Mola el BOLT-MOBILE."],
  carFast: ["¡Cuidado!", "¡Que es un paso de peatones!", "¡Loco del volante!"],
  horn: ["¡Muévete, robot!", "¡Que es una calle!", "¡Piii!"],
  greetRobot: ["Bip bup.", "*zumbido amistoso*", "¿GASIL? ¿Tienes GASIL?"],
};

/** Frases de peatones al hablar con ellos (running gag de GasOil incluido). */
export const PEDESTRIAN_LINES = [
  "Buen día para correr, ¿eh? Bueno, para ti todos lo son.",
  "Mi tostadora ha empezado a beber GASIL. Estoy preocupado.",
  "Dicen que el GASIL es el desayuno de las máquinas. Yo prefiero churros.",
  "¿Tú no eres el de la tele? ¡El robot que gana a todo el mundo!",
  "HUMANS DON'T NEED THIS, dice la lata. Me la compré igual.",
  "Ayer vi a un robot quedarse sin batería en mitad de la acera. Qué apuro.",
  "El Robo-Burger ha sacado un menú con GasOil. No lo pidas.",
  "Paseo por el parque cada día. Tú lo cruzas en tres segundos, ¿no?",
];

export const ROBOT_LINES = [
  "Bip. Batería al 12 %. Necesito GasOil.",
  "GasOil: ENERGY FOR MACHINES. Lo pone en la lata.",
  "Soy un robot de reparto. Tú eres un robot de… ¿presumir?",
  "Mi modelo corre a 4 km/h. El tuyo… no quiero hablar de eso.",
];
