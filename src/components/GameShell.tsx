import { useEffect, useRef, useState } from "react";

type GameInstance = { dispose: () => void };

type Props = { onExit: () => void };

/**
 * Puerta de entrada al sandbox 3D.
 * React solo monta/desmonta el juego; toda la lógica vive en `src/game`.
 * El chunk de three.js se carga bajo demanda al pulsar PLAY.
 */
export default function GameShell({ onExit }: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "running" | "error">("loading");

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let alive = true;
    let game: GameInstance | null = null;

    import("../game/main")
      .then(({ startGame }) => {
        if (!alive || !holder) return;
        try {
          game = startGame(holder);
          setStatus("running");
        } catch {
          setStatus("error");
        }
      })
      .catch(() => {
        if (alive) setStatus("error");
      });

    return () => {
      alive = false;
      try {
        game?.dispose();
      } catch {
        /* already torn down */
      }
      game = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f14]">
      <div
        ref={holderRef}
        className="absolute inset-0 select-none overflow-hidden bg-[#0b0f14]"
      />

      {status === "loading" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0b0f14] px-6 text-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-jam-green">
              loading · usainbot sandbox
            </p>
            <p className="mt-3 font-display text-4xl text-bolt title-shadow sm:text-6xl">
              BUILDING THE CITY…
            </p>
            <p className="mt-3 font-mono text-xs text-paper/60">
              WebGL + three.js · first run takes a few seconds
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0b0f14] px-6 text-center">
          <div className="comic-light max-w-md bg-ink p-6">
            <p className="font-display text-3xl text-flame">WEBGL REQUIRED</p>
            <p className="mt-2 text-sm text-paper/75">
              This browser cannot run the 3D sandbox. Use a modern desktop browser
              with hardware acceleration enabled.
            </p>
            <button
              onClick={onExit}
              className="press comic-sm mt-5 bg-bolt px-5 py-2 font-display text-xl text-ink"
            >
              BACK TO THE WEB
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onExit}
        aria-label="Exit the 3D sandbox"
        className="press comic-sm absolute right-3 top-3 z-30 bg-ink/90 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-paper hover:text-bolt sm:right-5 sm:top-5"
      >
        ✕ exit · esc = pause
      </button>
    </div>
  );
}
