import type { Rect } from "../zones/Zone";

export type MapAreaKind =
  | "park"
  | "lawn"
  | "water"
  | "plaza"
  | "parking"
  | "pavement"
  | "sand"
  | "court";

export type MapBuildingKind =
  | "home"
  | "house"
  | "shop"
  | "apartment"
  | "gas"
  | "garage"
  | "canopy"
  | "factory";

export interface MapRoad extends Rect {
  name: string;
  /** Anchura de acera a cada lado (para dibujarla). */
  sidewalk: number;
  axis: "x" | "z";
}

/**
 * Representación 2D del mundo para el minimapa y el mapa completo.
 * Las zonas y la red viaria la rellenan mientras construyen la geometría,
 * así el mapa siempre coincide con el mundo.
 */
export class MapData {
  readonly bounds: Rect;
  readonly roads: MapRoad[] = [];
  readonly areas: Array<{ kind: MapAreaKind; rect?: Rect; circle?: { x: number; z: number; r: number } }> = [];
  readonly buildings: Array<{ kind: MapBuildingKind; rect: Rect }> = [];
  readonly labels: Array<{ text: string; x: number; z: number }> = [];

  constructor(bounds: Rect) {
    this.bounds = bounds;
  }

  area(kind: MapAreaKind, minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.areas.push({ kind, rect: { minX, maxX, minZ, maxZ } });
  }

  circle(kind: MapAreaKind, x: number, z: number, r: number): void {
    this.areas.push({ kind, circle: { x, z, r } });
  }

  building(kind: MapBuildingKind, minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.buildings.push({ kind, rect: { minX, maxX, minZ, maxZ } });
  }

  label(text: string, x: number, z: number): void {
    this.labels.push({ text, x, z });
  }
}
