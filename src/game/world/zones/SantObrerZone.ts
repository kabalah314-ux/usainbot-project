import * as THREE from "three";
import { aabb } from "../colliders";
import { rotatedAabb } from "../Props";
import { addBench, addBin, addCar, addCone, addCrate, addLamp, addPlanter } from "../Props";
import {
  addBollards,
  addDumpster,
  addFence,
  addGasOilBillboard,
  addHedge,
  addParkingRow,
  addShopSign,
  addWall,
  localToWorld,
} from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade } from "./common";
import { addHouse } from "../buildings/houses";
import type { BuildingSpec } from "../buildings";
import type { MapBuildingKind } from "../map/MapData";
import { SIGN_UV } from "../signs";
import type { Rect, Zone, ZoneContext } from "./Zone";

const N = new THREE.Vector3(0, 0, -1);
const W = new THREE.Vector3(-1, 0, 0);

const FACTORY = 0xb8b0a4;
const FACTORY_ALT = 0xa8a29a;
const BRICK = 0xc07a4a;
const METAL_DARK = 0x3a3f45;
const GLASS = 0x9fd3ec;

/**
 * SANT OBRER — barrio obrero de geometría irregular, inspirado en los
 * ensanches de Barcelona (manzanas de tamaños distintos y esquinas
 * ACHAFLANADAS giradas 45°, como en el Eixample). Reutiliza fachadas,
 * casas, props, carteles y máquinas GasOil existentes.
 *
 *   Fábrica GasOil (con chimeneas)   ·  Mercado Obrero   ·  Taller
 *   Plaza del Taller                 ·  viviendas obreras
 */
export class SantObrerZone implements Zone {
  readonly id = "sant_obrer";
  readonly name = "Sant Obrer";
  readonly bounds: Rect = { minX: 121, maxX: 235, minZ: -100, maxZ: 130 };

  build(ctx: ZoneContext): void {
    this.buildFactories(ctx);
    this.buildMarketAndWorkshop(ctx); // incluye las viviendas obreras
    this.buildPlaza(ctx);
    this.buildChamferCorners(ctx);
    this.buildStreetFurniture(ctx);

    ctx.pois.define("gas_factory", "Fábrica GasOil", "SHOP", 185, -43);
    ctx.pois.define("mercado_obrero", "Mercado Obrero", "SHOP", 151, 58);
    ctx.pois.define("taller_obrero", "Taller Sant Obrer", "SHOP", 218, 28);
    ctx.pois.define("plaza_obrera", "Plaza del Taller", "PARK", 151, -8);
    ctx.pois.define("parking_obrero", "Aparcamiento de la fábrica", "PARKING", 185, -12);
    ctx.map.label("SANT OBRER", 176, 22);
    ctx.map.label("FÁBRICA GASOIL", 185, -43);
  }

