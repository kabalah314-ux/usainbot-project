import * as THREE from "three";
import { Game } from "./core/Game";
import { RACES } from "./data/races";

/**
 * Punto de entrada del juego.
 * Monta el Game sobre el contenedor dado y arranca el bucle principal.
 * El resto del proyecto no sabe nada de React.
 */
export function startGame(container: HTMLElement): Game {
  const game = new Game(container);
  game.start();
  // Acceso desde la consola solo en desarrollo (se elimina en el build).
  if (import.meta.env.DEV) {
    const w = window as unknown as { __USAINBOT__?: Game; __THREE__?: typeof THREE };
    w.__USAINBOT__ = game;
    w.__THREE__ = THREE; // solo desarrollo: lo usan los tests automáticos
    (window as unknown as { __RACES__?: typeof RACES }).__RACES__ = RACES;
  }
  return game;
}
