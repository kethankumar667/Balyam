import React from "react";
import type { GameAction } from "../types";

interface InstructionsScreenProps {
  dispatch: React.Dispatch<GameAction>;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ dispatch }) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 bg-[#8BAC0F] text-[#0F380F] select-none font-mono">
      <div className="text-center pt-1 border-b border-[#306230] pb-1">
        <h2 className="text-base font-black tracking-wider uppercase">
          HOW TO PLAY
        </h2>
        <span className="text-[10px] text-[#306230]">BRICK GAME CONTROLS</span>
      </div>

      <div className="my-auto flex flex-col gap-1.5 text-[10.5px] px-1">
        <div className="flex justify-between">
          <span className="text-[#306230]">4 / LEFT:</span>
          <span className="font-bold">MOVE LEFT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">6 / RIGHT:</span>
          <span className="font-bold">MOVE RIGHT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">8 / DOWN:</span>
          <span className="font-bold">SOFT DROP</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">2 / UP / W:</span>
          <span className="font-bold">ROTATE CW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">Z / 1:</span>
          <span className="font-bold">ROTATE CCW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">SPACE:</span>
          <span className="font-bold">HARD DROP</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">0 / C / SHIFT:</span>
          <span className="font-bold">HOLD PIECE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230]">5 / P:</span>
          <span className="font-bold">PAUSE / OK</span>
        </div>
      </div>

      <div className="pb-1">
        <button
          onClick={() => dispatch({ type: "BACK_TO_MENU" })}
          className="w-full px-3 py-1.5 bg-[#0F380F] text-[#8BAC0F] rounded text-xs font-bold hover:opacity-90"
        >
          BACK TO MENU (5)
        </button>
      </div>
    </div>
  );
};
