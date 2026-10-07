const PRIZES = [
  {
    icon: "🏆",
    title: "RANKING SEMANAL",
    text: "Cada semana se congela el Muro de Campeones y se publica el top 10 en X. Tu alias, tu gloria.",
    tag: "ACTIVO",
    tone: "bg-jam-green text-paper",
  },
  {
    icon: "🎁",
    title: "1% DEL SUPPLY",
    text: "La idea: reservar un 1% de $BOLT para sorteos entre los que juegan y aparecen en el ranking.",
    tag: "EN ESTUDIO",
    tone: "bg-bolt text-ink",
  },
  {
    icon: "🔗",
    title: "RANKING ON-CHAIN",
    text: "Firmar tu marca con la wallet en Robinhood Chain para que el top sea verificable por todos.",
    tag: "PRÓXIMAMENTE",
    tone: "bg-flame text-paper",
  },
];

export function Prizes() {
  return (
    <section id="premios" className="safe-x relative border-t-[3px] border-ink bg-ink py-16 md:py-20">
      <div className="halftone absolute inset-0 opacity-[0.06]" />
      <div className="relative mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-widest text-jam-green">jugar tiene premio</p>
        <h2 className="font-display text-5xl text-paper title-shadow md:text-6xl">
          PREMIOS Y <span className="text-bolt">SORTEOS</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
          El proyecto es la meme + los juegos. Cuanto más se juega, más ruido hace $BOLT. Esta es la hoja de ruta
          de recompensas para los que corren primero.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PRIZES.map((p) => (
            <article key={p.title} className="comic relative bg-ink-2 p-5">
              <span className={`comic-sm absolute -top-3 right-4 px-2 py-1 font-mono text-[10px] tracking-widest ${p.tone}`}>
                {p.tag}
              </span>
              <span className="text-3xl">{p.icon}</span>
              <h3 className="mt-2 font-display text-3xl tracking-wide text-paper">{p.title}</h3>
              <p className="mt-2 text-sm text-paper/70">{p.text}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 font-mono text-[11px] text-paper/40">
          * Nada de esto es una promesa financiera. $BOLT es una memecoin: juega, ríete y no inviertas lo que no
          puedas permitirte perder.
        </p>
      </div>
    </section>
  );
}

const FACTS = [
  ["NOMBRE", "Usain Bot"],
  ["TICKER", "$BOLT"],
  ["RED", "Robinhood Chain (EVM 4663)"],
  ["GAS", "ETH"],
  ["LEMA", "Winners are always first."],
];

export function Lore() {
  return (
    <section id="lore" className="safe-x relative border-t-[3px] border-ink bg-ink-2 py-16 md:py-20">
      <div className="relative mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-jam-green">origen</p>
          <h2 className="font-display text-5xl text-paper title-shadow md:text-6xl">
            9.58 ERA <span className="text-flame">HUMANO</span>.<br />
            9.39 ES <span className="text-bolt">BOT</span>.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-paper/75 md:text-base">
            Un rayo cayó sobre el estadio y el sprinter más rápido del mundo despertó con un visor HUD y las
            piernas de titanio. Desde entonces corre contra su propio récord en cada bloque de la Robinhood Chain.
            Esquiva a los robots lentos, recoge $BOLT y no mires atrás: los ganadores siempre llegan primero.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#game" className="press comic bg-bolt px-6 py-3 font-display text-2xl text-ink">
              CORRER YA ⚡
            </a>
            <a href="#ranking" className="press comic bg-ink px-6 py-3 font-display text-2xl text-paper">
              MURO DE CAMPEONES
            </a>
          </div>
        </div>
        <div className="comic bg-ink p-5">
          <h3 className="font-display text-2xl tracking-wide text-bolt">FICHA DEL TOKEN</h3>
          <dl className="mt-3 divide-y divide-paper/10">
            {FACTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-paper/45">{k}</dt>
                <dd className="text-right font-display text-xl tracking-wide text-paper">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="safe-x border-t-[3px] border-ink bg-ink py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <div className="flex items-center gap-2">
          <span className="comic-sm flex h-9 w-9 items-center justify-center bg-bolt text-lg">⚡</span>
          <span className="font-display text-2xl tracking-wide text-paper">
            USAIN <span className="text-bolt">BOT</span> ARCADE
          </span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-paper/40">
          winners are always first · $BOLT on robinhood chain
        </p>
      </div>
    </footer>
  );
}
