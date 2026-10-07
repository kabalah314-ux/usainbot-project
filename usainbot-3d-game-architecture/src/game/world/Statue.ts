import * as THREE from "three";
import { buildUsainBotRig } from "../player/model/UsainBotRig";
import type { UsainBotMaterials } from "../player/model/materials";
import { createOutlineMaterial } from "../utils/outline";

/**
 * Estatua dorada de UsainBot para la fuente de la plaza.
 * Reutiliza el mismo esqueleto del personaje con un único material dorado
 * (2 draw calls) en la pose del "rayo": brazos apuntando al cielo.
 */
export function createGoldStatue(): THREE.Group {
  const gold = new THREE.MeshPhongMaterial({
    color: 0xe2a93b,
    specular: 0xfff0b8,
    shininess: 80,
    emissive: 0x2c1800,
  });
  const materials: UsainBotMaterials = {
    flat: gold,
    glow: gold,
    face: gold,
    tank: gold,
    shorts: gold,
    shoe: gold,
    glass: gold,
    outline: createOutlineMaterial(0x3b2507, 0.014),
  };
  const rig = buildUsainBotRig(materials);

  rig.torso.rotation.set(-0.1, 0.18, -0.06);
  rig.head.rotation.set(-0.12, 0.6, 0.05);
  rig.armL.rotation.set(0.15, 0, 2.3);
  rig.elbowL.rotation.x = -0.12;
  rig.armR.rotation.set(-0.55, 0.25, 1.75);
  rig.elbowR.rotation.x = -1.65;
  rig.legL.rotation.set(-0.05, 0, 0.14);
  rig.legR.rotation.set(0.12, 0, -0.12);
  rig.kneeR.rotation.x = 0.18;
  rig.footL.rotation.set(0.05, 0.35, -0.14);
  rig.footR.rotation.set(-0.12, -0.3, 0.12);
  rig.group.updateMatrixWorld(true);
  return rig.group;
}
