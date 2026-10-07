import * as THREE from "three";
import type { NPCBehaviorData } from "../data/types";
import type { NPC, NPCContext } from "./NPC";
import type { PedGraph, PedNode } from "../world/nav/PedGraph";

/**
 * Comportamientos de NPC (rutinas simples y ligeras). Añadir uno nuevo =
 * implementar NPCBehavior y registrarlo en createBehavior.
 */
export interface NPCBehavior {
  update(npc: NPC, dt: number, ctx: NPCContext): void;
}

const tmpHome = new THREE.Vector3();

/** NPCs con nombre: si un susto los apartó, vuelven a su sitio. */
function returnHome(npc: NPC): boolean {
  const home = tmpHome.set(npc.data.position[0], npc.position.y, npc.data.position[1]);
  if (npc.position.distanceToSquared(home) < 0.04) return false;
  npc.moveSpeed = 1.2;
  npc.moveTarget = home;
  return true;
}

/** Quieto, mirando alrededor. */
class IdleBehavior implements NPCBehavior {
  update(npc: NPC): void {
    returnHome(npc);
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
      npc.paused = true;
      return;
    }
    const target = this.points[this.index];
    npc.moveSpeed = this.speed;
    npc.moveTarget = target;
    if (Math.hypot(npc.position.x - target.x, npc.position.z - target.z) < 0.15) {
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
    if (returnHome(npc)) return;
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
    if (returnHome(npc)) return;
    if (this.gesture === "wave") {
      if (Math.sin(ctx.time * 0.6 + npc.position.x) > 0.85) npc.anim = "wave";
    } else {
      npc.anim = this.gesture;
    }
  }
}

/** Robot junto a una máquina: bebe GasOil como un refresco, en bucle. */
class DrinkLoopBehavior implements NPCBehavior {
  private t = Math.random() * 7;

  update(npc: NPC, dt: number): void {
    if (returnHome(npc)) return;
    this.t = (this.t + dt) % 8;
    const drinking = this.t > 4.6 && this.t < 6.8;
    npc.showCan(this.t > 4.2 && this.t < 7.2);
    if (drinking) npc.anim = "drink";
    else npc.paused = true;
  }
}

/** En la cola de una máquina: mira hacia delante y se impacienta. */
class QueueBehavior implements NPCBehavior {
  private face: THREE.Vector3;

  constructor(npcPos: [number, number], yaw: number) {
    this.face = new THREE.Vector3(npcPos[0] + Math.sin(yaw) * 3, 0, npcPos[1] + Math.cos(yaw) * 3);
  }

  update(npc: NPC, _dt: number, ctx: NPCContext): void {
    if (returnHome(npc)) return;
    npc.lookAt = this.face;
    npc.paused = true;
    // Mira el reloj de vez en cuando (se impacienta)
    if (Math.sin(ctx.time * 0.9 + npc.position.z) > 0.9) npc.anim = "point";
  }
}

/** Robot sin batería: encorvado, con algún tic eléctrico. */
class SlumpedBehavior implements NPCBehavior {
  update(npc: NPC): void {
    if (returnHome(npc)) return;
    npc.anim = "lowbattery";
    npc.paused = true;
  }
}

// ---------------------------------------------------------------- Peatones

/** Servicios del gestor de peatones que necesita el paseo. */
export interface PedNav {
  graph: PedGraph;
  rng(): number;
  /** Reserva un banco/máquina (false si está ocupado). */
  occupy(nodeId: number, npc: NPC): boolean;
  release(nodeId: number, npc: NPC): void;
  /** Entra en una tienda: el peatón desaparece unos segundos. */
  enterBuilding(npc: NPC, seconds: number): void;
  /** El peatón bebe en una máquina (para eventos y el HUD de depuración). */
  onMachineUse?(npc: NPC, node: PedNode): void;
}

type Action =
  | { kind: "sit"; t: number; dur: number; node: PedNode }
  | { kind: "pause"; t: number; dur: number }
  | { kind: "machine"; t: number; node: PedNode };

/**
 * Pasea por el grafo de aceras: camina de nodo en nodo, se para, cambia de
 * dirección, cruza calles por los pasos de cebra, se sienta en bancos,
 * compra y bebe GasOil en las máquinas y entra/sale de las tiendas.
 */
export class WanderBehavior implements NPCBehavior {
  private nav: PedNav;
  private current: PedNode;
  private prev: PedNode | null = null;
  private target: PedNode;
  private action: Action | null = null;
  private speed: number;
  private goal = new THREE.Vector3();

  constructor(nav: PedNav, start: PedNode, speed: number) {
    this.nav = nav;
    this.current = start;
    this.target = start;
    this.speed = speed;
  }

  /** Recoloca el paseo en otro nodo (reciclado del pool). */
  reset(start: PedNode): void {
    this.releaseAction();
    this.current = start;
    this.prev = null;
    this.target = start;
  }

