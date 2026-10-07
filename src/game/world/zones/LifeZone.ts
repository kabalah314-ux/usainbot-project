import * as THREE from "three";
import { aabb } from "../colliders";
import { addBench, addCar } from "../Props";
import { localToWorld } from "../cityProps";
import { GASOIL_UV } from "../../gasoil/branding";
import { GASOIL_BRAND } from "../../data/cityLayout";
import { sharedUniforms, toon } from "../../utils/materials";
import { DustSystem } from "../../effects/DustSystem";
import type { Rect, Zone, ZoneContext } from "./Zone";

const CAR_COLORS = [0xd64545, 0x2f6fb3, 0xf6f2ea, 0x2e9a42, 0x7d3c98, 0x1b1f26, 0xff8c42, 0x4ecdc4];

/** Coches aparcados en batería junto al bordillo [x, z, rotY]. Fuera de carriles y carreras. */
const PARKED: Array<[number, number, number]> = [
  // Avenida Bolt (carril de aparcamiento a ±6 m)
  [-6, 64, 0], [-6, 88, Math.PI], [6, 84, 0], [6, 96, Math.PI], [6, -50, 0], [6, -66, Math.PI],
  // Calle Gasolina
  [-88, 50.1, Math.PI / 2], [-70, 50.1, -Math.PI / 2], [-52, 50.1, Math.PI / 2], [30, 39.9, -Math.PI / 2], [76, 39.9, Math.PI / 2],
  // Calle Residencial
  [40, 109.9, Math.PI / 2], [56, 109.9, -Math.PI / 2], [88, 109.9, Math.PI / 2],
  // Calle del Parque
  [-70, -89.9, Math.PI / 2], [-52, -89.9, -Math.PI / 2], [40, -89.9, Math.PI / 2], [60, -89.9, Math.PI / 2], [80, -89.9, -Math.PI / 2],
];

/** Carteles GasOil en fachadas [x, y, z, rotY, ancho, anuncio]. */
const POSTERS: Array<[number, number, number, number, number, number]> = [
  [-12.94, 2.4, -1, Math.PI / 2, 3, 0], // Robo-Burger (lado avenida)
  [-41.94, 2.4, 0, Math.PI / 2, 3, 2], // callejón: HUMANS DON'T NEED THIS
  [-11.94, 6.5, 64.5, Math.PI / 2, 7, 1], // bloque de pisos: RUN FURTHER
  [-11.94, 2.4, 30.5, Math.PI / 2, 2.8, 3], // junto a la farmacia
  [-100.06, 3, -5, -Math.PI / 2, 4, 0], // Súper 24H (Calle Oeste)
];

/** Guirnaldas de banderines [desde, hasta] (x, y, z). */
const BUNTING: Array<[[number, number, number], [number, number, number]]> = [
  [[18, 6.5, 55.2], [60, 6.5, 55.2]], // entrada de la gasolinera
  [[-6, 4.6, -112], [6, 4.6, -112]], // camino del parque
  [[-37, 5, 79], [-13, 5, 104]], // plaza vecinal
];

/** Ventiladores de azotea [x, y, z]. */
const FANS: Array<[number, number, number]> = [
  [72, 5.4, 64], [88, 5.4, 72], [40, 7.2, 26], [80, 7.2, 28], [-30, 22.2, 60],
];

const BIRD_SPOTS: Array<[number, number, number]> = [
  // [centro x, centro z, radio] · palomas del parque y de la plaza vecinal
  [0, -140, 9], [-24, 92, 5],
];

interface Bird {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  state: "idle" | "fly" | "gone";
  t: number;
  phase: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Vida ambiental del barrio. Estático (va a los lotes: 0 draw calls extra) +
 * animado ligero (1 draw call por sistema, instanciado):
 * banderines, ventiladores, hojas/papeles, palomas y humo de chimenea.
 */
export class LifeZone implements Zone {
  readonly id = "life";
  readonly name = "Vida del barrio";
  readonly bounds: Rect;
  private flags: THREE.InstancedMesh | null = null;
  private fans: THREE.InstancedMesh | null = null;
  private leaves: THREE.InstancedMesh | null = null;
  private leafState: Array<{ p: THREE.Vector3; spin: THREE.Vector3; rot: THREE.Euler; phase: number }> = [];
  private birds: THREE.InstancedMesh | null = null;
  private birdState: Bird[] = [];
  private smoke = new DustSystem(24, new THREE.MeshBasicMaterial({ color: 0xcfcac2, transparent: true, opacity: 0.6, depthWrite: false }));
  private smokeT = 0;
  private time = 0;
  private lastPlayer = new THREE.Vector3();
  /** Velocidad aproximada del jugador (para asustar a las palomas). */
  private playerSpeed = 0;

