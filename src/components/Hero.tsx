import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { config, isPlaceholder, linkHref } from "../config";
import { DevCredit } from "./DevCredit";
import { BuyButton } from "./BuyButton";

export function Hero({ onPlay, paused: _paused = false }: { onPlay: () => void; paused?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const headerRef = useRef<HTMLElement | null>(null);

  // El crédito vive en la esquina inferior derecha de la portada: mientras el
  // hero está en pantalla lo fijamos ahí (el final del hero queda bajo el fold).
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config.token.ca);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <header
      id="top"
      ref={headerRef}
      className="snap-section safe-x min-h-[96svh] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 py-12 relative overflow-hidden"
    >
      {/* Fondo: pista de carreras / estadio iluminado */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/hero-track-bg.jpg')" }}
      />
      {/* Subtle bottom fade so it blends into the next comic section */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent pointer-events-none" />

      {/* glow */}
      <div className="absolute -top-40 -left-32 w-[55vw] h-[55vw] rounded-full bg-jam-green/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 right-0 w-[45vw] h-[45vw] rounded-full bg-bolt/15 blur-[130px] pointer-events-none" />

      {/* portada estática: sin líneas de velocidad ni animaciones de fondo */}

      {/* ---------- copy (with translucent comic backdrop for maximum readability) ---------- */}
      <motion.div
        className="flex-1 z-10 w-full max-w-xl comic-light bg-ink/75 backdrop-blur-md p-6 sm:p-8"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display text-ink bg-bolt px-3 py-0.5 text-xl tracking-widest -rotate-2 inline-block">
            ${config.ticker}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-paper/60 border border-paper/25 px-2 py-1">
            {config.chain.name} · {config.chain.cluster}
          </span>
        </div>

        <h1 className="font-display text-[2.6rem] leading-[0.92] sm:text-6xl md:text-[4.6rem] uppercase mt-4">
          USAIN BOT ARE{" "}
          <span className="text-bolt" style={{ textShadow: "5px 5px 0 #009b3a" }}>
            MORE FASTER
          </span>{" "}
          THAN YOU.
          <span
            className="text-flame block mt-2 text-[2.2rem] sm:text-5xl md:text-[3.8rem]"
            style={{ textShadow: "4px 4px 0 #0b0b12" }}
          >
            F..K HUMANS,
          </span>
          <span className="text-paper/90 text-xl sm:text-3xl md:text-4xl block mt-1 tracking-wide font-display">
            THE WORLD IS FOR THE ROBOTS.
          </span>
        </h1>

        <p className="mt-6 max-w-md text-paper/75 text-lg">{config.prelaunch.active ? config.prelaunch.heroSub : config.sub}</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={onPlay}
            className="comic-light bg-flame text-paper font-black px-6 py-3 uppercase press"
          >
            ▶ Play 3D sandbox
          </button>
          <button
            onClick={copy}
            className="comic-light bg-bolt text-ink font-black px-6 py-3 uppercase press"
          >
            {copied ? "Copied ✓" : "Copy CA"}
          </button>
          <BuyButton
            className="comic-light bg-jam-green text-paper font-black px-6 py-3 uppercase press"
          >
            Buy $BOLT
          </BuyButton>
          <a
            href={linkHref(config.links.x)}
            target="_blank"
            rel="noreferrer"
            className="comic-light bg-paper text-ink font-black px-6 py-3 uppercase press"
          >
            <span aria-hidden="true" className="mr-1">𝕏</span> Follow @usainthebot
          </a>
          <a
            href={linkHref(config.links.dexscreener)}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 self-center text-paper/80 hover:text-bolt font-bold"
          >
            Chart ↗
          </a>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-paper/50 break-all">
          <span className="text-paper/40 uppercase tracking-widest">CA</span>
          <span className="border border-paper/15 px-2 py-1">
            {isPlaceholder(config.token.ca) ? "revealed at launch on X" : config.token.ca}
          </span>
        </div>

        {/* mini stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md">
          {[
            { k: "Tax", v: "0/0" },
            { k: "Trade fee", v: "1%" },
            { k: "Supply", v: "1B" },
            { k: "LP", v: "Locked" },
          ].map((s) => (
            <div key={s.k} className="border-[3px] border-paper/20 px-3 py-2">
              <p className="font-display text-2xl text-bolt leading-none">{s.v}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mt-1">{s.k}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ---------- personaje: ilustración transparente sobre la pista (solo ≥ lg) ---------- */}
      <motion.div
        className="flex-1 z-10 hidden w-full max-w-[92vw] select-none lg:block"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <picture>
          <source srcSet="/usain-bot-home.webp" type="image/webp" />
          <img
            src="/usain-bot-home.png"
            alt="Usain Bot corriendo"
            className="mx-auto block h-auto w-full max-w-[560px] object-contain drop-shadow-[0_22px_36px_rgba(0,0,0,0.55)]"
          />
        </picture>
      </motion.div>

      {/* crédito en la esquina inferior derecha (en móvil, al final del hero) */}
      <DevCredit variant="hero" className="absolute bottom-4 right-4 z-20 sm:hidden" />

      <a
        href="#lanes"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono uppercase tracking-[0.3em] text-paper/45 hover:text-bolt"
      >
        scroll ↓
      </a>
    </header>

    {/* en escritorio el final del hero queda bajo el fold: lo fijamos a la esquina */}
    {heroVisible && (
      <div className="hidden sm:block fixed bottom-4 right-4 z-40">
        <DevCredit variant="hero" />
      </div>
    )}
    </>
  );
}
