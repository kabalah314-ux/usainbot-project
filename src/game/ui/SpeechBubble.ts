import * as THREE from "three";

/**
 * Bocadillo holográfico anclado a un punto 3D (estilo de la ilustración:
 * panel verde azulado con esquinas achaflanadas y borde luminoso).
 * DOM imperativo: solo se actualiza la posición mientras está visible.
 */
export class SpeechBubble {
  private root: HTMLDivElement | null = null;
  private textEl: HTMLSpanElement | null = null;
  private visible = false;
  private text = "";
  private projected = new THREE.Vector3();

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-bubble";
    root.innerHTML = `<div class="ub-bubble__frame"><span class="ub-bubble__text"></span></div>`;
    container.appendChild(root);
    this.root = root;
    this.textEl = root.querySelector(".ub-bubble__text");
    this.hide();
  }

  show(text: string): void {
    if (!this.root) return;
    if (text !== this.text && this.textEl) {
      this.text = text;
      this.textEl.textContent = text;
      this.root.classList.remove("ub-bubble--pop");
      void this.root.offsetWidth; // reinicia la animación de aparición
      this.root.classList.add("ub-bubble--pop");
    }
    if (!this.visible) {
      this.visible = true;
      this.root.hidden = false;
    }
  }

  hide(): void {
    this.visible = false;
    this.text = "";
    if (this.root) this.root.hidden = true;
  }

  /** Coloca el bocadillo arriba a la derecha del punto de anclaje. */
  follow(anchor: THREE.Vector3, camera: THREE.Camera, width: number, height: number): void {
    if (!this.visible || !this.root) return;
    const p = this.projected.copy(anchor).project(camera);
    const behind = p.z > 1;
    this.root.style.opacity = behind ? "0" : "1";
    const x = (p.x * 0.5 + 0.5) * width;
    const y = (-p.y * 0.5 + 0.5) * height;
    this.root.style.transform = `translate(${Math.round(x + 18)}px, ${Math.round(y - 20)}px) translateY(-100%)`;
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
