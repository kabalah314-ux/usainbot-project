import { useEffect, useRef, useState } from "react";
import { Landing } from "./landing/Landing";
import { startGame } from "./game/main";

/**
 * Shell de montaje. El flujo de pantallas:
 *
 *   LANDING (web) → [PLAY] → pantalla de inicio del juego (la existente) → juego
 *
 * React solo sirve para elegir pantalla y montar el juego: la lógica 3D vive
 * en `src/game` (ver src/game/main.ts). El juego NO se carga hasta pulsar PLAY
 * (la landing no arrastra los assets 3D).
 */
export default function App() {
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) return;
    const container = containerRef.current;
    if (!container) return;
    try {
      const game = startGame(container);
      return () => game.dispose();
    } catch (err) {
      console.error(err);
      container.innerHTML =
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#ff5d5d;font-family:monospace;font-size:14px">USAINBOT necesita WebGL. Usa un navegador moderno de escritorio.</div>';
    }
  }, [started]);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0b0f14]">
      <div
        ref={containerRef}
        className="fixed inset-0 select-none overflow-hidden bg-[#0b0f14]"
        style={started ? undefined : { visibility: "hidden" }}
      />
      {!started && <Landing onPlay={() => setStarted(true)} />}
    </div>
  );
}
