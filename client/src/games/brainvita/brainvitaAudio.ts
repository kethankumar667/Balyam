/**
 * Procedural Web Audio cues for Brain Vita: a glassy tick as a marble is picked up, a clack as it lands,
 * a rising phrase for a finished game. Nothing is downloaded. The cues also respect the global
 * AudioManager mute; the switch below is this game's own, separate toggle.
 */
import { AudioManager } from "../../services/AudioManager";
import { AmbientEngine } from "./brainvitaAmbient";

export const BRAINVITA_MUTE_STORAGE_KEY = "bhalyam.brainvita.muted";

class BrainVitaAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private ambient: AmbientEngine | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(BRAINVITA_MUTE_STORAGE_KEY) === "true";
    } catch {
      // Private browsing can refuse storage reads; sound simply starts on.
    }
    // A drone must not keep playing under a tab nobody is looking at.
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx || !this.ambient?.isRunning) return;
        (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => {});
      });
    }
  }

  /** Starts the drone if it is not sounding, and sets it for the marbles now on the board. */
  setAmbient(marblesLeft: number): void {
    const ctx = this.getContext();
    if (!ctx) {
      this.ambient?.stop();
      return;
    }
    if (!this.ambient) this.ambient = new AmbientEngine(ctx);
    this.ambient.start(marblesLeft);
  }

  /** Lets the drone resolve into a closing chord. */
  resolveAmbient(isPerfect: boolean): void {
    this.ambient?.resolve(isPerfect);
  }

  stopAmbient(): void {
    this.ambient?.stop();
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
    if (this.muted) this.stopAmbient();
    try {
      localStorage.setItem(BRAINVITA_MUTE_STORAGE_KEY, String(this.muted));
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
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      // Audio is garnish; a failing node must never reach the game.
    }
  }

  playPick(): void {
    this.tone(880, 0, 0.06, "sine", 0.1);
  }

  playJump(): void {
    this.tone(520, 0, 0.07, "triangle", 0.13);
    this.tone(330, 0.07, 0.1, "triangle", 0.12);
  }

  playRefuse(): void {
    this.tone(180, 0, 0.09, "square", 0.06);
  }

  playWin(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => this.tone(frequency, index * 0.12, 0.3, "triangle", 0.14));
  }

  playStuck(): void {
    this.tone(247, 0, 0.35, "sine", 0.1);
    this.tone(196, 0.2, 0.45, "sine", 0.09);
  }
}

export const brainvitaAudio = new BrainVitaAudioEngine();
