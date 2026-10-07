import KeyedImg from "./KeyedImg";

const TICKER = "$BOLT ⚡ WINNERS ARE ALWAYS FIRST ⚡ 9.39s ⚡ ROBINHOOD CHAIN ⚡ PLAY & CLIMB ⚡ ";

export default function Hero({ plays }: { plays: number }) {
  return (
    <section id="top" className="relative overflow-hidden border-b-[3px] border-ink">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url(/stadium-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink" />
      <div className="noise absolute inset-0 opacity-[0.07]" />

      <div className="safe-x relative mx-auto grid max-w-6xl items-center gap-8 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20">
        <div>
          <span className="comic-sm inline-block bg-flame px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-paper">
            nuevo · minijuegos on-site
          </span>
          <h1 className="mt-4 font-display text-6xl leading-[0.88] text-paper title-shadow sm:text-7xl md:text-8xl">
            EL ARCADE
            <br />
            DE <span className="text-bolt">$BOLT</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-paper/80 md:text-lg">
            Corre los 100 metros y bate los <b className="text-bolt">9.39 s</b>, o pon a prueba tus reflejos.
            Dos minijuegos rapidísimos, un ranking global y cero fricción: no hay wallet, no hay registro, solo velocidad.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#game" className="press comic bg-bolt px-7 py-3 font-display text-3xl tracking-wide text-ink">
              JUGAR AHORA ⚡
            </a>
            <a href="#ranking" className="press comic bg-ink-2 px-7 py-3 font-display text-3xl tracking-wide text-paper">
              VER RANKING
            </a>
          </div>

          <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              { k: "3", v: "MINIJUEGOS" },
              { k: "9.39s", v: "RÉCORD A BATIR" },
              { k: plays > 0 ? `${plays}` : "0", v: "PARTIDAS AQUÍ" },
            ].map((s) => (
              <div key={s.v} className="comic-sm bg-ink-2 px-3 py-2">
                <dt className="font-display text-2xl text-bolt">{s.k}</dt>
                <dd className="font-mono text-[10px] uppercase tracking-widest text-paper/50">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="halftone absolute h-64 w-64 rounded-full opacity-25 blur-[1px] md:h-80 md:w-80" />
          <div className="absolute h-56 w-56 rounded-full bg-bolt/20 blur-[90px] md:h-72 md:w-72" />
          <svg viewBox="0 0 400 400" className="absolute h-[340px] w-[340px] opacity-70 md:h-[440px] md:w-[440px]">
            {Array.from({ length: 18 }).map((_, i) => {
              const a = (i / 18) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={200 + Math.cos(a) * 120}
                  y1={200 + Math.sin(a) * 120}
                  x2={200 + Math.cos(a) * 190}
                  y2={200 + Math.sin(a) * 190}
                  stroke="#f5f1e6"
                  strokeOpacity={i % 2 ? 0.18 : 0.32}
                  strokeWidth={i % 3 ? 3 : 6}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <KeyedImg
            src="/usain-bot.png"
            alt="Usain Bot"
            className="animate-bob relative z-10 w-[300px] max-w-full drop-shadow-[10px_14px_0_rgba(0,0,0,0.45)] md:w-[420px]"
          />
          <span className="comic-sm absolute bottom-2 right-0 z-20 rotate-[-6deg] bg-bolt px-3 py-1 font-display text-xl text-ink md:bottom-6">
            ¡ALCÁNZAME!
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden border-y-[3px] border-ink bg-bolt py-2">
        <div className="animate-marquee flex w-max whitespace-nowrap font-display text-xl tracking-wide text-ink">
          <span className="px-4">{TICKER.repeat(6)}</span>
          <span className="px-4">{TICKER.repeat(6)}</span>
        </div>
      </div>
    </section>
  );
}
