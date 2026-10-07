import { config, isPlaceholder, linkHref, explorerAddr } from "../config";
import { DevCredit } from "./DevCredit";

const socials = [
  {
    label: isPlaceholder(config.links.x) ? "X account coming soon" : "X / Twitter",
    url: isPlaceholder(config.links.x) ? "#" : config.links.x,
  },
  { label: "Telegram", url: config.links.telegram },
  { label: "DexScreener", url: config.links.dexscreener },
];

export function Footer() {
  return (
    <footer className="snap-section relative bg-ink border-t-[5px] border-paper/20 overflow-hidden">
      <div className="safe-x py-14 text-sm relative z-10">
        <div className="flex flex-wrap gap-8 justify-between">
          <div>
            <p className="font-display text-4xl tracking-wider">
              ${config.ticker} <span className="text-bolt">·</span> {config.name}
            </p>
            <p className="font-display text-xl text-paper/50 tracking-wide">{config.slogan}</p>
          </div>

          <div className="flex flex-wrap gap-6 font-bold uppercase items-start">
            {socials.map((s) => (
              <a
                key={s.label}
                href={linkHref(s.url)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-bolt transition border-b-2 border-transparent hover:border-bolt"
              >
                {s.label} ↗
              </a>
            ))}
            <a
              href={isPlaceholder(config.token.ca) ? "#" : explorerAddr(config.token.ca)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-bolt transition border-b-2 border-transparent hover:border-bolt"
            >
              Contract ↗
            </a>
          </div>
        </div>

        <div className="relative mt-12 overflow-hidden border-[3px] border-bolt bg-ink-2">
          <img
            src="/construction-scene.jpg"
            alt="Construction scene with a human runner reviewing the blueprints"
            className="block h-auto w-full"
          />
          <div className="absolute inset-0 bg-ink/25" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            <div className="border-[3px] border-ink bg-bolt/95 px-5 py-3 shadow-[5px_5px_0_#0b0b12] sm:px-10 sm:py-5">
              <p className="font-display text-4xl tracking-wider text-ink sm:text-6xl">COMING SOON</p>
              <p className="mt-1 font-mono text-xs font-black uppercase tracking-[0.22em] text-ink sm:text-sm">
                New updates are coming · BUILD MODE ACTIVATED
              </p>
            </div>
          </div>
        </div>

        <DevCredit variant="footer" className="mt-8" />

        <p className="mt-10 text-paper/50 max-w-2xl leading-relaxed">{config.disclaimer}</p>
        <p className="mt-2 text-paper/30">
          © {new Date().getFullYear()} {config.name}. {config.slogan}
        </p>
      </div>

      {/* giant watermark */}
      <p className="pointer-events-none select-none font-display text-[22vw] leading-[0.75] text-paper/[0.04] text-center -mb-[3vw]">
        {config.ticker}
      </p>
    </footer>
  );
}
