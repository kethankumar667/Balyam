import { useEffect } from "react";
import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types";
import { DEFAULT_BINDINGS, type Bindings, type Control } from "../arcade/storage";

export function useKeyboardControls(state: GameState, dispatch: Dispatch<GameAction>, bindings: Bindings = DEFAULT_BINDINGS) {
  useEffect(() => {
    let delay: ReturnType<typeof setTimeout> | undefined;
    let repeat: ReturnType<typeof setInterval> | undefined;
    let held: string | null = null;
    const stop = () => {
      clearTimeout(delay);
      clearInterval(repeat);
      held = null;
      dispatch({ type: "SOFT_DROP_END" });
    };
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (
        event.target.closest("input, textarea, select, a, [contenteditable], [role=dialog]") ||
        event.target.closest("button") && (event.code === "Space" || event.code === "Enter")
      ) || document.querySelector('[role="dialog"]')) return;
      const control = (Object.keys(bindings) as Control[]).find(key => bindings[key] === event.code);
      if (!control || !["playing", "line-clearing", "paused"].includes(state.status)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (state.status === "paused" && control !== "PAUSE_TOGGLE") return;
      dispatch({ type: control });
      if (control === "MOVE_LEFT" || control === "MOVE_RIGHT") {
        clearTimeout(delay);
        clearInterval(repeat);
        held = event.code;
        delay = setTimeout(() => {
          dispatch({ type: control });
          repeat = setInterval(() => dispatch({ type: control }), state.settings.arrMs);
        }, state.settings.dasMs);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === held) stop();
      if (event.code === bindings.SOFT_DROP_START) dispatch({ type: "SOFT_DROP_END" });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    return () => {
      clearTimeout(delay);
      clearInterval(repeat);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
    };
  }, [state.status, state.settings.arrMs, state.settings.dasMs, dispatch, bindings]);
}
