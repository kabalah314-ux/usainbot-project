import * as THREE from "three";
import { StaticBatcher } from "../../utils/StaticBatcher";
import { toon } from "../../utils/materials";
import { aabb } from "../colliders";
import { addPlanter, addBush } from "../Props";
import { addBollards, addHedge, addWall } from "../cityProps";
import { SIGN_UV } from "../signs";
import { GASOIL_UV } from "../../gasoil/branding";
import { addWallWithGaps, addWater } from "./common";
import { inRect } from "./Zone";
import type { Rect, Zone, ZoneContext } from "./Zone";

/** Planta de la mansión (x: oeste→este, z: norte→sur). */
export const MANSION: Rect = { minX: -84, maxX: -36, minZ: 142, maxZ: 178 };
export const GARAGE: Rect = { minX: -34, maxX: -16, minZ: 140, maxZ: 158 };
const WALL_H = 5.2;
const EXT = 0xf7f3ea;
const INT = 0xf3e6cf;
const GOLD = 0xe2a93b;
const GREEN = 0x2e9a42;

/**
 * Casa de UsainBot: mansión explorable (dormitorio = inicio del juego),
 * jardín, piscina y garaje-taller de Tito. Sin pantallas de carga: al entrar
 * el tejado deja de dibujarse pero sigue proyectando sombra.
 */
export class HomeZone implements Zone {
  readonly id = "home";
  readonly name = "Casa de UsainBot";
  readonly bounds: Rect = { minX: -121, maxX: -10, minZ: 124, maxZ: 203 };
  private roofs: Array<{ rect: Rect; material: THREE.Material }> = [];

  build(ctx: ZoneContext): void {
    this.buildLot(ctx);
    this.buildMansionShell(ctx);
    this.buildInterior(ctx);
    this.buildGarage(ctx);
    this.buildGarden(ctx);

    ctx.pois.define("house", "Mansión UsainBot", "HOUSE", -60, 141);
    ctx.pois.define("garage", "Garaje · Taller Tito", "GARAGE", -25, 139);
    ctx.map.building("home", MANSION.minX, MANSION.maxX, MANSION.minZ, MANSION.maxZ);
    ctx.map.building("garage", GARAGE.minX, GARAGE.maxX, GARAGE.minZ, GARAGE.maxZ);
    ctx.map.label("MANSIÓN", -60, 160);
  }

  update(_dt: number, p: THREE.Vector3): void {
    for (const roof of this.roofs) {
      const inside = inRect(roof.rect, p.x, p.z, -0.2);
      roof.material.colorWrite = !inside;
      roof.material.depthWrite = !inside;
    }
  }

  private addRoof(ctx: ZoneContext, rect: Rect, build: (b: StaticBatcher) => void): void {
    const batch = new StaticBatcher();
    build(batch);
    const material = toon({ vertexColors: true });
    const mesh = batch.build(material, true, false);
    if (!mesh) return;
    ctx.group.add(mesh);
    this.roofs.push({ rect, material });
  }

  private buildLot(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const zN = 124.8;
    // Muro perimetral con cancela y entrada de coches
    addWall(b, c, -118, zN, -63.5, zN, EXT);
    addWall(b, c, -56.5, zN, -31.5, zN, EXT);
    addWall(b, c, -18.5, zN, -11, zN, EXT);
    addWall(b, c, -11, zN, -11, 202, EXT);
    addWall(b, c, -118, zN, -118, 202, EXT);
    addWall(b, c, -118, 202, -11, 202, EXT);
    // Cancela peatonal (bolardos: el coche entra solo por la de coches)
    // (hueco central de 1,7 m justo en el camino: se pasa andando, el coche no cabe)
    addBollards(b, c, -63.0, zN + 0.2, -57.0, zN + 0.2, 2.0);
    // Setos a los lados de la entrada de coches (con paso peatonal al jardín)
    addHedge(b, c, -31.0, 125.4, -31.0, 130.2, 1.1);
    addHedge(b, c, -31.0, 131.9, -31.0, 139.7, 1.1);
    addHedge(b, c, -19.5, 125.4, -19.5, 139.7, 1.1);
    for (const x of [-63.8, -56.2, -31.8, -18.2]) {
      b.setBase(x, 0, zN);
      b.box(0.9, 2.4, 0.9, EXT, 0, 1.2, 0);
      b.box(1.1, 0.2, 1.1, GOLD, 0, 2.5, 0);
      b.cyl(0.3, 0.3, 0.5, 10, GOLD, 0, 2.85, 0);
      c.push(aabb(x, zN, 0.9, 0.9, 2.4));
    }
  }

