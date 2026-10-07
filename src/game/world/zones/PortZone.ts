import * as THREE from "three";
import { addBin, addCar, addCone, addLamp, addPlanter } from "../Props";
import { addDumpster, addFence, addGasOilBillboard, addShopSign, addWall } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade, addWater } from "./common";
import { addContainer, addCrane, addVendingBox } from "./kit";
import type { Rect, Zone, ZoneContext } from "./Zone";

const N = new THREE.Vector3(0, 0, -1);

/** Colores de los contenedores marítimos (vivos, estilo PS2). */
const BOX = [0xd8322b, 0x2f6fb3, 0x2e9a42, 0xf2c21c, 0xff7a1a];

/**
 * EL PUERTO (este) — zona de servicio / industria ligera.
 * Muelle con agua al este, dos grúas, contenedores apilados, naves de carga,
 * camiones aparcados y su máquina GasOil. Coherente: es un puerto.
 */
export class PortZone implements Zone {
  readonly id = "puerto";
  readonly name = "El Puerto";
  readonly bounds: Rect = { minX: 235, maxX: 300, minZ: -95, maxZ: 115 };

  build(ctx: ZoneContext): void {
    this.buildWaterfront(ctx);
    this.buildWarehouses(ctx);
    this.buildYard(ctx);

    ctx.pois.define("muelle", "Muelle del Puerto", "SHOP", 282, 30);
    ctx.pois.define("naves", "Naves de carga", "SHOP", 268, -8);
    ctx.map.label("EL PUERTO", 267, 10);
    ctx.map.label("MUELLE DEL PUERTO", 282, 30);
  }

  /** Agua al este + embarcadero de madera + grúas sobre el muelle. */
  private buildWaterfront(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const sea = new THREE.PlaneGeometry(16, 214);
    sea.rotateX(-Math.PI / 2);
    sea.translate(293, 0, 10);
    addWater(ctx, sea, 0.02, 4);
    ctx.map.area("water", 285, 300, -97, 117);

    // Embarcadero de madera sobre el agua (se reutiliza el helper de suelo "wood")
    ctx.ground.rect("wood", 276, 292, 27, 33);
    addFence(b, c, 276, 27, 292, 27, 0x7b5a3a, 0.7);
    addFence(b, c, 276, 33, 292, 33, 0x7b5a3a, 0.7);

    // Grúas de descarga (una por muelle)
    addCrane(b, c, 272, 30, 0, 6.2);
    addCrane(b, c, 272, -34, 0, 5.4);
    // Muro del muelle hacia el agua (parapeto)
    addWall(b, null, 285, -95, 285, 115, 0xb9b4aa, 0.8);
  }

  /** Naves de carga y contenedores apilados. */
  private buildWarehouses(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Naves dentro de las manzanas (sin pisar calles ni aceras)
    this.warehouse(ctx, 268, -44, 10, 14, 7);
    this.warehouse(ctx, 268, -10, 10, 9, 6);
    this.warehouse(ctx, 218, 92, 10, 14, 6);
    // Contenedores apilados (dos torres)
    addContainer(b, c, 250, -34, 0, BOX[0]);
    addContainer(b, c, 250, -28, 0, BOX[1]);
    addContainer(b, c, 250, -34, 0, BOX[2]);
    addContainer(b, c, 258, -34, 0, BOX[3]);
    addContainer(b, c, 258, -28, 0, BOX[4]);
    addDumpster(b, c, 244, -34, 0, 0x5a636d);
    addFence(b, c, 232, -44, 268, -44, 0x8b9298, 1.6);
    addGasOilBillboard(ctx, 252, 8, 0, 1, 3, 0.9);
  }

  /** Aparcamiento de camiones + quiosco + máquina GasOil. */
  private buildYard(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("asphalt", 238, 282, 80, 92);
    ctx.map.area("parking", 238, 282, 80, 92);
    ctx.pois.define("parking_puerto", "Aparcamiento del Puerto", "PARKING", 260, 86);
    addCar(b, c, 246, 86, 0, 0x2f6fb3); // camión de reparto
    addCar(b, c, 254, 86, Math.PI, 0xf6f2ea);
    addCar(b, c, 262, 86, 0, 0xd8322b);

    // Quiosco / oficina del puerto
    addShopSign(ctx, 282, 3.4, 62, -Math.PI / 2, "gasshop", 6);
    addVendingBox(b, c, 284, 60, -Math.PI / 2, 0xff7a1a);
    addGasOilMachine(ctx, { id: "machine_puerto", name: "Máquina GasOil · Puerto", x: 286, z: 55, rotY: -Math.PI / 2 });

    addBin(b, c, 240, 86);
    addPlanter(b, c, 282, 42);
    addCone(b, 268, 42);
    addCone(b, 270, 42);
    addLamp(b, c, 234, 40, Math.PI / 2);
    addLamp(b, c, 283, 20, -Math.PI / 2);
  }

  /** Nave de carga con fachada del atlas (1 sola textura). */
  private warehouse(ctx: ZoneContext, x: number, z: number, w: number, d: number, h: number): void {
    addFacade(ctx, { x, z, w, d, h, style: 5, front: N }, "factory", false);
    ctx.colliders.push({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h, z + d / 2) });
    ctx.map.building("factory", x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }
}