  // ---------------------------------------------------- Fábricas
  private buildFactories(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Nave principal de la Fábrica GasOil (manzana x 167..203, z -60..-27)
    this.addFactory(ctx, 185, -43, 34, 28, 9, FACTORY, "FÁBRICA GASOIL");
    this.addSmokestack(ctx, 172, -33, 15, 0xb5452f);
    this.addSmokestack(ctx, 178, -33, 12, 0xa85a3a);
    this.addSilo(ctx, 199, -55, 8, 0xc3c9ce);
    this.addSilo(ctx, 205, -55, 6.5, 0xb0b8bf);
    // Tubería entre silos y nave
    b.setBase(202, 0, -46);
    b.cyl(0.07, 0.07, 6, 8, 0x7b848d, 0, 3.4, 0, Math.PI / 2, 0, 0);
    // Cartel GasOil + máquina + vallado + palés
    addGasOilBillboard(ctx, 185, -26, 0, 0, 1, 1.1);
    addGasOilMachine(ctx, { id: "machine_factory", name: "Máquina GasOil · Fábrica", x: 201, z: -30, rotY: Math.PI });
    addFence(b, c, 167, -61, 203, -61, 0x8b9298, 1.6);
    addFence(b, c, 203, -61, 203, -27, 0x8b9298, 1.6);
    addCrate(b, c, 170, -25, 0.2, 1.1);
    addCrate(b, c, 172, -24, -0.3);
    addCrate(b, c, 170.5, -23, 0.5, 0.8);
    addDumpster(b, c, 168, -57, 0, 0x5a636d);
    addParkingRow(b, 172, 198, -12, 5, 1);
    addCar(b, c, 176, -9.5, 0, 0x2f6fb3);
    addCar(b, c, 184, -9.5, Math.PI, 0xf6f2ea);
    addCar(b, c, 192, -9.5, 0, 0xd8322b);
    ctx.map.building("factory", 167, 203, -60, -27);

    // Nave secundaria (almacén) — manzana x 139..163, z -60..-27
    this.addFactory(ctx, 151, -43, 22, 26, 7, FACTORY_ALT, "ALMACÉN");
    addFence(b, c, 139, -61, 163, -61, 0x8b9298, 1.6);
    addCrate(b, c, 142, -25, 0.3);
    addCrate(b, c, 144, -24, -0.2, 0.75);
    addCone(b, 139, -22);
    addCone(b, 141, -22);
  }

