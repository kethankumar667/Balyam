import React from "react";
import type { GameState } from "../types";

interface HeaderHudProps {
  state: GameState;
}

export const HeaderHud: React.FC<HeaderHudProps> = ({ state }) => {
  return (
    <div className="flex flex-col gap-1 w-full bg-[#8BAC0F] border-2 border-[#306230] p-2 rounded shadow-inner select-none font-mono text-[#0F380F]">
      <div className="flex justify-between items-center text-[10px] border-b border-[#306230]/40 pb-1">
        <span className="font-bold uppercase tracking-wider">{state.mode}</span>
        <span className="text-[#306230]">BEST: {state.highScore}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 pt-1 text-center">
        <div className="flex flex-col bg-[#7F9F0E]/30 p-1 rounded">
          <span className="text-[8px] text-[#306230]">SCORE</span>
          <span className="text-xs font-bold">{state.score}</span>
        </div>
        <div className="flex flex-col bg-[#7F9F0E]/30 p-1 rounded">
          <span className="text-[8px] text-[#306230]">LINES</span>
          <span className="text-xs font-bold">{state.linesCleared}</span>
        </div>
        <div className="flex flex-col bg-[#7F9F0E]/30 p-1 rounded">
          <span className="text-[8px] text-[#306230]">LEVEL</span>
          <span className="text-xs font-bold">{state.level}</span>
        </div>
      </div>

      {(state.backToBack || state.combo > 0) && (
        <div className="flex justify-between text-[8.5px] pt-1 text-[#0F380F] font-bold">
          {state.backToBack && <span className="bg-[#7F9F0E]/60 px-1 rounded">B2B ★</span>}
          {state.combo > 0 && <span className="bg-[#7F9F0E]/60 px-1 rounded">COMBO x{state.combo}</span>}
        </div>
      )}
    </div>
  );
};
