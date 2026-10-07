import type * as THREE from "three";
import type { StaticBatcher } from "../../utils/StaticBatcher";
import type { QuadBatcher } from "../../utils/QuadBatcher";
import type { Collider } from "../colliders";
import type { BuildingSpec } from "../buildings";
import type { TreeField } from "../Props";
import type { POIRegistry } from "../poi/POIRegistry";
import type { MapData } from "../map/MapData";
import type { GroundPatches } from "../GroundPatches";
import type { GroundMap } from "../GroundMap";

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Máquina expendedora de GasOil colocada por una zona. */
export interface GasOilMachineSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Orientación del frontal (0 = mira a +Z). */
  rotY: number;
}

/**
 * Todo lo que una zona puede aportar al mundo. Los lotes (props, fachadas,
 * rótulos, suelos) se fusionan al final: añadir contenido no suma draw calls.
 */
export interface ZoneContext {
  group: THREE.Group;
  props: StaticBatcher;
  trees: TreeField;
  colliders: Collider[];
  /** Edificios con fachada del atlas (todos → 1 malla). */
  facades: BuildingSpec[];
  /** Rótulos del atlas de carteles. */
  signs: QuadBatcher;
  /** Gráficos del atlas de GasOil (anuncios, frontal de máquinas…). */
  gasoil: QuadBatcher;
  ground: GroundPatches;
  /** Suelos caminables que no son parches (escalones, tarimas, alfombras). */
  groundMap: GroundMap;
  pois: POIRegistry;
  map: MapData;
  machines: GasOilMachineSpec[];
  waterMaps: THREE.Texture[];
}

/**
 * Zona del mundo. Para añadir un barrio nuevo: implementar Zone y añadirla
 * a la lista de World. Cada zona es autocontenida.
 */
export interface Zone {
  readonly id: string;
  readonly name: string;
  readonly bounds: Rect;
  build(ctx: ZoneContext): void;
  /** Lógica ligera por frame (p. ej. ocultar tejados al entrar). */
  update?(dt: number, playerPos: THREE.Vector3): void;
}

export const inRect = (r: Rect, x: number, z: number, pad = 0): boolean =>
  x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad;
