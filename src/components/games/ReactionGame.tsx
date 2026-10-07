import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "../../lib/sfx";
import { useInViewRef } from "../../lib/useInView";
import { UsainBot } from "../art/UsainBot";

type Props = { onScore: (score: number, detail: string) => void; best: number };
type Step = "idle" | "running" | "result";

const TARGET_SECONDS = 9.39;
const TARGET_MARK = 80;

function scoreFor(delta: number) {
  return Math.max(0, Math.round(10000 - Math.abs(delta) * 1800));
}

function timingLabel(seconds: number) {
  const delta = seconds - TARGET_SECONDS;
  if (Math.abs(delta) < 0.005) return "PERFECT!";
  return `${Math.abs(delta).toFixed(2)} s ${delta < 0 ? "early" : "late"}`;
}

export default function ReactionGame({ onScore, best }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [visualPosition, setVisualPosition] = useState(5);
  const [nearTarget, setNearTarget] = useState(false);
  const [resultLabel, setResultLabel] = useState("");
  const startedAt = useRef(0);
  const stepRef = useRef<Step>("idle");
  const jitterRef = useRef(0);
  const nextJitterAt = useRef(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewRef(wrapRef);
  stepRef.current = step;

  const start = useCallback(() => {
    sfx.unlock();
    startedAt.current = performance.now();
    jitterRef.current = 0;
    nextJitterAt.current = startedAt.current + 450;
    setVisualPosition(5);
    setNearTarget(false);
    setResultLabel("");
    setStep("running");
    sfx.beep();
  }, []);

  const stop = useCallback(() => {
    if (stepRef.current !== "running") return;
    const seconds = (performance.now() - startedAt.current) / 1000;
    const delta = seconds - TARGET_SECONDS;
    const score = scoreFor(delta);
    const label = timingLabel(seconds);
    setResultLabel(label);
    setNearTarget(Math.abs(delta) < 0.12);
    setStep("result");
    if (Math.abs(delta) < 0.05) sfx.win();
    else sfx.coin();
    window.setTimeout(() => onScore(score, label), 350);
  }, [onScore]);

  const react = useCallback(() => {
    if (stepRef.current === "idle") start();
    else if (stepRef.current === "running") stop();
  }, [start, stop]);

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
  }, [inView, react]);

  useEffect(() => {
    if (step !== "running") return;
    let raf = 0;
    const tick = (now: number) => {
      const seconds = (now - startedAt.current) / 1000;
      if (now >= nextJitterAt.current) {
        // A veces hace una finta para que el jugador no pueda seguir un movimiento perfecto.
        jitterRef.current = (Math.random() - 0.5) * 9;
        nextJitterAt.current = now + 420 + Math.random() * 760;
      }

      const base = Math.min(106, 5 + (seconds / TARGET_SECONDS) * (TARGET_MARK - 5));
      const atTarget = Math.abs(seconds - TARGET_SECONDS) < 0.07;
      const position = atTarget
        ? TARGET_MARK
        : Math.min(106, Math.max(4, base + jitterRef.current));
      setVisualPosition(position);
      setNearTarget(Math.abs(seconds - TARGET_SECONDS) < 0.34);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const near = step === "running" && nearTarget;
  const boardTone = step === "result" ? "bg-jam-green" : near ? "bg-bolt" : "bg-ink-2";

  return (
    <div className="relative" ref={wrapRef}>
      <div
        role="button"
        tabIndex={0}
        aria-label={step === "idle" ? "Iniciar Reaction 9.39" : "Parar al personaje"}
        onPointerDown={(e) => {
          e.preventDefault();
          react();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          react();
        }
        }}
        className={`relative w-full cursor-pointer select-none overflow-hidden transition-colors duration-150 ${boardTone}`}
        style={{
          aspectRatio: "16 / 9",
          touchAction: step === "running" ? "none" : "pan-y",
          backgroundImage: "linear-gradient(rgba(11,11,18,.28), rgba(11,11,18,.58)), url('/stadium-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="halftone-ink absolute inset-0 opacity-30" />
        <div className="absolute inset-x-7 top-5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-paper/70 sm:inset-x-10 sm:text-xs">
          <span>REACTION RUN</span>
          <span className={near ? "text-ink" : "text-bolt"}>TARGET · 9.39</span>
        </div>

        <div className="absolute inset-x-8 bottom-[25%] h-2 rounded-full border-2 border-ink bg-paper/25 sm:inset-x-12">
          <div className="h-full w-[80%] rounded-full bg-bolt/60" />
        </div>
        <div
          className="absolute bottom-[17%] z-10 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${Math.min(96, Math.max(4, visualPosition))}%` }}
        >
          <div className="mb-1 whitespace-nowrap bg-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-bolt">
            {near ? "NOW!" : step === "result" ? "STOPPED" : "FOLLOW THE BOT"}
          </div>
          <UsainBot className="w-28 sm:w-40" running={step === "running"} />
        </div>
        <div className="absolute bottom-[20%] left-[80%] z-20 h-16 border-l-4 border-dashed border-ink sm:h-20" />
        <div className="absolute bottom-[7%] left-[80%] z-20 -translate-x-1/2 bg-ink px-2 py-1 font-display text-xl text-bolt sm:text-2xl">
          9.39
        </div>

        {step === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60 p-4">
            <div className="animate-pop max-w-xl text-center">
              <h3 className="font-display text-5xl text-bolt title-shadow sm:text-6xl">REACTION 9.39</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm text-paper/85 sm:text-base">
                The bot runs toward the finish line and crosses it in <b className="text-bolt">9.39 s</b>. Follow its
                sprint, but stay alert: it sometimes feints to throw you off. Tap or press right as it crosses the mark.
              </p>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  start();
                }}
                className="press comic mt-5 bg-bolt px-8 py-3 font-display text-3xl text-ink"
              >
                ON YOUR MARKS ▶
              </button>
              {best > 0 && <p className="mt-3 font-mono text-[11px] text-paper/60">YOUR BEST: {best} pts</p>}
            </div>
          </div>
        )}

        {step === "running" && (
          <div className="absolute inset-x-0 bottom-3 text-center font-mono text-xs font-bold uppercase tracking-[0.22em] text-paper/75 sm:bottom-5">
            {near ? "HIT IT NOW · THE FINISH LINE IS HERE" : "ONE ATTEMPT · TAP OR PRESS SPACE"}
          </div>
        )}

        {step === "result" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/45 p-4">
            <div className="text-center text-ink">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">RESULT</p>
              <h3 className="mt-1 font-display text-5xl title-shadow sm:text-6xl">{resultLabel}</h3>
            </div>
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
          {step === "idle" ? "ON YOUR MARKS ▶" : "PRESS!"}
        </button>
      </div>
    </div>
  );
}
