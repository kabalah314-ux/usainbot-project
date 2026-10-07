import * as THREE from "three";
import { GASOIL_BRAND } from "../data/cityLayout";
import { createCanvasTexture, toCss } from "../utils/textures";
import { createOutlineMaterial, createToonGradient } from "../utils/outline";

/**
 * Lata de GASIL 3D (la que UsainBot saca y se bebe como si fuera un refresco).
 * Misma identidad que el atlas: cuerpo naranja, franja carbón, rótulo GASIL y
 * rayo. Tamaño de caricatura, para leerse bien en tercera persona.
 * IMPORTANTE: la marca del combustible del juego es GASIL.
 */
export const CAN_SIZE = { radius: 0.05, height: 0.15 } as const;

function labelTexture(): THREE.CanvasTexture {
  return createCanvasTexture(
    256,
    128,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#c65a0c");
      grad.addColorStop(0.5, toCss(GASOIL_BRAND.orange));
      grad.addColorStop(1, "#c65a0c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = toCss(GASOIL_BRAND.charcoal);
      ctx.fillRect(0, 40, w, 50);
      ctx.fillStyle = "#e7ecef";
      ctx.fillRect(0, 0, w, 7);
      ctx.fillRect(0, h - 7, w, 7);
      for (const cx of [64, 192]) {
        ctx.font = `italic 900 30px "Arial Black", Impact, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = toCss(GASOIL_BRAND.orange);
        ctx.strokeText("GASIL", cx, 66);
        ctx.fillStyle = toCss(GASOIL_BRAND.white);
        ctx.fillText("GASIL", cx, 66);
        ctx.fillStyle = toCss(GASOIL_BRAND.yellow);
        ctx.beginPath();
        ctx.moveTo(cx + 6, 12);
        ctx.lineTo(cx - 8, 30);
        ctx.lineTo(cx, 29);
        ctx.lineTo(cx - 5, 38);
        ctx.lineTo(cx + 9, 21);
        ctx.lineTo(cx + 1, 22);
        ctx.closePath();
        ctx.fill();
        ctx.font = `900 13px Arial, sans-serif`;
        ctx.fillStyle = toCss(GASOIL_BRAND.charcoal);
        ctx.fillText("ROBOT FUEL", cx, 106);
      }
    },
    true
  );
}

let shared: {
  body: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  mats: THREE.Material[];
  outline: THREE.Material;
} | null = null;

export function createCanMesh(): THREE.Group {
  if (!shared) {
    const gradientMap = createToonGradient();
    shared = {
      body: new THREE.CylinderGeometry(
        CAN_SIZE.radius,
        CAN_SIZE.radius,
        CAN_SIZE.height,
        14,
        1,
        false,
        Math.PI,
        Math.PI * 2
      ),
      top: new THREE.CylinderGeometry(CAN_SIZE.radius * 0.82, CAN_SIZE.radius, 0.018, 14),
      mats: [
        new THREE.MeshToonMaterial({ map: labelTexture(), gradientMap }),
        new THREE.MeshToonMaterial({ color: 0xcfd6db, gradientMap }),
      ],
      outline: createOutlineMaterial(0x15110f, 0.008),
    };
  }
  const group = new THREE.Group();
  group.name = "gasoil-can";
  const body = new THREE.Mesh(shared.body, [shared.mats[0], shared.mats[1], shared.mats[1]]);
  const top = new THREE.Mesh(shared.top, shared.mats[1]);
  top.position.y = CAN_SIZE.height / 2 + 0.009;
  const bottom = top.clone();
  bottom.position.y = -CAN_SIZE.height / 2 - 0.009;
  bottom.rotation.x = Math.PI;
  const outline = new THREE.Mesh(shared.body, shared.outline);
  outline.scale.set(1.02, 1.08, 1.02);
  group.add(body, top, bottom, outline);
  group.traverse((o) => {
    o.castShadow = true;
  });
  return group;
}
