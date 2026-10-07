import type * as THREE from "three";
import type { NPC } from "../npc/NPC";
import type { BarkSystem } from "../ui/BarkSystem";
import { BARKS } from "../data/life";

export interface ReactionInput {
  playerPos: THREE.Vector3;
  playerSpeed: number;
  inVehicle: boolean;
  vehicleSpeed: number;
  turboActive: boolean;
  turboStarted: boolean;
  onFoot: boolean;
}

/** Llamada de un NPC al jugador cuando pasa cerca (p. ej. ofrecer una misión). */
export interface Callout {
  npcId: string;
  text: string;
  radius: number;
  cooldown: number;
  condition(): boolean;
  last: number;
}

const GLOBAL_COOLDOWN = 1.1;
const NPC_COOLDOWN = 9;

/**
 * Reacciones de los vecinos a UsainBot (sin IA: reglas + probabilidad):
 * - pasa corriendo muy rápido → "¡¿Pero qué demonios?!" y se aparta
 * - activa el turbo cerca → algunos se giran, se sorprenden y se apartan
 * - pasa en coche → "Bonito coche." (despacio) o "¡Cuidado!" (rápido)
 * No reaccionan todos: probabilidad + enfriamiento por NPC y global.
 */
export class ReactionSystem {
  private barks: BarkSystem;
  private global = 0;
  private time = 0;
  readonly callouts: Callout[] = [];
  /** Estadística para el panel de depuración. */
  reactions = 0;

  constructor(barks: BarkSystem) {
    this.barks = barks;
  }

  update(dt: number, npcs: readonly NPC[], p: ReactionInput, getNPC: (id: string) => NPC | undefined): void {
    this.time += dt;
    this.global = Math.max(0, this.global - dt);

    for (const npc of npcs) {
      if (!npc.root.visible || npc.talking || npc.claimed) continue;
      const d = npc.playerDistance;
      if (d > 12 || npc.barkCooldown > 0) continue;

      // Turbo cerca: la mitad se sorprende; se apartan si está muy cerca
      if (p.turboStarted && d < 10 && Math.random() < 0.55) {
        npc.react(p.playerPos, 0.9, d < 4 ? 2.4 : 0);
        this.bark(npc, BARKS.turbo, 0.7);
        continue;
      }
      // Pasa corriendo rapidísimo por al lado
      if (p.onFoot && p.playerSpeed > 12.5 && d < 3.8) {
        npc.react(p.playerPos, 0.8, 2.2);
        this.bark(npc, BARKS.fastPass, 0.8);
        continue;
      }
      // Coche
      if (p.inVehicle && d < 9) {
        if (p.vehicleSpeed > 12 && d < 6) {
          npc.react(p.playerPos, 1.0, 2.6);
          this.bark(npc, BARKS.carFast, 0.8);
        } else if (p.vehicleSpeed > 1 && p.vehicleSpeed < 9) {
          this.bark(npc, BARKS.carSlow, 0.35);
        }
        continue;
      }
      // Robots: saludo robótico ocasional
      if (npc.robot && p.onFoot && d < 3 && p.playerSpeed < 2) this.bark(npc, BARKS.greetRobot, 0.15);
    }

    // Llamadas (NPC que "ve" a UsainBot y le ofrece algo)
    for (const c of this.callouts) {
      if (this.time - c.last < c.cooldown || !c.condition()) continue;
      const npc = getNPC(c.npcId);
      if (!npc || !npc.root.visible || npc.talking || npc.playerDistance > c.radius) continue;
      c.last = this.time;
      npc.react(p.playerPos, 0.6);
      this.barks.say(npc.position, c.text, 3.2, npc.data.id, "alert");
    }
  }

  private bark(npc: NPC, lines: readonly string[], chance: number): void {
    npc.barkCooldown = NPC_COOLDOWN;
    if (this.global > 0 || Math.random() > chance) return;
    this.global = GLOBAL_COOLDOWN;
    this.reactions++;
    this.barks.say(npc.position, lines[Math.floor(Math.random() * lines.length)], 2, npc.data.id);
  }
}
