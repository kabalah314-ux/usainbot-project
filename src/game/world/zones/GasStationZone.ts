import { aabb } from "../colliders";
import { addCar, addBin, addPlanter } from "../Props";
import { addDumpster, addGasOilBillboard, addParkingRow, addShopSign } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { GASOIL_UV } from "../../gasoil/branding";
import { GASOIL_BRAND } from "../../data/cityLayout";
import type { Rect, Zone, ZoneContext } from "./Zone";

const WHITE = 0xf6f2ea;
const ORANGE = GASOIL_BRAND.orange;
const DARK = GASOIL_BRAND.charcoal;

/**
 * Gasolinera GasOil Stop: marquesina con luces, surtidores, tienda,
 * máquinas de GasOil, tótem de precios y aparcamiento.
 * Punto clave del mapa (misiones de GasOil).
 */
export class GasStationZone implements Zone {
  readonly id = "gas_station";
  readonly name = "Gasolinera GasOil Stop";
  readonly bounds: Rect = { minX: 10, maxX: 102, minZ: 54, maxZ: 106 };

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("asphalt", 10, 102, 54, 106);
    ctx.map.area("parking", 10, 102, 54, 106);

    // Marquesina
    const cx = 38;
    const cz = 80;
    const cw = 32;
    const cd = 18;
    const ch = 5.8;
    b.setBase(cx, 0, cz);
    b.box(cw, 1.4, cd, WHITE, 0, ch + 0.7, 0);
    b.box(cw + 0.3, 0.3, cd + 0.3, ORANGE, 0, ch + 0.1, 0);
    b.box(cw + 0.3, 0.2, cd + 0.3, DARK, 0, ch + 1.45, 0);
    for (const [x, z] of [[-12, -6], [12, -6], [-12, 6], [12, 6]] as Array<[number, number]>) {
      b.cyl(0.45, 0.45, ch, 12, WHITE, x, ch / 2, z);
      b.cyl(0.55, 0.55, 1.0, 12, ORANGE, x, 0.5, z);
      c.push(aabb(cx + x, cz + z, 1.1, 1.1, ch));
    }
    for (const x of [-10, 0, 10]) {
      ctx.gasoil.add(cx + x, ch + 0.7, cz - cd / 2 - 0.02, Math.PI, 5.6, 1.4, GASOIL_UV.fascia);
      ctx.gasoil.add(cx + x, ch + 0.7, cz + cd / 2 + 0.02, 0, 5.6, 1.4, GASOIL_UV.fascia);
    }
    ctx.gasoil.add(cx - cw / 2 - 0.02, ch + 0.7, cz, -Math.PI / 2, 5.6, 1.4, GASOIL_UV.fascia);
    ctx.gasoil.add(cx + cw / 2 + 0.02, ch + 0.7, cz, Math.PI / 2, 5.6, 1.4, GASOIL_UV.fascia);
    for (const x of [-10, 0, 10]) {
      for (const z of [-4, 4]) ctx.gasoil.add(cx + x, ch - 0.06, cz + z, 0, 3.4, 1.5, GASOIL_UV.light, Math.PI / 2);
    }
    ctx.map.building("canopy", cx - cw / 2, cx + cw / 2, cz - cd / 2, cz + cd / 2);

    // Islas de surtidores
    for (const x of [30, 38, 46]) {
      b.setBase(x, 0, cz);
      b.box(1.8, 0.25, 7.4, 0xd9d2c3, 0, 0.12, 0);
      b.box(1.9, 0.08, 7.5, ORANGE, 0, 0.27, 0);
      for (const z of [-2.2, 2.2]) {
        b.box(0.9, 1.9, 0.7, WHITE, 0, 1.2, z);
        b.box(0.95, 0.3, 0.75, ORANGE, 0, 2.25, z);
        b.box(0.12, 1.0, 0.12, DARK, 0.52, 1.0, z + 0.2);
        ctx.gasoil.add(x + 0.46, 1.3, cz + z, Math.PI / 2, 0.6, 0.9, GASOIL_UV.pump);
        ctx.gasoil.add(x - 0.46, 1.3, cz + z, -Math.PI / 2, 0.6, 0.9, GASOIL_UV.pump);
      }
      c.push(aabb(x, cz, 1.9, 7.5, 2.3));
    }
    addCar(b, c, 42.5, 83.5, 0, 0x2f6fb3);
    addCar(b, c, 25.5, 76.5, Math.PI, 0xf6f2ea);

