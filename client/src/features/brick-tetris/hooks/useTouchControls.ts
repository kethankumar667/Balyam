import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";
import { tetrisAudio } from "../services/audioService";

export function useTouchControls(
  state: GameState,
  dispatch: React.Dispatch<GameAction>,
  containerRef: React.RefObject<HTMLDivElement>,
) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (state.status !== "playing") return;
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      lastXRef.current = touch.clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (state.status !== "playing" || startXRef.current === null || startYRef.current === null) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - (lastXRef.current ?? startXRef.current);
      const deltaY = touch.clientY - startYRef.current;

      const thresholdX = 24;
      if (Math.abs(deltaX) >= thresholdX) {
        if (deltaX < 0) {
          dispatch({ type: "MOVE_LEFT" });
          tetrisAudio.playMove();
        } else {
          dispatch({ type: "MOVE_RIGHT" });
          tetrisAudio.playMove();
        }
        lastXRef.current = touch.clientX;
      }

      if (deltaY > 40) {
        dispatch({ type: "SOFT_DROP_START" });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (state.status !== "playing" || startXRef.current === null || startYRef.current === null) return;
      const touch = e.changedTouches[0];
      const totalDeltaX = touch.clientX - startXRef.current;
      const totalDeltaY = touch.clientY - startYRef.current;

      dispatch({ type: "SOFT_DROP_END" });

      // Tap detection (minimal movement -> rotate)
      if (Math.abs(totalDeltaX) < 15 && Math.abs(totalDeltaY) < 15) {
        dispatch({ type: "ROTATE_CW" });
        tetrisAudio.playRotate();
      } else if (totalDeltaY < -50 && Math.abs(totalDeltaX) < 40) {
        // Quick swipe up -> Hard drop
        dispatch({ type: "HARD_DROP" });
        tetrisAudio.playHardDrop();
      }

      startXRef.current = null;
      startYRef.current = null;
      lastXRef.current = null;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [state.status, dispatch, containerRef]);
}
