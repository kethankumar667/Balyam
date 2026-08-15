import React from "react";

interface LifeLostOverlayProps {
  lives: number;
}

export const LifeLostOverlay: React.FC<LifeLostOverlayProps> = ({ lives }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#8bac0f]/90 text-[#0f380f] font-mono p-4 select-none z-20">
      <div className="flex flex-col items-center gap-2 border-2 border-[#0f380f] p-4 rounded-lg bg-[#9bbc0f] w-full max-w-[200px] shadow-lg animate-bounce">
        <span className="text-2xl">💥</span>
        <h3 className="text-sm font-black tracking-widest uppercase">SHIP DESTROYED!</h3>
        <p className="text-xs font-bold text-[#306230]">
          LIVES REMAINING: {Math.max(0, lives)}
        </p>
      </div>
    </div>
  );
};

export default LifeLostOverlay;
