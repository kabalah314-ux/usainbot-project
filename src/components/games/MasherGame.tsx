import { useEffect, useRef, useState } from "react";
import {
  attachResponsiveCanvas,
  BOLT,
  FLAME,
  GOLD,
  INK,
  outlinedText,
  panel,
  PAPER,
  roundRect,
  speedLines,
  VIEW_H,
  VIEW_W,
} from "../../lib/canvas";
import { sfx } from "../../lib/sfx";
import { useImage, useKeyedSprite } from "../../lib/sprite";
import { useInViewRef } from "../../lib/useInView";

type Props = {
  onScore: (score: number, detail: string, outcome?: "win" | "loss") => void;
  best: number;
};

const PPM = 62; // pixels per meter
const GROUND = 430;
const RACE = 100;
const VMAX = 18;
const TOTAL_BOOSTS = 3;
const COMBO_TARGET = 8;
const RHYTHM_MIN_INTERVAL = 0.12;
const RHYTHM_WINDOW = 0.46;
const FINISH_STREAK = 6;
export const BOT_TIME = 8.8;
const BOT_BOOST_TIMES = [2.2, 4.4, 6.55];

/** smooth sprint curve for the ghost runners */
function ghostDistance(t: number, total: number) {
  if (t <= 0) return 0;
  const k = Math.min(1, t / total);
  const base = 88 * Math.min(1, k ** 1.12);
  const bursts = BOT_BOOST_TIMES.reduce((sum, boostAt) => {
    const progress = Math.min(1, Math.max(0, (t - boostAt) / 0.7));
    return sum + progress * 4;
  }, 0);
  return Math.min(RACE, base + bursts);
}

function botBoostCount(t: number) {
  return BOT_BOOST_TIMES.filter((boostAt) => t >= boostAt).length;
}

