import * as THREE from "three";
import type { AmbientContext, AmbientEvent } from "./EventManager";
import type { NPC } from "../npc/NPC";
import type { ScriptedBehavior } from "../npc/behaviors";
import type { POI } from "../world/poi/POIRegistry";
import type { TrafficCar } from "../traffic/TrafficManager";
import type { RaceData } from "../data/types";
import { GASOIL_ITEM } from "../data/items";
import { machineUsePoint } from "../gasoil/GasOilMachine";

/** POI temporal del evento (se crea una vez y se muestra/oculta). */
function eventPOI(ctx: AmbientContext, id: string, name: string): POI {
  return ctx.pois.get(id) ?? ctx.pois.define(id, name, "EVENT", 0, 0);
}

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

// =====================================================================
// EVENT_ROBOT_LOW_BATTERY · un robot se queda sin energía → [E] AYUDAR
// =====================================================================
export class LowBatteryEvent implements AmbientEvent {
  readonly id = "EVENT_ROBOT_LOW_BATTERY";
  readonly name = "Robot sin energía";
  readonly weight = 1.2;
  readonly cooldown = 70;
  readonly maxDuration = 120;
  private npc: NPC | null = null;
  private sb: ScriptedBehavior | null = null;
  private poi: POI | null = null;
  private helped = -1;
  private barkT = 0;
  private registered = false;
  private anchor = new THREE.Vector3(0, -100, 0);

  canStart(ctx: AmbientContext): boolean {
    return !!ctx.peds.pick(ctx.player.root.position, 14, 55, (n) => n.robot);
  }

  start(ctx: AmbientContext): boolean {
    const npc = ctx.peds.pick(ctx.player.root.position, 14, 55, (n) => n.robot);
    const sb = npc ? ctx.peds.claim(npc) : null;
    if (!npc || !sb) return false;
    this.npc = npc;
    this.sb = sb;
    this.helped = -1;
    this.barkT = 0;
    sb.anim = "lowbattery";
    this.poi = eventPOI(ctx, "event_lowbattery", "Robot sin batería");
    this.poi.position = npc.position;
    this.poi.hidden = false;
    if (!this.registered) {
      this.registered = true;
      ctx.interaction.register({
        id: "event_help_robot",
        position: this.anchor, // se copia la posición del robot cada frame
        radius: 2.5,
        prompt: () => (ctx.inventory.has(GASOIL_ITEM) ? "AYUDAR (darle tu GasOil)" : "AYUDAR (reiniciarlo)"),
        enabled: () => !!this.npc && this.helped < 0,
        interact: () => this.help(ctx),
      });
    }
    this.anchor.copy(npc.position);
    ctx.notify("Un robot se ha quedado sin batería cerca (✱ en el mapa)", "info");
    return true;
  }

  private help(ctx: AmbientContext): void {
    const npc = this.npc;
    const sb = this.sb;
    if (!npc || !sb || this.helped >= 0) return;
    const gasoil = ctx.inventory.remove(GASOIL_ITEM, 1);
    this.helped = 0;
    sb.look = ctx.player.root.position;
    if (gasoil) {
      sb.anim = "drink";
      npc.showCan(true);
      ctx.barks.say(npc.position, "¡GLUP! ¡Recargado al 100 %! ¡Gracias, campeón!", 3, npc.data.id, "gasoil");
      ctx.inventory.addMoney(20);
      ctx.notify("Has ayudado al robot con tu GasOil · +20 ₲", "success");
    } else {
      sb.anim = "startled";
      ctx.barks.say(npc.position, "Reiniciando… ¡bip! ¡Funciona! Gracias.", 3, npc.data.id, "alert");
      ctx.inventory.addMoney(10);
      ctx.notify("Has reiniciado al robot · +10 ₲ (con GasOil se lo agradecen más)", "success");
    }
    ctx.sfx("pickup");
    ctx.bus.emit("npc:helped", { npcId: npc.data.id, withGasOil: gasoil });
  }

  update(dt: number, ctx: AmbientContext): boolean {
    const npc = this.npc;
    if (!npc) return true;
    this.anchor.copy(npc.position);
    if (this.helped >= 0) {
      this.helped += dt;
      return this.helped > 2.6;
    }
    this.barkT -= dt;
    if (this.barkT <= 0) {
      this.barkT = 3.2;
      ctx.barks.say(npc.position, Math.random() < 0.7 ? "BATERÍA BAJA..." : "Bzzzt… G-GasOil…", 2.8, npc.data.id, "alert", 2.1);
    }
    // Si el jugador se aleja mucho, se recupera solo
    return npc.position.distanceTo(ctx.player.root.position) > 120;
  }

