import type { RoadData } from "../../data/cityLayout";
import type { GasOilMachineSpec } from "../zones/Zone";
import { machineUsePoint } from "../../gasoil/GasOilMachine";

/**
 * Grafo de navegación de peatones (waypoints). Sin navmesh: nodos en las
 * aceras, cruces por los pasos de cebra y "puntos de actividad" (bancos,
 * máquinas GasOil, puertas de tiendas) colgados del grafo.
 *
 *   corner/walk  → caminar
 *   bench        → sentarse (SITTING)
 *   machine      → comprar/beber GasOil
 *   door         → entrar en la tienda (se oculta) y volver a salir
 */
export type PedNodeKind = "walk" | "corner" | "park" | "bench" | "machine" | "door";

export interface PedNode {
  id: number;
  x: number;
  z: number;
  kind: PedNodeKind;
  /** Orientación al usarlo (sentado, frente a la máquina, hacia la puerta). */
  yaw: number;
  links: number[];
  /** Vecinos a los que se llega cruzando una calzada. */
  crossing: Set<number>;
}

export const ACTIVITY_KINDS: ReadonlySet<PedNodeKind> = new Set(["bench", "machine", "door"]);

type Pt = [number, number];

/** Bancos existentes en el mundo [x, z, rotY del banco]. */
const BENCHES: Array<[number, number, number]> = [
  [-4.6, -118, Math.PI / 2], [-4.6, -128, Math.PI / 2], [-4.6, -154, Math.PI / 2], [-4.6, -164, Math.PI / 2],
  [-80, -144.6, 0], [-40, -144.6, 0], [30, -144.6, 0], [80, -144.6, 0],
  [-47, 16.5, Math.PI], [-54, 16.5, Math.PI],
  [24, 15.6, Math.PI], [54, 15.6, Math.PI], [84, 15.6, Math.PI],
  [-34, 84, Math.PI / 2], [-34, 97, Math.PI / 2],
  [-9.8, 30, Math.PI / 2], // parada de autobús (LifeZone)
];

/** Puertas de tiendas [x, z, yaw hacia dentro]. */
const DOORS: Array<[number, number, number]> = [
  [-23.5, -16.2, 0], [-54, -16.2, 0], [-85, -16.2, 0], // Robo-Burger, Pixel Video, Súper 24H
  [-11.4, 24, -Math.PI / 2], // Farmacia
  [30, 17.3, 0], [46, 17.3, 0], [76, 17.3, 0], [92, 17.3, 0], // galería
  [63.2, 76, Math.PI / 2], // tienda GasOil Stop
];

/** Caminos del parque, plazas y explanadas (cadenas de puntos). */
const CHAINS: Pt[][] = [
  // Parque: entrada central → estatua (rodeando la fuente) → fondo
  [[0, -104.5], [0, -126], [-8, -131], [-14, -140], [-8, -149], [0, -154], [0, -170]],
  [[0, -126], [8, -131], [14, -140], [8, -149], [0, -154]],
  // Paseo transversal (lado oeste por el estanque, lado este junto a la zona infantil)
  [[-14, -140], [-50, -140], [-90, -140]],
  [[14, -140], [40, -139], [55, -138], [90, -138]],
  // Galería comercial (acera frente a las tiendas)
  [[18, 16.5], [38, 16.5], [60, 16.5], [82, 16.5], [100, 16.5]],
  // Pasaje peatonal → plaza trasera del comercio
  [[-12, 9.5], [-24, 9.5], [-36, 11], [-46, 12], [-56, 12]],
  // Plaza vecinal
  [[-12, 90], [-22, 90], [-30, 90.5]],
  // Explanada de la gasolinera → tienda y máquinas
  [[14, 54], [36, 57], [56, 58], [60, 70]],
];

export class PedGraph {
  readonly nodes: PedNode[] = [];

  add(x: number, z: number, kind: PedNodeKind, yaw = 0): PedNode {
    const node: PedNode = { id: this.nodes.length, x, z, kind, yaw, links: [], crossing: new Set() };
    this.nodes.push(node);
    return node;
  }

  link(a: PedNode, b: PedNode, crossing = false): void {
    if (a === b || a.links.includes(b.id)) return;
    a.links.push(b.id);
    b.links.push(a.id);
    if (crossing) {
      a.crossing.add(b.id);
      b.crossing.add(a.id);
    }
  }

  unlink(a: PedNode, b: PedNode): void {
    a.links = a.links.filter((id) => id !== b.id);
    b.links = b.links.filter((id) => id !== a.id);
    a.crossing.delete(b.id);
    b.crossing.delete(a.id);
  }

