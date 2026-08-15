class BrickTetrisAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch {
      // Ignore when audio is blocked or unsupported
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public playMove(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {
      // Non-fatal
    }
  }

  public playRotate(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Non-fatal
    }
  }

  public playHardDrop(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Non-fatal
    }
  }

  public playHold(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Non-fatal
    }
  }

  public playLineClear(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "square";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.06); // A5

      osc2.type = "square";
      osc2.frequency.setValueAtTime(739.99, now + 0.03); // F#5
      osc2.frequency.setValueAtTime(1174.66, now + 0.09); // D6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.03);
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } catch {
      // Non-fatal
    }
  }

  public playTetrisClear(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.05;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch {
      // Non-fatal
    }
  }

  public playGameOver(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [400, 350, 300, 220];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.08;

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch {
      // Non-fatal
    }
  }

  public playLevelUp(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.06;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {
      // Non-fatal
    }
  }

  public playButtonTick(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.015);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch {
      // Non-fatal
    }
  }
}

export const tetrisAudio = new BrickTetrisAudioService();
