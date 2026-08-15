import React from "react";
import type { GameAction } from "../types";

interface PausedOverlayProps {
  dispatch: React.Dispatch<GameAction>;
}

export const PausedOverlay: React.FC<PausedOverlayProps> = ({ dispatch }) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#8BAC0F]/90 backdrop-blur-xs p-6 text-center text-[#0F380F]">
      <div className="border-2 border-[#0F380F] px-6 py-4 rounded bg-[#8BAC0F] shadow-lg flex flex-col gap-3">
        <h2 className="text-xl font-black font-mono tracking-widest uppercase">
          PAUSED
        </h2>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => dispatch({ type: "PAUSE_TOGGLE" })}
            className="px-4 py-1.5 bg-[#0F380F] text-[#8BAC0F] rounded text-xs font-mono font-bold hover:opacity-90"
          >
            RESUME (5 / P)
          </button>
          <button
            onClick={() => dispatch({ type: "BACK_TO_MENU" })}
            className="px-4 py-1.5 bg-[#7F9F0E]/40 border border-[#306230] text-[#0F380F] rounded text-xs font-mono font-bold hover:bg-[#7F9F0E]/70"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
