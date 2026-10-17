import { JUMP_DURATION_MS } from "./brainvitaJump";

/**
 * Marble sounds, built the way the real ones are made. A struck object does not play a note: it rings with
 * a handful of overtones that each die away at their own rate, after a tiny burst of noise from the
 * contact itself. A glass marble leaving its wooden hole, rolling across, clinking against its neighbour
 * and landing with two or three settling bounces is a short list of such strikes, and that is all this
 * module describes. Each call varies pitch and loudness a little, so no two clicks are the same, which is
 * most of what makes a repeated sound feel like a real thing in a real room.
 *
 * The recipes are pure: they take a random source and return strikes. `playStrikes` turns strikes into
 * Web Audio nodes. Nothing is downloaded.
 */

export interface Overtone {
  frequency: number;
  /** Seconds for the overtone to fade to about a twentieth of its start. */
  decay: number;
  /** Relative loudness within the strike. */
  gain: number;
}

export interface Contact {
  /** Centre of the band of noise the contact makes, in Hz. */
  frequency: number;
  q: number;
  decay: number;
  gain: number;
  type?: BiquadFilterType;
  /** When set, the band glides to this frequency over the noise's life, as a rolling marble does. */
  sweepTo?: number;
}

export interface Strike {
  /** Seconds from the start of the sound. */
  at: number;
  /** Overall loudness of the strike. */
  level: number;
  overtones: readonly Overtone[];
  contact: Contact | null;
}

type Random = () => number;

/** A multiplier within `spread` of 1: spread 0.05 gives 0.95 to 1.05. */
const vary = (random: Random, spread: number): number => 1 + (random() * 2 - 1) * spread;

const GLASS = [3100, 5200, 7400] as const;
const GLASS_DECAYS = [0.05, 0.035, 0.025] as const;
const GLASS_GAINS = [0.5, 0.3, 0.2] as const;

const glass = (random: Random, pitch = 1): Overtone[] => {
  const shift = pitch * vary(random, 0.05);
  return GLASS.map((frequency, i) => ({ frequency: frequency * shift, decay: GLASS_DECAYS[i], gain: GLASS_GAINS[i] }));
};

/** A glass marble coming out of its hole: a bright tick, and a little wooden tap from the hole letting go. */
export function pickSound(random: Random = Math.random): Strike[] {
  const level = 0.55 * vary(random, 0.15);
  return [
    { at: 0, level, overtones: glass(random), contact: { frequency: 6000, q: 1.2, decay: 0.012, gain: 0.5 } },
    { at: 0.018, level: level * 0.4, overtones: [{ frequency: 480 * vary(random, 0.06), decay: 0.035, gain: 0.5 }], contact: null },
  ];
}

/** When the marble is over its neighbour, and when it lands, in seconds from the tap. Tied to the animation's own length. */
export const CAPTURE_AT = 0.12;
export const LANDING_AT = (JUMP_DURATION_MS / 1000) * 0.9;
/** The little hops a marble makes settling into a hole: when after landing, how loud, how much higher it rings. */
const BOUNCES = [
  { after: 0.05, level: 0.45, pitch: 1.03 },
  { after: 0.095, level: 0.22, pitch: 1.06 },
  { after: 0.13, level: 0.1, pitch: 1.1 },
] as const;

/** One wooden hole with a glass marble landing in it: wood's low body, glass's ring on top, and a hard click. */
function landing(random: Random, at: number, level: number, pitch: number): Strike {
  const wood = [420, 980, 1650].map((frequency, i) => ({ frequency: frequency * pitch * vary(random, 0.04), decay: [0.09, 0.06, 0.04][i], gain: [0.6, 0.35, 0.2][i] }));
  return {
    at,
    level,
    overtones: [...wood, { frequency: 3400 * pitch * vary(random, 0.04), decay: 0.03, gain: 0.25 }],
    contact: { frequency: 2800 * pitch, q: 0.8, decay: 0.015, gain: 0.7 },
  };
}

/**
 * A whole jump: the soft roll as the marble leaves, the clink as it knocks the one it jumps (which is then
 * taken away), and the landing with its settling bounces, timed to the flight on screen.
 */
export function jumpSound(random: Random = Math.random): Strike[] {
  const roll: Strike = { at: 0, level: 0.14, overtones: [], contact: { frequency: 900, q: 0.6, decay: 0.2, gain: 1, sweepTo: 2200, type: "bandpass" } };
  const clink: Strike = {
    at: CAPTURE_AT * vary(random, 0.1),
    level: 0.4 * vary(random, 0.15),
    overtones: [2600, 4300, 6100, 8300].map((frequency, i) => ({ frequency: frequency * vary(random, 0.04), decay: [0.18, 0.12, 0.08, 0.05][i], gain: [0.5, 0.35, 0.25, 0.15][i] })),
    contact: { frequency: 7000, q: 1, decay: 0.01, gain: 0.5 },
  };
  const land = LANDING_AT * vary(random, 0.05);
  const level = 0.5 * vary(random, 0.12);
  return [
    roll,
    clink,
    landing(random, land, level, 1),
    ...BOUNCES.map((bounce) => landing(random, land + bounce.after * vary(random, 0.1), level * bounce.level, bounce.pitch)),
  ];
}

