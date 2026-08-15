import { useEffect } from "react";
import { breakoutAudio } from "../services/audioService";

export function useBreakoutAudio(soundEnabled: boolean) {
  useEffect(() => {
    breakoutAudio.setMuted(!soundEnabled);
  }, [soundEnabled]);

  return breakoutAudio;
}