  end(ctx: AmbientContext): void {
    if (this.poi) this.poi.hidden = true;
    this.anchor.set(0, -100, 0);
    if (this.npc) {
      ctx.barks.clear(this.npc.data.id);
      ctx.peds.releaseNPC(this.npc);
    }
    this.npc = null;
    this.sb = null;
  }
}

// =====================================================================
// EVENT_RANDOM_RACE · "¡Eh! ¡El robot rápido!" → CORRE HASTA EL PARQUE
// =====================================================================
export class ImprovisedChallengeEvent implements AmbientEvent {
  readonly id = "EVENT_RANDOM_RACE";
  readonly name = "Desafío improvisado";
  readonly weight = 1;
  readonly cooldown = 90;
  readonly maxDuration = 160;
  private npc: NPC | null = null;
  private sb: ScriptedBehavior | null = null;
  private t = 0;
  private started = false;
  private finished = false;
  private destName = "";
  private dest: [number, number] = [0, -106];

  canStart(ctx: AmbientContext): boolean {
    if (ctx.vehicles.busy || ctx.races.phase !== "idle" || ctx.player.isDrinking) return false;
    if (ctx.missions.active?.currentObjective?.data.race) return false;
    return !!ctx.peds.pick(ctx.player.root.position, 5, 20, (n) => !n.robot);
  }

  start(ctx: AmbientContext): boolean {
    const npc = ctx.peds.pick(ctx.player.root.position, 5, 20, (n) => !n.robot);
    const sb = npc ? ctx.peds.claim(npc) : null;
    if (!npc || !sb) return false;
    this.npc = npc;
    this.sb = sb;
    this.t = 0;
    this.started = false;
    this.finished = false;
    sb.look = ctx.player.root.position;
    sb.anim = "wave";
    const p = ctx.player.root.position;
    const toPark = Math.hypot(p.x, p.z + 106);
    this.dest = toPark > 45 ? [0, -106] : [38, 62];
    this.destName = toPark > 45 ? "EL PARQUE" : "LA GASOLINERA";
    ctx.barks.say(npc.position, "¡Eh! ¡El robot rápido!", 2, npc.data.id, "alert");
    return true;
  }

  update(dt: number, ctx: AmbientContext): boolean {
    const npc = this.npc;
    const sb = this.sb;
    if (!npc || !sb) return true;
    this.t += dt;
    if (!this.started && this.t > 1.8) {
      this.started = true;
      const p = ctx.player.root.position;
      const d = Math.hypot(p.x - this.dest[0], p.z - this.dest[1]);
      // Rutas por calle ≈ 1,35 × la línea recta; con turbo sobra, andando justo
      const limit = Math.round(((d * 1.35) / 9.5 + 4) * 10) / 10;
      ctx.barks.say(npc.position, `¡A que no llegas a ${this.destName} en ${Math.round(limit)} s!`, 3, npc.data.id, "alert");
      sb.anim = "point";
      const race: RaceData = {
        id: "race_improv",
        name: `Reto: ${this.destName.toLowerCase()}`,
        mode: "on_foot",
        kind: ["sprint", "time_trial"],
        start: { x: p.x, z: p.z, yaw: ctx.player.yaw },
        checkpoints: [],
        finish: this.dest,
        timeLimit: limit,
        radius: 8,
        gateWidth: 9,
        countdown: true,
        placeAtStart: false,
      };
      ctx.notify(`DESAFÍO: CORRE HASTA ${this.destName} (${Math.round(limit)} s)`, "info");
      ctx.races.start(race, () => undefined, (ok, time, reason) => {
        this.finished = true;
        if (ok) {
          ctx.inventory.addMoney(25);
          ctx.notify(`¡Desafío superado en ${time.toFixed(1)} s! +25 ₲`, "success");
        } else {
          ctx.notify(`Desafío fallido: ${reason ?? "más suerte la próxima"}`, "warn");
        }
      });
    }
    if (this.started && this.t > 4.5 && npc.claimed) ctx.peds.releaseNPC(npc); // el retador vuelve a lo suyo
    return this.finished || (this.started && ctx.races.phase === "idle" && this.t > 6);
  }

  end(ctx: AmbientContext): void {
    if (this.npc?.claimed) ctx.peds.releaseNPC(this.npc);
    this.npc = null;
    this.sb = null;
  }
}

