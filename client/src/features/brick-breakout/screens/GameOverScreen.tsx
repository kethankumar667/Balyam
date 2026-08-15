import React from "react";
import type { GameAction, GameState } from "../types";
import { breakoutAudio } from "../services/audioService";

interface GameOverScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ state, dispatch }) => {
  const isNewHigh = state.score > 0 && state.score >= state.highScore;

  const handleRestart = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "RESTART" });
  };

  const handleMenu = () => {
    breakoutAudio.playButtonClick();
    dispatch({ type: "OPEN_MENU" });
  };

  return (
    <div className="absolute inset-0 bg-[#0f380f]/95 text-[#9bbc0f] p-4 flex flex-col items-center justify-between text-center font-mono select-none z-20 backdrop-blur-xs">
      <div className="flex flex-col items-center pt-6 gap-2">
        <div className="text-2xl font-black tracking-widest text-red-500 animate-pulse">
          GAME OVER
        </div>
        {isNewHigh && (
          <div className="text-xs bg-amber-400 text-black px-2 py-0.5 rounded font-black tracking-wider animate-bounce">
            ★ NEW HIGH SCORE! ★
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 bg-[#051605]/80 p-3 rounded border border-[#8bac0f]/40 w-full max-w-[200px]">
        <div className="flex justify-between text-xs">
          <span className="opacity-75">FINAL SCORE:</span>
          <span className="font-bold">{state.score}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="opacity-75">HIGH SCORE:</span>
          <span className="font-bold">{state.highScore}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="opacity-75">LEVEL REACHED:</span>
          <span className="font-bold">{state.level}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[200px] pb-6">
        <button
          type="button"
          onClick={handleRestart}
          className="w-full py-2.5 rounded bg-[#8bac0f] hover:bg-[#9bbc0f] text-[#0f380f] font-black text-sm uppercase tracking-wider shadow active:scale-95 transition cursor-pointer"
        >
          ⟳ PLAY AGAIN
        </button>

        <button
          type="button"
          onClick={handleMenu}
          className="w-full py-2 rounded bg-[#306230] hover:bg-[#3d7a3d] text-[#9bbc0f] font-bold text-xs uppercase shadow active:scale-95 transition cursor-pointer"
        >
          🏠 MAIN MENU
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
