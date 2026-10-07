/**
 * Tipos de misión e identidad visual (fuente única).
 *
 *   ON_FOOT  → estilo normal del juego (amarillo)
 *   VEHICLE  → AZUL (reservado: ningún otro sistema usa este azul)
 *   HYBRID   → violeta + icono combinado corredor/coche
 */
export type MissionType = "ON_FOOT" | "VEHICLE" | "HYBRID";

/** Qué estado del jugador exige un objetivo. */
export type RequiredMode = "ON_FOOT" | "VEHICLE" | "ANY";

export interface MissionTypeStyle {
  /** "MISIÓN DE CONDUCCIÓN" */
  label: string;
  /** "COCHE" */
  short: string;
  color: string;
  /** Color secundario (texto sobre el color). */
  ink: string;
  /** Color HDR para balizas 3D (bloom). */
  hdr: [number, number, number];
}

export const MISSION_TYPE_STYLE: Record<MissionType, MissionTypeStyle> = {
  ON_FOOT: { label: "MISIÓN A PIE", short: "A PIE", color: "#ffe14d", ink: "#1b1f26", hdr: [2.2, 1.6, 0.3] },
  VEHICLE: { label: "MISIÓN DE CONDUCCIÓN", short: "COCHE", color: "#3d8bff", ink: "#ffffff", hdr: [0.35, 1.0, 2.8] },
  HYBRID: { label: "MISIÓN HÍBRIDA", short: "HÍBRIDA", color: "#c77dff", ink: "#1b1f26", hdr: [1.7, 0.7, 2.4] },
};

// ------------------------------------------------------------------ SVG (DOM)

const RUNNER_PATH =
  "M14.5 2.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM9.6 7.6l4.3-.9c.5-.1 1 .1 1.3.5l1.9 2.6 2.6.9-.6 1.8-3.1-1-1.3-1.7-1.1 3.7 2.8 2.4V22h-2v-5l-2.9-2.3-1.4 3.4-4.8 2.6-1-1.7 4.2-2.3 2-6.1-1.4.4-1.7 2.6-1.7-1.1z";
const CAR_PATH =
  "M5.2 10.4 6.6 6.8A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3l1.4 3.6A2 2 0 0 1 21 12.3V17h-1.6a2.4 2.4 0 0 1-4.8 0H9.4a2.4 2.4 0 0 1-4.8 0H3v-4.7a2 2 0 0 1 2.2-1.9zM7.4 10.3h9.2L15.5 7.4h-7z";

/** Icono SVG (hereda `color` del contenedor). */
export function missionIconSVG(type: MissionType | RequiredMode, size = 16): string {
  const svg = (path: string, w = 24): string =>
    `<svg class="ub-micon" width="${(size * w) / 24}" height="${size}" viewBox="0 0 ${w} 24" fill="currentColor" aria-hidden="true">${path}</svg>`;
  if (type === "VEHICLE") return svg(`<path d="${CAR_PATH}"/>`);
  if (type === "HYBRID")
    return svg(`<g transform="scale(.8) translate(-2 3)"><path d="${RUNNER_PATH}"/></g><g transform="translate(16 2) scale(.72)"><path d="${CAR_PATH}"/></g>`, 34);
  if (type === "ANY") return "";
  return svg(`<path d="${RUNNER_PATH}"/>`);
}

/** Etiqueta HTML "[icono] MISIÓN DE CONDUCCIÓN" con el color del tipo. */
export function missionTag(type: MissionType, short = false): string {
  const s = MISSION_TYPE_STYLE[type];
  return `<span class="ub-mtag ub-mtag--${type.toLowerCase()}" style="--mt:${s.color};--mt-ink:${s.ink}">${missionIconSVG(type, 13)}${short ? s.short : s.label}</span>`;
}

// ------------------------------------------------------------------ Canvas (mapa, marcadores 3D)

function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 10, r / 10);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(2.5, -6.5, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.2, -3.2); // torso
  ctx.lineTo(-1, 2);
  ctx.moveTo(-1, 2); // pierna trasera
  ctx.lineTo(-5, 4);
  ctx.moveTo(-1, 2); // pierna delantera
  ctx.lineTo(1.8, 5);
  ctx.lineTo(1.2, 8);
  ctx.moveTo(-4.5, -2); // brazos
  ctx.lineTo(0.8, -2.6);
  ctx.lineTo(4.8, -0.4);
  ctx.stroke();
  ctx.restore();
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 10, r / 10);
  ctx.beginPath();
  ctx.moveTo(-7.5, 3);
  ctx.lineTo(-7.5, -0.5);
  ctx.lineTo(-5, -1.5);
  ctx.lineTo(-3, -5);
  ctx.lineTo(3.5, -5);
  ctx.lineTo(5.5, -1.5);
  ctx.lineTo(7.5, -0.5);
  ctx.lineTo(7.5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(-2.2, -4, 4.6, 2.3);
  ctx.globalCompositeOperation = "source-over";
  for (const wx of [-4.2, 4.2]) {
    ctx.beginPath();
    ctx.arc(wx, 3.4, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Disco de color con el icono del tipo (minimapa, mapa, marcadores sobre NPC).
 * El dibujo se hace en blanco/tinta sobre el color del tipo.
 */
export function drawMissionBadge(
  ctx: CanvasRenderingContext2D,
  type: MissionType,
  x: number,
  y: number,
  r: number,
  highlight = false
): void {
  const s = MISSION_TYPE_STYLE[type];
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (type === "HYBRID") {
    // Mitad a pie (amarillo) y mitad coche (azul) con aro violeta
    ctx.save();
    ctx.clip();
    ctx.fillStyle = MISSION_TYPE_STYLE.ON_FOOT.color;
    ctx.fillRect(x - r, y - r, r, r * 2);
    ctx.fillStyle = MISSION_TYPE_STYLE.VEHICLE.color;
    ctx.fillRect(x, y - r, r, r * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = s.color;
    ctx.fill();
  }
  ctx.lineWidth = highlight ? Math.max(2.5, r * 0.22) : Math.max(1.5, r * 0.14);
  ctx.strokeStyle = type === "HYBRID" ? s.color : "#15191f";
  ctx.stroke();
  ctx.fillStyle = type === "VEHICLE" ? "#ffffff" : "#15191f";
  ctx.strokeStyle = ctx.fillStyle;
  if (type === "VEHICLE") drawCar(ctx, x, y + r * 0.05, r * 0.62);
  else if (type === "ON_FOOT") drawRunner(ctx, x, y, r * 0.62);
  else {
    drawRunner(ctx, x - r * 0.4, y, r * 0.42);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    drawCar(ctx, x + r * 0.42, y + r * 0.08, r * 0.4);
  }
  ctx.restore();
}
