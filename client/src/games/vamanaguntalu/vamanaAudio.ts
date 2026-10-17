/**
 * Procedural Web Audio cues for Vamana Guntalu: a soft wooden tick as seeds drop, a bright chime on a
 * capture, and short fanfare / drone phrases for the result. Nothing is downloaded.
 *
 * The cues also respect the global AudioManager mute, so a player who silenced the app keeps hearing
 * nothing here; the per-game switch below is this game's own, separate toggle.
 */
import { AudioManager } from "../../services/AudioManager";

export const VAMANA_MUTE_STORAGE_KEY = "bhalyam.vamanaguntalu.muted";

class VamanaAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(VAMANA_MUTE_STORAGE_KEY) === "true";
    } catch {
      // Private browsing can refuse storage reads; sound simply starts on.
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || AudioManager.getInstance().getSettings().isMuted) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(VAMANA_MUTE_STORAGE_KEY, String(this.muted));
    } catch {
      // Not being able to remember the choice must never break playing.
    }
    return this.muted;
  }

  private tone(frequency: number, startOffset: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      // Audio is garnish; a failing node must never reach the game.
    }
  }

  /** A seed dropped into a pit. `pitch` nudges it so a run of seeds is not one flat tone. */
  playSeed(pitch = 0): void {
    this.tone(260 + (pitch % 7) * 22, 0, 0.07, "triangle", 0.12);
  }

  playCapture(): void {
    this.tone(660, 0, 0.18, "sine", 0.16);
    this.tone(880, 0.09, 0.26, "sine", 0.14);
  }

  playVictory(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => this.tone(frequency, index * 0.13, 0.32, "triangle", 0.15));
  }

  playDefeat(): void {
    this.tone(196, 0, 0.5, "sine", 0.12);
    this.tone(147, 0.22, 0.6, "sine", 0.1);
  }
}

export const vamanaAudio = new VamanaAudioEngine();