  private buildMansionShell(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const M = MANSION;
    addWallWithGaps(b, c, M.minX, M.minZ, M.maxX, M.minZ, [[-62.5, -57.5]], EXT, WALL_H);
    addWallWithGaps(b, c, M.minX, M.maxZ, M.maxX, M.maxZ, [], EXT, WALL_H);
    addWallWithGaps(b, c, M.minX, M.minZ, M.minX, M.maxZ, [], EXT, WALL_H);
    addWallWithGaps(b, c, M.maxX, M.minZ, M.maxX, M.maxZ, [[148, 152]], EXT, WALL_H);

    // Zócalo, cornisa verde/dorada y ventanales
    b.setBase((M.minX + M.maxX) / 2, 0, (M.minZ + M.maxZ) / 2);
    const w = M.maxX - M.minX;
    const d = M.maxZ - M.minZ;
    // Zócalo SOLO por fuera de los muros (antes era un bloque macizo de 0,5 m
    // que tapaba todo el interior y hundía los pies del jugador).
    const skirt = 0xcfc6b4;
    b.box(w + 0.9, 0.35, 0.2, skirt, 0, 0.175, -d / 2 - 0.35);
    b.box(w + 0.9, 0.35, 0.2, skirt, 0, 0.175, d / 2 + 0.35);
    b.box(0.2, 0.35, d + 0.5, skirt, -w / 2 - 0.35, 0.175, 0);
    b.box(0.2, 0.35, d + 0.5, skirt, w / 2 + 0.35, 0.175, 0);
    b.box(w + 1.0, 0.35, d + 1.0, GREEN, 0, WALL_H - 0.2, 0);
    b.box(w + 1.1, 0.12, d + 1.1, GOLD, 0, WALL_H - 0.45, 0);
    const glass = 0x8fc9e8;
    for (const x of [-79, -73, -47, -41]) {
      b.setBase(x, 0, M.minZ);
      b.box(3.2, 2.6, 0.62, glass, 0, 2.4, 0);
      b.box(3.5, 0.15, 0.8, EXT, 0, 1.05, 0);
    }
    for (const x of [-78, -70, -52, -44]) {
      b.setBase(x, 0, M.maxZ);
      b.box(3.2, 2.6, 0.62, glass, 0, 2.4, 0);
    }
    for (const z of [148, 156, 166, 172]) {
      b.setBase(M.minX, 0, z);
      b.box(0.62, 2.6, 3.2, glass, 0, 2.4, 0);
    }
    for (const z of [158, 166, 172]) {
      b.setBase(M.maxX, 0, z);
      b.box(0.62, 2.6, 3.2, glass, 0, 2.4, 0);
    }

    // Pórtico de entrada con columnas y rótulo
    for (const x of [-65, -55]) {
      b.setBase(x, 0, 139.2);
      b.cyl(0.42, 0.48, 5.2, 12, EXT, 0, 2.6, 0);
      b.box(1.1, 0.3, 1.1, GOLD, 0, 0.15, 0);
      b.box(1.1, 0.3, 1.1, GOLD, 0, 5.1, 0);
      c.push(aabb(x, 139.2, 1.0, 1.0, 5.2));
    }
    b.setBase(-60, 0, 139.8);
    b.box(12.5, 0.5, 5.2, EXT, 0, 5.5, 0);
    b.box(12.7, 0.15, 5.4, GOLD, 0, 5.2, 0);
    b.box(6, 0.18, 4.2, 0xd8ccb4, 0, 0.09, 0);
    ctx.groundMap.addRect(-63, -57, 137.7, 141.9, 0.18);
    ctx.props.setBase(-60, 0, 141.7);
    ctx.props.box(6.4, 1.8, 0.15, 0x1b1f26, 0, 4.2, 0);
    ctx.signs.add(-60, 4.2, 141.6, Math.PI, 6.0, 1.5, SIGN_UV.mansion);

    // Tejado plano con pretil y helipuerto "UB" (se oculta al entrar)
    this.addRoof(ctx, MANSION, (r) => {
      r.setBase((M.minX + M.maxX) / 2, 0, (M.minZ + M.maxZ) / 2);
      r.box(w + 0.8, 0.45, d + 0.8, 0xe9e2d2, 0, WALL_H + 0.2, 0);
      r.box(w + 0.8, 0.8, 0.35, EXT, 0, WALL_H + 0.8, d / 2 + 0.25);
      r.box(w + 0.8, 0.8, 0.35, EXT, 0, WALL_H + 0.8, -d / 2 - 0.25);
      r.box(0.35, 0.8, d + 0.8, EXT, w / 2 + 0.25, WALL_H + 0.8, 0);
      r.box(0.35, 0.8, d + 0.8, EXT, -w / 2 - 0.25, WALL_H + 0.8, 0);
      r.cyl(6, 6, 0.08, 32, GREEN, 8, WALL_H + 0.46, 2);
      r.cyl(5.2, 5.2, 0.1, 32, 0xf2c21c, 8, WALL_H + 0.48, 2, 0, 0, 0, true);
      r.box(1.2, 0.12, 5, 0xf6f2ea, 6.6, WALL_H + 0.5, 2);
      r.box(1.2, 0.12, 5, 0xf6f2ea, 9.4, WALL_H + 0.5, 2);
      r.box(3.4, 0.12, 1.1, 0xf6f2ea, 8, WALL_H + 0.5, 2);
      r.box(4, 1.2, 4, 0xc3c9ce, -14, WALL_H + 1, -6);
    });
  }

