import { HapticsManager } from "../../services/HapticsManager";

/**
 * Procedural Physical Acoustic Engine for Carrom.
 *
 * Implements the tactile soundscape of Miniclip Carrom Pool using the Web Audio API:
 * - Velocity-sensitive wooden coin-coin clacks with micro-pitch modulation
 * - Heavy resonant striker punches
 * - Rubber/hardwood cushion thuds
 * - Deep hollow net pocket drops
 * - Smooth baseline sliding friction
 * - Celebration fanfare & foul buzzers
 *
 * Runs locally with zero asset loading, zero network latency, and zero 404 risk.
 */
class CarromAudioEngine {
  private static instance: CarromAudioEngine | null = null;
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;

  static getInstance(): CarromAudioEngine {
    if (!this.instance) this.instance = new CarromAudioEngine();
    return this.instance;
  }

  private constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        muted ? 0 : 0.75,
        this.ctx.currentTime
      );
    }
  }

  /**
   * Heavy punch when the striker is released and impacts pieces at high speed.
   */
  playStrikerPunch(power01 = 1): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    HapticsManager.getInstance().subtle();

    const t = ctx.currentTime;
    const p = Math.max(0.1, Math.min(1, power01));

    // Low-frequency impact punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(140 * (0.8 + 0.4 * p), t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);

    gain.gain.setValueAtTime(0.7 * p, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);

    // Wooden strike slap transient
    this.playTransientSnap(t, 0.45 * p, 1800);
  }

  /**
   * Crisp acoustic wooden clack for coin-to-coin or striker-to-coin impacts.
   */
  playCoinClack(velocityRatio = 0.7): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    HapticsManager.getInstance().subtle();

    const t = ctx.currentTime;
    const v = Math.max(0.15, Math.min(1, velocityRatio));

    // Dynamic pitch modulation (simulates hitting at slightly different angles / grain)
    const pitchJitter = 0.92 + Math.random() * 0.16;
    const baseFreq = 2400 * pitchJitter;

    // Sharp acoustic clack transient
    const bufferSize = Math.floor(ctx.sampleRate * 0.035);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Decaying white noise
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(baseFreq, t);
    filter.Q.setValueAtTime(4.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6 * v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.045);

    // Wood body resonance
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = "sine";
    woodOsc.frequency.setValueAtTime(680 * pitchJitter, t);
    woodOsc.frequency.exponentialRampToValueAtTime(320, t + 0.04);

    woodGain.gain.setValueAtTime(0.25 * v, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterGain);

    woodOsc.start(t);
    woodOsc.stop(t + 0.05);
  }

  /**
   * Muffled rubber/hardwood bumper bounce sound.
   */
  playCushionThud(velocityRatio = 0.6): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const v = Math.max(0.1, Math.min(1, velocityRatio));

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.5 * v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.095);
  }

  /**
   * Deep hollow "thwump-clack" when a coin falls into a corner net pocket.
   */
  playPocketDrop(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    HapticsManager.getInstance().reward();

    const t = ctx.currentTime;

    // Sub-bass drop
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();

    dropOsc.type = "sine";
    dropOsc.frequency.setValueAtTime(75, t);
    dropOsc.frequency.exponentialRampToValueAtTime(28, t + 0.16);

    dropGain.gain.setValueAtTime(0.8, t);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    dropOsc.connect(dropGain);
    dropGain.connect(this.masterGain);

    dropOsc.start(t);
    dropOsc.stop(t + 0.19);

    // Delayed pocket net capture slap
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const tNet = this.ctx.currentTime;
      this.playTransientSnap(tNet, 0.4, 1100);
    }, 28);
  }

  /**
   * Subtle powdery friction hiss when dragging striker along baseline.
   */
  playAimSlide(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.025);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(3200, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.028);
  }

  /**
   * Sparkling golden celebration chime on queen potting or match victory.
   */
  playCelebrationChime(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    HapticsManager.getInstance().win();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Warning buzz on striker foul.
   */
  playFoulBuzzer(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    HapticsManager.getInstance().subtle();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.setValueAtTime(110, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  private playTransientSnap(t: number, vol: number, freq: number): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.018);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.022);
  }
}

export const CarromAudio = CarromAudioEngine.getInstance();