  constructor(bounds: Rect) {
    this.bounds = bounds;
  }

  build(ctx: ZoneContext): void {
    const b = ctx.props;
    const c = ctx.colliders;

    // --- Coches aparcados (decoración, con colisión)
    PARKED.forEach(([x, z, r], i) => addCar(b, c, x, z, r, CAR_COLORS[i % CAR_COLORS.length]));
    // El que aparca mal (ocupa dos plazas en el parking de la galería)
    addCar(b, c, 80, 3.2, 0.5, 0xf2c21c);

    // --- Carteles GasOil en fachadas
    for (const [x, y, z, rot, w, ad] of POSTERS) {
      b.setBase(x, 0, z, rot);
      b.box(w + 0.25, w / 2 + 0.25, 0.08, GASOIL_BRAND.charcoal, 0, y, -0.05);
      const [px, pz] = localToWorld(x, z, rot, 0, 0.0);
      ctx.gasoil.add(px, y, pz, rot, w, w / 2, GASOIL_UV.ads[ad]);
    }

    // --- Parada de autobús con anuncio (Avenida Bolt, acera oeste)
    b.setBase(-10.35, 0, 30, Math.PI / 2);
    b.box(4.2, 2.6, 0.12, 0x2f353c, 0, 1.3, 0); // panel trasero
    b.box(4.6, 0.12, 1.5, 0x2f353c, 0, 2.7, 0.65); // techo
    b.box(0.1, 2.7, 0.1, 0x7b848d, -2.2, 1.35, 1.3);
    b.box(0.1, 2.7, 0.1, 0x7b848d, 2.2, 1.35, 1.3);
    b.box(1.9, 0.5, 0.1, 0x2e9a42, 0, 2.95, 1.35);
    ctx.gasoil.add(-10.27, 1.45, 31.1, Math.PI / 2, 1.8, 0.9, GASOIL_UV.ads[2]);
    ctx.gasoil.add(-10.27, 1.45, 28.9, Math.PI / 2, 1.8, 0.9, GASOIL_UV.ads[0]);
    addBench(b, c, -9.8, 30, Math.PI / 2);
    c.push(aabb(-10.35, 30, 0.3, 4.2, 2.6));

    // --- Terraza del Café Meteoro (galería)
    for (const [x, color] of [[72, GASOIL_BRAND.orange], [79, 0x2e9a42]] as Array<[number, number]>) {
      b.setBase(x, 0, 12.4);
      b.cyl(0.45, 0.45, 0.06, 12, 0xf6f2ea, 0, 0.75, 0);
      b.cyl(0.05, 0.08, 0.75, 6, 0x2f353c, 0, 0.37, 0);
      b.cyl(0.03, 0.03, 2.2, 6, 0x7b848d, 0, 1.4, 0);
      b.cyl(0.05, 1.4, 0.45, 8, color, 0, 2.4, 0);
      for (const s of [-1, 1]) {
        b.box(0.42, 0.06, 0.42, 0x6b3d22, s * 0.85, 0.45, 0);
        b.box(0.42, 0.45, 0.06, 0x6b3d22, s * 0.85, 0.7, s * 0.2);
      }
      c.push(aabb(x, 12.4, 2.2, 1.0, 0.9));
    }

    // --- Chimenea del Robo-Burger (humea)
    b.setBase(-18, 14, -1);
    b.box(1, 2, 1, 0x7a4b2a, 0, 1, 0);
    b.box(1.2, 0.2, 1.2, 0x3a2a1f, 0, 2.05, 0);
    this.smoke.gravity = -0.8;
    ctx.group.add(this.smoke.mesh);

    this.buildBunting(ctx);
    this.buildFans(ctx);
    this.buildLeaves(ctx);
    this.buildBirds(ctx);
  }

