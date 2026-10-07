#!/usr/bin/env node
/**
 * Test end-to-end del servidor de guardado (opción A).
 * Arranca el servidor real, autentica con una clave Ed25519 generada al vuelo
 * (igual que haría una wallet) y valida el ciclo completo de guardado.
 *
 *   node backend/save-server/test.mjs
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
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

async function call(method, route, body, token) {
  const response = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

async function waitForServer(child, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`el servidor terminó antes de arrancar (${child.exitCode})`);
    try {
      const { status } = await call("GET", "/health");
      if (status === 200) return;
    } catch {
      // Todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("el servidor no respondió a /health");
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "usainbot-save-"));
  const child = spawn(process.execPath, [path.join(HERE, "index.mjs")], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

  try {
    await waitForServer(child);
    console.log("Servidor arrancado. Autenticación…");

    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const pubkey = base58Encode(publicKey.export({ format: "der", type: "spki" }).subarray(12));
    check("pubkey base58 de 32 bytes", pubkey.length >= 32 && pubkey.length <= 44, pubkey);

    const challenge = await call("POST", "/auth/nonce", { pubkey });
    check("POST /auth/nonce → 200", challenge.status === 200 && typeof challenge.body.message === "string");

    const signature = crypto.sign(null, Buffer.from(challenge.body.message, "utf8"), privateKey);
    const auth = await call("POST", "/auth/verify", {
      pubkey,
      message: challenge.body.message,
      signature: signature.toString("base64"),
    });
    check("POST /auth/verify → 200 + token", auth.status === 200 && typeof auth.body.token === "string");
    const token = auth.body.token;

    const badAuth = await call("POST", "/auth/verify", {
      pubkey,
      message: challenge.body.message,
      signature: Buffer.alloc(64).toString("base64"),
    });
    check("firma falsa → 401", badAuth.status === 401, `status ${badAuth.status}`);

    const empty = await call("GET", "/save", undefined, token);
    check("GET /save sin guardado → 404", empty.status === 404, `status ${empty.status}`);

    const unauth = await call("GET", "/save");
    check("GET /save sin token → 401", unauth.status === 401, `status ${unauth.status}`);

    const payload = {
      version: 2,
      savedAt: 1_000,
      money: 2500,
      inventory: { gasoil: 3 },
      missions: { mission_001: { state: "ACTIVE", objective: "obj_2" } },
      completedMissions: [],
      player: { mode: "on_foot", position: [1, 2, 3], yaw: 0.5, stats: {} },
      vehicle: { current: "kart", position: [0, 0, 0], yaw: 0 },
      upgrades: {},
    };
    const push1 = await call("POST", "/save", { savedAt: payload.savedAt, data: payload }, token);
    check("POST /save → 200 con seq", push1.status === 200 && push1.body.seq > 0, JSON.stringify(push1.body));

    const pull1 = await call("GET", "/save", undefined, token);
    check(
      "GET /save devuelve el guardado",
      pull1.status === 200 && pull1.body.savedAt === 1_000 && pull1.body.data.money === 2500,
      JSON.stringify(pull1.body),
    );

    const stale = await call("POST", "/save", { savedAt: 500, data: { ...payload, money: 10 } }, token);
    check(
      "savedAt más antiguo → 409 con el guardado actual",
      stale.status === 409 && stale.body.save?.savedAt === 1_000,
      `status ${stale.status}`,
    );

    const newer = await call("POST", "/save", { savedAt: 2_000, data: { ...payload, money: 9999 } }, token);
    check("savedAt más nuevo → 200 y seq crece", newer.status === 200 && newer.body.seq > push1.body.seq);

    const del = await call("DELETE", "/save", undefined, token);
    const afterDelete = await call("GET", "/save", undefined, token);
    check("DELETE /save borra el guardado", del.status === 200 && afterDelete.status === 404);

    // Persistencia: el siguiente proceso debe leer lo mismo del disco.
    const persisted = JSON.parse(fs.readFileSync(path.join(dataDir, "saves.json"), "utf8"));
    check("fichero de datos escrito", typeof persisted.counter === "number");
  } finally {
    child.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  if (failures > 0) {
    console.error(`\n${failures} comprobación(es) fallida(s).`);
    process.exitCode = 1;
  } else {
    console.log("\nTodo correcto: auth + guardado remoto funcionando.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
