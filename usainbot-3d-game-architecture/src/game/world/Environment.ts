import * as THREE from "three";
import { gameSettings } from "../data/config";
import { sharedUniforms, toon } from "../utils/materials";
import { grassTexture } from "../utils/textures";
import { createSky } from "./Sky";

const SKY = { zenith: 0x3d8ee0, ground: 0x9fb6c4, sun: 0xfff1d8 };
const SUN_OFFSET = new THREE.Vector3(38, 62, 24);




function groundMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.ground = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/**
 * Ambiente: cielo, niebla, luces (hemisferio + sol) y el suelo urbano.
 * Presupuesto fijo: 2 luces, 1 mapa de sombras que sigue al jugador.
 */
export class Environment {
  readonly group = new THREE.Group();
  readonly sunDirection = SUN_OFFSET.clone().normalize();
  private sun: THREE.DirectionalLight;
  private shadowExtent = 40;
  private shadowMapSize = 2048;

  constructor(root: THREE.Scene) {
    const world = gameSettings.world;
    root.add(this.group);
    root.fog = new THREE.Fog(world.skyColor, world.fogNear, world.fogFar);
    root.background = new THREE.Color(world.skyColor);
    this.group.add(createSky({ ...SKY, horizon: world.skyColor }, this.sunDirection));

    // Luces
    const hemi = new THREE.HemisphereLight(0xd6ecff, 0x9aab72, 1.45);
    this.sun = new THREE.DirectionalLight(0xfff1d8, 2.55);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    // Sombras de dibujo animado: no llegan a negro (conservan parte del sol).
    this.sun.shadow.intensity = 0.6;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(hemi, this.sun, this.sun.target);
    this.setShadowQuality(2048, 2, 40);

    this.buildGround();
  }

  /** Aplica la calidad de sombras (tamaño del mapa, suavizado y área cubierta). */
  setShadowQuality(mapSize: number, radius: number, extent: number): void {
    const shadow = this.sun.shadow;
    if (mapSize !== this.shadowMapSize || !shadow.map) {
      shadow.mapSize.set(mapSize, mapSize);
      shadow.map?.dispose();
      shadow.map = null;
      this.shadowMapSize = mapSize;
    }
    shadow.radius = radius;
    this.shadowExtent = extent;
    const cam = shadow.camera;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.near = 1;
    cam.far = 180;
    cam.updateProjectionMatrix();
  }

  update(dt: number, focus: THREE.Vector3): void {
    sharedUniforms.uTime.value += dt;
    // El sol sigue al jugador, anclado a la rejilla de texels (sin "temblor" de sombras).
    const texel = (this.shadowExtent * 2) / this.shadowMapSize;
    const fx = Math.round(focus.x / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx + SUN_OFFSET.x, SUN_OFFSET.y, fz + SUN_OFFSET.z);
  }

  /** Césped base bajo toda la zona (calles, parcelas y parches van encima). */
  private buildGround(): void {
    const size = gameSettings.world.groundSize;
    const grass = new THREE.PlaneGeometry(size, size);
    grass.rotateX(-Math.PI / 2);
    this.group.add(groundMesh(grass, toon({ map: grassTexture(size / 6) })));
  }
}
