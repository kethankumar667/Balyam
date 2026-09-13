import { useEffect, useState } from "react";
import { enterFullscreen, exitFullscreen, isFullscreenActive, onFullscreenChange } from "../lib/fullscreen";

/**
 * A persistent Enter/Exit fullscreen toggle, for a button the player can
 * press at will — distinct from `useGameFullscreen.ts`, which is a one-way,
 * gesture-gated ENTER-only attempt for the moment a match starts and has no
 * exit path.
 *
 * Extracted from three independent copies of the same idiom (Ludo's
 * `LudoStatusBar`, UNO's `UnoBoardDesktop`/`UnoBoardMobile` — the latter
 * added specifically because `Room.tsx`'s automatic fullscreen-on-start
 * attempt silently fails on real devices: iOS Safari has no Fullscreen API,
 * and an Android request fired from a `useEffect` reacting to a socket event
 * rather than the click that started it can lose its "real user gesture"
 * standing). Every other game needs the identical fix, so this is the one
 * place it now lives.
 */
export function useFullscreenToggle(): { isFullscreen: boolean; toggleFullscreen: () => void } {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isFullscreenActive());

  useEffect(() => onFullscreenChange(() => setIsFullscreen(isFullscreenActive())), []);

  const toggleFullscreen = (): void => {
    if (isFullscreenActive()) {
      void exitFullscreen();
    } else {
      void enterFullscreen("any");
    }
  };

  return { isFullscreen, toggleFullscreen };
}
