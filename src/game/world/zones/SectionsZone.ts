import { addCone } from "../Props";
import { addShopSign } from "../cityProps";
import type { Rect, Zone, ZoneContext } from "./Zone";

interface Marker {
  /** Punto de la señal (fuera de la calzada, en el borde de la acera). */
  x: number;
  z: number;
  /** Orientación de la cara de la señal (0 = mira a +Z). */
  rotY: number;
}

/**
 * Marcas de "SECCIÓN EN OBRAS · POR RELLENAR" en la entrada de cada tramo
 * expandido (suelo y calles ya hechos). Señal + conos, sin bloquear la calle:
 * el jugador puede recorrer la sección mientras llega su contenido.
 * Quitar la marca cuando se construya esa sección.
 */
export class SectionsZone implements Zone {
  readonly id = "sections";
  readonly name = "Secciones en obras";
  readonly bounds: Rect;

  /** Entradas de cada sección expandida (una por lateral). */
  private readonly markers: Marker[] = [
    { x: -122, z: -15.2, rotY: Math.PI }, // BARRIO DIAGONAL (oeste)
    { x: 237, z: -15.2, rotY: Math.PI }, // EL PUERTO (este)
    { x: 7.4, z: 210, rotY: -Math.PI / 2 }, // CENTRO / DOWNTOWN (sur)
    { x: -165.4, z: -184, rotY: 0 }, // LA PLAYA (norte)
  ];

  constructor(bounds: Rect) {
    this.bounds = bounds;
  }

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    for (const m of this.markers) {
      // Poste + placa (atlante de carteles, 1 sola textura para todas)
      b.setBase(m.x, 0, m.z, m.rotY);
      b.cyl(0.06, 0.08, 3.1, 8, 0x2f353c, 0, 1.55, 0);
      b.box(2.5, 1.5, 0.08, 0x1b1f26, 0, 2.5, 0, 0, 0, 0.04);
      addShopSign(ctx, m.x, 2.5, m.z + (m.rotY === 0 ? 0.07 : m.rotY === Math.PI ? -0.07 : 0), m.rotY, "section", 2.3);

      // Conos alrededor del poste (no bloquean la calle)
      addCone(b, m.x + 1.1, m.z + 0.4);
      addCone(b, m.x - 1.1, m.z + 0.4);
      addCone(b, m.x + 1.3, m.z - 1.2);
    }
  }
}
