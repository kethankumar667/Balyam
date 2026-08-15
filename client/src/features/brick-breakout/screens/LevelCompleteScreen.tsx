import React from "react";
import type { GameAction, GameState } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";
import { breakoutAudio } from "../services/audioService";

interface LevelCompleteScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const LevelCompleteScreen: React.FC<LevelCompleteScreenProps> = ({ state, dispatch }) => {
  const bonus = BREAKOUT_CONSTANTS.SCORE_LEVEL_CLEAR_BASE * state.level;

  const handleNext = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "NEXT_LEVEL" });
  };

  return (
    <div className="absolute inset-0 bg-[#0f380f]/90 text-[#9bbc0f] p-4 flex flex-col items-center justify-between text-center font-mono select-none z-20 backdrop-blur-xs">
      <div className="flex flex-col items-center pt-8 gap-2">
        <div className="text-xl font-black tracking-widest text-amber-300">
          🏆 LEVEL {state.level} CLEAR!
        </div>
        <div className="text-xs text-[#9bbc0f] font-bold">
          BONUS: +{bonus} PTS
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 bg-[#051605]/80 px-4 py-2.5 rounded border border-[#8bac0f]/40 w-full max-w-[200px]">
        <span className="text-[10px] uppercase opacity-75">CURRENT SCORE</span>
        <span className="text-xl font-black">{state.score.toString().padStart(6, "0")}</span>
      </div>

      <div className="w-full max-w-[200px] pb-6">
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-2.5 rounded bg-[#8bac0f] hover:bg-[#9bbc0f] text-[#0f380f] font-black text-sm uppercase tracking-wider shadow active:scale-95 transition cursor-pointer"
        >
          ▶ NEXT LEVEL ({state.level + 1})
        </button>
      </div>
    </div>
  );
};

export default LevelCompleteScreen;
