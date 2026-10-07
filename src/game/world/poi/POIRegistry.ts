import * as THREE from "three";
import type { POICategory } from "../../data/poi";
import type { MissionType } from "../../data/missionTypes";

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  /** Posición de mundo (referencia viva: un NPC puede moverla). */
  position: THREE.Vector3;
  /** Oculto temporalmente (p. ej. NPC de misión sin misión disponible). */
  hidden?: boolean;
  /** NPC que da misión: tipo de la misión que ofrece (color/icono del marcador). */
  missionType?: MissionType;
}

/**
 * Registro central de puntos de interés. Lo alimentan las zonas y los NPCs;
 * lo consultan el minimapa, el mapa y los waypoints.
 */
export class POIRegistry {
  private pois = new Map<string, POI>();

  add(poi: POI): POI {
    if (this.pois.has(poi.id)) console.warn(`[POI] id duplicado: ${poi.id}`);
    this.pois.set(poi.id, poi);
    return poi;
  }

  /** Atajo para zonas: crea el POI a partir de coordenadas. */
  define(id: string, name: string, category: POICategory, x: number, z: number, y = 0): POI {
    return this.add({ id, name, category, position: new THREE.Vector3(x, y, z) });
  }

  get(id: string): POI | undefined {
    return this.pois.get(id);
  }

  all(): POI[] {
    return [...this.pois.values()];
  }

  visible(): POI[] {
    return this.all().filter((p) => !p.hidden);
  }

  byCategory(category: POICategory): POI[] {
    return this.all().filter((p) => p.category === category);
  }

  nearest(category: POICategory, from: THREE.Vector3): POI | null {
    let best: POI | null = null;
    let bestD = Infinity;
    for (const p of this.pois.values()) {
      if (p.category !== category || p.hidden) continue;
      const d = p.position.distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }
}
