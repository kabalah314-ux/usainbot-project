import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Inventory } from "../inventory/Inventory";
import type { InteractionSystem } from "../interaction/InteractionSystem";
import type { Player } from "../player/Player";
import type { GasOilMachineSpec } from "../world/zones/Zone";
import { GASOIL_ITEM, ITEMS, drinkSettings, economySettings } from "../data/items";
import { machineUsePoint } from "./GasOilMachine";

export type Notify = (text: string, kind?: "info" | "success" | "warn") => void;

/** Resultado de intentar beber (para tests, HUD y sonido). */
export type DrinkResult = "started" | "no_gasoil" | "turbo_full" | "busy";

/** Chistes al terminar la lata (running gag de GASIL). */
const DRINK_QUIPS = [
  "¡Glup! Sabor tornillo con limón.",
  "¡Ahhh! Desayuno de campeones… mecánicos.",
  "GASIL: HUMANS DON'T NEED THIS.",
  "Ñam. Notas de cata: aceite y victoria.",
  "¡Recarga completa de chulería!",
];

/**
 * Lógica de GASIL: comprar latas y BEBERLAS para recargar el TURBO.
 * El consumo pasa siempre por la animación DRINKING_GASIL del jugador:
 * la lata solo se gasta en el momento del trago (no hay recarga instantánea).
 */
export class GasOilService {
  private bus: EventBus;
  private inventory: Inventory;
  private player: Player;
  private notify: Notify;
  private quip = 0;
  /** Máquina en promoción 2x1 (evento ambiental), o null. */
  promoMachine: string | null = null;

  constructor(bus: EventBus, inventory: Inventory, player: Player, notify: Notify) {
    this.bus = bus;
    this.inventory = inventory;
    this.player = player;
    this.notify = notify;
  }

  registerMachines(machines: readonly GasOilMachineSpec[], interaction: InteractionSystem): void {
    for (const m of machines) {
      const [x, z] = machineUsePoint(m);
      interaction.register({
        id: `use_${m.id}`,
        position: new THREE.Vector3(x, 0, z),
        radius: 1.9,
        prompt: () => `Comprar GASIL · ${economySettings.gasoilPrice} ₲`,
        interact: () => this.buy(m.id),
      });
    }
  }

  buy(machineId: string): boolean {
    const item = ITEMS[GASOIL_ITEM];
    if (this.inventory.count(item.id) >= item.maxStack) {
      this.notify("Ya no te caben más latas de GASIL", "warn");
      return false;
    }
    if (!this.inventory.spend(economySettings.gasoilPrice)) {
      this.notify(`Necesitas ${economySettings.gasoilPrice} ₲ para una lata`, "warn");
      return false;
    }
    const promo = this.promoMachine === machineId;
    const got = this.inventory.add(item.id, promo ? 2 : 1);
    this.bus.emit("machine:used", { machineId, itemId: item.id });
    this.notify(promo && got > 1 ? "¡PROMO 2x1! +2 GASIL · pulsa G para beber" : "+1 GASIL · pulsa G para beberlo", "success");
    return true;
  }

  /**
   * G: beber una lata.
   * - Sin GASIL → "NO GASIL" (no hay animación).
   * - Turbo lleno → "TURBO FULL" (no se desperdicia la lata).
   * - Si no → animación; la lata se gasta y el turbo sube en el trago final.
   */
  drink(): DrinkResult {
    const item = ITEMS[GASOIL_ITEM];
    const stats = this.player.stats;
    if (this.player.inVehicle) {
      this.notify("GASIL solo a pie: aparca y baja (E)", "warn");
      return "busy";
    }
    if (this.player.isDrinking || !this.player.onGround) return "busy";
    if (!this.inventory.has(item.id)) {
      this.notify("NO GASIL · búscalo en las máquinas", "warn");
      this.bus.emit("gasoil:denied", { reason: "no_gasoil" });
      return "no_gasoil";
    }
    if (stats.turboFull) {
      this.notify("TURBO FULL · gasta turbo con SHIFT", "warn");
      this.bus.emit("gasoil:denied", { reason: "turbo_full" });
      return "turbo_full";
    }
    const started = this.player.startDrinking(drinkSettings.duration, drinkSettings.applyAt, () => {
      // Momento del trago: se revalida por seguridad antes de gastar nada
      if (stats.turboFull || !this.inventory.remove(item.id, 1)) return;
      const gained = stats.addTurbo(item.turbo ?? 0);
      this.player.model.energyFlash();
      this.bus.emit("gasoil:drink", { turboGained: gained, turbo: stats.turbo });
      this.notify(`TURBO +${Math.round(gained)} · ${DRINK_QUIPS[this.quip++ % DRINK_QUIPS.length]}`, "success");
    });
    if (!started) return "busy";
    this.bus.emit("gasoil:drinkStart", {});
    return "started";
  }

  /** Compatibilidad con fases anteriores (p. ej. F). */
  consume(): boolean {
    return this.drink() === "started";
  }
}
