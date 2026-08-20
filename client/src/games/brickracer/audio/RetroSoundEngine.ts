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
    gainVal: number = 0.08,
    endFreq?: number
  ): void {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          endFreq,
          this.ctx.currentTime + durationMs / 1000
        );
      }

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

  /** Vintage engine motor rhythm tick while driving */
  public playEngineTick(isBoosting: boolean): void {
    if (isBoosting) {
      this.playTone(220, "square", 16, 0.035, 260);
    } else {
      this.playTone(115, "triangle", 12, 0.025);
    }
  }

  /** Quick snappy lane switch audio chirp */
  public playLaneSwitch(): void {
    this.playTone(587, "square", 22, 0.06, 880);
  }

  /** High-energy turbo boost ignition */
  public playBoost(): void {
    this.playTone(180, "sawtooth", 45, 0.08, 380);
    setTimeout(() => this.playTone(320, "square", 50, 0.09, 520), 30);
  }

  /** 90s score blip when successfully overtaking an enemy car */
  public playCarDodged(): void {
    this.playTone(1568, "square", 20, 0.07);
    setTimeout(() => this.playTone(2093, "square", 30, 0.09), 20);
  }

  /** Countdown pip (3, 2, 1, GO!) */
  public playCountdownBeep(final: boolean = false): void {
    if (final) {
      this.playTone(1760, "square", 90, 0.12);
      setTimeout(() => this.playTone(2093, "square", 140, 0.14), 70);
    } else {
      this.playTone(880, "square", 45, 0.08);
    }
  }

  /** Vintage handheld game start melody */
  public playGameStartFanfare(): void {
    const notes = [
      { f: 523.25, d: 50 }, // C5
      { f: 659.25, d: 50 }, // E5
      { f: 783.99, d: 60 }, // G5
      { f: 1046.5, d: 120 },// C6
    ];
    let offset = 0;
    notes.forEach((n) => {
      setTimeout(() => this.playTone(n.f, "square", n.d, 0.1), offset);
      offset += n.d + 20;
    });
  }

  /** Level milestone celebration fanfare */
  public playLevelUp(): void {
    const tune = [
      { f: 659.25, d: 45 },  // E5
      { f: 783.99, d: 45 },  // G5
      { f: 987.77, d: 50 },  // B5
      { f: 1318.51, d: 65 }, // E6
      { f: 1567.98, d: 140 },// G6
    ];
    let offset = 0;
    tune.forEach((n) => {
      setTimeout(() => this.playTone(n.f, "square", n.d, 0.11), offset);
      offset += n.d + 18;
    });
  }

  /** Explosive multi-frequency brick crunch crash */
  public playCrash(): void {
    this.playTone(340, "sawtooth", 120, 0.18, 120);
    setTimeout(() => this.playTone(160, "square", 180, 0.2, 70), 50);
    setTimeout(() => this.playTone(90, "sawtooth", 280, 0.22, 40), 120);
  }

  /** Game over melody (celebratory if new record, melancholic if standard) */
  public playGameOver(isNewHigh: boolean): void {
    if (isNewHigh) {
      // Record breaker victory melody
      const highTune = [
        { f: 1046.5, d: 60 },
        { f: 1318.51, d: 60 },
        { f: 1567.98, d: 70 },
        { f: 2093.0, d: 160 },
        { f: 2637.02, d: 240 },
      ];
      let offset = 0;
      highTune.forEach((n) => {
        setTimeout(() => this.playTone(n.f, "square", n.d, 0.12), offset);
        offset += n.d + 25;
      });
    } else {
      // Classic 90s descending defeat jingle
      const sadTune = [
        { f: 587.33, d: 100 }, // D5
        { f: 523.25, d: 110 }, // C5
        { f: 440.0, d: 130 },  // A4
        { f: 349.23, d: 240 }, // F4
      ];
      let offset = 0;
      sadTune.forEach((n) => {
        setTimeout(() => this.playTone(n.f, "square", n.d, 0.1), offset);
        offset += n.d + 30;
      });
    }
  }

  /** Pause / Resume audio cues */
  public playPause(): void {
    this.playTone(880, "square", 30, 0.06);
    setTimeout(() => this.playTone(659, "square", 45, 0.06), 35);
  }

  public playResume(): void {
    this.playTone(659, "square", 30, 0.06);
    setTimeout(() => this.playTone(880, "square", 45, 0.06), 35);
  }

  public playMenuBeep(): void {
    this.playTone(950, "square", 18, 0.05);
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