export default function MasherGame({ onScore, best }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewRef(wrapRef);
  const [phase, setPhase] = useState<"intro" | "ready" | "count" | "run" | "finish">("intro");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [result, setResult] = useState<{ time: number; boosts: number; won: boolean } | null>(null);
  const [hud, setHud] = useState({ combo: 0, boosts: 0, botBoosts: 0, faults: 0 });

  const sprite = useKeyedSprite("/usain-bot.png");
  const humanSprite = useKeyedSprite("/human-runner.jpg");
  const stadium = useImage("/stadium-bg.jpg");
  const spriteRef = useRef(sprite);
  spriteRef.current = sprite;
  const humanSpriteRef = useRef(humanSprite);
  humanSpriteRef.current = humanSprite;
  const stadiumRef = useRef(stadium);
  stadiumRef.current = stadium;

  const s = useRef({
    t: 0,
    time: 0,
    d: 0,
    v: 0,
    lastKey: "" as "" | "L" | "R",
    lastInputAt: 0,
    combo: 0,
    boosts: 0,
    botBoosts: 0,
    faults: 0,
    perfectStreak: 0,
    boostTimer: 0,
    boostFlash: 0,
    countdown: 3.2,
    cadence: 0,
    stumble: 0,
    pops: [] as { x: number; y: number; life: number; text: string; color: string }[],
    lastBeep: 4,
  });

  const reset = () => {
    const st = s.current;
    st.time = 0;
    st.d = 0;
    st.v = 0;
    st.lastKey = "";
    st.lastInputAt = 0;
    st.combo = 0;
    st.boosts = 0;
    st.botBoosts = 0;
    st.faults = 0;
    st.perfectStreak = 0;
    st.boostTimer = 0;
    st.boostFlash = 0;
    st.countdown = 3.2;
    st.cadence = 0;
    st.stumble = 0;
    st.pops = [];
    st.lastBeep = 4;
    setHud({ combo: 0, boosts: 0, botBoosts: 0, faults: 0 });
  };

  const start = () => {
    sfx.unlock();
    reset();
    setResult(null);
    setPhase("count");
  };

  const showInstructions = () => {
    sfx.unlock();
    reset();
    setPhase("ready");
  };

  const push = (side: "L" | "R") => {
    if (phaseRef.current === "finish") return;
    if (phaseRef.current === "intro" || phaseRef.current === "ready") return;
    if (phaseRef.current !== "run") return;
    const st = s.current;
    const interval = st.lastInputAt > 0 ? st.time - st.lastInputAt : 0;
    const timingFault = st.lastInputAt > 0 && (interval < RHYTHM_MIN_INTERVAL || interval > RHYTHM_WINDOW);
    if (st.lastKey === side || timingFault) {
      st.faults += 1;
      st.combo = 0;
      st.perfectStreak = 0;
      st.lastKey = side;
      st.lastInputAt = st.time;
      st.v *= 0.46;
      st.stumble = 0.7;
      st.boostFlash = 0;
      setHud({ combo: st.combo, boosts: st.boosts, botBoosts: st.botBoosts, faults: st.faults });
      return;
    }

    st.lastKey = side;
    st.lastInputAt = st.time;
    st.combo = Math.min(COMBO_TARGET, st.combo + 1);
    st.perfectStreak = Math.min(FINISH_STREAK, st.perfectStreak + 1);
    st.v += 1.45 * Math.max(0.18, 1 - st.v / VMAX);
    st.cadence = 1;
    st.stumble = 0;

    if (st.combo >= COMBO_TARGET && st.boosts < TOTAL_BOOSTS) {
      st.boosts += 1;
      st.combo = st.boosts === TOTAL_BOOSTS ? COMBO_TARGET : 0;
      st.boostTimer = 1.45;
      st.boostFlash = 0.9;
      st.v = Math.min(VMAX, st.v + 4.2);
      sfx.win();
    } else {
      sfx.step();
    }
    setHud({ combo: st.combo, boosts: st.boosts, botBoosts: st.botBoosts, faults: st.faults });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !inView.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (["arrowleft", "a", "arrowright", "d", " "].includes(k)) e.preventDefault();
      if (k === "arrowleft" || k === "a") push("L");
      if (k === "arrowright" || k === "d") push("R");
      if (k === " " && phaseRef.current === "ready") start();
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const detach = attachResponsiveCanvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return detach;
    let raf = 0;
    let last = performance.now();
    let mounted = true;

    const step = (dt: number) => {
      const st = s.current;
      st.t += dt;
      st.cadence = Math.max(0, st.cadence - dt * 3);
      st.stumble = Math.max(0, st.stumble - dt);
      st.boostTimer = Math.max(0, st.boostTimer - dt);
      st.boostFlash = Math.max(0, st.boostFlash - dt);
      st.pops.forEach((p) => (p.life -= dt));
      st.pops = st.pops.filter((p) => p.life > 0);

      if (phaseRef.current === "count") {
        st.countdown -= dt;
        const n = Math.ceil(st.countdown);
        if (n < st.lastBeep && n >= 0) {
          st.lastBeep = n;
          if (n > 0) sfx.beep();
        }
        if (st.countdown <= 0) {
          sfx.bang();
          setPhase("run");
        }
        return;
      }
      if (phaseRef.current !== "run") return;

      st.time += dt;
      const currentBotBoosts = botBoostCount(st.time);
      if (currentBotBoosts !== st.botBoosts) {
        st.botBoosts = currentBotBoosts;
        setHud({ combo: st.combo, boosts: st.boosts, botBoosts: st.botBoosts, faults: st.faults });
      }
      const decay = st.boostTimer > 0 ? 0.42 + st.v * 0.09 : 0.72 + st.v * 0.18;
      st.v = Math.max(0, st.v - decay * dt);
      st.d += st.v * dt;

      if (st.d >= RACE) {
        st.d = RACE;
        const time = st.time;
        const cadenceHeld = st.lastInputAt > 0 && time - st.lastInputAt <= RHYTHM_WINDOW;
        const won =
          st.boosts >= TOTAL_BOOSTS &&
          st.faults === 0 &&
          st.perfectStreak >= FINISH_STREAK &&
          cadenceHeld &&
          time <= BOT_TIME;
        setResult({ time, boosts: st.boosts, won });
        setPhase("finish");
        const rawScore = Math.round(100000 / Math.max(8, time));
        const score = won ? rawScore : Math.round(rawScore * (st.boosts / TOTAL_BOOSTS) * 0.65);
        if (won) sfx.win();
        else sfx.coin();
        window.setTimeout(() => {
          if (mounted)
            onScore(
              score,
              `${time.toFixed(2)} s · ${st.boosts}/${TOTAL_BOOSTS} BOOSTS · ${st.faults} FAULTS${won ? " — POWERED USAIN BOT DEFEATED" : " — POWERED USAIN BOT WINS"}`,
              won ? "win" : "loss",
            );
        }, 500);
      }
    };

    const drawRunner = (
      x: number,
      y: number,
      h: number,
      alpha: number,
      tint: string | null,
      t: number,
      speed: number,
      source: HTMLCanvasElement | null = spriteRef.current,
    ) => {
      const sp = source;
      const w = sp ? h * (sp.width / sp.height) : h;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y - h / 2);
      const f = Math.sin(t * (6 + speed * 1.5));
      ctx.rotate(f * 0.04);
      ctx.translate(0, f * 3);
      if (sp) {
        if (tint) {
          const off = document.createElement("canvas");
          off.width = sp.width;
          off.height = sp.height;
          const o = off.getContext("2d");
          if (o) {
            o.drawImage(sp, 0, 0);
            o.globalCompositeOperation = "source-in";
            o.fillStyle = tint;
            o.fillRect(0, 0, off.width, off.height);
            ctx.drawImage(off, -w / 2, -h / 2, w, h);
          }
        } else {
          ctx.drawImage(sp, -w / 2, -h / 2, w, h);
        }
      } else {
        ctx.fillStyle = tint ?? GOLD;
        roundRect(ctx, -w / 2, -h / 2, w, h, 10);
        ctx.fill();
      }
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(dt);
      const st = s.current;

      const camX = st.d * PPM - 280;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#090913");
      sky.addColorStop(1, "#26203a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW_W, GROUND);

      const img = stadiumRef.current;
      if (img) {
        const iw = VIEW_W * 1.4;
        const ih = iw * (img.height / img.width);
        const off = (camX * 0.12) % iw;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img, -off, GROUND - ih * 0.95, iw, ih);
        ctx.drawImage(img, iw - off, GROUND - ih * 0.95, iw, ih);
        ctx.restore();
        ctx.fillStyle = "rgba(11,11,18,.45)";
        ctx.fillRect(0, 0, VIEW_W, GROUND);
      }

      // track
      ctx.fillStyle = "#a8462f";
      ctx.fillRect(0, GROUND - 6, VIEW_W, VIEW_H - GROUND + 6);
      ctx.fillStyle = INK;
      ctx.fillRect(0, GROUND - 10, VIEW_W, 5);
      // lanes
      ctx.strokeStyle = "rgba(245,241,230,.75)";
      ctx.lineWidth = 3;
      [40, 78].forEach((dy) => {
        ctx.beginPath();
        ctx.moveTo(0, GROUND + dy);
        ctx.lineTo(VIEW_W, GROUND + dy);
        ctx.stroke();
      });

      // distance markers
      for (let m = 0; m <= RACE; m += 10) {
        const x = m * PPM - camX;
        if (x < -80 || x > VIEW_W + 80) continue;
        ctx.fillStyle = "rgba(245,241,230,.6)";
        ctx.fillRect(x - 2, GROUND - 4, 4, 22);
        outlinedText(ctx, `${m}m`, x, GROUND - 14, {
          font: "700 15px 'JetBrains Mono', monospace",
          fill: "rgba(245,241,230,.8)",
          lw: 4,
          align: "center",
        });
      }

      // finish line
      const fx = RACE * PPM - camX;
      if (fx < VIEW_W + 200) {
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = i % 2 ? PAPER : INK;
          ctx.fillRect(fx - 10, GROUND - 4 + i * 8, 20, 8);
        }
        panel(ctx, fx - 120, 40, 240, 62, INK, 10);
        outlinedText(ctx, "META", fx, 68, {
          font: "40px 'Bangers', 'Rubik', sans-serif",
          fill: BOLT,
          lw: 6,
          align: "center",
          baseline: "middle",
        });
        outlinedText(ctx, "TARGET " + BOT_TIME.toFixed(2) + "s", fx, 92, {
          font: "700 14px 'JetBrains Mono', monospace",
          fill: PAPER,
          lw: 4,
          align: "center",
          baseline: "middle",
        });
      }

      // ghosts
      const showTime = phaseRef.current === "run" || phaseRef.current === "finish" ? st.time : 0;
      const robotBoosts = botBoostCount(showTime);
      const robotDistance = ghostDistance(showTime, BOT_TIME);
      const robotX = robotDistance * PPM - camX;
      drawRunner(robotX, GROUND + 82, 110, 1, null, st.t, 9);
      outlinedText(ctx, "USAIN BOT · " + robotBoosts + "/3 BOOSTS", robotX, GROUND + 102, {
        font: "700 11px 'JetBrains Mono', monospace",
        fill: BOLT,
        lw: 3,
        align: "center",
      });

      // player
      const px = st.d * PPM - camX;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(px, GROUND + 12, 42, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawRunner(px, GROUND + 10, 126, 1, null, st.t, st.v, humanSpriteRef.current);
      outlinedText(ctx, "YOU · HUMAN", px, GROUND - 126, {
        font: "700 11px 'JetBrains Mono', monospace",
        fill: PAPER,
        lw: 3,
        align: "center",
      });
      if (st.stumble > 0)
        outlinedText(ctx, "STUMBLE!", px, GROUND - 120, {
          font: "28px 'Bangers','Rubik',sans-serif",
          fill: FLAME,
          lw: 6,
          align: "center",
        });

      speedLines(ctx, st.d * PPM, Math.min(st.boostTimer > 0 ? 0.72 : 0.45, st.v / 26));

      // HUD
      panel(ctx, 16, 16, 250, 58, "rgba(11,11,18,.85)", 8);
      outlinedText(ctx, `${st.time.toFixed(2)}s`, 30, 58, {
        font: "700 34px 'JetBrains Mono', monospace",
        fill: st.time < BOT_TIME ? BOLT : PAPER,
        lw: 5,
      });
      outlinedText(ctx, `${st.d.toFixed(1)} m`, 250, 58, {
        font: "700 22px 'JetBrains Mono', monospace",
        fill: "#7cffa8",
        lw: 5,
        align: "right",
      });

      panel(ctx, VIEW_W - 216, 16, 200, 58, "rgba(11,11,18,.85)", 8);
      outlinedText(ctx, `${st.v.toFixed(1)} m/s`, VIEW_W - 116, 44, {
        font: "700 22px 'JetBrains Mono', monospace",
        fill: BOLT,
        lw: 5,
        align: "center",
      });
      const bw = 168;
      ctx.fillStyle = "rgba(245,241,230,.18)";
      roundRect(ctx, VIEW_W - 200, 52, bw, 12, 6);
      ctx.fill();
      ctx.fillStyle = st.v > 11 ? FLAME : BOLT;
      roundRect(ctx, VIEW_W - 200, 52, Math.max(3, (bw * st.v) / VMAX), 12, 6);
      ctx.fill();

      if (best > 0)
        outlinedText(ctx, `BEST ${best} pts`, VIEW_W / 2, 36, {
          font: "700 15px 'JetBrains Mono', monospace",
          fill: "rgba(245,241,230,.7)",
          lw: 4,
          align: "center",
        });

      // The combo meter is the core skill gate: all three boosts are required to win.
      const boostY = VIEW_H - 62;
      panel(ctx, 16, boostY, VIEW_W - 32, 48, "rgba(11,11,18,.86)", 8);
      outlinedText(ctx, "COMBO " + st.combo + "/" + COMBO_TARGET, 34, boostY + 30, {
        font: "700 16px 'JetBrains Mono', monospace",
        fill: st.combo >= COMBO_TARGET ? GOLD : PAPER,
        lw: 4,
      });
      const comboX = 214;
      const comboW = 280;
      ctx.fillStyle = "rgba(245,241,230,.18)";
      roundRect(ctx, comboX, boostY + 17, comboW, 14, 7);
      ctx.fill();
      ctx.fillStyle = st.boostFlash > 0 ? GOLD : BOLT;
      roundRect(ctx, comboX, boostY + 17, comboW * Math.min(1, st.combo / COMBO_TARGET), 14, 7);
      ctx.fill();
      outlinedText(ctx, "BOOSTS", 536, boostY + 30, {
        font: "700 16px 'JetBrains Mono', monospace",
        fill: PAPER,
        lw: 4,
      });
      for (let i = 0; i < TOTAL_BOOSTS; i++) {
        const x = 648 + i * 76;
        panel(ctx, x, boostY + 11, 58, 26, i < st.boosts ? (st.boostFlash > 0 ? GOLD : BOLT) : "rgba(245,241,230,.12)", 5, 2);
        outlinedText(ctx, i < st.boosts ? "⚡" : "—", x + 29, boostY + 30, {
          font: "700 17px 'JetBrains Mono', monospace",
          fill: i < st.boosts ? INK : "rgba(245,241,230,.55)",
          lw: 3,
          align: "center",
        });
      }

      // countdown
      if (phaseRef.current === "count") {
        const n = Math.ceil(st.countdown);
        outlinedText(ctx, n > 0 ? `${n}` : "GO!", VIEW_W / 2, VIEW_H / 2 - 40, {
          font: "150px 'Bangers','Rubik',sans-serif",
          fill: n > 0 ? PAPER : BOLT,
          lw: 12,
          align: "center",
          baseline: "middle",
        });
        outlinedText(ctx, n > 1 ? "ON YOUR MARKS" : "MASH THE KEYS!", VIEW_W / 2, VIEW_H / 2 + 50, {
          font: "700 22px 'Rubik',sans-serif",
          fill: PAPER,
          lw: 5,
          align: "center",
          baseline: "middle",
        });
      }

      // cadence prompt
      if (phaseRef.current === "run") {
        const nextSide = st.lastKey === "L" ? "R" : "L";
        const label = nextSide === "L" ? "◀ LEFT / A" : "RIGHT / D ▶";
        outlinedText(ctx, label, VIEW_W / 2, VIEW_H - 78, {
          font: "700 22px 'Rubik',sans-serif",
          fill: st.cadence > 0.2 ? BOLT : PAPER,
          lw: 5,
          align: "center",
        });
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best]);

  return (
    <div className="relative" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="game-canvas block w-full select-none bg-ink"
        style={{ aspectRatio: "16 / 9", touchAction: phase === "run" ? "none" : "pan-y" }}
      />

      {phase === "intro" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/55 p-3 backdrop-blur-lg sm:p-6">
          <div className="animate-pop flex w-full max-w-2xl flex-col items-center text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-jam-green sm:text-xs">
              challenge accepted · powered usain bot
            </p>
            <div className="mx-auto mt-1 h-64 w-full sm:h-[28rem]">
              <img
                src="/usain-bot-challenge.png"
                alt="Usain Bot says: You think you can beat me?"
                className="h-full w-full object-contain drop-shadow-[8px_10px_0_rgba(0,0,0,0.45)]"
              />
            </div>
            <h3 className="font-display text-4xl text-bolt title-shadow sm:text-6xl">100M MASHER</h3>
            <p className="mt-1 font-display text-lg uppercase tracking-wide text-jam-green sm:text-2xl">
              YOU THINK YOU CAN BEAT ME?
            </p>
            <button
              onClick={showInstructions}
              className="press comic mt-3 bg-jam-green px-10 py-2 font-display text-3xl text-paper sm:mt-5 sm:px-12 sm:py-3 sm:text-4xl"
            >
              PLAY ▶
            </button>
          </div>
        </div>
      )}

      {phase === "ready" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/75 p-2 backdrop-blur-sm sm:p-4">
          <div className="animate-pop max-w-lg text-center">
            <h3 className="font-display text-4xl text-bolt title-shadow sm:text-6xl">HOW TO PLAY</h3>
            <p className="mt-1 text-[11px] leading-tight text-paper/80 sm:mt-2 sm:text-base">
              You are the human. Alternate <b className="text-bolt">◀ / ▶</b> (or A / D) quickly: every{" "}
              <b className="text-bolt">8 clean hits</b> charges a boost. You need all{" "}
              <b className="text-bolt">3 boosts</b>, zero faults, and a time under <b className="text-bolt">{BOT_TIME.toFixed(2)} s</b> to beat the powered Usain Bot.
            </p>
            <button
              onClick={start}
              className="press comic mt-3 bg-jam-green px-6 py-2 font-display text-2xl text-paper sm:mt-5 sm:px-8 sm:py-3 sm:text-3xl"
            >
              TO THE TRACK ▶
            </button>
          </div>
        </div>
      )}

      {phase === "finish" && result !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/55">
          <div className="animate-pop text-center">
            <h3
              className={
                result.won
                  ? "font-display text-6xl text-bolt title-shadow sm:text-7xl"
                  : "font-display text-6xl text-flame title-shadow sm:text-7xl"
              }
            >
              {result.won ? "WORLD RECORD!" : result.boosts < TOTAL_BOOSTS ? "BOOSTS MISSING!" : "SO CLOSE!"}
            </h3>
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-paper">
              {result.boosts}/{TOTAL_BOOSTS} boosts · {result.time.toFixed(2)} s
            </p>
          </div>
        </div>
      )}

      <div className="border-t-[3px] border-ink bg-ink-2 p-3">
        <div className="mb-3 rounded-sm border-2 border-paper/15 bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-paper/65">
         <div className="flex items-center justify-between gap-3">
           <span>
             COMBO <b className="text-bolt">{hud.combo}/{COMBO_TARGET}</b>
           </span>
           <span>
             BOOSTS <b className="text-bolt">{hud.boosts}/{TOTAL_BOOSTS}</b>
           </span>
         </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-paper/10 pt-2">
            <span>
             USAIN BOT <b className="text-flame">{hud.botBoosts}/{TOTAL_BOOSTS} ⚡</b>
           </span>
           <span>
             FAULTS <b className={hud.faults ? "text-flame" : "text-jam-green"}>{hud.faults}</b>
            </span>
            <span>
              TARGET <b className="text-flame">{BOT_TIME.toFixed(2)} S</b>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper/15">
              <div
                className="h-full rounded-full bg-bolt transition-[width] duration-100"
                style={{ width: `${Math.min(100, (hud.combo / COMBO_TARGET) * 100)}%` }}
              />
            </div>
            <div className="flex gap-1" aria-label={`${hud.boosts} de ${TOTAL_BOOSTS} boosts`}>
              {Array.from({ length: TOTAL_BOOSTS }).map((_, i) => (
                <span
                  key={i}
                  className={`grid h-5 w-7 place-items-center border ${i < hud.boosts ? "border-bolt bg-bolt text-ink" : "border-paper/25 text-paper/30"}`}
                >
                  ⚡
                </span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-paper/45">
           {hud.boosts === TOTAL_BOOSTS
              ? `3/3 BOOSTS: perfect timing, zero faults, finish before ${BOT_TIME.toFixed(2)} s.`
             : `Alternate fast inside the timing window. One mistake resets the combo and ruins the perfect run.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              push("L");
            }}
            className="press comic-sm bg-bolt py-4 font-display text-3xl text-ink"
          >
            <span className="sm:hidden">TAP LEFT</span>
            <span className="hidden sm:inline">◀ LEFT</span>
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              push("R");
            }}
            className="press comic-sm bg-jam-green py-4 font-display text-3xl text-paper"
          >
            <span className="sm:hidden">TAP RIGHT</span>
            <span className="hidden sm:inline">RIGHT ▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
