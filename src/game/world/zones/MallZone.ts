import * as THREE from "three";
import { aabb } from "../colliders";
import { addBench, addBin, addCar, addCone, addLamp, addPlanter } from "../Props";
import { addParkingRow, addShopSign, addBollards } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { addFacade } from "./common";
import { offRoad } from "../roads/roadUtil";
import type { Rect, Zone, ZoneContext } from "./Zone";

const N = new THREE.Vector3(0, 0, -1);

/** Solar del centro comercial (x 10..118, z 203..264). */
const LOT: Rect = { minX: 10, maxX: 118, minZ: 203, maxZ: 264 };
/** Galería comercial: caja grande al sur del solar (z 238..262). */
const MALL = { x: 70, z: 250, w: 84, d: 24, h: 10 };
/** Aparcamiento cubierto ENTRABLE con el coche (z 203..215, sin pisar Gran Vía). */
const GARAGE = { x: 70, z: 209, w: 84, d: 12 };
const GARAGE_H = 5;

/**
 * CENTRO COMERCIAL BOLT — la zona comercial grande del sur.
 *
 *   · Galería comercial de 84×24 m (fachadas, rótulos y puertas).
 *   · Aparcamiento cubierto de 84×12 m ENTRABLE CON EL COCHE: losa sobre
 *     pilares, entrada ancha por el sur (desde Gran Vía Sur) y plazas
 *     marcadas. El coche entra, aparca y sale; dentro solo hay pilares.
 *   · Explanada entre la calle y la galería: bancos, jardineras y GasOil.
 *   · Todo el mobiliario se ajusta fuera de la calzada (ver roadUtil).
 */
export class MallZone implements Zone {
  readonly id = "centro_comercial";
  readonly name = "Centro Comercial Bolt";
  readonly bounds: Rect = LOT;

  build(ctx: ZoneContext): void {
    this.buildMall(ctx);
    this.buildGarage(ctx);
    this.buildEsplanade(ctx);

    ctx.pois.define("centro_comercial", "Centro Comercial Bolt", "SHOP", MALL.x, MALL.z - 15);
    ctx.pois.define("parking_centro", "Aparcamiento del Centro", "PARKING", GARAGE.x, GARAGE.z);
    ctx.map.label("CENTRO COMERCIAL BOLT", 78, 250);
    ctx.map.label("APARCAMIENTO", 70, 209);
  }

  /** Galería comercial grande (1 sola caja + fachada del atlas). */
  private buildMall(ctx: ZoneContext): void {
    const b = ctx.props;
    addFacade(ctx, { x: MALL.x, z: MALL.z, w: MALL.w, d: MALL.d, h: MALL.h, style: 2, front: N }, "shop", false);
    for (const dx of [-24, 0, 24]) {
      b.setBase(MALL.x + dx, 0, MALL.z - MALL.d / 2 - 0.1);
      b.box(6, 3.2, 0.2, 0x2f353c, 0, 1.6, 0);
      b.box(7, 0.16, 2.2, 0xff7a1a, 0, 3.35, 0.9, 0.2, 0, 0);
    }
    addShopSign(ctx, MALL.x, 7.4, MALL.z - MALL.d / 2 - 0.2, Math.PI, "gasshop", 12);
    addShopSign(ctx, MALL.x, 7.4, MALL.z + MALL.d / 2 + 0.2, 0, "pixelvideo", 12);
    const sign = createRoofSign();
    sign.position.set(MALL.x, MALL.h + 1.3, MALL.z + 2);
    ctx.group.add(sign);
  }

