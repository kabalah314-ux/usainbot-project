/**
 * Trazado del primer barrio (metros). Norte = -Z.
 * Las carreteras son datos: la red viaria, las aceras, los pasos de cebra,
 * el minimapa y las manzanas se derivan de aquí.
 */
export interface RoadData {
  id: string;
  name: string;
  /** "x": discurre de oeste a este (a lo largo de X) en z = at. "z": de norte a sur en x = at. */
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  width: number;
  sidewalk: number;
}

export const ROADS: RoadData[] = [
  { id: "main", name: "AV. BOLT", axis: "z", at: 0, from: -95, to: 204, width: 14, sidewalk: 3 },
  { id: "park", name: "C. DEL PARQUE", axis: "x", at: -95, from: -115, to: 115, width: 12, sidewalk: 3 },
  { id: "shops", name: "C. COMERCIO", axis: "x", at: -25, from: -115, to: 115, width: 12, sidewalk: 3 },
  { id: "gas", name: "C. GASOLINA", axis: "x", at: 45, from: -115, to: 115, width: 12, sidewalk: 3 },
  { id: "home", name: "C. RESIDENCIAL", axis: "x", at: 115, from: -115, to: 115, width: 12, sidewalk: 3 },
  { id: "west", name: "C. OESTE", axis: "z", at: -110, from: -95, to: 115, width: 10, sidewalk: 3 },
  { id: "east", name: "C. ESTE", axis: "z", at: 110, from: -95, to: 115, width: 10, sidewalk: 3 },
];

/** Límites jugables del primer barrio. */
export const CITY_BOUNDS = { minX: -121, maxX: 121, minZ: -178, maxZ: 203 };

/** Punto de inicio oficial: el dormitorio de la mansión (mirando al norte). */
export const PLAYER_SPAWN = { x: -72, z: 170, yaw: Math.PI };

/** Identidad visual de GasOil (latas, máquinas, carteles, gasolinera). */
export const GASOIL_BRAND = {
  orange: 0xff7a1a,
  charcoal: 0x1b1f26,
  yellow: 0xffd23f,
  white: 0xf6f2ea,
} as const;
