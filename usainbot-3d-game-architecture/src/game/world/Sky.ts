import * as THREE from "three";
import { sharedUniforms } from "../utils/materials";

/**
 * Cúpula de cielo estilizada: degradado, sol con halo (dispara el bloom)
 * y nubes cel-shaded animadas con ruido procedural en el shader.
 * Se dibuja siempre en el plano lejano y centrada en la cámara → 1 draw call,
 * sin geometría que seguir.
 */
export interface SkyColors {
  zenith: number;
  horizon: number;
  ground: number;
  sun: number;
}

export function createSky(colors: SkyColors, sunDirection: THREE.Vector3): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      zenith: { value: new THREE.Color(colors.zenith) },
      horizon: { value: new THREE.Color(colors.horizon) },
      groundColor: { value: new THREE.Color(colors.ground) },
      sunColor: { value: new THREE.Color(colors.sun) },
      sunDir: { value: sunDirection.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * vec4((viewMatrix * vec4(position, 0.0)).xyz, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 zenith;
      uniform vec3 horizon;
      uniform vec3 groundColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vDir;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.5));
        col = mix(col, groundColor, clamp(-h * 5.0, 0.0, 1.0));

        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 1400.0) * 8.0 + pow(s, 60.0) * 0.35 + pow(s, 6.0) * 0.12);

        if (h > 0.0) {
          vec2 p = d.xz / (h + 0.15) * 1.3 + vec2(uTime * 0.01, uTime * 0.004);
          float n = fbm(p);
          float body = smoothstep(0.54, 0.575, n);
          float lit = smoothstep(0.6, 0.64, fbm(p + sunDir.xz * 0.08));
          vec3 cloud = mix(vec3(0.7, 0.77, 0.9), vec3(0.93, 0.93, 0.91), lit);
          cloud += sunColor * pow(s, 8.0) * 0.25;
          col = mix(col, cloud, body * smoothstep(0.0, 0.18, h));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = "sky";
  return mesh;
}