  // ------------------------------------------- Mercado, Taller y viviendas
  private buildMarketAndWorkshop(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Mercado Obrero (manzana x 139..163, z 47..68)
    const market: BuildingSpec = { x: 151, z: 58, w: 22, d: 18, h: 6, style: 2, front: N };
    addFacade(ctx, market, "shop");
    addShopSign(ctx, 151, 4.6, 48.6, 0, "super24", 8);
    // Puestos de mercado
    for (const [x, z, col] of [[143, 44, 0xff7a1a], [151, 44, 0x2e9a42], [159, 44, 0xf2c21c]] as Array<[number, number, number]>) {
      b.setBase(x, 0, z);
      b.box(1.7, 0.9, 1.1, 0xc3c9ce, 0, 0.45, 0);
      b.box(1.9, 0.08, 1.3, col, 0, 1.4, 0);
      b.cyl(0.05, 0.05, 1.4, 6, METAL_DARK, -0.7, 0.7, 0.55);
      b.cyl(0.05, 0.05, 1.4, 6, METAL_DARK, 0.7, 0.7, 0.55);
      c.push(aabb(x, z, 1.7, 1.1, 1.4));
    }
    addBench(b, c, 138, 52, Math.PI / 2);
    addBench(b, c, 138, 62, Math.PI / 2);
    addBin(b, c, 140, 57);
    addGasOilMachine(ctx, { id: "machine_mercado", name: "Máquina GasOil · Mercado", x: 162, z: 66, rotY: Math.PI });

    // Taller (manzana x 207..230, z 10..43)
    const workshop: BuildingSpec = { x: 218, z: 28, w: 20, d: 14, h: 5.5, style: 5, front: W };
    addFacade(ctx, workshop, "shop");
    addShopSign(ctx, 207.6, 4.2, 28, -Math.PI / 2, "taller", 7);
    addCrate(b, c, 210, 12, 0.4);
    addCrate(b, c, 212, 11, -0.2, 0.8);
    addDumpster(b, c, 228, 38, Math.PI / 2, 0x2f6fb3);
    addCone(b, 212, 40);
    addCone(b, 214, 40);
    addParkingRow(b, 210, 228, 41, 5, -1);

    // Viviendas obreras: filas por manzana (todas dentro del solar libre)
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: 147 + i * 5.6, z: 88, facing: "n", style: i, floors: 1, w: 5, d: 6.5, yard: 2.4 });
      addHouse(ctx, { x: 147 + i * 5.6, z: 100, facing: "s", style: i + 3, floors: 1, w: 5, d: 6.5, yard: 2.4 });
    }
    for (let i = 0; i < 4; i++) {
      addHouse(ctx, { x: 178 + i * 5.6, z: 88, facing: "n", style: i + 2, floors: 2, w: 5, d: 6.5, yard: 2.4 });
      addHouse(ctx, { x: 178 + i * 5.6, z: 100, facing: "s", style: i + 5, floors: 2, w: 5, d: 6.5, yard: 2.4 });
    }
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: 220 + i * 5.6, z: 88, facing: "n", style: i + 4, floors: 1, w: 5, d: 6.5, yard: 2.4 });
    }
  }

  // --------------------------------------- Plaza y rambla (espacios verdes)
  private buildPlaza(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("plaza", 139, 163, -23, 6);
    ctx.map.area("plaza", 139, 163, -23, 6);
    for (const [x, z] of [[144, -18], [158, -18], [144, 1], [158, 1], [151, -9]] as Array<[number, number]>) {
      ctx.trees.add(c, x, z, 1.1);
    }
    addBench(b, c, 143, -8, Math.PI / 2);
    addBench(b, c, 159, -8, -Math.PI / 2);
    addPlanter(b, c, 151, -16);
    addBin(b, c, 145, -2);

    // Rambla Obrera (avenida ancha arbolada en z = 8): arbolado + bancos + carteles
    for (const x of [115, 127, 152, 178, 204, 226]) ctx.trees.add(c, x, 2.5, 1.0);
    for (const x of [121, 147, 173, 199, 221]) ctx.trees.add(c, x, 13.5, 1.0);
    addBench(b, c, 133, 2.2, 0);
    addBench(b, c, 187, 2.2, 0);
    addBench(b, c, 160, 13.8, Math.PI);
    addBin(b, c, 141, 2.4);
    addBin(b, c, 210, 2.4);
    addGasOilBillboard(ctx, 148, 3.2, 0, 2, 3, 0.85);
    addPlanter(b, c, 116, 12);
    addPlanter(b, c, 226, 12);
  }

  /** Mobiliario urbano suelto por el barrio. */
  private buildStreetFurniture(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    addLamp(b, c, 121, -20, Math.PI / 2);
    addLamp(b, c, 121, 40, Math.PI / 2);
    addLamp(b, c, 228, -20, -Math.PI / 2);
    addLamp(b, c, 228, 40, -Math.PI / 2);
    addBin(b, c, 121, 10);
    addBin(b, c, 228, 10);
    addHedge(ctx.props, c, 139, 112, 163, 112, 1.1);
    addWall(b, c, 203, 75, 230, 75, 0xd8ccb4, 1.2);
    addBollards(b, c, 121, 2.2, 121, 13.8, 1.5);
  }

  // ---------------------------------------------------- helpers industriales
  /** Nave industrial con fachada a dos aguas de ventanas y puerta de carga. */
  private addFactory(
    ctx: ZoneContext,
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: number,
    _name: string
  ): void {
    const b = ctx.props;
    b.setBase(x, 0, z);
    b.box(w, h, d, color, 0, h / 2, 0);
    b.box(w + 0.2, 0.2, d + 0.2, METAL_DARK, 0, h + 0.1, 0);
    const n = Math.max(2, Math.floor(w / 4));
    for (let i = 0; i < n; i++) {
      const wx = -w / 2 + 2 + i * 4;
      b.box(1.6, 1.1, 0.05, GLASS, wx, h * 0.66, d / 2 + 0.03);
      b.box(1.6, 1.1, 0.05, GLASS, wx, h * 0.66, -d / 2 - 0.03);
    }
    b.box(2.4, 2.6, 0.08, METAL_DARK, 0, 1.3, d / 2 + 0.04);
    b.box(3.2, 0.1, 1.4, 0xc3c9ce, 0, 0.05, d / 2 + 0.7);
    this.registerBuilding(ctx, x, z, w, d, h, "factory");
  }

  private addSmokestack(ctx: ZoneContext, x: number, z: number, h: number, color: number): void {
    const b = ctx.props;
    b.setBase(x, 0, z);
    b.cyl(0.5, 0.72, h, 10, color, 0, h / 2, 0);
    b.cyl(0.6, 0.6, 0.12, 10, 0x5a3a2a, 0, h + 0.06, 0);
    b.cyl(0.56, 0.56, 0.07, 10, 0x3a3a3a, 0, h * 0.6, 0);
    ctx.colliders.push(aabb(x, z, 1.2, 1.2, h));
  }

  private addSilo(ctx: ZoneContext, x: number, z: number, h: number, color: number): void {
    const b = ctx.props;
    b.setBase(x, 0, z);
    b.cyl(0.8, 0.8, h, 12, color, 0, h / 2, 0);
    b.cyl(0.85, 0.85, 0.1, 12, 0x8b9298, 0, h + 0.05, 0);
    ctx.colliders.push(aabb(x, z, 1.6, 1.6, h));
    ctx.map.building("factory", x - 0.8, x + 0.8, z - 0.8, z + 0.8);
  }

  /**
   * Esquina ACHAFLANADA estilo Eixample: edificio girado 45° que corta la
   * esquina de la manzana (cara diagonal hacia el cruce).
   */
  private buildChamferCorners(ctx: ZoneContext): void {
    // Esquinas ACHAFLANADAS en la esquina real de la manzana (fuera de calles
    // y aceras): giradas 45° para cortar la esquina, como en el Eixample.
    const corners: Array<[number, number, number, number, string]> = [
      [179, -11, Math.PI / 4, BRICK, "tornillos"],
      [150, 59, (3 * Math.PI) / 4, FACTORY_ALT, "lavanderia"],
      [218, 83, (5 * Math.PI) / 4, FACTORY, "cafe"],
      [150, -49, (7 * Math.PI) / 4, BRICK, "peluqueria"],
    ];
    for (const [x, z, rot, color, sign] of corners) this.addChamferCorner(ctx, x, z, 6.5, 6.5, rot, color, sign);
  }

  private addChamferCorner(
    ctx: ZoneContext,
    x: number,
    z: number,
    size: number,
    h: number,
    rotY: number,
    color: number,
    signKey: string
  ): void {
    const b = ctx.props;
    b.setBase(x, 0, z, rotY);
    b.box(size, h, size, color, 0, h / 2, 0);
    b.box(size + 0.14, 0.18, size + 0.14, METAL_DARK, 0, h + 0.09, 0);
    for (let i = -1; i <= 1; i++) {
      b.box(0.5, 0.6, 0.04, GLASS, i * 0.6, h * 0.6, size / 2 + 0.02);
      b.box(0.04, 0.6, 0.5, GLASS, size / 2 + 0.02, h * 0.6, i * 0.6);
    }
    b.box(size * 0.6, 0.07, 0.3, METAL_DARK, 0, 2.7, size / 2 + 0.18);
    const c = Math.abs(Math.cos(rotY));
    const s = Math.abs(Math.sin(rotY));
    ctx.colliders.push(rotatedAabb(x, z, size, size, rotY, h));
    const ex = (c * size + s * size) / 2;
    const ez = (s * size + c * size) / 2;
    ctx.map.building("factory", x - ex, x + ex, z - ez, z + ez);
    const [sx, sz] = localToWorld(x, z, rotY, 0, size / 2 + 0.26);
    ctx.signs.add(sx, h - 0.45, sz, rotY, size * 0.7, size * 0.16, SIGN_UV[signKey]);
  }

  private registerBuilding(
    ctx: ZoneContext,
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    kind: MapBuildingKind
  ): void {
    ctx.colliders.push(aabb(x, z, w, d, h));
    ctx.map.building(kind, x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }
}
