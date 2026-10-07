/**
 * Superficies caminables del mundo (altura real de cada suelo visible).
 *
 * Todo suelo que se dibuja (parches, calzadas, aceras, suelos interiores,
 * escalones, alfombras y ahora POLÍGONOS triangulares/irregulares) registra
 * aquí su cara superior. El jugador y los NPCs se apoyan en la superficie
 * más alta alcanzable bajo sus pies. Rejilla espacial → consulta O(1).
 */
interface Surface {
  kind: "rect" | "circle" | "rotrect" | "poly";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Solo círculos. */
  cx: number;
  cz: number;
  r2: number;
  height: number;
  /** Solo rectángulos girados (rotrect). */
  hw?: number;
  hd?: number;
  cos?: number;
  sin?: number;
  /** Solo polígonos (poly): vértices [x, z] en sentido horario o antihorario. */
  points?: Array<[number, number]>;
}

const CELL = 10;

/** Punto dentro de un polígono simple (ray casting). */
export function pointInPolygon(points: Array<[number, number]>, x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

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
   * Suelo rectangular girado `rotY` radianes (su eje largo `d` apunta hacia
   * el ángulo `rotY` medido desde +Z). Misma convención que
   * `GroundPatches.rotRect`.
   */
  addRotRect(cx: number, cz: number, w: number, d: number, rotY: number, height: number): void {
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const hw = w / 2;
    const hd = d / 2;
    const ex = Math.abs(cos) * hw + Math.abs(sin) * hd;
    const ez = Math.abs(sin) * hw + Math.abs(cos) * hd;
    this.insert({
      kind: "rotrect",
      minX: cx - ex,
      maxX: cx + ex,
      minZ: cz - ez,
      maxZ: cz + ez,
      cx,
      cz,
      r2: 0,
      height,
      hw,
      hd,
      cos,
      sin,
    });
  }

  /** Suelo poligonal (triángulos y figuras irregulares): vértices [x, z]. */
  addPoly(points: Array<[number, number]>, height: number): void {
    if (points.length < 3) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    this.insert({ kind: "poly", minX, maxX, minZ, maxZ, cx: 0, cz: 0, r2: 0, height, points });
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
      if (s.kind === "rotrect") {
        // Punto en el marco local del rectángulo girado (misma convención que rotRect)
        const dx = x - s.cx;
        const dz = z - s.cz;
        const lx = dx * (s.cos ?? 0) - dz * (s.sin ?? 0);
        const ly = -dx * (s.sin ?? 0) - dz * (s.cos ?? 0);
        if (Math.abs(lx) > (s.hw ?? 0) || Math.abs(ly) > (s.hd ?? 0)) continue;
      }
      if (s.kind === "poly" && s.points && !pointInPolygon(s.points, x, z)) continue;
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
