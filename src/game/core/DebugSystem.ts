import type * as THREE from "three";
import type { Player } from "../player/Player";
import type { SceneManager } from "./SceneManager";
import type { MissionManager } from "../missions/MissionManager";

export type DebugMessageKind = "info" | "success" | "warn" | "error";

const MAX_LOG = 8;

/**
 * Herramienta de desarrollo DISCRETA: cerrada solo se ve un pequeño botón
 * [DEBUG] en una esquina. Al pulsarlo (o F2/F3) se abre el panel con FPS,
 * draw calls, posición, velocidad, estado, misión, objetivo, vehículo,
 * turbo, GasOil y el registro de mensajes/errores. La pantalla del jugador
 * queda limpia. El sistema sigue midiendo aunque esté cerrado.
 */
export class DebugSystem {
  private panel: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private statsEl: HTMLPreElement | null = null;
  private logEl: HTMLDivElement | null = null;
  private onMessageCb: ((text: string, kind: DebugMessageKind) => void) | null = null;
  private visible = false;
  private frames = 0;
  private fpsAccum = 0;
  private fps = 0;
  private msAvg = 0;
  private messages: Array<{ text: string; kind: DebugMessageKind }> = [];
  private errors = 0;

  /** (Opcional) reenviar mensajes a otro sitio. Por defecto van al panel. */
  set onMessage(cb: ((text: string, kind: DebugMessageKind) => void) | null) {
    this.onMessageCb = cb;
  }

  get isOpen(): boolean {
    return this.visible;
  }

  mount(container: HTMLElement): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ub-debug-btn";
    button.textContent = "DEBUG";
    button.title = "Herramientas de desarrollo (F2 / F3)";
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
      button.blur(); // que ESPACIO/ENTER no vuelvan a pulsarlo
    });
    container.appendChild(button);
    this.button = button;

    const panel = document.createElement("div");
    panel.className = "ub-debug";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="ub-debug__head">DEBUG · F2 / F3 · clic en el botón para cerrar</div>
      <pre class="ub-debug__stats"></pre>
      <div class="ub-debug__log"></div>
    `;
    container.appendChild(panel);
    this.panel = panel;
    this.statsEl = panel.querySelector(".ub-debug__stats");
    this.logEl = panel.querySelector(".ub-debug__log");
    window.addEventListener("error", this.onError);
    window.addEventListener("unhandledrejection", this.onRejection);
  }

  toggle(open = !this.visible): void {
    this.visible = open;
    if (this.panel) this.panel.hidden = !open;
    this.button?.classList.toggle("ub-debug-btn--open", open);
    if (open) {
      this.fpsAccum = 0.5; // refresco inmediato
      this.renderLog();
    }
  }

  log(text: string, kind: DebugMessageKind = "info"): void {
    this.messages.push({ text, kind });
    if (this.messages.length > MAX_LOG) this.messages.shift();
    if (kind === "error") {
      this.errors++;
      this.button?.classList.add("ub-debug-btn--error");
      if (this.button) this.button.textContent = `DEBUG · ${this.errors}!`;
    }
    this.onMessageCb?.(text, kind);
    if (this.visible) this.renderLog();
    if (kind === "error") console.error("[USAINBOT]", text);
    else if (kind === "warn") console.warn("[USAINBOT]", text);
  }

  private renderLog(): void {
    if (!this.logEl) return;
    this.logEl.innerHTML = this.messages
      .map((m) => `<div class="ub-debug__msg ub-debug__msg--${m.kind}"></div>`)
      .join("");
    const nodes = this.logEl.children;
    this.messages.forEach((m, i) => {
      (nodes[i] as HTMLElement).textContent = m.text;
    });
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

    this.fps = Math.round(this.frames / Math.max(1e-3, this.fpsAccum));
    this.frames = 0;
    this.fpsAccum = 0;
    if (!this.visible || !this.statsEl) return;

    const p = player.root.position;
    this.statsEl.textContent = [
      `FPS        ${this.fps}   (${this.msAvg.toFixed(1)} ms)`,
      `DRAW CALLS ${renderer.info.render.calls} · TRIS ${renderer.info.render.triangles}`,
      `ESCENA     ${scenes.activeName} · ${paused ? "PAUSA" : "EN JUEGO"}`,
      `POSICIÓN   ${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)}`,
      `VELOCIDAD  ${player.speed.toFixed(1)} m/s`,
      `JUGADOR    ${player.mode} · ${player.status}`,
      `ENTRADA    ${inputLabel}`,
      `MISIÓN     ${missions.summary()}`,
      ...extra,
    ].join("\n");
  }

  dispose(): void {
    this.panel?.remove();
    this.button?.remove();
    this.panel = null;
    this.button = null;
    this.statsEl = null;
    window.removeEventListener("error", this.onError);
    window.removeEventListener("unhandledrejection", this.onRejection);
  }
}
