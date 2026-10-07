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

type Props = { onScore: (score: number, detail: string) => void; best: number };

const PPM = 62; // pixels per meter
const GROUND = 430;
const RACE = 100;
const VMAX = 15;

/** smooth sprint curve for the ghost runners */
function ghostDistance(t: number, total: number) {
  if (t <= 0) return 0;
  const k = Math.min(1, t / total);
  return RACE * Math.min(1, k ** 1.12);
}

export default function MasherGame({ onScore, best }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewRef(wrapRef);
  const [phase, setPhase] = useState<"ready" | "count" | "run" | "finish">("ready");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [result, setResult] = useState<number | null>(null);

  const sprite = useKeyedSprite("/usain-bot.png");
  const stadium = useImage("/stadium-bg.jpg");
  const spriteRef = useRef(sprite);
  spriteRef.current = sprite;
  const stadiumRef = useRef(stadium);
  stadiumRef.current = stadium;

  const s = useRef({
    t: 0,
    time: 0,
    d: 0,
    v: 0,
    lastKey: "" as "" | "L" | "R",
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
    st.countdown = 3.2;
    st.cadence = 0;
    st.stumble = 0;
    st.pops = [];
    st.lastBeep = 4;
  };

  const start = () => {
    sfx.unlock();
    reset();
    setResult(null);
    setPhase("count");
  };

  const push = (side: "L" | "R") => {
    if (phaseRef.current === "finish") return;
    if (phaseRef.current === "ready") return start();
    if (phaseRef.current !== "run") return;
    const st = s.current;
    if (st.lastKey === side) {
      st.v *= 0.9;
      st.stumble = 0.35;
      return;
    }
    st.lastKey = side;
    st.v += 1.3 * Math.max(0.12, 1 - st.v / VMAX);
    st.cadence = 1;
    sfx.step();
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
      st.v = Math.max(0, st.v - (0.75 + st.v * 0.2) * dt);
      st.d += st.v * dt;

      if (st.d >= RACE) {
        st.d = RACE;
        const time = st.time;
        setResult(time);
        setPhase("finish");
        const score = Math.round(100000 / Math.max(8, time));
        if (time <= 9.58) sfx.win();
        else sfx.coin();
        window.setTimeout(() => {
          if (mounted)
            onScore(
              score,
              `${time.toFixed(2)} s${time < 9.39 ? " — RÉCORD MUNDIAL" : time < 9.58 ? " — bate a Usain" : ""}`,
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
    ) => {
      const sp = spriteRef.current;
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
        outlinedText(ctx, "RÉCORD 9.39", fx, 92, {
          font: "700 14px 'JetBrains Mono', monospace",
          fill: PAPER,
          lw: 4,
          align: "center",
          baseline: "middle",
        });
      }

      // ghosts
      const showTime = phaseRef.current === "run" || phaseRef.current === "finish" ? st.time : 0;
      const ghosts = [
        { total: 9.58, color: "rgba(255,77,45,.55)", label: "9.58 HUMANO", lane: 46 },
        { total: 9.39, color: "rgba(255,225,77,.55)", label: "9.39 BOT WR", lane: 84 },
      ];
      ghosts.forEach((gh) => {
        const gd = ghostDistance(showTime, gh.total);
        const x = gd * PPM - camX;
        drawRunner(x, GROUND + gh.lane, 82, 0.75, gh.color, st.t, 9);
        outlinedText(ctx, gh.label, x, GROUND + gh.lane + 16, {
          font: "700 11px 'JetBrains Mono', monospace",
          fill: PAPER,
          lw: 3,
          align: "center",
        });
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
      drawRunner(px, GROUND + 10, 120, 1, null, st.t, st.v);
      if (st.stumble > 0)
        outlinedText(ctx, "¡TROPIEZO!", px, GROUND - 120, {
          font: "28px 'Bangers','Rubik',sans-serif",
          fill: FLAME,
          lw: 6,
          align: "center",
        });

      speedLines(ctx, st.d * PPM, Math.min(0.45, st.v / 26));

      // HUD
      panel(ctx, 16, 16, 250, 58, "rgba(11,11,18,.85)", 8);
      outlinedText(ctx, `${st.time.toFixed(2)}s`, 30, 58, {
        font: "700 34px 'JetBrains Mono', monospace",
        fill: st.time < 9.39 ? BOLT : PAPER,
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

      // countdown
      if (phaseRef.current === "count") {
        const n = Math.ceil(st.countdown);
        outlinedText(ctx, n > 0 ? `${n}` : "¡YA!", VIEW_W / 2, VIEW_H / 2 - 40, {
          font: "150px 'Bangers','Rubik',sans-serif",
          fill: n > 0 ? PAPER : BOLT,
          lw: 12,
          align: "center",
          baseline: "middle",
        });
        outlinedText(ctx, n > 1 ? "A SUS PUESTOS" : "¡MACHACA LAS TECLAS!", VIEW_W / 2, VIEW_H / 2 + 50, {
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
        const label = nextSide === "L" ? "◀ IZQ / A" : "DER / D ▶";
        outlinedText(ctx, label, VIEW_W / 2, VIEW_H - 26, {
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
        className="block w-full select-none bg-ink"
        style={{ aspectRatio: "16 / 9", touchAction: phase === "run" ? "none" : "pan-y" }}
      />

      {phase === "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/60 p-4">
          <div className="animate-pop max-w-lg text-center">
            <h3 className="font-display text-5xl text-bolt title-shadow sm:text-6xl">100m MASHER</h3>
            <p className="mt-2 text-sm text-paper/80 sm:text-base">
              Alterna <b className="text-bolt">◀ / ▶</b> (o A / D, o los dos botones) lo más rápido posible.
              Corre los 100 m y bate el récord: <b className="text-bolt">9.39 s</b>.
            </p>
            <button
              onClick={start}
              className="press comic mt-5 bg-jam-green px-8 py-3 font-display text-3xl text-paper"
            >
              A LA PISTA ▶
            </button>
          </div>
        </div>
      )}

      {phase === "finish" && result !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/55">
          <h3 className="animate-pop font-display text-6xl text-bolt title-shadow sm:text-7xl">
            {result < 9.39 ? "¡RÉCORD MUNDIAL!" : result < 9.58 ? "¡MEJOR QUE UN HUMANO!" : "¡META!"}
          </h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t-[3px] border-ink bg-ink-2 p-3">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            push("L");
          }}
          className="press comic-sm bg-bolt py-4 font-display text-3xl text-ink"
        >
          ◀ IZQ
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            push("R");
          }}
          className="press comic-sm bg-jam-green py-4 font-display text-3xl text-paper"
        >
          DER ▶
        </button>
      </div>
    </div>
  );
}
