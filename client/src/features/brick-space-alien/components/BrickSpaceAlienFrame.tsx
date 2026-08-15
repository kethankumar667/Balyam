import React from "react";

interface BrickSpaceAlienFrameProps {
  children: React.ReactNode;
}

export const BrickSpaceAlienFrame: React.FC<BrickSpaceAlienFrameProps> = ({ children }) => {
  return (
    <div className="relative flex flex-col items-center bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border-4 border-[#334155] rounded-[36px] p-4 sm:p-5 shadow-2xl w-full max-w-[340px] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <span className="text-[11px] font-black tracking-widest text-[#38bdf8] font-mono uppercase">
          BRICK GAME • 9999 IN 1
        </span>
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Screen Enclosure */}
      <div className="relative p-2.5 bg-[#0b101c] rounded-2xl border-2 border-[#1e293b] shadow-inner flex flex-col items-center w-full">
        {children}
      </div>

      {/* Console Model Subtitle */}
      <div className="text-[9px] font-mono text-[#64748b] mt-3 tracking-widest uppercase">
        SPACE INVADER • 10×20 LCD MATRIX
      </div>
    </div>
  );
};

export default BrickSpaceAlienFrame;
