/**
 * Thin wrapper around the Vibration API with respectful defaults:
 *   • Always checks for navigator.vibrate before calling — most desktops
 *     don't expose it and that's not an error.
 *   • All trigger sites read the persisted `vibrationEnabled` flag so
 *     the user's choice in the global settings is honoured everywhere.
 *
 * Patterns are short by design — long pulses are annoying. We expose
 * three named intents so the call sites stay declarative:
 *     turn   →  it's your move now (used by every game)
 *     win    →  round / match won
 *     subtle →  small confirmations (e.g. dice landing)
 */

const STORAGE_KEY = "bhalyam.haptics.enabled";

type Listener = (enabled: boolean) => void;

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

function writeEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export class HapticsManager {
  private static _instance: HapticsManager | null = null;
  static getInstance(): HapticsManager {
    if (!this._instance) this._instance = new HapticsManager();
    return this._instance;
  }

  private enabled: boolean;
  private snapshot: { enabled: boolean };
  private listeners = new Set<Listener>();

  private constructor() {
    this.enabled = readEnabled();
    this.snapshot = { enabled: this.enabled };
  }

  isSupported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Snapshot for useSyncExternalStore — stable reference until persist. */
  getState(): { enabled: boolean } {
    return this.snapshot;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    this.snapshot = { enabled: v };
    writeEnabled(v);
    for (const l of this.listeners) {
      try {
        l(v);
      } catch {
        /* ignore */
      }
    }
  }

  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  private fire(pattern: number | number[]): void {
    if (!this.enabled) return;
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }

  /**
   * "It's your turn" — strong, distinct triple pulse. Longer + harder
   * than the original double-tap; the user reported the previous
   * pattern was too easy to miss in their pocket or with a phone case.
   */
  turn(): void {
    this.fire([120, 80, 120, 80, 120]);
  }

  /** Round / match win — sustained celebratory cadence. */
  win(): void {
    this.fire([80, 60, 80, 60, 200]);
  }

  /** Subtle confirmation tap — short but firmer than the prior 18 ms. */
  subtle(): void {
    this.fire(40);
  }

  /**
   * "Game is on" — fired when the room flips from lobby to playing.
   * Two crisp hits separated by a beat so it doesn't get confused with
   * the turn pulse. Host needs this most (they clicked Start Game and
   * deserve an "OK, dealing" confirmation) but it lands for everyone.
   */
  gameStart(): void {
    this.fire([160, 90, 160]);
  }
}
