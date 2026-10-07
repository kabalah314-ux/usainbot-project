import { addRoadBlock, addWall } from "../cityProps";
import { createRng, randRange } from "../../utils/random";
import type { BuildingSpec } from "../buildings";
import type { Rect, Zone, ZoneContext } from "./Zone";

/**
 * Límites del primer barrio: muro perimetral, salida de la ciudad
 * (cortada: "próximamente") y skyline lejano que insinúa el resto del mapa.
 * Futuras zonas sustituirán estas barreras.
 */
export class OutskirtsZone implements Zone {
  readonly id = "outskirts";
  readonly name = "Afueras";
  readonly bounds: Rect;

  constructor(bounds: Rect) {
    this.bounds = bounds;
  }

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    const B = this.bounds;
    addWall(b, null, B.minX - 0.5, B.minZ, B.minX - 0.5, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, B.maxX + 0.5, B.minZ, B.maxX + 0.5, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, B.minX, B.maxZ + 0.5, -9, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, 9, B.maxZ + 0.5, B.maxX, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addRoadBlock(ctx, 0, 199, 14, Math.PI, "exit");
    ctx.pois.define("exit_south", "Salida de la ciudad (próximamente)", "EXIT", 0, 196);

    // Skyline: se funde con la niebla, sin colisión
    const rng = createRng(99);
    const skyline: BuildingSpec[] = [];
    for (let i = 0; i < 160 && skyline.length < 70; i++) {
      const a = rng() * Math.PI * 2;
      const r = randRange(rng, 150, 300);
      const x = Math.cos(a) * r * 0.9;
      const z = Math.sin(a) * r * 1.2 + 12;
      if (x > B.minX - 18 && x < B.maxX + 18 && z > B.minZ - 18 && z < B.maxZ + 18) continue;
      if (Math.abs(x) < 16 && z > B.maxZ) continue; // deja ver la carretera de salida
      skyline.push({
        x,
        z,
        w: randRange(rng, 12, 24),
        d: randRange(rng, 12, 24),
        h: randRange(rng, 16, 64),
        style: Math.floor(rng() * 8),
      });
    }
    ctx.facades.push(...skyline);
  }
}
