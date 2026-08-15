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
      // Autoplay fallback
    }
  }

  public playLaneSwitch(): void {
    this.playTone(680, "square", 16, 0.05);
  }

  public playBoost(): void {
    this.playTone(220, "triangle", 30, 0.06);
  }

  public playCarDodged(): void {
    this.playTone(1350, "square", 22, 0.07);
  }

  public playLevelUp(): void {
    this.playTone(800, "square", 25, 0.08);
    setTimeout(() => this.playTone(1100, "square", 30, 0.08), 30);
    setTimeout(() => this.playTone(1500, "square", 60, 0.10), 65);
  }

  public playCrash(): void {
    this.playTone(280, "sawtooth", 140, 0.14);
    setTimeout(() => this.playTone(110, "square", 260, 0.16), 110);
  }

  public playMenuBeep(): void {
    this.playTone(950, "square", 15, 0.04);
  }

  public playKeyTick(): void {
    this.playTone(550, "triangle", 10, 0.03);
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }
}
