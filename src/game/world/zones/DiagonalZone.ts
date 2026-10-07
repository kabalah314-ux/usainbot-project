import * as THREE from "three";
import { addBench, addBin, addCar, addLamp, addPlanter } from "../Props";
import { addHedge, addMailbox, addShopSign } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade } from "./common";
import { addHouse } from "../buildings/houses";
import type { BuildingSpec } from "../buildings";
import type { Rect, Zone, ZoneContext } from "./Zone";

const N = new THREE.Vector3(0, 0, -1);
const S = new THREE.Vector3(0, 0, 1);

/**
 * BARRIO DIAGONAL (oeste) — zona residencial tranquila.
 * Manzanas de viviendas unifamiliares con jardín, dos bloques de pisos,
 * una plazuela arbolada y su tienda de barrio. Coherente con lo que es:
 * casas, coches aparcados, buzones y setos.
 */
export class DiagonalZone implements Zone {
  readonly id = "diagonal";
  readonly name = "Barrio Diagonal";
  readonly bounds: Rect = { minX: -185, maxX: -118, minZ: -95, maxZ: 115 };

  build(ctx: ZoneContext): void {
    this.buildApartments(ctx);
    this.buildHomes(ctx);
    this.buildPlaza(ctx);

    ctx.pois.define("plaza_ensanche", "Plaza del Ensanche", "PARK", -157, 26);
    ctx.pois.define("tienda_ensanche", "Tienda del Ensanche", "SHOP", -157, -78);
    ctx.map.label("BARRIO DIAGONAL", -152, 10);
    ctx.map.label("PLAZA DEL ENSANCHE", -157, 26);
  }

  /** Bloques de pisos en las manzanas del sur (junto a C. Comercio). */
  private buildApartments(ctx: ZoneContext): void {
    const a1: BuildingSpec = { x: -127, z: -8, w: 13, d: 13, h: 19, style: 3, front: S };
    const a2: BuildingSpec = { x: -157, z: -8, w: 13, d: 13, h: 15, style: 6, front: S };
    const a3: BuildingSpec = { x: -127, z: -78, w: 14, d: 12, h: 11, style: 1, front: N };
    addFacade(ctx, a1, "apartment");
    addFacade(ctx, a2, "apartment");
    addFacade(ctx, a3, "apartment");
    addShopSign(ctx, -157, 4.2, -71.6, 0, "super24", 7); // tienda del barrio
    ctx.pois.define("tienda_del_ensanche", "Súper del Ensanche", "SHOP", -157, -72);
  }

  /**
   * Viviendas unifamiliares con jardín: filas por manzana, todas dentro de
   * las manzanas (sin pisar calles ni aceras).
   */
  private buildHomes(ctx: ZoneContext): void {
    // Manzana norte-este (x -137.5..-118, z 77.5..106)
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: -132 + i * 5.8, z: 86, facing: "n", style: i, floors: 1, w: 5, d: 6.5, yard: 2.6 });
      addHouse(ctx, { x: -132 + i * 5.8, z: 99, facing: "s", style: i + 3, floors: 1, w: 5, d: 6.5, yard: 2.6 });
    }
    // Manzana noroeste (x -162.5..-152.5, z 77.5..106) — calle estrecha: fila simple
    for (let i = 0; i < 2; i++) {
      addHouse(ctx, { x: -160 + i * 6, z: 86, facing: "n", style: i + 2, floors: 2, w: 5, d: 6.5, yard: 2.4 });
      addHouse(ctx, { x: -160 + i * 6, z: 99, facing: "s", style: i + 5, floors: 1, w: 5, d: 6.5, yard: 2.4 });
    }
    // Manzana central (x -137.5..-118, z 20.5..36)
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: -132 + i * 5.8, z: 27, facing: "n", style: i + 4, floors: 1, w: 5, d: 6, yard: 2.2 });
    }
    // Manzana central-oeste (x -162.5..-152.5, z -16..-4.5)
    addHouse(ctx, { x: -157, z: -10, facing: "n", style: 6, floors: 2, w: 5, d: 6, yard: 2.2 });
    // Manzana de C. Gasolina (x -137.5..-118, z 54..62.5)
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: -132 + i * 5.8, z: 58, facing: "s", style: i + 1, floors: 1, w: 5, d: 5.5, yard: 1.6 });
    }
    addHedge(ctx.props, ctx.colliders, -118.4, 78, -118.4, 104, 1.1);
    addHedge(ctx.props, ctx.colliders, -137.1, 78, -137.1, 104, 1.1);
    addMailbox(ctx.props, ctx.colliders, -126, 80.5, Math.PI);
    addMailbox(ctx.props, ctx.colliders, -131.5, 80.5, Math.PI);
    addMailbox(ctx.props, ctx.colliders, -132, 32, Math.PI);
  }

  /** Plazuela arbolada del Ensanche + su máquina GasOil. */
  private buildPlaza(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("plaza", -170, -145, 8, 45);
    ctx.map.area("plaza", -170, -145, 8, 45);
    for (const [x, z] of [[-162, 16], [-150, 16], [-162, 38], [-150, 38], [-156, 26]] as Array<[number, number]>) {
      ctx.trees.add(c, x, z, 1.15);
    }
    addBench(b, c, -149, 24, -Math.PI / 2);
    addBench(b, c, -149, 32, -Math.PI / 2);
    addPlanter(b, c, -157, 14);
    addBin(b, c, -164, 27);
    addGasOilMachine(ctx, { id: "machine_ensanche", name: "Máquina GasOil · Ensanche", x: -147, z: 12, rotY: -Math.PI / 2 });

    // Coches aparcados en batería (costumbre del barrio)
    addCar(b, c, -124, 40, 0, 0x2f6fb3);
    addCar(b, c, -124, 33, Math.PI, 0xf6f2ea);
    addCar(b, c, -161, -33, 0, 0xd8322b);
    addCar(b, c, -133, -33, 0, 0x2e9a42);
    addLamp(b, c, -118.6, 22, Math.PI / 2);
    addLamp(b, c, -118.6, 62, Math.PI / 2);
  }
}
