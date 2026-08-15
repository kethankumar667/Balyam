import React from "react";
import type { GameState } from "../types";

interface LifeLostScreenProps {
  state: GameState;
}

export const LifeLostScreen: React.FC<LifeLostScreenProps> = ({ state }) => {
  return (
    <div className="absolute inset-0 bg-red-950/40 text-[#9bbc0f] p-4 flex flex-col items-center justify-center text-center font-mono select-none z-10 animate-pulse">
      <div className="text-lg font-black tracking-widest text-red-400 mb-2">
        💀 LIFE LOST!
      </div>
      <div className="text-xs text-[#9bbc0f] font-bold">
        {state.lives} {state.lives === 1 ? "LIFE" : "LIVES"} REMAINING
      </div>
      <div className="text-[10px] text-zinc-300 mt-4 opacity-75">
        GET READY TO SERVE...
      </div>
    </div>
  );
};

export default LifeLostScreen;
