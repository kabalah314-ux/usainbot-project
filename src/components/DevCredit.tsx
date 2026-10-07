import { config } from "../config";

type Props = {
  variant?: "hero" | "origin" | "footer";
  className?: string;
};

export function DevCredit({ variant = "footer", className = "" }: Props) {
  const compact = variant === "origin";
  const footer = variant === "footer";

  return (
    <a
      href={config.dev.site}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-3 border-2 border-paper/20 bg-ink/70 px-3 py-2 text-left transition hover:border-bolt hover:bg-ink ${footer ? "sm:px-4 sm:py-3" : ""} ${className}`}
      aria-label={`Created by ${config.dev.name}`}
    >
      <img
        src="/dev-logo.png"
        alt=""
        aria-hidden="true"
        className={`${compact ? "h-7 w-7" : "h-9 w-9"} object-contain transition group-hover:scale-105`}
      />
      <span className="leading-none">
        <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-paper/50">
          {footer ? "Developer" : "Created by"}
        </span>
        <span className={`mt-1 block font-display tracking-wider text-bolt ${compact ? "text-lg" : "text-xl"}`}>
          {config.dev.name} <span className="font-mono text-xs text-paper/60">↗ ooox.es</span>
        </span>
      </span>
    </a>
  );
}
