export const config = {
  name: "Usain Bot",
  ticker: "BOLT",
  slogan: "USAIN BOT ARE MORE FASTER THAN YOU F..K HUMANS, THE WORLD IS FOR THE ROBOTS",
  sub: "The fastest cyborg bot on Solana. No extra buy or sell tax: only the 1% network fee. Liquidity locked forever. The robot era has begun.",

  prelaunch: {
    active: true,
    title: "$BOLT IS NOT LIVE YET",
    body: "The starting gun has not fired. The official X account will be linked here for the launch announcement, verified links and future updates.",
    heroSub: "Usain Bot is in build mode. The arcade is open, but the token launch has not started yet.",
    ctaBody: "The starting gun has not fired yet. Follow X for the official launch announcement and verified links.",
    marquee: [
      "$BOLT IS IN BUILD MODE",
      "LAUNCH DETAILS COMING ON X",
      "ARCADE RUNS FREE",
      "NO OFFICIAL CA YET",
      "SOLANA · MAINNET-BETA",
    ],
    faq: [
      {
        q: "Is Usain Bot ($BOLT) live yet?",
        a: "Not yet. The website and arcade are live, but the token itself has not been officially launched.",
      },
      {
        q: "Where will official launch updates appear?",
        a: "Follow the X link in the launch notice. The website will be updated as official details become available.",
      },
      {
        q: "Where is the contract address?",
        a: "There is no official contract address published yet. Never use an address from an unofficial post or DM.",
      },
      {
        q: "When can I buy $BOLT?",
        a: "Only after the official launch announcement. The verified DEX and explorer links will appear on this website.",
      },
      {
        q: "How do I avoid fake links?",
        a: "Use only the links published on this website after launch and verify the contract address character by character.",
      },
    ],
  },

  chain: {
    name: "Solana",
    cluster: "mainnet-beta",
    symbol: "SOL",
    rpc: "https://api.mainnet-beta.solana.com",
    explorer: "https://solscan.io",
  },

  token: {
    ca: "TODO_CA",
    curve: "TODO_CURVE",
    launchBlock: 0,
    totalSupply: 1_000_000_000,
  },

  links: {
    launchpad: "TODO_LAUNCHPAD_URL",
    dexscreener: "TODO_CHART_URL",
    dex: "TODO_DEX_URL",
    x: "https://x.com/usainthebot",
    telegram: "TODO_TG",
  },

  dev: {
    name: "ooox",
    site: "https://ooox.es",
  },

  nav: [
    { label: "Arcade", href: "#game" },
    { label: "Origin", href: "#origin" },
    { label: "Vision", href: "#lanes" },
    { label: "Tokenomics", href: "#tokenomics" },
    { label: "How to buy", href: "#buy" },
    { label: "FAQ", href: "#faq" },
  ],

  marquee: [
    "WINNERS ARE ALWAYS FIRST",
    "0 / 0 TAX",
    "ONLY 1% NETWORK FEE",
    "LIQUIDITY LOCKED FOREVER",
    "NO ADMIN KEYS",
    "100% COMMUNITY FAIR LAUNCH",
    "SOLANA · MAINNET-BETA",
  ],

  tokenomics: {
    cards: [
      { label: "Total Supply", value: "1,000,000,000" },
      { label: "Tax", value: "0/0", hint: "No extra buy/sell fees: only the 1% network commission applies." },
      {
        label: "Liquidity",
        value: "Locked forever",
        hint: "Locked at launch, no team slice",
        linkKey: "curve" as const,
      },
      {
        label: "Admin keys",
        value: "None",
        hint: "Renounced contract: 0 owner, 0 mint, 0 tax functions",
        linkKey: "ca" as const,
      },
    ],
    distribution: [
      { label: "100% Public Bonding Curve & Liquidity", pct: 100, color: "#009b3a" },
    ],
  },

  howToBuy: [
    {
      title: "Get a Solana wallet",
      body: "Install Phantom or Solflare and create a wallet. It is free and takes one minute.",
    },
    {
      title: "Get SOL",
      body: "Buy SOL on any exchange and send it to your wallet. You only need a little for network fees.",
    },
    {
      title: "Swap for $BOLT",
      body: "Swap SOL for $BOLT on the official DEX linked on this site. Only the 1% network fee applies: no extra buy or sell tax.",
    },
  ],

  lanes: [
    {
      tag: "Lane 1",
      title: "False start protection",
      body: "No presale, no team tokens, no secret allocations. The curve opens for everyone at the exact same block.",
    },
    {
      tag: "Lane 2",
      title: "Sonic velocity on Solana",
      body: "Near-instant transactions and tiny fees: only the 1% network commission, no extra buy or sell tax.",
    },
    {
      tag: "Lane 3",
      title: "Liquidity locked forever",
      body: "Upon completing the curve, liquidity migrates to the DEX and is burned/locked for eternity.",
    },
    {
      tag: "Lane 4",
      title: "Community sprint & viral dominance",
      body: "Meme kit, sticker packs, viral X raids, and relentless community momentum driving $BOLT to the finish line.",
    },
  ],

  faq: [
    {
      q: "What is Usain Bot ($BOLT)?",
      a: "Usain Bot ($BOLT) is the fastest memecoin on Solana. Inspired by comic books and speed culture, built for traders who want to win first.",
    },
    {
      q: "Is there any buy or sell tax?",
      a: "No extra tax on buys or sells (0/0). The only cost is the 1% network commission: no extra platform, contract or hidden fees.",
    },
    {
      q: "What chain is $BOLT on?",
      a: "Solana (mainnet-beta): an ultra-fast, low-cost network. Fees are paid in SOL and are virtually zero.",
    },
    {
      q: "Was there a presale or team allocation?",
      a: "No. 100% of the token supply was deployed directly to the public bonding curve. The dev bought on the open curve like everyone else.",
    },
    {
      q: "Where is liquidity locked?",
      a: "Liquidity is locked and burned via the launch contract and the DEX pool upon graduation. Rug-proof by design.",
    },
  ],

  disclaimer:
    "$BOLT is a memecoin with no intrinsic value and no expectation of financial return. For entertainment purposes only. Nothing here is financial advice.",
} as const;

export const explorerAddr = (a: string) => `${config.chain.explorer}/token/${a}`;
export const explorerTx = (h: string) => `${config.chain.explorer}/tx/${h}`;
export const explorerBlock = (n: number) => `${config.chain.explorer}/block/${n}`;
export const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
export const isPlaceholder = (v: string) => v.startsWith("TODO");
/** Placeholder links must not navigate anywhere weird before launch. */
export const linkHref = (u: string) => (isPlaceholder(u) ? "#" : u);
