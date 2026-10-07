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
import { LifeZone } from "./zones/LifeZone";
import { SantObrerZone } from "./zones/SantObrerZone";
import { SectionsZone } from "./zones/SectionsZone";
import { DiagonalZone } from "./zones/DiagonalZone";
import { PortZone } from "./zones/PortZone";
import { DowntownZone } from "./zones/DowntownZone";
import { MallZone } from "./zones/MallZone";
import { MercantileZone } from "./zones/MercantileZone";
import { TriangleZone } from "./zones/TriangleZone";
import { BeachZone } from "./zones/BeachZone";
import { MAP_VIEW_BOUNDS } from "../data/cityLayout";
import { districtAt } from "../data/districts";
import type { District } from "../data/districts";

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
  /** Material del atlas GasOil (máquinas, anuncios): se hace "latir" su brillo. */
  readonly gasoilMaterial = createGasOilAtlas();
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
    // La vista del mapa incluye los distritos futuros reservados alrededor.
    this.map = new MapData({ ...MAP_VIEW_BOUNDS });

    const roads = new RoadNetwork(ROADS);
    roads.build(this.group, this.map, this.groundMap);
    this.zones = [
      new HomeZone(),
      new ResidentialZone(),
      new CommercialZone(),
      new GasStationZone(),
      new ParkZone(),
      new SantObrerZone(), // expansión obrera (este)
      new DiagonalZone(), // residencial oeste
      new PortZone(), // puerto este
      new DowntownZone(), // torres y comercios del oeste del sur
      new MallZone(), // centro comercial grande con aparcamiento entrable
      new MercantileZone(), // expansión SUR: terrenos triangulares (mercado)
      new TriangleZone(), // expansión OESTE: gran triángulo unido al mapa
      new BeachZone(), // playa norte
      new StreetsZone(roads, CITY_BOUNDS),
      new SectionsZone(CITY_BOUNDS), // marcas de las secciones aún por rellenar
      new OutskirtsZone(CITY_BOUNDS),
      new LifeZone(CITY_BOUNDS),
    ];
    this.build();
  }

  getColliders(): readonly Collider[] {
    return this.colliders;
  }

  /** Distrito (barrio) en el que está un punto: "MANSIÓN USAINBOT", "SANT OBRER"... */
  districtAt(x: number, z: number): District | null {
    return districtAt(x, z);
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
    const gasoilMesh = gasoil.build(this.gasoilMaterial);
    if (gasoilMesh) this.group.add(gasoilMesh);
    this.group.add(trees.build());
  }
}

/** Reexportado para quien quiera colocar máquinas desde fuera de una zona. */
export { addGasOilMachine };
