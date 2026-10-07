import { useEffect, useRef } from "react";
import { startGame } from "./game/main";

/**
 * Shell de montaje. React solo sirve para montar el juego:
 * toda la lógica vive en `src/game` (ver src/game/main.ts).
 */
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none overflow-hidden bg-[#0b0f14]"
    />
  );
}
