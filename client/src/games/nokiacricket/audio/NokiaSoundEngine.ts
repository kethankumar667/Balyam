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

  /** Bat hit: double punchy beep */
  public playBatHit(): void {
    this.playTone(1800, 20, 0.15);
    setTimeout(() => this.playTone(2200, 30, 0.18), 25);
  }

  /** Dot ball: quiet single blip */
  public playDot(): void {
    this.playTone(700, 35, 0.06);
  }

  /** Single/Double Run: quick double beep */
  public playRun(): void {
    this.playTone(1200, 40, 0.1);
    setTimeout(() => this.playTone(1500, 50, 0.12), 45);
  }

  /** Four Runs: Rising 3-tone arpeggio */
  public playFour(): void {
    this.playTone(988, 60, 0.15);
    setTimeout(() => this.playTone(1318, 60, 0.16), 70);
    setTimeout(() => this.playTone(1975, 100, 0.2), 140);
  }

  /** Six Runs: High victory arpeggio */
  public playSix(): void {
    const tones = [880, 1175, 1397, 1760, 2093];
    tones.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 60, 0.18), idx * 65);
    });
  }

  /** Out / Wicket: Descending harsh buzzer */
  public playWicket(): void {
    this.playTone(240, 120, 0.25);
    setTimeout(() => this.playTone(175, 180, 0.3), 110);
    setTimeout(() => this.playTone(110, 250, 0.35), 260);
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
