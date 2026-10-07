import * as THREE from "three";
import { addHouse } from "../buildings/houses";
import type { HouseSpec } from "../buildings/houses";
import { addBench, addBin, addLamp } from "../Props";
import { addBollards, addGasOilBillboard, addHedge } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { SIGN_UV } from "../signs";
import { addFacade } from "./common";
import type { Rect, Zone, ZoneContext } from "./Zone";

/**
 * Zona residencial: viviendas unifamiliares al norte y al sureste,
 * bloques de pisos con plaza vecinal y cancha junto a la Calle Gasolina.
 */
export class ResidentialZone implements Zone {
  readonly id = "residential";
  readonly name = "Barrio Residencial";
  readonly bounds: Rect = { minX: -102, maxX: 118, minZ: -86, maxZ: 203 };

  build(ctx: ZoneContext): void {
    const houses: HouseSpec[] = [];
    // Manzanas norte (entre C. del Parque y C. Comercio), a ambos lados de la avenida
    const xs = [24, 44, 64, 86];
    xs.forEach((x, i) => {
      for (const side of [-1, 1]) {
        houses.push({ x: side * x, z: -75, facing: "n", style: i * 2 + (side > 0 ? 1 : 0), floors: i % 2 ? 2 : 1 });
        houses.push({ x: side * x, z: -45, facing: "s", style: i * 2 + (side > 0 ? 0 : 1) + 3, floors: i % 2 ? 1 : 2 });
      }
    });
    // Sureste: fila frente a la C. Residencial y fila junto al paseo peatonal
    [24, 44, 64, 86, 106].forEach((x, i) => {
      houses.push({ x, z: 135, facing: "n", style: i + 2, floors: i % 2 ? 2 : 1 });
      if (i < 4) houses.push({ x: x + 10, z: 166, facing: "n", style: i + 4, floors: i % 2 ? 1 : 2 });
    });
    houses.forEach((h) => addHouse(ctx, h));

    // Paseo peatonal (atajo entre filas) y setos traseros
    ctx.ground.rect("pavement", 12, 118, 150.5, 154.5);
    ctx.map.area("pavement", 12, 118, 150.5, 154.5);
    // Setos traseros; hueco peatonal en x≈-34 (atajo a pie entre las casas)
    addHedge(ctx.props, ctx.colliders, 16, -60.5, 96, -60.5, 1.4);
    addHedge(ctx.props, ctx.colliders, -16, -60.5, -33.2, -60.5, 1.4);
    addHedge(ctx.props, ctx.colliders, -34.8, -60.5, -96, -60.5, 1.4);
    // Paseo peatonal: bolardos en su entrada desde la avenida
    addBollards(ctx.props, ctx.colliders, 12.3, 150.6, 12.3, 154.4, 1.27);
    const rng = [
      [-37.5, -66.5], [-54, -56], [-76, -64], [34, -56], [55, -65], [76, -56],
      [96, -65], [-96, -56], [30, 188], [60, 190], [95, 186], [16, 142],
    ];
    for (const [x, z] of rng) ctx.trees.add(ctx.colliders, x, z, 1.05);

    this.buildApartments(ctx);
  }

  private buildApartments(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const north = new THREE.Vector3(0, 0, -1);
    addFacade(ctx, { x: -26, z: 64.5, w: 28, d: 20, h: 22, style: 1, front: north }, "apartment");
    addFacade(ctx, { x: -62, z: 64.5, w: 28, d: 20, h: 16, style: 4, front: north }, "apartment");
    addFacade(ctx, { x: -92, z: 74, w: 18, d: 38, h: 26, style: 7, front: new THREE.Vector3(1, 0, 0) }, "apartment", false);

    // Plaza vecinal
    ctx.ground.rect("plaza", -38, -10.5, 78, 105.5);
    ctx.map.area("plaza", -38, -10.5, 78, 105.5);
    for (const z of [84, 97]) addBench(b, c, -34, z, Math.PI / 2);
    addBin(b, c, -34.5, 90.5);
    addLamp(b, c, -24, 80, 0);
    addLamp(b, c, -24, 103, Math.PI);
    for (const [x, z] of [[-30, 88], [-18, 83], [-30, 101]] as Array<[number, number]>) ctx.trees.add(c, x, z, 1.1);
    addGasOilMachine(ctx, { id: "machine_plaza", name: "Máquina GasOil · Plaza Vecinal", x: -12.2, z: 92, rotY: Math.PI / 2 });
    addGasOilBillboard(ctx, -20, 100.5, Math.PI / 2, 1, 2);

    // Cancha vecinal
    const C: Rect = { minX: -64, maxX: -42, minZ: 80, maxZ: 104 };
    ctx.ground.rect("asphalt", C.minX, C.maxX, C.minZ, C.maxZ);
    ctx.map.area("court", C.minX, C.maxX, C.minZ, C.maxZ);
    b.setBase((C.minX + C.maxX) / 2, 0.03, (C.minZ + C.maxZ) / 2);
    b.box(C.maxX - C.minX - 1, 0.02, 0.12, 0xf1eee6, 0, 0, 0);
    b.box(0.12, 0.02, C.maxZ - C.minZ - 1, 0xf1eee6, (C.maxX - C.minX) / 2 - 0.5, 0, 0);
    b.box(0.12, 0.02, C.maxZ - C.minZ - 1, 0xf1eee6, -(C.maxX - C.minX) / 2 + 0.5, 0, 0);
    b.cyl(3, 3, 0.02, 24, 0xf1eee6, 0, 0.005, 0, 0, 0, 0, true);
    for (const z of [C.minZ + 1, C.maxZ - 1]) {
      const dir = z < 90 ? 1 : -1;
      b.setBase(-53, 0, z);
      b.box(0.2, 3.2, 0.2, 0x2f353c, 0, 1.6, 0);
      b.box(1.8, 1.1, 0.1, 0xf6f2ea, 0, 3.2, dir * 0.3);
      b.cyl(0.35, 0.35, 0.05, 12, 0xff7a1a, 0, 2.9, dir * 0.75, 0, 0, 0, true);
      c.push({ min: new THREE.Vector3(-53.3, 0, z - 0.3), max: new THREE.Vector3(-52.7, 3.2, z + 0.3) });
    }
    ctx.signs.add(-53, 1.4, C.maxZ + 0.45, 0, 4.4, 1.1, SIGN_UV.court);
    b.setBase(-53, 0, C.maxZ + 0.35);
    b.box(4.6, 1.3, 0.12, 0x2f353c, 0, 1.4, -0.1);
  }
}
