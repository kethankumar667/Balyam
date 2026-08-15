import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";

export function useFixedTimestepLoop(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;

    const handleVisibilityChange = () => {
      if (document.hidden && state.status === "playing") {
        dispatch({ type: "TOGGLE_PAUSE" });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const deltaMs = Math.min(64, Math.max(1, timestamp - lastTimeRef.current));
      lastTimeRef.current = timestamp;

      dispatch({ type: "TICK", deltaMs, nowMs: Date.now() });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lastTimeRef.current = null;
    };
  }, [state.status, dispatch]);
}
