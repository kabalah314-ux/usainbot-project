import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Vec3 = readonly [number, number, number];

export interface PartOptions {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  /** Color de vértice (para materiales con vertexColors). Blanco por defecto. */
  color?: number;
  /** Incluir en el contorno cel-shading (true por defecto). */
  outline?: boolean;
}

const tmpLocal = new THREE.Matrix4();
const tmpWorld = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpColor = new THREE.Color();

/**
 * Construye un personaje low poly a partir de primitivas como UN solo
 * SkinnedMesh con esqueleto (skinning rígido: cada pieza pertenece a un hueso).
 *
 * Ventajas:
 * - 1 draw call por material (en vez de 1 por pieza).
 * - Misma estructura que un GLB con esqueleto: el animador funcionará igual
 *   cuando se sustituya por el modelo definitivo.
 */
export class SkinnedModelBuilder {
  private bones: THREE.Bone[] = [];
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private outlineParts: THREE.BufferGeometry[] = [];

  bone(name: string, parent: THREE.Bone | null, position: Vec3): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(position[0], position[1], position[2]);
    parent?.add(bone);
    this.bones.push(bone);
    return bone;
  }

  part(
    bone: THREE.Bone,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    opts: PartOptions = {}
  ): this {
    const boneIndex = this.bones.indexOf(bone);
    if (boneIndex < 0) throw new Error(`[SkinnedModelBuilder] hueso desconocido: ${bone.name}`);

    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();

    // Transformación: pieza local al hueso → espacio del modelo (pose de bind)
    const p = opts.position ?? [0, 0, 0];
    const r = opts.rotation ?? [0, 0, 0];
    const s = opts.scale ?? [1, 1, 1];
    tmpPos.set(p[0], p[1], p[2]);
    tmpQuat.setFromEuler(tmpEuler.set(r[0], r[1], r[2]));
    tmpScale.set(s[0], s[1], s[2]);
    tmpLocal.compose(tmpPos, tmpQuat, tmpScale);
    bone.updateWorldMatrix(true, false);
    tmpWorld.multiplyMatrices(bone.matrixWorld, tmpLocal);
    g.applyMatrix4(tmpWorld);

    const count = g.getAttribute("position").count;
    tmpColor.set(opts.color ?? 0xffffff);
    const colors = new Float32Array(count * 3);
    const skinIndex = new Uint16Array(count * 4);
    const skinWeight = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
      skinIndex[i * 4] = boneIndex;
      skinWeight[i * 4] = 1;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));

    const list = this.parts.get(material) ?? [];
    list.push(g);
    this.parts.set(material, list);

    if (opts.outline !== false) {
      const hull = new THREE.BufferGeometry();
      hull.setAttribute("position", g.getAttribute("position").clone());
      hull.setAttribute("skinIndex", g.getAttribute("skinIndex").clone());
      hull.setAttribute("skinWeight", g.getAttribute("skinWeight").clone());
      this.outlineParts.push(hull);
    }
    return this;
  }

  /** Genera el grupo final: SkinnedMesh multi-material + contorno. */
  build(outlineMaterial: THREE.Material | null): THREE.Group {
    if (this.bones.length === 0) throw new Error("[SkinnedModelBuilder] sin huesos");
    const group = new THREE.Group();
    group.add(this.bones[0]);
    group.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(this.bones);

    const perMaterial: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    for (const [material, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error("[SkinnedModelBuilder] geometrías incompatibles");
      perMaterial.push(merged);
      materials.push(material);
      list.forEach((g) => g.dispose());
    }
    const geometry = mergeGeometries(perMaterial, true);
    perMaterial.forEach((g) => g.dispose());
    if (!geometry) throw new Error("[SkinnedModelBuilder] fallo al unir materiales");

    const mesh = new THREE.SkinnedMesh(geometry, materials);
    mesh.castShadow = true;
    mesh.frustumCulled = false; // el protagonista siempre está en pantalla
    group.add(mesh);
    mesh.bind(skeleton);

    if (outlineMaterial && this.outlineParts.length > 0) {
      const merged = mergeGeometries(this.outlineParts, false);
      this.outlineParts.forEach((g) => g.dispose());
      if (merged) {
        // Soldar vértices → normales suaves → contorno continuo en esquinas.
        const welded = mergeVertices(merged, 1e-4);
        merged.dispose();
        welded.computeVertexNormals();
        const outline = new THREE.SkinnedMesh(welded, outlineMaterial);
        outline.frustumCulled = false;
        group.add(outline);
        outline.bind(skeleton);
      }
    }

    this.parts.clear();
    this.outlineParts = [];
    return group;
  }
}
