// Uso: node scripts/set-ca.mjs <CA> [telegramUrl]
// Rellena la CA y los enlaces oficiales en src/config.ts y desactiva el modo prelaunch.
import fs from "node:fs";
const [ca, tg] = process.argv.slice(2);
if (!ca || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) {
  console.error("CA no válida. Uso: node scripts/set-ca.mjs <CA> [telegramUrl]");
  process.exit(1);
}
const file = new URL("../src/config.ts", import.meta.url);
let s = fs.readFileSync(file, "utf8");
const set = (re, val) => { if (!re.test(s)) throw new Error("No encontrado: " + re); s = s.replace(re, val); };
set(/ca: "TODO_CA"/, `ca: "${ca}"`);
set(/curve: "TODO_CURVE"/, `curve: "https://jup.ag/tokens/${ca}"`);
set(/launchpad: "TODO_LAUNCHPAD_URL"/, `launchpad: "https://jup.ag/tokens/${ca}"`);
set(/dexscreener: "TODO_CHART_URL"/, `dexscreener: "https://dexscreener.com/solana/${ca}"`);
set(/dex: "TODO_DEX_URL"/, `dex: "https://gmgn.ai/sol/token/JfyAmvWy_${ca}"`);
if (tg) set(/telegram: "TODO_TG"/, `telegram: "${tg}"`);
set(/prelaunch: \{\n    active: true/, "prelaunch: {\n    active: false");
fs.writeFileSync(file, s);
console.log("config.ts actualizado con la CA", ca);