  private buildInterior(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const M = MANSION;
    ctx.ground.rect("wood", M.minX + 0.25, M.maxX - 0.25, M.minZ + 0.25, M.maxZ - 0.25);
    ctx.ground.rect("tile", -83.75, -68.25, 142.25, 159.75);

    // Tabiques: dormitorio | trofeos, cocina | recibidor | salón
    addWallWithGaps(b, c, M.minX, 160, M.maxX, 160, [[-73, -69], [-51, -47]], INT, WALL_H - 0.3, 0.35);
    addWallWithGaps(b, c, -60, 160, -60, M.maxZ, [], INT, WALL_H - 0.3, 0.35);
    addWallWithGaps(b, c, -68, M.minZ, -68, 160, [[149, 153]], INT, WALL_H - 0.3, 0.35);
    addWallWithGaps(b, c, -52, M.minZ, -52, 160, [[147, 155]], INT, WALL_H - 0.3, 0.35);

    // --- Dormitorio (inicio del juego)
    b.setBase(-76, 0, 174.5);
    b.box(3.6, 0.5, 4.6, 0x6b3d22, 0, 0.3, 0);
    b.box(3.4, 0.35, 4.4, 0xf6f2ea, 0, 0.72, 0);
    b.box(3.45, 0.14, 2.7, GREEN, 0, 0.94, -0.7);
    b.box(1.3, 0.25, 0.8, 0xf2c21c, -0.8, 1.0, 1.6);
    b.box(1.3, 0.25, 0.8, 0xf2c21c, 0.8, 1.0, 1.6);
    b.box(3.8, 1.8, 0.3, 0xf2c21c, 0, 1.2, 2.35);
    c.push(aabb(-76, 174.8, 3.8, 5.0, 1.2));
    for (const x of [-79.4, -72.6]) {
      b.setBase(x, 0, 176.8);
      b.box(0.9, 0.7, 0.8, 0xe8dcc6, 0, 0.35, 0);
      b.cyl(0.18, 0.25, 0.5, 8, 0xfff1bf, 0, 1.0, 0);
      c.push(aabb(x, 176.8, 0.9, 0.8, 0.8));
    }
    b.setBase(-83.1, 0, 166);
    b.box(1.2, 2.7, 3.2, 0xe8dcc6, 0, 1.35, 0);
    b.box(0.05, 2.4, 0.05, 0x6b3d22, 0.62, 1.35, 0);
    c.push(aabb(-83.1, 166, 1.2, 3.2, 2.7));
    // Cinta de correr (para "entrenar")
    b.setBase(-64, 0, 172);
    b.box(1.1, 0.3, 2.6, 0x2f353c, 0, 0.15, 0);
    b.box(0.9, 0.05, 2.3, 0x14171b, 0, 0.32, 0);
    b.box(0.08, 1.2, 0.08, 0x7b848d, -0.5, 0.9, -1.1);
    b.box(0.08, 1.2, 0.08, 0x7b848d, 0.5, 0.9, -1.1);
    b.box(1.1, 0.3, 0.3, 0x2f353c, 0, 1.5, -1.1);
    c.push(aabb(-64, 172, 1.2, 2.7, 1.5));
    this.rug(ctx, -70, 168, 6, 4.5, 0x2e9a42, 0xf2c21c);
    ctx.signs.add(-76, 3.3, 160.25, 0, 5, 1.25, SIGN_UV.poster);

    // --- Sala de trofeos
    const podium: Array<[number, number, number]> = [
      [-48, 1.4, 174],
      [-51.2, 0.95, 174],
      [-44.8, 0.6, 174],
    ];
    for (const [x, h, z] of podium) {
      b.setBase(x, 0, z);
      b.box(3.1, h, 2.4, x === -48 ? 0xf2c21c : 0xf6f2ea, 0, h / 2, 0);
      this.trophy(b, x, h, z, x === -48 ? 1.3 : 1);
    }
    c.push(aabb(-48, 174, 9.4, 2.4, 1.4));
    for (const z of [164, 168, 172]) {
      b.setBase(-58.4, 0, z);
      b.box(1.0, 1.1, 1.0, 0x1b1f26, 0, 0.55, 0);
      this.trophy(b, -58.4, 1.1, z, 0.8);
      c.push(aabb(-58.4, z, 1.0, 1.0, 1.1));
    }
    b.setBase(-36.9, 0, 168);
    b.box(0.9, 2.2, 7, 0x8fc9e8, 0, 1.1, 0);
    for (const z of [-2.4, -0.8, 0.8, 2.4]) b.cyl(0.3, 0.3, 0.05, 12, GOLD, -0.2, 1.5, z, 0, 0, Math.PI / 2);
    c.push(aabb(-36.9, 168, 0.9, 7, 2.2));
    this.rug(ctx, -48, 167, 7, 5, 0xb5452f, null);
    ctx.signs.add(-48, 3.4, 177.7, Math.PI, 4.4, 1.1, SIGN_UV.plaque);

    // --- Salón: sofá, mesa y tele (anuncio de GasOil en pantalla)
    b.setBase(-44, 0, 151.5);
    b.box(5.2, 0.55, 1.7, 0x2f6fb3, 0, 0.35, 0);
    b.box(5.2, 1.0, 0.45, 0x2f6fb3, 0, 0.9, 0.7);
    b.box(0.45, 0.8, 1.7, 0x285e9a, -2.6, 0.55, 0);
    b.box(0.45, 0.8, 1.7, 0x285e9a, 2.6, 0.55, 0);
    c.push(aabb(-44, 151.6, 5.8, 1.8, 1.1));
    b.setBase(-44, 0, 147.8);
    b.box(2.2, 0.45, 1.1, 0x6b3d22, 0, 0.25, 0);
    c.push(aabb(-44, 147.8, 2.2, 1.1, 0.5));
    b.setBase(-44, 0, 142.6);
    b.box(4.2, 2.3, 0.2, 0x14171b, 0, 2.2, 0);
    b.box(3.0, 0.6, 0.7, 0x2f353c, 0, 0.3, 0.2);
    c.push(aabb(-44, 142.8, 3.0, 0.8, 0.6));
    ctx.gasoil.add(-44, 2.2, 142.72, 0, 3.8, 1.9, GASOIL_UV.ads[3]);
    addBush(b, -38.5, 158.5, 0.6);
    addBush(b, -50.5, 143.8, 0.55);

    // --- Cocina: encimeras, isla y nevera llena de GasOil
    b.setBase(-83.1, 0, 151);
    b.box(1.2, 1.0, 15, 0xf6f2ea, 0, 0.5, 0);
    b.box(1.3, 0.08, 15.1, 0x2f353c, 0, 1.04, 0);
    c.push(aabb(-83.1, 151, 1.2, 15, 1.0));
    b.setBase(-76, 0, 151);
    b.box(4.2, 1.0, 1.8, 0xf6f2ea, 0, 0.5, 0);
    b.box(4.4, 0.08, 2.0, 0xe2a93b, 0, 1.04, 0);
    c.push(aabb(-76, 151, 4.4, 2.0, 1.0));
    b.setBase(-74, 0, 159.2);
    b.box(1.4, 2.4, 0.9, 0xc9d2d9, 0, 1.2, 0);
    c.push(aabb(-74, 159.2, 1.4, 0.9, 2.4));
    // Nevera con latas de GASIL bien a la vista (chiste de la casa)
    ctx.gasoil.add(-74, 1.5, 158.73, Math.PI, 0.55, 0.9, GASOIL_UV.can);

    // --- Recibidor
    this.rug(ctx, -60, 151, 5, 12, 0xb5452f, 0xf2c21c);
    addPlanter(b, c, -66.4, 143.6);
    addPlanter(b, c, -53.6, 143.6);
  }

