/** Tiny WebAudio blip engine — zero assets, comic arcade feel. */

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, to, dur = 0.12, type = "square", gain = 0.06, delay = 0 }: ToneOpts) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur = 0.25, gain = 0.09) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  unlock: () => ac(),
  coin: () => {
    tone({ freq: 880, dur: 0.06, type: "square", gain: 0.05 });
    tone({ freq: 1320, dur: 0.1, type: "square", gain: 0.05, delay: 0.05 });
  },
  jump: () => tone({ freq: 320, to: 760, dur: 0.14, type: "square", gain: 0.05 }),
  slide: () => tone({ freq: 500, to: 160, dur: 0.16, type: "sawtooth", gain: 0.04 }),
  hit: () => {
    tone({ freq: 190, to: 60, dur: 0.35, type: "sawtooth", gain: 0.09 });
    noise(0.3, 0.07);
  },
  bang: () => {
    noise(0.35, 0.14);
    tone({ freq: 160, to: 50, dur: 0.3, type: "square", gain: 0.08 });
  },
  beep: () => tone({ freq: 620, dur: 0.1, type: "square", gain: 0.045 }),
  step: () => tone({ freq: 140 + Math.random() * 60, dur: 0.045, type: "triangle", gain: 0.035 }),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: "square", gain: 0.055, delay: i * 0.09 }),
    );
  },
  fail: () => {
    [400, 320, 240, 150].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: "sawtooth", gain: 0.05, delay: i * 0.1 }),
    );
  },
  turbo: () => tone({ freq: 200, to: 1400, dur: 0.4, type: "sawtooth", gain: 0.05 }),
};
