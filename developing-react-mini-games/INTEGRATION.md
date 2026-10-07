# 🎮 $BOLT ARCADE — guía de integración en usain-bot.vercel.app

> **Estado actual:** el arcade ya está integrado en la web principal. Este documento queda como guía de mantenimiento y comprobación de paridad, no como una tarea pendiente de copiar archivos.

Todo está hecho con **React 19 + TypeScript + Vite + Tailwind v4 + Canvas 2D**, sin dependencias nuevas
(0 KB de librerías de juegos, todo `requestAnimationFrame`). La suite queda reducida a dos juegos: 100m Masher
como experiencia principal y Reaction 9.39 como segundo reto.

## 1. Archivos integrados en la web principal

```
src/components/ArcadeSection.tsx      ← la sección completa (#game): selector + cabina + ranking
src/components/Leaderboard.tsx        ← la sección #ranking (clasificación general)
src/components/KeyedImg.tsx           ← imagen con fondo blanco recortado (para el hero)
src/components/games/ReactionGame.tsx ← juego 2 · tiempo de reacción
src/components/games/MasherGame.tsx   ← juego 1 · 100 m machacando teclas
src/lib/canvas.ts                     ← helpers de dibujo cómic (paneles, monedas, líneas de velocidad)
src/lib/scores.ts                     ← ranking en localStorage + clasificación general
src/lib/sfx.ts                        ← efectos de sonido WebAudio (sin ficheros)
src/lib/sprite.ts                     ← carga de sprites + recorte del fondo blanco
src/lib/useInView.ts                  ← evita que el juego "secuestre" el teclado al hacer scroll
```

## 2. Uso en tu página

```tsx
import ArcadeSection from "./components/ArcadeSection";
import Leaderboard from "./components/Leaderboard";
import { getName, loadBoard, setName, submitScore } from "./lib/scores";
```

La web principal ya mantiene el estado en `src/App.tsx` y renderiza:

```tsx
<ArcadeSection board={board} name={name} onName={handleName} onSubmit={handleSubmit} />
<Leaderboard board={board} name={name} />
```

La sección ya tiene `id="game"` y `id="ranking"`, y abre `100m Masher` por defecto.

## 3. Assets

Los juegos y el hero usan estas rutas de `public/`:

- `/usain-bot.png` → sprite de Usain Bot con fondo blanco; `KeyedImg` y `useKeyedSprite` lo recortan automáticamente.
- `/stadium-bg.jpg` → fondo de estadio usado por el arcade.
- La landing conserva `/hero-track-bg.jpg` como fondo de su hero.

Si prefieres recuperar la animación esqueletal de la landing en otras secciones, se mantiene disponible en
`src/components/art/UsainBot.tsx`; el arcade usa el sprite de esta página para conservar su silueta.

## 4. Tokens de diseño

Están replicados exactamente igual que en tu web (`src/index.css`): `--color-ink`, `--color-ink-2`,
`--color-paper`, `--color-bolt`, `--color-jam-gold`, `--color-jam-green`, `--color-flame`,
las fuentes `Bangers / Rubik / JetBrains Mono` y las utilidades `.comic`, `.comic-bolt`, `.press`,
`.halftone`, `.title-shadow`, `.safe-x`… Si ya las tienes, no dupliques nada: borra esa parte del CSS.

## 5. Puntuaciones

Cada juego devuelve `onScore(score, detail)`:

| Juego          | score                                        | detail                  |
| -------------- | -------------------------------------------- | ----------------------- |
| 100m Masher    | `100000 / segundos` (9.39 s ≈ 10.650 pts)     | `"9.41 s"`              |
| Reaction 9.39  | suma de 5 salidas (máx. 10.000)               | `"198 ms medios"`       |

`submitScore()` guarda solo la **mejor marca por alias** en `localStorage`
(`bolt-arcade:v2`) y `overall()` calcula la clasificación general sumando el mejor resultado de cada juego.

### Para un ranking global de verdad

`src/lib/scores.ts` es el punto de adaptación: sustituye `loadBoard()` y `submitScore()` por llamadas
`fetch` a un endpoint (Vercel KV / Upstash Redis / Supabase). La UI no cambia. Las puntuaciones deben
validarse en servidor y asociarse a una identidad o sesión para reducir manipulaciones. No se debe añadir
ningún sorteo o premio económico sin una revisión independiente de reglas, riesgos y cumplimiento.

## 6. Controles

- **PC:** `←`/`→` o `A`/`D` para el masher, `ESPACIO` para reaccionar.
- **Móvil:** toque arriba/abajo del canvas + botones grandes tipo cómic bajo la pantalla.
- El teclado solo se captura cuando la cabina está visible en pantalla (IntersectionObserver), así que
  el scroll de la web nunca se rompe.
