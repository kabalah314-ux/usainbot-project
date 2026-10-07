/**
 * Conexión de wallet Solana sin dependencias.
 * Usa solo los proveedores inyectados (Phantom, Solflare, Backpack) y las dos
 * operaciones que necesitamos: `connect` (pubkey) y `signMessage` (auth del guardado).
 * Nada de transacciones ni de @solana/web3.js: el bundle no crece.
 */

export type ProviderName = "phantom" | "solflare" | "backpack" | "injected";

export interface WalletSession {
  /** Clave pública en base58 (lo que identifica al jugador en el servidor). */
  publicKey: string;
  provider: ProviderName;
  /** Firma un mensaje UTF-8 devolviendo los 64 bytes Ed25519. */
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

type PublicKeyLike = string | { toBase58?: () => string; toBytes?: () => Uint8Array };

interface InjectedProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  connect?: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: PublicKeyLike } | void>;
  request?: (args: { method: string; params?: unknown }) => Promise<{ publicKey?: PublicKeyLike } | PublicKeyLike>;
  signMessage?: (message: Uint8Array, encoding?: "utf8" | "hex") => Promise<{ signature: Uint8Array | string }>;
  disconnect?: () => Promise<void>;
}

declare global {
  interface Window {
    phantom?: { solana?: InjectedProvider };
    solflare?: InjectedProvider;
    backpack?: { solana?: InjectedProvider };
    solana?: InjectedProvider;
  }
}

export class WalletError extends Error {
  /** true si el usuario rechazó la conexión en la propia wallet. */
  readonly rejected: boolean;

  constructor(message: string, rejected = false) {
    super(message);
    this.name = "WalletError";
    this.rejected = rejected;
  }
}

function detect(): { name: ProviderName; provider: InjectedProvider } | null {
  if (typeof window === "undefined") return null;
  const candidates: Array<[ProviderName, InjectedProvider | undefined]> = [
    ["phantom", window.phantom?.solana],
    ["solflare", window.solflare],
    ["backpack", window.backpack?.solana],
    ["injected", window.solana],
  ];
  for (const [name, provider] of candidates) {
    if (!provider) continue;
    if (name === "phantom" && provider.isSolflare) continue;
    if (name === "injected" && (provider.isPhantom || provider.isSolflare || provider.isBackpack)) continue;
    return { name, provider };
  }
  return null;
}

/** Hay alguna wallet instalada en el navegador. */
export function hasWallet(): boolean {
  return detect() !== null;
}

function toBase58(value: PublicKeyLike | undefined): string {
  if (typeof value === "string") {
    if (value.length > 0) return value;
    throw new WalletError("La wallet no devolvió una clave pública válida");
  }
  if (value && typeof value.toBase58 === "function") {
    const encoded = value.toBase58();
    if (typeof encoded === "string" && encoded.length > 0) return encoded;
  }
  throw new WalletError("La wallet no devolvió una clave pública válida");
}

function toBytes(value: Uint8Array | string): Uint8Array {
  if (value instanceof Uint8Array) return value;
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function isRejected(error: unknown): boolean {
  const code = (error as { code?: number } | null)?.code;
  return code === 4001 || code === 31008;
}

/**
 * Conecta la wallet del usuario. Si no hay proveedor instalado lanza un
 * WalletError con mensaje apto para mostrar en la UI.
 */
export async function connect(): Promise<WalletSession> {
  const found = detect();
  if (!found) {
    throw new WalletError("No detecto ninguna wallet. Instala Phantom o Solflare y recarga.");
  }
  const { name, provider } = found;
  if (typeof provider.signMessage !== "function") {
    throw new WalletError("Esta wallet no firma mensajes (no sirve para guardar partida)");
  }

  let publicKey: PublicKeyLike | undefined;
  try {
    const result = provider.connect ? await provider.connect() : await provider.request?.({ method: "connect" });
    publicKey = (result as { publicKey?: PublicKeyLike } | undefined)?.publicKey ?? (result as PublicKeyLike | undefined);
  } catch (error) {
    if (isRejected(error)) throw new WalletError("Conexión cancelada", true);
    // Segundo intento por el método legacy (wallets antiguas).
    try {
      const legacy = await provider.request?.({ method: "connect" });
      publicKey = (legacy as { publicKey?: PublicKeyLike } | undefined)?.publicKey ?? (legacy as PublicKeyLike | undefined);
    } catch (fallback) {
      if (isRejected(fallback)) throw new WalletError("Conexión cancelada", true);
      throw new WalletError("No se pudo conectar con la wallet");
    }
  }

  const signMessage = provider.signMessage.bind(provider);
  return {
    publicKey: toBase58(publicKey),
    provider: name,
    signMessage: async (message: Uint8Array) => {
      try {
        const result = await signMessage(message, "utf8");
        const signature = result?.signature;
        if (!signature) throw new WalletError("La wallet no devolvió firma");
        return toBytes(signature);
      } catch (error) {
        if (error instanceof WalletError) throw error;
        if (isRejected(error)) throw new WalletError("Firma cancelada", true);
        throw new WalletError("La wallet rechazó firmar el mensaje");
      }
    },
  };
}

/** `0xAbCd…1234` para mostrar en la UI sin ocupar pantalla. */
export function shortKey(publicKey: string): string {
  if (publicKey.length <= 10) return publicKey;
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}
