import React from "react";

interface InstructionsScreenProps {
  onBack: () => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onBack }) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-[#8bac0f] text-[#0f380f] font-mono p-3 select-none z-20">
      <div className="flex flex-col items-center border-b border-[#306230] pb-1">
        <h3 className="text-sm font-black uppercase tracking-wider">HOW TO PLAY</h3>
      </div>

      <div className="flex flex-col gap-1.5 text-[11px] leading-tight">
        <div className="flex justify-between">
          <span className="text-[#306230] font-bold">MOVE SHIP:</span>
          <span className="font-black">LEFT / RIGHT (A / D)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230] font-bold">FIRE LASER:</span>
          <span className="font-black">SPACE / UP / 5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#306230] font-bold">PAUSE:</span>
          <span className="font-black">P / ESC</span>
        </div>

        <div className="border-t border-[#306230]/40 pt-1.5 mt-1 space-y-1">
          <p>👾 <strong>BASIC ALIEN:</strong> 10 PTS (1 HP)</p>
          <p>🛡️ <strong>ARMORED ALIEN:</strong> 25 PTS (2 HP)</p>
          <p>👑 <strong>COMMANDER:</strong> 50 PTS (2 HP)</p>
          <p className="text-[10px] text-[#306230] mt-1 font-bold">
            Destroy the entire swarm before they descend into your base defense row!
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full py-1.5 bg-[#0f380f] text-[#9bbc0f] text-xs font-black rounded border border-[#0f380f] cursor-pointer active:scale-95 text-center uppercase"
      >
        ◀ BACK TO MENU
      </button>
    </div>
  );
};

export default InstructionsScreen;
