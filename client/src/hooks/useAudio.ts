import { useContext } from "react";
import { AudioContext, type AudioContextValue } from "../context/AudioContext";
import { AudioManager } from "../services/AudioManager";

/**
 * Single entry-point for all audio interactions from components:
 *
 *   const { play, playMusic, settings, setAudioTheme } = useAudio();
 *   play(AUDIO.UI_CLICK);
 *   playMusic(AUDIO.MUSIC_LUDO);
 *
 * Bounded to React AudioContext when available; gracefully falls back to the
 * singleton AudioManager in test environments or isolated component tests.
 */
export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (ctx) {
    return ctx;
  }
  const manager = AudioManager.getInstance();
  return {
    settings: manager.getSettings(),
    isAudioUnlocked: manager.isAudioUnlocked(),
    play: (k, opts) => manager.play(k, opts),
    stop: (k) => manager.stop(k),
    playMusic: (k) => manager.playMusic(k),
    stopMusic: () => manager.stopMusic(),
    pauseMusic: () => manager.pauseMusic(),
    resumeMusic: () => manager.resumeMusic(),
    fadeIn: (ms) => manager.fadeIn(ms),
    fadeOut: (ms) => manager.fadeOut(ms),
    toggleMute: () => manager.toggleMute(),
    mute: () => manager.mute(),
    unmute: () => manager.unmute(),
    setMasterVolume: (v) => manager.setMasterVolume(v),
    setMusicVolume: (v) => manager.setMusicVolume(v),
    setEffectsVolume: (v) => manager.setEffectsVolume(v),
    setAudioTheme: (id) => manager.setAudioTheme(id),
    setActiveGame: (slug) => manager.setActiveGame(slug),
  };
}

