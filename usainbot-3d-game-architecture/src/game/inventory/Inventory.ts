import type { EventBus } from "../core/EventBus";
import { ITEMS, economySettings } from "../data/items";

/**
 * Inventario del jugador: objetos por id + dinero (₲).
 * Emite eventos en el bus; no conoce misiones ni UI.
 */
export class Inventory {
  private items = new Map<string, number>();
  private bus: EventBus;
  money: number = economySettings.startMoney;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  count(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  has(itemId: string, amount = 1): boolean {
    return this.count(itemId) >= amount;
  }

  /** Añade objetos respetando el máximo por pila. Devuelve cuántos entraron. */
  add(itemId: string, amount = 1): number {
    const data = ITEMS[itemId];
    if (!data) {
      console.warn(`[Inventory] objeto desconocido: ${itemId}`);
      return 0;
    }
    const current = this.count(itemId);
    const added = Math.max(0, Math.min(amount, data.maxStack - current));
    if (added === 0) return 0;
    this.items.set(itemId, current + added);
    this.bus.emit("inventory:changed", { itemId, count: current + added, delta: added });
    return added;
  }

  remove(itemId: string, amount = 1): boolean {
    const current = this.count(itemId);
    if (current < amount) return false;
    this.items.set(itemId, current - amount);
    this.bus.emit("inventory:changed", { itemId, count: current - amount, delta: -amount });
    return true;
  }

  addMoney(amount: number): void {
    this.money += amount;
    this.bus.emit("money:changed", { money: this.money, delta: amount });
  }

  spend(amount: number): boolean {
    if (this.money < amount) return false;
    this.money -= amount;
    this.bus.emit("money:changed", { money: this.money, delta: -amount });
    return true;
  }

  entries(): Array<[string, number]> {
    return [...this.items.entries()].filter(([, n]) => n > 0);
  }

  serialize(): { money: number; items: Record<string, number> } {
    return { money: this.money, items: Object.fromEntries(this.entries()) };
  }
}
