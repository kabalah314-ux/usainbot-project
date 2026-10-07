import * as THREE from "three";

const POOL = 7;
const MAX_DISTANCE = 45;

interface Bark {
  el: HTMLDivElement;
  text: HTMLSpanElement;
  /** Posición viva a seguir (cabeza del NPC, coche…). */
  anchor: THREE.Vector3 | null;
  height: number;
  time: number;
  key: string;
}

/**
 * Frases cortas sobre la cabeza de NPCs y coches ("¡Ey!", "BATERÍA BAJA…").
 * Pool fijo de elementos DOM reutilizados (sin crear/destruir en juego).
 */
export class BarkSystem {
  private barks: Bark[] = [];
  private tmp = new THREE.Vector3();

  mount(container: HTMLElement): void {
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement("div");
      el.className = "ub-bark";
      el.hidden = true;
      el.innerHTML = `<span></span>`;
      container.appendChild(el);
      this.barks.push({ el, text: el.querySelector("span") as HTMLSpanElement, anchor: null, height: 2.3, time: 0, key: "" });
    }
  }

  /**
   * Muestra una frase siguiendo `anchor`. `key` identifica al emisor: si ya
   * tiene una frase, se reemplaza (no se apilan). `style` cambia el color.
   */
  say(anchor: THREE.Vector3, text: string, seconds = 2.2, key = "", style: "normal" | "alert" | "gasoil" = "normal", height = 2.3): void {
    let bark = key ? this.barks.find((b) => b.key === key && b.time > 0) : undefined;
    if (!bark) bark = this.barks.find((b) => b.time <= 0) ?? this.barks.reduce((a, b) => (a.time < b.time ? a : b));
    bark.anchor = anchor;
    bark.time = seconds;
    bark.key = key;
    bark.height = height;
    bark.text.textContent = text;
    bark.el.className = `ub-bark ub-bark--${style}`;
    bark.el.hidden = false;
  }

  /** Quita la frase de un emisor. */
  clear(key: string): void {
    for (const b of this.barks) if (b.key === key) b.time = 0;
  }

  update(dt: number, camera: THREE.Camera, width: number, height: number, hidden: boolean): void {
    for (const b of this.barks) {
      if (b.time <= 0 || !b.anchor) {
        if (!b.el.hidden) b.el.hidden = true;
        continue;
      }
      b.time -= dt;
      const p = this.tmp.copy(b.anchor);
      p.y += b.height;
      const far = camera.position.distanceTo(p) > MAX_DISTANCE;
      p.project(camera);
      if (hidden || far || p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) {
        b.el.style.opacity = "0";
        continue;
      }
      b.el.style.opacity = b.time < 0.3 ? String(Math.max(0, b.time / 0.3)) : "1";
      b.el.style.transform = `translate(${((p.x + 1) / 2) * width}px, ${((1 - p.y) / 2) * height}px) translate(-50%, -100%)`;
    }
  }

  dispose(): void {
    for (const b of this.barks) b.el.remove();
    this.barks = [];
  }
}
