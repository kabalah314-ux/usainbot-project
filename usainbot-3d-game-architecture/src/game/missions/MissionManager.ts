import { Mission, MissionState } from "./Mission";
import type { MissionStateChange } from "./Mission";
import type { MissionData } from "../data/types";

/**
 * Gestiona el conjunto de misiones, el estado activo
 * y notifica a los interesados (HUD, audio, guardado...) de cambios.
 */
export class MissionManager {
  private missions = new Map<string, Mission>();
  private activeMission: Mission | null = null;
  private listeners: ((change: MissionStateChange) => void)[] = [];

  loadFromData(list: MissionData[], states?: Record<string, MissionState>): void {
    for (const data of list) {
      const mission = new Mission(data, states?.[data.id] ?? MissionState.Available);
      mission.onStateChange(this.onMissionChange);
      this.missions.set(mission.id, mission);
      if (mission.state === MissionState.Active) this.activeMission = mission;
    }
  }

  private onMissionChange = (change: MissionStateChange): void => {
    if (change.next === MissionState.Active) {
      this.activeMission = change.mission;
    } else if (change.mission === this.activeMission) {
      this.activeMission = null;
    }
    for (const listener of this.listeners) listener(change);
  };

  onChange(cb: (change: MissionStateChange) => void): void {
    this.listeners.push(cb);
  }

  get(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  all(): Mission[] {
    return [...this.missions.values()];
  }

  get active(): Mission | null {
    return this.activeMission;
  }

  firstAvailable(): Mission | null {
    return this.all().find((m) => m.state === MissionState.Available) ?? null;
  }

  /** Desbloquea una misión bloqueada (la usan NPCs/completar otra, etc.). */
  unlock(id: string): void {
    const mission = this.missions.get(id);
    if (mission && mission.state === MissionState.Locked) {
      mission.setState(MissionState.Available);
    }
  }

  startMission(id: string): boolean {
    const mission = this.missions.get(id);
    if (!mission) return false;
    mission.start();
    return mission.state === MissionState.Active;
  }

  completeObjective(missionId: string, objectiveId: string): boolean {
    return this.missions.get(missionId)?.completeObjective(objectiveId) ?? false;
  }

  update(dt: number): void {
    for (const mission of this.missions.values()) mission.update(dt);
  }

  /** Resumen de una línea para el panel de debug. */
  summary(): string {
    const mission = this.active ?? this.firstAvailable();
    if (!mission) return "sin misiones";
    const done = mission.objectives.filter((o) => o.complete).length;
    return `${mission.title} [${mission.state}] ${done}/${mission.objectives.length}`;
  }
}
