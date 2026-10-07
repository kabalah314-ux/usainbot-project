import * as THREE from "three";
import type { NPCAppearance, NPCData } from "../data/types";
import type { GroundQuery } from "../world/GroundMap";
import type { PedGraph, PedNode } from "../world/nav/PedGraph";
import { PEDESTRIAN_LINES, ROBOT_LINES, lifeSettings } from "../data/life";
import { createRng, randPick, randRange } from "../utils/random";
import { NPC } from "./NPC";
import type { NPCContext } from "./NPC";
import { ScriptedBehavior, WanderBehavior } from "./behaviors";
import type { NPCBehavior, PedNav } from "./behaviors";

const SKINS = [0xf1c7a3, 0xe0ac7e, 0xc58c5c, 0x8d5a3b, 0x5a3322];
const SHIRTS = [0xd8322b, 0x2f6fb3, 0xf2c21c, 0x2e9a42, 0xef7db5, 0x4ecdc4, 0xff8c42, 0xb197fc, 0xf6f2ea, 0x1b1f26];
const PANTS = [0x274c77, 0x1b1f26, 0x5a4a3b, 0x6b3d22, 0x3a3a3a, 0xe0cfa8, 0x2e7d4f];
const HAIR = [0x15100d, 0x3a2a1f, 0x6b3d22, 0xa0522d, 0xd9d9d9, 0xf2d16b];
const ROBOT_METAL = [0xa9b3bb, 0x8fa0ad, 0xc9d2d9, 0x7b848d];
const ROBOT_PAINT = [0xff7a1a, 0x2f6fb3, 0xf2c21c, 0x2e9a42, 0xd8322b];
const NAMES_HUMAN = ["Vecina", "Vecino", "Oficinista", "Estudiante", "Repartidor", "Jubilada", "Turista", "Paseante"];
const NAMES_ROBOT = ["Robot doméstico", "Robot de reparto", "Robo-conserje", "Tostadora andante", "Robot jardinero"];

interface Pedestrian {
  npc: NPC;
  wander: WanderBehavior;
  scripted: ScriptedBehavior;
  active: boolean;
  /** Segundos "dentro" de una tienda (oculto). */
  inside: number;
  speed: number;
  accum: number;
}

/**
 * Peatones del barrio: pool fijo que se recicla alrededor del jugador.
 * - Aparecen en nodos del grafo a 28–80 m (nunca delante de las narices).
 * - Más lejos de 100 m se reciclan cerca otra vez (población constante).
 * - Detalle completo solo cerca; lógica a menor frecuencia lejos.
 * - La densidad depende de la hora del día.
 */
export class PedestrianManager implements PedNav {
  readonly graph: PedGraph;
  readonly peds: Pedestrian[] = [];
  private occupied = new Map<number, NPC>();
  private random = createRng(1789);
  private ctx: NPCContext;
  private ground: GroundQuery;
  /** Fracción del pool activa (la fija la hora del día). */
  density = 1;
  robotChance = 0.3;
  machineUses = 0;
  private time = 0;
  private tmp = new THREE.Vector3();

  constructor(graph: PedGraph, root: THREE.Object3D, ground: GroundQuery, getNPC: NPCContext["getNPC"]) {
    this.graph = graph;
    this.ground = ground;
    this.ctx = { playerPos: new THREE.Vector3(), time: 0, playerInVehicle: false, playerSpeed: 0, getNPC };
    const rng = createRng(4242);
    for (let i = 0; i < lifeSettings.maxPedestrians; i++) {
      const robot = rng() < 0.3;
      const kid = !robot && rng() < 0.12;
      const data: NPCData = {
        id: `ped_${i}`,
        name: robot ? randPick(rng, NAMES_ROBOT) : kid ? "Chaval" : randPick(rng, NAMES_HUMAN),
        position: [0, 0],
        yaw: 0,
        appearance: this.makeAppearance(rng, robot, kid),
        behavior: { type: "wander" },
        lines: robot ? ROBOT_LINES : PEDESTRIAN_LINES,
      };
      const npc = new NPC(data);
      npc.root.visible = false;
      root.add(npc.root);
      const start = graph.nodes[i % graph.nodes.length];
      // Algunos corren (jogging): velocidad de trote
      const speed = kid ? randRange(rng, 1.5, 2.2) : robot ? randRange(rng, 0.9, 1.2) : rng() < 0.12 ? 3.1 : randRange(rng, 1.05, 1.55);
      const wander = new WanderBehavior(this, start, speed);
      this.peds.push({ npc, wander, scripted: new ScriptedBehavior(), active: false, inside: 0, speed, accum: 0 });
    }
  }

  // ---------------------------------------------------------------- PedNav
  rng(): number {
    return this.random();
  }

  occupy(nodeId: number, npc: NPC): boolean {
    const who = this.occupied.get(nodeId);
    if (who && who !== npc) return false;
    this.occupied.set(nodeId, npc);
    return true;
  }

  release(nodeId: number, npc: NPC): void {
    if (this.occupied.get(nodeId) === npc) this.occupied.delete(nodeId);
  }

  enterBuilding(npc: NPC, seconds: number): void {
    const ped = this.peds.find((p) => p.npc === npc);
    if (!ped) return;
    ped.inside = seconds;
    npc.root.visible = false;
  }

  onMachineUse(): void {
    this.machineUses++;
  }

  // ---------------------------------------------------------------- API
  /** Peatones visibles y activos (tráfico, reacciones, eventos). */
  visible(): NPC[] {
    return this.peds.filter((p) => p.active && p.inside <= 0).map((p) => p.npc);
  }

  get activeCount(): number {
    return this.peds.filter((p) => p.active).length;
  }

