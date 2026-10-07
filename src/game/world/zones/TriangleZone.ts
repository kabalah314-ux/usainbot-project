import { addBench, addBin, addCone, addLamp, addPlanter } from "../Props";
import type { Rect, Zone, ZoneContext } from "./Zone";

/**
 * EL TRIÁNGULO (oeste) — expansión del mapa por el lateral IZQUIERDO.
 *
 * Solo el TERRENO (la estructura), como en la Zona Merkantil: un gran
 * **triángulo** unido al borde oeste del mapa (lado plano pegado a Barrio
 * Diagonal, vértice hacia el oeste) más **cuñas irregulares** alrededor.
 * Figuras NO cuadradas: se dibujan con `GroundPatches.poly` y son
 * caminables de verdad (colisión poligonal, no su caja envolvente).
 *
 * Contenido (puestos, NPCs, misiones) llegará en otra fase.
 */
export class TriangleZone implements Zone {
  readonly id = "triangulo";
  readonly name = "El Triángulo";
  readonly bounds: Rect = { minX: -420, maxX: -185, minZ: -243, maxZ: 264 };

  /**
   * Vértices del triángulo principal (metros):
   *  · lado plano al ESTE (pegado al mapa existente, x = -185)
   *  · vértice hacia el OESTE (x = -400)
   */
  private readonly tri: Array<[number, number]> = [
    [-185, -243],
    [-185, 264],
    [-400, 10],
  ];

  build(ctx: ZoneContext): void {
    const g = ctx.ground;

    // 1) Suelo triangular principal (plaza grande al aire libre)
    g.poly("plaza", this.tri);

    // 2) Cuñas irregulares que rodean el triángulo (tampoco cuadradas):
    //    encajan con las curvas del borde y dan silueta natural.
    g.poly("lawn", [
      [-185, -243],
      [-210, -258],
      [-330, -140],
      [-400, 10],
      [-300, -60],
      [-205, -150],
    ]);
    g.poly("lawn", [
      [-185, 264],
      [-215, 300],
      [-330, 180],
      [-400, 10],
      [-300, 80],
      [-205, 180],
    ]);
    // Punta oeste de arena (donde muere el mapa, "el fin del oeste")
    g.poly("sand", [
      [-400, 10],
      [-452, -20],
      [-452, 44],
      [-400, 10],
      [-430, 60],
    ]);

    // 3) Mobiliario mínimo a lo largo de las dos avenidas que cruzan el triángulo
    this.furniture(ctx);

    ctx.map.label("EL TRIÁNGULO", -300, 10);
    ctx.map.label("PLAZA TRIANGULAR", -280, -60);
    ctx.pois.define("triangulo", "El Triángulo", "PARK", -300, 10);
    ctx.pois.define("plaza_triangulo", "Plaza Triangular", "SHOP", -280, -60);
  }

  /** Mobiliario ligero, siempre FUERA de la calzada (misma regla que el resto). */
  private furniture(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    // Avenida C. del Oeste (z = 60, va de x -400 a -205)
    for (const x of [-380, -340, -300, -260, -225]) {
      ctx.trees.add(c, x, 52, 1.15);
      ctx.trees.add(c, x, 68, 1.1);
      addLamp(b, c, x + 8, 50.5, Math.PI / 2);
      addLamp(b, c, x + 8, 69.5, -Math.PI / 2);
    }
    addBench(b, c, -300, 50.5, 0);
    addBench(b, c, -260, 69.5, Math.PI);
    addBin(b, c, -320, 50.5);

    // Avenida C. Triangular (diagonal hacia el vértice)
    for (const [x, z] of [[-230, -110], [-260, -90], [-290, -70], [-320, -50]] as Array<[number, number]>) {
      ctx.trees.add(c, x, z, 1.05);
      addLamp(b, c, x + 6, z + 6, Math.PI / 4);
    }
    addBench(b, c, -250, -100, 0.8);
    addPlanter(b, c, -275, -80);
    addBin(b, c, -300, -60);

    // Conos marcando que la zona está por rellenar (estructura sin contenido)
    addCone(b, -215, -180);
    addCone(b, -218, -178);
    addCone(b, -215, 200);
    addCone(b, -218, 202);
  }
}
