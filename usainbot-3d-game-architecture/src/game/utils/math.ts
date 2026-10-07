/** Helpers matemáticos pequeños usados por varios sistemas. */

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Suavizado exponencial independiente del frame rate. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Normaliza un ángulo al rango [-PI, PI]. */
export const wrapAngle = (a: number): number => {
  const TAU = Math.PI * 2;
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
};

/** Igual que damp pero para ángulos, tomando siempre el camino corto. */
export const dampAngle = (current: number, target: number, lambda: number, dt: number): number =>
  current + wrapAngle(target - current) * (1 - Math.exp(-lambda * dt));

/**
 * Zona muerta radial para sticks analógicos (como en consola):
 * elimina el drift y re-escala para que el recorrido útil vaya de 0 a 1.
 */
export function applyRadialDeadzone(
  x: number,
  y: number,
  deadzone: number,
  out: { x: number; y: number }
): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= deadzone) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scaled = Math.min(1, (len - deadzone) / (1 - deadzone));
  out.x = (x / len) * scaled;
  out.y = (y / len) * scaled;
  return out;
}