  /** Alfombra: se dibuja y registra su cara superior como suelo caminable. */
  private rug(ctx: ZoneContext, x: number, z: number, w: number, d: number, color: number, inner: number | null): void {
    const top = 0.07;
    ctx.props.setBase(x, 0, z);
    ctx.props.box(w, 0.02, d, color, 0, top - 0.01, 0);
    ctx.groundMap.addRect(x - w / 2, x + w / 2, z - d / 2, z + d / 2, top);
    if (inner !== null) {
      ctx.props.box(w - 0.6, 0.006, d - 0.6, inner, 0, top + 0.003, 0);
      ctx.groundMap.addRect(x - w / 2 + 0.3, x + w / 2 - 0.3, z - d / 2 + 0.3, z + d / 2 - 0.3, top + 0.006);
    }
  }

  private trophy(b: StaticBatcher, x: number, baseY: number, z: number, s: number): void {
    b.setBase(x, baseY, z, 0, s);
    b.box(0.5, 0.2, 0.5, 0x2f353c, 0, 0.1, 0);
    b.cyl(0.08, 0.12, 0.4, 8, GOLD, 0, 0.4, 0);
    b.cyl(0.35, 0.12, 0.55, 12, GOLD, 0, 0.87, 0);
    b.box(0.08, 0.3, 0.08, GOLD, 0.38, 0.9, 0);
    b.box(0.08, 0.3, 0.08, GOLD, -0.38, 0.9, 0);
  }