  /** Conecta un nodo suelto al grafo partiendo la arista caminable más cercana. */
  connect(node: PedNode): void {
    let best: { a: PedNode; b: PedNode; t: number; d: number } | null = null;
    for (const a of this.nodes) {
      if (a === node || ACTIVITY_KINDS.has(a.kind)) continue;
      for (const id of a.links) {
        const b = this.nodes[id];
        if (b.id < a.id || b === node || ACTIVITY_KINDS.has(b.kind) || a.crossing.has(b.id)) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((node.x - a.x) * dx + (node.z - a.z) * dz) / len2));
        const d = Math.hypot(a.x + dx * t - node.x, a.z + dz * t - node.z);
        if (!best || d < best.d) best = { a, b, t, d };
      }
    }
    if (!best) return;
    const { a, b, t } = best;
    if (t < 0.05) return this.link(node, a);
    if (t > 0.95) return this.link(node, b);
    const mid = this.add(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, "walk");
    this.unlink(a, b);
    this.link(a, mid);
    this.link(mid, b);
    this.link(node, mid);
  }

  nearest(x: number, z: number, accept: (n: PedNode) => boolean = () => true): PedNode | null {
    let best: PedNode | null = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (!accept(n)) continue;
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** Nodo caminable al azar dentro de un anillo alrededor de (x, z). */
  randomInRing(x: number, z: number, min: number, max: number, rng: () => number): PedNode | null {
    const pool = this.nodes.filter((n) => {
      if (ACTIVITY_KINDS.has(n.kind)) return false;
      const d = Math.hypot(n.x - x, n.z - z);
      return d >= min && d <= max;
    });
    return pool.length ? pool[Math.floor(rng() * pool.length) % pool.length] : null;
  }

  /** Parte las aristas largas para repartir mejor a los peatones. */
  subdivide(maxLen: number): void {
    const edges: Array<[PedNode, PedNode, boolean]> = [];
    for (const a of this.nodes) {
      for (const id of a.links) if (id > a.id) edges.push([a, this.nodes[id], a.crossing.has(id)]);
    }
    for (const [a, b, crossing] of edges) {
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (crossing || len <= maxLen) continue;
      const n = Math.ceil(len / maxLen);
      this.unlink(a, b);
      let prev = a;
      for (let i = 1; i < n; i++) {
        const mid = this.add(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, "walk");
        this.link(prev, mid);
        prev = mid;
      }
      this.link(prev, b);
    }
  }
}

/** Construye el grafo del barrio a partir de las calles (datos) y los puntos de actividad. */
export function buildPedGraph(roads: readonly RoadData[], machines: readonly GasOilMachineSpec[]): PedGraph {
  const g = new PedGraph();
  const xRoads = roads.filter((r) => r.axis === "x");
  const zRoads = roads.filter((r) => r.axis === "z");
  // Esquinas de cada cruce (centro del cuadrado de acera de la esquina)
  interface Corner { node: PedNode; xr: RoadData; zr: RoadData; sx: number; sz: number }
  const corners: Corner[] = [];
  const junction = new Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }>();
  for (const xr of xRoads) {
    for (const zr of zRoads) {
      if (zr.at <= xr.from || zr.at >= xr.to || xr.at <= zr.from - 0.01 || xr.at >= zr.to + 0.01) continue;
      const rect = { minX: zr.at - zr.width / 2, maxX: zr.at + zr.width / 2, minZ: xr.at - xr.width / 2, maxZ: xr.at + xr.width / 2 };
      junction.set(`${xr.id}|${zr.id}`, rect);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = sx < 0 ? rect.minX - zr.sidewalk / 2 : rect.maxX + zr.sidewalk / 2;
          const z = sz < 0 ? rect.minZ - xr.sidewalk / 2 : rect.maxZ + xr.sidewalk / 2;
          corners.push({ node: g.add(x, z, "corner"), xr, zr, sx, sz });
        }
      }
    }
  }
  // Aceras: esquinas consecutivas sobre la misma línea (cruzando si hay brazo de calle)
  for (const xr of xRoads) {
    for (const sz of [-1, 1]) {
      const line = corners.filter((c) => c.xr === xr && c.sz === sz).sort((a, b) => a.node.x - b.node.x);
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const sameJunction = a.zr === b.zr;
        const rect = junction.get(`${xr.id}|${a.zr.id}`);
        const armExists = rect ? (sz < 0 ? a.zr.from < rect.minZ - 1 : a.zr.to > rect.maxZ + 1) : false;
        g.link(a.node, b.node, sameJunction && armExists);
      }
    }
  }
  for (const zr of zRoads) {
    for (const sx of [-1, 1]) {
      const line = corners.filter((c) => c.zr === zr && c.sx === sx).sort((a, b) => a.node.z - b.node.z);
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const sameJunction = a.xr === b.xr;
        const rect = junction.get(`${a.xr.id}|${zr.id}`);
        const armExists = rect ? (sx < 0 ? a.xr.from < rect.minX - 1 : a.xr.to > rect.maxX + 1) : false;
        g.link(a.node, b.node, sameJunction && armExists);
      }
    }
  }
  g.subdivide(24);

  // Cadenas (parque, plazas, explanadas): se enganchan al grafo por el primer punto
  const byKey = new Map<string, PedNode>();
  for (const chain of CHAINS) {
    let prev: PedNode | null = null;
    chain.forEach(([x, z], i) => {
      const key = `${x}|${z}`;
      let node = byKey.get(key);
      if (!node) {
        node = g.add(x, z, "park");
        byKey.set(key, node);
        if (i === 0 && chain === CHAINS[0]) {
          // Entrada del parque: enlaza con la acera norte de la Calle del Parque a ambos lados
          const w = g.nearest(-8.5, -102.5);
          const e = g.nearest(8.5, -102.5);
          if (w) g.link(node, w);
          if (e) g.link(node, e);
        } else if (i === 0) {
          g.connect(node);
        }
      }
      if (prev) g.link(prev, node);
      prev = node;
    });
  }

  // Puntos de actividad (callejones sin salida del grafo)
  for (const [x, z, rot] of BENCHES) {
    const n = g.add(x + Math.sin(rot) * 0.12, z + Math.cos(rot) * 0.12, "bench", rot);
    g.connect(n);
  }
  for (const [x, z, yaw] of DOORS) g.connect(g.add(x, z, "door", yaw));
  for (const m of machines) {
    const [x, z] = machineUsePoint(m);
    g.connect(g.add(x, z, "machine", m.rotY + Math.PI));
  }
  return g;
}
