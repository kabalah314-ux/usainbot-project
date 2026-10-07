import type * as THREE from "three";
import type { MapData } from "../../world/map/MapData";
import type { POI, POIRegistry } from "../../world/poi/POIRegistry";
import { POI_STYLES } from "../../data/poi";
import type { POICategory } from "../../data/poi";
import { MAP_PAD, drawCarIcon, drawPOIIcon, drawPlayerArrow } from "./MapRenderer";
import { kbd } from "../controls";
import { MISSION_TYPE_STYLE, missionIconSVG } from "../../data/missionTypes";
import type { MissionType } from "../../data/missionTypes";

/** Mapa completo del barrio (norte arriba) con POIs, leyenda y objetivo. */
export class WorldMapOverlay {
  private root: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private infoEl: HTMLElement | null = null;
  private base: HTMLCanvasElement;
  private basePPM: number;
  private map: MapData;
  private pois: POIRegistry;
  open = false;

  constructor(map: MapData, pois: POIRegistry, base: HTMLCanvasElement, basePPM: number) {
    this.map = map;
    this.pois = pois;
    this.base = base;
    this.basePPM = basePPM;
  }

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-worldmap";
    root.hidden = true;
    const legend = (Object.keys(POI_STYLES) as POICategory[])
      .map((c) => `<li><span style="color:${POI_STYLES[c].color}">${POI_STYLES[c].glyph}</span>${POI_STYLES[c].label}</li>`)
      .join("");
    root.innerHTML = `
      <div class="ub-worldmap__panel">
        <canvas></canvas>
        <aside>
          <h2>MAPA DEL BARRIO</h2>
          <div class="ub-worldmap__info"></div>
          <ul class="ub-worldmap__types">
            <li style="color:${MISSION_TYPE_STYLE.ON_FOOT.color}">${missionIconSVG("ON_FOOT", 14)} Misión a pie</li>
            <li style="color:${MISSION_TYPE_STYLE.VEHICLE.color}">${missionIconSVG("VEHICLE", 14)} Misión de conducción</li>
            <li style="color:${MISSION_TYPE_STYLE.HYBRID.color}">${missionIconSVG("HYBRID", 14)} Misión híbrida</li>
          </ul>
          <ul>${legend}<li><span style="color:#5ff7d6">▲</span>UsainBot</li></ul>
          <p>${kbd("M")} ${kbd("ESC")} cerrar</p>
        </aside>
      </div>`;
    container.appendChild(root);
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.infoEl = root.querySelector(".ub-worldmap__info");
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    if (this.root) this.root.hidden = !this.open;
  }

  /** Solo se redibuja mientras está abierto. */
  update(
    player: THREE.Vector3,
    playerYaw: number,
    target: POI | null,
    targetLabel: string,
    zoneName: string,
    inVehicle = false,
    targetType: MissionType | null = null
  ): void {
    if (!this.open || !this.canvas) return;
    const maxH = Math.min(window.innerHeight * 0.84, 820);
    const scale = maxH / this.base.height;
    const w = Math.round(this.base.width * scale);
    const h = Math.round(this.base.height * scale);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    const B = this.map.bounds;
    const ppm = this.basePPM * scale;
    const X = (x: number): number => (x - B.minX + MAP_PAD) * ppm;
    const Z = (z: number): number => (z - B.minZ + MAP_PAD) * ppm;
    ctx.drawImage(this.base, 0, 0, w, h);

    ctx.fillStyle = "rgba(20,24,30,0.75)";
    ctx.font = `900 ${Math.max(9, Math.round(ppm * 4))}px Arial, sans-serif`;
    ctx.textAlign = "center";
    for (const l of this.map.labels) ctx.fillText(l.text, X(l.x), Z(l.z));

    if (target) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = targetType ? MISSION_TYPE_STYLE[targetType].color : "rgba(255,225,77,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(player.x), Z(player.z));
      ctx.lineTo(X(target.position.x), Z(target.position.z));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const list = this.pois.visible().sort((a, b) => POI_STYLES[a.category].priority - POI_STYLES[b.category].priority);
    for (const poi of list) {
      drawPOIIcon(ctx, poi, X(poi.position.x), Z(poi.position.z), poi === target ? 11 : 8, poi === target, poi === target ? targetType : null);
    }
    // Objetivo dinámico (no registrado como POI): también con el color del tipo
    if (target && !list.includes(target)) drawPOIIcon(ctx, target, X(target.position.x), Z(target.position.z), 11, true, targetType);
    const heading = Math.atan2(Math.sin(playerYaw), -Math.cos(playerYaw));
    if (inVehicle) drawCarIcon(ctx, X(player.x), Z(player.z), heading, 10);
    else drawPlayerArrow(ctx, X(player.x), Z(player.z), heading, 11);

    if (this.infoEl) {
      const dist = target ? Math.round(target.position.distanceTo(player)) : 0;
      this.infoEl.innerHTML = `<b>ZONA:</b> ${zoneName}<br>${target ? `<b>OBJETIVO:</b> ${targetLabel} · ${dist} m` : "Sin objetivo activo"}`;
    }
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
