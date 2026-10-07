/**
 * Logotipo OOOX (placeholder dibujado como SVG real, escalable y a un color).
 * Es el "sello de calidad" del estudio/creador. Sustituir por el logo
 * definitivo cambiando el contenido de los <path> (la API no cambia).
 *
 *   variant="wordmark" → OOOX horizontal
 *   variant="seal"     → sello con esquinas achaflanadas (estética Bauhaus)
 */
export function OOOXLogo({
  variant = "wordmark",
  className = "",
  color = "currentColor",
}: {
  variant?: "wordmark" | "seal";
  className?: string;
  color?: string;
}) {
  // Tres anillos ("OOO") + una equis ("X") trazados con arcos y trazos reales.
  const mark = (
    <g
      fill="none"
      stroke={color}
      strokeWidth={13}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 46 a25 25 0 1 0 50 0 a25 25 0 1 0 -50 0" />
      <path d="M75 46 a25 25 0 1 0 50 0 a25 25 0 1 0 -50 0" />
      <path d="M142 46 a25 25 0 1 0 50 0 a25 25 0 1 0 -50 0" />
      <path d="M212 20 L264 72" />
      <path d="M264 20 L212 72" />
    </g>
  );

  if (variant === "seal") {
    return (
      <svg
        className={className}
        viewBox="0 0 150 150"
        role="img"
        aria-label="OOOX"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sello octogonal achaflanado (doble borde) */}
        <path
          d="M32 6 L118 6 L144 32 L144 118 L118 144 L32 144 L6 118 L6 32 Z"
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinejoin="miter"
        />
        <path
          d="M37 17 L113 17 L133 37 L133 113 L113 133 L37 133 L17 113 L17 37 Z"
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="miter"
          opacity={0.55}
        />
        <g transform="translate(20 58) scale(0.365)">{mark}</g>
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 300 92"
      role="img"
      aria-label="OOOX"
      xmlns="http://www.w3.org/2000/svg"
    >
      {mark}
    </svg>
  );
}

/** Icono SVG de X (Twitter). */
export function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Icono SVG de Telegram. */
export function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7l-5.45-1.7c-1.18-.35-1.19-1.16.26-1.75l21.26-8.2c.97-.43 1.9.24 1.53 1.73z" />
    </svg>
  );
}
