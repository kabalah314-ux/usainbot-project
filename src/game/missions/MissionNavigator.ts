import type { MissionManager } from "./MissionManager";
import { MissionState } from "./Mission";
import type { POI, POIRegistry } from "../world/poi/POIRegistry";
import type { ObjectiveTracker } from "./ObjectiveTracker";
import type { MissionType } from "../data/missionTypes";
import type { RaceManager } from "../race/RaceManager";

export interface NavTarget {
  poi: POI;
  /** Texto del waypoint (p. ej. "MÁQUINA GASOIL"). */
  label: string;
  kind: "objective" | "giver";
  /** Tipo de misión: decide el color del waypoint, del marcador y del minimapa. */
  missionType: MissionType;
}

/**
 * ¿A dónde debería ir el jugador ahora?
 * 1) Carrera en curso → siguiente checkpoint / meta.
 * 2) Misión activa → destino del objetivo actual (según su tipo y modo).
 * 3) Sin misión → NPC que ofrece una misión disponible.
 * El color lo marca el tipo de misión (AZUL = conducción).
 */
export class MissionNavigator {
  private missions: MissionManager;
  private pois: POIRegistry;
  private tracker: ObjectiveTracker;
  private races: RaceManager;

  constructor(missions: MissionManager, pois: POIRegistry, tracker: ObjectiveTracker, races: RaceManager) {
    this.missions = missions;
    this.pois = pois;
    this.tracker = tracker;
    this.races = races;
  }

  current(): NavTarget | null {
    const active = this.missions.active;
    const race = this.tracker.raceTarget();
    if (race) {
      const type: MissionType = active?.data.missionType ?? (this.races.race?.mode === "vehicle" ? "VEHICLE" : "ON_FOOT");
      return { poi: race, label: race.name.toUpperCase(), kind: "objective", missionType: type };
    }
    if (active) {
      const poi = this.tracker.navTarget();
      return poi ? { poi, label: poi.name.toUpperCase(), kind: "objective", missionType: active.data.missionType } : null;
    }
    const offer = this.missions.all().find((m) => m.state === MissionState.Available && m.giver);
    const giver = offer?.giver ? this.pois.get(offer.giver) : undefined;
    return giver && offer
      ? { poi: giver, label: `NUEVA MISIÓN · ${giver.name.toUpperCase()}`, kind: "giver", missionType: offer.data.missionType }
      : null;
  }
}
