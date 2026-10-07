/**
 * Cliente HTTP del guardado remoto (opción A).
 *
 * Auth sin transacción: el servidor reto un mensaje → la wallet lo firma →
 * el servidor verifica la Ed25519 y devuelve un token de sesión.
 * Después solo se sube/baja el guardado con `Authorization: Bearer <token>`.
 *
 * Todo es opcional: si `VITE_SAVE_API` no está definido, `remoteConfigured`
 * es false y el juego sigue funcionando 100 % con localStorage.
 */
import type { SaveData } from "../game/save/SaveManager";

const API_BASE = (import.meta.env.VITE_SAVE_API ?? "").trim().replace(/\/+$/, "");

/** true si hay servidor de guardado configurado. */
export const remoteConfigured = API_BASE.length > 0;

/** Guardado remoto: el mismo payload local + contador `seq` del servidor. */
export interface RemoteSave {
  seq: number;
  savedAt: number;
  data: SaveData;
}

export interface Session {
  pubkey: string;
  token: string;
  expiresAt: number;
}

const SESSION_KEY = "usainbot_session_v1";
/** Margen para no caducar en mitad de una subida. */
const EXPIRY_SLACK_MS = 60_000;

export class ApiError extends Error {
  readonly status: number;
  /** Respuesta 409: el servidor tiene un guardado más nuevo. */
  readonly conflict: RemoteSave | null;

  constructor(message: string, status: number, conflict: RemoteSave | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.conflict = conflict;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Sin conexión con el servidor de guardado", 0);
  }
  const text = await response.text();
  const body = (text ? (JSON.parse(text) as Record<string, unknown>) : {}) as { error?: string; save?: RemoteSave } & Partial<T>;
  if (!response.ok) {
    throw new ApiError(body.error ?? `Error ${response.status}`, response.status, body.save ?? null);
  }
  return body as T;
}

/** 1) Toma de contacto: el servidor entrega el mensaje exacto a firmar. */
export function requestChallenge(pubkey: string): Promise<{ message: string; expiresAt: number }> {
  return request("/auth/nonce", { method: "POST", body: JSON.stringify({ pubkey }) });
}

/** 2) Envía la firma y recibe el token de sesión. */
export function verifyChallenge(
  pubkey: string,
  message: string,
  signature: Uint8Array,
): Promise<{ token: string; expiresAt: number }> {
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ pubkey, message, signature: btoa(binary) }),
  });
}

/** Descarga el guardado de la nube (null si la wallet todavía no guardó). */
export async function pull(token: string): Promise<RemoteSave | null> {
  try {
    return await request<RemoteSave>("/save", { method: "GET" }, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Sube el guardado. Lanza ApiError con status 409 si la nube está más adelante. */
export async function push(token: string, savedAt: number, data: SaveData): Promise<{ seq: number }> {
  return request("/save", { method: "POST", body: JSON.stringify({ savedAt, data }) }, token);
}

/** Borra el guardado remoto (al desconectar la wallet). */
export function remove(token: string): Promise<{ ok: boolean }> {
  return request("/save", { method: "DELETE" }, token);
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.token || !session.pubkey) return null;
    if (typeof session.expiresAt === "number" && session.expiresAt - EXPIRY_SLACK_MS < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function storeSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sin storage: la sesión solo durará esta pestaña.
  }
}

export function dropSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que borrar.
  }
}
