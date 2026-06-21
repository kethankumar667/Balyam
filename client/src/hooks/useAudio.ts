import { useContext } from "react";
import { AudioContext, type AudioContextValue } from "../context/AudioContext";

/**
 * Single entry-point for all audio interactions from components:
 *
 *   const { play, playMusic, settings, setAudioTheme } = useAudio();
 *   play(AUDIO.UI_CLICK);
 *   playMusic(AUDIO.MUSIC_LUDO);
 *
 * Throws if the provider isn't mounted — catches forgotten wiring
 * during development rather than failing silently in production.
 */
export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error(
      "useAudio() must be used within <AudioProvider> — mount it at the app root.",
    );
  }
  return ctx;
}
