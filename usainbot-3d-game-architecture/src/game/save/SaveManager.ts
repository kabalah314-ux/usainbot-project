/**
 * Fase 1: arquitectura de guardado sobre localStorage.
 * La UI de guardar/cargar llegará con la economía y las misiones.
 */
/**
 * Datos de partida (preparados; el guardado definitivo llegará más adelante).
 * Game.createSaveData() los genera a partir del estado real del juego.
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
  /** Mejoras futuras (personaje y vehículos). */
  upgrades: Record<string, number>;
}

const SAVE_KEY = "usainbot_save_v2";

export class SaveManager {
  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  save(data: Omit<SaveData, "savedAt">): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
      return true;
    } catch {
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Sin acceso a storage: nada que limpiar.
    }
  }
}