  private buildGarage(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    const G = GARAGE;
    const h = 4.6;
    addWallWithGaps(b, c, G.minX, G.minZ, G.maxX, G.minZ, [[-30, -20]], EXT, h);
    addWallWithGaps(b, c, G.minX, G.maxZ, G.maxX, G.maxZ, [], EXT, h);
    addWallWithGaps(b, c, G.minX, G.minZ, G.minX, G.maxZ, [], EXT, h);
    addWallWithGaps(b, c, G.maxX, G.minZ, G.maxX, G.maxZ, [], EXT, h);
    ctx.ground.rect("asphalt", G.minX + 0.25, G.maxX - 0.25, G.minZ + 0.25, G.maxZ - 0.25, 0.04);
    ctx.ground.rect("asphalt", -30, -20, 124, 140);
    b.setBase(-25, 0, G.minZ);
    b.box(10.4, 0.5, 0.4, 0xff7a1a, 0, 3.6, -0.3);
    b.box(10.2, 0.8, 0.2, 0x7b848d, 0, 3.0, 0.1);
    ctx.props.box(6.4, 1.8, 0.15, 0x1b1f26, 0, 4.25, -0.35);
    ctx.signs.add(-25, 4.25, G.minZ - 0.45, Math.PI, 6, 1.5, SIGN_UV.taller);

    // El coche ya no es decorado: lo coloca VehicleManager en GARAGE_SLOTS.
    b.setBase(-17.1, 0, 150);
    b.box(1.1, 1.0, 5, 0x6b3d22, 0, 0.5, 0);
    b.box(0.1, 1.6, 5, 0x7b848d, 0.45, 1.8, 0);
    b.box(0.6, 0.35, 0.8, 0xd8322b, -0.1, 1.2, -1.5);
    c.push(aabb(-17.1, 150, 1.1, 5, 1.2));
    for (let i = 0; i < 4; i++) {
      b.setBase(-32.6, 0, 145 + (i % 2) * 1.2);
      b.cyl(0.45, 0.45, 0.3, 12, 0x1c1f24, 0, 0.15 + Math.floor(i / 2) * 0.32, 0);
    }
    c.push(aabb(-32.6, 145.6, 1.0, 2.2, 0.8));
    b.setBase(-32.9, 0, 153);
    b.box(0.7, 2.6, 4, 0x2f353c, 0, 1.3, 0);
    c.push(aabb(-32.9, 153, 0.7, 4, 2.6));

    this.addRoof(ctx, GARAGE, (r) => {
      r.setBase(-25, 0, (G.minZ + G.maxZ) / 2);
      r.box(G.maxX - G.minX + 0.8, 0.4, G.maxZ - G.minZ + 0.8, 0x8d9297, 0, h + 0.2, 0);
    });
  }

