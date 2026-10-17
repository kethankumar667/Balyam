/**
 * The sounds of Brain Vita. The effects are modelled on what a glass marble in a wooden board really does
 * (see `brainvitaFoley.ts`), with a little variation on every play; the drone underneath is generative
 * (see `brainvitaAmbient.ts`). Nothing is downloaded. The effects also respect the global AudioManager
 * mute; the switch below is this game's own, separate toggle.
 */
import { AudioManager } from "../../services/AudioManager";
import { AmbientEngine, type AmbientFlavour } from "./brainvitaAmbient";
import { VOICES, applyVoice, jumpSound, pickSound, playStrikes, refuseSound, stuckSound, winSound, type Strike } from "./brainvitaFoley";
import type { VoiceId } from "./brainvitaSkinKit";

export const BRAINVITA_MUTE_STORAGE_KEY = "bhalyam.brainvita.muted";

/** How each voice colours the drone under it. */
const AMBIENT_FLAVOURS: Readonly<Record<VoiceId, AmbientFlavour>> = {
  wood: { scale: 1, wave: "triangle" },
  synth: { scale: 1.5, wave: "triangle" },
  stone: { scale: 0.75, wave: "sine" },
  water: { scale: 0.9, wave: "sine" },
  toy: { scale: 1.5, wave: "triangle" },
  bell: { scale: 1.25, wave: "sine" },
};

class BrainVitaAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private ambient: AmbientEngine | null = null;
  private voice: VoiceId = "wood";

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

  /** Chooses what the sounds are made of (see `VOICES`). Changing it lets the drone go, so it returns in the new voice. */
  setVoice(voice: VoiceId): void {
    if (voice === this.voice) return;
    this.voice = voice;
    this.ambient?.stop();
    this.ambient = null;
  }

  /** Starts the drone if it is not sounding, and sets it for the marbles now on the board. */
  setAmbient(marblesLeft: number): void {
    const ctx = this.getContext();
    if (!ctx) {
      this.ambient?.stop();
      return;
    }
    if (!this.ambient) this.ambient = new AmbientEngine(ctx, AMBIENT_FLAVOURS[this.voice]);
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

  /** Plays a set of strikes, if sound is on. Audio is garnish: a failing node must never reach the game. */
  private play(strikes: readonly Strike[]): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      playStrikes(ctx, applyVoice(strikes, VOICES[this.voice]));
    } catch {
      // See above.
    }
  }

  /** A glass marble lifted out of its hole. */
  playPick(): void {
    this.play(pickSound());
  }

  /** A whole jump: the roll, the clink on the marble jumped, and the landing with its settling bounces. */
  playJump(): void {
    this.play(jumpSound());
  }

  /** A dull wooden knock for a tap that does nothing. */
  playRefuse(): void {
    this.play(refuseSound());
  }

  playWin(): void {
    this.play(winSound());
  }

  playStuck(): void {
    this.play(stuckSound());
  }
}

export const brainvitaAudio = new BrainVitaAudioEngine();
