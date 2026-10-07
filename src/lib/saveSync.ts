/**
 * Orquestador del guardado (opción A): la partida vive SIEMPRE en
 * localStorage (rápido y offline) y, si hay wallet conectada, se refleja en el
 * servidor con el `savedAt` más alto como ganador.
 *
 * Reglas:
 *  - local gana si su savedAt es mayor → se sube
 *  - remoto gana si su savedAt es mayor → se baja y se aplica al juego
 *  - sin `VITE_SAVE_API` o sin red → el juego sigue funcionando igual
 */
import { SaveManager } from "../game/save/SaveManager";
import type { SaveData } from "../game/save/SaveManager";
import * as remote from "./remoteSave";
import { connect as connectWallet, shortKey, WalletError } from "./wallet";

export interface SyncStatus {
  /** Servidor configurado (VITE_SAVE_API). */
  configured: boolean;
  /** Sesión de wallet activa (token válido). */
  connected: boolean;
  /** Conectando o subiendo/bajando. */
  busy: boolean;
  pubkey: string | null;
  /** Última sincronización exitosa. */
  lastSyncAt: number | null;
  /** Texto listo para pintar en el menú. */
  message: string;
}

const PUSH_DEBOUNCE_MS = 1500;

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export class SaveSync {
  /** El servidor tiene algo más nuevo que hay que cargar en partida. */
  onRemoteNewer: ((save: SaveData) => void) | null = null;

  private listeners = new Set<(status: SyncStatus) => void>();
  private local = new SaveManager();
  private session: remote.Session | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pushing = false;
  private status: SyncStatus = {
    configured: remote.remoteConfigured,
    connected: false,
    busy: false,
    pubkey: null,
    lastSyncAt: null,
    message: remote.remoteConfigured
      ? "Guardado local · sin wallet"
      : "Guardado local · activa VITE_SAVE_API para la nube",
  };

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  get current(): SyncStatus {
    return this.status;
  }

  private update(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }

  private error(message: string): void {
    this.update({ busy: false, message: `Error: ${message}` });
  }

  /**
   * Recupera la sesión guardada (token) y compara local/nube.
   * No pide firma: sirve para reaparecer tras recargar la página.
   */
  async resume(): Promise<void> {
    if (!remote.remoteConfigured) return;
    const session = remote.loadSession();
    if (!session) return;
    this.session = session;
    this.update({ connected: true, pubkey: session.pubkey, busy: true, message: "Sincronizando…" });
    try {
      await this.reconcile();
    } catch (err) {
      this.error(err instanceof Error ? err.message : "fallo de red");
    }
  }

  /** Conecta la wallet, autentica con firma y sincroniza local ↔ nube. */
  async connect(): Promise<void> {
    if (!remote.remoteConfigured) {
      this.error("servidor de guardado sin configurar");
      return;
    }
    if (this.status.busy) return;
    this.update({ busy: true, message: "Conectando wallet…" });
    let authenticated = false;
    try {
      const wallet = await connectWallet();
      this.update({ busy: true, message: "Firmando con tu wallet…" });
      const challenge = await remote.requestChallenge(wallet.publicKey);
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verified = await remote.verifyChallenge(wallet.publicKey, challenge.message, signature);
      this.session = { pubkey: wallet.publicKey, token: verified.token, expiresAt: verified.expiresAt };
      remote.storeSession(this.session);
      authenticated = true;
      this.update({
        connected: true,
        busy: true,
        pubkey: wallet.publicKey,
        message: `Wallet ${shortKey(wallet.publicKey)} · sincronizando…`,
      });
      await this.reconcile();
    } catch (err) {
      // Solo se pierde la sesión si la autenticación no llegó a completarse;
      // si falló la red después de firmar, el token se conserva.
      if (!authenticated) {
        this.session = null;
        remote.dropSession();
      }
      const message =
        err instanceof WalletError && err.rejected
          ? "Conexión cancelada"
          : err instanceof Error
            ? err.message
            : "fallo al conectar";
      this.update({ connected: authenticated, busy: false, message: `Error: ${message}` });
    }
  }

  /** Cierra la sesión local (la nube conserva el guardado para la próxima). */
  async disconnect(): Promise<void> {
    this.cancelPush();
    remote.dropSession();
    this.session = null;
    this.update({
      connected: false,
      busy: false,
      pubkey: null,
      lastSyncAt: null,
      message: remote.remoteConfigured ? "Guardado local · sin wallet" : "Guardado local · sin nube",
    });
  }

  /**
   * Guarda en localStorage (siempre) y deja preparada la subida a la nube.
   * Devuelve el registro ya sellado con su `savedAt`.
   */
  commit(data: Omit<SaveData, "savedAt">): SaveData | null {
    const stamped: SaveData = { ...data, savedAt: Date.now() };
    if (!this.local.write(stamped)) return null;
    if (this.session) this.schedulePush();
    return stamped;
  }

  /** Fuerza la subida (al salir del juego). Mejor esfuerzo: no lanza. */
  async flush(): Promise<void> {
    this.cancelPush();
    await this.pushNow();
  }

  private schedulePush(): void {
    this.cancelPush();
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.pushNow();
    }, PUSH_DEBOUNCE_MS);
  }

  private cancelPush(): void {
    if (this.pushTimer !== null) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
  }

  private async pushNow(): Promise<void> {
    const session = this.session;
    if (!session || this.pushing) return;
    const local = this.local.load();
    if (!local) return;
    this.pushing = true;
    try {
      await remote.push(session.token, local.savedAt, local);
      this.update({ lastSyncAt: Date.now(), message: `Nube ✓ ${fmtTime(Date.now())} · ${shortKey(session.pubkey)}` });
    } catch (err) {
      if (err instanceof remote.ApiError && err.status === 409) {
        // La nube está más adelante: no se pisa la partida en marcha.
        // Se bajará en la próxima carga (reconcile), cuando el jugador esté en el menú.
        this.update({
          lastSyncAt: Date.now(),
          message: `Nube más nueva (${fmtTime(err.conflict?.savedAt ?? Date.now())}) · se cargará al volver a entrar`,
        });
      } else if (err instanceof remote.ApiError && (err.status === 401 || err.status === 403)) {
        // Token caducado: se pedirá firma de nuevo en el próximo connect().
        remote.dropSession();
        this.session = null;
        this.update({ connected: false, message: "Sesión caducada · vuelve a conectar" });
      } else {
        this.error(err instanceof Error ? err.message : "sin conexión");
      }
    } finally {
      this.pushing = false;
    }
  }

  /** Compara local y nube, aplica la más nueva y sube si gana el local. */
  private async reconcile(): Promise<void> {
    const session = this.session;
    if (!session) return;
    try {
      const local = this.local.load();
      const cloud = await remote.pull(session.token);

      if (cloud && local) {
        if (cloud.savedAt > local.savedAt) this.applyRemote(cloud);
        else await this.pushNow();
      } else if (cloud) {
        this.applyRemote(cloud);
      } else if (local) {
        await this.pushNow();
      }
      this.update({ lastSyncAt: Date.now(), message: `Nube ✓ ${fmtTime(Date.now())} · ${shortKey(session.pubkey)}` });
    } finally {
      this.update({ busy: false });
    }
  }

  private applyRemote(cloud: remote.RemoteSave): void {
    this.local.write(cloud.data);
    this.update({
      busy: false,
      lastSyncAt: Date.now(),
      message: `Nube ✓ ${fmtTime(cloud.savedAt)} · ${shortKey(this.session?.pubkey ?? "")}`,
    });
    this.onRemoteNewer?.(cloud.data);
  }
}

export const saveSync = new SaveSync();
