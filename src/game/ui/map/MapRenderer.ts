import type { MapData, MapAreaKind, MapBuildingKind } from "../../world/map/MapData";
import type { POI } from "../../world/poi/POIRegistry";
import { POI_STYLES } from "../../data/poi";
import { drawMissionBadge } from "../../data/missionTypes";
import type { MissionType } from "../../data/missionTypes";
import { DISTRICTS, DISTRICT_COLORS } from "../../data/districts";

/** Paleta del mapa (estilizada, legible). */
const AREA: Record<MapAreaKind, string> = {
  park: "#7fc25a",
  lawn: "#98cc6c",
  water: "#4aa8e0",
  plaza: "#e6d3ae",
  parking: "#8e969e",
  pavement: "#ddd6c6",
  sand: "#e8d29a",
  court: "#c86a4a",
};
const BUILDING: Record<MapBuildingKind, string> = {
  home: "#ffcf3f",
  house: "#f1a67a",
  // (el azul y el violeta quedan reservados para misiones de coche / híbridas)
  shop: "#7fd1ae",
  apartment: "#d9b38c",
  gas: "#ff7a1a",
  garage: "#c3ccd4",
  canopy: "rgba(255,122,26,0.55)",
  factory: "#c07a4a",
};

/**
 * Dibuja el mapa base una sola vez en un canvas (px por metro fijo).
 * Minimapa y mapa completo lo reutilizan con drawImage: coste mínimo por frame.
 */
