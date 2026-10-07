import * as THREE from "three";
import { createToonGradient } from "./outline";

/**
 * Materiales compartidos del mundo: todo usa la misma rampa toon que el
 * personaje, así la ciudad y UsainBot comparten el mismo "cel-shading".
 */
let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (!gradient) gradient = createToonGradient();
  return gradient;
}

/** Uniforms globales animados (un solo update por frame para todo el mundo). */
export const sharedUniforms = {
  uTime: { value: 0 },
};

export function toon(params: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...params });
}

/**
 * Balanceo por viento en el vertex shader (copas de árboles instanciadas).
 * Coste cero en CPU: un seno por vértice con la fase según la instancia.
 */
export function addWindSway(material: THREE.Material, amount: number): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.vertexShader =
      "uniform float uTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float windPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        #else
          float windPhase = 0.0;
        #endif
        float windSway = sin(uTime * 1.6 + windPhase) * ${amount.toFixed(3)} * max(position.y + 1.0, 0.0);
        transformed.x += windSway;
        transformed.z += windSway * 0.6;`
      );
  };
  material.customProgramCacheKey = () => `ub-wind-${amount}`;
}
