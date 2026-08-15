import React from "react";
import type { GameAction, GameState } from "../types";
import { breakoutAudio } from "../services/audioService";

interface KeypadProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const Keypad: React.FC<KeypadProps> = ({ state, dispatch }) => {
  const { status, settings } = state;

  const handleLeft = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "MOVE_PADDLE", direction: -1 });
  };

  const handleRight = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "MOVE_PADDLE", direction: 1 });
  };

  const handleAction = () => {
    if (status === "menu") {
      breakoutAudio.playButtonClick();
      dispatch({ type: "START_GAME", level: 1 });
    } else if (status === "serving") {
      breakoutAudio.playBallLaunch();
      dispatch({ type: "LAUNCH_BALL" });
    } else if (status === "level-complete") {
      breakoutAudio.playButtonClick();
      dispatch({ type: "NEXT_LEVEL" });
    } else if (status === "game-over") {
      breakoutAudio.playButtonClick();
      dispatch({ type: "RESTART" });
    } else if (status === "instructions") {
      breakoutAudio.playButtonClick();
      dispatch({ type: "OPEN_MENU" });
    } else if (status === "paused") {
      breakoutAudio.playButtonClick();
      dispatch({ type: "RESUME" });
    }
  };

  const handlePause = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "PAUSE_TOGGLE" });
  };

  const handleSound = () => {
    dispatch({ type: "TOGGLE_SOUND" });
  };

  const handleRestart = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "RESTART" });
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[280px] select-none pt-2">
      {/* Action / Launch Big Yellow Button */}
      <div className="flex justify-center w-full">
        <button
          type="button"
          onClick={handleAction}
          className="w-full h-12 rounded-xl bg-gradient-to-b from-[#e4b128] to-[#b45309] border-2 border-amber-300 text-black font-black text-sm uppercase tracking-wider shadow-lg active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>⚡</span>
          <span>
            {status === "serving"
              ? "LAUNCH BALL"
              : status === "menu"
              ? "START GAME"
              : status === "level-complete"
              ? "NEXT LEVEL"
              : status === "game-over"
              ? "PLAY AGAIN"
              : status === "paused"
              ? "RESUME"
              : "ACTION / LAUNCH"}
          </span>
        </button>
      </div>

      {/* D-Pad Horizontal Movement */}
      <div className="flex items-center justify-between w-full gap-3">
        <button
          type="button"
          onClick={handleLeft}
          disabled={status !== "playing" && status !== "serving"}
          aria-label="Move paddle left"
          className="flex-1 h-14 rounded-xl bg-[#262b1b] hover:bg-[#343b25] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-[#8bac0f]/40 text-[#9bbc0f] font-black text-2xl shadow-lg active:translate-y-0.5 flex items-center justify-center cursor-pointer"
        >
          ◀
        </button>

        <button
          type="button"
          onClick={handleRight}
          disabled={status !== "playing" && status !== "serving"}
          aria-label="Move paddle right"
          className="flex-1 h-14 rounded-xl bg-[#262b1b] hover:bg-[#343b25] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-[#8bac0f]/40 text-[#9bbc0f] font-black text-2xl shadow-lg active:translate-y-0.5 flex items-center justify-center cursor-pointer"
        >
          ▶
        </button>
      </div>

      {/* Auxiliary small buttons: Pause, Sound, Restart */}
      <div className="flex items-center justify-between w-full gap-2 pt-1">
        <button
          type="button"
          onClick={handlePause}
          className="flex-1 py-1.5 rounded-lg bg-[#303820] hover:bg-[#404a2b] border border-[#8bac0f]/30 text-[#8bac0f] font-bold text-xs shadow cursor-pointer uppercase"
        >
          {status === "paused" ? "▶ Play" : "⏸ Pause"}
        </button>

        <button
          type="button"
          onClick={handleSound}
          className="flex-1 py-1.5 rounded-lg bg-[#303820] hover:bg-[#404a2b] border border-[#8bac0f]/30 text-[#8bac0f] font-bold text-xs shadow cursor-pointer uppercase"
        >
          {settings.soundEnabled ? "🔊 Sound" : "🔇 Mute"}
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="flex-1 py-1.5 rounded-lg bg-[#4a1c1c] hover:bg-[#602424] border border-red-500/40 text-red-200 font-bold text-xs shadow cursor-pointer uppercase"
        >
          ⟳ Reset
        </button>
      </div>
    </div>
  );
};

export default Keypad;
