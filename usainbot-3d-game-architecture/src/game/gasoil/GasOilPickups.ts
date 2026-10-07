import * as THREE from "three";
import type { Inventory } from "../inventory/Inventory";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { GroundQuery } from "../world/GroundMap";
import { GASOIL_ITEM, ITEMS } from "../data/items";
import { CAN_SIZE, createCanMesh } from "./canMesh";

/** Latas de GasOil sueltas por el barrio (recompensa por explorar). */
const SPOTS: Array<[number, number]> = [
  [-38, -2], // callejón de Robo-Burger
  [-50, 13], // plaza trasera del comercio
  [-44, -162], // estanque del parque
  [62, -136], // zona infantil
  [-44, 101], // cancha vecinal
  [64, 152.5], // paseo peatonal
  [98, 100], // esquina de la gasolinera
];
const RESPAWN = 75;
const RADIUS = 1.3;

/**
 * Latas flotantes que se recogen al pasar (reaparecen al rato).
 * Todas comparten geometría/materiales de la lata 3D; se animan con un
 * seno por frame, sin crear ni destruir objetos.
 */
export class GasOilPickups {
  readonly group = new THREE.Group();
  private cans: Array<{ mesh: THREE.Group; x: number; z: number; y: number; timer: number }> = [];
  private time = 0;
  private inventory: Inventory;
  private onPick: () => void;

  constructor(inventory: Inventory, pois: POIRegistry, ground: GroundQuery, onPick: () => void) {
    this.inventory = inventory;
    this.onPick = onPick;
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.8, 0.8, 0.2),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringGeo = new THREE.RingGeometry(0.35, 0.55, 20);
    SPOTS.forEach(([x, z], i) => {
      const y = ground(x, z);
      const mesh = createCanMesh();
      mesh.scale.setScalar(2.2);
      mesh.traverse((o) => {
        o.castShadow = false;
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, y + 0.03, z);
      mesh.position.set(x, y + 0.7, z);
      this.group.add(mesh, ring);
      mesh.userData.ring = ring;
      this.cans.push({ mesh, x, z, y, timer: 0 });
      pois.add({ id: `gasoil_pickup_${i}`, name: "Lata de GasOil", category: "GASOIL_PICKUP", position: mesh.position });
    });
  }

  update(dt: number, player: THREE.Vector3): void {
    this.time += dt;
    const full = this.inventory.count(GASOIL_ITEM) >= ITEMS[GASOIL_ITEM].maxStack;
    for (const can of this.cans) {
      const ring = can.mesh.userData.ring as THREE.Mesh;
      if (can.timer > 0) {
        can.timer -= dt;
        const back = can.timer <= 0;
        can.mesh.visible = back;
        ring.visible = back;
        continue;
      }
      can.mesh.position.y = can.y + 0.7 + Math.sin(this.time * 2.5 + can.x) * 0.12;
      can.mesh.rotation.y += dt * 2.2;
      if (!full && Math.hypot(player.x - can.x, player.z - can.z) < RADIUS && player.y < can.y + 1.8 + CAN_SIZE.height) {
        if (this.inventory.add(GASOIL_ITEM, 1) > 0) {
          can.timer = RESPAWN;
          can.mesh.visible = false;
          ring.visible = false;
          this.onPick();
        }
      }
    }
  }
}
