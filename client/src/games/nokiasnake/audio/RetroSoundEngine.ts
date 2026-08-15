export class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private initCtx(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    durationMs: number,
    gainVal: number = 0.08
  ): void {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + durationMs / 1000
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playTurn(): void {
    this.playTone(850, "square", 18, 0.04);
  }

  public playEat(): void {
    this.playTone(1200, "square", 30, 0.06);
    setTimeout(() => this.playTone(1800, "square", 50, 0.08), 35);
  }

  public playBonusEat(): void {
    this.playTone(1000, "square", 25, 0.08);
    setTimeout(() => this.playTone(1400, "square", 30, 0.08), 30);
    setTimeout(() => this.playTone(1900, "square", 60, 0.10), 65);
  }

  public playCrash(): void {
    this.playTone(320, "sawtooth", 120, 0.12);
    setTimeout(() => this.playTone(140, "square", 300, 0.15), 100);
  }

  public playMenuBeep(): void {
    this.playTone(950, "square", 15, 0.04);
  }

  public playKeyTick(): void {
    this.playTone(600, "triangle", 10, 0.03);
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }
}
