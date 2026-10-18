import type { WorldId } from "@shared/worlds";
import { VOICES, type Voice } from "../../games/brainvita/brainvitaFoley";
import type { VoiceId } from "../../games/brainvita/brainvitaSkinKit";

/**
 * What a table's world SOUNDS like. Ludo and Rummy make their cues from plain oscillators, so a world does not add
 * sounds: it changes what every cue is made of, with the same voices Brain Vita's worlds use (a stone is lower and
 * drier than glass on wood, a bubble rises as it speaks, a toy boings, a brass bell goes on ringing). The classic table
 * has no voice and keeps the cues exactly as they were. This is the pure part: given a voice and a tone, it says which
 * tones to play. The two games' sound files own the audio context and play what this returns.
 */

/** Which of Brain Vita's voices each world speaks in. The classic table has none. */
export const WORLD_VOICE: Readonly<Record<WorldId, VoiceId | null>> = {
  classic: null,
  neon: "synth",
  toy: "toy",
  zen: "stone",
  reef: "water",
  palace: "bell",
};

export const voiceOfWorld = (world: WorldId): Voice | null => {
  const id = WORLD_VOICE[world];
  return id ? VOICES[id] : null;
};

/** One oscillator to play: how long it lasts, what it is made of, and how loud. */
export interface ToneShape {
  frequency: number;
  durMs: number;
  type: OscillatorType;
  gain: number;
  /** The pitch it glides to over its life, or absent for a steady one. */
  glideTo?: number;
}

/** No tone rings longer than this, however long a voice would like it to. */
const MAX_TONE_MS = 700;
/** Struck metal's partials sit at this multiple of the fundamental, not at the whole numbers a string has. */
const BELL_PARTIAL = { ratio: 2.76, decay: 0.6, gain: 0.45 } as const;
/** Only low tones are given a partial; a high tick already sits above where it would be. */
const BELL_PARTIAL_CEILING_HZ = 1700;

/** The tones to play for one cue tone in a voice. With no voice it is that one tone, unchanged. */
export function voicedTone(voice: Voice | null, frequency: number, durMs: number, type: OscillatorType, gain: number): ToneShape[] {
  if (!voice) return [{ frequency, durMs, type, gain }];
  const pitched = frequency * voice.pitch;
  const length = Math.min(MAX_TONE_MS, durMs * voice.decay);
  const main: ToneShape = { frequency: pitched, durMs: length, type: voice.wave, gain, ...(voice.glide ? { glideTo: pitched * voice.glide } : {}) };
  if (!voice.hasBellPartials || frequency > BELL_PARTIAL_CEILING_HZ) return [main];
  return [main, { frequency: pitched * BELL_PARTIAL.ratio, durMs: length * BELL_PARTIAL.decay, type: voice.wave, gain: gain * BELL_PARTIAL.gain }];
}

/** How loud the noise of contact is in a voice: a stone clacks, a pane barely touches. */
export const voicedNoiseGain = (voice: Voice | null, gain: number): number => (voice ? gain * voice.noise : gain);
