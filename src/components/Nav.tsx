import { type MouseEvent, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { config } from "../config";
import { BuyButton } from "./BuyButton";

export function Nav() {
  const [open, setOpen] = useState(false);
  const navShellRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useLayoutEffect(() => {
    const shell = navShellRef.current;
    if (!shell) return;

    const updateNavHeight = () => {
      document.documentElement.style.setProperty("--nav-height", `${shell.getBoundingClientRect().height}px`);
    };

    updateNavHeight();
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(shell);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--nav-height");
    };
  }, []);

  const handleSectionClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    setOpen(false);

    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      const navHeight = navShellRef.current?.getBoundingClientRect().height ?? 0;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navHeight);
      window.scrollTo({ top, behavior: "smooth" });
      window.history.replaceState(null, "", href);
    });
  };

  return (
    <div ref={navShellRef} className="sticky top-0 z-50">
      {/* scroll progress */}
      <motion.div
        className="h-[5px] bg-bolt origin-left"
        style={{ scaleX: x }}
      />
      <nav className="bg-ink/90 backdrop-blur-md border-b-[3px] border-paper/20">
        <div className="safe-x flex items-center gap-4 py-3">
          <a href="#top" className="flex items-center gap-2 group shrink-0">
            <span className="grid place-items-center w-9 h-9 bg-bolt text-ink border-[3px] border-ink">
              <svg viewBox="0 0 24 32" className="h-5 w-auto" aria-hidden>
                <path d="M14 0 0 19h8l-4 13L24 11h-9l3-11z" fill="currentColor" />
              </svg>
            </span>
            <span className="font-display text-2xl tracking-wider group-hover:text-bolt transition">
              ${config.ticker}
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 ml-4 text-sm font-bold uppercase tracking-wide">
            {config.nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(event) => handleSectionClick(event, n.href)}
                className="hover:text-bolt transition relative group"
              >
                {n.label}
                <span className="absolute -bottom-1 left-0 h-[3px] w-0 bg-bolt group-hover:w-full transition-all" />
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 font-mono text-xs border-[3px] border-jam-green px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-jam-green animate-flicker" />
              {config.chain.name.toUpperCase()} · {config.chain.cluster.toUpperCase()}
            </span>
            <BuyButton
              className="comic bg-bolt text-ink font-black px-4 py-2 text-sm uppercase press hidden sm:block"
              style={{ boxShadow: "4px 4px 0 #f5f1e6" }}
            >
              {config.prelaunch.active ? "Updates" : "Buy"}
            </BuyButton>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={open}
              className="md:hidden w-10 h-10 grid place-items-center border-[3px] border-paper"
            >
              <span className="font-display text-xl leading-none">{open ? "×" : "≡"}</span>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden safe-x pb-4 flex flex-col gap-3 font-bold uppercase border-t border-paper/10 pt-3">
            {config.nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(event) => handleSectionClick(event, n.href)}
                className="hover:text-bolt"
              >
                {n.label}
              </a>
            ))}
            <BuyButton
              className="comic bg-bolt text-ink px-4 py-2 text-center"
              style={{ boxShadow: "4px 4px 0 #f5f1e6" }}
            >
              {config.prelaunch.active ? "Launch updates" : "Buy $BOLT"}
            </BuyButton>
          </div>
        )}
      </nav>
    </div>
  );
}
