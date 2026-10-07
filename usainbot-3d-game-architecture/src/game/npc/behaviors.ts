import * as THREE from "three";
import type { NPCBehaviorData } from "../data/types";
import type { NPC, NPCContext } from "./NPC";

/**
 * Comportamientos de NPC (rutinas simples). Añadir uno nuevo = implementar
 * NPCBehavior y registrarlo en createBehavior. Pensado para crecer hacia
 * horarios, entrar en edificios o conducir.
 */
export interface NPCBehavior {
  update(npc: NPC, dt: number, ctx: NPCContext): void;
}

/** Quieto, mirando alrededor. */
class IdleBehavior implements NPCBehavior {
  update(): void {
    // La animación idle ya incluye mirar alrededor.
  }
}

/** Recorre una ruta de ida y vuelta con pausas. */
class PatrolBehavior implements NPCBehavior {
  private points: THREE.Vector3[];
  private index = 1;
  private dir = 1;
  private wait = 0;
  private speed: number;
  private pause: number;

  constructor(path: Array<[number, number]>, speed: number, pause: number) {
    this.points = path.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.speed = speed;
    this.pause = pause;
  }

  update(npc: NPC, dt: number): void {
    if (this.points.length < 2) return;
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const target = this.points[this.index];
    npc.moveSpeed = this.speed;
    npc.moveTarget = target;
    if (npc.position.distanceTo(target) < 0.15) {
      if (this.index + this.dir >= this.points.length || this.index + this.dir < 0) {
        this.dir *= -1;
        this.wait = this.pause;
      }
      this.index += this.dir;
    }
  }
}

/** Conversa con otro NPC: se miran y gesticulan por turnos. */
class ChatBehavior implements NPCBehavior {
  private partnerId: string;
  private offset = Math.random() * 4;

  constructor(partner: string) {
    this.partnerId = partner;
  }

  update(npc: NPC, _dt: number, ctx: NPCContext): void {
    const partner = ctx.getNPC(this.partnerId);
    if (!partner) return;
    npc.lookAt = partner.position;
    const turn = Math.floor((ctx.time + this.offset) / 3) % 2 === 0;
    if (turn) npc.anim = "talk";
  }
}

/** Trabajando: saluda a los clientes, señala o barre. */
class WorkBehavior implements NPCBehavior {
  private gesture: "wave" | "point" | "sweep";

  constructor(gesture: "wave" | "point" | "sweep") {
    this.gesture = gesture;
  }

  update(npc: NPC, _dt: number, ctx: NPCContext): void {
    if (this.gesture === "wave") {
      if (Math.sin(ctx.time * 0.6 + npc.position.x) > 0.85) npc.anim = "wave";
    } else {
      npc.anim = this.gesture;
    }
  }
}

export function createBehavior(data: NPCBehaviorData): NPCBehavior {
  switch (data.type) {
    case "patrol":
      return new PatrolBehavior(data.path, data.speed ?? 1.4, data.pause ?? 2);
    case "chat":
      return new ChatBehavior(data.partner);
    case "work":
      return new WorkBehavior(data.gesture);
    default:
      return new IdleBehavior();
  }
}
