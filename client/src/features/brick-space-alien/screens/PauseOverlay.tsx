import React from "react";

interface PauseOverlayProps {
  onResume: () => void;
  onQuit: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume, onQuit }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#8bac0f]/95 text-[#0f380f] font-mono p-4 select-none z-20 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-3 border-2 border-[#0f380f] p-4 rounded-lg bg-[#9bbc0f] w-full max-w-[200px] shadow-lg">
        <h3 className="text-base font-black tracking-widest uppercase">PAUSED</h3>

        <button
          type="button"
          onClick={onResume}
          className="w-full py-1.5 bg-[#0f380f] text-[#9bbc0f] text-xs font-black rounded border border-[#0f380f] cursor-pointer active:scale-95"
        >
          RESUME (P)
        </button>

        <button
          type="button"
          onClick={onQuit}
          className="w-full py-1.5 bg-transparent text-[#0f380f] text-xs font-black rounded border border-[#0f380f] hover:bg-[#306230]/20 cursor-pointer active:scale-95"
        >
          QUIT TO MENU
        </button>
      </div>
    </div>
  );
};

export default PauseOverlay;
