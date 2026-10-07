import * as THREE from "three";
import type { Collider, WorldBounds } from "./colliders";
import { Environment } from "./Environment";
import { createFacadeAtlas } from "./buildingAtlas";
import { buildBuildingsGeometry } from "./buildings";
import type { BuildingSpec } from "./buildings";
import { TreeField } from "./Props";
import { StaticBatcher } from "../utils/StaticBatcher";
import { QuadBatcher } from "../utils/QuadBatcher";
import { toon } from "../utils/materials";
import { GroundPatches } from "./GroundPatches";
import { GroundMap } from "./GroundMap";
import type { GroundQuery } from "./GroundMap";
import { RoadNetwork } from "./roads/RoadNetwork";
import { MapData } from "./map/MapData";
import { POIRegistry } from "./poi/POIRegistry";
import { createSignAtlas } from "./signs";
import { createGasOilAtlas } from "../gasoil/branding";
import { addGasOilMachine } from "../gasoil/GasOilMachine";
import { CITY_BOUNDS, PLAYER_SPAWN, ROADS } from "../data/cityLayout";
import type { GasOilMachineSpec, Zone, ZoneContext } from "./zones/Zone";
import { HomeZone } from "./zones/HomeZone";
import { ResidentialZone } from "./zones/ResidentialZone";
import { CommercialZone } from "./zones/CommercialZone";
import { GasStationZone } from "./zones/GasStationZone";
import { ParkZone } from "./zones/ParkZone";
import { StreetsZone } from "./zones/StreetsZone";
import { OutskirtsZone } from "./zones/OutskirtsZone";

/**
 * Mundo: primer barrio de USAINBOT.
 *
 *   World
 *   ├── RoadNetwork       (calles desde datos)
 *   ├── HomeZone          (mansión + garaje: inicio del juego)
 *   ├── ResidentialZone   (viviendas, pisos, plaza, cancha)
 *   ├── CommercialZone    (tiendas, callejón, galería + parking)
 *   ├── GasStationZone    (GasOil Stop)
 *   ├── ParkZone          (estatua, estanque, zona infantil)
 *   ├── StreetsZone       (farolas, placas, mobiliario de calle)
 *   └── OutskirtsZone     (límites, salidas, skyline) → futuras zonas
 *
 * Las zonas aportan a lotes compartidos que se fusionan al final:
 * todo el barrio cabe en unas pocas decenas de draw calls.
 */
export class World {
  readonly group = new THREE.Group();
  readonly bounds: WorldBounds = { ...CITY_BOUNDS };
  readonly environment: Environment;
  readonly pois = new POIRegistry();
  readonly map: MapData;
  readonly machines: GasOilMachineSpec[] = [];
  readonly spawn = { position: new THREE.Vector3(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z), yaw: PLAYER_SPAWN.yaw };
  readonly zones: Zone[];
  /** Suelo caminable (altura real de cada superficie visible). */
  readonly groundMap = new GroundMap(0);
  readonly groundAt: GroundQuery = (x, z, maxY) => this.groundMap.heightAt(x, z, maxY);
  private colliders: Collider[] = [];
  private waterMaps: THREE.Texture[] = [];

  constructor(root: THREE.Scene) {
    root.add(this.group);
    this.environment = new Environment(root);
    this.map = new MapData({ ...CITY_BOUNDS });

    const roads = new RoadNetwork(ROADS);
    roads.build(this.group, this.map, this.groundMap);
    this.zones = [
      new HomeZone(),
      new ResidentialZone(),
      new CommercialZone(),
      new GasStationZone(),
      new ParkZone(),
      new StreetsZone(roads, CITY_BOUNDS),
      new OutskirtsZone(CITY_BOUNDS),
    ];
    this.build();
  }

  getColliders(): readonly Collider[] {
    return this.colliders;
  }

  /** Zona en la que está un punto (para HUD, audio ambiente, streaming futuro). */
  zoneAt(x: number, z: number): Zone | null {
    const order = ["home", "gas_station", "commercial", "park", "residential"];
    for (const id of order) {
      const zone = this.zones.find((zn) => zn.id === id);
      if (zone && x >= zone.bounds.minX && x <= zone.bounds.maxX && z >= zone.bounds.minZ && z <= zone.bounds.maxZ) {
        return zone;
      }
    }
    return null;
  }

  update(dt: number, focus: THREE.Vector3): void {
    this.environment.update(dt, focus);
    for (const map of this.waterMaps) {
      map.offset.x += dt * 0.025;
      map.offset.y += dt * 0.012;
    }
    for (const zone of this.zones) zone.update?.(dt, focus);
  }

  private build(): void {
    const facades: BuildingSpec[] = [];
    const signs = new QuadBatcher();
    const gasoil = new QuadBatcher();
    const ground = new GroundPatches(this.groundMap);
    const props = new StaticBatcher();
    const trees = new TreeField();
    const ctx: ZoneContext = {
      group: this.group,
      props,
      trees,
      colliders: this.colliders,
      facades,
      signs,
      gasoil,
      ground,
      groundMap: this.groundMap,
      pois: this.pois,
      map: this.map,
      machines: this.machines,
      waterMaps: this.waterMaps,
    };

    for (const zone of this.zones) {
      try {
        zone.build(ctx);
      } catch (err) {
        console.error(`[World] error construyendo la zona "${zone.id}"`, err);
      }
    }

    ground.build(this.group);
    const atlas = createFacadeAtlas();
    if (facades.length > 0) {
      const buildings = new THREE.Mesh(buildBuildingsGeometry(facades), atlas.material);
      buildings.castShadow = true;
      buildings.receiveShadow = true;
      buildings.matrixAutoUpdate = false;
      this.group.add(buildings);
    }
    const propMesh = props.build(toon({ vertexColors: true }));
    if (propMesh) this.group.add(propMesh);
    const signMesh = signs.build(createSignAtlas());
    if (signMesh) this.group.add(signMesh);
    const gasoilMesh = gasoil.build(createGasOilAtlas());
    if (gasoilMesh) this.group.add(gasoilMesh);
    this.group.add(trees.build());
  }
}

/** Reexportado para quien quiera colocar máquinas desde fuera de una zona. */
export { addGasOilMachine };
