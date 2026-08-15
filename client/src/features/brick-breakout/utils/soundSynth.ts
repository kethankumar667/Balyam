import type { SoundSpec } from "../constants/audioFrequencies";

/**
 * Web Audio API synthesizer for retro chiptune SFX.
 */
class SoundSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public playTone(spec: SoundSpec) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const stepDuration = spec.durationSec / spec.freqs.length;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = spec.type;
      gain.gain.setValueAtTime(spec.gain, now);

      spec.freqs.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * stepDuration);
      });

      // Exponential decay to avoid audio clicks
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + spec.durationSec);
    } catch {
      // Audio playback fails gracefully if audio context is blocked
    }
  }
}

export const soundSynth = new SoundSynth();
