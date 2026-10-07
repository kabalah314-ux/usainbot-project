/** Objetos del juego. El inventario solo guarda ids y cantidades. */
export interface ItemData {
  id: string;
  name: string;
  description: string;
  maxStack: number;
  kind: "consumable" | "key" | "misc";
  /** Turbo que recarga al consumirlo (consumibles). */
  turbo?: number;
}

/** Id del consumible GasOil (la "GasOilCan"). */
export const GASOIL_ITEM = "gasoil_can";

export const ITEMS: Record<string, ItemData> = {
  [GASOIL_ITEM]: {
    id: GASOIL_ITEM,
    name: "GasOil",
    description: "Lata de combustible para robots. G para beberla y recargar el TURBO.",
    maxStack: 9,
    kind: "consumable",
    turbo: 40,
  },
};

/** Paquete de "Entrega urgente" (objeto de misión). */
ITEMS.tarta = {
  id: "tarta",
  name: "Tarta de cumpleaños",
  description: "Tarta de tres pisos para el Abuelo Ernesto. Frágil. MUY frágil.",
  maxStack: 1,
  kind: "key",
};

export const economySettings = {
  /** Créditos iniciales (₲). */
  startMoney: 30,
  /** Precio de una lata en las máquinas expendedoras. */
  gasoilPrice: 10,
} as const;

/**
 * TURBO de UsainBot: reserva que se gasta con SHIFT y se recarga bebiendo GasOil.
 * Todo el "feel" del turbo se ajusta aquí.
 */
export const turboSettings = {
  max: 100,
  /** Turbo al empezar la partida. */
  start: 35,
  /** Consumo por segundo con SHIFT pulsado y en movimiento. */
  drainPerSecond: 17,
  /** Mínimo necesario para ARRANCAR el turbo (evita parpadeos a 0). */
  minToActivate: 4,
  /** Multiplicador de velocidad máxima con turbo. */
  speedMultiplier: 2.0,
  /**
   * Agarre con turbo: menos giro y menos capacidad de cambiar de dirección.
   * En las curvas el turbo te lanza contra la fachada → hay que dosificarlo.
   */
  turnSpeedMultiplier: 0.3,
  gripMultiplier: 0.28,
  /** Derrapar con turbo (girar fuerte) quema turbo más rápido: úsalo en rectas. */
  skidDrainMultiplier: 2.2,
  /** Arranque: empujón inicial al activar el turbo (m/s). */
  launchKick: 3,
} as const;

/** Animación/estado DRINKING_GASOIL. */
export const drinkSettings = {
  /** Duración total de la animación (s). */
  duration: 1.75,
  /** Momento (0..1) en que se aplica el GasOil: se gasta la lata y sube el turbo. */
  applyAt: 0.72,
} as const;
