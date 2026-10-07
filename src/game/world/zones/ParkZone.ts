import * as THREE from "three";
import { aabb } from "../colliders";
import { addBench, addBin, addBush, addLamp } from "../Props";
import { addBollards, addGasOilBillboard, addRoadBlock, addWall } from "../cityProps";
import { addGasOilMachine } from "../../gasoil/GasOilMachine";
import { SIGN_UV } from "../signs";
import { createRng, randRange } from "../../utils/random";
import { addStatueFountain, addWater } from "./common";
import type { Rect, Zone, ZoneContext } from "./Zone";

const POND = { x: -60, z: -152, r: 9 };
const PLAY: Rect = { minX: 45, maxX: 75, minZ: -165, maxZ: -135 };

/** Parque Bolt: estatua dorada, estanque, zona infantil y acceso a la Zona Norte. */
export class ParkZone implements Zone {
  readonly id = "park";
  readonly name = "Parque Bolt";
  readonly bounds: Rect = { minX: -121, maxX: 121, minZ: -178, maxZ: -104 };

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.map.area("park", -121, 121, -178, -104);

    // Caminos y plaza de la estatua
    ctx.ground.rect("pavement", -2.5, 2.5, -176, -104);
    ctx.ground.rect("pavement", -100, 100, -142.5, -137.5);
    ctx.ground.circle("plaza", 0, -140, 13);
    ctx.map.area("pavement", -2.5, 2.5, -176, -104);
    ctx.map.area("pavement", -100, 100, -142.5, -137.5);
    ctx.map.circle("plaza", 0, -140, 13);
    addStatueFountain(ctx, 0, -140);

    // Arco de entrada
    for (const x of [-4.2, 4.2]) {
      b.setBase(x, 0, -105);
      b.box(0.9, 5, 0.9, 0x2e7d4f, 0, 2.5, 0);
      c.push(aabb(x, -105, 0.9, 0.9, 5));
    }
    b.setBase(0, 0, -105);
    b.box(9.6, 1.6, 0.3, 0x2e7d4f, 0, 5.2, 0);
    ctx.signs.addDouble(0, 5.2, -105, 0, 8.6, 1.4, SIGN_UV.park);

    // Estanque
    b.setBase(POND.x, 0, POND.z);
    b.cyl(POND.r + 0.5, POND.r + 0.6, 0.35, 36, 0xcbbfa7, 0, 0.17, 0);
    const water = new THREE.CircleGeometry(POND.r, 36);
    water.rotateX(-Math.PI / 2);
    water.translate(POND.x, 0, POND.z);
    addWater(ctx, water, 0.36, 3);
    c.push(aabb(POND.x, POND.z, POND.r * 1.75, POND.r * 1.75, 0.4));
    ctx.map.circle("water", POND.x, POND.z, POND.r);

    // Zona infantil
    ctx.ground.rect("sand", PLAY.minX, PLAY.maxX, PLAY.minZ, PLAY.maxZ);
    ctx.map.area("sand", PLAY.minX, PLAY.maxX, PLAY.minZ, PLAY.maxZ);
    this.buildPlayground(ctx);