  /** Suelta banco/máquina (eventos, reciclado). */
  releaseAction(npc?: NPC): void {
    const a = this.action;
    if (a && (a.kind === "sit" || a.kind === "machine") && npc) this.nav.release(a.node.id, npc);
    if (npc) npc.showCan(false);
    this.action = null;
  }

  update(npc: NPC, dt: number): void {
    const a = this.action;
    if (a) {
      a.t += dt;
      if (a.kind === "sit") {
        npc.anim = "sit";
        npc.position.x = a.node.x;
        npc.position.z = a.node.z;
        npc.root.rotation.y = a.node.yaw;
        if (a.t > a.dur) this.finishAction(npc);
      } else if (a.kind === "pause") {
        npc.paused = true;
        if (a.t > a.dur) this.action = null;
      } else {
        // Máquina GasOil: pulsa botones y (si es robot) se bebe la lata
        npc.root.rotation.y = a.node.yaw;
        const drinkEnd = npc.robot ? 4.2 : 2.4;
        if (a.t < 1.5) npc.anim = "use";
        else if (npc.robot && a.t < drinkEnd) {
          npc.anim = "drink";
          npc.showCan(true);
        } else npc.paused = true;
        if (a.t > drinkEnd) this.finishAction(npc);
      }
      return;
    }

    const t = this.target;
    const d = Math.hypot(npc.position.x - t.x, npc.position.z - t.z);
    if (d > 0.2) {
      npc.moveSpeed = this.speed;
      npc.moveTarget = this.goal.set(t.x, npc.position.y, t.z);
      return;
    }
    this.arrive(npc, t);
  }

  private arrive(npc: NPC, node: PedNode): void {
    this.prev = this.current;
    this.current = node;
    const r = this.nav.rng();
    if (node.kind === "bench" && r < 0.7 && this.nav.occupy(node.id, npc)) {
      this.action = { kind: "sit", t: 0, dur: 8 + this.nav.rng() * 16, node };
      return;
    }
    if (node.kind === "machine" && r < (npc.robot ? 0.9 : 0.45) && this.nav.occupy(node.id, npc)) {
      this.action = { kind: "machine", t: 0, node };
      this.nav.onMachineUse?.(npc, node);
      return;
    }
    if (node.kind === "door" && r < 0.6) {
      this.target = this.pickNext(node);
      this.nav.enterBuilding(npc, 5 + this.nav.rng() * 14);
      return;
    }
    if (r < 0.12) this.action = { kind: "pause", t: 0, dur: 1 + this.nav.rng() * 3 };
    this.target = this.pickNext(node);
  }

  private finishAction(npc: NPC): void {
    this.releaseAction(npc);
    this.target = this.pickNext(this.current);
  }

  /** Siguiente nodo: evita volver atrás y entra en bancos/tiendas solo a veces. */
  private pickNext(node: PedNode): PedNode {
    const g = this.nav.graph;
    const options = node.links.map((id) => g.nodes[id]).filter((n) => n !== this.prev || node.links.length === 1);
    if (options.length === 0) return node;
    const weights = options.map((n) => (n.kind === "bench" || n.kind === "machine" || n.kind === "door" ? 0.45 : 1));
    let total = weights.reduce((s, w) => s + w, 0) * this.nav.rng();
    for (let i = 0; i < options.length; i++) {
      total -= weights[i];
      if (total <= 0) return options[i];
    }
    return options[options.length - 1];
  }
}

/** Comportamiento que un evento ambiental impone a un NPC (lo "pilota" desde fuera). */
export class ScriptedBehavior implements NPCBehavior {
  anim: NPC["anim"] = "idle";
  target: THREE.Vector3 | null = null;
  look: THREE.Vector3 | null = null;
  speed = 1.4;

  update(npc: NPC): void {
    npc.moveSpeed = this.speed;
    if (this.target && Math.hypot(npc.position.x - this.target.x, npc.position.z - this.target.z) > 0.2) {
      npc.moveTarget = this.target;
      return;
    }
    npc.lookAt = this.look;
    npc.anim = this.anim;
    npc.paused = true;
  }
}

export function createBehavior(data: NPCBehaviorData, home?: [number, number], yaw = 0): NPCBehavior {
  switch (data.type) {
    case "patrol":
      return new PatrolBehavior(data.path, data.speed ?? 1.4, data.pause ?? 2);
    case "chat":
      return new ChatBehavior(data.partner);
    case "work":
      return new WorkBehavior(data.gesture);
    case "drinkloop":
      return new DrinkLoopBehavior();
    case "queue":
      return new QueueBehavior(home ?? [0, 0], data.face ?? yaw);
    case "slumped":
      return new SlumpedBehavior();
    default:
      // "wander" lo asigna PedestrianManager (necesita el grafo)
      return new IdleBehavior();
  }
}
