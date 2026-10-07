import type { Time } from "./Time";

export type FrameCallback = (dt: number) => void;

/** Bucle principal sobre requestAnimationFrame. No contiene lógica de juego. */
export class GameLoop {
  private rafId: number | null = null;
  private time: Time;
  private onFrame: FrameCallback;

  constructor(time: Time, onFrame: FrameCallback) {
    this.time = time;
    this.onFrame = onFrame;
  }

  get isRunning(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.time.start();
    const step = (): void => {
      this.rafId = requestAnimationFrame(step);
      this.onFrame(this.time.tick());
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.time.running = false;
  }
}
