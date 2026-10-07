/**
 * Lectura del primer mando conectado (Gamepad API, "standard mapping").
 * Compatible con DualShock/DualSense, mandos Xbox y adaptadores USB de PS2.
 * Se sondea una vez por frame (la API no emite eventos por botón).
 */
export class GamepadReader {
  readonly axes = [0, 0, 0, 0];
  connected = false;
  id = "";

  private current: boolean[] = [];
  private previous: boolean[] = [];

  /** Devuelve true si hubo actividad significativa este frame. */
  poll(triggerThreshold: number, activityThreshold: number): boolean {
    const swap = this.previous;
    this.previous = this.current;
    this.current = swap;
    this.current.length = 0;

    const pad = this.findPad();
    if (!pad) {
      this.connected = false;
      this.axes.fill(0);
      return false;
    }
    this.connected = true;
    this.id = pad.id;

    let active = false;
    for (let i = 0; i < pad.buttons.length; i++) {
      const button = pad.buttons[i];
      const down = button.pressed || button.value > triggerThreshold;
      this.current[i] = down;
      if (down) active = true;
    }
    for (let i = 0; i < 4; i++) {
      const v = pad.axes[i] ?? 0;
      this.axes[i] = v;
      if (Math.abs(v) > activityThreshold) active = true;
    }
    return active;
  }

  isDown(button: number): boolean {
    return this.current[button] === true;
  }

  wasPressed(button: number): boolean {
    return this.current[button] === true && this.previous[button] !== true;
  }

  private findPad(): Gamepad | null {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return null;
    }
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return null;
  }
}
