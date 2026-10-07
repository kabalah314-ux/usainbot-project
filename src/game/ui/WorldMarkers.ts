import * as THREE from "three";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { NPC } from "../npc/NPC";
import type { MissionObjective } from "../missions/Mission";
import { drawMissionBadge } from "../data/missionTypes";
import type { MissionType } from "../data/missionTypes";
import { kbd } from "./controls";

const MARKER_DISTANCE = 70;

/**
 * Icono flotante sobre cada NPC que ofrece misión, con el color/icono del
 * tipo (amarillo a pie · AZUL coche · violeta híbrida). Sprites con 3
 * texturas compartidas (1 por tipo): muy ligero.
 */
export class GiverMarkers {
  private root: THREE.Object3D;
  private sprites = new Map<string, THREE.Sprite>();
  private materials = new Map<MissionType, THREE.SpriteMaterial>();
  private time = 0;

  constructor(root: THREE.Object3D) {
    this.root = root;
  }

  private material(type: MissionType): THREE.SpriteMaterial {
    let mat = this.materials.get(type);
    if (!mat) {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 112;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Pin: disco con el icono + punta hacia el NPC
        ctx.fillStyle = "#15191f";
        ctx.beginPath();
        ctx.moveTo(34, 80);
        ctx.lineTo(48, 108);
        ctx.lineTo(62, 80);
        ctx.fill();
        drawMissionBadge(ctx, type, 48, 46, 40, true);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false });
      this.materials.set(type, mat);
    }
    return mat;
  }

  update(dt: number, pois: POIRegistry, getNPC: (id: string) => NPC | null, player: THREE.Vector3, paused: boolean): void {
    this.time += dt;
    const seen = new Set<string>();
    for (const poi of pois.byCategory("MISSION_NPC")) {
      if (poi.hidden || !poi.missionType) continue;
      const npc = getNPC(poi.id);
      if (!npc || !npc.root.visible || npc.position.distanceTo(player) > MARKER_DISTANCE) continue;
      seen.add(poi.id);
      let sprite = this.sprites.get(poi.id);
      if (!sprite) {
        sprite = new THREE.Sprite(this.material(poi.missionType));
        sprite.scale.set(0.95, 1.1, 1);
        sprite.renderOrder = 5;
        this.root.add(sprite);
        this.sprites.set(poi.id, sprite);
      }
      sprite.material = this.material(poi.missionType);
      const h = 2.55 * (npc.data.appearance.height ?? 1);
      sprite.position.set(npc.position.x, npc.position.y + h + Math.sin(this.time * 2.4 + npc.position.x) * 0.1, npc.position.z);
      sprite.visible = !paused || true;
    }
    for (const [id, sprite] of this.sprites) sprite.visible = seen.has(id);
  }
}

/** Indicador "[E] ENTRAR" en el mundo sobre el objeto interactuable prioritario. */
export class WorldPrompt {
  private el: HTMLDivElement | null = null;
  private textEl: HTMLSpanElement | null = null;
  private tmp = new THREE.Vector3();
  private text = "";

  mount(container: HTMLElement): void {
    const el = document.createElement("div");
    el.className = "ub-wprompt";
    el.hidden = true;
    el.innerHTML = `${kbd("E")}<span></span>`;
    container.appendChild(el);
    this.el = el;
    this.textEl = el.querySelector("span");
  }

  update(anchor: THREE.Vector3 | null, height: number, text: string, camera: THREE.Camera, w: number, h: number): void {
    const el = this.el;
    if (!el) return;
    if (!anchor) {
      el.hidden = true;
      return;
    }
    const p = this.tmp.copy(anchor);
    p.y += height;
    p.project(camera);
    if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (text !== this.text && this.textEl) {
      this.text = text;
      this.textEl.textContent = text;
    }
    el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -100%)`;
  }

  dispose(): void {
    this.el?.remove();
  }
}

/** Paquete flotante en los puntos de recogida de las misiones (COLLECT con ubicación). */
export class ObjectiveProp {
  readonly group = new THREE.Group();
  private time = 0;

  constructor() {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), new THREE.MeshToonMaterial({ color: 0xb58a52 }));
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.62), new THREE.MeshToonMaterial({ color: 0xff7a1a }));
    box.castShadow = true;
    this.group.add(box, tape);
    this.group.visible = false;
  }

  update(dt: number, obj: MissionObjective | null, hasItem: boolean, ground: (x: number, z: number) => number): void {
    this.time += dt;
    const loc = obj?.data.location;
    const show = !!obj && obj.data.type === "COLLECT_ITEM" && !!loc && !hasItem;
    this.group.visible = show;
    if (!show || !loc) return;
    this.group.position.set(loc.x, ground(loc.x, loc.z) + 0.7 + Math.sin(this.time * 2.5) * 0.12, loc.z);
    this.group.rotation.y += dt * 1.8;
  }
}
