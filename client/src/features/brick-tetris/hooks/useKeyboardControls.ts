import { useEffect, useRef } from "react";
import type { GameAction, GameState } from "../types";
import { tetrisAudio } from "../services/audioService";

export function useKeyboardControls(
  state: GameState,
  dispatch: React.Dispatch<GameAction>,
) {
  const leftTimerRef = useRef<{
    das: ReturnType<typeof setTimeout> | null;
    arr: ReturnType<typeof setInterval> | null;
  }>({ das: null, arr: null });
  const rightTimerRef = useRef<{
    das: ReturnType<typeof setTimeout> | null;
    arr: ReturnType<typeof setInterval> | null;
  }>({ das: null, arr: null });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser page scrolling on game keys
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "KeyW",
          "KeyS",
          "KeyA",
          "KeyD",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      if (state.status === "playing") {
        if ((e.code === "ArrowLeft" || e.code === "KeyA" || e.key === "4") && !e.repeat) {
          dispatch({ type: "MOVE_LEFT" });
          tetrisAudio.playMove();

          if (leftTimerRef.current.das) clearTimeout(leftTimerRef.current.das);
          if (leftTimerRef.current.arr) clearInterval(leftTimerRef.current.arr);

          leftTimerRef.current.das = setTimeout(() => {
            leftTimerRef.current.arr = setInterval(() => {
              dispatch({ type: "MOVE_LEFT" });
              tetrisAudio.playMove();
            }, state.settings.arrMs);
          }, state.settings.dasMs);
        } else if ((e.code === "ArrowRight" || e.code === "KeyD" || e.key === "6") && !e.repeat) {
          dispatch({ type: "MOVE_RIGHT" });
          tetrisAudio.playMove();

          if (rightTimerRef.current.das) clearTimeout(rightTimerRef.current.das);
          if (rightTimerRef.current.arr) clearInterval(rightTimerRef.current.arr);

          rightTimerRef.current.das = setTimeout(() => {
            rightTimerRef.current.arr = setInterval(() => {
              dispatch({ type: "MOVE_RIGHT" });
              tetrisAudio.playMove();
            }, state.settings.arrMs);
          }, state.settings.dasMs);
        } else if (e.code === "ArrowDown" || e.code === "KeyS" || e.key === "8") {
          dispatch({ type: "SOFT_DROP_START" });
        } else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyX" || e.key === "2") {
          if (!e.repeat) {
            dispatch({ type: "ROTATE_CW" });
            tetrisAudio.playRotate();
          }
        } else if (e.code === "KeyZ" || e.key === "1") {
          if (!e.repeat) {
            dispatch({ type: "ROTATE_CCW" });
            tetrisAudio.playRotate();
          }
        } else if (e.code === "Space") {
          if (!e.repeat) {
            dispatch({ type: "HARD_DROP" });
            tetrisAudio.playHardDrop();
          }
        } else if (e.code === "KeyC" || e.code === "ShiftLeft" || e.code === "ShiftRight" || e.key === "0") {
          if (!e.repeat) {
            dispatch({ type: "HOLD_PIECE" });
            tetrisAudio.playHold();
          }
        } else if (e.code === "KeyP" || e.code === "Escape" || e.key === "5") {
          if (!e.repeat) {
            dispatch({ type: "PAUSE_TOGGLE" });
            tetrisAudio.playButtonTick();
          }
        }
      } else if (state.status === "paused") {
        if (e.code === "KeyP" || e.code === "Escape" || e.code === "Enter" || e.key === "5") {
          dispatch({ type: "PAUSE_TOGGLE" });
          tetrisAudio.playButtonTick();
        }
      } else if (state.status === "menu" || state.status === "boot") {
        if (e.code === "ArrowUp" || e.code === "KeyW" || e.key === "2") {
          dispatch({ type: "NAVIGATE_MENU", payload: { direction: "UP" } });
          tetrisAudio.playButtonTick();
        } else if (e.code === "ArrowDown" || e.code === "KeyS" || e.key === "8") {
          dispatch({ type: "NAVIGATE_MENU", payload: { direction: "DOWN" } });
          tetrisAudio.playButtonTick();
        } else if (e.code === "Enter" || e.code === "Space" || e.key === "5") {
          dispatch({ type: "SELECT_MENU_ITEM" });
          tetrisAudio.playButtonTick();
        }
      } else if (
        state.status === "game-over" ||
        state.status === "high-scores" ||
        state.status === "instructions"
      ) {
        if (e.code === "Enter" || e.code === "Space" || e.code === "Escape" || e.key === "5") {
          dispatch({ type: "SELECT_MENU_ITEM" });
          tetrisAudio.playButtonTick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA" || e.key === "4") {
        if (leftTimerRef.current.das) clearTimeout(leftTimerRef.current.das);
        if (leftTimerRef.current.arr) clearInterval(leftTimerRef.current.arr);
      } else if (e.code === "ArrowRight" || e.code === "KeyD" || e.key === "6") {
        if (rightTimerRef.current.das) clearTimeout(rightTimerRef.current.das);
        if (rightTimerRef.current.arr) clearInterval(rightTimerRef.current.arr);
      } else if (e.code === "ArrowDown" || e.code === "KeyS" || e.key === "8") {
        dispatch({ type: "SOFT_DROP_END" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (leftTimerRef.current.das) clearTimeout(leftTimerRef.current.das);
      if (leftTimerRef.current.arr) clearInterval(leftTimerRef.current.arr);
      if (rightTimerRef.current.das) clearTimeout(rightTimerRef.current.das);
      if (rightTimerRef.current.arr) clearInterval(rightTimerRef.current.arr);
    };
  }, [state.status, state.settings, dispatch]);
}
