import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { gameSettings } from "../data/config";
import {
  QUALITY_FALLBACK,
  QUALITY_PRESETS,
  graphicsSettings,
} from "../data/graphics";
import type { QualityName, QualityPreset } from "../data/graphics";
import { createFinalMaterial } from "./FinalPass";

/** Efectos de pantalla que decide el gameplay en cada frame. */
export interface ScreenFx {
  /** 0..1: intensidad de la sensación de velocidad (sprint). */
  speed: number;
}

/**
 * Pipeline de render:
 *   escena → RT HDR (MSAA + depth) → bloom (in situ) → pasada final a pantalla.
 * Gestiona la calidad gráfica (presets, persistencia y bajada automática).
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  onQualityChange: ((name: QualityName, preset: QualityPreset) => void) | null = null;

  private container: HTMLElement;
  private quality: QualityName;
  private preset: QualityPreset;
  private sceneRT: THREE.WebGLRenderTarget | null = null;
  private bloom: UnrealBloomPass;
  private finalMaterial: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  private time = 0;
  private perfTime = 0;
  private perfFrames = 0;
  private warmup = graphicsSettings.autoDropWarmup;
  /** Si el jugador eligió la calidad a mano (F3), no se baja automáticamente. */
  private manual = false;

  constructor(container: HTMLElement) {
    this.container = container;
    try {
      this.gl = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch (err) {
      console.error(err);
      throw new Error("USAINBOT: WebGL no disponible en este navegador.");
    }
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    this.gl.toneMapping = THREE.NeutralToneMapping;
    this.gl.toneMappingExposure = graphicsSettings.toneMappingExposure;
    this.gl.info.autoReset = false;
    this.gl.domElement.style.touchAction = "none";
    container.appendChild(this.gl.domElement);

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(256, 256),
      0.5,
      graphicsSettings.bloomRadius,
      graphicsSettings.bloomThreshold
    );
    this.finalMaterial = createFinalMaterial();
    this.quad = new FullScreenQuad(this.finalMaterial);

    this.quality = this.loadQuality();
    this.preset = QUALITY_PRESETS[this.quality];
    this.applyQuality();
  }

  get qualityName(): QualityName {
    return this.quality;
  }

  get qualityPreset(): QualityPreset {
    return this.preset;
  }

  get domElement(): HTMLCanvasElement {
    return this.gl.domElement;
  }

  /** `manual` = elegido por el jugador: desactiva la bajada automática. */
  setQuality(name: QualityName, manual = false): void {
    if (manual) this.manual = true;
    this.resetPerformance();
    if (name === this.quality) return;
    this.quality = name;
    this.preset = QUALITY_PRESETS[name];
    try {
      localStorage.setItem(graphicsSettings.storageKey, name);
    } catch {
      // Sin almacenamiento: la calidad no persiste, no es crítico.
    }
    this.applyQuality();
  }

  /** Recalcula tamaños al cambiar la ventana. */
  resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioMax);
    this.gl.setPixelRatio(pr);
    this.gl.setSize(w, h);
    const rw = Math.max(1, Math.round(w * pr * this.preset.renderScale));
    const rh = Math.max(1, Math.round(h * pr * this.preset.renderScale));
    this.sceneRT?.setSize(rw, rh);
    this.bloom.setSize(Math.round(rw / 2), Math.round(rh / 2));
    const u = this.finalMaterial.uniforms;
    u.texel.value.set(1 / rw, 1 / rh);
    u.resolution.value.set(rw, rh);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dt: number, fx: ScreenFx): void {
    const rt = this.sceneRT;
    if (!rt) return;
    this.time += dt;
    this.gl.info.reset();

    this.gl.setRenderTarget(rt);
    this.gl.clear();
    this.gl.render(scene, camera);
    if (this.preset.bloom) this.bloom.render(this.gl, rt, rt, dt, false);

    const u = this.finalMaterial.uniforms;
    u.tColor.value = rt.texture;
    u.tDepth.value = rt.depthTexture;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;
    u.speed.value = fx.speed;
    u.time.value = this.time;
    this.gl.setRenderTarget(null);
    this.quad.render(this.gl);
  }

  /**
   * Mide el rendimiento en juego y baja la calidad si no llega al mínimo.
   * Devuelve el nombre de la nueva calidad si ha cambiado.
   */
  trackPerformance(dt: number): QualityName | null {
    if (this.manual) return null;
    if (this.warmup > 0) {
      this.warmup -= dt;
      return null;
    }
    this.perfTime += dt;
    this.perfFrames++;
    if (this.perfTime < graphicsSettings.autoDropWindow) return null;
    const fps = this.perfFrames / this.perfTime;
    this.perfTime = 0;
    this.perfFrames = 0;
    const next = QUALITY_FALLBACK[this.quality];
    if (fps >= graphicsSettings.autoDropFps || !next) return null;
    this.setQuality(next);
    this.warmup = graphicsSettings.autoDropWarmup;
    return next;
  }

  /** Reinicia la medición (p. ej. al salir de pausa). */
  resetPerformance(): void {
    this.perfTime = 0;
    this.perfFrames = 0;
    this.warmup = graphicsSettings.autoDropWarmup;
  }

  dispose(): void {
    this.sceneRT?.depthTexture?.dispose();
    this.sceneRT?.dispose();
    this.bloom.dispose();
    this.finalMaterial.dispose();
    this.quad.dispose();
    this.gl.dispose();
    this.gl.domElement.remove();
  }

  private loadQuality(): QualityName {
    try {
      const saved = localStorage.getItem(graphicsSettings.storageKey);
      if (saved && saved in QUALITY_PRESETS) return saved as QualityName;
    } catch {
      // ignorado
    }
    return graphicsSettings.defaultQuality;
  }

  private applyQuality(): void {
    const p = this.preset;
    this.sceneRT?.depthTexture?.dispose();
    this.sceneRT?.dispose();
    const filter = p.retro ? THREE.NearestFilter : THREE.LinearFilter;
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: p.msaa,
      minFilter: filter,
      magFilter: filter,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.bloom.strength = p.bloomStrength;
    const u = this.finalMaterial.uniforms;
    u.retro.value = p.retro ? 1 : 0;
    u.edgeAmount.value = p.edges ? graphicsSettings.edgeDarkness : 0;
    u.fogFar.value = gameSettings.world.fogFar;
    this.resize();
    this.onQualityChange?.(this.quality, p);
  }
}
