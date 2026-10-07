import { useState } from "react";
import MasherGame from "./games/MasherGame";
import ReactionGame from "./games/ReactionGame";
import { setMuted } from "../lib/sfx";
import { shareUrl, type Board, type GameId } from "../lib/scores";

type Props = {
  board: Board;
  name: string;
  onName: (n: string) => void;
  onSubmit: (game: GameId, score: number, detail: string) => number;
};

const META: Record<GameId, { title: string; icon: string; tag: string; color: string; ctrl: string }> = {
  masher: {
    title: "100m MASHER",
    icon: "🏁",
    tag: "Machaca ◀ ▶ y baja de 9.39 s en los 100 metros.",
    color: "bg-jam-green text-paper",
    ctrl: "◀ ▶ / A · D",
  },
  reaction: {
    title: "REACTION 9.39",
    icon: "🔫",
    tag: "5 salidas. ¿Tienes reflejos de bot o de humano lento?",
    color: "bg-flame text-paper",
    ctrl: "ESPACIO / toca",
  },
};

export default function ArcadeSection({ board, name, onName, onSubmit }: Props) {
  const [active, setActive] = useState<GameId>("masher");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    detail: string;
    rank: number | null;
    record: boolean;
  } | null>(null);
  const [draft, setDraft] = useState(name);
  const [mute, setMute] = useState(false);

  const bestOf = (g: GameId) => {
    const mine = board[g].find((r) => !r.cpu && r.name === name.toUpperCase());
    return mine?.score ?? 0;
  };

  const handleScore = (score: number, detail: string) => {
    const record = score > bestOf(active) && score > 0;
    if (name) {
      const rank = onSubmit(active, score, detail);
      setResult({ score, detail, rank, record });
    } else {
      setResult({ score, detail, rank: null, record });
    }
  };

  const saveName = () => {
    const clean = draft.trim().toUpperCase().slice(0, 12) || "ANON";
    onName(clean);
    if (result) {
      const rank = onSubmit(active, result.score, result.detail);
      setResult({ ...result, rank });
    }
  };

  const replay = () => {
    setResult(null);
    setRunKey((k) => k + 1);
  };

  const pick = (g: GameId) => {
    setActive(g);
    setResult(null);
    setRunKey((k) => k + 1);
  };

  const meta = META[active];

  return (
    <section id="game" className="safe-x relative border-t-[3px] border-ink bg-ink py-14 md:py-20">
      <div className="grid-floor absolute inset-0" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-jam-green">insert coin · 100% gratis</p>
          <h2 className="font-display text-5xl text-paper title-shadow md:text-7xl">
            $BOLT <span className="text-bolt">ARCADE</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
            Dos minijuegos, un ranking. Empieza por los 100 metros y demuestra que puedes batir los 9.39 s.
          </p>
        </div>

        {/* cabinet selector */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(Object.keys(META) as GameId[]).map((g) => {
            const m = META[g];
            const on = g === active;
            return (
              <button
                key={g}
                onClick={() => pick(g)}
                className={`press comic group relative overflow-hidden p-4 text-left transition-colors ${
                  on ? "bg-ink-2 ring-4 ring-bolt" : "bg-ink-2 hover:ring-2 hover:ring-paper/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`comic-sm flex h-12 w-12 items-center justify-center text-2xl ${m.color}`}>
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl tracking-wide text-paper">{m.title}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-paper/45">{m.ctrl}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-paper/70">{m.tag}</p>
                <div className="mt-3 flex items-center justify-between border-t border-paper/10 pt-2">
                  <span className="font-mono text-[11px] text-paper/50">
                    TU RÉCORD: <b className="text-bolt">{bestOf(g).toLocaleString("es-ES")}</b>
                  </span>
                  <span className={`font-display text-lg ${on ? "text-bolt" : "text-paper/40"}`}>
                    {on ? "▶ JUGANDO" : "JUGAR"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* cabinet */}
        <div className="comic-bolt mt-8 overflow-hidden bg-ink-2">
          <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-ink px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-blink rounded-full bg-flame" />
              <span className="font-display text-xl tracking-wide text-bolt">{meta.title}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-paper/40 sm:inline">
                · usain bot arcade
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[11px] text-paper/50 md:inline">
                {name ? `PILOTO: ${name}` : "PILOTO: ANÓNIMO"}
              </span>
              <button
                onClick={() => {
                  setMute(!mute);
                  setMuted(!mute);
                }}
                className="press comic-sm bg-ink-2 px-3 py-1 font-mono text-[11px] text-paper"
              >
                {mute ? "🔇 OFF" : "🔊 ON"}
              </button>
            </div>
          </div>

          <div className="relative">
            {active === "reaction" && (
              <ReactionGame key={runKey} onScore={handleScore} best={bestOf("reaction")} />
            )}
            {active === "masher" && <MasherGame key={runKey} onScore={handleScore} best={bestOf("masher")} />}

            {result && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/85 p-4">
                <div className="animate-pop comic w-full max-w-md bg-ink-2 p-5 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-jam-green">
                    {meta.title} · resultado
                  </p>
                  {result.record && (
                    <p className="comic-sm mx-auto -mt-1 mb-1 inline-block rotate-[-3deg] bg-flame px-3 py-1 font-display text-xl tracking-wide text-paper">
                      ¡NUEVO RÉCORD PERSONAL!
                    </p>
                  )}
                  <p className="font-display text-6xl text-bolt title-shadow">
                    {result.score.toLocaleString("es-ES")}
                  </p>
                  <p className="font-mono text-sm text-paper/70">{result.detail}</p>

                  {result.rank === null ? (
                    <div className="mt-4">
                      <p className="text-sm text-paper/80">Ponte un nombre de corredor para entrar al ranking:</p>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value.toUpperCase().slice(0, 12))}
                          placeholder="TU_ALIAS"
                          maxLength={12}
                          className="comic-sm min-w-0 flex-1 bg-ink px-3 py-2 font-mono text-base uppercase text-paper outline-none placeholder:text-paper/30"
                        />
                        <button onClick={saveName} className="press comic-sm bg-bolt px-4 py-2 font-display text-xl text-ink">
                          GUARDAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comic-sm mt-4 bg-jam-green px-3 py-2 font-display text-2xl tracking-wide text-paper">
                      PUESTO #{result.rank} EN {meta.title}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={replay} className="press comic-sm bg-bolt py-3 font-display text-2xl text-ink">
                      OTRA VEZ ▶
                    </button>
                    <a
                      href={shareUrl(
                        `He hecho ${result.score} pts en ${meta.title} del arcade de $BOLT ⚡ (${result.detail}). ¿Me superas? usain-bot.vercel.app`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="press comic-sm bg-paper py-3 font-display text-2xl text-ink"
                    >
                      COMPARTIR 𝕏
                    </a>
                  </div>
                  <a
                    href="#ranking"
                    onClick={() => setResult(null)}
                    className="mt-3 inline-block font-mono text-[11px] uppercase tracking-widest text-paper/60 underline decoration-dotted underline-offset-4 hover:text-bolt"
                  >
                    ver clasificación general
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t-[3px] border-ink bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-paper/45">
            <span>ROBINHOOD CHAIN · EVM 4663</span>
            <span className="hidden sm:inline">winners are always first</span>
            <span>v1.0 — 2 juegos</span>
          </div>
        </div>
      </div>
    </section>
  );
}
