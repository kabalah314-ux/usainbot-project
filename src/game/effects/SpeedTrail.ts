import * as THREE from "three";

const POINTS = 22;
const SEGMENT = 0.22;

/**
 * Estela luminosa (cinta orientada a cámara) que sigue un punto.
 * Color HDR + mezcla aditiva → brilla con el bloom.
 */
export class SpeedTrail {
  readonly mesh: THREE.Mesh;
  private points: THREE.Vector3[] = [];
  private count = 0;
  private intensity = 0;
  private positions: Float32Array;
  private colors: Float32Array;
  private geometry: THREE.BufferGeometry;
  private color: THREE.Color;
  private width: number;
  private tangent = new THREE.Vector3();
  private toCam = new THREE.Vector3();
  private side = new THREE.Vector3();

  constructor(color: THREE.Color, width: number) {
    this.color = color;
    this.width = width;
    for (let i = 0; i < POINTS; i++) this.points.push(new THREE.Vector3());
    this.positions = new Float32Array(POINTS * 2 * 3);
    this.colors = new Float32Array(POINTS * 2 * 3);
    const index: number[] = [];
    for (let i = 0; i < POINTS - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setIndex(index);
    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  update(dt: number, head: THREE.Vector3, active: boolean, cameraPos: THREE.Vector3): void {
    this.intensity = THREE.MathUtils.damp(this.intensity, active ? 1 : 0, active ? 10 : 5, dt);
    if (this.intensity < 0.01) {
      this.count = 0;
      this.mesh.visible = false;
      return;
    }
    // Cabeza viva + nuevo punto cada SEGMENT metros
    if (this.count === 0) {
      this.points[0].copy(head);
      this.points[1].copy(head);
      this.count = 2;
    }
    this.points[0].copy(head);
    if (this.points[0].distanceTo(this.points[1]) > SEGMENT) {
      const last = this.points.pop() as THREE.Vector3;
      this.points.splice(1, 0, last.copy(head));
      this.count = Math.min(POINTS, this.count + 1);
    }
    this.rebuild(cameraPos);
    this.mesh.visible = true;
  }

  private rebuild(cameraPos: THREE.Vector3): void {
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const prev = this.points[Math.max(0, i - 1)];
      const next = this.points[Math.min(n - 1, i + 1)];
      this.tangent.subVectors(prev, next);
      if (this.tangent.lengthSq() < 1e-8) this.tangent.set(0, 0, 1);
      this.toCam.subVectors(cameraPos, this.points[i]);
      this.side.crossVectors(this.tangent, this.toCam).normalize();
      const t = i / (n - 1);
      const w = this.width * (1 - t) * this.intensity;
      const p = this.points[i];
      const k = i * 6;
      this.positions[k] = p.x + this.side.x * w;
      this.positions[k + 1] = p.y + this.side.y * w;
      this.positions[k + 2] = p.z + this.side.z * w;
      this.positions[k + 3] = p.x - this.side.x * w;
      this.positions[k + 4] = p.y - this.side.y * w;
      this.positions[k + 5] = p.z - this.side.z * w;
      const a = (1 - t) * (1 - t) * this.intensity;
      for (const o of [0, 3]) {
        this.colors[k + o] = this.color.r * a;
        this.colors[k + o + 1] = this.color.g * a;
        this.colors[k + o + 2] = this.color.b * a;
      }
    }
    this.geometry.setDrawRange(0, (n - 1) * 6);
    (this.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }
}
