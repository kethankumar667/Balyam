import { Howl, Howler } from "howler";
import {
  AUDIO_CROSSFADE_MS,
  DEFAULT_THEME,
  MUSIC_KEYS,
  PRELOAD_KEYS,
  type AudioKey,
  type AudioThemeId,
} from "../constants/audio";
import { THEME_BY_ID, type ThemeManifest } from "../assets/audio/themes/manifests";

/**
 * Persistent user preferences. Saved on every change to localStorage
 * under STORAGE_KEY and restored on first AudioManager instantiation.
 *
 * Volumes are 0..1; the manager clamps on the way in so callers can be
 * sloppy (e.g. wire a slider directly).
 */
export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  isMuted: boolean;
  selectedAudioTheme: AudioThemeId;
}

const STORAGE_KEY = "bhalyam.audio.settings";

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  effectsVolume: 0.85,
  isMuted: false,
  selectedAudioTheme: DEFAULT_THEME,
};

type Listener = (settings: AudioSettings) => void;

function clamp01(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function readSettings(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      masterVolume:  clamp01(parsed.masterVolume  ?? DEFAULT_SETTINGS.masterVolume),
      musicVolume:   clamp01(parsed.musicVolume   ?? DEFAULT_SETTINGS.musicVolume),
      effectsVolume: clamp01(parsed.effectsVolume ?? DEFAULT_SETTINGS.effectsVolume),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(s: AudioSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Quota, incognito, etc — non-fatal.
  }
}

const isDev = (): boolean => {
  try {
    // Vite + TS — guarded so tests / SSR don't crash.
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
};

function warn(msg: string, err?: unknown): void {
  if (isDev()) console.warn(`[Audio] ${msg}`, err ?? "");
}

/**
 * Singleton audio engine — owns Howler globally and exposes a thin,
 * orthogonal API surface that components can call without worrying
 * about lifecycle, caching, or autoplay rules.
 *
 * Design notes:
 *   • Howl instances are cached by FILE URL, not by AUDIO key. This
 *     means two themes that reuse the same file share a single Howl —
 *     and on theme switch we unload the whole cache cleanly.
 *   • One music track plays at a time; switching crossfades through
 *     AUDIO_CROSSFADE_MS to avoid abrupt cuts when navigating between
 *     rooms / games.
 *   • Autoplay is gated until the first user gesture (pointer / key /
 *     touch). Before that, play() / playMusic() are silent no-ops and
 *     preload() is deferred — modern browsers reject all of this
 *     without a gesture, so we treat the unlock event as the real init.
 *   • Visibility change pauses + resumes music automatically so the
 *     browser tab doesn't keep humming in the background.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  static getInstance(): AudioManager {
    if (!this._instance) this._instance = new AudioManager();
    return this._instance;
  }

  private settings: AudioSettings;
  /**
   * Immutable snapshot exposed via getSettings(). React's
   * useSyncExternalStore needs a stable reference for unchanged state,
   * so we refresh this only when persist() runs.
   */
  private snapshot: AudioSettings;
  private listeners = new Set<Listener>();
  private sfxCache = new Map<string, Howl>();
  private musicCache = new Map<string, Howl>();
  private currentMusic: { key: AudioKey; howl: Howl } | null = null;
  private theme: ThemeManifest;
  private unlocked = false;
  private fadeTimers = new Set<number>();

  private constructor() {
    this.settings = readSettings();
    this.snapshot = { ...this.settings };
    this.theme =
      THEME_BY_ID[this.settings.selectedAudioTheme] ?? THEME_BY_ID[DEFAULT_THEME];

    Howler.volume(this.settings.masterVolume);
    Howler.mute(this.settings.isMuted);

    if (typeof window !== "undefined") {
      this.installUnlockHandlers();
      this.installVisibilityHandler();
    }
  }

  /* ────────────────────────────────────────────────────────────────
   * Lifecycle / unlock
   * ──────────────────────────────────────────────────────────────── */

  private installUnlockHandlers(): void {
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      // Howler tries to resume its own AudioContext on the same gesture.
      // Some Safari builds need an explicit nudge.
      try {
        Howler.ctx?.resume?.();
      } catch {
        /* ignore */
      }
      this.preload();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  private installVisibilityHandler(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pauseMusic();
      else this.resumeMusic();
    });
  }

  isAudioUnlocked(): boolean {
    return this.unlocked;
  }

  /* ────────────────────────────────────────────────────────────────
   * Settings + subscription
   * ──────────────────────────────────────────────────────────────── */

  getSettings(): AudioSettings {
    return this.snapshot;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private persist(): void {
    this.snapshot = { ...this.settings };
    writeSettings(this.settings);
    for (const l of this.listeners) {
      try {
        l(this.snapshot);
      } catch (err) {
        warn("Listener threw", err);
      }
    }
  }

  /* ────────────────────────────────────────────────────────────────
   * Howl creation / lookup
   * ──────────────────────────────────────────────────────────────── */

  private resolveFile(key: AudioKey): string | null {
    return this.theme.files[key] ?? null;
  }

  private getOrCreateHowl(
    cache: Map<string, Howl>,
    file: string,
    isMusic: boolean,
  ): Howl {
    const cached = cache.get(file);
    if (cached) return cached;

    const howl = new Howl({
      src: [file],
      loop: isMusic,
      // Music streams (html5) so we don't decode entire tracks into memory
      // up front; sfx is decoded for instant playback.
      html5: isMusic,
      preload: true,
      volume: isMusic ? 0 : this.settings.effectsVolume,
      onloaderror: (_id, err) => warn(`Failed to load ${file}`, err),
      onplayerror: (_id, err) => {
        warn(`Play failed ${file}`, err);
        // Howler suggests this dance to recover from autoplay rejections.
        try {
          howl.once("unlock", () => howl.play());
        } catch {
          /* ignore */
        }
      },
    });
    cache.set(file, howl);
    return howl;
  }

  private scheduleFade(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.fadeTimers.delete(id);
      try {
        fn();
      } catch {
        /* ignore */
      }
    }, ms);
    this.fadeTimers.add(id);
  }

  /* ────────────────────────────────────────────────────────────────
   * Sound effects
   * ──────────────────────────────────────────────────────────────── */

  /**
   * Play a sound by key. Music keys are routed to playMusic() so callers
   * can always say `play(AUDIO.WHATEVER)` and get the right behaviour.
   *
   * `opts.rate` — optional Howler playback-rate override (its pitch knob),
   * applied to this ONE play instance only via the sound id `.play()`
   * returns. Never mutates the cached Howl's default rate, so a
   * pitch-varied animation SFX never leaks into a later unrelated
   * `play()` of the same key elsewhere in the app.
   */
  play(key: AudioKey, opts?: { rate?: number }): void {
    if (this.settings.isMuted) return;
    if (!this.unlocked) return;
    if (MUSIC_KEYS.has(key)) {
      this.playMusic(key);
      return;
    }
    const file = this.resolveFile(key);
    if (!file) return;
    const howl = this.getOrCreateHowl(this.sfxCache, file, false);
    try {
      howl.volume(this.settings.effectsVolume);
      const id = howl.play();
      if (opts?.rate) howl.rate(opts.rate, id);
    } catch (err) {
      warn(`play(${key}) threw`, err);
    }
  }

  stop(key: AudioKey): void {
    const file = this.resolveFile(key);
    if (!file) return;
    if (MUSIC_KEYS.has(key)) {
      this.stopMusic();
      return;
    }
    this.sfxCache.get(file)?.stop();
  }

  /* ────────────────────────────────────────────────────────────────
   * Background music
   * ──────────────────────────────────────────────────────────────── */

  playMusic(key: AudioKey): void {
    if (!MUSIC_KEYS.has(key)) {
      warn(`playMusic called with non-music key ${key}`);
      return;
    }
    const file = this.resolveFile(key);
    if (!file) return;
    if (!this.unlocked) {
      // Stash the intent — the unlock handler doesn't know we wanted
      // music yet, but the next playMusic() after unlock will succeed.
      // We don't queue here to avoid surprise playback after long delays.
      return;
    }
    if (this.currentMusic?.key === key && this.currentMusic.howl.playing()) return;

    const next = this.getOrCreateHowl(this.musicCache, file, true);
    const previous = this.currentMusic;

    // Fade out the previous track and free it from "current" so a quick
    // back-to-back switch doesn't leave it queued.
    if (previous && previous.howl !== next) {
      const oldHowl = previous.howl;
      const fromVolume = oldHowl.volume();
      try {
        oldHowl.fade(fromVolume, 0, AUDIO_CROSSFADE_MS);
      } catch {
        /* ignore */
      }
      this.scheduleFade(AUDIO_CROSSFADE_MS, () => oldHowl.stop());
    }

    const target = this.settings.isMuted ? 0 : this.settings.musicVolume;
    if (!next.playing()) {
      next.volume(0);
      try {
        next.play();
      } catch (err) {
        warn(`playMusic(${key}) play() threw`, err);
        return;
      }
    }
    try {
      next.fade(next.volume(), target, AUDIO_CROSSFADE_MS);
    } catch {
      next.volume(target);
    }
    this.currentMusic = { key, howl: next };
  }

  stopMusic(): void {
    const cur = this.currentMusic;
    if (!cur) return;
    const howl = cur.howl;
    try {
      howl.fade(howl.volume(), 0, AUDIO_CROSSFADE_MS);
    } catch {
      /* ignore */
    }
    this.scheduleFade(AUDIO_CROSSFADE_MS, () => howl.stop());
    this.currentMusic = null;
  }

  pauseMusic(): void {
    this.currentMusic?.howl.pause();
  }

  resumeMusic(): void {
    if (!this.unlocked) return;
    const cur = this.currentMusic;
    if (!cur) return;
    if (!cur.howl.playing()) {
      try {
        cur.howl.play();
      } catch (err) {
        warn("resumeMusic play() threw", err);
      }
    }
  }

  fadeIn(durationMs: number = AUDIO_CROSSFADE_MS): void {
    const cur = this.currentMusic;
    if (!cur) return;
    try {
      cur.howl.fade(cur.howl.volume(), this.settings.musicVolume, durationMs);
    } catch {
      /* ignore */
    }
  }

  fadeOut(durationMs: number = AUDIO_CROSSFADE_MS): void {
    const cur = this.currentMusic;
    if (!cur) return;
    try {
      cur.howl.fade(cur.howl.volume(), 0, durationMs);
    } catch {
      /* ignore */
    }
  }

  /* ────────────────────────────────────────────────────────────────
   * Mute / volume
   * ──────────────────────────────────────────────────────────────── */

  toggleMute(): void {
    if (this.settings.isMuted) this.unmute();
    else this.mute();
  }

  mute(): void {
    if (this.settings.isMuted) return;
    this.settings.isMuted = true;
    Howler.mute(true);
    this.persist();
  }

  unmute(): void {
    if (!this.settings.isMuted) return;
    this.settings.isMuted = false;
    Howler.mute(false);
    this.persist();
  }

  setMasterVolume(value: number): void {
    this.settings.masterVolume = clamp01(value);
    Howler.volume(this.settings.masterVolume);
    this.persist();
  }

  setMusicVolume(value: number): void {
    this.settings.musicVolume = clamp01(value);
    if (this.currentMusic && !this.settings.isMuted) {
      this.currentMusic.howl.volume(this.settings.musicVolume);
    }
    this.persist();
  }

  setEffectsVolume(value: number): void {
    this.settings.effectsVolume = clamp01(value);
    // Apply lazily to in-flight sfx by mutating cached Howls; next play()
    // also re-applies, so this just affects already-playing one-shots.
    for (const h of this.sfxCache.values()) {
      try {
        h.volume(this.settings.effectsVolume);
      } catch {
        /* ignore */
      }
    }
    this.persist();
  }

  /* ────────────────────────────────────────────────────────────────
   * Theme switching
   * ──────────────────────────────────────────────────────────────── */

  /**
   * Swap the active theme. Crossfades whatever music slot was playing in
   * the OLD theme to the equivalent track in the new theme, then unloads
   * the previous theme's Howl cache so we don't leak memory across
   * switches.
   */
  setAudioTheme(id: AudioThemeId): void {
    const next = THEME_BY_ID[id];
    if (!next) {
      warn(`Unknown theme id ${id}`);
      return;
    }
    if (next.id === this.theme.id) {
      this.settings.selectedAudioTheme = id;
      this.persist();
      return;
    }

    const previousMusicKey = this.currentMusic?.key ?? null;

    // Stop currently-playing music with a fade BEFORE we tear down the
    // cache; otherwise unload() interrupts the fade abruptly.
    if (this.currentMusic) {
      const oldHowl = this.currentMusic.howl;
      try {
        oldHowl.fade(oldHowl.volume(), 0, AUDIO_CROSSFADE_MS);
      } catch {
        /* ignore */
      }
      this.scheduleFade(AUDIO_CROSSFADE_MS, () => {
        try {
          oldHowl.stop();
        } catch {
          /* ignore */
        }
      });
    }

    // Detach current music so a fast switch doesn't accidentally fade the
    // new track when scheduleFade fires.
    this.currentMusic = null;

    // Defer cache teardown to after the old music fade completes.
    this.scheduleFade(AUDIO_CROSSFADE_MS + 30, () => {
      this.unloadCaches();
      this.theme = next;
      this.settings.selectedAudioTheme = id;
      this.persist();
      if (this.unlocked) this.preload();
      if (previousMusicKey) this.playMusic(previousMusicKey);
    });
  }

  private unloadCaches(): void {
    for (const h of this.sfxCache.values()) {
      try {
        h.unload();
      } catch {
        /* ignore */
      }
    }
    for (const h of this.musicCache.values()) {
      try {
        h.unload();
      } catch {
        /* ignore */
      }
    }
    this.sfxCache.clear();
    this.musicCache.clear();
  }

  /* ────────────────────────────────────────────────────────────────
   * Preload / cleanup
   * ──────────────────────────────────────────────────────────────── */

  preload(): void {
    if (!this.unlocked) return;
    for (const key of PRELOAD_KEYS) {
      const file = this.resolveFile(key);
      if (!file) continue;
      // Just instantiating is enough — preload: true on the Howl options.
      this.getOrCreateHowl(this.sfxCache, file, false);
    }
  }

  destroy(): void {
    for (const id of this.fadeTimers) window.clearTimeout(id);
    this.fadeTimers.clear();
    this.unloadCaches();
    this.currentMusic = null;
    this.listeners.clear();
  }
}