// =====================================================================
// EVENT_NPC_ARGUMENT · dos vecinos discuten
// =====================================================================
const ARGUMENTS: Array<[string, string]> = [
  ["¡Eso es MI banco!", "¡Yo llegué primero!"],
  ["¡Tu robot se ha bebido MI GasOil!", "¡Estaba en oferta!"],
  ["¡UsainBot corre a 100!", "¡A 200, ignorante!"],
  ["¡El amarillo es del BOLT-MOBILE!", "¡El amarillo es de todos!"],
  ["¡Tu tostadora me ha mirado mal!", "¡Es que es muy sensible!"],
];

export class ArgumentEvent implements AmbientEvent {
  readonly id = "EVENT_NPC_ARGUMENT";
  readonly name = "Discusión vecinal";
  readonly weight = 1;
  readonly cooldown = 45;
  readonly maxDuration = 20;
  private a: NPC | null = null;
  private b: NPC | null = null;
  private lines: [string, string] = ARGUMENTS[0];
  private t = 0;
  private turn = 0;

  canStart(ctx: AmbientContext): boolean {
    return !!this.findPair(ctx);
  }

  private findPair(ctx: AmbientContext): [NPC, NPC] | null {
    const a = ctx.peds.pick(ctx.player.root.position, 10, 45);
    if (!a) return null;
    const b = ctx.peds.pick(a.position, 0.5, 14, (n) => n !== a);
    return b ? [a, b] : null;
  }

  start(ctx: AmbientContext): boolean {
    const pair = this.findPair(ctx);
    if (!pair) return false;
    const [a, b] = pair;
    const sa = ctx.peds.claim(a);
    const sbh = ctx.peds.claim(b);
    if (!sa || !sbh) {
      if (sa) ctx.peds.releaseNPC(a);
      return false;
    }
    this.a = a;
    this.b = b;
    this.t = 0;
    this.turn = 0;
    this.lines = pick(ARGUMENTS);
    const mid = new THREE.Vector3().addVectors(a.position, b.position).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(b.position, a.position).setY(0).normalize();
    sa.target = mid.clone().addScaledVector(dir, -0.75);
    sbh.target = mid.clone().addScaledVector(dir, 0.75);
    sa.look = b.position;
    sbh.look = a.position;
    sa.anim = "talk";
    sbh.anim = "talk";
    return true;
  }

  update(dt: number, ctx: AmbientContext): boolean {
    if (!this.a || !this.b) return true;
    this.t += dt;
    if (this.t > 2 + this.turn * 2.3 && this.turn < 4) {
      const who = this.turn % 2 === 0 ? this.a : this.b;
      ctx.barks.say(who.position, this.lines[this.turn % 2], 2.2, who.data.id);
      this.turn++;
    }
    return this.t > 13;
  }

  end(ctx: AmbientContext): void {
    for (const n of [this.a, this.b]) if (n) ctx.peds.releaseNPC(n);
    this.a = this.b = null;
  }
}

// =====================================================================
// EVENT_GASOIL_PROMOTION · máquina en 2x1 + pequeña cola de robots
// =====================================================================
export class GasOilPromoEvent implements AmbientEvent {
  readonly id = "EVENT_GASOIL_PROMOTION";
  readonly name = "Promoción GasOil 2x1";
  readonly weight = 1;
  readonly cooldown = 80;
  readonly maxDuration = 50;
  private machinePos = new THREE.Vector3();
  private queue: NPC[] = [];
  private poi: POI | null = null;
  private t = 0;
  private barkT = 0;

