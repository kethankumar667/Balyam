import React from "react";
import type { GameAction } from "../types";

interface BootScreenProps {
  dispatch: React.Dispatch<GameAction>;
}

export const BootScreen: React.FC<BootScreenProps> = ({ dispatch }) => {
  return (
    <div
      onClick={() => dispatch({ type: "SELECT_MENU_ITEM" })}
      className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 text-center cursor-pointer bg-[#8BAC0F] select-none"
    >
      <div className="pt-4">
        <span className="text-[10px] tracking-[0.3em] font-black uppercase text-[#306230] block">
          9999-in-1 HANDHELD
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-[#0F380F] mt-1 font-mono uppercase">
          BRICK BLOCKS
        </h1>
        <span className="text-[11px] font-bold text-[#306230] tracking-widest uppercase">
          CLASSIC & PENTIX
        </span>
      </div>

      <div className="my-auto flex flex-col items-center gap-2">
        <div className="grid grid-cols-4 gap-1 p-2 border-2 border-[#306230] rounded bg-[#7F9F0E]/40">
          <div className="w-3 h-3 bg-[#0F380F] rounded-xs" />
          <div className="w-3 h-3 bg-[#0F380F] rounded-xs" />
          <div className="w-3 h-3 bg-[#0F380F] rounded-xs" />
          <div className="w-3 h-3 bg-[#0F380F] rounded-xs" />
        </div>
        <p className="text-xs font-mono font-bold text-[#0F380F] animate-pulse mt-3">
          PRESS 5 OR ENTER
        </p>
      </div>

      <div className="pb-2 text-[10px] font-mono text-[#306230]">
        <span>© BHALYAM ARCADE 2026</span>
      </div>
    </div>
  );
};
