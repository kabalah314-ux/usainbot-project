import { CONTROL_HINTS, kbd, renderHint } from "./controls";

/**
 * Pantallas a pantalla completa (inicio / pausa), estilo menú de PS2.
 * En la de inicio se elige la SESIÓN de perfil (la partida que se guarda y
 * carga sola). Se activa con clic, ENTER/ESPACIO o ✕/START en el mando.
 */
export class MenuManager {
  onActivate: ((slot: string) => void) | null = null;

  private root: HTMLDivElement | null = null;
  private mode: "start" | "pause" | "hidden" = "hidden";
  private slotValue = "jugador";

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-menu";
    root.addEventListener("click", (e) => {
      if (this.mode === "hidden") return;
      const btn = (e.target as HTMLElement | null)?.closest?.("[data-act]") as HTMLElement | null;
      if (btn) {
        if (btn.dataset.act === "slot-new") {
          this.slotValue = "jugador";
          this.showStart();
          return;
        }
      }
      this.activate();
    });
    container.appendChild(root);
    this.root = root;
    this.hide();
  }

  /** Perfil/sesión activo (el que se guarda y carga). */
  get currentSlot(): string {
    return this.slotValue;
  }

  showStart(slot = this.slotValue, hasSave = false): void {
    this.mode = "start";
    this.slotValue = slot;
    const cont = hasSave
      ? `<div class="ub-menu__save">SESIÓN GUARDADA: <b>${slot}</b> · se retoma donde lo dejaste</div>
         <div class="ub-menu__cta">CLIC O ${kbd("ENTER")} PARA CONTINUAR</div>`
      : `<div class="ub-menu__save">PARTIDA NUEVA · se guarda sola en este navegador</div>
         <div class="ub-menu__cta">CLIC O ${kbd("ENTER")} PARA EMPEZAR</div>`;
    this.render(`
      <div class="ub-menu__panel">
        <h2 class="ub-menu__title ub-menu__title--start">USAINBOT</h2>
        <p class="ub-menu__tagline">"¿De verdad crees que me puedes ganar?"</p>
        <label class="ub-menu__login">
          <span>SESIÓN</span>
          <input class="ub-menu__input" maxlength="18" spellcheck="false" value="${slot}" aria-label="Nombre de la sesión" />
          <em>nuevo nombre = partida nueva</em>
        </label>
        ${cont}
        <div class="ub-menu__controls">${CONTROL_HINTS.map(renderHint).join("")}</div>
      </div>
    `);
  }

  showPause(inventoryHtml = ""): void {
    this.mode = "pause";
    this.render(`
      <div class="ub-menu__panel">
        <h2 class="ub-menu__title">PAUSA</h2>
        <p class="ub-menu__tagline">El mundo se ha detenido. Tú no.</p>
        <div class="ub-menu__save">SESIÓN: <b>${this.slotValue}</b> · guardado automático</div>
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

  /** Confirma (clic, ENTER o mando): lee la sesión escrita y arranca. */
  activate(): void {
    const input = this.root?.querySelector(".ub-menu__input") as HTMLInputElement | null;
    if (input) this.slotValue = input.value;
    this.onActivate?.(this.slotValue);
  }

  get visible(): boolean {
    return this.mode !== "hidden";
  }

  private render(html: string): void {
    if (!this.root) return;
    this.root.innerHTML = html;
    this.root.hidden = false;
    // foco en el campo de sesión para escribir el perfil al entrar
    const input = this.root.querySelector(".ub-menu__input") as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
