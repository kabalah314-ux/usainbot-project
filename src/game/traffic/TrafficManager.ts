import * as THREE from "three";
import { StaticBatcher } from "../utils/StaticBatcher";
import { toon } from "../utils/materials";
import { addCar } from "../world/Props";
import type { Collider } from "../world/colliders";
import type { GroundQuery } from "../world/GroundMap";
import { GASOIL_BRAND } from "../data/cityLayout";
import { lifeSettings } from "../data/life";
import { ROUTE_DEFS, buildRoute } from "./TrafficRoutes";
import type { TrafficRoute } from "./TrafficRoutes";

const COLORS = [0xd64545, 0x2f6fb3, 0xf6f2ea, 0x2e9a42, 0x7d3c98, 0x1b1f26, 0xff8c42, 0x4ecdc4, 0xef7db5];
type Style = "sedan" | "van" | "robotaxi";

export interface TrafficCar {
  id: number;
  route: TrafficRoute;
  s: number;
  speed: number;
  active: boolean;
  mesh: THREE.Mesh;
  collider: Collider;
  yaw: number;
  /** Segundos bloqueado por algo delante. */
  blocked: number;
  blockedBy: TrafficCar | null;
  /** Ignora a otros coches un momento (desatasca cruces). */
  ghost: number;
  /** Avería (evento): parado con humo. */
  broken: number;
  hornCooldown: number;
  style: Style;
}

export interface TrafficContext {
  player: THREE.Vector3;
  /** Posición del coche del jugador (si lo conduce o está aparcado cerca). */
  playerCar: THREE.Vector3 | null;
  /** Peatones y NPCs visibles (para frenar ante ellos). */
  walkers: readonly THREE.Vector3[];
  camera: THREE.Camera;
  onHorn(car: TrafficCar): void;
  onBrokenPuff(car: TrafficCar): void;
}

const tmpF = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const frustum = new THREE.Frustum();
const projScreen = new THREE.Matrix4();
const sphere = new THREE.Sphere(new THREE.Vector3(), 3);

/**
 * Tráfico sencillo y ligero:
 * - Cada coche sigue un bucle por su carril (s = distancia recorrida).
 * - Frena ante coches, peatones o el jugador que tenga delante (cono de visión).
 * - Cruces sin semáforos: si dos coches se bloquean mutuamente, uno cede.
 * - Pool fijo: aparece/desaparece solo fuera de cámara o lejos (sin "pop").
 * - Lejos del jugador: lógica reducida (sin detección de obstáculos).
 * Cada coche = 1 malla con color por vértice y un material compartido.
 */
export class TrafficManager {
  readonly group = new THREE.Group();
  readonly cars: TrafficCar[] = [];
  /** Colisiones de los coches activos (referencias vivas para jugador y BOLT-MOBILE). */
  readonly colliders: Collider[] = [];
  /** Fracción del pool en circulación (hora del día). */
  density = 1;
  private routes: TrafficRoute[];
  private ground: GroundQuery;

  constructor(root: THREE.Object3D, ground: GroundQuery) {
    this.ground = ground;
    root.add(this.group);
    this.routes = ROUTE_DEFS.map((d) => buildRoute(d, lifeSettings.carCruise, lifeSettings.carCornerSpeed));
    const material = toon({ vertexColors: true });
    const styles: Style[] = ["sedan", "sedan", "van", "robotaxi"];
    for (let i = 0; i < lifeSettings.maxTrafficCars; i++) {
      const route = this.routes[i % this.routes.length];
      const style = styles[i % styles.length];
      const mesh = this.buildMesh(style, COLORS[i % COLORS.length], material);
      mesh.visible = false;
      this.group.add(mesh);
      const collider: Collider = { min: new THREE.Vector3(0, -50, 0), max: new THREE.Vector3(0, -49, 0) };
      this.colliders.push(collider);
      const perRoute = Math.ceil(lifeSettings.maxTrafficCars / this.routes.length);
      const s = (Math.floor(i / this.routes.length) / perRoute) * route.length;
      this.cars.push({ id: i, route, s, speed: 0, active: false, mesh, collider, yaw: 0, blocked: 0, blockedBy: null, ghost: 0, broken: 0, hornCooldown: 0, style });
    }
  }

  get activeCount(): number {
    return this.cars.filter((c) => c.active).length;
  }

  /** Avería (evento ambiental). */
  breakDown(car: TrafficCar, seconds: number): void {
    car.broken = seconds;
    car.speed = 0;
  }

