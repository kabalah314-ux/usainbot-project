/**
 * Controles de PC para la interfaz: teclas dibujadas como "keycaps".
 * Fuente única para menú, ayuda del HUD, avisos y diálogos.
 */
export function kbd(key: string): string {
  const wide = key.length > 2 ? " ub-key--wide" : "";
  return `<kbd class="ub-key${wide}">${key}</kbd>`;
}

export interface ControlHint {
  keys: string[];
  label: string;
}

/** Ayuda compacta (HUD) — la pide el diseño de esta fase. */
export const HUD_HINTS: ControlHint[] = [
  { keys: ["WASD"], label: "MOVER" },
  { keys: ["←↑↓→"], label: "CÁMARA" },
  { keys: ["SPACE"], label: "SALTAR" },
  { keys: ["SHIFT"], label: "TURBO" },
  { keys: ["G"], label: "TOMAR GASIL" },
  { keys: ["E"], label: "INTERACTUAR" },
  { keys: ["ESC"], label: "PAUSA" },
];

/** Ayuda compacta en el coche. */
export const HUD_HINTS_VEHICLE: ControlHint[] = [
  { keys: ["WASD"], label: "CONDUCIR" },
  { keys: ["SPACE"], label: "FRENO DE MANO" },
  { keys: ["E"], label: "SALIR" },
  { keys: ["←↑↓→"], label: "CÁMARA" },
  { keys: ["ESC"], label: "PAUSA" },
];

/** Lista completa (menú de inicio / pausa). */
export const CONTROL_HINTS: ControlHint[] = [
  { keys: ["W", "A", "S", "D"], label: "Moverse" },
  { keys: ["←", "↑", "↓", "→"], label: "Mover la cámara" },
  { keys: ["C"], label: "Centrar la cámara detrás" },
  { keys: ["SPACE"], label: "Saltar (doble salto en el aire)" },
  { keys: ["SHIFT"], label: "TURBO (gasta la barra)" },
  { keys: ["G"], label: "Beber GASIL (recarga el turbo)" },
  { keys: ["E"], label: "Hablar / usar / ENTRAR y SALIR del coche" },
  { keys: ["SPACE"], label: "En coche: freno de mano" },
  { keys: ["M"], label: "Mapa del barrio" },
  { keys: ["H"], label: "Mostrar / ocultar ayuda" },
  { keys: ["ESC"], label: "Pausa (lista de misiones)" },
  { keys: ["F3"], label: "Debug (desarrollo)" },
  { keys: ["F4"], label: "Calidad gráfica" },
];

export function renderHint(h: ControlHint): string {
  return `<span class="ub-ctrl">${h.keys.map(kbd).join("")}<span class="ub-ctrl__label">${h.label}</span></span>`;
}
