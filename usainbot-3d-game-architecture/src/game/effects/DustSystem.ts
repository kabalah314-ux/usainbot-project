import * as THREE from "three";
import { toon } from "../utils/materials";

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Nubecillas de polvo (pasos, saltos, aterrizajes).
 * Pool fijo en un InstancedMesh: 1 draw call, cero asignaciones por frame.
 */
export class DustSystem {
  readonly mesh: THREE.InstancedMesh;
  private readonly max: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private cursor = 0;
  private alive = 0;
  private dummy = new THREE.Object3D();

  /** Gravedad de las partículas (negativa = suben, p. ej. chispas/humo). */
  gravity = 0.6;

  constructor(max = 96, material: THREE.Material = toon({ color: 0xf1e7d0 })) {
    this.max = max;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    geo.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, ZERO);
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size = new Float32Array(max);
  }

  /** Emite `count` puffs en anillo alrededor de `origin`. */
  emit(origin: THREE.Vector3, count: number, speed: number, up: number, size: number): void {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      if (this.life[i] <= 0) this.alive++;
      const a = (n / count) * Math.PI * 2 + Math.random() * 0.8;
      const s = speed * (0.6 + Math.random() * 0.6);
      this.pos[i * 3] = origin.x + Math.cos(a) * 0.15;
      this.pos[i * 3 + 1] = origin.y + 0.08;
      this.pos[i * 3 + 2] = origin.z + Math.sin(a) * 0.15;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * (0.6 + Math.random() * 0.8);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      const l = 0.45 + Math.random() * 0.3;
      this.life[i] = l;
      this.maxLife[i] = l;
      this.size[i] = size * (0.7 + Math.random() * 0.6);
    }
  }

  update(dt: number): void {
    if (this.alive === 0) return;
    const drag = Math.exp(-4 * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alive--;
        this.mesh.setMatrixAt(i, ZERO);
        continue;
      }
      const k = i * 3;
      this.vel[k] *= drag;
      this.vel[k + 1] = this.vel[k + 1] * drag - this.gravity * dt;
      this.vel[k + 2] *= drag;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] = Math.max(0.05, this.pos[k + 1] + this.vel[k + 1] * dt);
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      const s = this.size[i] * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8);
      this.dummy.position.set(this.pos[k], this.pos[k + 1], this.pos[k + 2]);
      this.dummy.rotation.set(t * 2, t * 3, 0);
      this.dummy.scale.setScalar(Math.max(0.0001, s));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
