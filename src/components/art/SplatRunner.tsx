import { useEffect, useRef, useState } from "react";
import type { Character, Scene } from "@viggle/splat-engine";
import { UsainBot } from "./UsainBot";

type Props = {
  className?: string;
};

const CHARACTER_URL = "/cyborg-runner.vsplat";
const ANIMATION_URL = "/robot-run.anim";

/**
 * Progressive 3D hero renderer. The old layered sprite stays mounted until
 * the splat is ready, and remains the fallback if WebGL or an asset fails.
 */
export function SplatRunner({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [failureReason, setFailureReason] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let scene: Scene | null = null;
    let character: Character | null = null;

    const start = async () => {
      try {
        const { Animation, Character: CharacterApi, Scene } = await import("@viggle/splat-engine");
        if (cancelled) return;

        scene = await Scene.create(canvas, {
          backend: "webgl",
          bgColor: { r: 0, g: 0, b: 0, a: 0 },
          cameraPosition: { x: 0.06, y: 0.92, z: 3.15 },
          cameraTarget: { x: 0.06, y: 0.9, z: 0 },
          fov: 34,
          ambientLight: 0.9,
          exposure: 1.05,
          maxPixelRatio: 1.25,
          gsplatCulling: true,
          subPixelCull: 1.25,
        });

        character = await CharacterApi.loadVsplat(scene, CHARACTER_URL, {
          name: "cyborg-runner",
          position: { x: 0, y: 0, z: 0 },
        });
        character.setScale(1.08, 1.08, 1.08);

        try {
          await Animation.load(scene, ANIMATION_URL, "robot-run");
          character.playAnimation("robot-run", { loop: true });
        } catch (animationError) {
          // A static character is still preferable to blocking the entire hero
          // when a browser cannot parse the optional motion clip.
          console.warn("Robot Run animation could not be loaded; showing the character statically.", animationError);
        }

        if (cancelled) return;
        scene.start();
        setReady(true);
        setStatus("ready");
      } catch (error) {
        console.warn("3D hero unavailable; using the 2D fallback.", error);
        if (!cancelled) {
          setFailureReason(error instanceof Error ? error.message : String(error));
          setStatus("fallback");
        }
      }
    };

    const timer = window.setTimeout(() => void start(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      character = null;
      scene?.destroy();
      scene = null;
    };
  }, []);

  return (
    <div className={`relative aspect-[483/493] w-full ${className}`}>
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
        aria-hidden={ready}
      >
        <UsainBot className="h-full w-full" running={false} />
      </div>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        aria-label="Cyborg Runner 3D animation"
      />
      <span className="sr-only" aria-live="polite">
        {status === "loading"
          ? "Loading 3D robot"
          : status === "fallback"
            ? `Showing 2D robot fallback${failureReason ? `: ${failureReason}` : ""}`
            : "3D robot ready"}
      </span>
    </div>
  );
}
