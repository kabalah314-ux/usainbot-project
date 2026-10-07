const LINKS = [
  { href: "#game", label: "ARCADE" },
  { href: "#ranking", label: "RANKING" },
  { href: "#premios", label: "PREMIOS" },
  { href: "#lore", label: "LORE" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-ink/95 backdrop-blur-md">
      <div className="safe-x mx-auto flex max-w-6xl items-center justify-between gap-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <span className="comic-sm flex h-9 w-9 items-center justify-center bg-bolt text-lg">⚡</span>
          <span className="font-display text-2xl tracking-wide text-paper">
            USAIN <span className="text-bolt">BOT</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-widest text-paper/70 transition-colors hover:text-bolt"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a href="#game" className="press comic-sm bg-jam-green px-4 py-2 font-display text-lg tracking-wide text-paper">
          JUGAR ▶
        </a>
      </div>
    </header>
  );
}
