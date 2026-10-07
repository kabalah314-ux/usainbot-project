import * as THREE from "three";
import { addBench, addBin, addCar, addCrate, addLamp, addPlanter } from "../Props";
import { addBollards, addDumpster, addParkingRow, addShopSign } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade } from "./common";
import type { Rect, Zone, ZoneContext } from "./Zone";

const CAR_COLORS = [0xd64545, 0x2f6fb3, 0xf2c21c, 0xf6f2ea, 0x2e9a42, 0x7d3c98, 0x1b1f26];

/**
 * Zona comercial: tiendas a pie de calle con callejones al oeste y
 * galería comercial con aparcamiento al este de la Av. Bolt.
 */
export class CommercialZone implements Zone {
  readonly id = "commercial";
  readonly name = "Zona Comercial";
  readonly bounds: Rect = { minX: -102, maxX: 102, minZ: -16, maxZ: 36 };

  build(ctx: ZoneContext): void {
    this.buildWest(ctx);
    this.buildEast(ctx);
  }

  private buildWest(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const north = new THREE.Vector3(0, 0, -1);
    addFacade(ctx, { x: -23.5, z: -5, w: 21, d: 20, h: 14, style: 0, front: north }, "shop");
    addFacade(ctx, { x: -54, z: -5, w: 24, d: 20, h: 10, style: 3, front: north }, "shop");
    addFacade(ctx, { x: -85, z: -5, w: 30, d: 20, h: 18, style: 6, front: north }, "shop");
    addFacade(ctx, { x: -23, z: 24, w: 22, d: 20, h: 11, style: 5, front: new THREE.Vector3(1, 0, 0) }, "shop");
    addFacade(ctx, { x: -80, z: 27, w: 40, d: 16, h: 9, style: 2, front: new THREE.Vector3(0, 0, -1) }, "shop");

    addShopSign(ctx, -23.5, 4.9, -15.3, Math.PI, "roboburger", 7);
    addShopSign(ctx, -12.7, 4.9, -5, Math.PI / 2, "roboburger", 7);
    addShopSign(ctx, -54, 4.9, -15.3, Math.PI, "pixelvideo", 7);
    addShopSign(ctx, -85, 4.9, -15.3, Math.PI, "super24", 8);
    addShopSign(ctx, -11.7, 4.9, 24, Math.PI / 2, "farmacia", 7);

    ctx.pois.define("shop_burger", "Robo-Burger", "SHOP", -23.5, -16.5);
    ctx.pois.define("shop_video", "Pixel Video", "SHOP", -54, -16.5);
    ctx.pois.define("shop_super", "Súper 24H", "SHOP", -85, -16.5);
    ctx.pois.define("shop_pharmacy", "Farmacia", "SHOP", -11, 24);

    // Callejón entre Robo-Burger y Pixel Video (8 m: se corre bien)
    ctx.ground.rect("asphalt", -42, -34, -15, 19);
    addDumpster(b, c, -40.8, -6, Math.PI / 2);
    addDumpster(b, c, -40.8, 2, Math.PI / 2, 0x2f6fb3);
    addCrate(b, c, -35.2, -9, 0.3);
    addCrate(b, c, -35.3, -7.9, -0.2, 0.7);

    // Callejón y pasaje peatonales: bolardos en los accesos (atajo solo a pie)
    addBollards(b, c, -41.6, -15.6, -34.4, -15.6, 1.45);
    addBollards(b, c, -10.9, 5.9, -10.9, 13.1, 1.45);

    // Plaza trasera del comercio + pasaje desde la avenida
    ctx.ground.rect("plaza", -60, -34, 7, 19);
    ctx.ground.rect("pavement", -34, -10.5, 5.5, 13.5);
    ctx.map.area("plaza", -60, -34, 7, 19);
    addBench(b, c, -47, 16.5, Math.PI);
    addBench(b, c, -54, 16.5, Math.PI);
    addPlanter(b, c, -50.5, 10);
    addBin(b, c, -43.5, 17);
    addLamp(b, c, -58, 9, Math.PI / 2);
    ctx.trees.add(c, -38, 17, 1.0);
  }

  private buildEast(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Aparcamiento (preparado para futuros vehículos)
    ctx.ground.rect("asphalt", 12, 100, -14, 14);
    ctx.map.area("parking", 12, 100, -14, 14);
    addParkingRow(b, 16, 96, -14, 5, 1);
    addParkingRow(b, 16, 96, 0, 5, 1);
    addParkingRow(b, 16, 96, 0, 5, -1);
    const slots: Array<[number, number, number]> = [
      [20.2, -11.5, 0], [34.2, -11.5, 0], [42.6, -11.5, 0], [70.6, -11.5, 0],
      [25.8, 2.5, Math.PI], [53.8, 2.5, 0], [62.2, -2.5, Math.PI], [87.4, -2.5, 0], [31.4, -2.5, 0],
    ];
    slots.forEach(([x, z, r], i) => addCar(b, c, x, z, r, CAR_COLORS[i % CAR_COLORS.length]));
    for (const x of [12.5, 99.5]) {
      for (const z of [-10, 4]) addPlanter(b, c, x, z);
    }

    // Galería comercial
    addFacade(ctx, { x: 60, z: 26, w: 80, d: 16, h: 7, style: 2, front: new THREE.Vector3(0, 0, -1) }, "shop");
    ctx.ground.rect("pavement", 18, 102, 14, 18);
    const signs: Array<[number, string]> = [
      [30, "tornillos"],
      [46, "lavanderia"],
      [76, "cafe"],
      [92, "peluqueria"],
    ];
    for (const [x, key] of signs) addShopSign(ctx, x, 4.3, 17.8, Math.PI, key, 6.5);
    ctx.pois.define("shop_mall", "Galería Comercial", "SHOP", 60, 16);
    ctx.pois.define("parking_mall", "Aparcamiento Galería", "PARKING", 54, -9);
    addGasOilMachine(ctx, { id: "machine_mall", name: "Máquina GASIL · Galería", x: 61, z: 17.4, rotY: Math.PI });
    for (const x of [24, 54, 84]) addBench(b, c, x, 15.6, Math.PI);
    addBin(b, c, 39, 15.5);
    addBin(b, c, 67, 15.5);
    addLamp(b, c, 14, -1, Math.PI / 2);
    addLamp(b, c, 98, -1, -Math.PI / 2);
  }
}
