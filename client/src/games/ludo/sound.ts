/**
 * Lightweight Web Audio sound effects — no asset files, just synthesised tones.
 * The first user interaction unlocks the AudioContext per browser policy.
 */
let ctx: AudioContext | null = null;
let enabled = false;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  if (v) getCtx(); // initialise on enable
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.18): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durMs / 1000);
}

export const sfx = {
  diceRoll(): void {
    // brief tumble — descending click chain
    for (let i = 0; i < 4; i++) {
      setTimeout(() => tone(420 + Math.random() * 240, 60, "square", 0.08), i * 90);
    }
  },
  tokenMove(): void {
    tone(620, 90, "triangle", 0.12);
  },
  capture(): void {
    // dramatic two-note: high then low
    tone(880, 110, "sawtooth", 0.16);
    setTimeout(() => tone(330, 240, "sawtooth", 0.2), 90);
  },
  home(): void {
    // ascending ding
    tone(660, 100, "triangle", 0.16);
    setTimeout(() => tone(880, 140, "triangle", 0.16), 90);
  },
  win(): void {
    // mini fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => tone(n, 220, "triangle", 0.18), i * 130));
  },
};
