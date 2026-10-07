/**
 * Trazado de la ciudad (metros). Norte = -Z.
 * Las carreteras son datos: la red viaria, las aceras, los pasos de cebra,
 * el minimapa y las manzanas se derivan de aquí.
 *
 * Barrios conectados por calles reales (un único espacio jugable):
 *   - Barrio Bolt (original, oeste-central)
 *   - Sant Obrer (obrero, este)
 *   - Barrio Diagonal (oeste) · El Puerto (este) · La Playa (norte) ·
 *     Centro / Downtown (sur)  →  SECCIONES expandidas, listas para rellenar
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
  // ===== eje principal (extendido al sur → Centro / Downtown) =====
  { id: "main", name: "AV. BOLT", axis: "z", at: 0, from: -95, to: 264, width: 14, sidewalk: 3 },

  // ===== transversales (extendidas a OESTE y ESTE: unen todos los barrios) =====
  { id: "park", name: "C. DEL PARQUE", axis: "x", at: -95, from: -185, to: 296, width: 12, sidewalk: 3 },
  { id: "shops", name: "C. COMERCIO", axis: "x", at: -25, from: -185, to: 296, width: 12, sidewalk: 3 },
  { id: "gas", name: "C. GASOLINA", axis: "x", at: 45, from: -185, to: 296, width: 12, sidewalk: 3 },
  { id: "home", name: "C. RESIDENCIAL", axis: "x", at: 115, from: -185, to: 296, width: 12, sidewalk: 3 },

  // ===== barrio Bolt (original) =====
  { id: "west", name: "C. OESTE", axis: "z", at: -110, from: -95, to: 115, width: 10, sidewalk: 3 },
  { id: "east", name: "C. ESTE", axis: "z", at: 110, from: -95, to: 115, width: 10, sidewalk: 3 },

  // ===== Sant Obrer (retícula irregular) =====
  { id: "obrera_v1", name: "C. TALLER", axis: "z", at: 137, from: -95, to: 115, width: 10, sidewalk: 2.5 },
  { id: "obrera_v2", name: "C. FUNDICIÓN", axis: "z", at: 165, from: -62, to: 115, width: 11, sidewalk: 2.5 },
  { id: "obrera_v3", name: "C. FRAGUA", axis: "z", at: 205, from: -95, to: 70, width: 10, sidewalk: 2.5 },
  { id: "obrera_h1", name: "C. YUNQUE", axis: "x", at: -62, from: -400, to: 296, width: 10, sidewalk: 2.5 },
  { id: "obrera_h3", name: "C. MACHACO", axis: "x", at: 70, from: -185, to: 296, width: 10, sidewalk: 2.5 },
  { id: "rambla", name: "RAMBLA OBRERA", axis: "x", at: 8, from: -400, to: 296, width: 16, sidewalk: 3.5 },

  // ===== BARRIO DIAGONAL (oeste) — sección a rellenar =====
  { id: "diag_v1", name: "C. DEL ENSANCHE", axis: "z", at: -145, from: -95, to: 115, width: 10, sidewalk: 2.5 },
  { id: "diag_v2", name: "C. DEL PONENTE", axis: "z", at: -170, from: -243, to: 115, width: 10, sidewalk: 2.5 },

  // ===== EL PUERTO (este) — sección a rellenar =====
  { id: "pto_v1", name: "C. DEL ASTILLERO", axis: "z", at: 232, from: -95, to: 115, width: 10, sidewalk: 2.5 },
  { id: "pto_v2", name: "C. DEL MUELLE", axis: "z", at: 255, from: -95, to: 115, width: 11, sidewalk: 2.5 },
  { id: "pto_v3", name: "C. DEL FARO", axis: "z", at: 282, from: -243, to: 115, width: 10, sidewalk: 2.5 },

  // ===== CENTRO / DOWNTOWN (sur) — la franja este queda para el CENTRO COMERCIAL =====
  // (sin calles que crucen la manzana: el centro comercial es un solo solar grande)
  { id: "cen_h1", name: "GRAN VÍA SUR", axis: "x", at: 225, from: -185, to: 118, width: 12, sidewalk: 3 },
  { id: "cen_v1", name: "C. CENTRAL", axis: "z", at: -55, from: 203, to: 264, width: 10, sidewalk: 2.5 },

  // ===== LA PLAYA (norte) — sección a rellenar (se llega por los laterales) =====
  { id: "playa_h1", name: "C. DE LA ARENA", axis: "x", at: -190, from: -185, to: 282, width: 10, sidewalk: 2.5 },
  { id: "playa_h2", name: "PASEO MARÍTIMO", axis: "x", at: -215, from: -185, to: 282, width: 11, sidewalk: 3 },
  { id: "playa_v1", name: "C. DEL ESPIGÓN", axis: "z", at: -55, from: -243, to: -178, width: 10, sidewalk: 2.5 },
  { id: "playa_v2", name: "C. DE LOS BOTES", axis: "z", at: 40, from: -243, to: -178, width: 10, sidewalk: 2.5 },
];

/** Límites jugables (mapa ampliado: merkantil al sur + EL TRIÁNGULO al oeste). */
export const CITY_BOUNDS = { minX: -420, maxX: 330, minZ: -243, maxZ: 452 };

/** Vista del mapa completo: incluye el anillo de distritos aún por venir. */
export const MAP_VIEW_BOUNDS = { minX: -470, maxX: 360, minZ: -303, maxZ: 452 };

/** Punto de inicio oficial: el dormitorio de la mansión (mirando al norte). */
export const PLAYER_SPAWN = { x: -72, z: 170, yaw: Math.PI };

/** Identidad visual de GasOil (latas, máquinas, carteles, gasolinera). */
export const GASOIL_BRAND = {
  orange: 0xff7a1a,
  charcoal: 0x1b1f26,
  yellow: 0xffd23f,
  white: 0xf6f2ea,
} as const;
