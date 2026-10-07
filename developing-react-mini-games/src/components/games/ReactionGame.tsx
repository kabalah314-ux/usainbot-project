import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../../lib/sfx";
import { useInViewRef } from "../../lib/useInView";

type Props = { onScore: (score: number, detail: string) => void; best: number };
type Step = "idle" | "marks" | "set" | "wait" | "bang" | "result" | "done";

const ROUNDS = 5;
const FALSE_START_MS = 750;

function roundPoints(ms: number) {
  return Math.max(0, Math.min(2000, Math.round(2000 - (ms - 120) * 4.2)));
}

function verdict(ms: number) {
  if (ms >= FALSE_START_MS) return "SALIDA NULA 🚨";
  if (ms < 150) return "¿ERES UN BOT? 🤖";
  if (ms < 200) return "VELOCIDAD $BOLT ⚡";
  if (ms < 260) return "PODIO SEGURO 🥇";
  if (ms < 330) return "HUMANO RÁPIDO 🙂";
  if (ms < 430) return "TE HAN GANADO LA SALIDA";
  return "UNA TORTUGA TE ADELANTA 🐢";
}

export default function ReactionGame({ onScore, best }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [falseStart, setFalseStart] = useState(false);
  const bangAt = useRef(0);
  const timers = useRef<number[]>([]);
  const locked = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewRef(wrapRef);
  const stepRef = useRef<Step>("idle");
  stepRef.current = step;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const finish = useCallback(
    (all: number[]) => {
      const total = all.reduce((acc, ms) => acc + roundPoints(ms), 0);
      const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
      const nulls = all.filter((ms) => ms >= FALSE_START_MS).length;
      setStep("done");
      locked.current = true;
      sfx.win();
      timers.current.push(
        window.setTimeout(
          () => onScore(total, `${avg} ms medios${nulls ? ` · ${nulls} nula${nulls > 1 ? "s" : ""}` : ""}`),
          350,
        ),
      );
    },
    [onScore],
  );

  const runRound = useCallback((n: number) => {
    clearTimers();
    setFalseStart(false);
    setLast(null);
    setRound(n);
    setStep("marks");
    sfx.beep();
    timers.current.push(
      window.setTimeout(() => {
        setStep("set");
        sfx.beep();
        timers.current.push(
          window.setTimeout(
            () => {
              setStep("wait");
              timers.current.push(
                window.setTimeout(
                  () => {
                    setStep("bang");
                    bangAt.current = performance.now();
                    sfx.bang();
                  },
                  700 + Math.random() * 2300,
                ),
              );
            },
            700 + Math.random() * 400,
          ),
        );
      }, 950),
    );
  }, []);

  const start = () => {
    sfx.unlock();
    setTimes([]);
    runRound(1);
  };

  const react = useCallback(() => {
    if (locked.current) return;
    const s = stepRef.current;
    if (s === "idle") return start();
    if (s === "result" || s === "done") return;
    if (s === "bang") {
      const ms = Math.round(performance.now() - bangAt.current);
      clearTimers();
      setLast(ms);
      setStep("result");
      sfx.coin();
      const all = [...times, ms];
      setTimes(all);
      timers.current.push(
        window.setTimeout(() => (all.length >= ROUNDS ? finish(all) : runRound(all.length + 1)), 1250),
      );
    } else {
      // pressed too early
      clearTimers();
      setFalseStart(true);
      setLast(FALSE_START_MS);
      setStep("result");
      sfx.fail();
      const all = [...times, FALSE_START_MS];
      setTimes(all);
      timers.current.push(
        window.setTimeout(() => (all.length >= ROUNDS ? finish(all) : runRound(all.length + 1)), 1450),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, finish, runRound]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        react();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [react]);

  const bg =
    step === "bang"
      ? "bg-bolt"
      : step === "set"
        ? "bg-flame"
        : step === "result" && falseStart
          ? "bg-flame"
          : step === "result"
            ? "bg-jam-green"
            : "bg-ink-2";

  const headline =
    step === "idle"
      ? "REACTION 9.39"
      : step === "marks"
        ? "A SUS PUESTOS…"
        : step === "set"
          ? "LISTOS…"
          : step === "wait"
            ? "…"
            : step === "bang"
              ? "¡YA!"
              : step === "result"
                ? falseStart
                  ? "¡SALIDA NULA!"
                  : `${last} ms`
                : "CARRERA COMPLETA";

  const running = step !== "idle" && step !== "done";

  return (
    <div className="relative" ref={wrapRef}>
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          react();
        }}
        className={`relative flex w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden transition-colors duration-75 ${bg}`}
        style={{ aspectRatio: "16 / 9", touchAction: running ? "none" : "pan-y" }}
      >
        <div className="halftone-ink absolute inset-0 opacity-30" />
        {step === "bang" && <div className="absolute inset-0 animate-pop bg-bolt" />}

        <div className="relative z-10 px-6 text-center">
          <h3
            className={`font-display leading-none ${
              step === "bang" || (step === "result" && !falseStart) || step === "set"
                ? "text-ink"
                : "text-paper"
            } ${step === "bang" ? "text-7xl sm:text-8xl" : "text-5xl sm:text-7xl"} title-shadow`}
          >
            {headline}
          </h3>

          {step === "idle" && (
            <>
              <p className="mx-auto mt-3 max-w-lg text-sm text-paper/80 sm:text-base">
                5 salidas. Cuando la pantalla se ponga <b className="text-bolt">AMARILLA</b>, toca o pulsa{" "}
                <b>ESPACIO</b> lo más rápido que puedas. Si te adelantas… salida nula.
              </p>
              <button className="press comic mt-5 bg-bolt px-8 py-3 font-display text-3xl text-ink">
                A SUS PUESTOS ▶
              </button>
              {best > 0 && (
                <p className="mt-3 font-mono text-[11px] text-paper/60">TU MEJOR MARCA: {best} pts</p>
              )}
            </>
          )}

          {step === "result" && (
            <p
              className={`mt-2 font-display text-2xl sm:text-3xl ${
                falseStart ? "text-paper" : "text-ink"
              }`}
            >
              {verdict(last ?? 0)}
            </p>
          )}

          {step === "wait" && (
            <p className="mt-2 animate-blink font-mono text-sm text-paper/70">no te muevas…</p>
          )}

          {step === "done" && (
            <p className="mt-2 font-display text-2xl text-bolt">calculando marcador…</p>
          )}
        </div>

        {running && (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
            {Array.from({ length: ROUNDS }).map((_, i) => {
              const t = times[i];
              return (
                <div
                  key={i}
                  className={`comic-sm flex h-8 min-w-[54px] items-center justify-center px-1 font-mono text-[11px] font-bold ${
                    t === undefined
                      ? i + 1 === round
                        ? "animate-blink bg-paper text-ink"
                        : "bg-ink/70 text-paper/60"
                      : t >= FALSE_START_MS
                        ? "bg-flame text-paper"
                        : "bg-jam-green text-paper"
                  }`}
                >
                  {t === undefined ? `#${i + 1}` : t >= FALSE_START_MS ? "NULA" : `${t}`}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t-[3px] border-ink bg-ink-2 p-3 md:hidden">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            react();
          }}
          className="press comic-sm w-full bg-bolt py-3 font-display text-2xl text-ink"
        >
          ¡REACCIONA!
        </button>
      </div>
    </div>
  );
}
