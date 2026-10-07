export const VIEW_W = 960;
export const VIEW_H = 540;

/**
 * Keeps a canvas crisp on any screen while letting the game draw in a fixed
 * 960x540 logical space.
 */
export function attachResponsiveCanvas(canvas: HTMLCanvasElement, w = VIEW_W, h = VIEW_H) {
  const ctx = canvas.getContext("2d");
  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = rect.width || w;
    const cssH = cssW * (h / w);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (ctx) {
      const s = (cssW / w) * dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  window.addEventListener("orientationchange", fit);
  return () => {
    ro.disconnect();
    window.removeEventListener("orientationchange", fit);
  };
}

export const INK = "#0b0b12";
export const INK2 = "#14141f";
export const PAPER = "#f5f1e6";
export const BOLT = "#ffe14d";
export const GOLD = "#fed100";
export const GREEN = "#009b3a";
export const FLAME = "#ff4d2d";

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 6,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** comic panel: solid fill + fat ink outline */
export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  r = 8,
  lw = 3,
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    font?: string;
    fill?: string;
    stroke?: string;
    lw?: number;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {},
) {
  const {
    font = "700 26px 'Rubik', sans-serif",
    fill = PAPER,
    stroke = INK,
    lw = 6,
    align = "left",
    baseline = "alphabetic",
  } = opts;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** draws a $BOLT coin */
export function boltCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.15, Math.abs(spin)), 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(11,11,18,.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // lightning
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, -r * 0.62);
  ctx.lineTo(r * 0.3, -r * 0.08);
  ctx.lineTo(r * 0.04, -r * 0.02);
  ctx.lineTo(r * 0.22, r * 0.62);
  ctx.lineTo(-r * 0.3, r * 0.02);
  ctx.lineTo(-r * 0.02, -r * 0.04);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

export function speedLines(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: number,
  w = VIEW_W,
  h = VIEW_H,
) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, intensity);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const seed = (i * 97.13 + Math.floor(t * 0.06) * 13.7) % 1000;
    const y = (seed % h) | 0;
    const len = 60 + ((seed * 7) % 160);
    const x = (w - ((t * (2 + (i % 4)) + seed * 3) % (w + 300))) | 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}
