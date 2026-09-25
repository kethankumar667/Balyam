import { useEffect, useRef, useState, useCallback } from "react";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { AudioManager } from "../../services/AudioManager";

export interface UseTvAudioOptions {
  phase: "lobby" | "playing" | "finished";
  turnDeadline: number | null;
  activePlayerId: string | null;
}

export function useTvAudio({ phase, turnDeadline, activePlayerId }: UseTvAudioOptions) {
  const { play, playMusic, stopMusic, toggleMute, settings } = useAudio();
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    return AudioManager.getInstance().isAudioUnlocked();
  });

  const prevPhaseRef = useRef(phase);
  const prevTurnPlayerRef = useRef(activePlayerId);
  const lastTickedSecondRef = useRef<number | null>(null);

  // Attempt to unlock audio on any user gesture
  const unlockAudio = useCallback(() => {
    setIsAudioUnlocked(true);
    if (settings.isMuted) {
      toggleMute();
    }
  }, [settings.isMuted, toggleMute]);

  // Listen for initial user gesture (click, tap, keypress) to unlock audio
  useEffect(() => {
    if (isAudioUnlocked) return;

    const handleGesture = () => {
      unlockAudio();
    };

    window.addEventListener("click", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });
    window.addEventListener("touchstart", handleGesture, { once: true });

    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
    };
  }, [isAudioUnlocked, unlockAudio]);

  // Phase transition sounds
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (prev === "lobby" && phase === "playing") {
      play(AUDIO.UI_POPUP_OPEN);
      play(AUDIO.HC_TOSS);
    } else if (prev === "playing" && phase === "finished") {
      play(AUDIO.SB_APPLAUSE);
      play(AUDIO.SB_TADA);
      try {
        playMusic(AUDIO.MUSIC_VICTORY);
      } catch {
        // Fallback silently if theme lacks victory track
      }
    } else if (phase === "lobby" && prev === "finished") {
      stopMusic();
    }
  }, [phase, play, playMusic, stopMusic]);

  // Turn change sound
  useEffect(() => {
    if (phase !== "playing") return;
    if (!activePlayerId) return;

    if (prevTurnPlayerRef.current && prevTurnPlayerRef.current !== activePlayerId) {
      play(AUDIO.UI_SWIPE);
    }
    prevTurnPlayerRef.current = activePlayerId;
    lastTickedSecondRef.current = null;
  }, [activePlayerId, phase, play]);

  // Synchronized countdown audio ticks when turn deadline <= 5s
  useEffect(() => {
    if (phase !== "playing" || !turnDeadline) {
      lastTickedSecondRef.current = null;
      return;
    }

    const checkInterval = window.setInterval(() => {
      const now = Date.now();
      const remainingMs = turnDeadline - now;
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (remainingSec > 0 && remainingSec <= 5) {
        if (lastTickedSecondRef.current !== remainingSec) {
          lastTickedSecondRef.current = remainingSec;
          play(AUDIO.SYS_TICK);
        }
      }
    }, 200);

    return () => {
      window.clearInterval(checkInterval);
    };
  }, [phase, turnDeadline, play]);

  return {
    isAudioUnlocked,
    isMuted: settings.isMuted,
    unlockAudio,
    toggleMute,
  };
}
