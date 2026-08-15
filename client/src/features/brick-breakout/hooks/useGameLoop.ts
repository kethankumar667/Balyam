import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";

export function useGameLoop(state: GameState, dispatch: React.Dispatch<GameAction>) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);

  // Tab visibility change auto-pause
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && stateRef.current.status === "playing") {
        dispatchRef.current({ type: "PAUSE_TOGGLE" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Life lost auto-serve timer
  useEffect(() => {
    if (state.status === "life-lost") {
      const timer = setTimeout(() => {
        dispatchRef.current({ type: "SERVE_BALL" });
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Main RAF Fixed-Timestep Loop
  useEffect(() => {
    if (state.status !== "playing") {
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      return;
    }

    let animId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const delta = Math.min(100, time - lastTimeRef.current);
      lastTimeRef.current = time;
      accumulatorRef.current += delta;

      const tickSpeed = stateRef.current.tickSpeedMs;

      while (accumulatorRef.current >= tickSpeed) {
        if (stateRef.current.status === "playing") {
          dispatchRef.current({ type: "TICK" });
        }
        accumulatorRef.current -= tickSpeed;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [state.status, state.tickSpeedMs]);
}
