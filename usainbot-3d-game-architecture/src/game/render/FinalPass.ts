import * as THREE from "three";
import { graphicsSettings } from "../data/graphics";

/**
 * Pasada final a pantalla (un solo fullscreen quad):
 * 1. Contornos de tinta: laplaciano de 1/z sobre el depth buffer
 *    (es 0 en planos → sin líneas falsas en suelos; marca siluetas y aristas).
 * 2. Desenfoque radial + líneas de velocidad al esprintar.
 * 3. Gradación de color (saturación, calidez) y viñeta.
 * 4. Tone mapping + conversión a sRGB (chunks de three).
 * 5. Modo retro: dithering Bayer 4×4 y cuantización a 16 bits (PS2).
 */
export function createFinalMaterial(): THREE.ShaderMaterial {
  const g = graphicsSettings;
  return new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tDepth: { value: null },
      texel: { value: new THREE.Vector2(1, 1) },
      resolution: { value: new THREE.Vector2(1, 1) },
      cameraNear: { value: 0.2 },
      cameraFar: { value: 400 },
      fogFar: { value: 200 },
      edgeRange: { value: new THREE.Vector2(g.edgeLow, g.edgeHigh) },
      edgeAmount: { value: g.edgeDarkness },
      speed: { value: 0 },
      time: { value: 0 },
      saturation: { value: g.saturation },
      vignette: { value: g.vignette },
      retro: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 texel;
      uniform vec2 resolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform float fogFar;
      uniform vec2 edgeRange;
      uniform float edgeAmount;
      uniform float speed;
      uniform float time;
      uniform float saturation;
      uniform float vignette;
      uniform float retro;
      varying vec2 vUv;

      float invDepth(vec2 uv) {
        float d = texture2D(tDepth, uv).x;
        return -1.0 / perspectiveDepthToViewZ(d, cameraNear, cameraFar);
      }
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float bayer4(vec2 p) {
        vec2 q = mod(floor(p), 4.0);
        int i = int(q.x + q.y * 4.0);
        float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                                3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
        return m[i] / 16.0 - 0.5;
      }

      void main() {
        vec2 p = vUv - 0.5;
        float aspect = resolution.x / resolution.y;
        float r = length(p * vec2(aspect, 1.0));
        vec3 col = texture2D(tColor, vUv).rgb;

        // Desenfoque radial hacia los bordes durante el sprint
        if (speed > 0.01) {
          vec2 dir = p * 0.045 * speed;
          vec3 acc = col;
          for (int i = 1; i <= 4; i++) acc += texture2D(tColor, vUv - dir * float(i)).rgb;
          col = mix(col, acc / 5.0, smoothstep(0.15, 0.6, r));
        }

        // Contornos de tinta
        if (edgeAmount > 0.0) {
          float c = invDepth(vUv);
          float l = invDepth(vUv - vec2(texel.x, 0.0));
          float rr = invDepth(vUv + vec2(texel.x, 0.0));
          float u = invDepth(vUv + vec2(0.0, texel.y));
          float dd = invDepth(vUv - vec2(0.0, texel.y));
          float lap = abs(l + rr + u + dd - 4.0 * c);
          float m = max(max(max(l, rr), max(u, dd)), c);
          float e = smoothstep(edgeRange.x, edgeRange.y, lap / m);
          e *= 1.0 - smoothstep(fogFar * 0.25, fogFar * 0.6, 1.0 / m);
          col *= 1.0 - e * edgeAmount;
        }

        // Líneas de velocidad (anime) en los bordes
        if (speed > 0.01) {
          float ang = atan(p.y, p.x);
          float slot = floor(ang * 38.0);
          float n = hash(slot + floor(time * 18.0) * 17.0);
          float line = step(0.82, n) * smoothstep(0.32, 0.75, r);
          col = mix(col, vec3(1.25), line * speed * 0.45);
        }

        // Gradación: saturación + calidez + viñeta
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(lum), col, saturation);
        col *= vec3(1.03, 1.0, 0.965);
        col *= mix(1.0, 1.0 - smoothstep(0.35, 1.05, r), vignette + speed * 0.25);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>

        // PS2: dithering ordenado + color de 16 bits (5 bits por canal)
        if (retro > 0.5) {
          vec3 q = gl_FragColor.rgb + bayer4(gl_FragCoord.xy) / 31.0;
          gl_FragColor.rgb = floor(q * 31.0 + 0.5) / 31.0;
        }
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
