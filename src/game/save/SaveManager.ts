/**
 * Guardado automático en el navegador (localStorage) por SESIÓN de perfil.
 *
 *   · Siempre se guarda solo (cada AUTOSAVE_SECONDS y al cerrar la pestaña):
 *     al volver al mismo navegador, se retoma donde se dejó.
 *   · "Iniciar sesión" = elegir un perfil (`login`): cada perfil tiene su
 *     propia partida. Se puede entrar con uno nuevo (partida nueva) o
 *     continuar uno existente.
 *   · `saveNow` guarda ya (útil tras eventos clave).
 */
export interface SaveData {
  version: number;
  savedAt: number;
  money: number;
  inventory: Record<string, number>;
  missions: Record<string, { state: string; objective: string | null }>;
  completedMissions: string[];
  player: {
    mode: "on_foot" | "in_vehicle";
    position: [number, number, number];
    yaw: number;
    stats: Record<string, number>;
  };
  vehicle: { current: string; position: [number, number, number]; yaw: number };
  upgrades: Record<string, number>;
}

const PREFIX = "usainbot_save_";
const AUTOSAVE_SECONDS = 15;

/** Lo que el juego serializa (sin `savedAt`, que pone el propio guardado). */
export type SavePayload = Omit<SaveData, "savedAt">;

export class SaveManager {
  private create: (() => SavePayload) | null = null;
  private apply: ((data: SaveData) => void) | null = null;
  private slot = "jugador";
  private interval = 0;

  get activeSlot(): string {
    return this.slot;
  }

  /** Conecta el juego: `create` serializa, `apply` restaura. Arranca el auto-guardado. */
  attach(create: () => SavePayload, apply: (data: SaveData) => void): void {
    this.create = create;
    this.apply = apply;
    if (this.interval) window.clearInterval(this.interval);
    this.interval = window.setInterval(() => this.saveNow(), AUTOSAVE_SECONDS * 1000);
    window.addEventListener("beforeunload", this.saveNow);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  dispose(): void {
    this.saveNow();
    if (this.interval) window.clearInterval(this.interval);
    this.interval = 0;
    window.removeEventListener("beforeunload", this.saveNow);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.create = null;
    this.apply = null;
  }

  /** Abre una sesión de perfil: carga su partida si existe (o empieza limpia). */
  login(slot: string): SaveData | null {
    this.slot = slot.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "jugador";
    const data = this.load(this.slot);
    if (data) this.apply?.(data);
    return data;
  }

  /** Guarda la partida del perfil activo. */
  saveNow = (): void => {
    if (!this.create) return;
    try {
      const data: SaveData = { ...this.create(), savedAt: Date.now() };
      localStorage.setItem(PREFIX + this.slot, JSON.stringify(data));
      localStorage.setItem(PREFIX + "last", this.slot);
    } catch {
      // Sin almacenamiento disponible: el juego sigue, solo no persiste.
    }
  };

  /**
   * Escribe un guardado ya serializado. Mantiene compatibilidad con el
   * sincronizador de nube heredado, que necesita sellar el timestamp remoto.
   */
  write(data: SaveData): boolean {
    try {
      localStorage.setItem(PREFIX + this.slot, JSON.stringify(data));
      localStorage.setItem(PREFIX + "last", this.slot);
      return true;
    } catch {
      return false;
    }
  }

  load(slot: string = this.slot): SaveData | null {
    try {
      const raw = localStorage.getItem(PREFIX + slot);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }

  hasSave(slot: string): boolean {
    try {
      return localStorage.getItem(PREFIX + slot) !== null;
    } catch {
      return false;
    }
  }

  /** Último perfil usado en este navegador (para continuar al entrar). */
  lastSlot(): string | null {
    try {
      return localStorage.getItem(PREFIX + "last");
    } catch {
      return null;
    }
  }

  slots(): string[] {
    try {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX) && k !== PREFIX + "last") out.push(k.slice(PREFIX.length));
      }
      return out;
    } catch {
      return [];
    }
  }

  clear(slot: string): void {
    try {
      localStorage.removeItem(PREFIX + slot);
    } catch {
      // ignorado
    }
  }

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.saveNow();
  };
}
