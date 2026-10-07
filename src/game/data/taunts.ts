/**
 * Frases chulescas de UsainBot cuando se queda posando.
 * La primera es la de la ilustración original.
 */
export const idleTaunts: readonly string[] = [
  "you think you can win me?",
  "¿Crees que puedes ganarme?",
  "0,00 segundos de descanso. Récord.",
  "Mis piernas tienen garantía. Las tuyas no.",
  "¿Carrera? Te dejo salir primero.",
];

export const tauntSettings = {
  /** Segundos de reposo antes de soltar la primera frase. */
  delay: 2.4,
  /** Segundos que dura cada frase antes de cambiar a la siguiente. */
  duration: 4.5,
} as const;
