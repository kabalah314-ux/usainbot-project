import { gameSettings } from "../../data/config";
import type { InputSettings } from "../../data/types";
import { applyRadialDeadzone } from "../../utils/math";
import { GamepadReader } from "./GamepadReader";
import {
  PAD,
  gamepadBindings,
  keyboardBindings,
  lookKeys,
  moveKeys,
} from "./bindings";
import type { InputAction, InputDevice } from "./bindings";

export interface Axis2 {
  x: number;
  y: number;
}

/**
 * Entrada centralizada: teclado + mando + arrastre de ratón.
 * Todo se expone como acciones y ejes "de mando" (stick izq./der.),
 * así el gameplay es idéntico juegues con teclado o con pad.
 *
 * Orden por frame: poll() → lecturas → endFrame().
 */
export class InputManager {
  activeDevice: InputDevice = "keyboard";
  onGamepadChange: ((connected: boolean, id: string) => void) | null = null;

  private settings: InputSettings;
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private pad = new GamepadReader();
  private pointerTarget: HTMLElement | null = null;
  private dragPointer = -1;
  private pointerDelta: Axis2 = { x: 0, y: 0 };
  private moveAxis: Axis2 = { x: 0, y: 0 };
  private lookAxis: Axis2 = { x: 0, y: 0 };
  private tmp: Axis2 = { x: 0, y: 0 };

  constructor(settings: InputSettings = gameSettings.input) {
    this.settings = settings;
  }

  // ---------------- Ciclo de vida ----------------

  /** El puntero está capturado (ratón = cámara, estilo juego de PC). */
  get pointerLocked(): boolean {
    return !!this.pointerTarget && document.pointerLockElement === this.pointerTarget;
  }

  /** Captura el ratón (debe llamarse cerca de un gesto del usuario). */
  requestPointerLock(): void {
    const t = this.pointerTarget;
    if (!t || this.pointerLocked || typeof t.requestPointerLock !== "function") return;
    try {
      const r = t.requestPointerLock() as unknown;
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      // Sin pointer lock (iframes, permisos): queda el arrastre con el botón izquierdo.
    }
  }

  releasePointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.pointerDelta.x += e.movementX;
    this.pointerDelta.y += e.movementY;
  };

  attach(pointerTarget: HTMLElement): void {
    this.pointerTarget = pointerTarget;
    document.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("gamepadconnected", this.onPadConnected);
    window.addEventListener("gamepaddisconnected", this.onPadDisconnected);
    pointerTarget.addEventListener("pointerdown", this.onPointerDown);
    pointerTarget.addEventListener("pointermove", this.onPointerMove);
    pointerTarget.addEventListener("pointerup", this.onPointerUp);
    pointerTarget.addEventListener("pointercancel", this.onPointerUp);
  }

  detach(): void {
    document.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("gamepadconnected", this.onPadConnected);
    window.removeEventListener("gamepaddisconnected", this.onPadDisconnected);
    const t = this.pointerTarget;
    if (t) {
      t.removeEventListener("pointerdown", this.onPointerDown);
      t.removeEventListener("pointermove", this.onPointerMove);
      t.removeEventListener("pointerup", this.onPointerUp);
      t.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.pointerTarget = null;
  }

  /** Inicio de frame: sondea el mando. */
  poll(): void {
    if (this.pad.poll(this.settings.triggerThreshold, 0.5)) {
      this.activeDevice = "gamepad";
    }
  }

  /** Fin de frame: limpia pulsaciones y deltas. */
  endFrame(): void {
    this.keysPressed.clear();
    this.pointerDelta.x = 0;
    this.pointerDelta.y = 0;
  }

  // ---------------- Consultas ----------------

  isDown(action: InputAction): boolean {
    return (
      keyboardBindings[action].some((code) => this.keysDown.has(code)) ||
      gamepadBindings[action].some((b) => this.pad.isDown(b))
    );
  }

  /** True solo en el frame en que se pulsó. */
  wasPressed(action: InputAction): boolean {
    return (
      keyboardBindings[action].some((code) => this.keysPressed.has(code)) ||
      gamepadBindings[action].some((b) => this.pad.wasPressed(b))
    );
  }

  /**
   * Stick izquierdo: x = derecha (+), y = adelante (+). Magnitud 0..1
   * (analógico real en mando: poco recorrido = caminar).
   */
  getMoveAxis(): Readonly<Axis2> {
    const kx = this.keyAxis(moveKeys.right) - this.keyAxis(moveKeys.left);
    const ky = this.keyAxis(moveKeys.up) - this.keyAxis(moveKeys.down);
    const dx =
      (this.pad.isDown(PAD.right) ? 1 : 0) - (this.pad.isDown(PAD.left) ? 1 : 0);
    const dy = (this.pad.isDown(PAD.up) ? 1 : 0) - (this.pad.isDown(PAD.down) ? 1 : 0);
    const stick = applyRadialDeadzone(
      this.pad.axes[0],
      -this.pad.axes[1],
      this.settings.moveDeadzone,
      this.tmp
    );
    this.pickStrongest(this.moveAxis, kx + dx, ky + dy, stick.x, stick.y);
    return this.moveAxis;
  }

  /** Stick derecho (cámara): x = derecha (+), y = arriba (+). */
  getLookAxis(): Readonly<Axis2> {
    const kx = this.keyAxis(lookKeys.right) - this.keyAxis(lookKeys.left);
    const ky = this.keyAxis(lookKeys.up) - this.keyAxis(lookKeys.down);
    const stick = applyRadialDeadzone(
      this.pad.axes[2],
      -this.pad.axes[3],
      this.settings.lookDeadzone,
      this.tmp
    );
    this.pickStrongest(this.lookAxis, kx, ky, stick.x, stick.y);
    return this.lookAxis;
  }

  /** Píxeles arrastrados con el ratón este frame (cámara opcional). */
  getPointerDelta(): Readonly<Axis2> {
    return this.pointerDelta;
  }

  get gamepadConnected(): boolean {
    return this.pad.connected;
  }

  get gamepadId(): string {
    return this.pad.id;
  }

  // ---------------- Internos ----------------

  private keyAxis(codes: string[]): number {
    return codes.some((c) => this.keysDown.has(c)) ? 1 : 0;
  }

  /** Usa la fuente con más magnitud (teclado digital vs stick analógico). */
  private pickStrongest(out: Axis2, kx: number, ky: number, sx: number, sy: number): void {
    let x = Math.max(-1, Math.min(1, kx));
    let y = Math.max(-1, Math.min(1, ky));
    const kLen = Math.hypot(x, y);
    if (kLen > 1) {
      x /= kLen;
      y /= kLen;
    }
    if (Math.hypot(sx, sy) > Math.min(1, kLen)) {
      x = sx;
      y = sy;
    }
    out.x = x;
    out.y = y;
  }

  private isBound(code: string): boolean {
    return (
      Object.values(keyboardBindings).some((codes) => codes.includes(code)) ||
      Object.values(moveKeys).some((codes) => codes.includes(code)) ||
      Object.values(lookKeys).some((codes) => codes.includes(code))
    );
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.activeDevice = "keyboard";
    if (this.isBound(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keysDown.add(e.code);
    this.keysPressed.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private onBlur = (): void => {
    this.keysDown.clear();
    this.keysPressed.clear();
    this.dragPointer = -1;
  };

  private onPadConnected = (e: GamepadEvent): void => {
    this.activeDevice = "gamepad";
    this.onGamepadChange?.(true, e.gamepad.id);
  };

  private onPadDisconnected = (e: GamepadEvent): void => {
    this.activeDevice = "keyboard";
    this.onGamepadChange?.(false, e.gamepad.id);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.dragPointer = e.pointerId;
    this.pointerTarget?.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragPointer || this.pointerLocked) return;
    this.pointerDelta.x += e.movementX;
    this.pointerDelta.y += e.movementY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragPointer) return;
    this.dragPointer = -1;
    if (this.pointerTarget?.hasPointerCapture(e.pointerId)) {
      this.pointerTarget.releasePointerCapture(e.pointerId);
    }
  };
}
