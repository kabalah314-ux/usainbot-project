import type { DialogueManager } from "../dialogue/DialogueManager";
import { kbd } from "./controls";

const CHARS_PER_SECOND = 70;

/** Caja de diálogo estilo PS2 con efecto máquina de escribir. */
export class DialogueBox {
  private root: HTMLDivElement | null = null;
  private nameEl: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private tagEl: HTMLElement | null = null;
  private manager: DialogueManager;
  private full = "";
  private shown = 0;

  constructor(manager: DialogueManager) {
    this.manager = manager;
    manager.onChange((speaker, text) => {
      if (!this.root) return;
      if (speaker === null || text === null) {
        this.root.hidden = true;
        return;
      }
      this.root.hidden = false;
      if (this.nameEl) this.nameEl.textContent = speaker;
      const tag = this.manager.tag;
      if (this.tagEl) {
        this.tagEl.hidden = !tag;
        if (tag && this.tagEl.innerHTML !== tag) this.tagEl.innerHTML = tag;
      }
      this.full = text;
      this.shown = 0;
      if (this.textEl) this.textEl.textContent = "";
    });
  }

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-dialogue";
    root.hidden = true;
    root.innerHTML = `
      <div class="ub-dialogue__name"></div>
      <div class="ub-dialogue__tag" hidden></div>
      <div class="ub-dialogue__text"></div>
      <div class="ub-dialogue__hint">${kbd("E")} ${kbd("SPACE")} continuar</div>
    `;
    container.appendChild(root);
    this.root = root;
    this.nameEl = root.querySelector(".ub-dialogue__name");
    this.textEl = root.querySelector(".ub-dialogue__text");
    this.tagEl = root.querySelector(".ub-dialogue__tag");
  }

  /** Primero completa el texto; si ya estaba completo, avanza. */
  press(): void {
    if (!this.manager.active) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      if (this.textEl) this.textEl.textContent = this.full;
      return;
    }
    this.manager.advance();
  }

  update(dt: number): void {
    if (!this.manager.active || this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + CHARS_PER_SECOND * dt);
    if (this.textEl) this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
