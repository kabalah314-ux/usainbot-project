import type { Rect, Zone, ZoneContext } from "./Zone";

/**
 * ZONA MERCANTIL (sur) — expansión por el lateral SUR del mapa.
 *
 * Solo el TERRENO por ahora (la estructura): un gran suelo **triangular**
 * (figura no cuadrada) que hace de mercado al aire libre. Los tres bordes
 * son laderas verdes irregulares (también poligonales) que encajan con el
 * triángulo principal. El contenido (puestos, NPCs, misiones) llega después.
 */
export class MercantileZone implements Zone {
  readonly id = "merkantil";
  readonly name = "Zona Merkantil";
  readonly bounds: Rect = { minX: -185, maxX: 300, minZ: 264, maxZ: 418 };

  /** Vértices del triángulo del mercado (base al norte, vértice al sur). */
  private readonly tri: Array<[number, number]> = [
    [-172, 268],
    [288, 268],
    [58, 414],
  ];

  build(ctx: ZoneContext): void {
    const g = ctx.ground;

    // Suelo triangular del mercado (NO cuadrado)
    g.poly("plaza", this.tri);

    // Cuñas irregulares alrededor (tampoco cuadradas): césped en degradado
    g.poly("lawn", [
      [-205, 250],
      [-172, 268],
      [58, 414],
      [-95, 430],
      [-240, 300],
    ]);
    g.poly("lawn", [
      [288, 268],
      [330, 250],
      [330, 330],
      [240, 430],
      [58, 414],
    ]);
    g.poly("sand", [
      [58, 414],
      [240, 430],
      [150, 452],
      [-20, 448],
      [-95, 430],
    ]);

    ctx.map.label("ZONA MERCANTIL", 58, 320);
    ctx.map.label("MERCADO AL AIRE LIBRE", 58, 350);
    ctx.pois.define("zona_merkantil", "Zona Merkantil", "SHOP", 58, 330);
    ctx.pois.define("mercado_merkantil", "Mercado al aire libre", "SHOP", 58, 372);
  }
}
