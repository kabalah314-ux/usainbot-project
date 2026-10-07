import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DevCredit } from "./DevCredit";

const INTRO_SEEN_KEY = "usain-bot:tokenomics-intro-seen-v2";
const MESSAGES = [
  "We want to offer you a safe space for your trades.",
  "That's why you won't find any unexpected surprises here.",
];

function isFirstVisit() {
  try {
    if (window.localStorage.getItem(INTRO_SEEN_KEY) === "1") return false;
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Keep the intro visible when storage is unavailable.
  }
  return true;
}

export function TokenomicsIntro() {
  const [showIntro] = useState(isFirstVisit);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showIntro) return;
    const timer = window.setTimeout(() => setMessageIndex(1), 3600);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  if (!showIntro) return null;

  return (
    <section className="snap-section relative min-h-[calc(100svh-var(--nav-height))] overflow-hidden border-y-[3px] border-ink bg-ink">
      <div
        className="absolute inset-[-1.5rem] scale-105 bg-cover bg-center opacity-60 blur-md"
        style={{ backgroundImage: "url('/hero-track-bg.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-ink/65" aria-hidden="true" />
      <div className="grid-floor absolute inset-0 opacity-25" aria-hidden="true" />

      <div className="safe-x relative mx-auto flex min-h-[calc(100svh-var(--nav-height))] max-w-6xl items-center py-12 sm:py-16">
        <div className="relative z-20 ml-auto w-[58%] max-w-xl md:order-2 md:ml-auto md:w-1/2">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-jam-green sm:text-xs">
            before the numbers · tokenomics briefing
          </p>

          <div className="comic-light relative mt-4 max-w-lg bg-paper px-3 py-4 text-ink shadow-[7px_7px_0_#0b0b12] after:absolute after:-bottom-5 after:left-8 after:border-x-[16px] after:border-t-[20px] after:border-x-transparent after:border-t-paper sm:px-7 sm:py-7">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, x: 70 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -70 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="font-display text-2xl leading-[0.98] sm:text-5xl"
              >
                {MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <DevCredit variant="origin" className="mt-9" />

          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/55">
            keep scrolling · tokenomics follows
          </p>
        </div>

        <motion.div
          className="absolute bottom-[6%] left-0 z-10 w-[54vw] max-w-[560px] md:order-1 md:relative md:bottom-auto md:left-auto md:mr-auto md:w-1/2"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <img
            src="/tokenomics-character.png"
            alt="Usain Bot welcoming visitors"
            className="w-full object-contain drop-shadow-[10px_14px_0_rgba(0,0,0,0.5)]"
            draggable={false}
          />
        </motion.div>
      </div>
    </section>
  );
}
