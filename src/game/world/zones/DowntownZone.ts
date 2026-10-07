import * as THREE from "three";
import { addBench, addBin, addCar, addLamp, addPlanter } from "../Props";
import { addHouse } from "../buildings/houses";
import { addParkingRow, addShopSign } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade, addWater } from "./common";
import type { BuildingSpec } from "../buildings";
import type { Rect, Zone, ZoneContext } from "./Zone";

const N = new THREE.Vector3(0, 0, -1);
const S = new THREE.Vector3(0, 0, 1);

const HEIGHTS = [32, 26, 38, 22, 29, 24];
const SIGNS = ["roboburger", "pixelvideo", "farmacia", "lavanderia", "cafe", "peluqueria"] as const;

/**
 * CENTRO / DOWNTOWN (sur) — tejido urbano del flanco oeste del sur.
 * Torres de oficinas y viviendas con comercios a pie de Gran Vía Sur,
 * casa en las manzanas libres, plaza central con fuente y su máquina GasOil.
 * El flanco este del sur lo ocupa el Centro Comercial Bolt (ver MallZone).
 */
export class DowntownZone implements Zone {
  readonly id = "centro";
  readonly name = "Centro / Downtown";
  readonly bounds: Rect = { minX: -185, maxX: 0, minZ: 203, maxZ: 264 };

  build(ctx: ZoneContext): void {
    this.buildTowers(ctx);
    this.buildHomes(ctx);
    this.buildSquare(ctx);

    ctx.pois.define("plaza_central", "Plaza Central", "PARK", -41, 240);
    ctx.map.label("CENTRO / DOWNTOWN", -80, 226);
  }

  /** Torres del flanco oeste: todas dentro de las manzanas. */
  private buildTowers(ctx: ZoneContext): void {
    const towers: BuildingSpec[] = [
      { x: -140, z: 214, w: 14, d: 12, h: HEIGHTS[0], style: 1, front: S },
      { x: -110, z: 214, w: 14, d: 12, h: HEIGHTS[1], style: 4, front: S },
      { x: -78, z: 214, w: 13, d: 12, h: HEIGHTS[2], style: 7, front: S },
      { x: -140, z: 250, w: 14, d: 13, h: HEIGHTS[5], style: 3, front: N },
      { x: -110, z: 250, w: 14, d: 13, h: HEIGHTS[1], style: 6, front: N },
      { x: -78, z: 250, w: 13, d: 13, h: HEIGHTS[4], style: 0, front: N },
    ];
    towers.forEach((t) => addFacade(ctx, t, "apartment"));
    SIGNS.forEach((key, i) => {
      const x = -152 + i * 26;
      addShopSign(ctx, x, 3.6, 225.3, 0, key, 7);
      ctx.pois.define(`shop_centro_${i}`, key.toUpperCase(), "SHOP", x, 222);
    });
    addParkingRow(ctx.props, -150, -64, 240, 5, 1);
    addCar(ctx.props, ctx.colliders, -136, 242.5, 0, 0x2f6fb3);
    addCar(ctx.props, ctx.colliders, -128, 242.5, 0, 0xf6f2ea);
    addCar(ctx.props, ctx.colliders, -120, 242.5, 0, 0xd8322b);
  }

  /** Viviendas en las manzanas libres (huecos hasta ahora vacíos). */
  private buildHomes(ctx: ZoneContext): void {
    // Manzana x -47.5..-10 (entre C. Central y Av. Bolt), z 203..216
    for (let i = 0; i < 4; i++) {
      addHouse(ctx, { x: -43 + i * 8.4, z: 210, facing: "s", style: i, floors: 2, w: 6, d: 8, yard: 2 });
    }
    // Franja sur (z 257.5..264)
    for (let i = 0; i < 7; i++) {
      addHouse(ctx, { x: -172 + i * 8.4, z: 261, facing: "s", style: i + 4, floors: 1, w: 6, d: 5, yard: 1.4 });
    }
    for (let i = 0; i < 3; i++) {
      addHouse(ctx, { x: -43 + i * 8.4, z: 261, facing: "s", style: i + 2, floors: 1, w: 6, d: 5, yard: 1.4 });
    }
    // Manzana x -47.5..-10, z 234..242.5
    for (let i = 0; i < 4; i++) {
      addHouse(ctx, { x: -43 + i * 8.4, z: 238, facing: "s", style: i + 5, floors: 1, w: 6, d: 5, yard: 1.4 });
    }
  }

  /** Plaza Central con fuente, banco y su máquina GasOil. */
  private buildSquare(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("plaza", -52, -30, 234, 252);
    ctx.map.area("plaza", -52, -30, 234, 252);

    b.setBase(-41, 0, 243);
    b.cyl(1.5, 1.6, 0.5, 24, 0xdccfb6, 0, 0.25, 0);
    b.cyl(0.5, 0.6, 0.9, 16, 0xb9ab92, 0, 0.6, 0);
    const pool = new THREE.CircleGeometry(1.35, 24);
    pool.rotateX(-Math.PI / 2);
    pool.translate(-41, 0, 243);
    addWater(ctx, pool, 0.42);
    c.push({ min: new THREE.Vector3(-42.6, 0, 241.4), max: new THREE.Vector3(-39.4, 1.2, 244.6) });

    for (const [x, z] of [[-49, 238], [-33, 238], [-49, 248], [-33, 248]] as Array<[number, number]>) {
      ctx.trees.add(c, x, z, 1.2);
    }
    addBench(b, c, -45, 243, Math.PI / 2);
    addBench(b, c, -37, 243, -Math.PI / 2);
    addPlanter(b, c, -41, 234);
    addBin(b, c, -49, 243);
    addGasOilMachine(ctx, { id: "machine_centro", name: "Máquina GasOil · Centro", x: -31, z: 238, rotY: -Math.PI / 2 });
    addLamp(b, c, -28, 232, 0);
    addLamp(b, c, -28, 250, Math.PI);
  }
}