  /**
   * Aparcamiento cubierto ENTRABLE: losa sobre pilares con hueco de entrada
   * en el lado sur (hacia Gran Vía Sur). El coche entra por debajo y aparca.
   */
  private buildGarage(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const w = GARAGE.w;
    const d = GARAGE.d;
    ctx.ground.rect("asphalt", GARAGE.x - w / 2, GARAGE.x + w / 2, GARAGE.z - d / 2, GARAGE.z + d / 2);
    // Acceso rodado desde Gran Vía Sur (cruza la acera por el hueco de entrada)
    ctx.ground.rect("asphalt", 62, 78, 214, 232);
    ctx.map.area("parking", GARAGE.x - w / 2, GARAGE.x + w / 2, GARAGE.z - d / 2, GARAGE.z + d / 2);

    b.setBase(GARAGE.x, 0, GARAGE.z);
    b.box(w, 0.3, d, 0xc3c9ce, 0, GARAGE_H, 0);
    b.box(w + 0.3, 0.14, d + 0.3, 0x8b9298, 0, GARAGE_H + 0.18, 0);

    // Pilares perimetrales (hueco de entrada entre x=58 y x=82 en el lado sur)
    const pxs = [-40, -32, -24, -16, -8, 0, 8, 16, 24, 32, 40];
    for (const px of pxs) {
      for (const pz of [-5.4, 5.4]) {
        const wx = GARAGE.x + px;
        const wz = GARAGE.z + pz;
        if (pz > 0 && wx > 56 && wx < 84) continue;
        b.setBase(wx, 0, wz);
        b.box(0.45, GARAGE_H, 0.45, 0x59626d, 0, GARAGE_H / 2, 0);
        b.box(0.6, 0.1, 0.6, 0x2f353c, 0, 0.05, 0);
        c.push(aabb(wx, wz, 0.55, 0.55, GARAGE_H));
      }
    }
    // Barrera de entrada (levantada: 0 colisión, solo visual)
    b.setBase(70, 0, 215.5);
    b.box(0.2, 1.1, 0.2, 0x2f353c, -2.4, 0.55, 0);
    b.box(0.2, 1.1, 0.2, 0x2f353c, 2.4, 0.55, 0);
    b.box(4.6, 0.1, 0.08, 0xf2c21c, 0, 1.1, 0, 0, 0, 0.5);

    addParkingRow(b, 30, 110, 205.5, 4.5, 1);
    addCar(b, c, 42, 205.5, 0, 0x2f6fb3);
    addCar(b, c, 58, 205.5, 0, 0xf6f2ea);
    addCar(b, c, 92, 212.5, Math.PI, 0xd8322b);
    addCone(b, 33, 211);
    addCone(b, 33, 213);
    b.setBase(88, 0, 215.5);
    b.cyl(0.06, 0.08, 3.0, 8, 0x2f353c, 0, 1.5, 0);
    b.box(1.8, 0.7, 0.08, 0x2f6fb3, 0, 2.6, 0);
  }

  /** Explanada entre Gran Vía Sur y la galería: mobiliario fuera de la calzada. */
  private buildEsplanade(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("pavement", 12, 116, 234, 238);
    addGasOilMachine(ctx, { id: "machine_centro_comercial", name: "Máquina GasOil · Centro Comercial", x: 24, z: 236, rotY: 0 });
    for (const x of [36, 48, 92, 104]) {
      const [px, pz] = offRoad(x, 236);
      addBench(b, c, px, pz, 0);
    }
    for (const x of [42, 98]) {
      const [px, pz] = offRoad(x, 236);
      addBin(b, c, px, pz);
    }
    const [lx1, lz1] = offRoad(30, 236);
    addPlanter(b, c, lx1, lz1);
    const [lx2, lz2] = offRoad(110, 236);
    addPlanter(b, c, lx2, lz2);
    const [l1x, l1z] = offRoad(28, 236);
    addLamp(b, c, l1x, l1z, Math.PI);
    const [l2x, l2z] = offRoad(112, 236);
    addLamp(b, c, l2x, l2z, Math.PI);
    addBollards(b, c, 12, 236, 12, 238, 1.3);
  }
}

/** Letrero de azotea del centro comercial (texto + pilares). */
function createRoofSign(): THREE.Group {
  const group = new THREE.Group();
  const face = createRoofTexture();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(9, 2.4, 0.25),
    [toonDark(), toonDark(), toonDark(), toonDark(), new THREE.MeshBasicMaterial({ map: face }), new THREE.MeshBasicMaterial({ map: face })]
  );
  board.castShadow = true;
  group.add(board);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), toonDark());
  leg.position.set(-3.6, -1.7, 0);
  const leg2 = leg.clone();
  leg2.position.x = 3.6;
  group.add(leg, leg2);
  return group;
}

function toonDark(): THREE.Material {
  return new THREE.MeshLambertMaterial({ color: 0x2f353c });
}

function createRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#12324a";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 120);
    ctx.fillStyle = "#ffd23f";
    ctx.font = "italic 900 52px Impact, Arial Black, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CENTRO BOLT", 256, 52);
    ctx.fillStyle = "#6fe7ff";
    ctx.font = "900 22px Arial, sans-serif";
    ctx.fillText("SHOPPING · PARKING · GASOIL", 256, 98);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
