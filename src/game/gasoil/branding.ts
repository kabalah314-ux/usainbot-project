import * as THREE from "three";
import { GASOIL_BRAND } from "../data/cityLayout";
import { createCanvasTexture, toCss } from "../utils/textures";
import { cellUV } from "../utils/QuadBatcher";
import type { UVRect } from "../utils/QuadBatcher";

/**
 * Identidad visual de GASIL (marca ficticia del combustible del juego):
 * naranja eléctrico + carbón, logotipo de gota con rayo. Un único atlas
 * 1024×1024 alimenta máquinas, anuncios, gasolinera, latas y el icono del HUD.
 * IMPORTANTE: la marca se llama GASIL y aparece así en todo el juego.
 */
const O = toCss(GASOIL_BRAND.orange);
const K = toCss(GASOIL_BRAND.charcoal);
const Y = toCss(GASOIL_BRAND.yellow);
const W = toCss(GASOIL_BRAND.white);
const S = 1024;

type Ctx = CanvasRenderingContext2D;

/** Gota con rayo (logotipo de GASIL). */
function drawLogo(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = O;
  ctx.strokeStyle = K;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.25);
  ctx.bezierCurveTo(r * 0.9, -r * 0.2, r, r * 0.25, r, r * 0.35);
  ctx.arc(0, r * 0.35, r, 0, Math.PI);
  ctx.bezierCurveTo(-r, r * 0.25, -r * 0.9, -r * 0.2, 0, -r * 1.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = K;
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.55);
  ctx.lineTo(-r * 0.4, r * 0.5);
  ctx.lineTo(-r * 0.02, r * 0.45);
  ctx.lineTo(-r * 0.2, r * 1.1);
  ctx.lineTo(r * 0.42, r * 0.05);
  ctx.lineTo(r * 0.05, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Logotipo GASIL (texto con contorno). */
function wordmark(ctx: Ctx, x: number, y: number, size: number, align: CanvasTextAlign = "center"): void {
  ctx.save();
  ctx.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = O;
  ctx.strokeText("GASIL", x, y);
  ctx.fillStyle = W;
  ctx.fillText("GASIL", x, y);
  ctx.restore();
}

/** Lata de GASIL (la misma en máquinas, anuncios e icono del HUD). */
export function drawCan(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w * 0.12;
  ctx.fillStyle = "#9aa3ab";
  ctx.fillRect(x + w * 0.12, y, w * 0.76, h * 0.08);
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, "#c95a0c");
  body.addColorStop(0.35, O);
  body.addColorStop(0.55, "#ffb36b");
  body.addColorStop(1, "#b34e08");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.06, w, h * 0.94, r);
  ctx.fill();
  ctx.fillStyle = K;
  ctx.fillRect(x, y + h * 0.36, w, h * 0.34);
  drawLogo(ctx, x + w / 2, y + h * 0.53, w * 0.16);
  ctx.fillStyle = W;
  ctx.font = `italic 900 ${Math.round(w * 0.17)}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GASIL", x + w / 2, y + h * 0.82);
}

function drawMachineFront(ctx: Ctx): void {
  const [x0, y0, w, h] = [0, 0, 256, 512];
  ctx.fillStyle = K;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = O;
  ctx.fillRect(x0, y0, w, 92);
  wordmark(ctx, 128, 48, 50);
  // Escaparate iluminado con latas
  const glass = ctx.createLinearGradient(0, 110, 0, 330);
  glass.addColorStop(0, "#fff4de");
  glass.addColorStop(1, "#ffd9a8");
  ctx.fillStyle = glass;
  ctx.fillRect(22, 108, 212, 226);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) drawCan(ctx, 32 + c * 51, 118 + r * 72, 38, 62);
    ctx.fillStyle = "#6b7178";
    ctx.fillRect(22, 182 + r * 72, 212, 4);
  }
  ctx.strokeStyle = O;
  ctx.lineWidth = 5;
  ctx.strokeRect(22, 108, 212, 226);
  ctx.fillStyle = Y;
  ctx.font = `900 22px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("ROBOT FUEL", 128, 362);
  // Botonera, ranura y bandeja
  ctx.fillStyle = "#2c323b";
  ctx.fillRect(40, 382, 176, 50);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? O : "#59616b";
    ctx.beginPath();
    ctx.arc(64 + i * 40, 407, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#0c0e11";
  ctx.fillRect(70, 450, 116, 38);
  ctx.fillStyle = O;
  ctx.fillRect(70, 450, 116, 4);
}

const ADS: Array<{ title: string; sub: string; tag: string; bg: string }> = [
  { title: "ROBOT FUEL", sub: "ENERGÍA PARA MÁQUINAS", tag: "ENERGY FOR MACHINES", bg: K },
  { title: "RUN FURTHER", sub: "1 LATA = 42 KM", tag: "CORRE MÁS LEJOS", bg: "#12324a" },
  { title: "HUMANS DON'T", sub: "NEED THIS", tag: "SOLO PARA ROBOTS", bg: "#3b1f4f" },
  { title: "0,00 s", sub: "RÉCORD CON GASIL", tag: "PATROCINADOR DE USAINBOT", bg: "#1d4a2c" },
];

