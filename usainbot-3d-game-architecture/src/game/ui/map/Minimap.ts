import type * as THREE from "three";
import type { MapData } from "../../world/map/MapData";
import type { POI, POIRegistry } from "../../world/poi/POIRegistry";
import { POI_STYLES } from "../../data/poi";
import { MAP_PAD, drawCarIcon, drawPOIIcon, drawPlayerArrow } from "./MapRenderer";

const SIZE = 196;
const RADIUS = SIZE / 2 - 4;
/** Metros visibles desde el centro hasta el borde. */
const RANGE = 70;

/**
 * Minimapa circular que gira con la cámara (arriba = hacia donde miras).
 * Dibuja el mapa base pre-renderizado + POIs + objetivo (anclado al borde
 * si está fuera de rango) + flecha del jugador.
 */
export class Minimap {
  private root: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private zoneEl: HTMLElement | null = null;
  private base: HTMLCanvasElement;
  private basePPM: number;
  private map: MapData;
  private pois: POIRegistry;

  constructor(map: MapData, pois: POIRegistry, base: HTMLCanvasElement, basePPM: number) {
    this.map = map;
    this.pois = pois;
    this.base = base;
    this.basePPM = basePPM;
  }

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-minimap";
    root.innerHTML = `<canvas width="${SIZE}" height="${SIZE}"></canvas><div class="ub-minimap__zone"></div>`;
    container.appendChild(root);
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas?.getContext("2d") ?? null;
    this.zoneEl = root.querySelector(".ub-minimap__zone");
  }

  setZone(name: string): void {
    if (this.zoneEl && this.zoneEl.textContent !== name) this.zoneEl.textContent = name;
  }

  update(
    player: THREE.Vector3,
    playerYaw: number,
    cameraYaw: number,
    target: POI | null,
    route: Array<[number, number]> | null = null,
    inVehicle = false
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const c = SIZE / 2;
    const k = RADIUS / RANGE;
    // Rotación: el "adelante" de la cámara (-sin, -cos) queda arriba.
    const theta = -Math.PI / 2 - Math.atan2(-Math.cos(cameraYaw), -Math.sin(cameraYaw));
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const toScreen = (x: number, z: number): [number, number] => {
      const dx = (x - player.x) * k;
      const dz = (z - player.z) * k;
      return [c + dx * cos - dz * sin, c + dx * sin + dz * cos];
    };

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#6f8f5a";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.translate(c, c);
    ctx.rotate(theta);
    const s = k / this.basePPM;
    ctx.scale(s, s);
    const B = this.map.bounds;
    ctx.translate(-(player.x - B.minX + MAP_PAD) * this.basePPM, -(player.z - B.minZ + MAP_PAD) * this.basePPM);
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();

    // Recorrido de la carrera (línea discontinua)
    if (route && route.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, RADIUS, 0, Math.PI * 2);
      ctx.clip();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,77,109,0.95)";
      ctx.beginPath();
      route.forEach(([x, z], i) => {
        const [sx, sy] = toScreen(x, z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // POIs (orden por prioridad; el objetivo, encima y anclado al borde)
    const list = this.pois
      .visible()
      .filter((p) => POI_STYLES[p.category].minimap && p !== target)
      .sort((a, b) => POI_STYLES[a.category].priority - POI_STYLES[b.category].priority);
    for (const poi of list) {
      const [x, y] = toScreen(poi.position.x, poi.position.z);
      if (Math.hypot(x - c, y - c) > RADIUS - 8) continue;
      drawPOIIcon(ctx, poi, x, y, 8);
    }
    if (target) {
      let [x, y] = toScreen(target.position.x, target.position.z);
      const d = Math.hypot(x - c, y - c);
      const edge = RADIUS - 11;
      if (d > edge) {
        x = c + ((x - c) / d) * edge;
        y = c + ((y - c) / d) * edge;
      }
      const pulse = 11 + Math.sin(performance.now() / 180) * 2;
      ctx.beginPath();
      ctx.arc(x, y, pulse + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,225,77,0.35)";
      ctx.fill();
      drawPOIIcon(ctx, target, x, y, 10, true);
    }

    // Jugador y norte
    const fx = Math.sin(playerYaw);
    const fz = Math.cos(playerYaw);
    const heading = Math.atan2(fx * cos - fz * sin, -(fx * sin + fz * cos));
    if (inVehicle) drawCarIcon(ctx, c, c, heading, 11);
    else drawPlayerArrow(ctx, c, c, heading, 9);
    const [nx, ny] = toScreen(player.x, player.z - 1000);
    const nd = Math.hypot(nx - c, ny - c) || 1;
    const px = c + ((nx - c) / nd) * (RADIUS - 2);
    const py = c + ((ny - c) / nd) * (RADIUS - 2);
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#d8322b";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", px, py + 1);
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