  /** Coche activo al azar entre min y max metros (eventos). */
  pick(from: THREE.Vector3, min: number, max: number): TrafficCar | null {
    const list = this.cars.filter((c) => c.active && c.broken <= 0 && c.mesh.position.distanceTo(from) >= min && c.mesh.position.distanceTo(from) <= max);
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  update(dt: number, ctx: TrafficContext): void {
    projScreen.multiplyMatrices(ctx.camera.projectionMatrix, ctx.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreen);
    const target = Math.round(this.cars.length * this.density);
    let active = this.activeCount;

    for (const car of this.cars) {
      const pos = this.sample(car.route, car.s, car.mesh.position);
      const dist = Math.hypot(pos.x - ctx.player.x, pos.z - ctx.player.z);
      sphere.center.copy(pos);
      const onScreen = frustum.intersectsSphere(sphere);

      // --- Aparecer / desaparecer de forma controlada (fuera de cámara o lejos)
      if (!car.active) {
        car.s = (car.s + lifeSettings.carCruise * dt) % car.route.length; // "circula" sin dibujarse
        if (active < target && (dist > lifeSettings.carSpawnMin || !onScreen) && dist > 25 && this.laneFree(car)) {
          car.active = true;
          car.speed = lifeSettings.carCruise * 0.6;
          active++;
        } else continue;
      } else if ((dist > lifeSettings.carDespawn || (active > target && dist > lifeSettings.carSpawnMin)) && !onScreen) {
        this.deactivate(car);
        active--;
        continue;
      }

      // --- Velocidad deseada
      car.hornCooldown = Math.max(0, car.hornCooldown - dt);
      car.ghost = Math.max(0, car.ghost - dt);
      let want = this.maxSpeedAt(car);
      if (car.broken > 0) {
        car.broken -= dt;
        want = 0;
        if (Math.random() < dt * 3) ctx.onBrokenPuff(car);
      } else if (dist < lifeSettings.carLogicRadius) {
        want = Math.min(want, this.obstacleLimit(car, ctx));
      } else {
        car.blocked = 0;
      }
      const accel = want > car.speed ? 4 : 9;
      car.speed += Math.sign(want - car.speed) * Math.min(Math.abs(want - car.speed), accel * dt);
      car.s = (car.s + car.speed * dt) % car.route.length;

      // --- Colocar malla y colisión
      this.sample(car.route, car.s, car.mesh.position);
      car.mesh.position.y = this.ground(car.mesh.position.x, car.mesh.position.z, 0.3);
      const ahead = this.sample(car.route, (car.s + 2.2) % car.route.length, tmpD);
      const behind = this.sample(car.route, (car.s - 2.2 + car.route.length) % car.route.length, tmpF);
      car.yaw = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
      car.mesh.rotation.y = car.yaw;
      car.mesh.visible = true;
      this.syncCollider(car);
    }
  }

  private deactivate(car: TrafficCar): void {
    car.active = false;
    car.mesh.visible = false;
    car.blocked = 0;
    car.broken = 0;
    car.collider.min.set(0, -50, 0);
    car.collider.max.set(0, -49, 0);
  }

  /** No aparece encima de otro coche. */
  private laneFree(car: TrafficCar): boolean {
    const p = car.mesh.position;
    return !this.cars.some((o) => o !== car && o.active && o.mesh.position.distanceTo(p) < 9);
  }

  private maxSpeedAt(car: TrafficCar): number {
    const r = car.route;
    // índice del punto por delante (búsqueda binaria en las distancias acumuladas)
    let lo = 0;
    let hi = r.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (r.cum[mid] < car.s) lo = mid + 1;
      else hi = mid;
    }
    // Anticipa la curva: mira 2 puntos por delante
    const a = r.maxSpeed[lo % r.points.length];
    const b = r.maxSpeed[(lo + 1) % r.points.length];
    return Math.min(a, b + 2.5);
  }

