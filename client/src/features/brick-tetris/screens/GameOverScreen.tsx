import React, { useEffect } from "react";
import type { GameAction, GameState } from "../types";
import { saveTetrisMatchResult } from "../services/storageService";
import { tetrisAudio } from "../services/audioService";

interface GameOverScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ state, dispatch }) => {
  useEffect(() => {
    tetrisAudio.playGameOver();
    saveTetrisMatchResult(state.score, state.linesCleared, state.level, state.mode);
  }, [state.score, state.linesCleared, state.level, state.mode]);

  const isNewRecord = state.score >= state.highScore && state.score > 0;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-5 bg-[#8BAC0F] text-[#0F380F] select-none text-center">
      <div className="pt-2">
        <h2 className="text-xl font-black font-mono tracking-widest uppercase">
          GAME OVER
        </h2>
        {isNewRecord && (
          <span className="inline-block px-2 py-0.5 mt-1 bg-[#0F380F] text-[#8BAC0F] text-[10px] font-black uppercase rounded animate-bounce">
            ★ NEW HIGH SCORE ★
          </span>
        )}
      </div>

      <div className="my-auto flex flex-col gap-1.5 font-mono text-xs w-full max-w-[180px]">
        <div className="flex justify-between border-b border-[#306230]/40 pb-1">
          <span className="text-[#306230]">SCORE:</span>
          <span className="font-bold">{state.score}</span>
        </div>
        <div className="flex justify-between border-b border-[#306230]/40 pb-1">
          <span className="text-[#306230]">LINES:</span>
          <span className="font-bold">{state.linesCleared}</span>
        </div>
        <div className="flex justify-between border-b border-[#306230]/40 pb-1">
          <span className="text-[#306230]">LEVEL:</span>
          <span className="font-bold">{state.level}</span>
        </div>
        <div className="flex justify-between border-b border-[#306230]/40 pb-1">
          <span className="text-[#306230]">BEST:</span>
          <span className="font-bold">{state.highScore}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[180px] pb-2">
        <button
          onClick={() => dispatch({ type: "RESTART_GAME" })}
          className="px-4 py-2 bg-[#0F380F] text-[#8BAC0F] rounded text-xs font-mono font-bold hover:opacity-90 transition-all"
        >
          PLAY AGAIN (5)
        </button>
        <button
          onClick={() => dispatch({ type: "BACK_TO_MENU" })}
          className="px-4 py-1.5 bg-[#7F9F0E]/40 border border-[#306230] text-[#0F380F] rounded text-xs font-mono font-bold hover:bg-[#7F9F0E]/70"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
};
