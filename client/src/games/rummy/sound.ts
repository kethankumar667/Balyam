/**
 * Rummy sound effects — Web Audio synths, no asset files.
 * Mirrors the pattern from games/ludo/sound.ts so settings can be shared.
 */
let ctx: AudioContext | null = null;
let enabled = false;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function setRummySoundEnabled(v: boolean): void {
  enabled = v;
  if (v) getCtx();
}

export function isRummySoundEnabled(): boolean {
  return enabled;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.18, delay = 0): void {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + delay / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + durMs / 1000);
}

function noise(durMs: number, gain = 0.06, delay = 0): void {
  const c = getCtx();
  if (!c) return;
  const buf = c.createBuffer(1, Math.max(1, Math.floor((durMs / 1000) * c.sampleRate)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(gain, c.currentTime + delay / 1000);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (delay + durMs) / 1000);
  src.connect(g);
  g.connect(c.destination);
  src.start(c.currentTime + delay / 1000);
  src.stop(c.currentTime + (delay + durMs) / 1000);
}

export const rummySfx = {
  draw(): void {
    // soft swish for picking up a card
    noise(180, 0.05);
    tone(520, 80, "sine", 0.08, 40);
  },
  discard(): void {
    // sharper hit — card slapping the pile
    tone(380, 70, "square", 0.12);
    noise(120, 0.04, 30);
  },
  shuffle(): void {
    // multiple rapid swishes
    for (let i = 0; i < 5; i++) noise(110, 0.045, i * 80);
  },
  deal(): void {
    // small click chain across 13 deals
    for (let i = 0; i < 6; i++) {
      tone(380 + i * 30, 50, "triangle", 0.07, i * 70);
    }
  },
  meldFormed(): void {
    // pleasing two-note chime
    tone(660, 120, "triangle", 0.14);
    tone(990, 160, "triangle", 0.12, 80);
  },
  declare(): void {
    // longer celebratory chord
    tone(523, 240, "triangle", 0.16);
    tone(659, 240, "triangle", 0.16, 0);
    tone(784, 240, "triangle", 0.16, 0);
  },
  win(): void {
    // ascending fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => tone(n, 220, "triangle", 0.18, i * 130));
  },
  drop(): void {
    // descending sigh
    tone(440, 160, "sawtooth", 0.14);
    tone(330, 200, "sawtooth", 0.14, 110);
  },
  invalidDeclare(): void {
    // buzzer
    tone(180, 220, "sawtooth", 0.18);
    tone(140, 260, "sawtooth", 0.18, 180);
  },
  tick(): void {
    // turn timer tick
    tone(880, 30, "square", 0.06);
  },
};
