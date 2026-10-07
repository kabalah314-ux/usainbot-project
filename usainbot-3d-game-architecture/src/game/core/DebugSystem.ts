import type * as THREE from "three";
import type { Player } from "../player/Player";
import type { SceneManager } from "./SceneManager";
import type { MissionManager } from "../missions/MissionManager";

export type DebugMessageKind = "info" | "success" | "warn" | "error";

/**
 * Sistema de debug activable con F2.
 * Mide FPS/draw calls/triangulos, muestra el estado del juego
 * y recoge errores del navegador sin contaminar el código.
 */
export class DebugSystem {
  private panel: HTMLDivElement | null = null;
  private statsEl: HTMLPreElement | null = null;
  private onMessageCb: ((text: string, kind: DebugMessageKind) => void) | null = null;
  private visible = true;
  private frames = 0;
  private fpsAccum = 0;
  private fps = 0;
  private msAvg = 0;

  set onMessage(cb: ((text: string, kind: DebugMessageKind) => void) | null) {
    this.onMessageCb = cb;
  }

  mount(container: HTMLElement): void {
    const panel = document.createElement("div");
    panel.className = "ub-debug";
    panel.innerHTML = `
      <div class="ub-debug__head">DEBUG · F2</div>
      <pre class="ub-debug__stats"></pre>
    `;
    container.appendChild(panel);
    this.panel = panel;
    this.statsEl = panel.querySelector(".ub-debug__stats");
    window.addEventListener("error", this.onError);
    window.addEventListener("unhandledrejection", this.onRejection);
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.panel) this.panel.style.display = this.visible ? "" : "none";
  }

  log(text: string, kind: DebugMessageKind = "info"): void {
    this.onMessageCb?.(text, kind);
    if (kind === "error") console.error("[USAINBOT]", text);
    else if (kind === "warn") console.warn("[USAINBOT]", text);
  }

  private onError = (e: ErrorEvent): void => {
    this.log(`ERROR: ${e.message}`, "error");
  };

  private onRejection = (): void => {
    this.log("ERROR: promesa sin manejar", "error");
  };

  /** Se llama tras el render para leer renderer.info. */
  update(
    dt: number,
    renderer: THREE.WebGLRenderer,
    player: Player,
    scenes: SceneManager,
    missions: MissionManager,
    paused: boolean,
    inputLabel: string,
    extra: readonly string[] = []
  ): void {
    this.frames++;
    this.fpsAccum += dt;
    this.msAvg = this.msAvg * 0.9 + dt * 1000 * 0.1;
    if (this.fpsAccum < 0.5) return;

    this.fps = Math.round(this.frames / this.fpsAccum);
    this.frames = 0;
    this.fpsAccum = 0;
    if (!this.visible || !this.statsEl) return;

    const p = player.root.position;
    this.statsEl.textContent = [
      `FPS        ${this.fps}`,
      `FRAME      ${this.msAvg.toFixed(1)} ms`,
      `DRAW CALLS ${renderer.info.render.calls}`,
      `TRIANGULOS ${renderer.info.render.triangles}`,
      `ESCENA     ${scenes.activeName}`,
      `ESTADO     ${paused ? "PAUSA" : "EN JUEGO"}`,
      `JUGADOR    ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      `VELOCIDAD  ${player.speed.toFixed(1)} m/s`,
      `ESTADO PJ  ${player.state}`,
      `ENTRADA    ${inputLabel}`,
      `MISION     ${missions.summary()}`,
      ...extra,
    ].join("\n");
  }

  dispose(): void {
    this.panel?.remove();
    this.panel = null;
    this.statsEl = null;
    window.removeEventListener("error", this.onError);
    window.removeEventListener("unhandledrejection", this.onRejection);
  }
}
