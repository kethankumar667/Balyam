import React from "react";

interface BrickSpaceAlienKeypadProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onFire: () => void;
  onPause: () => void;
  onRestart: () => void;
  onConfirm: () => void;
  onNavUp?: () => void;
  onNavDown?: () => void;
}

export const BrickSpaceAlienKeypad: React.FC<BrickSpaceAlienKeypadProps> = ({
  onMoveLeft,
  onMoveRight,
  onFire,
  onPause,
  onRestart,
  onConfirm,
  onNavUp,
  onNavDown,
}) => {
  return (
    <div className="flex flex-col items-center w-full max-w-[340px] mt-4 select-none font-mono">
      {/* Primary Action Buttons Row */}
      <div className="grid grid-cols-3 gap-3 w-full px-2 mb-3">
        {/* Left Move */}
        <button
          type="button"
          onClick={onMoveLeft}
          aria-label="Move Left"
          className="min-h-[48px] rounded-2xl bg-gradient-to-b from-[#24304c] to-[#141b2c] border-2 border-[#3c4f7a] text-white font-black text-sm shadow active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
        >
          <span>◀ LEFT</span>
          <span className="text-[10px] text-zinc-400 font-normal">A / 4</span>
        </button>

        {/* Fire Button (Big Red Center/Action) */}
        <button
          type="button"
          onClick={() => {
            onFire();
            onConfirm();
          }}
          aria-label="Fire Laser / Confirm"
          className="min-h-[48px] rounded-2xl bg-gradient-to-b from-[#d92323] via-[#b31414] to-[#800b0b] border-2 border-[#ff7373] text-white font-black text-sm shadow-[0_4px_0_#540707] active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
        >
          <span>🔥 FIRE</span>
          <span className="text-[10px] text-red-200 font-normal">SPACE / 5</span>
        </button>

        {/* Right Move */}
        <button
          type="button"
          onClick={onMoveRight}
          aria-label="Move Right"
          className="min-h-[48px] rounded-2xl bg-gradient-to-b from-[#24304c] to-[#141b2c] border-2 border-[#3c4f7a] text-white font-black text-sm shadow active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center"
        >
          <span>RIGHT ▶</span>
          <span className="text-[10px] text-zinc-400 font-normal">D / 6</span>
        </button>
      </div>

      {/* Auxiliary Controls (Pause, Restart, Menu Nav) */}
      <div className="grid grid-cols-3 gap-2 w-full px-2">
        <button
          type="button"
          onClick={onPause}
          className="min-h-[44px] rounded-xl bg-[#0f1626] hover:bg-[#18233a] border border-[#263452] text-[#8e9ab5] font-bold text-xs flex items-center justify-center cursor-pointer active:translate-y-0.5"
        >
          ⏸ PAUSE (P)
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="min-h-[44px] rounded-xl bg-[#0f1626] hover:bg-[#18233a] border border-[#263452] text-amber-400 font-bold text-xs flex items-center justify-center cursor-pointer active:translate-y-0.5"
        >
          ↵ ENTER
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="min-h-[44px] rounded-xl bg-[#0f1626] hover:bg-[#18233a] border border-[#263452] text-rose-400 font-bold text-xs flex items-center justify-center cursor-pointer active:translate-y-0.5"
        >
          🔄 RESTART (R)
        </button>
      </div>
    </div>
  );
};

export default BrickSpaceAlienKeypad;
