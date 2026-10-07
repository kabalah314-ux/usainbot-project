import type { MissionManager } from "./MissionManager";
import { MissionState } from "./Mission";
import type { POI, POIRegistry } from "../world/poi/POIRegistry";
import type { ObjectiveTracker } from "./ObjectiveTracker";

export interface NavTarget {
  poi: POI;
  /** Texto del waypoint (p. ej. "MÁQUINA GASOIL"). */
  label: string;
  kind: "objective" | "giver";
}

/**
 * ¿A dónde debería ir el jugador ahora?
 * 1) Carrera en curso → siguiente checkpoint / meta.
 * 2) Misión activa → destino del objetivo actual (según su tipo).
 * 3) Sin misión → NPC que ofrece una misión disponible.
 */
export class MissionNavigator {
  private missions: MissionManager;
  private pois: POIRegistry;
  private tracker: ObjectiveTracker;

  constructor(missions: MissionManager, pois: POIRegistry, tracker: ObjectiveTracker) {
    this.missions = missions;
    this.pois = pois;
    this.tracker = tracker;
  }

  current(): NavTarget | null {
    if (this.missions.active) {
      const poi = this.tracker.navTarget();
      return poi ? { poi, label: poi.name.toUpperCase(), kind: "objective" } : null;
    }
    const offer = this.missions.all().find((m) => m.state === MissionState.Available && m.giver);
    const giver = offer?.giver ? this.pois.get(offer.giver) : undefined;
    return giver ? { poi: giver, label: `NUEVA MISIÓN · ${giver.name.toUpperCase()}`, kind: "giver" } : null;
  }
}
