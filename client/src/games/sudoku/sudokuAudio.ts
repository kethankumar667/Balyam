/**
 * Procedural Audio Synthesizer for Sudoku
 * Zero external audio downloads. Generates real-time procedural audio:
 * 1. Marimba (Daily Chronicle): Warm acoustic wooden percussion & realistic pencil scratches.
 * 2. Cyber (Cyber-Matrix): Crystal sine waves, sub-bass resonances & laser sweeps.
 * 3. Arcade (Retro Arcade 1984): Authentic 8-bit square-wave chiptunes & coin pickups.
 */

import { type SudokuSoundProfile } from "./sudokuThemes";

class SudokuAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private currentProfile: SudokuSoundProfile = "marimba";

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public setSoundProfile(profile: SudokuSoundProfile): void {
    this.currentProfile = profile;
  }

  /**
   * Ascending Harmonic Scale for digits 1-9
   */
  public playDigitChime(digit: number): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const frequencies: Record<number, number> = {
      1: 261.63, // C4
      2: 293.66, // D4
      3: 329.63, // E4
      4: 392.0,  // G4
      5: 440.0,  // A4
      6: 523.25, // C5
      7: 587.33, // D5
      8: 659.25, // E5
      9: 783.99, // G5
    };

    const freq = frequencies[digit] || 440;
    const now = ctx.currentTime;

    if (this.currentProfile === "arcade") {
      // 8-Bit Chiptune Square Wave with brief vibrato
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq * 1.25, now);
      osc.frequency.setValueAtTime(freq, now + 0.02);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
      return;
    }

    if (this.currentProfile === "marimba") {
      // Wooden Marimba Mallet (Triangle fundamental + soft woody click)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      // Higher woody harmonic
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();

      oscHarmonic.type = "sine";
      oscHarmonic.frequency.setValueAtTime(freq * 3, now);

      gainHarmonic.gain.setValueAtTime(0.06, now);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      oscHarmonic.connect(gainHarmonic);
      gain.connect(ctx.destination);
      gainHarmonic.connect(ctx.destination);

      osc.start(now);
      oscHarmonic.start(now);
      osc.stop(now + 0.3);
      oscHarmonic.stop(now + 0.3);
      return;
    }

    // Default: Cyber Quantum Crystal Chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2, now);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  /**
   * Note candidate toggle tick / scratch
   */
  public playPencilTick(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (this.currentProfile === "arcade") {
      // 8-bit mini coin blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.04); // E6

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (this.currentProfile === "marimba") {
      // Soft graphite pencil scratch on paper (procedural bandpass noise)
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
      return;
    }

    // Default Cyber: Laser optical blip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Row / Column / 3x3 Sector Completion Circuit Sweep Chord
   */
  public playCircuitSweep(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (this.currentProfile === "arcade") {
      // 8-bit Power-Up Arpeggio
      const notes = [329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]; // E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.035;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.08, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.13);
      });
      return;
    }

    if (this.currentProfile === "marimba") {
      // Gentle wooden marimba chord chime
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.05;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.14, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.46);
      });
      return;
    }

    // Default Cyber: Laser sweep chord
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.04;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.36);
    });
  }

  /**
   * Cell erase swoosh sound
   */
  public playErase(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = this.currentProfile === "arcade" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Error mistake sound
   */
  public playGlitchError(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (this.currentProfile === "marimba") {
      // Dull wooden thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (this.currentProfile === "arcade") {
      // 8-bit crash crunch buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    // Default Cyber: Static glitch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playMistakeGlitch(): void {
    this.playGlitchError();
  }

  /**
   * Victory fanfare
   */
  public playVictoryFanfare(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (this.currentProfile === "arcade") {
      // 8-Bit "STAGE CLEAR" Fanfare
      const melody = [
        { f: 523.25, d: 0.12 }, // C5
        { f: 659.25, d: 0.12 }, // E5
        { f: 783.99, d: 0.12 }, // G5
        { f: 1046.5, d: 0.28 }, // C6
        { f: 880.0, d: 0.14 },  // A5
        { f: 1046.5, d: 0.45 }, // C6
      ];

      let elapsed = 0;
      melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + elapsed;

        osc.type = "square";
        osc.frequency.setValueAtTime(note.f, noteStart);

        gain.gain.setValueAtTime(0.1, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + note.d + 0.02);

        elapsed += note.d;
      });
      return;
    }

    // Default/Chronicle: Choral harmony progression
    const chords = [
      [392.0, 523.25, 659.25],
      [440.0, 587.33, 698.46],
      [523.25, 659.25, 783.99, 1046.5],
    ];

    chords.forEach((chord, chordIdx) => {
      const chordStart = now + chordIdx * 0.18;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = this.currentProfile === "marimba" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, chordStart);

        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.08, chordStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(chordStart);
        osc.stop(chordStart + 0.7);
      });
    });
  }

  public playVictory(): void {
    this.playVictoryFanfare();
  }
}

export const sudokuAudio = new SudokuAudioSynthesizer();