  /** Banderines ondeando (shader) sobre cuerdas con catenaria. */
  private buildBunting(ctx: ZoneContext): void {
    const b = ctx.props;
    const placements: Array<{ p: THREE.Vector3; yaw: number; color: THREE.Color }> = [];
    const palette = [GASOIL_BRAND.orange, GASOIL_BRAND.yellow, 0x2e9a42, 0xf6f2ea, 0x2f6fb3].map((c) => new THREE.Color(c));
    for (const [a, z] of BUNTING) {
      const A = new THREE.Vector3(...a);
      const B = new THREE.Vector3(...z);
      const len = A.distanceTo(B);
      const yaw = Math.atan2(B.x - A.x, B.z - A.z);
      // Postes en los extremos
      for (const end of [A, B]) {
        b.setBase(end.x, 0, end.z);
        b.cyl(0.07, 0.09, end.y + 0.3, 8, 0x2f353c, 0, (end.y + 0.3) / 2, 0);
        ctx.colliders.push(aabb(end.x, end.z, 0.25, 0.25, end.y));
      }
      // Cuerda (4 tramos con caída) y banderines
      const sag = Math.min(1.2, len * 0.04);
      const at = (t: number): THREE.Vector3 => new THREE.Vector3().lerpVectors(A, B, t).setY(A.y + (B.y - A.y) * t - sag * 4 * t * (1 - t));
      for (let i = 0; i < 4; i++) {
        const p0 = at(i / 4);
        const p1 = at((i + 1) / 4);
        const mid = p0.clone().add(p1).multiplyScalar(0.5);
        const pitch = Math.atan2(p1.y - p0.y, Math.hypot(p1.x - p0.x, p1.z - p0.z));
        b.setBase(mid.x, 0, mid.z, yaw);
        b.box(0.03, 0.03, p0.distanceTo(p1), 0x1b1f26, 0, mid.y, 0, -pitch, 0, 0);
      }
      const n = Math.floor(len / 0.8);
      for (let i = 1; i < n; i++) placements.push({ p: at(i / n), yaw: yaw + Math.PI / 2, color: palette[i % palette.length] });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.2, 0, 0, 0.2, 0, 0, 0, -0.45, 0], 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const mat = toon({ color: 0xffffff, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sharedUniforms.uTime;
      shader.vertexShader =
        "uniform float uTime;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float fphase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3;
          transformed.z += sin(uTime * 6.0 + fphase) * 0.12 * (-position.y) / 0.45;`
        );
    };
    mat.customProgramCacheKey = () => "ub-flag";
    const flags = new THREE.InstancedMesh(geo, mat, placements.length);
    placements.forEach((f, i) => {
      tmpQ.setFromAxisAngle(UP, f.yaw);
      tmpM.compose(f.p, tmpQ, tmpS.set(1, 1, 1));
      flags.setMatrixAt(i, tmpM);
      flags.setColorAt(i, f.color);
    });
    flags.computeBoundingSphere();
    ctx.group.add(flags);
    this.flags = flags;
  }

  private buildFans(ctx: ZoneContext): void {
    const b = ctx.props;
    for (const [x, y, z] of FANS) {
      b.setBase(x, y, z);
      b.box(1.6, 0.5, 1.6, 0xc3c9ce, 0, 0.25, 0);
      b.cyl(0.7, 0.7, 0.08, 16, 0x5a636d, 0, 0.52, 0);
    }
    // Cada ventilador = 2 instancias del aspa giradas 90° (una cruz)
    const blade = new THREE.BoxGeometry(1.25, 0.04, 0.22);
    const fans = new THREE.InstancedMesh(blade, toon({ color: 0x2f353c }), FANS.length * 2);
    fans.frustumCulled = false;
    ctx.group.add(fans);
    this.fans = fans;
  }

  private buildLeaves(ctx: ZoneContext): void {
    const n = 36;
    const geo = new THREE.PlaneGeometry(0.22, 0.16);
    const leaves = new THREE.InstancedMesh(geo, toon({ color: 0xffffff, side: THREE.DoubleSide }), n);
    const colors = [0x8fbf4a, 0xd9a13b, 0xc0662e, 0xf6f2ea, 0xf6f2ea].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      this.leafState.push({
        p: new THREE.Vector3((Math.random() - 0.5) * 60, Math.random() * 1.2, (Math.random() - 0.5) * 60),
        spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
        rot: new THREE.Euler(),
        phase: Math.random() * 10,
      });
      leaves.setColorAt(i, colors[i % colors.length]);
    }
    leaves.frustumCulled = false;
    ctx.group.add(leaves);
    this.leaves = leaves;
  }

  private buildBirds(ctx: ZoneContext): void {
    const body = new THREE.BoxGeometry(0.18, 0.14, 0.3);
    body.translate(0, 0.1, 0);
    const head = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    head.translate(0, 0.2, 0.15);
    const wings = new THREE.BoxGeometry(0.46, 0.03, 0.14);
    wings.translate(0, 0.14, 0);
    const parts = [body, head, wings].map((g) => g.toNonIndexed());
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const nor: number[] = [];
    for (const g of parts) {
      pos.push(...(g.getAttribute("position").array as Float32Array));
      nor.push(...(g.getAttribute("normal").array as Float32Array));
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    let count = 0;
    for (const [, , r] of BIRD_SPOTS) count += r > 6 ? 10 : 6;
    const birds = new THREE.InstancedMesh(geo, toon({ color: 0x8e96a0 }), count);
    for (const [cx, cz, r] of BIRD_SPOTS) {
      const n = r > 6 ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = r * (0.55 + Math.random() * 0.45);
        const home = new THREE.Vector3(cx + Math.cos(a) * d, 0.03, cz + Math.sin(a) * d);
        this.birdState.push({ home, pos: home.clone(), vel: new THREE.Vector3(), yaw: Math.random() * 6, state: "idle", t: 0, phase: Math.random() * 10 });
      }
    }
    birds.castShadow = true;
    birds.frustumCulled = false;
    ctx.group.add(birds);
    this.birds = birds;
  }

  update(dt: number, player: THREE.Vector3): void {
    this.time += dt;
    const moved = player.distanceTo(this.lastPlayer);
    this.playerSpeed = dt > 0 && moved < 5 ? moved / dt : 0;
    this.lastPlayer.copy(player);

    // Ventiladores (5 instancias × 2 aspas)
    if (this.fans) {
      FANS.forEach(([x, y, z], i) => {
        for (let k = 0; k < 2; k++) {
          tmpQ.setFromAxisAngle(UP, this.time * 7 + i + (k * Math.PI) / 2);
          this.fans?.setMatrixAt(i * 2 + k, tmpM.compose(tmpP.set(x, y + 0.6, z), tmpQ, tmpS.set(1, 1, 1)));
        }
      });
      this.fans.instanceMatrix.needsUpdate = true;
    }

    // Hojas y papeles: flotan con el viento alrededor del jugador (se reciclan)
    if (this.leaves) {
      const wind = 1.4 + Math.sin(this.time * 0.3) * 0.8;
      this.leafState.forEach((l, i) => {
        l.p.x += wind * dt;
        l.p.z += Math.sin(this.time * 0.7 + l.phase) * 0.6 * dt;
        l.p.y = 0.1 + Math.abs(Math.sin(this.time * 1.3 + l.phase)) * (0.4 + (i % 3) * 0.3);
        if (l.p.x > 30) l.p.x -= 60;
        if (l.p.z > 30) l.p.z -= 60;
        if (l.p.z < -30) l.p.z += 60;
        l.rot.set(this.time * l.spin.x, this.time * l.spin.y, this.time * l.spin.z);
        tmpQ.setFromEuler(l.rot);
        tmpP.set(player.x + l.p.x, l.p.y, player.z + l.p.z);
        this.leaves?.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS.set(1, 1, 1)));
      });
      this.leaves.instanceMatrix.needsUpdate = true;
    }

    // Palomas: picotean; si pasas corriendo cerca, salen volando y vuelven luego
    if (this.birds) {
      this.birdState.forEach((bd, i) => {
        const d = Math.hypot(player.x - bd.pos.x, player.z - bd.pos.z);
        if (bd.state === "idle") {
          if (d < 5.5 && this.playerSpeed > 2.5) {
            bd.state = "fly";
            bd.t = 0;
            const away = tmpP.set(bd.pos.x - player.x, 0, bd.pos.z - player.z).normalize();
            bd.vel.set(away.x * 5 + (Math.random() - 0.5) * 2, 4 + Math.random() * 2, away.z * 5 + (Math.random() - 0.5) * 2);
            bd.yaw = Math.atan2(bd.vel.x, bd.vel.z);
          } else if (Math.sin(this.time * 0.8 + bd.phase) > 0.97) {
            bd.yaw += dt * 3;
          }
        } else if (bd.state === "fly") {
          bd.t += dt;
          bd.vel.y += 1.5 * dt;
          bd.pos.addScaledVector(bd.vel, dt);
          if (bd.t > 4) {
            bd.state = "gone";
            bd.t = 0;
          }
        } else {
          bd.t += dt;
          if (bd.t > 20 && d > 25) {
            bd.state = "idle";
            bd.pos.copy(bd.home);
          }
        }
        const peck = bd.state === "idle" ? Math.max(0, Math.sin(this.time * 5 + bd.phase * 3)) * 0.3 : 0;
        const flap = bd.state === "fly" ? 0.4 + Math.abs(Math.sin(this.time * 22 + bd.phase)) * 0.9 : 1;
        tmpQ.setFromEuler(new THREE.Euler(peck, bd.yaw, 0));
        const scale = bd.state === "gone" ? 0.0001 : 1;
        this.birds?.setMatrixAt(i, tmpM.compose(bd.pos, tmpQ, tmpS.set(scale, scale * flap, scale)));
      });
      this.birds.instanceMatrix.needsUpdate = true;
    }

    // Humo de la chimenea (solo si estás cerca)
    this.smokeT += dt;
    if (this.smokeT > 0.3 && Math.hypot(player.x + 18, player.z + 1) < 90) {
      this.smokeT = 0;
      this.smoke.emit(tmpP.set(-18, 16.1, -1), 1, 0.3, 1.1, 0.35);
    }
    this.smoke.update(dt);
    void this.flags;
  }
}
