/**
 * Superficies caminables del mundo (altura real de cada suelo visible).
 *
 * Todo suelo que se dibuja (parches, calzadas, aceras, suelos interiores,
 * escalones, alfombras) registra aquí su cara superior. El jugador y los NPCs
 * se apoyan en la superficie más alta alcanzable bajo sus pies, así los pies
 * coinciden siempre con lo que se ve. Rejilla espacial → consulta O(1).
 */
interface Surface {
  kind: "rect" | "circle";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Solo círculos. */
  cx: number;
  cz: number;
  r2: number;
  height: number;
}

const CELL = 10;

export class GroundMap {
  private cells = new Map<number, Surface[]>();
  private count = 0;
  /** Altura del terreno base (césped). */
  readonly baseHeight: number;

  constructor(baseHeight = 0) {
    this.baseHeight = baseHeight;
  }

  get surfaceCount(): number {
    return this.count;
  }

  addRect(minX: number, maxX: number, minZ: number, maxZ: number, height: number): void {
    this.insert({ kind: "rect", minX, maxX, minZ, maxZ, cx: 0, cz: 0, r2: 0, height });
  }

  addCircle(cx: number, cz: number, r: number, height: number): void {
    this.insert({ kind: "circle", minX: cx - r, maxX: cx + r, minZ: cz - r, maxZ: cz + r, cx, cz, r2: r * r, height });
  }

  /**
   * Altura del suelo en (x, z): la superficie más alta que no supere `maxY`
   * (así un escalón alcanzable se sube y un techo no "atrae" al jugador).
   */
  heightAt(x: number, z: number, maxY = Infinity): number {
    let best = this.baseHeight;
    const list = this.cells.get(this.key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return best;
    for (const s of list) {
      if (s.height <= best || s.height > maxY) continue;
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
      if (s.kind === "circle") {
        const dx = x - s.cx;
        const dz = z - s.cz;
        if (dx * dx + dz * dz > s.r2) continue;
      }
      best = s.height;
    }
    return best;
  }

  private insert(s: Surface): void {
    this.count++;
    const x0 = Math.floor(s.minX / CELL);
    const x1 = Math.floor(s.maxX / CELL);
    const z0 = Math.floor(s.minZ / CELL);
    const z1 = Math.floor(s.maxZ / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const k = this.key(cx, cz);
        const list = this.cells.get(k);
        if (list) list.push(s);
        else this.cells.set(k, [s]);
      }
    }
  }

  private key(cx: number, cz: number): number {
    return (cx + 2048) * 4096 + (cz + 2048);
  }
}

/** Función de consulta que reciben jugador y NPCs (sin acoplarse al mundo). */
export type GroundQuery = (x: number, z: number, maxY?: number) => number;
