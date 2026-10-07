import { addRoadBlock, addWall } from "../cityProps";
import { createRng, randRange } from "../../utils/random";
import type { BuildingSpec } from "../buildings";
import type { Rect, Zone, ZoneContext } from "./Zone";

/**
 * Límites del mapa YA EXPANDIDO: muro perimetral, salidas cortadas hacia los
 * distritos aún por venir ("próximamente") y skyline lejano que insinúa una
 * ciudad más grande. Cuando se rellene un distrito futuro, se quita el
 * tramo de muro correspondiente y la calle continúa.
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
    // Muro perimetral completo (el clamp de WorldBounds evita salir igualmente)
    addWall(b, null, B.minX - 0.5, B.minZ - 0.5, B.minX - 0.5, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, B.maxX + 0.5, B.minZ - 0.5, B.maxX + 0.5, B.maxZ + 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, B.minX - 0.5, B.minZ - 0.5, B.maxX + 0.5, B.minZ - 0.5, 0xd8ccb4, 1.6);
    addWall(b, null, B.minX - 0.5, B.maxZ + 0.5, B.maxX + 0.5, B.maxZ + 0.5, 0xd8ccb4, 1.6);

    // Salidas marcadas hacia los distritos reservados (una por lateral)
    // rotY = 0 bloquea calles verticales; rotY = 90° bloquea calles horizontales.
    addRoadBlock(ctx, 0, B.maxZ - 3, 14, 0, "exit");
    ctx.pois.define("exit_south", "Ciudad Universitaria (próximamente)", "EXIT", 0, B.maxZ - 3);
    addRoadBlock(ctx, 40, B.minZ + 3, 12, 0, "exit");
    ctx.pois.define("exit_north", "Isla del Faro (próximamente)", "EXIT", 40, B.minZ + 3);
    addRoadBlock(ctx, B.minX + 3, -25, 12, Math.PI / 2, "exit");
    ctx.pois.define("exit_west", "Sierra Vieja (próximamente)", "EXIT", B.minX + 3, -25);
    addRoadBlock(ctx, B.maxX - 3, -25, 12, Math.PI / 2, "exit");
    ctx.pois.define("exit_east", "Dársena Comercial (próximamente)", "EXIT", B.maxX - 3, -25);

    // Skyline lejano: se funde con la niebla, sin colisión (más allá del muro)
    const rng = createRng(99);
    const skyline: BuildingSpec[] = [];
    for (let i = 0; i < 160 && skyline.length < 70; i++) {
      const a = rng() * Math.PI * 2;
      const r = randRange(rng, 320, 520);
      const x = Math.cos(a) * r * 0.9;
      const z = Math.sin(a) * r * 1.05;
      if (x > B.minX - 18 && x < B.maxX + 18 && z > B.minZ - 18 && z < B.maxZ + 18) continue;
      skyline.push({
        x,
        z,
        w: randRange(rng, 14, 30),
        d: randRange(rng, 14, 30),
        h: randRange(rng, 18, 72),
        style: Math.floor(rng() * 8),
      });
    }
    ctx.facades.push(...skyline);
  }
}
