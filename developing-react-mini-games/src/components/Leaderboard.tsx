import { useState } from "react";
import { GAMES, overall, shareUrl, type Board, type GameId } from "../lib/scores";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ board, name }: { board: Board; name: string }) {
  const [tab, setTab] = useState<"general" | GameId>("general");
  const general = overall(board);
  const rows =
    tab === "general"
      ? general.map((r, i) => ({
          key: r.name + i,
          name: r.name,
          detail: `${r.games} juego${r.games > 1 ? "s" : ""}`,
          score: r.total,
          cpu: r.cpu,
        }))
      : board[tab].map((r, i) => ({ key: r.id + i, name: r.name, detail: r.detail, score: r.score, cpu: r.cpu }));

  const myRow = general.findIndex((r) => r.name === name.toUpperCase());

  return (
    <section id="ranking" className="safe-x relative border-t-[3px] border-ink bg-ink-2 py-16 md:py-20">
      <div className="halftone-ink absolute inset-0 opacity-10" />
      <div className="relative mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-jam-green">clasificación general</p>
            <h2 className="font-display text-5xl text-paper title-shadow md:text-6xl">
              MURO DE <span className="text-bolt">CAMPEONES</span>
            </h2>
          </div>
          <a
            href={shareUrl(
              `Estoy machacando el arcade de $BOLT ⚡ Usain Bot. ¿Puedes batir mi marca? usain-bot.vercel.app #BOLT #RobinhoodChain`,
            )}
            target="_blank"
            rel="noreferrer"
            className="press comic bg-paper px-5 py-2 font-display text-xl text-ink"
          >
            RETAR EN X 𝕏
          </a>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["general", ...GAMES.map((g) => g.id)] as const).map((id) => {
            const label = id === "general" ? "GENERAL" : GAMES.find((g) => g.id === id)!.name.toUpperCase();
            const on = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`press comic-sm px-4 py-2 font-display text-lg tracking-wide transition-colors ${
                  on ? "bg-bolt text-ink" : "bg-ink text-paper/70 hover:text-bolt"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="comic mt-5 bg-ink">
          <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 border-b-[3px] border-paper/15 bg-ink-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-paper/50">
            <span>#</span>
            <span>corredor</span>
            <span>puntos</span>
          </div>
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-paper/50">
              Nadie ha corrido todavía. Sé el primero — winners are always first.
            </p>
          )}
          {rows.map((r, i) => {
            const mine = r.name === name.toUpperCase() && !r.cpu;
            return (
              <div
                key={r.key}
                className={`grid grid-cols-[46px_1fr_auto] items-center gap-3 border-b border-paper/10 px-4 py-3 ${
                  mine ? "bg-bolt/12" : i % 2 ? "bg-paper/[0.03]" : ""
                }`}
              >
                <span className="font-display text-2xl text-bolt">{MEDALS[i] ?? i + 1}</span>
                <span className="min-w-0">
                  <span
                    className={`block truncate font-display text-xl tracking-wide ${
                      mine ? "text-bolt" : "text-paper"
                    }`}
                  >
                    {r.name}
                    {mine && <span className="ml-2 font-mono text-[10px] text-jam-green">TÚ</span>}
                    {r.cpu && <span className="ml-2 font-mono text-[10px] text-paper/35">CPU</span>}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-paper/50">{r.detail}</span>
                </span>
                <span className="tabnums font-mono text-lg font-bold text-paper">{r.score.toLocaleString("es-ES")}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-3 text-xs text-paper/50 md:flex-row md:items-center">
          <p className="font-mono">
            Las marcas se guardan en este navegador (localStorage). Pronto: ranking on-chain en Robinhood Chain.
          </p>
          {myRow >= 0 && (
            <p className="comic-sm bg-jam-green px-3 py-1 font-mono text-[11px] text-paper">
              TU PUESTO GENERAL: #{myRow + 1}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