  /** Un evento toma el control de un peatón (no se recicla hasta liberarlo). */
  claim(npc: NPC): ScriptedBehavior | null {
    const ped = this.peds.find((p) => p.npc === npc);
    if (!ped || !ped.active || ped.inside > 0 || npc.claimed) return null;
    ped.wander.releaseAction(npc);
    npc.claimed = true;
    ped.scripted.target = null;
    ped.scripted.look = null;
    ped.scripted.anim = "idle";
    ped.scripted.speed = ped.speed;
    npc.behavior = ped.scripted;
    return ped.scripted;
  }

  /** Devuelve el peatón al paseo normal (fin de un evento). */
  releaseNPC(a: NPC): void {
    const ped = this.peds.find((p) => p.npc === a);
    if (!ped) return;
    a.claimed = false;
    a.showCan(false);
    const node = this.graph.nearest(a.position.x, a.position.z, (n) => n.kind === "walk" || n.kind === "corner" || n.kind === "park");
    if (node) ped.wander.reset(node);
    a.behavior = ped.wander;
  }

  /** Candidato para un evento: peatón activo y libre entre min y max metros. */
  pick(from: THREE.Vector3, min: number, max: number, filter: (n: NPC) => boolean = () => true): NPC | null {
    const options = this.peds.filter((p) => {
      if (!p.active || p.inside > 0 || p.npc.claimed || p.npc.talking) return false;
      const d = p.npc.position.distanceTo(from);
      return d >= min && d <= max && filter(p.npc);
    });
    return options.length ? options[Math.floor(this.random() * options.length) % options.length].npc : null;
  }

  update(dt: number, playerPos: THREE.Vector3, inVehicle: boolean, playerSpeed: number): void {
    this.time += dt;
    this.ctx.time = this.time;
    this.ctx.playerPos.copy(playerPos);
    this.ctx.playerInVehicle = inVehicle;
    this.ctx.playerSpeed = playerSpeed;
    const target = Math.round(this.peds.length * this.density);
    let active = this.activeCount;

    for (const ped of this.peds) {
      const npc = ped.npc;
      // Activar hasta la densidad deseada (aparecen lejos, en el grafo)
      if (!ped.active) {
        if (active < target && this.spawn(ped, playerPos)) active++;
        continue;
      }
      const dist = npc.position.distanceTo(playerPos);
      // Reciclado: demasiado lejos (o sobran peatones de noche) → fuera de escena
      if (!npc.claimed && (dist > lifeSettings.pedDespawn || (active > target && dist > lifeSettings.pedSpawnMin))) {
        this.despawn(ped);
        active--;
        continue;
      }
      if (ped.inside > 0) {
        ped.inside -= dt;
        if (ped.inside <= 0) npc.root.visible = true; // sale de la tienda
        continue;
      }
      npc.setDetail(dist < lifeSettings.detailRadius);
      // Lógica reducida lejos: se actualiza cada ~0,2 s con el tiempo acumulado
      ped.accum += dt;
      if (dist > lifeSettings.reducedLogicRadius && ped.accum < 0.2) continue;
      const step = ped.accum;
      ped.accum = 0;
      npc.update(step, this.ctx);
      npc.position.y = this.ground(npc.position.x, npc.position.z, npc.position.y + 0.35);
    }
  }

  private spawn(ped: Pedestrian, playerPos: THREE.Vector3): boolean {
    // De noche salen más robots (los robots no duermen)
    if (ped.npc.robot !== this.random() < this.robotChance && this.random() < 0.5) return false;
    const node = this.graph.randomInRing(playerPos.x, playerPos.z, lifeSettings.pedSpawnMin, lifeSettings.pedSpawnMax, this.random);
    if (!node) return false;
    this.place(ped, node);
    return true;
  }

  private place(ped: Pedestrian, node: PedNode): void {
    const npc = ped.npc;
    npc.position.set(node.x, this.ground(node.x, node.z), node.z);
    npc.root.rotation.y = this.random() * Math.PI * 2;
    ped.wander.reset(node);
    npc.behavior = ped.wander as NPCBehavior;
    npc.root.visible = true;
    ped.active = true;
    ped.inside = 0;
    ped.accum = 0;
  }

  private despawn(ped: Pedestrian): void {
    ped.wander.releaseAction(ped.npc);
    ped.npc.root.visible = false;
    ped.npc.talking = false;
    ped.active = false;
    this.tmp.set(0, -100, 0);
  }

  private makeAppearance(rng: () => number, robot: boolean, kid: boolean): NPCAppearance {
    if (robot) {
      const metal = randPick(rng, ROBOT_METAL);
      return {
        skin: metal,
        shirt: randPick(rng, ROBOT_PAINT),
        pants: metal,
        hair: randPick(rng, ROBOT_PAINT),
        shoes: 0x2f353c,
        hat: rng() < 0.3 ? randPick(rng, ROBOT_PAINT) : null,
        height: randRange(rng, 0.78, 1.0),
        accessory: "glasses",
        robot: true,
      };
    }
    const accessories: NPCAppearance["accessory"][] = ["none", "none", "backpack", "glasses", "apron"];
    return {
      skin: randPick(rng, SKINS),
      shirt: randPick(rng, SHIRTS),
      pants: randPick(rng, PANTS),
      hair: randPick(rng, HAIR),
      shoes: rng() < 0.3 ? 0xf6f2ea : 0x2f353c,
      hat: rng() < 0.28 ? randPick(rng, SHIRTS) : null,
      height: kid ? randRange(rng, 0.62, 0.72) : randRange(rng, 0.88, 1.08),
      accessory: randPick(rng, accessories),
    };
  }
}
