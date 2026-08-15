import React from "react";

interface WaveCompleteScreenProps {
  wave: number;
  bonus: number;
}

export const WaveCompleteScreen: React.FC<WaveCompleteScreenProps> = ({ wave, bonus }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#8bac0f]/90 text-[#0f380f] font-mono p-4 select-none z-20">
      <div className="flex flex-col items-center gap-2 border-2 border-[#0f380f] p-4 rounded-lg bg-[#9bbc0f] w-full max-w-[200px] shadow-lg">
        <span className="text-2xl">⭐ 🏆 ⭐</span>
        <h3 className="text-sm font-black tracking-widest uppercase">WAVE {wave} CLEARED!</h3>
        <p className="text-xs font-bold text-[#306230]">
          BONUS: +{bonus} PTS
        </p>
        <span className="text-[10px] text-[#306230] animate-pulse">WARPING TO NEXT WAVE...</span>
      </div>
    </div>
  );
};

export default WaveCompleteScreen;
