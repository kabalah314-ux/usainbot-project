import { useState } from "react";
import { landingConfig as C } from "./landing.config";
import { OOOXLogo, TelegramIcon, XIcon } from "./OOOXLogo";
import "./landing.css";

/**
 * Landing web del proyecto USAINBOT (puerta de entrada al juego).
 *
 * Flujo: LANDING → [PLAY] → pantalla de inicio del juego (la existente) → juego.
 * El juego 3D NO se carga aquí: `onPlay` lo dispara en App.tsx. Así la landing
 * es ligera y no toca los assets del juego.
 */
export function Landing({ onPlay }: { onPlay: () => void }) {
  const [heroOk, setHeroOk] = useState(true);
  const [copied, setCopied] = useState(false);
  const contract = C.token.contract;
  const hasContract = contract !== "COMING SOON";

  const ext = (url: string) =>
    url && url !== "#"
      ? { href: url, target: "_blank", rel: "noopener noreferrer" }
      : { href: "#", onClick: (e: React.MouseEvent) => e.preventDefault() };

  const copyContract = async () => {
    if (!hasContract) return;
    try {
      await navigator.clipboard.writeText(contract);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="lb">
      {/* Cabecera fija: PLAY siempre localizable */}
      <header className="lb-top">
        <a className="lb-top__seal" {...ext(C.urls.ooox)} aria-label="OOOX">
          <OOOXLogo variant="seal" color="#ffd23f" />
        </a>
        <span className="lb-top__name">{C.gameName}</span>
        <nav className="lb-top__nav">
          <a href="#tokenomics">TOKENOMICS</a>
          <a href="#about">PROJECT</a>
          <a href="#ooox">OOOX</a>
        </nav>
        <button className="lb-btn lb-btn--sm lb-btn--play" onClick={onPlay}>PLAY</button>
      </header>

      {/* ================= HERO ================= */}
      <section className="lb-hero">
        <div className="lb-hero__scene" aria-hidden="true" />
        {heroOk && (
          <img
            className="lb-hero__img"
            src="assets/landing/hero-usainbot.jpg"
            alt="UsainBot, el robot velocista, posando ante su mansión"
            onError={() => setHeroOk(false)}
          />
        )}
        <div className="lb-hero__scrim" aria-hidden="true" />

        <div className="lb-hero__inner">
          <p className="lb-kicker">OOOX PRESENTS · A VIDEOGAME PROJECT</p>
          <h1 className="lb-hero__title">{C.gameName}</h1>
          <p className="lb-hero__tag">{C.tagline}</p>
          <p className="lb-hero__line">{C.oneLiner}</p>

          <button className="lb-btn lb-btn--play lb-btn--xl" onClick={onPlay}>
            PLAY
          </button>

          <div className="lb-social">
            <a className="lb-chip lb-chip--x" {...ext(C.urls.x)}>
              <XIcon /> X
            </a>
            <a className="lb-chip lb-chip--tg" {...ext(C.urls.telegram)}>
              <TelegramIcon /> TELEGRAM
            </a>
          </div>

          <div className="lb-tokencta">
            <a className="lb-btn lb-btn--buy" {...ext(C.urls.tokenBuy)}>
              {C.token.buyLabel}
            </a>
            <div className="lb-tokencta__links">
              <span>{C.token.name} · ${C.token.symbol}</span>
              <a {...ext(C.urls.gmgn)}>GMGN</a>
              <i>/</i>
              <a {...ext(C.urls.fomo)}>FOMO</a>
            </div>
          </div>
        </div>

        <a className="lb-hero__seal" {...ext(C.urls.ooox)} aria-label="OOOX — calidad del estudio">
          <OOOXLogo variant="seal" color="currentColor" />
          <span>OOOX</span>
        </a>
      </section>

      {/* ================= TOKENOMICS ================= */}
      <section id="tokenomics" className="lb-sec">
        <div className="lb-seclabel"><span>02</span> TOKENOMICS</div>
        <h2 className="lb-sectitle">
          {C.token.name} <em>${C.token.symbol}</em>
        </h2>
        <p className="lb-seclead">
          Transparent data only. Values are placeholders until the real figures are published.
        </p>

        <div className="lb-grid">
          <Stat label="TOTAL SUPPLY" value={C.tokenomics.totalSupply} />
          <Stat label="CREATOR ALLOCATION" value={C.tokenomics.creatorAllocation} accent />
          <Stat label="INITIAL CREATOR BUY" value={C.tokenomics.initialCreatorBuy} accent />
          <Stat label="TOKENS RETAINED BY CREATOR" value={C.tokenomics.tokensRetainedByCreator} accent />
          <Stat label="LIQUIDITY" value={C.tokenomics.liquidity} />
          <Stat label="COMMUNITY" value={C.tokenomics.community} />
          <Stat label="TEAM / DEV" value={C.tokenomics.teamDev} />
        </div>

        <div className="lb-contract">
          <div className="lb-contract__label">TOKEN CONTRACT</div>
          <code className="lb-contract__addr">{contract}</code>
          <button
            className="lb-btn lb-btn--sm"
            onClick={copyContract}
            disabled={!hasContract}
            title={hasContract ? "Copiar contrato" : "Aún sin contrato"}
          >
            {copied ? "COPIED" : "COPY CONTRACT"}
          </button>
        </div>

        <div className="lb-transp">
          <h3>TRANSPARENCY</h3>
          <dl>
            {C.transparency.map((row) => (
              <div className="lb-transp__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="lb-disclaimer">{C.disclaimer}</p>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="lb-sec lb-about">
        <div className="lb-seclabel"><span>03</span> THE PROJECT</div>
        <p className="lb-about__lead">{C.about.lead}</p>
        <blockquote className="lb-about__goal">{C.about.goal}</blockquote>
      </section>

      {/* ================= OOOX ================= */}
      <section id="ooox" className="lb-sec lb-ooox">
        <div className="lb-seclabel"><span>04</span> THE STUDIO</div>
        <a className="lb-ooox__logo" {...ext(C.urls.ooox)} aria-label="OOOX">
          <OOOXLogo variant="wordmark" color="currentColor" />
        </a>
        <p className="lb-ooox__line">DISCOVER MORE PROJECTS BY {C.studio}</p>
        <a className="lb-btn lb-btn--ooox" {...ext(C.urls.ooox)}>
          EXPLORE {C.studio}
        </a>
      </section>

      <footer className="lb-foot">
        <OOOXLogo variant="seal" color="#4a5460" />
        <span>© {C.gameName} · {C.studio} · A COMMUNITY-DRIVEN GAME PROJECT</span>
      </footer>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const tbd = value === "TBD" || value === "COMING SOON";
  return (
    <div className={`lb-stat${accent ? " lb-stat--accent" : ""}`}>
      <div className="lb-stat__label">{label}</div>
      <div className={`lb-stat__value${tbd ? " is-tbd" : ""}`}>{value}</div>
    </div>
  );
}