    // Árboles repartidos evitando caminos, estanque y zona infantil
    const rng = createRng(4242);
    let placed = 0;
    for (let i = 0; i < 160 && placed < 34; i++) {
      const x = randRange(rng, -115, 115);
      const z = randRange(rng, -172, -110);
      if (Math.abs(x) < 6 || Math.abs(z + 140) < 5) continue;
      if (Math.hypot(x, z + 140) < 16) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 4) continue;
      if (x > PLAY.minX - 3 && x < PLAY.maxX + 3 && z > PLAY.minZ - 3 && z < PLAY.maxZ + 3) continue;
      ctx.trees.add(c, x, z, randRange(rng, 1.0, 1.45));
      placed++;
    }
    for (let i = 0; i < 18; i++) {
      const x = randRange(rng, -110, 110);
      const z = randRange(rng, -170, -112);
      if (Math.abs(x) < 5 || Math.abs(z + 140) < 4 || Math.hypot(x, z + 140) < 15) continue;
      addBush(b, x, z, randRange(rng, 0.5, 0.9));
    }

    // Bancos, farolas, papeleras
    for (const z of [-118, -128, -154, -164]) {
      addBench(b, c, -4.6, z, Math.PI / 2);
      addLamp(b, c, 4.4, z + 4, -Math.PI / 2);
    }
    for (const x of [-80, -40, 30, 80]) {
      addBench(b, c, x, -144.6, 0);
      addLamp(b, c, x + 6, -135.6, Math.PI);
    }
    addBin(b, c, 4.5, -125);
    addBin(b, c, -20, -144.5);

    addGasOilMachine(ctx, { id: "machine_park", name: "Máquina GASIL · Parque", x: 4.4, z: -112, rotY: -Math.PI / 2 });
    addGasOilBillboard(ctx, -24, -107.5, 0, 2, 0);

    // Borde peatonal: bolardos en todo el frente del parque (el coche se queda fuera)
    // (dos tramos: el camino central x = 0 queda libre entre bolardos)
    addBollards(b, c, -120.5, -104.7, -1.0, -104.7, 1.75);
    addBollards(b, c, 1.0, -104.7, 120.5, -104.7, 1.75);

    // Acceso norte (futura zona)
    addWall(b, null, -121, -177, -5, -177, 0xd8ccb4, 1.4);
    addWall(b, null, 5, -177, 121, -177, 0xd8ccb4, 1.4);
    addRoadBlock(ctx, 0, -175.5, 7, 0, "north");

    ctx.pois.define("park", "Parque Bolt", "PARK", 0, -124);
    ctx.pois.define("exit_north", "Zona Norte (próximamente)", "EXIT", 0, -173);
    ctx.map.label("PARQUE BOLT", 0, -160);
  }

  private buildPlayground(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Tobogán
    b.setBase(52, 0, -150);
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]] as Array<[number, number]>) {
      b.box(0.15, 2.4, 0.15, 0xd8322b, x, 1.2, z);
    }
    b.box(1.9, 0.15, 1.9, 0x2f6fb3, 0, 2.4, 0);
    b.box(1.2, 0.1, 4.2, 0xf2c21c, 0, 1.3, 2.9, -0.55, 0, 0);
    c.push(aabb(52, -148.5, 2.2, 5.5, 2.4));
    // Columpios
    b.setBase(66, 0, -150);
    b.box(0.15, 2.8, 0.15, 0x2e9a42, -2.5, 1.4, -0.9);
    b.box(0.15, 2.8, 0.15, 0x2e9a42, -2.5, 1.4, 0.9);
    b.box(0.15, 2.8, 0.15, 0x2e9a42, 2.5, 1.4, -0.9);
    b.box(0.15, 2.8, 0.15, 0x2e9a42, 2.5, 1.4, 0.9);
    b.box(5.2, 0.15, 0.15, 0x2e9a42, 0, 2.8, 0);
    for (const x of [-1.1, 1.1]) {
      b.box(0.04, 2.1, 0.04, 0x7b848d, x - 0.3, 1.75, 0);
      b.box(0.04, 2.1, 0.04, 0x7b848d, x + 0.3, 1.75, 0);
      b.box(0.8, 0.08, 0.35, 0xd8322b, x, 0.7, 0);
    }
    c.push(aabb(63.5, -150, 0.4, 2, 2.8));
    c.push(aabb(68.5, -150, 0.4, 2, 2.8));
    // Balancín
    b.setBase(60, 0, -141);
    b.box(0.5, 0.6, 0.5, 0x7b848d, 0, 0.3, 0);
    b.box(4.2, 0.12, 0.35, 0xf2c21c, 0, 0.65, 0, 0, 0, 0.12);
    c.push(aabb(60, -141, 4.2, 0.6, 0.8));
  }
}
