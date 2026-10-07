#!/usr/bin/env node
/**
 * Test del CLIENTE de guardado (src/lib/remoteSave.ts) contra el servidor real.
 *
 * Compila el módulo con esbuild (inyectando VITE_SAVE_API) y ejecuta el flujo
 * completo en Node: reto → firma Ed25519 → token → push → pull → 409 → sesión.
 *
 *   node backend/save-server/test-client.mjs
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const PORT = 8793;
const BASE = `http://127.0.0.1:${PORT}`;
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) console.log(`  ok   ${label}`);
  else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function base58Encode(buffer) {
  let zeros = 0;
  while (zeros < buffer.length && buffer[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58_ALPHABET[digits[i]];
  return out;
}

async function waitForServer(child, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`el servidor terminó antes de arrancar (${child.exitCode})`);
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch {
      // aún no escucha
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("el servidor no respondió a /health");
}

async function compileClient() {
  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "usainbot-client-"));
  const result = await build({
    entryPoints: [path.join(ROOT, "src", "lib", "remoteSave.ts")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    define: { "import.meta.env.VITE_SAVE_API": JSON.stringify(BASE) },
    logLevel: "silent",
  });
  const file = path.join(outdir, "remoteSave.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  return { file, outdir };
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "usainbot-save-"));
  const child = spawn(process.execPath, [path.join(HERE, "index.mjs")], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

  let clientFile = null;
  let clientOut = null;
  try {
    await waitForServer(child);
    console.log("Servidor listo. Compilando el cliente…");

    const compiled = await compileClient();
    clientFile = compiled.file;
    clientOut = compiled.outdir;
    // localStorage mínimo para los helpers de sesión (no existe en Node).
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    const client = await import(pathToFileURL(clientFile).href);

    check("remoteConfigured con VITE_SAVE_API", client.remoteConfigured === true);

    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const pubkey = base58Encode(publicKey.export({ format: "der", type: "spki" }).subarray(12));

    const challenge = await client.requestChallenge(pubkey);
    check("requestChallenge devuelve mensaje", typeof challenge.message === "string" && challenge.message.includes(pubkey));

    const signature = crypto.sign(null, Buffer.from(challenge.message, "utf8"), privateKey);
    const session = await client.verifyChallenge(pubkey, challenge.message, signature);
    check("verifyChallenge devuelve token", typeof session.token === "string" && session.expiresAt > Date.now());

    client.storeSession({ pubkey, token: session.token, expiresAt: session.expiresAt });
    check("storeSession/loadSession", client.loadSession()?.token === session.token);

    const data = {
      version: 2,
      savedAt: Date.now(),
      money: 4321,
      inventory: { gasoil: 2 },
      missions: { mission_001: { state: "ACTIVE", objective: "obj_1" } },
      completedMissions: [],
      player: { mode: "on_foot", position: [7, 8, 9], yaw: 1.5, stats: { turbo: 100 } },
      vehicle: { current: "kart", position: [0, 0, 0], yaw: 0 },
      upgrades: {},
    };
    const pushed = await client.push(session.token, data.savedAt, data);
    check("push devuelve seq", Number.isFinite(pushed.seq) && pushed.seq > 0, JSON.stringify(pushed));

    const pulled = await client.pull(session.token);
    check(
      "pull devuelve el mismo guardado",
      pulled?.savedAt === data.savedAt && pulled?.data.money === 4321 && pulled?.data.player.position[2] === 9,
      JSON.stringify(pulled),
    );

    let conflict = null;
    try {
      await client.push(session.token, data.savedAt - 60_000, { ...data, money: 1 });
    } catch (error) {
      conflict = error;
    }
    check(
      "push más antiguo → ApiError 409 con el guardado actual",
      conflict?.status === 409 && conflict?.conflict?.data?.money === 4321,
      String(conflict),
    );

    const badToken = await client.pull("token-falso").then(() => null, (error) => error);
    check("pull con token inválido → 401", badToken?.status === 401, String(badToken));

    client.dropSession();
    check("dropSession borra la sesión", client.loadSession() === null);
  } finally {
    child.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    if (clientOut) fs.rmSync(clientOut, { recursive: true, force: true });
  }

  if (failures > 0) {
    console.error(`\n${failures} comprobación(es) fallida(s).`);
    process.exitCode = 1;
  } else {
    console.log("\nCliente y servidor de guardado compatibles (contrato API correcto).");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
