import type { RaceData } from "./types";

/**
 * Carreras. Rutas diseñadas para GESTIONAR el turbo: rectas (turbo), curvas
 * (con turbo se derrapa y quema más barra), obstáculos y atajos a pie.
 * Tipos implementados: sprint, checkpoints, time_trial. Preparados en datos:
 * obstacles, shortcuts, vs_npc y mode "vehicle".
 * Tiempos calibrados con la simulación de tests (misma física que el juego).
 */
export const RACES: Record<string, RaceData> = {
  race_demuestra: {
    id: "race_demuestra",
    name: "Demuestra tu velocidad",
    mode: "on_foot",
    kind: ["checkpoints"],
    start: { x: 3.5, z: 36, yaw: Math.PI },
    checkpoints: [
      [3.5, 4], // tramo 1: avenida (calentar)
      [0, -25], // curva 1: cruce Comercio (¡suelta el turbo!)
      [-56, -25], // tramo 2: recta larga de Calle Comercio (turbo)
      [-110, -25], // curva 2: cruce Oeste
    ],
    finish: [-110, -84], // tramo final: vacía la barra
    timeLimit: 25,
    radius: 7,
    gateWidth: 11,
    countdown: true,
    placeAtStart: true,
  },
  race_reloj: {
    id: "race_reloj",
    name: "Más rápido que el reloj",
    mode: "on_foot",
    kind: ["sprint", "time_trial"],
    start: { x: -104, z: 45, yaw: -Math.PI / 2 },
    checkpoints: [],
    finish: [110, -52],
    timeLimit: 34.5,
    radius: 6,
    gateWidth: 9,
    countdown: false,
    placeAtStart: false,
  },
  race_eso: {
    id: "race_eso",
    name: "¿Eso es todo?",
    mode: "on_foot",
    kind: ["checkpoints", "shortcuts", "obstacles"],
    start: { x: -3.5, z: 40, yaw: Math.PI },
    checkpoints: [
      [0, -60], // calle principal: recta larga (turbo)
      [0, -118], // parque (entrada peatonal: el coche no pasa)
      [-38, -17], // callejón: ¿atajo entre las casas o vuelta por la avenida?
      [-38, 9], // salida del callejón a la plaza trasera
      [61, 16], // máquina GasOil de la galería: ¿paras a beber?
    ],
    finish: [38, 66], // gasolinera: ¿por el oeste o rodeando la galería?
    timeLimit: 61,
    radius: 7,
    gateWidth: 7,
    countdown: true,
    placeAtStart: true,
  },
  // === Carrera que cruza la EXPANSIÓN (Barrio Bolt → Sant Obrer) ===
  race_alla: {
    id: "race_alla",
    name: "Más allá del barrio",
    mode: "on_foot",
    kind: ["checkpoints"],
    start: { x: 110, z: 45, yaw: Math.PI / 2 },
    checkpoints: [
      [150, 45], // extensión 1 (norte de Sant Obrer: fábricas)
      [151, 8], // extensión 2 (centro: Rambla Obrera)
      [205, 8], // este del barrio nuevo
    ],
    finish: [222, 8], // final del nuevo mapa (Taller Sant Obrer)
    timeLimit: 42,
    radius: 8,
    gateWidth: 12,
    countdown: true,
    placeAtStart: true,
  },
  race_corre: {
    id: "race_corre",
    name: "Corre si puedes",
    mode: "on_foot",
    kind: ["checkpoints"],
    rules: { mustUseTurbo: true },
    start: { x: -3.5, z: 72, yaw: Math.PI },
    checkpoints: [
      [0, 45], // cruce Gasolina (curva: suelta el turbo)
      [60, 45], // recta de la Calle Gasolina (turbo)
      [110, 45], // cruce Este
      [110, -25], // recta de la Calle Este (turbo)
    ],
    finish: [55, -25], // Calle Comercio, frente al aparcamiento de la galería
    timeLimit: 34,
    radius: 7,
    gateWidth: 9,
    countdown: true,
    placeAtStart: true,
  },
  race_atajo: {
    id: "race_atajo",
    name: "El atajo del campeón",
    mode: "on_foot",
    kind: ["sprint", "obstacles"],
    rules: { mustDrinkGasOil: true, mustUseTurbo: true },
    start: { x: -96, z: -102.5, yaw: Math.PI },
    checkpoints: [],
    finish: [100, -128], // cruzando el parque: estanque, estatua y zona infantil
    timeLimit: 28,
    radius: 7,
    gateWidth: 9,
    countdown: true,
    placeAtStart: true,
  },

  // ======================= CARRERAS EN COCHE (RACE_VEHICLE) =======================
  /** Vuelta al barrio por las calles anchas (sin bolardos). Curvas: frena o derrapa con SPACE. */
  race_contrarreloj: {
    id: "race_contrarreloj",
    name: "Contrarreloj",
    mode: "vehicle",
    kind: ["checkpoints", "time_trial"],
    start: { x: 15, z: 48, yaw: Math.PI / 2 },
    checkpoints: [
      [110, 45], // cruce Este
      [110, -95], // recta de la Calle Este
      [-110, -95], // la Calle del Parque entera (¡a fondo!)
      [-110, 45], // Calle Oeste
    ],
    finish: [-45, 45], // Calle Gasolina
    timeLimit: 52,
    radius: 11,
    gateWidth: 14,
    countdown: true,
    placeAtStart: true,
  },
  /** Entrega Express: contrarreloj en coche desde donde subas hasta el Robo-Burger. */
  race_express: {
    id: "race_express",
    name: "Entrega Express",
    mode: "vehicle",
    kind: ["sprint", "time_trial"],
    start: { x: -25, z: 126, yaw: Math.PI },
    checkpoints: [],
    finish: [-3.5, -10],
    timeLimit: 30,
    radius: 9,
    gateWidth: 12,
    countdown: false,
    placeAtStart: false,
    dynamic: { speed: 15, detour: 1.35, margin: 7 },
  },

  // ======================= CONTRARRELOJES A PIE "DESDE DONDE ESTÉS" =======================
  race_farmacia: {
    id: "race_farmacia",
    name: "La entrega más rápida",
    mode: "on_foot",
    kind: ["sprint", "time_trial"],
    start: { x: -11, z: 24, yaw: Math.PI },
    checkpoints: [],
    finish: [-3, -117],
    timeLimit: 24,
    radius: 6,
    gateWidth: 7,
    countdown: false,
    placeAtStart: false,
    dynamic: { speed: 10.5, detour: 1.3, margin: 3 },
  },
  race_bateria: {
    id: "race_bateria",
    name: "Batería baja",
    mode: "on_foot",
    kind: ["sprint", "time_trial"],
    start: { x: 4, z: -110, yaw: 0 },
    checkpoints: [],
    finish: [-22, 93],
    timeLimit: 30,
    radius: 6,
    gateWidth: 7,
    countdown: false,
    placeAtStart: false,
    dynamic: { speed: 10, detour: 1.3, margin: 4 },
  },
  race_nohaytiempo: {
    id: "race_nohaytiempo",
    name: "No hay tiempo",
    mode: "on_foot",
    kind: ["sprint", "time_trial"],
    start: { x: 54, z: -9, yaw: -Math.PI / 2 },
    checkpoints: [],
    finish: [0, -126],
    timeLimit: 22,
    radius: 7,
    gateWidth: 8,
    countdown: false,
    placeAtStart: false,
    dynamic: { speed: 10, detour: 1.3, margin: 4 },
  },
  /** Sprint dentro del Centro Comercial Bolt (prueba de la misión 020). */
  race_mall: {
    id: "race_mall",
    name: "Reto del centro comercial",
    mode: "on_foot",
    kind: ["sprint"],
    start: { x: 70, z: 232, yaw: Math.PI },
    checkpoints: [],
    finish: [-41, 243],
    timeLimit: 18,
    radius: 6,
    gateWidth: 9,
    countdown: true,
    placeAtStart: true,
  },
};

/** Etiqueta del tipo de carrera (RACE_ON_FOOT / RACE_VEHICLE). */
export function raceType(race: RaceData): "RACE_ON_FOOT" | "RACE_VEHICLE" {
  return race.mode === "vehicle" ? "RACE_VEHICLE" : "RACE_ON_FOOT";
}