function drawAd(ctx: Ctx, i: number): void {
  const ad = ADS[i];
  const x = 256;
  const y = i * 256;
  ctx.fillStyle = ad.bg;
  ctx.fillRect(x, y, 512, 256);
  ctx.fillStyle = O;
  ctx.beginPath();
  ctx.moveTo(x + 330, y);
  ctx.lineTo(x + 512, y);
  ctx.lineTo(x + 512, y + 256);
  ctx.lineTo(x + 250, y + 256);
  ctx.closePath();
  ctx.fill();
  drawCan(ctx, x + 380, y + 40, 92, 158);
  wordmark(ctx, x + 24, y + 52, 58, "left");
  ctx.fillStyle = W;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `900 40px "Arial Black", Impact, sans-serif`;
  ctx.fillText(ad.title, x + 26, y + 124);
  ctx.fillStyle = Y;
  ctx.font = `900 26px "Arial Black", Impact, sans-serif`;
  ctx.fillText(ad.sub, x + 26, y + 166);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 18px Arial, sans-serif`;
  ctx.fillText(ad.tag, x + 26, y + 214);
  ctx.strokeStyle = W;
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 3, y + 3, 506, 250);
}

function drawPylon(ctx: Ctx): void {
  const [x, y] = [768, 0];
  ctx.fillStyle = K;
  ctx.fillRect(x, y, 256, 512);
  ctx.fillStyle = O;
  ctx.fillRect(x, y, 256, 170);
  drawLogo(ctx, x + 128, y + 70, 42);
  wordmark(ctx, x + 128, y + 146, 40);
  const prices: Array<[string, string]> = [
    ["ROBOT", "1,99"],
    ["DIESEL", "2,49"],
    ["TURBO", "3,10"],
    ["HUMANO", "----"],
  ];
  prices.forEach(([label, price], i) => {
    const py = y + 200 + i * 76;
    ctx.fillStyle = "#0c0e11";
    ctx.fillRect(x + 14, py, 228, 62);
    ctx.fillStyle = W;
    ctx.font = `900 22px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 24, py + 31);
    ctx.fillStyle = i === 3 ? "#ff4d4d" : Y;
    ctx.font = `900 34px "Courier New", monospace`;
    ctx.textAlign = "right";
    ctx.fillText(price, x + 234, py + 32);
  });
}

function drawFascia(ctx: Ctx): void {
  const [x, y] = [768, 512];
  ctx.fillStyle = O;
  ctx.fillRect(x, y, 256, 64);
  ctx.fillStyle = K;
  ctx.fillRect(x, y + 54, 256, 10);
  wordmark(ctx, x + 100, y + 28, 30);
  ctx.fillStyle = K;
  ctx.font = `900 24px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("STOP", x + 176, y + 29);
}

function drawPumpFace(ctx: Ctx): void {
  const [x, y] = [768, 576];
  ctx.fillStyle = W;
  ctx.fillRect(x, y, 128, 192);
  ctx.fillStyle = O;
  ctx.fillRect(x, y, 128, 40);
  drawLogo(ctx, x + 64, y + 22, 12);
  ctx.fillStyle = "#0c0e11";
  ctx.fillRect(x + 14, y + 54, 100, 44);
  ctx.fillStyle = "#6dff9c";
  ctx.font = `700 26px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("00.00", x + 64, y + 77);
  ctx.fillStyle = K;
  ctx.fillRect(x + 30, y + 118, 68, 52);
  ctx.fillStyle = O;
  ctx.fillRect(x + 30, y + 118, 68, 8);
}

/** Panel blanco "caliente" (luces bajo la marquesina, dispara el bloom). */
function drawLightPanel(ctx: Ctx): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(896, 576, 128, 64);
}

export const GASOIL_UV = {
  machine: cellUV(0, 0, 256, 512, S, S),
  ads: ADS.map((_, i) => cellUV(256, i * 256, 512, 256, S, S)),
  pylon: cellUV(768, 0, 256, 512, S, S),
  fascia: cellUV(768, 512, 256, 64, S, S),
  pump: cellUV(768, 576, 128, 192, S, S),
  light: cellUV(900, 580, 120, 56, S, S),
  can: cellUV(904, 650, 112, 180, S, S),
} satisfies Record<string, UVRect | UVRect[]>;

export function createGasOilAtlas(): THREE.MeshBasicMaterial {
  const texture = createCanvasTexture(
    S,
    S,
    (ctx) => {
      ctx.fillStyle = K;
      ctx.fillRect(0, 0, S, S);
      drawMachineFront(ctx);
      ADS.forEach((_, i) => drawAd(ctx, i));
      drawPylon(ctx);
      drawFascia(ctx);
      drawPumpFace(ctx);
      drawLightPanel(ctx);
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(896, 640, 128, 200);
      drawCan(ctx, 912, 656, 96, 168);
    },
    true,
    true
  );
  // Ligeramente por encima de 1: los carteles "iluminados" brillan con el bloom.
  return new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(1.08, 1.08, 1.08) });
}

/** Icono de la lata para el HUD (misma ilustración que en el mundo). */
export function createCanIconDataURL(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawCan(ctx, 10, 4, 44, 88);
  return canvas.toDataURL();
}
