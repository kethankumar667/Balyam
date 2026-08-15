import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";
import { breakoutAudio } from "../services/audioService";

export function useKeyboardControls(state: GameState, dispatch: React.Dispatch<GameAction>) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const keysHeld = useRef<Set<string>>(new Set());
  const repeatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;

      // Prevent scrolling on game control keys
      if (
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "Space"
      ) {
        e.preventDefault();
      }

      if (e.repeat) return;
      keysHeld.current.add(code);

      const status = stateRef.current.status;

      // Handle Instant Actions
      if (code === "Space" || code === "Enter" || code === "Numpad5" || key === "5") {
        if (status === "menu") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "START_GAME", level: 1 });
        } else if (status === "serving") {
          breakoutAudio.playBallLaunch();
          dispatchRef.current({ type: "LAUNCH_BALL" });
        } else if (status === "level-complete") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "NEXT_LEVEL" });
        } else if (status === "game-over") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "RESTART" });
        } else if (status === "instructions") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "OPEN_MENU" });
        }
      }

      if (code === "KeyP" || code === "Escape") {
        breakoutAudio.playButtonClick();
        dispatchRef.current({ type: "PAUSE_TOGGLE" });
      }

      if (code === "KeyR") {
        breakoutAudio.playButtonClick();
        dispatchRef.current({ type: "RESTART" });
      }

      if (code === "KeyM" && status === "game-over") {
        breakoutAudio.playButtonClick();
        dispatchRef.current({ type: "OPEN_MENU" });
      }

      // Initial movement tap
      if (
        code === "ArrowLeft" ||
        code === "KeyA" ||
        code === "Numpad4" ||
        key === "4"
      ) {
        if (status === "playing" || status === "serving") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "MOVE_PADDLE", direction: -1 });
        }
      } else if (
        code === "ArrowRight" ||
        code === "KeyD" ||
        code === "Numpad6" ||
        key === "6"
      ) {
        if (status === "playing" || status === "serving") {
          breakoutAudio.playButtonClick();
          dispatchRef.current({ type: "MOVE_PADDLE", direction: 1 });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    };
  }, []);

  // Continuous movement loop for held keys (DAS: Delayed Auto Shift)
  useEffect(() => {
    const interval = setInterval(() => {
      const status = stateRef.current.status;
      if (status !== "playing" && status !== "serving") return;

      const left =
        keysHeld.current.has("ArrowLeft") ||
        keysHeld.current.has("KeyA") ||
        keysHeld.current.has("Numpad4");
      const right =
        keysHeld.current.has("ArrowRight") ||
        keysHeld.current.has("KeyD") ||
        keysHeld.current.has("Numpad6");

      if (left && !right) {
        dispatchRef.current({ type: "MOVE_PADDLE", direction: -1 });
      } else if (right && !left) {
        dispatchRef.current({ type: "MOVE_PADDLE", direction: 1 });
      }
    }, 75);

    return () => clearInterval(interval);
  }, []);
}
