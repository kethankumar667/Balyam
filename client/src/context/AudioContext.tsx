import { createContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { AudioManager, type AudioSettings } from "../services/AudioManager";
import type { AudioKey, AudioThemeId } from "../constants/audio";

/**
 * Public surface exposed to components via useAudio(). Mirrors the
 * AudioManager but is bound to the React lifecycle and re-renders on
 * settings change via useSyncExternalStore.
 *
 * The functions are stable references between renders (memoized off the
 * manager instance, which is itself a singleton), so passing them as
 * effect deps will not cause loops.
 */
export interface AudioContextValue {
  /** Current persisted state — volumes, mute, theme. */
  settings: AudioSettings;

  /** True after the user has interacted with the page (autoplay unlock). */
  isAudioUnlocked: boolean;

  /* Playback — fire-and-forget. Routes music keys to playMusic(). */
  play: (key: AudioKey, opts?: { rate?: number }) => void;
  stop: (key: AudioKey) => void;

  /* Background music. */
  playMusic: (key: AudioKey) => void;
  stopMusic: () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  fadeIn: (ms?: number) => void;
  fadeOut: (ms?: number) => void;

  /* Mute / volume. */
  toggleMute: () => void;
  mute: () => void;
  unmute: () => void;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setEffectsVolume: (v: number) => void;

  /* Theme. */
  setAudioTheme: (id: AudioThemeId) => void;
}

export const AudioContext = createContext<AudioContextValue | null>(null);

/**
 * Mount once at the app root. The underlying AudioManager is a
 * singleton, so re-mounts (StrictMode double-invoke) are safe.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const manager = useMemo(() => AudioManager.getInstance(), []);

  // Subscribe to manager state changes so components consuming
  // settings re-render when the user toggles mute, drags a slider, etc.
  const settings = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.getSettings(),
    () => manager.getSettings(),
  );

  // The methods are bound once — only `settings` changes between renders.
  const value = useMemo<AudioContextValue>(
    () => ({
      settings,
      isAudioUnlocked: manager.isAudioUnlocked(),
      play:            (k, opts) => manager.play(k, opts),
      stop:            (k) => manager.stop(k),
      playMusic:       (k) => manager.playMusic(k),
      stopMusic:       () => manager.stopMusic(),
      pauseMusic:      () => manager.pauseMusic(),
      resumeMusic:     () => manager.resumeMusic(),
      fadeIn:          (ms) => manager.fadeIn(ms),
      fadeOut:         (ms) => manager.fadeOut(ms),
      toggleMute:      () => manager.toggleMute(),
      mute:            () => manager.mute(),
      unmute:          () => manager.unmute(),
      setMasterVolume:  (v) => manager.setMasterVolume(v),
      setMusicVolume:   (v) => manager.setMusicVolume(v),
      setEffectsVolume: (v) => manager.setEffectsVolume(v),
      setAudioTheme:    (id) => manager.setAudioTheme(id),
    }),
    [manager, settings],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
