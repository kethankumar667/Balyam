/**
 * The generative drone under a game of Brain Vita. It is a stack of soft tones in D major pentatonic, one
 * voice per four marbles on the board. As marbles leave, the highest voices fade out first and the deep
 * ones remain, so a nearly-won board is a single low note. Finishing resolves it into a chord. Nothing is
 * downloaded: it is all oscillators, built when the first jump is made and gone when the game is left.
 */

/** Low to high. Fading starts from the top, so the foundation outlasts everything above it. */
export const AMBIENT_VOICES: readonly number[] = [73.42, 110, 146.83, 185, 220, 277.18, 329.63, 369.99];

/** One voice for every this-many marbles. */
const MARBLES_PER_VOICE = 4;
/** Total loudness of the bed: a pad should sit under the clicks, not on top of them. */
const MASTER_LEVEL = 0.6;
const VOICE_LEVEL = 0.018;
/** How quickly a voice fades in or out, as a time constant in seconds. */
const THIN_TIME_CONSTANT = 1.1;
const DETUNE_RATIO = 1.004;
const RESOLVE_FADE_SECONDS = 1.6;
const RESOLVE_TAIL_SECONDS = 3.2;
const CHORD_LEVEL = 0.05;

/** How many of the voices are sounding for a given number of marbles left: all eight early on, one at the end. */
export function ambientVoiceCount(marblesLeft: number): number {
  const wanted = Math.ceil(Math.max(0, marblesLeft) / MARBLES_PER_VOICE);
  return Math.min(AMBIENT_VOICES.length, Math.max(1, wanted));
}

export interface ResolutionChord {
  frequencies: readonly number[];
  type: OscillatorType;
}

/** A bright major chord for one marble left; an open, unfinished-sounding one for anything else. */
export function resolutionChord(isPerfect: boolean): ResolutionChord {
  return isPerfect
    ? { frequencies: [293.66, 369.99, 440, 587.33], type: "triangle" }
    : { frequencies: [220, 293.66, 329.63], type: "sine" };
}

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
}

/** The running drone. One per game; every call is safe whatever the audio graph does. */
export class AmbientEngine {
  private voices: Voice[] = [];
  private master: GainNode | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: AudioContext) {}

  get isRunning(): boolean {
    return this.master !== null;
  }

  /** Builds the drone if it is not already sounding, then sets it for this many marbles. */
  start(marblesLeft: number): void {
    if (this.master) {
      this.update(marblesLeft);
      return;
    }
    try {
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(MASTER_LEVEL, this.ctx.currentTime + 2);
      master.connect(this.ctx.destination);
      this.master = master;
      this.voices = AMBIENT_VOICES.map((frequency) => {
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.connect(master);
        const oscillators = [
          this.makeOscillator("sine", frequency, gain),
          this.makeOscillator("triangle", frequency * DETUNE_RATIO, gain),
        ];
        return { oscillators, gain };
      });
      this.update(marblesLeft);
    } catch {
      this.teardown();
    }
  }

  private makeOscillator(type: OscillatorType, frequency: number, into: GainNode): OscillatorNode {
    const oscillator = this.ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    oscillator.connect(into);
    oscillator.start();
    return oscillator;
  }

  /** Thins or thickens the drone for the marbles now on the board. */
  update(marblesLeft: number): void {
    if (!this.master) return;
    const audible = ambientVoiceCount(marblesLeft);
    const now = this.ctx.currentTime;
    this.voices.forEach((voice, index) => {
      voice.gain.gain.setTargetAtTime(index < audible ? VOICE_LEVEL : 0, now, THIN_TIME_CONSTANT);
    });
  }

  /** Lets the drone fall away and plays the closing chord over it. */
  resolve(isPerfect: boolean): void {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.voices.forEach((voice) => voice.gain.gain.setTargetAtTime(0, now, RESOLVE_FADE_SECONDS / 3));
    const { frequencies, type } = resolutionChord(isPerfect);
    try {
      frequencies.forEach((frequency, index) => {
        const start = now + index * 0.09;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(CHORD_LEVEL, start + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + RESOLVE_TAIL_SECONDS);
        gain.connect(this.master as GainNode);
        const oscillator = this.ctx.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.connect(gain);
        oscillator.start(start);
        oscillator.stop(start + RESOLVE_TAIL_SECONDS + 0.05);
      });
    } catch {
      // The closing chord is garnish; the game never depends on it.
    }
    this.scheduleStop(RESOLVE_TAIL_SECONDS + 0.4);
  }

  /** Fades out and releases everything. */
  stop(): void {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.08);
    } catch {
      // Nothing to cancel is fine.
    }
    this.scheduleStop(0.4);
  }

  private scheduleStop(seconds: number): void {
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => this.teardown(), seconds * 1000);
  }

  private teardown(): void {
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    for (const voice of this.voices) {
      for (const oscillator of voice.oscillators) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch {
          // Already stopped.
        }
      }
      try {
        voice.gain.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    try {
      this.master?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.voices = [];
    this.master = null;
  }
}
