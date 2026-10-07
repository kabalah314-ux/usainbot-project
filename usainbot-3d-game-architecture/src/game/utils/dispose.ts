import * as THREE from "three";

/**
 * Libera geometrías, materiales y texturas bajo un nodo.
 * Usado al destruir escenas para no acumular memoria al cambiar de zona.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) materials.add(m);
    }
  });

  for (const material of materials) {
    const textured = material as THREE.MeshLambertMaterial;
    if (textured.map) textured.map.dispose();
    material.dispose();
  }
}
