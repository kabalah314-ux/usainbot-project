import * as THREE from "three";
import { createCanvasTexture, toCss } from "../utils/textures";
import { toon } from "../utils/materials";
import { createRng } from "../utils/random";

/**
 * Atlas de fachadas: 8 estilos × {planta alta, planta baja, azotea} en una
 * sola textura 512×256. Todos los edificios (jugables y skyline) comparten
 * UN material → una sola draw call para toda la ciudad.
 *
 * El shader repite cada celda con fract() y usa textureGrad para que los
 * mipmaps no dejen costuras entre repeticiones.
 */
export const FACADE_STYLES = [
  { wall: 0xff8c42, accent: 0x2f6fb3, trim: 0xffe0bf },
  { wall: 0x5bc0eb, accent: 0xf25f5c, trim: 0xe6f7ff },
  { wall: 0xffc94a, accent: 0x2e9a42, trim: 0xfff4d1 },
  { wall: 0xb197fc, accent: 0xffc94a, trim: 0xf1ebff },
  { wall: 0xff6b6b, accent: 0x274c77, trim: 0xffe3e3 },
  { wall: 0x4ecdc4, accent: 0xff8c42, trim: 0xe0fbf8 },
  { wall: 0xa3d977, accent: 0x7d3c98, trim: 0xf1fbe8 },
  { wall: 0xef7db5, accent: 0x2b2d42, trim: 0xffe6f2 },
] as const;

export type FacadeCell = "upper" | "ground" | "roof";

const W = 512;
const H = 256;
const CELL = 64;

/** [offsetU, offsetV, sizeU, sizeV] de una celda en coordenadas UV (flipY). */
export function facadeCell(style: number, kind: FacadeCell): [number, number, number, number] {
  const ou = ((style % FACADE_STYLES.length) * CELL) / W;
  const su = CELL / W;
  if (kind === "upper") return [ou, 0.75, su, 0.25];
  if (kind === "ground") return [ou, 0.25, su, 0.5];
  return [ou, 0, su, 0.25];
}

