import { CONTROL_HINTS, kbd, renderHint } from "./controls";

/**
 * Pantallas a pantalla completa (inicio / pausa), estilo menú de PS2.
 * Se activan con clic, ENTER/ESPACIO o ✕/START en el mando.
 */
export class MenuManager {
  onActivate: (() => void) | null = null;

  private root: HTMLDivElement | null = null;
  private mode: "start" | "pause" | "hidden" = "hidden";

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-menu";
    root.addEventListener("click", () => {
      if (this.mode !== "hidden") this.onActivate?.();
    });
    container.appendChild(root);
    this.root = root;
    this.hide();
  }

  showStart(): void {
    this.mode = "start";
    this.render(`
      <div class="ub-menu__panel">
        <h2 class="ub-menu__title ub-menu__title--start">USAINBOT</h2>
        <p class="ub-menu__tagline">"¿De verdad crees que me puedes ganar?"</p>
        <div class="ub-menu__controls">${CONTROL_HINTS.map(renderHint).join("")}</div>
        <div class="ub-menu__cta">CLIC O ${kbd("ENTER")} PARA EMPEZAR</div>
      </div>
    `);
  }

  /** Pausa: controles + inventario (la ayuda sigue accesible aquí). */
  showPause(inventoryHtml = ""): void {
    this.mode = "pause";
    this.render(`
      <div class="ub-menu__panel">
        <h2 class="ub-menu__title">PAUSA</h2>
        <p class="ub-menu__tagline">El mundo se ha detenido. Tú no.</p>
        ${inventoryHtml}
        <div class="ub-menu__controls">${CONTROL_HINTS.map(renderHint).join("")}</div>
        <div class="ub-menu__cta">CLIC O ${kbd("ESC")} PARA CONTINUAR</div>
      </div>
    `);
  }

  hide(): void {
    this.mode = "hidden";
    if (this.root) this.root.hidden = true;
  }

  get visible(): boolean {
    return this.mode !== "hidden";
  }

  private render(html: string): void {
    if (!this.root) return;
    this.root.innerHTML = html;
    this.root.hidden = false;
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
