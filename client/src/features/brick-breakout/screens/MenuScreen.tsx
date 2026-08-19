import React from "react";
import type { GameAction, GameState } from "../types";
import { breakoutAudio } from "../services/audioService";

interface MenuScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ state, dispatch }) => {
  const handleStart = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "START_GAME", level: 1 });
  };

  const handleInstructions = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "OPEN_INSTRUCTIONS" });
  };

  return (
    <div className="absolute inset-0 bg-[#0f380f]/90 text-[#9bbc0f] p-3 flex flex-col items-center justify-between text-center font-mono select-none z-20 backdrop-blur-xs">
      <div className="flex flex-col items-center pt-3 gap-1">
        <div className="text-base font-black tracking-widest text-[#9bbc0f] animate-pulse">
          🧱 BRICK BREAKOUT 🧱
        </div>
        <div className="text-[9.5px] tracking-wider text-[#8bac0f] uppercase">
          9999-in-1 Retro Classic
        </div>
      </div>

      {/* High score info */}
      <div className="flex flex-col items-center gap-0.5 bg-[#051605]/80 px-3 py-1.5 rounded border border-[#8bac0f]/40">
        <span className="text-[9px] uppercase opacity-75">ALL-TIME BEST</span>
        <span className="text-base font-bold">{state.highScore.toString().padStart(6, "0")}</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 w-full max-w-[170px] pb-3">
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-2 rounded bg-[#8bac0f] hover:bg-[#9bbc0f] text-[#0f380f] font-black text-xs uppercase tracking-wider shadow active:scale-95 transition cursor-pointer"
        >
          ▶ START GAME
        </button>

        <button
          type="button"
          onClick={handleInstructions}
          className="w-full py-1.5 rounded bg-[#306230] hover:bg-[#3d7a3d] text-[#9bbc0f] font-bold text-[10.5px] uppercase tracking-wider border border-[#8bac0f]/40 shadow active:scale-95 transition cursor-pointer"
        >
          📖 HOW TO PLAY
        </button>
      </div>
    </div>
  );
};

export default MenuScreen;