export function renderMapBase(map: MapData, ppm: number): HTMLCanvasElement {
  const B = map.bounds;
  const pad = 14;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((B.maxX - B.minX + pad * 2) * ppm);
  canvas.height = Math.ceil((B.maxZ - B.minZ + pad * 2) * ppm);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const X = (x: number): number => (x - B.minX + pad) * ppm;
  const Z = (z: number): number => (z - B.minZ + pad) * ppm;

  ctx.fillStyle = "#6f8f5a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#a8d27a";
  ctx.fillRect(X(B.minX), Z(B.minZ), (B.maxX - B.minX) * ppm, (B.maxZ - B.minZ) * ppm);

  for (const a of map.areas) {
    ctx.fillStyle = AREA[a.kind];
    if (a.rect) {
      ctx.fillRect(X(a.rect.minX), Z(a.rect.minZ), (a.rect.maxX - a.rect.minX) * ppm, (a.rect.maxZ - a.rect.minZ) * ppm);
    } else if (a.circle) {
      ctx.beginPath();
      ctx.arc(X(a.circle.x), Z(a.circle.z), a.circle.r * ppm, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Aceras y luego calzadas (las calzadas tapan las aceras en los cruces)
  ctx.fillStyle = "#e4ded0";
  for (const r of map.roads) {
    const sx = r.axis === "z" ? r.sidewalk : 0;
    const sz = r.axis === "x" ? r.sidewalk : 0;
    ctx.fillRect(X(r.minX - sx), Z(r.minZ - sz), (r.maxX - r.minX + sx * 2) * ppm, (r.maxZ - r.minZ + sz * 2) * ppm);
  }
  ctx.fillStyle = "#4b5159";
  for (const r of map.roads) ctx.fillRect(X(r.minX), Z(r.minZ), (r.maxX - r.minX) * ppm, (r.maxZ - r.minZ) * ppm);
  ctx.strokeStyle = "rgba(242,208,74,0.8)";
  ctx.lineWidth = Math.max(1, ppm * 0.3);
  ctx.setLineDash([ppm * 3, ppm * 3]);
  for (const r of map.roads) {
    ctx.beginPath();
    if (r.axis === "x") {
      const z = Z((r.minZ + r.maxZ) / 2);
      ctx.moveTo(X(r.minX), z);
      ctx.lineTo(X(r.maxX), z);
    } else {
      const x = X((r.minX + r.maxX) / 2);
      ctx.moveTo(x, Z(r.minZ));
      ctx.lineTo(x, Z(r.maxZ));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.lineWidth = Math.max(1, ppm * 0.5);
  ctx.strokeStyle = "#2b333c";
  for (const b of map.buildings) {
    const x = X(b.rect.minX);
    const z = Z(b.rect.minZ);
    const w = (b.rect.maxX - b.rect.minX) * ppm;
    const h = (b.rect.maxZ - b.rect.minZ) * ppm;
    ctx.fillStyle = BUILDING[b.kind];
    ctx.fillRect(x, z, w, h);
    if (b.kind !== "canopy") ctx.strokeRect(x, z, w, h);
  }

  // --- DISTRITOS (barrios): el mapa se lee por zonas.
  // Jugables → borde + nombre. Futuros → gris, borde discontinuo y "PRÓXIMAMENTE".
  for (const d of DISTRICTS) {
    const x = X(d.rect.minX);
    const z = Z(d.rect.minZ);
    const w = (d.rect.maxX - d.rect.minX) * ppm;
    const h = (d.rect.maxZ - d.rect.minZ) * ppm;
    const cx = x + w / 2;
    const cz = z + h / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (d.status === "future") {
      ctx.fillStyle = "rgba(28,34,42,0.55)";
      ctx.fillRect(x, z, w, h);
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#7d8994";
      ctx.strokeRect(x, z, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#c3ccd4";
      ctx.font = `900 ${Math.max(11, ppm * 5)}px monospace`;
      ctx.fillText(d.name, cx, cz - 9);
      ctx.fillStyle = "#ffb36b";
      ctx.font = `900 ${Math.max(9, ppm * 4)}px monospace`;
      ctx.fillText("PRÓXIMAMENTE", cx, cz + 10);
    } else if (d.status === "section") {
      // Sección EXPANDIDA (suelo y calles) todavía por rellenar: trama + rótulo.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, z, w, h);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = -h; i < w; i += 9) {
        ctx.beginPath();
        ctx.moveTo(x + i, z + h);
        ctx.lineTo(x + i + h, z);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.strokeStyle = DISTRICT_COLORS[d.kind];
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, z, w, h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const sx = X(d.label.x);
      const sz = Z(d.label.z);
      ctx.font = `900 ${Math.max(11, ppm * 5)}px monospace`;
      const sw = ctx.measureText(d.name).width;
      ctx.fillStyle = "rgba(13,17,23,0.8)";
      ctx.fillRect(sx - sw / 2 - 8, sz - 17, sw + 16, 34);
      ctx.fillStyle = DISTRICT_COLORS[d.kind];
      ctx.fillText(d.name, sx, sz - 5);
      ctx.fillStyle = "#8b98a6";
      ctx.font = `900 ${Math.max(8, ppm * 3.4)}px monospace`;
      ctx.fillText("SECCIÓN · POR RELLENAR", sx, sz + 9);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.strokeStyle = DISTRICT_COLORS[d.kind];
      ctx.strokeRect(x, z, w, h);
      ctx.globalAlpha = 1;
      const lx = X(d.label.x);
      const lz = Z(d.label.z);
      ctx.font = `900 ${Math.max(11, ppm * 5)}px monospace`;
      const tw = ctx.measureText(d.name).width;
      ctx.fillStyle = "rgba(13,17,23,0.8)";
      ctx.fillRect(lx - tw / 2 - 8, lz - 11, tw + 16, 22);
      ctx.fillStyle = DISTRICT_COLORS[d.kind];
      ctx.fillText(d.name, lx, lz);
    }
    ctx.restore();
  }
  return canvas;
}

/** Icono de POI (círculo con glifo), compartido por minimapa y mapa. */
export function drawPOIIcon(
  ctx: CanvasRenderingContext2D,
  poi: POI,
  x: number,
  y: number,
  r: number,
  highlight = false,
  missionType: MissionType | null = null
): void {
  // Misiones (NPC que la ofrece u objetivo actual): disco con el color e icono del tipo
  const type = missionType ?? poi.missionType ?? null;
  if (type) {
    drawMissionBadge(ctx, type, x, y, r, highlight);
    return;
  }
  const style = POI_STYLES[poi.category];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#15191f";
  ctx.fill();
  ctx.lineWidth = highlight ? 3 : 2;
  ctx.strokeStyle = style.color;
  ctx.stroke();
  ctx.fillStyle = style.color;
  ctx.font = `900 ${Math.round(r * 1.25)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.glyph, x, y + 1);
}

/** Flecha del jugador (apunta a `angle` en radianes de pantalla; 0 = arriba). */
export function drawPlayerArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.72, size * 0.75);
  ctx.lineTo(0, size * 0.38);
  ctx.lineTo(-size * 0.72, size * 0.75);
  ctx.closePath();
  ctx.fillStyle = "#5ff7d6";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0b1a18";
  ctx.stroke();
  ctx.restore();
}

/** Icono del coche (jugador conduciendo): carrocería amarilla con parabrisas. */
export function drawCarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = size * 1.0;
  const h = size * 1.9;
  ctx.fillStyle = "#f2c21c";
  ctx.strokeStyle = "#0b1a18";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2e9a42";
  ctx.fillRect(-w * 0.12, -h / 2 + 2, w * 0.24, h - 4);
  ctx.fillStyle = "#9fe6ff";
  ctx.fillRect(-w * 0.36, -h * 0.2, w * 0.72, h * 0.16);
  ctx.restore();
}

export const MAP_PAD = 14;
