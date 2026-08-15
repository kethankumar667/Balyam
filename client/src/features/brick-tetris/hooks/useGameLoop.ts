import { useEffect, useRef } from "react";
import type { GameAction, GameStatus } from "../types";

export function useGameLoop(
  status: GameStatus,
  dispatch: React.Dispatch<GameAction>,
) {
  const lastTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden && status === "playing") {
        dispatch({ type: "PAUSE_TOGGLE" });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, dispatch]);

  useEffect(() => {
    if (status !== "playing" && status !== "line-clearing") {
      lastTimeRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const deltaMs = Math.min(100, timestamp - lastTimeRef.current);
      lastTimeRef.current = timestamp;

      dispatch({ type: "TICK", payload: { deltaMs } });

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [status, dispatch]);
}
