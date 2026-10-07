import * as THREE from "three";
import { createCanvasTexture, toCss } from "../../utils/textures";
import { HEAD } from "./headGeometry";
import { PALETTE } from "./palette";

/**
 * Texturas procedurales pequeñas de UsainBot (estética PS2).
 * Convención UV de los cilindros: u = 0.5 es el frente (+Z),
 * u = 0.75 el lado +X (izquierda del personaje).
 */

type Ctx = CanvasRenderingContext2D;
type P = [number, number];

const HAIR = toCss(PALETTE.hair);
const SKIN = toCss(PALETTE.skin);
const SKIN_DARK = toCss(PALETTE.skinDark);

function poly(ctx: Ctx, pts: P[], close = true): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/** Curva suave por los puntos. `connect` la une al subtrazado actual (sin moveTo). */
function smoothPath(ctx: Ctx, pts: P[], connect = false): void {
  if (connect) ctx.lineTo(pts[0][0], pts[0][1]);
  else ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Pelo rapado: relleno oscuro + moteado. `region` define la zona con pelo. */
function stubble(ctx: Ctx, region: () => void): void {
  ctx.save();
  region();
  ctx.fillStyle = HAIR;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "rgba(92,72,60,0.55)";
  for (let i = 0; i < 420; i++) {
    const x = ((i * 0.6180339) % 1) * 0.44 - 0.22;
    const y = ((i * 0.4142135) % 1) * 0.6 - 0.3;
    ctx.fillRect(x, y, 0.0035, 0.0035);
  }
  ctx.restore();
}

/** Banda de barba/sombra a lo largo del contorno inferior (coincide en la costura). */
function jawBand(ctx: Ctx, width: number): void {
  ctx.beginPath();
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + 0.08 + (i / steps) * (Math.PI - 0.16);
    const x = Math.cos(a) * HEAD.hw * 0.99;
    const y = Math.sin(a) * HEAD.hh * 0.99;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawEye(ctx: Ctx, x: number, y: number, flip: number): void {
  const rx = 0.024;
  const ry = 0.0115;
  ellipse(ctx, x, y, rx, ry, "#f1ebe1");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ellipse(ctx, x + 0.003, y - 0.001, 0.0092, 0.0092, "#3b2412");
  ellipse(ctx, x + 0.003, y - 0.001, 0.0045, 0.0045, "#050302");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 0.005, y + 0.002, 0.003, 0.003);
  // Párpado superior pesado: mirada chulesca
  ctx.fillStyle = SKIN_DARK;
  poly(ctx, [
    [x - rx, y + 0.003 + 0.002 * flip],
    [x + rx, y + 0.003 - 0.002 * flip],
    [x + rx, y + 0.03],
    [x - rx, y + 0.03],
  ]);
  ctx.fill();
  ctx.restore();
  // Línea de pestañas gruesa
  ctx.strokeStyle = "#0b0605";
  ctx.lineWidth = 0.0045;
  ctx.beginPath();
  smoothPath(ctx, [
    [x - rx - 0.003, y + 0.002 * flip],
    [x - rx * 0.4, y + 0.0045 + 0.002 * flip],
    [x + rx * 0.4, y + 0.0045 - 0.002 * flip],
    [x + rx + 0.003, y - 0.002 * flip],
  ]);
  ctx.stroke();
  ctx.lineWidth = 0.0018;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.95, ry, 0, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function drawFront(ctx: Ctx): void {
  // Volumen: frente y pómulos con brillo, mandíbula más oscura
  const light = (x: number, y: number, r: number, a: number): void => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,190,140,${a})`);
    g.addColorStop(1, "rgba(255,190,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-0.3, -0.3, 0.6, 0.6);
  };
  light(0, 0.13, 0.1, 0.28);
  light(-0.075, -0.035, 0.05, 0.18);
  light(0.075, -0.035, 0.05, 0.18);
  const shade = ctx.createRadialGradient(0, 0.02, 0.1, 0, 0.02, 0.26);
  shade.addColorStop(0, "rgba(40,18,8,0)");
  shade.addColorStop(1, "rgba(40,18,8,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(-0.3, -0.3, 0.6, 0.6);

  // Pelo muy corto con entradas marcadas
  stubble(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.3);
    ctx.lineTo(0.3, 0.3);
    ctx.lineTo(0.3, -0.03);
    smoothPath(ctx, [
      [0.175, -0.03],
      [0.153, -0.025],
      [0.15, 0.05],
      [0.142, 0.13],
      [0.1, 0.185],
      [0.068, 0.218],
      [0.03, 0.198],
      [0, 0.192],
      [-0.03, 0.198],
      [-0.068, 0.218],
      [-0.1, 0.185],
      [-0.142, 0.13],
      [-0.15, 0.05],
      [-0.153, -0.025],
      [-0.175, -0.03],
    ], true);
    ctx.lineTo(-0.3, -0.03);
    ctx.closePath();
  });

  // Barba fina por la mandíbula + perilla + bigote
  jawBand(ctx, 0.02);
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.ellipse(0, -0.212, 0.043, 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = HAIR;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.009;
  ctx.beginPath();
  smoothPath(ctx, [
    [-0.04, -0.094],
    [-0.015, -0.086],
    [0.015, -0.085],
    [0.04, -0.09],
  ]);
  ctx.stroke();
  ctx.lineWidth = 0.007;
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.118);
  ctx.lineTo(-0.038, -0.178);
  ctx.moveTo(0.068, -0.11);
  ctx.lineTo(0.038, -0.178);
  ctx.stroke();

  // Cejas gruesas en V (ceño chulesco, la derecha más alta)
  ctx.fillStyle = HAIR;
  poly(ctx, [
    [-0.016, 0.028],
    [-0.058, 0.05],
    [-0.1, 0.058],
    [-0.108, 0.046],
    [-0.06, 0.036],
    [-0.02, 0.018],
  ]);
  ctx.fill();
  poly(ctx, [
    [0.016, 0.034],
    [0.058, 0.062],
    [0.1, 0.07],
    [0.108, 0.058],
    [0.06, 0.047],
    [0.02, 0.024],
  ]);
  ctx.fill();

  drawEye(ctx, -0.058, 0.002, 1);
  drawEye(ctx, 0.058, 0.006, -1);

  // Nariz ancha
  ctx.strokeStyle = "rgba(40,18,10,0.55)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.moveTo(-0.011, -0.012);
  ctx.quadraticCurveTo(-0.016, -0.04, -0.019, -0.058);
  ctx.stroke();
  ellipse(ctx, -0.022, -0.072, 0.014, 0.011, SKIN_DARK);
  ellipse(ctx, 0.022, -0.072, 0.014, 0.011, SKIN_DARK);
  ellipse(ctx, 0, -0.068, 0.016, 0.013, toCss(PALETTE.skinLight));
  ellipse(ctx, -0.012, -0.078, 0.0065, 0.0038, "#1a0c06");
  ellipse(ctx, 0.012, -0.078, 0.0065, 0.0038, "#1a0c06");

  // Pliegues de la sonrisa
  ctx.strokeStyle = "rgba(30,12,6,0.7)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.moveTo(-0.052, -0.064);
  ctx.quadraticCurveTo(-0.094, -0.084, -0.096, -0.114);
  ctx.moveTo(0.052, -0.06);
  ctx.quadraticCurveTo(0.092, -0.076, 0.092, -0.104);
  ctx.stroke();

  // Sonrisa enorme y ladeada enseñando los dientes
  const upper: P[] = [
    [-0.086, -0.104],
    [-0.045, -0.101],
    [0, -0.103],
    [0.045, -0.097],
    [0.082, -0.09],
  ];
  const mouth = new Path2D();
  mouth.moveTo(upper[0][0], upper[0][1]);
  for (const p of upper.slice(1)) mouth.lineTo(p[0], p[1]);
  mouth.quadraticCurveTo(0.06, -0.152, -0.004, -0.156);
  mouth.quadraticCurveTo(-0.066, -0.152, -0.086, -0.104);
  mouth.closePath();
  ctx.fillStyle = "#fbf6ec";
  ctx.fill(mouth);
  ctx.save();
  ctx.clip(mouth);
  ctx.fillStyle = "#3a100a";
  ctx.beginPath();
  smoothPath(ctx, [
    [-0.09, -0.12],
    [-0.035, -0.13],
    [0.025, -0.126],
    [0.09, -0.11],
  ]);
  ctx.lineTo(0.09, -0.13);
  ctx.quadraticCurveTo(0, -0.148, -0.09, -0.136);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,110,100,0.8)";
  ctx.lineWidth = 0.0018;
  for (let x = -0.064; x <= 0.066; x += 0.016) {
    ctx.beginPath();
    ctx.moveTo(x, -0.09);
    ctx.lineTo(x, -0.126);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#140604";
  ctx.lineWidth = 0.004;
  ctx.stroke(mouth);
  // Labio inferior
  ctx.strokeStyle = toCss(PALETTE.skinLight);
  ctx.lineWidth = 0.005;
  ctx.beginPath();
  ctx.moveTo(-0.055, -0.16);
  ctx.quadraticCurveTo(0, -0.17, 0.05, -0.156);
  ctx.stroke();
}

function drawBack(ctx: Ctx): void {
  const shade = ctx.createLinearGradient(0, -0.25, 0, 0.1);
  shade.addColorStop(0, "rgba(40,18,8,0.4)");
  shade.addColorStop(1, "rgba(40,18,8,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(-0.3, -0.3, 0.6, 0.6);
  stubble(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.3);
    ctx.lineTo(0.3, 0.3);
    ctx.lineTo(0.3, -0.03);
    smoothPath(ctx, [
      [0.175, -0.03],
      [0.12, -0.05],
      [0.05, -0.085],
      [0, -0.09],
      [-0.05, -0.085],
      [-0.12, -0.05],
      [-0.175, -0.03],
    ], true);
    ctx.lineTo(-0.3, -0.03);
    ctx.closePath();
  });
  jawBand(ctx, 0.02);
}

/**
 * Atlas de la cabeza 512x256: [cara vista de frente | nuca vista de detrás].
 * Se dibuja en metros (y hacia arriba) sobre la proyección planar de headGeometry.
 */
export function createFaceTexture(): THREE.CanvasTexture {
  const sx = 128 / HEAD.hw;
  const sy = 128 / HEAD.hh;
  return createCanvasTexture(
    512,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = SKIN;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 256, 256);
      ctx.clip();
      ctx.setTransform(sx, 0, 0, -sy, 128, 128);
      drawFront(ctx);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(256, 0, 256, 256);
      ctx.clip();
      ctx.setTransform(-sx, 0, 0, -sy, 384, 128);
      drawBack(ctx);
      ctx.restore();
    },
    true
  );
}

/** Camiseta de tirantes: amarilla, laterales verdes y escote con el pecho robótico. */
export function createTankTexture(): THREE.CanvasTexture {
  return createCanvasTexture(256, 128, (ctx, w, h) => {
    const green = toCss(PALETTE.green);
    const metal = toCss(PALETTE.metal);
    ctx.fillStyle = toCss(PALETTE.yellow);
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(170,100,0,0.16)";
    ctx.fillRect(100, 50, 3, 70);
    ctx.fillRect(152, 56, 3, 64);
    ctx.fillRect(0, 100, w, 4);

    // Paneles laterales verdes
    ctx.fillStyle = green;
    ctx.fillRect(50, 0, 28, h);
    ctx.fillRect(178, 0, 28, h);

    // Escote delantero: se ve el pecho metálico con circuitos
    const scoop = (cx: number, rx: number, depth: number): void => {
      ctx.beginPath();
      ctx.ellipse(cx, 0, rx, depth, 0, 0, Math.PI);
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = green;
      ctx.lineWidth = 6;
      ctx.stroke();
    };
    scoop(128, 21, 15);
    scoop(0, 18, 10);
    scoop(w, 18, 10);
    ctx.strokeStyle = toCss(PALETTE.glow);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(122, 0);
    ctx.lineTo(122, 6);
    ctx.lineTo(118, 10);
    ctx.moveTo(134, 0);
    ctx.lineTo(134, 7);
    ctx.lineTo(139, 11);
    ctx.stroke();

    // Ribete de las sisas y bajo
    ctx.fillStyle = green;
    ctx.fillRect(26, 0, 70, 5);
    ctx.fillRect(160, 0, 70, 5);
    ctx.fillStyle = toCss(PALETTE.greenDark);
    ctx.fillRect(0, h - 6, w, 6);
  });
}

/**
 * Mallas verdes con panel exterior amarillo que se ensancha hacia abajo.
 * v ∈ [0.6, 1] → cadera (franja constante); v ∈ [0, 0.6] → muslo (se abre).
 * El panel está en u = 0.75 (lado +X); la pierna derecha desplaza u en 0.5.
 */
export function createShortsTexture(): THREE.CanvasTexture {
  const tex = createCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = toCss(PALETTE.green);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(30, 0, 2, h);
    const top = h * 0.4;
    ctx.fillStyle = toCss(PALETTE.yellow);
    poly(ctx, [
      [89, 0],
      [103, 0],
      [103, top],
      [114, h],
      [78, h],
      [89, top],
    ]);
    ctx.fill();
    ctx.fillStyle = toCss(PALETTE.greenDark);
    ctx.fillRect(0, h - 5, 72, 5);
    ctx.fillRect(120, h - 5, 8, 5);
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Zapatilla verde con franjas doradas y rejilla. */
export function createShoeTexture(): THREE.CanvasTexture {
  return createCanvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = toCss(PALETTE.green);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 2; y < h; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < w; x += 4) ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = toCss(PALETTE.gold);
    ctx.strokeStyle = "#1b120a";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      poly(ctx, [
        [8 + i * 14, 62],
        [18 + i * 14, 62],
        [36 + i * 14, 4],
        [26 + i * 14, 4],
      ]);
      ctx.fill();
      ctx.stroke();
    }
  });
}

/** Cristal holográfico con líneas de "datos" (visor y pantalla del pecho). */
export function createVisorTexture(): THREE.CanvasTexture {
  return createCanvasTexture(
    128,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = toCss(PALETTE.visor);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let row = 0; row < 7; row++) {
        for (let i = 0; i < 9; i++) {
          if ((i * 5 + row * 3) % 4 === 0) continue;
          const len = 3 + ((i * 7 + row * 3) % 7);
          ctx.fillRect(8 + i * 12 + (row % 2) * 4, 7 + row * 7, len, 2);
        }
      }
      ctx.strokeStyle = "rgba(235,255,252,1)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    },
    true
  );
}
