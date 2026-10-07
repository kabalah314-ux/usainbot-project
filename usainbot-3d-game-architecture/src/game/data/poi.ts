/**
 * Categorías de puntos de interés: icono, color y prioridad de dibujo.
 * Añadir una categoría nueva = añadir una entrada aquí.
 */
export type POICategory =
  | "HOUSE"
  | "GARAGE"
  | "GASOIL_MACHINE"
  | "GAS_STATION"
  | "SHOP"
  | "PARK"
  | "MISSION_NPC"
  | "EXIT"
  | "RACE"
  | "CHECKPOINT"
  | "TARGET"
  | "VEHICLE"
  | "GASOIL_PICKUP"
  | "PARKING"
  | "RACE_START"
  | "RACE_FINISH";

export interface POICategoryStyle {
  label: string;
  /** Carácter del icono (fuentes estándar, sin emoji). */
  glyph: string;
  color: string;
  /** Mayor = se dibuja encima. */
  priority: number;
  /** Mostrar en el minimapa (el mapa completo los muestra todos). */
  minimap: boolean;
}

export const POI_STYLES: Record<POICategory, POICategoryStyle> = {
  HOUSE: { label: "Casa de UsainBot", glyph: "⌂", color: "#ffcf3f", priority: 5, minimap: true },
  GARAGE: { label: "Garaje", glyph: "G", color: "#b8c4cf", priority: 3, minimap: true },
  GASOIL_MACHINE: { label: "Máquina GasOil", glyph: "ϟ", color: "#ff7a1a", priority: 4, minimap: true },
  GAS_STATION: { label: "Gasolinera", glyph: "S", color: "#ff7a1a", priority: 4, minimap: true },
  SHOP: { label: "Tienda", glyph: "$", color: "#5bc0eb", priority: 2, minimap: true },
  PARK: { label: "Parque", glyph: "♣", color: "#5cc45a", priority: 2, minimap: true },
  MISSION_NPC: { label: "Misión", glyph: "!", color: "#ffe14d", priority: 9, minimap: true },
  EXIT: { label: "Salida", glyph: "»", color: "#e8eef4", priority: 1, minimap: false },
  RACE: { label: "Carrera", glyph: "⚑", color: "#ff4d6d", priority: 8, minimap: true },
  CHECKPOINT: { label: "Checkpoint", glyph: "◆", color: "#ffe14d", priority: 9, minimap: true },
  TARGET: { label: "Objetivo", glyph: "◎", color: "#ffe14d", priority: 9, minimap: true },
  VEHICLE: { label: "Vehículo", glyph: "▣", color: "#f2c21c", priority: 3, minimap: true },
  GASOIL_PICKUP: { label: "Lata de GasOil", glyph: "•", color: "#ff9a4a", priority: 2, minimap: true },
  PARKING: { label: "Aparcamiento", glyph: "P", color: "#5b9bff", priority: 2, minimap: true },
  RACE_START: { label: "Salida de carrera", glyph: "▶", color: "#6dff9c", priority: 7, minimap: true },
  RACE_FINISH: { label: "Meta", glyph: "⚑", color: "#ff4d6d", priority: 7, minimap: true },
};
