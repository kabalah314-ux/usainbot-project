import type { Rect } from "../world/zones/Zone";

/**
 * DISTRITOS (barrios) de la ciudad — fuente única para mapa, minimapa y HUD.
 *
 *  - "playable": ya está relleno (casas, tiendas, fábricas…).
 *  - "section":  EXPANDIDO con suelo y calles, listo para rellenar en
 *                fases posteriores (aquí entrará el contenido).
 *  - "future":   reservado más allá del mapa ampliado (se marca en el mapa).
 *
 * Añadir un barrio = una entrada aquí + (cuando toque rellenarlo) una Zone.
 */
export type DistrictKind =
  | "special"
  | "residential"
  | "commercial"
  | "industrial"
  | "service"
  | "park"
  | "gas";

export type DistrictStatus = "playable" | "section" | "future";

export interface District {
  id: string;
  name: string;
  kind: DistrictKind;
  status: DistrictStatus;
  rect: Rect;
  /** Punto del rótulo en el mapa. */
  label: { x: number; z: number };
}

export const DISTRICTS: District[] = [
  // ---------------- rellenos (jugables) ----------------
  {
    id: "mansion",
    name: "MANSIÓN USAINBOT",
    kind: "special",
    status: "playable",
    rect: { minX: -121, maxX: -8, minZ: 122, maxZ: 203 },
    label: { x: -64, z: 162 },
  },
  {
    id: "residencial",
    name: "BARRIO RESIDENCIAL",
    kind: "residential",
    status: "playable",
    rect: { minX: -8, maxX: 118, minZ: 78, maxZ: 203 },
    label: { x: 62, z: 150 },
  },
  {
    id: "comercial",
    name: "ZONA COMERCIAL",
    kind: "commercial",
    status: "playable",
    rect: { minX: -118, maxX: 10, minZ: -32, maxZ: 78 },
    label: { x: -74, z: 20 },
  },
  {
    id: "gasolinera",
    name: "GASOLINERA GASIL STOP",
    kind: "gas",
    status: "playable",
    rect: { minX: 10, maxX: 118, minZ: 38, maxZ: 78 },
    label: { x: 58, z: 62 },
  },
  {
    id: "parque",
    name: "PARQUE BOLT",
    kind: "park",
    status: "playable",
    rect: { minX: -121, maxX: 118, minZ: -178, maxZ: -98 },
    label: { x: 0, z: -140 },
  },
  {
    id: "sant_obrer",
    name: "SANT OBRER",
    kind: "industrial",
    status: "playable",
    rect: { minX: 118, maxX: 235, minZ: -100, maxZ: 130 },
    label: { x: 176, z: 22 },
  },

  // ---------------- SECCIONES expandidas (por rellenar) ----------------
  {
    id: "diagonal",
    name: "BARRIO DIAGONAL",
    kind: "residential",
    status: "section",
    rect: { minX: -185, maxX: -118, minZ: -95, maxZ: 115 },
    label: { x: -152, z: 10 },
  },
  {
    id: "puerto",
    name: "EL PUERTO",
    kind: "service",
    status: "section",
    rect: { minX: 235, maxX: 300, minZ: -95, maxZ: 115 },
    label: { x: 267, z: 10 },
  },
  {
    id: "centro",
    name: "CENTRO / DOWNTOWN",
    kind: "commercial",
    status: "section",
    rect: { minX: -185, maxX: 118, minZ: 203, maxZ: 264 },
    label: { x: -33, z: 233 },
  },
  {
    id: "triangulo",
    name: "EL TRIÁNGULO",
    kind: "residential",
    status: "section",
    rect: { minX: -420, maxX: -185, minZ: -243, maxZ: 264 },
    label: { x: -300, z: 10 },
  },
  {
    id: "merkantil",
    name: "ZONA MERCANTIL",
    kind: "commercial",
    status: "section",
    rect: { minX: -185, maxX: 300, minZ: 264, maxZ: 418 },
    label: { x: 58, z: 330 },
  },
  {
    id: "playa",
    name: "LA PLAYA",
    kind: "special",
    status: "section",
    rect: { minX: -185, maxX: 282, minZ: -243, maxZ: -178 },
    label: { x: 48, z: -210 },
  },

  // ---------------- más lejos (reservados) ----------------
  {
    id: "sierra",
    name: "SIERRA VIEJA",
    kind: "park",
    status: "future",
    rect: { minX: -245, maxX: -185, minZ: -60, maxZ: 60 },
    label: { x: -215, z: 0 },
  },
  {
    id: "puerto_comercial",
    name: "DÁRSENA COMERCIAL",
    kind: "service",
    status: "future",
    rect: { minX: 300, maxX: 360, minZ: -60, maxZ: 60 },
    label: { x: 330, z: 0 },
  },
  {
    id: "isla_faro",
    name: "ISLA DEL FARO",
    kind: "special",
    status: "future",
    rect: { minX: -60, maxX: 60, minZ: -303, maxZ: -243 },
    label: { x: 0, z: -273 },
  },
  {
    id: "ciudad_uni",
    name: "CIUDAD UNIVERSITARIA",
    kind: "residential",
    status: "future",
    rect: { minX: -60, maxX: 60, minZ: 264, maxZ: 324 },
    label: { x: 0, z: 294 },
  },
];

/** Distrito real (relleno o sección) que contiene un punto. */
export function districtAt(x: number, z: number): District | null {
  for (const d of DISTRICTS) {
    if (d.status === "future") continue;
    if (
      x >= d.rect.minX &&
      x <= d.rect.maxX &&
      z >= d.rect.minZ &&
      z <= d.rect.maxZ
    ) {
      return d;
    }
  }
  return null;
}

/** Colores por tipo de distrito (mapa). */
export const DISTRICT_COLORS: Record<DistrictKind, string> = {
  special: "#f2c21c",
  residential: "#e0894a",
  commercial: "#7fd1ae",
  industrial: "#c07a4a",
  service: "#9aa6b2",
  park: "#6fbf5a",
  gas: "#ff7a1a",
};
