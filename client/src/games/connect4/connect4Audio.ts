/**
 * Procedural Web Audio Synthesizer for Connect 4.
 * Generates dynamic futuristic sci-fi laser pulses, disc drop clacks,
 * and victory fanfares without external audio network dependencies.
 *
 * getContext() also gates on the global AudioManager mute, mirroring the
 * pattern in games/rummy/sound.ts and games/ludo/sound.ts, so a player who
 * muted sound everywhere doesn't keep hearing Connect 4 cues even though
 * the per-Connect4 `muted` toggle (setMuted/toggleMute) is local, separate
 * UI state for this game's own sound switch.
 */
import { AudioManager } from "../../services/AudioManager";

class Connect4AudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      const savedMute = localStorage.getItem("bhalyam.connect4.muted");
      if (savedMute !== null) {
        this.muted = savedMute === "true";
      }
    } catch {
      // Ignore localStorage read errors in private browsing
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || AudioManager.getInstance().getSettings().isMuted) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem("bhalyam.connect4.muted", String(muted));
    } catch {
      // Ignore localStorage write errors
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Column Hover Tick:
   * Micro-interaction tick tailored to the current atmospheric venue.
   */
  playHoverTick(soundProfile: "wood" | "cyber" | "gold" = "wood"): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundProfile === "cyber") {
      // Crisp digital micro-click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } else if (soundProfile === "gold") {
      // Delicate metallic coin chime tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.035);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Warm acoustic wooden peg tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.03);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }
  }

  /**
   * Disc Drop Sound:
   * Atmospheric audio synthesis matching the active world:
   * - 'wood': Organic teakwood acoustic strike with resonant timber micro-bounce.
   * - 'cyber': Futuristic FM synth laser chirp with electro pulse resonance.
   * - 'gold': Heavy metallic casino chip clink with dual harmonic bell shimmer.
   */
  playDiscDrop(row = 5, soundProfile: "wood" | "cyber" | "gold" = "wood"): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedRow = Math.max(0, Math.min(5, row));

    if (soundProfile === "cyber") {
      // Cyber Synth Laser Pulse Drop
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      const startFreq = 880 - clampedRow * 70;
      const endFreq = 220 - clampedRow * 15;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      filter.type = "lowpass";
      filter.Q.setValueAtTime(6, now);
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.12);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);

      // Sub-pulse kick for cyber impact
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(140 - clampedRow * 10, now);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
      subGain.gain.setValueAtTime(0.28, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.1);
    } else if (soundProfile === "gold") {
      // Heavy Mirrored Gold Casino Coin Clink (Dual Inharmonic Chimes + Solid Thud)
      const baseFreq1 = 1260;
      const baseFreq2 = 2320;

      // Bell 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(baseFreq1, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq1 * 0.96, now + 0.22);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.23);

      // Bell 2 (High shimmer)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq2, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq2 * 0.95, now + 0.18);
      gain2.gain.setValueAtTime(0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.19);

      // Weighted coin landing mass thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = "triangle";
      const thudStart = 320 - clampedRow * 25;
      thudOsc.frequency.setValueAtTime(thudStart, now);
      thudOsc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      thudGain.gain.setValueAtTime(0.32, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.12);

      // Secondary metal settle rattle for deeper drops
      if (clampedRow >= 2) {
        const rattleDelay = 0.08;
        const rOsc = ctx.createOscillator();
        const rGain = ctx.createGain();
        rOsc.type = "sine";
        rOsc.frequency.setValueAtTime(1950, now + rattleDelay);
        rGain.gain.setValueAtTime(0.09, now + rattleDelay);
        rGain.gain.exponentialRampToValueAtTime(0.001, now + rattleDelay + 0.07);
        rOsc.connect(rGain);
        rGain.connect(ctx.destination);
        rOsc.start(now + rattleDelay);
        rOsc.stop(now + rattleDelay + 0.08);
      }
    } else {
      // Acoustic Burma Teakwood Impact (Low-pass filtered triangle + woody bounce)
      const startFreq = 420 - clampedRow * 40;
      const endFreq = 160 - clampedRow * 15;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(startFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);

      gain1.gain.setValueAtTime(0.36, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);

      // Secondary Settle Micro-Bounce for deeper drops (rows 2-5)
      if (clampedRow >= 2) {
        const bounceDelay = 0.07 + (5 - clampedRow) * 0.01;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(endFreq * 1.3, now + bounceDelay);
        osc2.frequency.exponentialRampToValueAtTime(endFreq * 0.85, now + bounceDelay + 0.06);

        gain2.gain.setValueAtTime(0.14, now + bounceDelay);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + bounceDelay + 0.06);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + bounceDelay);
        osc2.stop(now + bounceDelay + 0.07);
      }
    }
  }

  /**
   * Victory Fanfare:
   * Atmospheric celebration matching the venue.
   */
  playVictoryFanfare(soundProfile: "wood" | "cyber" | "gold" = "wood"): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundProfile === "cyber") {
      // Cyber Arpeggio Surge
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.16, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } else if (soundProfile === "gold") {
      // Monaco Royal Gold Chime Flourish
      const chords = [
        [587.33, 880, 1174.66],
        [659.25, 987.77, 1318.51],
        [880, 1318.51, 1760],
      ];
      chords.forEach((chord, step) => {
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + step * 0.12);
          gain.gain.setValueAtTime(0.14, now + step * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.12 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + step * 0.12);
          osc.stop(now + step * 0.12 + 0.46);
        });
      });
    } else {
      // Victorian Member's Club Acoustic Cadence
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.22, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    }
  }

  /**
   * Defeat Drone:
   * Low descending chord.
   */
  playDefeatDrone(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.46);
  }
}

export const connect4Audio = new Connect4AudioEngine();
