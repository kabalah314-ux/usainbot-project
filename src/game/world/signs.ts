import * as THREE from "three";
import { createCanvasTexture } from "../utils/textures";
import { cellUV } from "../utils/QuadBatcher";
import type { UVRect } from "../utils/QuadBatcher";
import { ROADS } from "../data/cityLayout";

/**
 * Atlas de rótulos (1024×1024, celdas de 256×64): tiendas, calles,
 * accesos y elementos de la mansión. Todos los rótulos = 1 draw call.
 */
interface SignDef {
  text: string;
  sub?: string;
  bg: string;
  fg: string;
  border?: string;
  font?: string;
}

const SHOP_FONT = `900 34px "Arial Black", Impact, sans-serif`;

const SIGNS: Record<string, SignDef> = {
  roboburger: { text: "ROBO-BURGER", sub: "MENÚ TORNILLO 4,99", bg: "#d8322b", fg: "#ffd23f" },
  pixelvideo: { text: "PIXEL VIDEO", sub: "ALQUILER · VENTA · 2x1", bg: "#4b2a8a", fg: "#7ef2ff" },
  super24: { text: "SÚPER 24H", sub: "ABIERTO SIEMPRE", bg: "#2e9a42", fg: "#ffffff" },
  farmacia: { text: "FARMACIA", sub: "+ DE GUARDIA +", bg: "#1e8f5a", fg: "#e9fff4" },
  tornillos: { text: "TORNILLOS PACO", sub: "FERRETERÍA ROBÓTICA", bg: "#2f6fb3", fg: "#ffd23f" },
  lavanderia: { text: "LAVANDERÍA 2000", sub: "SECADO EN 0,00 s", bg: "#5bc0eb", fg: "#10243b" },
  cafe: { text: "CAFÉ METEORO", sub: "CAFÉ · CHURROS · ACEITE", bg: "#6b3d22", fg: "#ffe0a3" },
  peluqueria: { text: "PELUQUERÍA RAYO", sub: "CORTES AERODINÁMICOS", bg: "#ef7db5", fg: "#2b2d42" },
  taller: { text: "TALLER TITO", sub: "REPARAMOS DE TODO", bg: "#1b1f26", fg: "#ff7a1a", border: "#ff7a1a" },
  mansion: { text: "USAINBOT", sub: "MANSIÓN DEL CAMPEÓN", bg: "#1d4a2c", fg: "#f2c21c", border: "#f2c21c" },
  plaque: { text: "RÉCORD 0,00 s", sub: "100 M · USAINBOT", bg: "#c99a4a", fg: "#2b1a08" },
  poster: { text: "USAINBOT", sub: "YOU THINK YOU CAN WIN ME?", bg: "#12324a", fg: "#5ff7d6" },
  tv: { text: "▶ REPLAY", sub: "USAINBOT GANA OTRA VEZ", bg: "#2a6fd6", fg: "#ffffff" },
  exit: { text: "SALIDA CIUDAD →", sub: "AUTOPISTA · PRÓXIMAMENTE", bg: "#1f5fa8", fg: "#ffffff", border: "#ffffff" },
  north: { text: "ZONA NORTE", sub: "EN OBRAS · PRÓXIMAMENTE", bg: "#f2c21c", fg: "#1b1f26", border: "#1b1f26" },
  park: { text: "PARQUE BOLT", sub: "PROHIBIDO CORRER A 100 KM/H", bg: "#2e7d4f", fg: "#ffffff" },
  gasshop: { text: "GASOIL SHOP", sub: "LATAS · SNACKS · ACEITE", bg: "#ff7a1a", fg: "#1b1f26" },
  court: { text: "CANCHA VECINAL", sub: "NO SE ADMITEN ROBOTS (ES BROMA)", bg: "#b8432f", fg: "#ffffff" },
  section: {
    text: "SECCIÓN EN OBRAS",
    sub: "AMPLIACIÓN LISTA · POR RELLENAR",
    bg: "#f2c21c",
    fg: "#1b1f26",
    border: "#1b1f26",
  },
  stop: { text: "STOP", bg: "#d8322b", fg: "#ffffff", border: "#ffffff" },
};

// Placas de calle (verdes, estilo señal urbana)
for (const road of ROADS) {
  SIGNS[`street_${road.id}`] = { text: road.name, bg: "#1e6b3c", fg: "#ffffff", border: "#ffffff", font: `900 30px Arial, sans-serif` };
}

const S = 1024;
const CW = 256;
const CH = 64;
export const SIGN_UV: Record<string, UVRect> = {};

function drawSign(ctx: CanvasRenderingContext2D, def: SignDef, x: number, y: number): void {
  ctx.fillStyle = def.bg;
  ctx.fillRect(x, y, CW, CH);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, y, CW, CH * 0.42);
  if (def.border) {
    ctx.strokeStyle = def.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
  }
  ctx.fillStyle = def.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = def.sub ? 30 : 38;
  ctx.font = def.font ?? SHOP_FONT.replace("34px", `${size}px`);
  while (ctx.measureText(def.text).width > CW - 20 && size > 12) {
    size -= 2;
    ctx.font = (def.font ?? SHOP_FONT).replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(def.text, x + CW / 2, y + (def.sub ? 26 : CH / 2 + 1));
  if (def.sub) {
    ctx.font = `700 13px Arial, sans-serif`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(def.sub, x + CW / 2, y + 51);
    ctx.globalAlpha = 1;
  }
}

export function createSignAtlas(): THREE.MeshBasicMaterial {
  const keys = Object.keys(SIGNS);
  const texture = createCanvasTexture(
    S,
    S,
    (ctx) => {
      keys.forEach((key, i) => {
        const x = (i % 4) * CW;
        const y = Math.floor(i / 4) * CH;
        drawSign(ctx, SIGNS[key], x, y);
      });
    },
    true,
    true
  );
  return new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(1.05, 1.05, 1.05) });
}

// UV calculadas al cargar el módulo (independientes del canvas).
Object.keys(SIGNS).forEach((key, i) => {
  SIGN_UV[key] = cellUV((i % 4) * CW + 1, Math.floor(i / 4) * CH + 1, CW - 2, CH - 2, S, S);
});
