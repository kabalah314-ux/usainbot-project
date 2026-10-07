import type * as THREE from "three";
import type { NPCData } from "../data/types";
import type { Collider } from "../world/colliders";
import type { POIRegistry } from "../world/poi/POIRegistry";
import type { GroundQuery } from "../world/GroundMap";
import { NPC } from "./NPC";
import type { NPCContext } from "./NPC";
import { createBehavior } from "./behaviors";
import { lifeSettings } from "../data/life";

/**
 * Gestiona los vecinos: creación desde datos, actualización por frame,
 * colisiones dinámicas y POIs de los que dan misiones.
 * Los NPCs lejanos (> updateRadius) no se animan (ahorro de CPU).
 */
export class NPCManager {
  private npcs = new Map<string, NPC>();
  readonly colliders: Collider[] = [];
  private time = 0;
  private ctx: NPCContext;
  private static readonly UPDATE_RADIUS = 90;

  constructor() {
    this.ctx = {
      playerPos: null as unknown as THREE.Vector3,
      time: 0,
      playerInVehicle: false,
      playerSpeed: 0,
      getNPC: (id) => this.npcs.get(id),
    };
  }

  spawnAll(list: readonly NPCData[], root: THREE.Object3D, pois: POIRegistry): void {
    for (const data of list) {
      const npc = new NPC(data);
      npc.behavior = createBehavior(data.behavior, data.position, data.yaw);
      this.register(data.id, npc);
      root.add(npc.root);
      if (data.missionGiver) {
        pois.add({ id: data.id, name: data.name, category: "MISSION_NPC", position: npc.root.position });
      }
    }
  }

  register(id: string, npc: NPC): void {
    this.npcs.set(id, npc);
    this.colliders.push(npc.collider);
  }

  get(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  all(): NPC[] {
    return [...this.npcs.values()];
  }

  get count(): number {
    return this.npcs.size;
  }

  /** Altura del suelo (los vecinos pisan aceras, alfombras…, no y = 0). */
  ground: GroundQuery = () => 0;

  update(dt: number, playerPos: THREE.Vector3, inVehicle = false, speed = 0): void {
    this.ctx.playerInVehicle = inVehicle;
    this.ctx.playerSpeed = speed;
    this.time += dt;
    this.ctx.time = this.time;
    this.ctx.playerPos = playerPos;
    for (const npc of this.npcs.values()) {
      const dist = npc.position.distanceTo(playerPos);
      const far = dist > NPCManager.UPDATE_RADIUS;
      npc.root.visible = !far;
      if (far) continue;
      npc.setDetail(dist < lifeSettings.detailRadius);
      npc.update(dt, this.ctx);
      npc.position.y = this.ground(npc.position.x, npc.position.z, npc.position.y + 0.35);
    }
  }
}