  private buildGarden(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;
    ctx.ground.rect("plaza", -62, -58, 125, 137.5);
    ctx.map.area("plaza", -62, -58, 125, 142);
    for (const [x, z] of [
      [-70, 131],
      [-50, 131],
      [-80, 134],
      [-40, 134],
      [-100, 132],
      [-96, 186],
      [-20, 186],
    ] as Array<[number, number]>) {
      ctx.trees.add(c, x, z, 1.2);
    }
    for (const x of [-66, -54]) {
      for (const z of [127, 130.5, 134]) addBush(b, x, z, 0.55, 0x4fae4c);
    }

    // Piscina con tumbonas
    const P: Rect = { minX: -112, maxX: -92, minZ: 148, maxZ: 172 };
    b.setBase((P.minX + P.maxX) / 2, 0, (P.minZ + P.maxZ) / 2);
    b.box(P.maxX - P.minX + 1.6, 0.4, 0.8, 0xe8e2d6, 0, 0.2, (P.maxZ - P.minZ) / 2 + 0.4);
    b.box(P.maxX - P.minX + 1.6, 0.4, 0.8, 0xe8e2d6, 0, 0.2, -(P.maxZ - P.minZ) / 2 - 0.4);
    b.box(0.8, 0.4, P.maxZ - P.minZ, 0xe8e2d6, (P.maxX - P.minX) / 2 + 0.4, 0.2, 0);
    b.box(0.8, 0.4, P.maxZ - P.minZ, 0xe8e2d6, -(P.maxX - P.minX) / 2 - 0.4, 0.2, 0);
    const water = new THREE.PlaneGeometry(P.maxX - P.minX, P.maxZ - P.minZ);
    water.rotateX(-Math.PI / 2);
    water.translate((P.minX + P.maxX) / 2, 0, (P.minZ + P.maxZ) / 2);
    addWater(ctx, water, 0.3, 4);
    c.push(aabb((P.minX + P.maxX) / 2, (P.minZ + P.maxZ) / 2, P.maxX - P.minX + 1.6, P.maxZ - P.minZ + 1.6, 0.5));
    ctx.map.area("water", P.minX, P.maxX, P.minZ, P.maxZ);
    for (const z of [154, 160, 166]) {
      b.setBase(-88.5, 0, z, Math.PI / 2);
      b.box(0.8, 0.35, 2.0, 0xf6f2ea, 0, 0.35, 0);
      b.box(0.8, 0.6, 0.5, 0xf6f2ea, 0, 0.65, -0.85, -0.5, 0, 0);
      b.box(0.82, 0.08, 1.6, 0x5bc0eb, 0, 0.56, 0.1);
      c.push(aabb(-88.5, z, 2.0, 0.9, 0.7));
    }
  }
}
