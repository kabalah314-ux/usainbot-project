/**
 * Audio sintetizado con WebAudio (sin assets todavía): efectos cortos
 * de estilo arcade + zumbido continuo del servomotor durante el turbo.
 * La API (playSfx / setTurbo) se mantiene cuando lleguen samples reales.
 */
export type SfxName =
  | "jump"
  | "interact"
  | "mission"
  | "ui"
  | "sprint"
  | "can_open"
  | "gulp"
  | "ahh"
  | "crush"
  | "turbo_start"
  | "deny"
  | "buy"
  | "pickup"
  | "checkpoint"
  | "countdown"
  | "go"
  | "win"
  | "fail"
  | "door"
  | "crash"
  | "engine_start"
  | "horn";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private turboFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  muted = false;

  /** Debe llamarse desde un gesto del usuario (política de navegadores). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  get isReady(): boolean {
    return this.ctx !== null;
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol = 0.5, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(dur: number, freq: number, vol = 0.4, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise || this.muted) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  playSfx(name: SfxName): void {
    switch (name) {
      case "can_open":
        this.tone("square", 1400, 900, 0.04, 0.25);
        this.hiss(0.28, 3500, 0.5, 0.03);
        break;
      case "gulp":
        this.tone("sine", 260, 90, 0.14, 0.6);
        break;
      case "ahh":
        this.tone("sawtooth", 220, 330, 0.3, 0.25);
        this.tone("square", 660, 1320, 0.25, 0.12, 0.08);
        break;
      case "crush":
        this.hiss(0.12, 1800, 0.6);
        this.tone("square", 180, 60, 0.1, 0.3);
        break;
      case "turbo_start":
        this.tone("sawtooth", 120, 900, 0.35, 0.35);
        this.hiss(0.3, 900, 0.3);
        break;
      case "deny":
        this.tone("square", 180, 140, 0.18, 0.3);
        break;
      case "buy":
        this.tone("square", 880, 880, 0.06, 0.25);
        this.tone("square", 1320, 1320, 0.1, 0.25, 0.07);
        break;
      case "pickup":
        this.tone("triangle", 660, 1320, 0.15, 0.4);
        break;
      case "checkpoint":
        this.tone("triangle", 988, 988, 0.08, 0.4);
        this.tone("triangle", 1480, 1480, 0.14, 0.4, 0.08);
        break;
      case "countdown":
        this.tone("square", 440, 440, 0.18, 0.3);
        break;
      case "go":
        this.tone("square", 880, 880, 0.4, 0.35);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone("square", f, f, 0.16, 0.28, i * 0.1));
        break;
      case "fail":
        [392, 330, 262].forEach((f, i) => this.tone("sawtooth", f, f * 0.95, 0.22, 0.25, i * 0.16));
        break;
      case "door":
        this.tone("square", 320, 180, 0.08, 0.3);
        this.hiss(0.06, 1200, 0.3, 0.05);
        break;
      case "crash":
        this.hiss(0.35, 700, 0.9);
        this.tone("sawtooth", 140, 40, 0.3, 0.45);
        break;
      case "horn":
        this.tone("square", 392, 392, 0.22, 0.22);
        this.tone("square", 494, 494, 0.22, 0.18);
        break;
      case "engine_start":
        this.tone("sawtooth", 60, 140, 0.45, 0.35);
        this.tone("square", 90, 70, 0.3, 0.2, 0.3);
        break;
      case "jump":
        this.tone("square", 300, 600, 0.1, 0.15);
        break;
      case "mission":
        [784, 988, 1175].forEach((f, i) => this.tone("triangle", f, f, 0.12, 0.3, i * 0.09));
        break;
      default:
        this.tone("triangle", 700, 700, 0.05, 0.2);
    }
  }

  /** Zumbido del servomotor del turbo: `level` 0..1 (0 = apagado). */
  setTurbo(level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (!this.turboOsc) {
      this.turboOsc = ctx.createOscillator();
      this.turboOsc.type = "sawtooth";
      this.turboFilter = ctx.createBiquadFilter();
      this.turboFilter.type = "lowpass";
      this.turboGain = ctx.createGain();
      this.turboGain.gain.value = 0;
      this.turboOsc.connect(this.turboFilter).connect(this.turboGain).connect(this.master);
      this.turboOsc.start();
    }
    const t = ctx.currentTime;
    const on = level > 0.01 && !this.muted;
    this.turboGain?.gain.setTargetAtTime(on ? 0.09 : 0, t, 0.06);
    this.turboOsc.frequency.setTargetAtTime(90 + level * 140, t, 0.1);
    this.turboFilter?.frequency.setTargetAtTime(500 + level * 1400, t, 0.1);
  }

  /** Niveles de ambiente (AmbientManager). Preparado: aquí se conectarán los bucles reales. */
  readonly ambientLevels: Record<string, number> = {};

  setAmbientLayer(layer: string, volume: number): void {
    this.ambientLevels[layer] = volume;
    // TODO(fase de sonido): ajustar la ganancia del bucle `layer`.
  }

  /** Motor del coche: `rpm` 0..1 (null = apagado). Independiente del turbo de UsainBot. */
  setEngine(rpm: number | null): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (!this.engineOsc) {
      // Motor SUTIL: onda triangular amortiguada → un zumbido grave y
      // discreto, no el ronroneo áspero del cuadrado anterior.
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = "triangle";
      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.Q.value = 0.6;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    const t = ctx.currentTime;
    const on = rpm !== null && !this.muted;
    const r = rpm ?? 0;
    // Volumen muy bajo y amortiguado: se nota, pero no tapa el resto
    this.engineGain?.gain.setTargetAtTime(on ? 0.018 + r * 0.014 : 0, t, 0.22);
    this.engineOsc.frequency.setTargetAtTime(30 + r * 48, t, 0.2);
    this.engineFilter?.frequency.setTargetAtTime(120 + r * 220, t, 0.25);
  }

  playMusic(_track: string): void {
    // TODO(fase de sonido): música por zonas.
  }

  stopMusic(): void {
    this.setTurbo(0);
    this.setEngine(null);
  }
}
