import * as THREE from "three";
import { addBench, addBin, addCar, addLamp, addPlanter } from "../Props";
import { addGasOilBillboard, addShopSign, addWall } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade, addWater } from "./common";
import { addBeachHut, addPalm, addUmbrella } from "./kit";
import type { Rect, Zone, ZoneContext } from "./Zone";

const SAND_COLS = [0xd8322b, 0x2f6fb3, 0xf2c21c, 0x2e9a42];
const PARASOLS = [0xff7a1a, 0xef7db5, 0x2f6fb3, 0x2e9a42, 0xf2c21c, 0xd8322b];

/**
 * LA PLAYA (norte) — zona de ocio costera.
 * Arena, mar al norte, palmeras, sombrillas, casetas de baño, chiringuito con
 * terraza, embarcadero de madera y su máquina GasOil (el GasOil llega hasta la
 * orilla). Coherente: es la playa del barrio.
 */
export class BeachZone implements Zone {
  readonly id = "playa";
  readonly name = "La Playa";
  readonly bounds: Rect = { minX: -185, maxX: 282, minZ: -243, maxZ: -178 };

  build(ctx: ZoneContext): void {
    this.buildShore(ctx);
    this.buildSand(ctx);
    this.buildBoardwalk(ctx);

    ctx.pois.define("playa_bolt", "Playa de Bolt", "PARK", 40, -228);
    ctx.pois.define("chiringuito", "Chiringuito La Gaseosa", "SHOP", -60, -186);
    ctx.map.label("LA PLAYA", 48, -210);
    ctx.map.label("PLAYA DE BOLT", 40, -228);
  }

  /** Arena + mar al norte (más allá del parapeto del paseo). */
  private buildShore(ctx: ZoneContext): void {
    ctx.ground.rect("sand", -185, 282, -243, -215);
    ctx.map.area("sand", -185, 282, -243, -215);
    const sea = new THREE.PlaneGeometry(470, 30);
    sea.rotateX(-Math.PI / 2);
    sea.translate(48, 0, -258);
    addWater(ctx, sea, 0.02, 6);
    ctx.map.area("water", -185, 282, -273, -243);
    // Parapeto bajo del paseo hacia la arena
    addWall(ctx.props, null, -185, -243.4, 282, -243.4, 0xe6ddcb, 0.7);
  }

  /** Sombrillas, palmeras y casetas de baño sobre la arena. */
  private buildSand(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Dos filas de sombrillas
    for (let i = 0; i < 8; i++) {
      addUmbrella(b, c, -150 + i * 13, -222, i * 0.4, PARASOLS[i % PARASOLS.length]);
      if (i % 2 === 0) addUmbrella(b, c, -150 + i * 13, -232, i * 0.3, PARASOLS[(i + 3) % PARASOLS.length]);
    }
    // Palmeras (un grupo cada ~60 m)
    for (const x of [-160, -100, -40, 20, 80, 140]) addPalm(b, c, x, -212, x * 0.13, 1.1);
    for (const x of [-130, -70, -10, 50, 110]) addPalm(b, c, x, -238, x * 0.07, 0.95);

    // Casetas de baño (colores vivos)
    addBeachHut(b, c, -128, -236, 0, SAND_COLS[0]);
    addBeachHut(b, c, -122, -236, 0, SAND_COLS[1]);
    addBeachHut(b, c, 62, -236, 0, SAND_COLS[2]);

    // Embarcadero de madera hacia el mar
    ctx.ground.rect("wood", 36, 44, -243, -232);
    addWall(ctx.props, null, 36, -243, 36, -232, 0x7b5a3a, 0.7);
    addWall(ctx.props, null, 44, -243, 44, -232, 0x7b5a3a, 0.7);
  }

  /** Paseo marítimo: chiringuito, bancos, palmeras y máquina GasOil. */
  private buildBoardwalk(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("pavement", -185, 282, -215, -206);
    ctx.map.area("pavement", -185, 282, -215, -206);

    // Chiringuito con terraza (fachada del atlas)
    addFacade(ctx, { x: -60, z: -186, w: 14, d: 10, h: 5, style: 2, front: new THREE.Vector3(0, 0, -1) }, "shop", false);
    addShopSign(ctx, -60, 4.4, -191.4, Math.PI, "gasshop", 7);
    addBench(b, c, -66, -208, 0);
    addBench(b, c, -54, -208, 0);
    addBin(b, c, -70, -208);
    addPlanter(b, c, -48, -208);

    // Punto de información + máquina GasOil (el chiste de la casa)
    addGasOilMachine(ctx, { id: "machine_playa", name: "Máquina GasOil · La Playa", x: 40, z: -208, rotY: 0 });
    addGasOilBillboard(ctx, 96, -208, 0, 2, 0, 0.85);
    addLamp(b, c, -20, -207, 0);
    addLamp(b, c, 100, -207, 0);
    addCar(b, c, -96, -203, 0, 0xf2c21c);
  }
}
