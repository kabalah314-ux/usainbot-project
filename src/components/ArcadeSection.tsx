import { useEffect, useState } from "react";
import MasherGame, { BOT_TIME } from "./games/MasherGame";
import ReactionGame from "./games/ReactionGame";
import { UsainBot } from "./art/UsainBot";
import { setMuted } from "../lib/sfx";
import { shareUrl, type Board, type GameId } from "../lib/scores";

type Props = {
  board: Board;
  name: string;
  onName: (n: string) => void;
  onSubmit: (game: GameId, score: number, detail: string) => number;
  onPlay: () => void;
};

const META: Record<GameId, { title: string; icon: string; tag: string; color: string; ctrl: string }> = {
  masher: {
    title: "100m MASHER",
    icon: "🏁",
    tag: `You are the human: alternate ◀ ▶, charge 3 boosts and beat the powered Usain Bot in ${BOT_TIME.toFixed(2)} s.`,
    color: "bg-jam-green text-paper",
    ctrl: "◀ ▶ / A · D",
  },
  reaction: {
    title: "REACTION 9.39",
    icon: "🔫",
    tag: "Hit 9.39 s. Your score is based on the distance to the target.",
    color: "bg-flame text-paper",
    ctrl: "SPACE / TAP",
  },
};

export default function ArcadeSection({ board, name, onName, onSubmit, onPlay }: Props) {
  const [active, setActive] = useState<GameId>("masher");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    detail: string;
    rank: number | null;
    record: boolean;
    outcome?: "win" | "loss";
  } | null>(null);
  const [draft, setDraft] = useState(name);
  const [mute, setMute] = useState(false);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  const bestOf = (g: GameId) => {
    const mine = board[g].find((r) => !r.cpu && r.name === name.toUpperCase());
    return mine?.score ?? 0;
  };

  const handleScore = (score: number, detail: string, outcome?: "win" | "loss") => {
    const record = score > bestOf(active) && score > 0;
    if (name) {
      const rank = onSubmit(active, score, detail);
      setResult({ score, detail, rank, record, outcome });
    } else {
      setResult({ score, detail, rank: null, record, outcome });
    }
  };

  const saveName = () => {
    const clean = draft.trim().toUpperCase().slice(0, 12);
    if (!clean) return;
    setDraft(clean);
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
    <section className="safe-x relative border-t-[3px] border-ink bg-ink py-10 md:py-20">
      <div className="grid-floor absolute inset-0" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-jam-green">insert coin · 100% FREE</p>
          <h2 className="font-display text-5xl text-paper title-shadow md:text-7xl">
            $BOLT <span className="text-bolt">ARCADE</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
            Two mini-games, one leaderboard. Start with the 100 meters and prove you can beat the powered Usain Bot.
          </p>
        </div>

        {/* cabinet selector */}
        <div className="mt-6 grid grid-cols-2 gap-2 md:mt-8 md:gap-4">
          {(Object.keys(META) as GameId[]).map((g) => {
            const m = META[g];
            const on = g === active;
            return (
              <button
                key={g}
                onClick={() => pick(g)}
                className={`press comic group relative overflow-hidden p-2 text-left transition-colors sm:p-4 ${
                  on ? "bg-ink-2 ring-4 ring-bolt" : "bg-ink-2 hover:ring-2 hover:ring-paper/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`comic-sm flex h-9 w-9 shrink-0 items-center justify-center text-lg sm:h-12 sm:w-12 sm:text-2xl ${m.color}`}>
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-none tracking-wide text-paper sm:text-2xl">{m.title}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-paper/45">{m.ctrl}</p>
                  </div>
                </div>
                <p className="mt-3 hidden text-sm text-paper/70 sm:block">{m.tag}</p>
                <div className="mt-2 flex items-center justify-between border-t border-paper/10 pt-2 sm:mt-3">
                  <span className="font-mono text-[9px] text-paper/50 sm:text-[11px]">
                    YOUR BEST: <b className="text-bolt">{bestOf(g).toLocaleString("en-US")}</b>
                  </span>
                  <span className={`font-display text-sm sm:text-lg ${on ? "text-bolt" : "text-paper/40"}`}>
                    {on ? "▶ JUGANDO" : "JUGAR"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* gateway → sandbox 3D */}
        <button
          onClick={onPlay}
          className="press comic group mt-3 flex w-full items-center justify-between gap-4 bg-ink-2 p-3 text-left ring-4 ring-flame transition-shadow hover:ring-bolt sm:mt-5 sm:p-4"
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="comic-sm flex h-11 w-11 shrink-0 items-center justify-center bg-flame text-xl sm:h-14 sm:w-14 sm:text-3xl">
              🌍
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-none tracking-wide text-paper sm:text-3xl">
                USAINBOT 3D · OPEN WORLD
              </h3>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-paper/50 sm:text-[11px]">
                third person · sandbox · missions · races · vehicles
              </p>
            </div>
          </div>
          <span className="font-display text-base text-flame group-hover:text-bolt sm:text-2xl">ENTER ▶</span>
        </button>

        {/* cabinet */}
        <div id="game" className="mobile-game-cabinet snap-section comic-bolt mt-5 overflow-hidden bg-ink-2 sm:mt-8">
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
                {name ? `PILOT: ${name}` : "PILOT: ANONYMOUS"}
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
                    {meta.title} · RESULT
                  </p>
                  {result.record && (
                    <p className="comic-sm mx-auto -mt-1 mb-1 inline-block rotate-[-3deg] bg-flame px-3 py-1 font-display text-xl tracking-wide text-paper">
                      NEW PERSONAL RECORD!
                    </p>
                  )}
                  <p className="font-display text-6xl text-bolt title-shadow">
                    {result.score.toLocaleString("en-US")}
                  </p>
                  <p className="font-mono text-sm text-paper/70">{result.detail}</p>

                  {active === "masher" && result.outcome && (
                    <div className={`comic-sm mt-4 overflow-hidden border-2 border-ink p-3 ${result.outcome === "win" ? "bg-bolt text-ink" : "bg-flame text-paper"}`}>
                      <div className="mx-auto h-28 w-28">
                        <UsainBot running={result.outcome === "loss"} />
                      </div>
                      <p className="mt-2 font-display text-2xl uppercase leading-none">
                        {result.outcome === "win"
                          ? "Congrats, you beat me at this. Let's see if they give you a Guinness for it."
                          : "YOU LOST, F..K HUMAN. TRY HARDER NEXT TIME"}
                      </p>
                    </div>
                  )}

                  {result.rank === null ? (
                    <div className="mt-4">
                      <p className="text-sm text-paper/80">Register your name to add this score to the leaderboard:</p>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value.toUpperCase().slice(0, 12))}
                          placeholder="YOUR_ALIAS"
                          aria-label="Runner name"
                          maxLength={12}
                          autoFocus
                          className="comic-sm min-w-0 flex-1 bg-ink px-3 py-2 font-mono text-base uppercase text-paper outline-none placeholder:text-paper/30"
                        />
                        <button
                          onClick={saveName}
                          disabled={!draft.trim()}
                          className="press comic-sm bg-bolt px-4 py-2 font-display text-xl text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          SAVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comic-sm mt-4 bg-jam-green px-3 py-2 font-display text-2xl tracking-wide text-paper">
                      RANK #{result.rank} IN {meta.title}
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button onClick={replay} className="press comic-sm bg-bolt py-3 font-display text-2xl text-ink">
                      PLAY AGAIN ▶
                    </button>
                    <button
                      onClick={() => pick(active === "masher" ? "reaction" : "masher")}
                      className="press comic-sm bg-jam-green py-3 font-display text-2xl text-paper"
                    >
                      OTHER GAME ↔
                    </button>
                    <a
                      href={shareUrl(
                        `I scored ${result.score} points in the $BOLT ⚡ ${meta.title} arcade (${result.detail}). Can you beat me? usain-bot.vercel.app`,
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
                    view overall leaderboard
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t-[3px] border-ink bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-paper/45">
            <span>SOLANA · MAINNET-BETA</span>
            <span className="hidden sm:inline">winners are always first</span>
            <span>v1.0 — 2 games + 3D sandbox</span>
          </div>
        </div>
      </div>
    </section>
  );
}
