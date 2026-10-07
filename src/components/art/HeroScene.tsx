import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { AnimInput } from "../../game/player/model/UsainBotAnimator";

type Props = {
  className?: string;
  /** El sandbox está abierto: la home no gasta GPU detrás del overlay. */
  paused?: boolean;
};

const FOV = 32;
/** Distancia de la cámara al personaje (marco de cuerpo entero + barrio). */
const DISTANCE = 6;
/** El rig mira a +Z: giramos ~35º para vista 3/4. */
const MODEL_YAW = 0.6;
/** Cadencia de paso tranquila (frente al sprint del juego). */
const WALK_INPUT: AnimInput = {
  state: "run",
  speedRatio: 0.22,
  sprinting: false,
  verticalVelocity: 0,
  doubleJumped: false,
  landed: false,
  drinkT: -1,
};

/**
 * Fondo de la home: el barrio real del sandbox (cielo, avenidas, edificios)
 * con UsainBot corriendo a paso tranquilo. Ocupa todo el header; la imagen
 * del estadio queda debajo como respaldo mientras carga o si falla WebGL.
 */
export function HeroScene({ className = "", paused = false }: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let cancelled = false;
    let dispose: (() => void) | null = null;

    const start = async () => {
      try {
        const [{ World }, { PlayerModel }, { Renderer }] = await Promise.all([
          import("../../game/world/World"),
          import("../../game/player/PlayerModel"),
          import("../../game/render/Renderer"),
        ]);
        if (cancelled) return;

        const scene = new THREE.Scene();
        const world = new World(scene);
        const model = new PlayerModel();
        model.group.position.set(0, world.groundAt(0, 0), 0);
        model.group.rotation.y = MODEL_YAW;
        scene.add(model.group);

        const renderer = new Renderer(holder);
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.15, 400);

        // Encuadre: UsainBot a la derecha en horizontal; en móvil, abajo.
        const layout = () => {
          const width = holder.clientWidth || 1;
          const height = holder.clientHeight || 1;
          renderer.resize();
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          const wide = camera.aspect > 1;
          const ndcX = wide ? 0.44 : 0;
          const ndcY = wide ? -0.06 : -0.32;
          const tanV = Math.tan((FOV * Math.PI) / 360);
          const tanH = tanV * camera.aspect;
          camera.position.set(-ndcX * tanH * DISTANCE, 1 - ndcY * tanV * DISTANCE, DISTANCE);
          camera.lookAt(camera.position.x, camera.position.y, 0);
        };
        layout();
        const resizeObserver = new ResizeObserver(layout);
        resizeObserver.observe(holder);

        let visible = true;
        const intersectionObserver = new IntersectionObserver((entries) => {
          visible = entries[0]?.isIntersecting ?? true;
        });
        intersectionObserver.observe(holder);

        if (cancelled) {
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          renderer.dispose();
          return;
        }
        // Solo revelamos el 3D cuando ya hay un frame pintado: mientras tanto
        // se ve el estadio de respaldo.
        let raf = 0;
        let last = performance.now();
        let first = true;
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          if (!visible || pausedRef.current || document.hidden) return;
          world.update(dt, model.group.position);
          model.update(dt, WALK_INPUT);
          renderer.trackPerformance(dt);
          renderer.render(scene, camera, dt, { speed: 0 });
          if (first) {
            first = false;
            setReady(true);
          }
        };
        raf = requestAnimationFrame(frame);

        dispose = () => {
          cancelAnimationFrame(raf);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          scene.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => material?.dispose());
          });
          renderer.dispose();
        };
      } catch (error) {
        console.warn("3D hero unavailable; keeping the stadium backdrop.", error);
      }
    };

    const timer = window.setTimeout(() => void start(), 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      dispose?.();
      dispose = null;
    };
  }, []);

  return (
    <div
      ref={holderRef}
      className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${className}`}
      aria-hidden={!ready}
    />
  );
}
