import * as THREE from "three";
import { createOutlineMaterial, createToonGradient } from "../../utils/outline";
import { PALETTE } from "./palette";
import {
  createFaceTexture,
  createShoeTexture,
  createShortsTexture,
  createTankTexture,
  createVisorTexture,
} from "./textures";

/**
 * Materiales de UsainBot. Las piezas de color liso comparten UN material
 * (color por vértice) para minimizar draw calls; solo las texturadas
 * tienen material propio. El visor y la pantalla del pecho comparten cristal.
 */
export interface UsainBotMaterials {
  flat: THREE.Material;
  glow: THREE.Material;
  face: THREE.Material;
  tank: THREE.Material;
  shorts: THREE.Material;
  shoe: THREE.Material;
  glass: THREE.Material;
  outline: THREE.Material;
}

/** Multiplicador HDR de las luces del traje: por encima de 1 → bloom. */
const GLOW_HDR = 2.6;

/** Grosor del contorno negro (metros). La ilustración tiene trazo grueso. */
export const OUTLINE_THICKNESS = 0.014;

export function createUsainBotMaterials(): UsainBotMaterials {
  const gradientMap = createToonGradient();
  const textured = (map: THREE.Texture): THREE.MeshToonMaterial =>
    new THREE.MeshToonMaterial({ color: 0xffffff, map, gradientMap });

  return {
    flat: new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap }),
    glow: new THREE.MeshBasicMaterial({
      color: new THREE.Color(GLOW_HDR, GLOW_HDR, GLOW_HDR),
      vertexColors: true,
    }),
    face: textured(createFaceTexture()),
    tank: textured(createTankTexture()),
    shorts: textured(createShortsTexture()),
    shoe: textured(createShoeTexture()),
    glass: new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.35, 1.35, 1.35),
      map: createVisorTexture(),
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
    outline: createOutlineMaterial(PALETTE.outline, OUTLINE_THICKNESS),
  };
}
