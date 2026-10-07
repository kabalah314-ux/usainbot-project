/**
 * Calidad gráfica: presets centralizados.
 * "retro" reproduce la PS2 original (media resolución + dithering 16 bits);
 * el resto es el "remaster HD" con la misma estética.
 */
export type QualityName = "retro" | "low" | "medium" | "high";

export interface QualityPreset {
  label: string;
  /** Límite del devicePixelRatio. */
  pixelRatioMax: number;
  /** Escala de la resolución interna de la escena. */
  renderScale: number;
  /** Muestras MSAA del render target de escena (0 = sin AA). */
  msaa: number;
  shadowMapSize: number;
  /** Suavizado de sombras PCF. */
  shadowRadius: number;
  /** Semilado del área con sombras alrededor del jugador (m). */
  shadowExtent: number;
  bloom: boolean;
  bloomStrength: number;
  /** Contornos de tinta (cel-shading) sobre todo el mundo. */
  edges: boolean;
  /** Media resolución con filtrado "nearest" + dithering de 16 bits. */
  retro: boolean;
  trails: boolean;
  dust: boolean;
}

export const QUALITY_PRESETS: Record<QualityName, QualityPreset> = {
  high: {
    label: "ALTA",
    pixelRatioMax: 1.5,
    renderScale: 1,
    msaa: 4,
    shadowMapSize: 4096,
    shadowRadius: 3,
    shadowExtent: 42,
    bloom: true,
    bloomStrength: 0.55,
    edges: true,
    retro: false,
    trails: true,
    dust: true,
  },
  medium: {
    label: "MEDIA",
    pixelRatioMax: 1,
    renderScale: 1,
    msaa: 4,
    shadowMapSize: 2048,
    shadowRadius: 2,
    shadowExtent: 36,
    bloom: true,
    bloomStrength: 0.45,
    edges: true,
    retro: false,
    trails: true,
    dust: true,
  },
  low: {
    label: "BAJA",
    pixelRatioMax: 1,
    renderScale: 0.8,
    msaa: 0,
    shadowMapSize: 1024,
    shadowRadius: 1,
    shadowExtent: 30,
    bloom: false,
    bloomStrength: 0,
    edges: true,
    retro: false,
    trails: false,
    dust: true,
  },
  retro: {
    label: "RETRO PS2",
    pixelRatioMax: 1,
    renderScale: 0.5,
    msaa: 0,
    shadowMapSize: 1024,
    shadowRadius: 0,
    shadowExtent: 32,
    bloom: true,
    bloomStrength: 0.35,
    edges: true,
    retro: true,
    trails: true,
    dust: true,
  },
};

/** Orden al pulsar F3. */
export const QUALITY_CYCLE: QualityName[] = ["high", "medium", "low", "retro"];
/** Orden de degradación automática si el rendimiento cae. */
export const QUALITY_FALLBACK: Partial<Record<QualityName, QualityName>> = {
  high: "medium",
  medium: "low",
};

export const graphicsSettings = {
  defaultQuality: "high" as QualityName,
  storageKey: "usainbot_gfx",
  /** FPS medios por debajo de los cuales se baja la calidad. */
  autoDropFps: 38,
  /** Ventana de medición (s) y espera inicial antes de medir (s). */
  autoDropWindow: 3,
  autoDropWarmup: 2.5,
  bloomRadius: 0.35,
  bloomThreshold: 1.0,
  toneMappingExposure: 1.05,
  saturation: 1.12,
  vignette: 0.32,
  /** Umbrales del detector de bordes (laplaciano de 1/z). */
  edgeLow: 0.003,
  edgeHigh: 0.012,
  edgeDarkness: 0.78,
};