function drawUpper(ctx: CanvasRenderingContext2D, s: number, x0: number): void {
  const st = FACADE_STYLES[s];
  const rng = createRng(100 + s);
  ctx.fillStyle = toCss(st.wall);
  ctx.fillRect(x0, 0, CELL, CELL);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
    ctx.fillRect(x0 + rng() * CELL, rng() * CELL, 2, 2);
  }
  // Forjado entre plantas
  ctx.fillStyle = toCss(st.trim);
  ctx.fillRect(x0, 59, CELL, 5);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x0, 58, CELL, 1);
  // Contraventanas (algunos estilos)
  if (s % 3 === 2) {
    ctx.fillStyle = toCss(st.accent);
    ctx.fillRect(x0 + 7, 12, 7, 38);
    ctx.fillRect(x0 + 50, 12, 7, 38);
  }
  // Marco + cristal con reflejo
  ctx.fillStyle = toCss(st.trim);
  ctx.fillRect(x0 + 14, 11, 36, 40);
  const glass = ctx.createLinearGradient(0, 14, 0, 48);
  glass.addColorStop(0, "#a9dcf5");
  glass.addColorStop(1, "#3b6690");
  ctx.fillStyle = glass;
  ctx.fillRect(x0 + 17, 14, 30, 34);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(x0 + 19, 44);
  ctx.lineTo(x0 + 33, 16);
  ctx.lineTo(x0 + 39, 16);
  ctx.lineTo(x0 + 25, 44);
  ctx.fill();
  ctx.fillStyle = toCss(st.trim);
  ctx.fillRect(x0 + 31, 14, 2, 34);
  ctx.fillRect(x0 + 17, 29, 30, 2);
  // Alféizar
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0 + 12, 51, 40, 3);
  // Barandilla de balcón (algunos estilos)
  if (s % 3 === 1) {
    ctx.fillStyle = "#2c3036";
    ctx.fillRect(x0 + 10, 40, 44, 2);
    for (let x = 12; x <= 52; x += 5) ctx.fillRect(x0 + x, 40, 1, 12);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, s: number, x0: number): void {
  const st = FACADE_STYLES[s];
  const y0 = 64;
  ctx.fillStyle = toCss(st.wall);
  ctx.fillRect(x0, y0, CELL, 128);
  // Rótulo de la tienda
  ctx.fillStyle = toCss(st.accent);
  ctx.fillRect(x0, y0 + 2, CELL, 20);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x0 + 8, y0 + 10, 48, 3);
  // Escaparate
  ctx.fillStyle = "#23272d";
  ctx.fillRect(x0 + 4, y0 + 26, 56, 94);
  const glass = ctx.createLinearGradient(0, y0 + 30, 0, y0 + 116);
  glass.addColorStop(0, "#7fc4dc");
  glass.addColorStop(1, "#1f4b63");
  ctx.fillStyle = glass;
  ctx.fillRect(x0 + 7, y0 + 29, 50, 88);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(x0 + 10, y0 + 110);
  ctx.lineTo(x0 + 34, y0 + 32);
  ctx.lineTo(x0 + 42, y0 + 32);
  ctx.lineTo(x0 + 18, y0 + 110);
  ctx.fill();
  // Puerta en estilos pares
  if (s % 2 === 0) {
    ctx.fillStyle = "#3a2a1f";
    ctx.fillRect(x0 + 38, y0 + 46, 18, 74);
    ctx.fillStyle = "rgba(160,215,235,0.8)";
    ctx.fillRect(x0 + 41, y0 + 50, 12, 30);
    ctx.fillStyle = "#e8c35a";
    ctx.fillRect(x0 + 40, y0 + 86, 3, 3);
  } else {
    ctx.fillStyle = "#23272d";
    ctx.fillRect(x0 + 31, y0 + 29, 2, 88);
  }
  // Zócalo
  ctx.fillStyle = "#4a4f57";
  ctx.fillRect(x0, y0 + 120, CELL, 8);
}

function drawRoof(ctx: CanvasRenderingContext2D, s: number, x0: number): void {
  const y0 = 192;
  ctx.fillStyle = "#8d9297";
  ctx.fillRect(x0, y0, CELL, CELL);
  const rng = createRng(300 + s);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)";
    ctx.fillRect(x0 + rng() * CELL, y0 + rng() * CELL, 2, 2);
  }
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(x0, y0 + 31, CELL, 2);
}

export interface FacadeAtlas {
  texture: THREE.CanvasTexture;
  material: THREE.MeshToonMaterial;
}

export function createFacadeAtlas(): FacadeAtlas {
  const texture = createCanvasTexture(
    W,
    H,
    (ctx) => {
      for (let s = 0; s < FACADE_STYLES.length; s++) {
        const x0 = s * CELL;
        drawUpper(ctx, s, x0);
        drawGround(ctx, s, x0);
        drawRoof(ctx, s, x0);
      }
    },
    true,
    true
  );

  const material = toon({ map: texture });
  const pad = new THREE.Vector2(1.5 / W, 1.5 / H);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.atlasPad = { value: pad };
    shader.vertexShader =
      "attribute vec4 aCell;\nvarying vec4 vCell;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCell = aCell;");
    shader.fragmentShader =
      "varying vec4 vCell;\nuniform vec2 atlasPad;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec2 cellSize = vCell.zw - 2.0 * atlasPad;
          vec2 cellUv = vCell.xy + atlasPad + fract(vMapUv) * cellSize;
          vec4 sampledDiffuseColor = textureGrad(map, cellUv, dFdx(vMapUv) * cellSize, dFdy(vMapUv) * cellSize);
          diffuseColor *= sampledDiffuseColor;
        #endif`
      );
  };
  material.customProgramCacheKey = () => "ub-facade-atlas";
  return { texture, material };
}