  private nearest(ctx: AmbientContext): (typeof ctx.machines)[number] | null {
    const p = ctx.player.root.position;
    let best = null;
    let bestD = 75;
    for (const m of ctx.machines) {
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  canStart(ctx: AmbientContext): boolean {
    return !ctx.gasoil.promoMachine && !!this.nearest(ctx);
  }

  start(ctx: AmbientContext): boolean {
    const m = this.nearest(ctx);
    if (!m) return false;
    ctx.gasoil.promoMachine = m.id;
    this.machinePos.set(m.x, 0.6, m.z);
    this.t = 0;
    this.barkT = 0;
    this.poi = eventPOI(ctx, "event_promo", "Promo GasOil 2x1");
    this.poi.position = this.machinePos;
    this.poi.hidden = false;
    ctx.notify("¡PROMO GASOIL 2x1 en la máquina cercana! (✱)", "success");
    // Pequeña cola: robots (o vecinos) se acercan a la máquina
    const [ux, uz] = machineUsePoint(m);
    const dx = ux - m.x;
    const dz = uz - m.z;
    const len = Math.hypot(dx, dz) || 1;
    this.queue = [];
    for (let i = 0; i < 2; i++) {
      const npc = ctx.peds.pick(this.machinePos, 3, 60, (n) => n.robot || i > 0);
      const sb = npc ? ctx.peds.claim(npc) : null;
      if (!npc || !sb) continue;
      sb.target = new THREE.Vector3(ux + (dx / len) * (1.3 + i * 1.2) - (dz / len) * 0.9, 0, uz + (dz / len) * (1.3 + i * 1.2) + (dx / len) * 0.9);
      sb.look = this.machinePos;
      sb.anim = "idle";
      this.queue.push(npc);
    }
    return true;
  }

  update(dt: number, ctx: AmbientContext): boolean {
    this.t += dt;
    this.barkT -= dt;
    if (this.barkT <= 0) {
      this.barkT = 5;
      ctx.barks.say(this.machinePos, pick(["¡PROMO GASOIL 2x1!", "ROBOT FUEL · 2x1", "¡ENERGY FOR MACHINES!"]), 3, "promo", "gasoil", 2.4);
    }
    return this.t > 45;
  }

  end(ctx: AmbientContext): void {
    ctx.gasoil.promoMachine = null;
    if (this.poi) this.poi.hidden = true;
    ctx.barks.clear("promo");
    for (const n of this.queue) ctx.peds.releaseNPC(n);
    this.queue = [];
  }
}

// =====================================================================
// EVENT_CAR_PROBLEM · un coche se cala en mitad de la calle
// =====================================================================
export class CarProblemEvent implements AmbientEvent {
  readonly id = "EVENT_CAR_PROBLEM";
  readonly name = "Coche averiado";
  readonly weight = 0.8;
  readonly cooldown = 60;
  readonly maxDuration = 16;
  private car: TrafficCar | null = null;
  private said = false;

  canStart(ctx: AmbientContext): boolean {
    return !!ctx.traffic.pick(ctx.player.root.position, 15, 70);
  }

  start(ctx: AmbientContext): boolean {
    const car = ctx.traffic.pick(ctx.player.root.position, 15, 70);
    if (!car) return false;
    this.car = car;
    this.said = false;
    ctx.traffic.breakDown(car, 11);
    ctx.barks.say(car.mesh.position, "¡Se me ha calado otra vez!", 3, `car_${car.id}`, "alert", 2.2);
    return true;
  }

  update(_dt: number, ctx: AmbientContext): boolean {
    const car = this.car;
    if (!car) return true;
    if (!this.said && car.broken < 5) {
      this.said = true;
      ctx.barks.say(car.mesh.position, "¡Vamos, arranca…! ¡Bien!", 2.5, `car_${car.id}`, "normal", 2.2);
    }
    return car.broken <= 0 || !car.active;
  }

  end(): void {
    this.car = null;
  }
}

// =====================================================================
// EVENT_DROPPED_BOX · un repartidor tira una caja
// =====================================================================
export class DroppedBoxEvent implements AmbientEvent {
  readonly id = "EVENT_DROPPED_BOX";
  readonly name = "Caja al suelo";
  readonly weight = 0.8;
  readonly cooldown = 50;
  readonly maxDuration = 9;
  private box: THREE.Mesh;
  private npc: NPC | null = null;
  private sb: ScriptedBehavior | null = null;
  private vel = new THREE.Vector3();
  private t = 0;
  private added = false;

  constructor() {
    const b = new THREE.BoxGeometry(0.6, 0.45, 0.5);
    this.box = new THREE.Mesh(b, new THREE.MeshToonMaterial({ color: 0xb58a52 }));
    this.box.castShadow = true;
    this.box.visible = false;
  }

  canStart(ctx: AmbientContext): boolean {
    return !!ctx.peds.pick(ctx.player.root.position, 8, 35, (n) => !n.robot);
  }

  start(ctx: AmbientContext): boolean {
    const npc = ctx.peds.pick(ctx.player.root.position, 8, 35, (n) => !n.robot);
    const sb = npc ? ctx.peds.claim(npc) : null;
    if (!npc || !sb) return false;
    if (!this.added) {
      npc.root.parent?.add(this.box);
      this.added = true;
    }
    this.npc = npc;
    this.sb = sb;
    this.t = 0;
    sb.anim = "startled";
    const f = new THREE.Vector3(Math.sin(npc.root.rotation.y), 0, Math.cos(npc.root.rotation.y));
    this.box.position.copy(npc.position).addScaledVector(f, 0.5).setY(npc.position.y + 1.1);
    this.box.rotation.set(0, npc.root.rotation.y, 0);
    this.vel.copy(f).multiplyScalar(1.2).setY(1.5);
    this.box.visible = true;
    ctx.barks.say(npc.position, "¡Ups!", 1.6, npc.data.id);
    return true;
  }

  update(dt: number, ctx: AmbientContext): boolean {
    const npc = this.npc;
    const sb = this.sb;
    if (!npc || !sb) return true;
    this.t += dt;
    // Caída con rebote (física de juguete)
    const floor = npc.position.y + 0.225;
    this.vel.y -= 18 * dt;
    this.box.position.addScaledVector(this.vel, dt);
    this.box.rotation.x += this.vel.length() * dt * 1.4;
    if (this.box.position.y < floor) {
      this.box.position.y = floor;
      this.vel.y = Math.abs(this.vel.y) * 0.3;
      this.vel.x *= 0.5;
      this.vel.z *= 0.5;
      this.box.rotation.x = Math.round(this.box.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
    }
    if (this.t > 2 && this.t < 5) {
      sb.target = this.box.position.clone().setY(npc.position.y);
      sb.anim = "sweep";
      sb.look = this.box.position;
    }
    if (this.t > 5 && this.box.visible) {
      this.box.visible = false;
      ctx.barks.say(npc.position, "Todo bajo control…", 1.8, npc.data.id);
    }
    return this.t > 6.5;
  }

  end(ctx: AmbientContext): void {
    this.box.visible = false;
    if (this.npc) ctx.peds.releaseNPC(this.npc);
    this.npc = null;
  }
}

// =====================================================================
// EVENT_WANNABE_RUNNER · un vecino intenta echarle una carrera a UsainBot
// =====================================================================
export class WannabeRunnerEvent implements AmbientEvent {
  readonly id = "EVENT_WANNABE_RUNNER";
  readonly name = "Aspirante a velocista";
  readonly weight = 0.8;
  readonly cooldown = 55;
  readonly maxDuration = 16;
  private npc: NPC | null = null;
  private sb: ScriptedBehavior | null = null;
  private t = 0;
  private phase: "run" | "tired" = "run";

  canStart(ctx: AmbientContext): boolean {
    return !ctx.vehicles.busy && !!ctx.peds.pick(ctx.player.root.position, 6, 25, (n) => !n.robot);
  }

  start(ctx: AmbientContext): boolean {
    const npc = ctx.peds.pick(ctx.player.root.position, 6, 25, (n) => !n.robot);
    const sb = npc ? ctx.peds.claim(npc) : null;
    const goal = npc ? ctx.graph.randomInRing(npc.position.x, npc.position.z, 25, 40, Math.random) : null;
    if (!npc || !sb || !goal) {
      if (npc && sb) ctx.peds.releaseNPC(npc);
      return false;
    }
    this.npc = npc;
    this.sb = sb;
    this.t = 0;
    this.phase = "run";
    sb.speed = 4.4;
    sb.target = new THREE.Vector3(goal.x, 0, goal.z);
    ctx.barks.say(npc.position, "¡Te echo una carrera, robot!", 2.2, npc.data.id, "alert");
    return true;
  }

  update(dt: number, ctx: AmbientContext): boolean {
    const npc = this.npc;
    const sb = this.sb;
    if (!npc || !sb) return true;
    this.t += dt;
    const arrived = !sb.target || Math.hypot(npc.position.x - sb.target.x, npc.position.z - sb.target.z) < 0.4;
    if (this.phase === "run" && (arrived || this.t > 9)) {
      this.phase = "tired";
      this.t = 0;
      sb.target = null;
      sb.anim = "tired";
      ctx.barks.say(npc.position, "Uf… uf… vale… tú ganas…", 2.6, npc.data.id);
    }
    return this.phase === "tired" && this.t > 3;
  }

  end(ctx: AmbientContext): void {
    if (this.npc) ctx.peds.releaseNPC(this.npc);
    this.npc = null;
  }
}

export function createAmbientEvents(): AmbientEvent[] {
  return [
    new LowBatteryEvent(),
    new ImprovisedChallengeEvent(),
    new ArgumentEvent(),
    new GasOilPromoEvent(),
    new CarProblemEvent(),
    new DroppedBoxEvent(),
    new WannabeRunnerEvent(),
  ];
}
