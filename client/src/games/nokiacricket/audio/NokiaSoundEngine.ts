/**
 * NokiaSoundEngine
 * Faithful recreation of the 1-bit square-wave buzzer sound chip on Nokia 1100/3310.
 * Pure Web Audio API oscillators, zero audio asset downloads needed.
 */
export class NokiaSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playTone(freq: number, durationMs: number, gain = 0.12): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + durationMs / 1000);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // AudioContext failure fallback
    }
  }

  /** Button press: crisp micro tick */
  public playKeyTick(): void {
    this.playTone(2800, 10, 0.04);
  }

  /** Bat hit: punchy wood-crack double beep */
  public playBatHit(): void {
    this.playTone(1800, 18, 0.16);
    setTimeout(() => this.playTone(2400, 24, 0.2), 20);
  }

  /** Dot ball: quiet single low blip */
  public playDot(): void {
    this.playTone(650, 40, 0.06);
  }

  /** Dynamic Single / Double / Triple Runs */
  public playRun(runs: number = 1): void {
    if (runs === 1) {
      // Single run: pleasant double-blip
      this.playTone(1175, 35, 0.1);
      setTimeout(() => this.playTone(1397, 45, 0.12), 45);
    } else if (runs === 2) {
      // 2 runs: energetic ascending pair
      this.playTone(1046, 35, 0.11);
      setTimeout(() => this.playTone(1318, 40, 0.13), 45);
      setTimeout(() => this.playTone(1568, 55, 0.15), 95);
    } else {
      // 3 runs: rapid 3-step hustle
      this.playTone(988, 30, 0.12);
      setTimeout(() => this.playTone(1200, 35, 0.13), 40);
      setTimeout(() => this.playTone(1480, 40, 0.14), 80);
      setTimeout(() => this.playTone(1760, 60, 0.16), 125);
    }
  }

  /** Four Runs: Distinct rising 4-step boundary arpeggio */
  public playFour(): void {
    const tones = [
      { f: 880, d: 50 },
      { f: 1108.73, d: 55 },
      { f: 1318.51, d: 65 },
      { f: 1760, d: 120 },
    ];
    let offset = 0;
    tones.forEach((t) => {
      setTimeout(() => this.playTone(t.f, t.d, 0.18), offset);
      offset += t.d + 15;
    });
  }

  /** Six Runs: Triumphant multi-octave maximum fanfare */
  public playSix(): void {
    const fanfare = [
      { f: 987.77, d: 45 },  // B5
      { f: 1234.71, d: 45 }, // D#6
      { f: 1479.98, d: 50 }, // F#6
      { f: 1975.53, d: 65 }, // B6
      { f: 2469.42, d: 130 },// D#7
    ];
    let offset = 0;
    fanfare.forEach((note) => {
      setTimeout(() => this.playTone(note.f, note.d, 0.22), offset);
      offset += note.d + 18;
    });
  }

  /** Out / Wicket with distinct variations */
  public playWicket(type: "BOWLED" | "CAUGHT" | "LBW" = "BOWLED"): void {
    if (type === "BOWLED") {
      // Bowled: timber crash harsh rattle
      this.playTone(320, 40, 0.28);
      setTimeout(() => this.playTone(220, 60, 0.3), 35);
      setTimeout(() => this.playTone(160, 90, 0.32), 90);
      setTimeout(() => this.playTone(110, 180, 0.35), 170);
    } else if (type === "CAUGHT") {
      // Caught: sharp high pop + umpire out buzzer
      this.playTone(1800, 30, 0.2);
      setTimeout(() => this.playTone(280, 100, 0.25), 40);
      setTimeout(() => this.playTone(190, 160, 0.3), 135);
    } else {
      // LBW: heavy low thud
      this.playTone(196, 70, 0.25);
      setTimeout(() => this.playTone(146, 120, 0.3), 65);
      setTimeout(() => this.playTone(98, 200, 0.35), 180);
    }
  }

  /** Match Won / Target Chased: Euphoric Retro Victory Anthem */
  public playMatchWon(): void {
    const melody = [
      { f: 1046.5, d: 80 },  // C6
      { f: 1318.51, d: 80 }, // E6
      { f: 1567.98, d: 80 }, // G6
      { f: 2093.0, d: 140 }, // C7
      { f: 1567.98, d: 60 }, // G6
      { f: 2093.0, d: 240 }, // C7 (hold)
    ];
    let offset = 0;
    melody.forEach((note) => {
      setTimeout(() => this.playTone(note.f, note.d, 0.22), offset);
      offset += note.d + 30;
    });
  }

  /** Match Lost / Target Missed: Melancholic Descending Defeat Sequence */
  public playMatchLost(): void {
    const sadTone = [
      { f: 587.33, d: 120 }, // D5
      { f: 523.25, d: 140 }, // C5
      { f: 466.16, d: 160 }, // Bb4
      { f: 369.99, d: 280 }, // F#4
    ];
    let offset = 0;
    sadTone.forEach((note) => {
      setTimeout(() => this.playTone(note.f, note.d, 0.2), offset);
      offset += note.d + 35;
    });
  }

  /** New High Score Record: Sparkling Celebration Jingle */
  public playHighScoreRecord(): void {
    const recordTune = [
      { f: 1318.51, d: 60 }, // E6
      { f: 1567.98, d: 60 }, // G6
      { f: 1760.0, d: 70 },  // A6
      { f: 2093.0, d: 80 },  // C7
      { f: 2637.02, d: 160 },// E7
      { f: 2093.0, d: 80 },  // C7
      { f: 2637.02, d: 240 },// E7 (crescendo)
    ];
    let offset = 0;
    recordTune.forEach((note) => {
      setTimeout(() => this.playTone(note.f, note.d, 0.22), offset);
      offset += note.d + 25;
    });
  }

  /** Boot / Nokia Ringtone snippet */
  public playNokiaBoot(): void {
    const tune = [
      { f: 1318.51, d: 100 }, // E6
      { f: 1174.66, d: 100 }, // D6
      { f: 739.99, d: 150 },  // F#5
      { f: 830.61, d: 150 },  // G#5
      { f: 1108.73, d: 100 }, // C#6
      { f: 987.77, d: 100 },  // B5
      { f: 587.33, d: 150 },  // D5
      { f: 659.25, d: 150 },  // E5
    ];
    let offset = 0;
    tune.forEach((note) => {
      setTimeout(() => this.playTone(note.f, note.d, 0.15), offset);
      offset += note.d + 30;
    });
  }
}
