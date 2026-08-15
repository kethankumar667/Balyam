import React from "react";

export const BootScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#8bac0f] text-[#0f380f] font-mono p-4 select-none z-20">
      <div className="flex flex-col items-center gap-2 animate-pulse">
        <span className="text-3xl">👾 🚀 👾</span>
        <h2 className="text-xl font-black tracking-widest uppercase">SPACE ALIEN</h2>
        <span className="text-xs font-bold text-[#306230] tracking-wider">BRICK INVADERS 1989</span>
      </div>
      <div className="mt-6 flex items-center gap-1.5 text-[10px] text-[#306230]">
        <span className="w-2 h-2 rounded-full bg-[#0f380f] animate-ping" />
        <span>INITIALIZING LCD MATRIX...</span>
      </div>
    </div>
  );
};

export default BootScreen;