    // Tienda
    const shop: Rect = { minX: 64, maxX: 96, minZ: 58, maxZ: 78 };
    const sw = shop.maxX - shop.minX;
    const sd = shop.maxZ - shop.minZ;
    const scx = (shop.minX + shop.maxX) / 2;
    const scz = (shop.minZ + shop.maxZ) / 2;
    b.setBase(scx, 0, scz);
    b.box(sw, 5, sd, WHITE, 0, 2.5, 0);
    b.box(sw + 0.3, 0.9, sd + 0.3, ORANGE, 0, 4.7, 0);
    b.box(sw + 0.4, 0.2, sd + 0.4, DARK, 0, 5.2, 0);
    b.box(0.1, 2.6, 10, 0x8fc9e8, -sw / 2 - 0.02, 1.8, 2);
    b.box(0.12, 2.8, 2.4, DARK, -sw / 2 - 0.03, 1.4, 8);
    b.box(0.14, 2.4, 1.8, 0x8fc9e8, -sw / 2 - 0.04, 1.3, 8);
    c.push(aabb(scx, scz, sw, sd, 5));
    addShopSign(ctx, shop.minX - 0.25, 3.7, 70, -Math.PI / 2, "gasshop", 8);
    ctx.map.building("gas", shop.minX, shop.maxX, shop.minZ, shop.maxZ);
    addGasOilBillboard(ctx, 82, 70, -Math.PI / 2, 0, 3, 1.1, 5.3);

    // Máquinas GasOil junto a la entrada (la primera es el objetivo de la misión)
    addGasOilMachine(ctx, { id: "machine_station", name: "Máquina GASIL · Gasolinera", x: 63.4, z: 61.4, rotY: -Math.PI / 2 });
    addGasOilMachine(ctx, { id: "machine_station_b", name: "Máquina GASIL · Gasolinera (2)", x: 63.4, z: 63.9, rotY: -Math.PI / 2 });
    addBin(b, c, 63.2, 66.4);

    // Tótem de precios (visible desde la avenida)
    b.setBase(16, 0, 60);
    b.box(0.9, 4.2, 0.9, DARK, 0, 2.1, 0);
    b.box(3.4, 6.6, 0.5, DARK, 0, 7.2, 0);
    ctx.gasoil.add(16, 7.2, 59.73, Math.PI, 3.1, 6.2, GASOIL_UV.pylon);
    ctx.gasoil.add(16, 7.2, 60.27, 0, 3.1, 6.2, GASOIL_UV.pylon);
    c.push(aabb(16, 60, 1, 1, 4));

    // Aire/agua, neumáticos, contenedor y aparcamiento
    b.setBase(58, 0, 96);
    b.box(0.8, 1.5, 0.6, 0x2f6fb3, 0, 0.75, 0);
    b.box(0.85, 0.3, 0.65, WHITE, 0, 1.35, 0);
    c.push(aabb(58, 96, 0.8, 0.6, 1.5));
    for (let i = 0; i < 3; i++) b.cyl(0.45, 0.45, 0.3, 12, 0x1c1f24, 0, 0.15 + i * 0.32, 1.5);
    c.push(aabb(58, 97.5, 1, 1, 1));
    addDumpster(b, c, 99, 68, Math.PI / 2, 0x2f6fb3);
    addParkingRow(b, 70, 100, 105, 5, -1);
    addCar(b, c, 74.2, 102.4, 0, 0xd64545);
    addCar(b, c, 90.8, 102.4, Math.PI, 0x2e9a42);
    addPlanter(b, c, 12.5, 104);
    ctx.trees.add(c, 100, 88, 1.1);

    ctx.pois.define("gas_station", "Gasolinera GasOil Stop", "GAS_STATION", cx, cz);
    ctx.pois.define("parking_station", "Parking GasOil Stop", "PARKING", 85, 101);
    ctx.map.label("GASOIL STOP", 60, 96);
  }
}