  /** Frena ante lo que tenga delante (cono de ±1,8 m de ancho). */
  private obstacleLimit(car: TrafficCar, ctx: TrafficContext): number {
    const p = car.mesh.position;
    const f = tmpF.set(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    let limit = Infinity;
    let blocker: TrafficCar | null = null;
    let byPlayer = false;
    const test = (x: number, z: number, radius: number): number => {
      const dx = x - p.x;
      const dz = z - p.z;
      const along = dx * f.x + dz * f.z;
      if (along <= 0 || along > lifeSettings.carLookAhead) return Infinity;
      const lateral = Math.abs(dx * f.z - dz * f.x);
      if (lateral > 1.6 + radius) return Infinity;
      return Math.max(0, (along - 3.2 - radius) * 1.3);
    };
    for (const o of this.cars) {
      if (o === car || !o.active || car.ghost > 0) continue;
      const l = test(o.mesh.position.x, o.mesh.position.z, 1.0);
      if (l < limit) {
        limit = l;
        blocker = o;
      }
    }
    for (const w of ctx.walkers) limit = Math.min(limit, test(w.x, w.z, 0.4));
    const lp = test(ctx.player.x, ctx.player.z, 0.5);
    if (lp < limit) {
      limit = lp;
      byPlayer = true;
    }
    if (ctx.playerCar) {
      const lc = test(ctx.playerCar.x, ctx.playerCar.z, 1.1);
      if (lc < limit) {
        limit = lc;
        byPlayer = true;
      }
    }
    // Bloqueos
    if (limit < 0.5) {
      car.blocked += 1 / 60;
      car.blockedBy = blocker;
      // Atasco mutuo en un cruce: este coche cede y el otro pasa "fantasma" un momento
      if (blocker && car.blocked > 3 && blocker.blockedBy === car) {
        blocker.ghost = 2.2;
        car.blocked = 0;
      }
      if (byPlayer && car.blocked > 2.2 && car.hornCooldown <= 0) {
        car.hornCooldown = 7;
        ctx.onHorn(car);
      }
    } else {
      car.blocked = 0;
      car.blockedBy = null;
    }
    return limit;
  }

  private sample(route: TrafficRoute, s: number, out: THREE.Vector3): THREE.Vector3 {
    let lo = 0;
    let hi = route.points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (route.cum[mid] <= s) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(0, lo - 1);
    const a = route.points[i % route.points.length];
    const b = route.points[(i + 1) % route.points.length];
    const seg = route.cum[i + 1] - route.cum[i] || 1;
    const t = (s - route.cum[i]) / seg;
    return out.set(a[0] + (b[0] - a[0]) * t, out.y, a[1] + (b[1] - a[1]) * t);
  }

  private syncCollider(car: TrafficCar): void {
    const p = car.mesh.position;
    const c = Math.abs(Math.cos(car.yaw));
    const s = Math.abs(Math.sin(car.yaw));
    const hw = (1.95 * c + 4.2 * s) / 2;
    const hd = (1.95 * s + 4.2 * c) / 2;
    car.collider.min.set(p.x - hw, 0, p.z - hd);
    car.collider.max.set(p.x + hw, 1.5, p.z + hd);
  }

  /** Coche low poly (1 malla). Robotaxi con rótulo GasOil en el techo. */
  private buildMesh(style: Style, color: number, material: THREE.Material): THREE.Mesh {
    const b = new StaticBatcher();
    if (style === "van") {
      b.setBase(0, 0, 0);
      b.box(2.0, 1.7, 4.4, color, 0, 1.2, -0.1);
      b.box(1.9, 0.8, 1.0, color, 0, 0.75, 2.5);
      b.box(1.85, 0.7, 0.1, 0x9fd3ec, 0, 1.55, 2.01, 0.25, 0, 0);
      b.box(2.02, 0.35, 3.2, 0xf6f2ea, 0, 1.2, -0.4);
      for (const [x, z] of [[0.9, 1.9], [-0.9, 1.9], [0.9, -1.5], [-0.9, -1.5]] as const) {
        b.cyl(0.4, 0.4, 0.3, 12, 0x1c1f24, x, 0.4, z, 0, 0, Math.PI / 2);
      }
    } else {
      addCar(b, [], 0, 0, 0, style === "robotaxi" ? GASOIL_BRAND.yellow : color);
      if (style === "robotaxi") {
        b.setBase(0, 0, 0);
        b.box(0.9, 0.3, 0.5, GASOIL_BRAND.orange, 0, 1.65, -0.2);
        b.box(0.92, 0.1, 0.52, GASOIL_BRAND.charcoal, 0, 1.52, -0.2);
        b.box(1.84, 0.12, 0.5, GASOIL_BRAND.charcoal, 0, 0.62, 0);
      }
    }
    const mesh = b.build(material, true, false) as THREE.Mesh;
    mesh.matrixAutoUpdate = true;
    return mesh;
  }
}
