import { ROADS } from "../data/cityLayout";

/**
 * Rutas de tráfico: bucles que pasan por cruces (centro de la calzada).
 * Se generan como polilíneas por el CARRIL DERECHO, con curvas redondeadas.
 *
 *   ROAD A → INTERSECTION → ROAD B → ROAD C → LOOP
 */
type Pt = [number, number];

export const ROUTE_DEFS: Array<{ id: string; name: string; loop: Pt[] }> = [
  // Bloque oeste (antihorario): avenida al norte → Comercio → Oeste → Residencial
  { id: "west_block", name: "Bloque oeste", loop: [[0, 115], [0, -25], [-110, -25], [-110, 115]] },
  // Bloque este (horario): avenida al sur → Residencial → Este → Comercio
  { id: "east_block", name: "Bloque este", loop: [[0, -25], [0, 115], [110, 115], [110, -25]] },
  // Vuelta al parque: C. del Parque → Este → Gasolina → Oeste
  { id: "park_loop", name: "Vuelta al parque", loop: [[-110, -95], [110, -95], [110, 45], [-110, 45]] },
  // Circuito central: Gasolina → Este → Parque → avenida al sur
  { id: "center_loop", name: "Circuito central", loop: [[0, 45], [110, 45], [110, -95], [0, -95]] },
  // Inverso de la vuelta al parque (tráfico en ambos sentidos)
  { id: "park_loop_rev", name: "Vuelta al parque (inverso)", loop: [[-110, 45], [110, 45], [110, -95], [-110, -95]] },
];

/** Media anchura de carril (desplazamiento al carril derecho) según la calle. */
function laneOffset(ax: number, az: number, bx: number, bz: number): number {
  const vertical = Math.abs(bx - ax) < Math.abs(bz - az);
  const road = ROADS.find((r) => (vertical ? r.axis === "z" && Math.abs(r.at - ax) < 0.5 : r.axis === "x" && Math.abs(r.at - az) < 0.5));
  const width = road?.width ?? 12;
  return width / 4;
}

export interface TrafficRoute {
  id: string;
  name: string;
  /** Puntos por el carril, con curvas suavizadas. */
  points: Pt[];
  /** Distancia acumulada hasta cada punto. */
  cum: number[];
  length: number;
  /** Velocidad máxima recomendada en cada punto (curvas más lentas). */
  maxSpeed: number[];
}

export function buildRoute(def: (typeof ROUTE_DEFS)[number], cruise: number, corner: number): TrafficRoute {
  const n = def.loop.length;
  // 1) Esquinas por el carril derecho: nodo + dcha(tramo entrante)·o1 + dcha(saliente)·o2
  const corners: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = def.loop[(i - 1 + n) % n];
    const c = def.loop[i];
    const q = def.loop[(i + 1) % n];
    const din = norm(c[0] - p[0], c[1] - p[1]);
    const dout = norm(q[0] - c[0], q[1] - c[1]);
    const oin = laneOffset(p[0], p[1], c[0], c[1]);
    const oout = laneOffset(c[0], c[1], q[0], q[1]);
    // derecha de (dx, dz) = (-dz, dx)
    corners.push([c[0] - din[1] * oin - dout[1] * oout, c[1] + din[0] * oin + dout[0] * oout]);
  }
  // 2) Curvas: cada esquina se sustituye por una Bézier cuadrática (radio ~6 m)
  const points: Pt[] = [];
  const speeds: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = corners[(i - 1 + n) % n];
    const c = corners[i];
    const q = corners[(i + 1) % n];
    const r = Math.min(6, dist(p, c) / 2, dist(c, q) / 2);
    const din = norm(c[0] - p[0], c[1] - p[1]);
    const dout = norm(q[0] - c[0], q[1] - c[1]);
    const a: Pt = [c[0] - din[0] * r, c[1] - din[1] * r];
    const b: Pt = [c[0] + dout[0] * r, c[1] + dout[1] * r];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const u = 1 - t;
      points.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
      speeds.push(corner);
    }
    // recta hasta la siguiente curva: puntos intermedios a velocidad de crucero
    const next = corners[(i + 1) % n];
    const after = corners[(i + 2) % n];
    const r2 = Math.min(6, dist(c, next) / 2, dist(next, after) / 2);
    const end: Pt = [next[0] - dout[0] * r2, next[1] - dout[1] * r2];
    const len = dist(b, end);
    const steps = Math.max(1, Math.floor(len / 12));
    for (let k = 1; k < steps; k++) {
      points.push([b[0] + ((end[0] - b[0]) * k) / steps, b[1] + ((end[1] - b[1]) * k) / steps]);
      speeds.push(cruise);
    }
  }
  const cum = [0];
  for (let i = 1; i <= points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i % points.length]));
  return { id: def.id, name: def.name, points, cum, length: cum[points.length], maxSpeed: speeds };
}

function norm(x: number, z: number): Pt {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
