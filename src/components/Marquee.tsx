export function Marquee({
  items,
  tone = "gold",
  reverse = false,
}: {
  items: readonly string[];
  tone?: "gold" | "green" | "ink";
  reverse?: boolean;
}) {
  const bg =
    tone === "gold"
      ? "bg-jam-gold text-ink"
      : tone === "green"
        ? "bg-jam-green text-paper"
        : "bg-ink text-paper";
  const row = [...items, ...items, ...items, ...items];

  return (
    <div
      className={`${bg} border-y-[3px] border-ink overflow-hidden select-none`}
      style={reverse ? { transform: "rotate(-1.2deg)" } : { transform: "rotate(0.8deg)" }}
    >
      <div className="flex whitespace-nowrap py-2 animate-marquee" style={{ width: "max-content" }}>
        {row.map((t, i) => (
          <span key={i} className="font-display text-xl md:text-3xl tracking-wider px-6 flex items-center gap-6">
            {t}
            <Bolt />
          </span>
        ))}
      </div>
    </div>
  );
}

function Bolt() {
  return (
    <svg viewBox="0 0 24 32" className="h-5 md:h-6 w-auto shrink-0" aria-hidden>
      <path d="M14 0 0 19h8l-4 13L24 11h-9l3-11z" fill="currentColor" />
    </svg>
  );
}
