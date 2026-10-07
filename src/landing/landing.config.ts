/**
 * Configuración central de la LANDING (web de inicio del proyecto).
 *
 * TODO lo que aún no está definido es un PLACEHOLDER claro:
 * sustituye estos valores cuando tengas los datos reales (URLs, contrato,
 * tokenomics). Ningún dato de mercado/contrato está inventado: los campos
 * sin dato real muestran "TBD" o "COMING SOON".
 */
export const landingConfig = {
  gameName: "USAINBOT",
  tagline: "THE FASTEST BOT ALIVE",
  oneLiner: "A ROBOT BECAME FASTER THAN THE FASTEST HUMAN.",
  studio: "OOOX",

  // ---- Enlaces (placeholders: sustituir) ----
  urls: {
    /** X_URL */ x: "#",
    /** TELEGRAM_URL */ telegram: "#",
    /** TOKEN_BUY_URL */ tokenBuy: "#",
    /** GMGN_URL (enlace a GMGN con el token) */ gmgn: "#",
    /** FOMO_URL (enlace a FOMO con el token) */ fomo: "#",
    /** OOOX_WEBSITE_URL */ ooox: "#",
  },

  // ---- Token (placeholders: sustituir con datos reales) ----
  token: {
    /** TOKEN_NAME */ name: "USAINBOT TOKEN",
    /** TOKEN_SYMBOL (ticker configurable) */ symbol: "USAINBOT",
    /** TOKEN_CONTRACT — sin contrato real: "COMING SOON" */ contract: "COMING SOON",
    buyLabel: "BUY USAINBOT TOKEN",
  },

  // ---- Tokenomics (placeholders salvo los dos datos verificables) ----
  tokenomics: {
    /** TOTAL_SUPPLY */ totalSupply: "TBD",
    /** CREATOR_ALLOCATION — dato del creador: 0% */ creatorAllocation: "0%",
    /** INITIAL_CREATOR BUY — dato del creador: hasta $200 */ initialCreatorBuy: "UP TO $200",
    /** LIQUIDITY */ liquidity: "TBD",
    /** COMMUNITY_ALLOCATION */ community: "TBD",
    /** TEAM / DEV */ teamDev: "TBD",
    tokensRetainedByCreator: "0%",
  },

  /** Bloque TRANSPARENCY: solo hechos que el proyecto puede demostrar. */
  transparency: [
    { label: "CREATOR ALLOCATION", value: "0%" },
    { label: "TOKENS RETAINED BY CREATOR", value: "0%" },
    { label: "INITIAL CREATOR BUY", value: "UP TO $200" },
    { label: "LOCKED TOKENS", value: "TBD" },
    { label: "LIQUIDITY", value: "TBD" },
    { label: "CONTRACT", value: "COMING SOON" },
  ],

  about: {
    lead: "USAINBOT is a game about a robot who became faster than the fastest human — and the absurd, GasOil-fuelled life that follows.",
    goal:
      "THE GOAL IS SIMPLE: BUILD THE GAME, GROW THE COMMUNITY, AND KEEP THE PROJECT ALIVE FOR AS LONG AS PEOPLE ENJOY IT.",
  },

  disclaimer:
    "USAINBOT is a community-driven game project. Token information shown here is provided for transparency and does not guarantee value or future performance. Nothing on this page is financial advice.",
} as const;
