import { ROADS } from "../../data/cityLayout";
import type { RoadData } from "../../data/cityLayout";
import { addBin, addHydrant, addLamp } from "../Props";
import { addStreetSign } from "../cityProps";
import type { RoadNetwork } from "../roads/RoadNetwork";
import type { Rect, Zone, ZoneContext } from "./Zone";

const LAMP_SPACING = 26;

/**
 * Bocas de callejones, pasajes y accesos peatonales: aquí no se genera
 * mobiliario (antes una farola caía justo en la entrada del callejón).
 */
const KEEP_CLEAR: Rect[] = [
  { minX: -43, maxX: -33, minZ: -20, maxZ: -14 }, // callejón Robo-Burger
  { minX: -13, maxX: -8, minZ: 4, maxZ: 15 }, // pasaje a la avenida
  { minX: -4, maxX: 4, minZ: -106, maxZ: -99 }, // entrada central del parque
  { minX: -38, maxX: -30, minZ: -106, maxZ: -99 }, // paso al atajo entre casas
  { minX: -32, maxX: -18, minZ: 120, maxZ: 126 }, // entrada de coches de la mansión
  { minX: -64, maxX: -56, minZ: 120, maxZ: 126 }, // cancela peatonal de la mansión
  { minX: 10, maxX: 15, minZ: 149, maxZ: 156 }, // paseo peatonal
];

/**
 * Mobiliario ligado a la red viaria: farolas a lo largo de las aceras,
 * placas de calle en los cruces, papeleras e hidrantes. Se genera desde
 * los datos de ROADS, así una calle nueva trae su mobiliario automáticamente.
 */
export class StreetsZone implements Zone {
  readonly id = "streets";
  readonly name = "Calles";
  readonly bounds: Rect;
  private network: RoadNetwork;

  constructor(network: RoadNetwork, bounds: Rect) {
    this.network = network;
    this.bounds = bounds;
  }

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const nearJunction = (x: number, z: number, pad: number): boolean =>
      this.network.junctions.some(
        (j) => x > j.minX - pad && x < j.maxX + pad && z > j.minZ - pad && z < j.maxZ + pad
      ) || KEEP_CLEAR.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);

    for (const road of ROADS) {
      const edge = road.width / 2 + road.sidewalk - 0.7;
      let i = 0;
      for (let s = road.from + 12; s < road.to - 6; s += LAMP_SPACING, i++) {
        for (const side of [-1, 1]) {
          const [x, z] = this.point(road, s + (side > 0 ? LAMP_SPACING / 2 : 0), side * edge);
          if (nearJunction(x, z, 7)) continue;
          if (road.id === "main" && side < 0 && z > 124 && z < 203) continue; // muro de la mansión
          const facing = road.axis === "x" ? (side > 0 ? Math.PI : 0) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
          addLamp(b, c, x, z, facing);
          if (i % 3 === 1) {
            const [bx, bz] = this.point(road, s + (side > 0 ? LAMP_SPACING / 2 : 0) + 3, side * edge);
            if (!nearJunction(bx, bz, 5)) addBin(b, c, bx, bz);
          }
          if (i % 4 === 2 && side < 0) {
            const [hx, hz] = this.point(road, s + 6, side * edge);
            if (!nearJunction(hx, hz, 5)) addHydrant(b, c, hx, hz);
          }
        }
      }
    }

    // Placas en la esquina noreste de cada cruce
    for (const j of this.network.junctions) {
      const x = j.maxX + 1.4;
      const z = j.minZ - 1.4;
      const xr = ROADS.find((r) => r.axis === "x" && Math.abs(r.at - (j.minZ + j.maxZ) / 2) < 0.1);
      const zr = ROADS.find((r) => r.axis === "z" && Math.abs(r.at - (j.minX + j.maxX) / 2) < 0.1);
      if (!xr || !zr) continue;
      addStreetSign(ctx, x, z, `street_${xr.id}`, 0, `street_${zr.id}`);
    }
  }

  private point(road: RoadData, s: number, t: number): [number, number] {
    return road.axis === "x" ? [s, road.at + t] : [road.at + t, s];
  }
}
