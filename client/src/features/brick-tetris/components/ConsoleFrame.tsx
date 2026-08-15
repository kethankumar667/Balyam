import React from "react";

interface ConsoleFrameProps {
  children: React.ReactNode;
}

export const ConsoleFrame: React.FC<ConsoleFrameProps> = ({ children }) => {
  return (
    <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[420px] bg-[#537332] p-4 sm:p-5 rounded-3xl border-4 border-[#354E1E] shadow-2xl flex flex-col items-center gap-4 select-none">
      {/* Console Brand Header */}
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E4B128] shadow-xs" />
          <span className="text-xs font-black font-mono tracking-widest text-[#9BBC0F] uppercase">
            BHALYAM 9999-in-1
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#8BAC0F]/80">
          E-99 BLOCK PUZZLE
        </span>
      </div>

      {/* Main Bezel Display Screen */}
      <div className="relative w-full bg-[#306230] p-2.5 sm:p-3 rounded-2xl border-2 border-[#1E3010] shadow-inner flex flex-col items-center">
        {children}
      </div>

      {/* Bottom Speaker Grille Slots */}
      <div className="flex justify-between w-full px-4 items-center">
        <div className="flex gap-1.5">
          <div className="w-8 h-1 bg-[#354E1E] rounded-full" />
          <div className="w-8 h-1 bg-[#354E1E] rounded-full" />
          <div className="w-8 h-1 bg-[#354E1E] rounded-full" />
        </div>
        <span className="text-[9px] font-mono text-[#8BAC0F]/70 uppercase">
          HI-SCORE MEMORY
        </span>
      </div>
    </div>
  );
};
