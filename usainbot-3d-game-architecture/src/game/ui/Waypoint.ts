import * as THREE from "three";
import type { NavTarget } from "../missions/MissionNavigator";
import { POI_STYLES } from "../data/poi";

const HIDE_DISTANCE = 3;
const tmp = new THREE.Vector3();

/**
 * Waypoint de misión:
 * - Brújula superior: icono + nombre + distancia + flecha relativa a la cámara.
 * - Marcador en pantalla sobre el objetivo (anclado al borde si no se ve).
 * - Baliza 3D de luz (se ve desde lejos por encima de los edificios).
 */
export class Waypoint {
  private compass: HTMLDivElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private labelEl: HTMLElement | null = null;
  private distEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private marker: HTMLDivElement | null = null;
  private markerDist: HTMLElement | null = null;
  private markerIcon: HTMLElement | null = null;
  readonly beacon = new THREE.Group();
  private gem: THREE.Mesh;
  private time = 0;

  constructor() {
    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.6, 1.1, 0.25),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 70, 10, 1, true), beamMat);
    beam.position.y = 35;
    this.gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.3) })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.4, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.3, 0.3), transparent: true, opacity: 0.8, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.beacon.add(beam, this.gem, ring);
    this.beacon.visible = false;
    this.beacon.renderOrder = 10;
  }

  mount(container: HTMLElement): void {
    const compass = document.createElement("div");
    compass.className = "ub-waypoint";
    compass.hidden = true;
    compass.innerHTML = `
      <span class="ub-waypoint__arrow">▲</span>
      <span class="ub-waypoint__icon"></span>
      <span class="ub-waypoint__label"></span>
      <span class="ub-waypoint__dist"></span>`;
    container.appendChild(compass);
    this.compass = compass;
    this.arrowEl = compass.querySelector(".ub-waypoint__arrow");
    this.iconEl = compass.querySelector(".ub-waypoint__icon");
    this.labelEl = compass.querySelector(".ub-waypoint__label");
    this.distEl = compass.querySelector(".ub-waypoint__dist");

    const marker = document.createElement("div");
    marker.className = "ub-marker";
    marker.hidden = true;
    marker.innerHTML = `<span class="ub-marker__icon"></span><span class="ub-marker__dist"></span>`;
    container.appendChild(marker);
    this.marker = marker;
    this.markerIcon = marker.querySelector(".ub-marker__icon");
    this.markerDist = marker.querySelector(".ub-marker__dist");
  }

  update(
    dt: number,
    target: NavTarget | null,
    player: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    cameraYaw: number,
    width: number,
    height: number,
    visible: boolean
  ): void {
    this.time += dt;
    const show = visible && target !== null;
    if (!show || !target) {
      if (this.compass) this.compass.hidden = true;
      if (this.marker) this.marker.hidden = true;
      this.beacon.visible = false;
      return;
    }
    const pos = target.poi.position;
    const dist = Math.hypot(pos.x - player.x, pos.z - player.z);
    const style = POI_STYLES[target.poi.category];

    // Brújula
    if (this.compass && this.arrowEl && this.labelEl && this.distEl && this.iconEl) {
      this.compass.hidden = false;
      this.compass.style.setProperty("--wp-color", style.color);
      if (this.labelEl.textContent !== target.label) this.labelEl.textContent = target.label;
      this.iconEl.textContent = style.glyph;
      this.distEl.textContent = `${Math.round(dist)} m`;
      const fx = -Math.sin(cameraYaw);
      const fz = -Math.cos(cameraYaw);
      const dx = pos.x - player.x;
      const dz = pos.z - player.z;
      const rel = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz);
      this.arrowEl.style.transform = `rotate(${(-rel * 180) / Math.PI}deg)`;
    }

    // Baliza 3D
    this.beacon.visible = dist > HIDE_DISTANCE;
    this.beacon.position.set(pos.x, 0, pos.z);
    this.gem.position.y = 3.3 + Math.sin(this.time * 3) * 0.25;
    this.gem.rotation.y += dt * 2;

    // Marcador en pantalla (anclado al borde si queda fuera)
    if (!this.marker || !this.markerDist || !this.markerIcon) return;
    if (dist < HIDE_DISTANCE) {
      this.marker.hidden = true;
      return;
    }
    tmp.set(pos.x, 4.2, pos.z).project(camera);
    const behind = tmp.z > 1;
    let sx = tmp.x;
    let sy = tmp.y;
    if (behind) {
      sx = -sx;
      sy = -Math.abs(sy) - 1;
    }
    const margin = 0.9;
    const m = Math.max(Math.abs(sx) / margin, Math.abs(sy) / margin, 1);
    sx /= m;
    sy /= m;
    this.marker.hidden = false;
    this.marker.classList.toggle("ub-marker--edge", m > 1 || behind);
    this.marker.style.setProperty("--wp-color", style.color);
    this.marker.style.transform = `translate(${((sx + 1) / 2) * width}px, ${((1 - sy) / 2) * height}px)`;
    this.markerIcon.textContent = style.glyph;
    this.markerDist.textContent = `${Math.round(dist)} m`;
  }

  dispose(): void {
    this.compass?.remove();
    this.marker?.remove();
  }
}