/** Tapping a hole that cannot be used: a dull wooden knock with no glass in it. */
export function refuseSound(random: Random = Math.random): Strike[] {
  return [
    {
      at: 0,
      level: 0.4 * vary(random, 0.12),
      overtones: [
        { frequency: 260 * vary(random, 0.05), decay: 0.06, gain: 0.7 },
        { frequency: 610 * vary(random, 0.05), decay: 0.04, gain: 0.3 },
      ],
      contact: { frequency: 1200, q: 0.7, decay: 0.02, gain: 0.5, type: "lowpass" },
    },
  ];
}

/** Notes of a wooden xylophone, then a shimmer of glass: for a game finished on one marble. */
export function winSound(random: Random = Math.random): Strike[] {
  const bar = (frequency: number, at: number): Strike => ({
    at,
    level: 0.32 * vary(random, 0.08),
    overtones: [1, 4, 9.9].map((ratio, i) => ({ frequency: frequency * ratio * vary(random, 0.003), decay: [0.9, 0.18, 0.06][i], gain: [1, 0.28, 0.08][i] })),
    contact: { frequency: 3000, q: 1, decay: 0.008, gain: 0.35 },
  });
  const notes = [523.25, 659.25, 783.99, 1046.5].map((frequency, i) => bar(frequency, i * 0.14));
  const shimmer: Strike = {
    at: 0.58,
    level: 0.18,
    overtones: [2093, 3136, 4186].map((frequency, i) => ({ frequency: frequency * vary(random, 0.003), decay: [0.8, 0.6, 0.45][i], gain: [0.3, 0.22, 0.15][i] })),
    contact: null,
  };
  return [...notes, shimmer];
}

/** Two low wooden knocks: for a game that ran out of moves. */
export function stuckSound(random: Random = Math.random): Strike[] {
  const knock = (at: number, pitch: number): Strike => ({
    at,
    level: 0.4 * vary(random, 0.1),
    overtones: [180, 420, 720].map((frequency, i) => ({ frequency: frequency * pitch * vary(random, 0.03), decay: [0.2, 0.1, 0.06][i], gain: [0.7, 0.3, 0.15][i] })),
    contact: { frequency: 900, q: 0.7, decay: 0.02, gain: 0.5, type: "lowpass" },
  });
  return [knock(0, 1), knock(0.24, 0.9)];
}

const noiseBuffers = new WeakMap<object, AudioBuffer>();

/** One second of white noise, made once per audio context and reused by every contact. */
function noiseFor(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

/** The time a strike's sound is still audible, for deciding when to stop its nodes. */
export const strikeLength = (strike: Strike): number =>
  Math.max(0.02, ...strike.overtones.map((o) => o.decay), strike.contact ? strike.contact.decay : 0) * 1.4;

/** Builds the nodes for every strike and starts them. Throws if the audio graph does; callers decide what that means. */
export function playStrikes(ctx: AudioContext, strikes: readonly Strike[], volume = 1): void {
  const now = ctx.currentTime;
  for (const strike of strikes) {
    const when = now + strike.at;
    const length = strikeLength(strike);
    const out = ctx.createGain();
    out.gain.setValueAtTime(strike.level * volume, when);
    out.connect(ctx.destination);

    for (const overtone of strike.overtones) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(overtone.gain, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + overtone.decay * 3);
      gain.connect(out);
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(overtone.frequency, when);
      oscillator.connect(gain);
      oscillator.start(when);
      oscillator.stop(when + overtone.decay * 3 + 0.02);
    }

    if (strike.contact) {
      const { frequency, q, decay, gain: level, type = "bandpass", sweepTo } = strike.contact;
      const source = ctx.createBufferSource();
      source.buffer = noiseFor(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(frequency, when);
      if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, when + decay * 2);
      filter.Q.setValueAtTime(q, when);
      const burst = ctx.createGain();
      burst.gain.setValueAtTime(level, when);
      burst.gain.exponentialRampToValueAtTime(0.0001, when + decay * 3);
      source.connect(filter);
      filter.connect(burst);
      burst.connect(out);
      source.start(when);
      source.stop(when + Math.max(decay * 3, length) + 0.02);
    }
  }
}
