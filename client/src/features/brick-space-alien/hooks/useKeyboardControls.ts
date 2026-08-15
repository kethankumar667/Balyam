import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";

export function useKeyboardControls(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;

      if (
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "Space"
      ) {
        e.preventDefault();
      }

      const curStatus = stateRef.current.status;

      // Global Pause & Restart Keys
      if (code === "KeyP" || code === "Escape") {
        dispatch({ type: "TOGGLE_PAUSE" });
        return;
      }

      if (code === "KeyR" && (curStatus === "game-over" || curStatus === "playing")) {
        dispatch({ type: "RESTART_GAME" });
        return;
      }

      // Menu Navigation
      if (curStatus === "menu") {
        if (code === "ArrowUp" || code === "KeyW" || key === "2") {
          dispatch({ type: "NAV_MENU", direction: "UP" });
        } else if (code === "ArrowDown" || code === "KeyS" || key === "8") {
          dispatch({ type: "NAV_MENU", direction: "DOWN" });
        } else if (code === "Enter" || code === "Space" || key === "5") {
          dispatch({ type: "CONFIRM_MENU" });
        }
        return;
      }

      // Instructions / High Scores back to menu
      if (curStatus === "instructions" || curStatus === "high-scores") {
        if (code === "Enter" || code === "Space" || code === "Escape" || code === "Backspace") {
          dispatch({ type: "GO_TO_MENU" });
        }
        return;
      }

      // In-game controls
      if (curStatus === "playing") {
        if (code === "ArrowLeft" || code === "KeyA" || key === "4") {
          dispatch({ type: "MOVE_PLAYER", deltaX: -1, nowMs: Date.now() });
        } else if (code === "ArrowRight" || code === "KeyD" || key === "6") {
          dispatch({ type: "MOVE_PLAYER", deltaX: 1, nowMs: Date.now() });
        } else if (code === "Space" || code === "ArrowUp" || code === "KeyW" || key === "5" || key === "2") {
          dispatch({ type: "PLAYER_FIRE", nowMs: Date.now() });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);
}
