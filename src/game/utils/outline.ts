import * as THREE from "three";

/**
 * Material de contorno "inverted hull" (cel-shading de la época PS2).
 * Dibuja las caras traseras desplazadas a lo largo de la normal.
 * Compatible con SkinnedMesh: el desplazamiento se aplica antes del skinning.
 */
export function createOutlineMaterial(color: number, thickness: number): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.outlineThickness = { value: thickness };
    shader.vertexShader =
      "uniform float outlineThickness;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "vec3 transformed = vec3(position) + normal * outlineThickness;"
      );
  };
  material.customProgramCacheKey = () => `ub-outline-${thickness}`;
  return material;
}

/** Rampa de 3 tonos para MeshToonMaterial (sombreado "a bandas"). */
export function createToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([
    115, 115, 115, 255,
    195, 195, 195, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
