/**
 * Reloj del juego. Calcula un delta acotado (evita "túneles" tras
 * pestañas en segundo plano) y soporta timeScale para el futuro.
 */
export class Time {
  private last = 0;
  running = false;

  deltaTime = 0;
  elapsed = 0;
  timeScale = 1;

  start(): void {
    this.last = performance.now();
    this.running = true;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Debe llamarse una vez por frame, antes de las actualizaciones. */
  tick(maxDelta = 0.1): number {
    const now = performance.now();
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(raw, maxDelta) * this.timeScale;
    this.deltaTime = dt;
    this.elapsed += dt;
    return dt;
  }

  reset(): void {
    this.last = performance.now();
    this.elapsed = 0;
  }
}
