/**
 * Bus de eventos tipado. Desacopla sistemas: el inventario no sabe nada de
 * misiones; las misiones solo escuchan eventos ("gasoil:boost", "npc:talk"…).
 */
export interface GameEvents {
  "inventory:changed": { itemId: string; count: number; delta: number };
  "money:changed": { money: number; delta: number };
  "gasoil:boost": { duration: number };
  "gasoil:drinkStart": Record<string, never>;
  "gasoil:drink": { turboGained: number; turbo: number };
  "gasoil:denied": { reason: "no_gasoil" | "turbo_full" };
  "turbo:start": Record<string, never>;
  "turbo:denied": Record<string, never>;
  "item:used": { itemId: string };
  "race:checkpoint": { raceId: string; index: number; total: number };
  "race:finish": { raceId: string; success: boolean; time: number; reason?: string };
  "race:countdown": { value: number };
  "ambient:event": { id: string; phase: "start" | "end" };
  "npc:helped": { npcId: string; withGasOil: boolean };
  "vehicle:enter": { vehicleId: string };
  "vehicle:exit": { vehicleId: string };
  "vehicle:crash": { vehicleId: string; impact: number };
  "npc:talk": { npcId: string };
  "npc:talkEnd": { npcId: string };
  "object:interact": { objectId: string };
  "machine:used": { machineId: string; itemId: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object = GameEvents> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        (handler as Handler<E[K]>)(payload);
      } catch (err) {
        console.error(`[EventBus] error en "${String(event)}"`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
