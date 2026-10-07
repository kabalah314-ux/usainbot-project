/**
 * PRNG determinista (mulberry32): la ciudad sale igual en cada partida,
 * sin guardar datos de posiciones.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randRange = (rng: () => number, min: number, max: number): number =>
  min + (max - min) * rng();

export const randPick = <T>(rng: () => number, list: readonly T[]): T =>
  list[Math.floor(rng() * list.length) % list.length];
