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
};
