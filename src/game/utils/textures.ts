import * as THREE from "three";
import { createRng } from "./random";

/**
 * Texturas procedurales (sin assets externos), pequeñas y estilizadas.
 * - Personaje: sin mipmaps (nítidas de cerca).
 * - Suelo/fachadas: mipmaps + anisotropía → sin parpadeo a distancia.
 */
export function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  smooth = false,
  mipmaps = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[USAINBOT] No se pudo crear el contexto 2D");
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (mipmaps) {
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
  } else {
    const filter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
    tex.magFilter = filter;
    tex.minFilter = filter;
    tex.generateMipmaps = false;
  }
  return tex;
}

/** Convierte 0xRRGGBB a "#rrggbb" para el canvas 2D. */
export const toCss = (color: number): string => `#${color.toString(16).padStart(6, "0")}`;

function repeatable(tex: THREE.Texture, u: number, v: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(u, v);
  return tex;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  colors: string[],
  size: number,
  seed: number
): void {
  const rng = createRng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.5 + rng());
    ctx.fillRect(rng() * w, rng() * h, s, s);
  }
}

/** Césped estilizado: manchas de dos verdes + briznas. Tile ≈ 6 m. */
export function grassTexture(repeat: number): THREE.Texture {
  const tex = createCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "#6bb04a";
      ctx.fillRect(0, 0, w, h);
      const rng = createRng(7);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = i % 2 ? "rgba(140,200,90,0.35)" : "rgba(60,120,45,0.3)";
        ctx.beginPath();
        ctx.ellipse(rng() * w, rng() * h, 8 + rng() * 16, 6 + rng() * 10, rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < 520; i++) {
        const x = rng() * w;
        const y = rng() * h;
        ctx.strokeStyle = i % 3 ? "rgba(40,100,35,0.5)" : "rgba(170,225,110,0.55)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 2, y - 2 - rng() * 3);
        ctx.stroke();
      }
    },
    true,
    true
  );
  return repeatable(tex, repeat, repeat);
}

/** Asfalto con marcas viales. Tile: 12 m de ancho (u) × 8 m de largo (v). */
export function roadTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "#4a5058";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 900, ["rgba(255,255,255,0.07)", "rgba(0,0,0,0.16)"], 1.5, 11);
      // Rodadas
      ctx.fillStyle = "rgba(0,0,0,0.09)";
      ctx.fillRect(28, 0, 16, h);
      ctx.fillRect(84, 0, 16, h);
      // Grietas
      ctx.strokeStyle = "rgba(20,22,25,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(52, 20);
      ctx.lineTo(56, 34);
      ctx.lineTo(51, 44);
      ctx.moveTo(100, 90);
      ctx.lineTo(108, 97);
      ctx.stroke();
      // Líneas de borde y discontinua central
      ctx.fillStyle = "#ece8dc";
      ctx.fillRect(6, 0, 3, h);
      ctx.fillRect(w - 9, 0, 3, h);
      ctx.fillStyle = "#f2d04a";
      ctx.fillRect(62, 0, 4, 64);
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Baldosa de acera (tile = 2 m). */
export function sidewalkTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = "#cfcac0";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 160, ["rgba(0,0,0,0.07)", "rgba(255,255,255,0.18)"], 1.5, 3);
      ctx.fillStyle = "rgba(90,85,78,0.55)";
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillRect(0, 31, w, 1);
      ctx.fillRect(31, 0, 1, h);
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Pavimento de la plaza: damero de piedra cálida (tile = 3 m). */
export function plazaTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      const s = 32;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#e2d3b4" : "#c9b08c";
          ctx.fillRect(x * s, y * s, s, s);
        }
      }
      speckle(ctx, w, h, 300, ["rgba(0,0,0,0.06)", "rgba(255,255,255,0.12)"], 1.5, 5);
      ctx.strokeStyle = "rgba(90,70,50,0.45)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s, 0);
        ctx.lineTo(i * s, h);
        ctx.moveTo(0, i * s);
        ctx.lineTo(w, i * s);
        ctx.stroke();
      }
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Paso de cebra: una franja blanca + hueco transparente (alphaTest). */
export function crosswalkTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    64,
    16,
    (ctx) => {
      ctx.clearRect(0, 0, 64, 16);
      ctx.fillStyle = "#f1eee6";
      ctx.fillRect(4, 0, 28, 16);
    },
    true,
    true
  );
  return repeatable(tex, 6, 1);
}

/** Agua con cáusticas (se desplaza el offset para animarla). */
export function waterTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = "#3aa9dc";
      ctx.fillRect(0, 0, w, h);
      const rng = createRng(21);
      ctx.strokeStyle = "rgba(200,245,255,0.7)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const x = rng() * w;
        const y = rng() * h;
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + rng() * 7, 2 + rng() * 3, rng() * 3, 0, Math.PI * 1.3);
        ctx.stroke();
      }
    },
    true,
    true
  );
  return repeatable(tex, 2, 2);
}

/** Cartel publicitario con el logo del juego. */
export function billboardTexture(main: string, sub: string): THREE.CanvasTexture {
  return createCanvasTexture(
    256,
    128,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "#15345a");
      g.addColorStop(1, "#0b1a2e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = "#ffcf3f";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 250, 122);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffcf3f";
      ctx.font = "bold 38px monospace";
      ctx.fillText(main, 128, 50);
      ctx.fillStyle = "#6fe7ff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(sub, 128, 96);
    },
    true,
    true
  );
}

/** Asfalto liso sin marcas (cruces, aparcamientos). Tile = 8 m. */
export function asphaltTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "#4a5058";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 900, ["rgba(255,255,255,0.07)", "rgba(0,0,0,0.16)"], 1.5, 13);
      ctx.strokeStyle = "rgba(25,27,30,0.5)";
      ctx.beginPath();
      ctx.moveTo(20, 90);
      ctx.lineTo(34, 96);
      ctx.lineTo(40, 110);
      ctx.stroke();
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Parqué cálido (interior de la mansión). Tile = 2 m. */
export function woodTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      const rng = createRng(31);
      const plank = 16;
      for (let y = 0; y < h; y += plank) {
        const off = ((y / plank) % 2) * 48;
        for (let x = -64; x < w; x += 96) {
          const l = 0.85 + rng() * 0.25;
          ctx.fillStyle = `rgb(${Math.round(176 * l)},${Math.round(116 * l)},${Math.round(64 * l)})`;
          ctx.fillRect(x + off, y, 96, plank);
          ctx.fillStyle = "rgba(60,30,10,0.45)";
          ctx.fillRect(x + off, y, 1, plank);
        }
        ctx.fillStyle = "rgba(60,30,10,0.5)";
        ctx.fillRect(0, y, w, 1);
      }
      ctx.strokeStyle = "rgba(90,50,20,0.18)";
      for (let i = 0; i < 40; i++) {
        const y = rng() * h;
        ctx.beginPath();
        ctx.moveTo(rng() * w, y);
        ctx.lineTo(rng() * w, y + 1);
        ctx.stroke();
      }
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Baldosa ajedrezada (cocina). Tile = 1.5 m. */
export function tileTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    64,
    64,
    (ctx) => {
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#2f3a44" : "#eef0ea";
          ctx.fillRect(x * 32, y * 32, 32, 32);
        }
      }
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}

/** Arena (parque infantil). Tile = 4 m. */
export function sandTexture(): THREE.Texture {
  const tex = createCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = "#e8d29a";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 300, ["rgba(150,110,50,0.25)", "rgba(255,255,255,0.3)"], 1.5, 17);
    },
    true,
    true
  );
  return repeatable(tex, 1, 1);
}
