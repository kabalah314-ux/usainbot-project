#!/usr/bin/env node
/**
 * Servidor de guardado de USAINBOT (opción A) — cero dependencias.
 *
 *   POST /auth/nonce   {pubkey}                  → {message, expiresAt}
 *   POST /auth/verify  {pubkey, message, signature} → {token, expiresAt}
 *   GET  /save         (Bearer)                  → {seq, savedAt, data} | 404
 *   POST /save         (Bearer) {savedAt, data}  → {seq} | 409 si la nube es más nueva
 *   DELETE /save       (Bearer)                  → {ok}
 *
 * Auth por firma Ed25519 de un mensaje de login (la wallet solo firma texto,
 * sin transacción y sin gastar SOL). Los guardados viven en JSON en disco.
 *
 * Env: PORT (8787), HOST, DATA_DIR (./data), ALLOWED_ORIGINS (CSV o *),
 *      TOKEN_TTL_HOURS (168).
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const SAVE_FILE = path.join(DATA_DIR, "saves.json");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_HOURS ?? 168) * 3_600_000;
const NONCE_TTL_MS = 5 * 60_000;
const MAX_BODY_BYTES = 512 * 1024;

/** SPKI/DER de Ed25519 + clave cruda de 32 bytes (formato de Node). */
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const pending = new Map(); // pubkey → {message, exp}
const tokens = new Map(); // token → {pubkey, exp}
let saves = Object.create(null); // pubkey → {seq, savedAt, data}
let saveCounter = 0;

function base58Decode(text) {
  const bytes = [0];
  for (const char of text) {
    const value = B58_ALPHABET.indexOf(char);
    if (value === -1) throw new Error("base58 inválido");
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < text.length && text[i] === B58_ALPHABET[0]; i++) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

function loadSaves() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
    if (parsed && typeof parsed === "object") {
      saves = parsed.saves ?? Object.create(null);
      saveCounter = Number(parsed.counter) || 0;
    }
  } catch {
    // Sin fichero previo: arrancamos vacíos.
  }
}

function persistSaves() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SAVE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ counter: saveCounter, saves }));
  fs.renameSync(tmp, SAVE_FILE);
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes("*")
    ? ALLOWED_ORIGINS[0]
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function send(res, status, body, origin) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    ...corsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

function auth(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = tokens.get(token);
  if (!session) return null;
  if (session.exp < Date.now()) {
    tokens.delete(token);
    return null;
  }
  return { token, pubkey: session.pubkey };
}

function isValidPubkey(pubkey) {
  if (typeof pubkey !== "string" || pubkey.length < 32 || pubkey.length > 44) return false;
  try {
    return base58Decode(pubkey).length === 32;
  } catch {
    return false;
  }
}

function verifySignature(pubkey, message, signatureB64) {
  const publicKey = base58Decode(pubkey);
  if (publicKey.length !== 32) return false;
  let signature;
  try {
    signature = Buffer.from(signatureB64, "base64");
  } catch {
    return false;
  }
  if (signature.length !== 64) return false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, publicKey]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(null, Buffer.from(message, "utf8"), key, signature);
  } catch {
    return false;
  }
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const origin = req.headers.origin ?? "";
  const route = `${req.method} ${url.pathname}`;

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }
  if (route === "GET /health") {
    send(res, 200, { ok: true, saves: Object.keys(saves).length }, origin);
    return;
  }

  if (route === "POST /auth/nonce") {
    const body = await readBody(req);
    if (!isValidPubkey(body.pubkey)) return send(res, 400, { error: "pubkey inválida" }, origin);
    const now = new Date();
    const expiresAt = now.getTime() + NONCE_TTL_MS;
    const message = [
      "Usain Bot save · login",
      `wallet: ${body.pubkey}`,
      `nonce: ${crypto.randomBytes(16).toString("hex")}`,
      `issued: ${now.toISOString()}`,
      `expires: ${new Date(expiresAt).toISOString()}`,
    ].join("\n");
    pending.set(body.pubkey, { message, exp: expiresAt });
    return send(res, 200, { message, expiresAt }, origin);
  }

  if (route === "POST /auth/verify") {
    const body = await readBody(req);
    const { pubkey, message, signature } = body;
    if (!isValidPubkey(pubkey)) return send(res, 400, { error: "pubkey inválida" }, origin);
    const challenge = pending.get(pubkey);
    if (!challenge || challenge.exp < Date.now() || challenge.message !== message) {
      pending.delete(pubkey);
      return send(res, 401, { error: "challenge no válido o caducado" }, origin);
    }
    if (!verifySignature(pubkey, message, signature)) {
      return send(res, 401, { error: "firma no válida" }, origin);
    }
    pending.delete(pubkey);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    tokens.set(token, { pubkey, exp: expiresAt });
    return send(res, 200, { token, expiresAt }, origin);
  }

  if (route === "GET /save") {
    const session = auth(req);
    if (!session) return send(res, 401, { error: "token no válido" }, origin);
    const record = saves[session.pubkey];
    if (!record) return send(res, 404, { error: "sin guardado" }, origin);
    return send(res, 200, record, origin);
  }

  if (route === "POST /save") {
    const session = auth(req);
    if (!session) return send(res, 401, { error: "token no válido" }, origin);
    const body = await readBody(req);
    const savedAt = Number(body.savedAt);
    if (!Number.isFinite(savedAt) || savedAt < 0) return send(res, 400, { error: "savedAt inválido" }, origin);
    if (!body.data || typeof body.data !== "object") return send(res, 400, { error: "data inválida" }, origin);
    if (Buffer.byteLength(JSON.stringify(body.data)) > MAX_BODY_BYTES) {
      return send(res, 413, { error: "guardado demasiado grande" }, origin);
    }
    const current = saves[session.pubkey];
    if (current && current.savedAt > savedAt) {
      // Conflicto: quien sube decide si baja el más nuevo (regla "gana el más reciente").
      return send(res, 409, { error: "la nube tiene un guardado más nuevo", save: current }, origin);
    }
    saveCounter += 1;
    saves[session.pubkey] = { seq: saveCounter, savedAt, data: body.data };
    persistSaves();
    return send(res, 200, { seq: saveCounter }, origin);
  }

  if (route === "DELETE /save") {
    const session = auth(req);
    if (!session) return send(res, 401, { error: "token no válido" }, origin);
    if (saves[session.pubkey]) {
      delete saves[session.pubkey];
      persistSaves();
    }
    return send(res, 200, { ok: true }, origin);
  }

  send(res, 404, { error: "ruta no encontrada" }, origin);
}

export function createServer() {
  loadSaves();
  return http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      const status = error?.message === "payload demasiado grande" ? 413 : 400;
      send(res, status, { error: error?.message ?? "error interno" }, req.headers.origin ?? "");
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`[save-server] http://${HOST}:${PORT} · data en ${DATA_DIR}`);
  });
}
