interface BrickKeypadProps {
  onKeyPress: (key: string) => void;
  isBoosting: boolean;
}

export function BrickKeypad({ onKeyPress, isBoosting }: BrickKeypadProps) {
  return (
    <div className="w-full max-w-[280px] mt-4 flex flex-col items-center gap-3 select-none">
      {/* Top Small Action Buttons */}
      <div className="w-full flex justify-between px-2 gap-4">
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          className="flex-1 py-1.5 rounded-full bg-[#D43827] border-b-2 border-[#8A1A0D] text-white font-black text-[10px] uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-sm"
        >
          START / OK (5)
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex-1 py-1.5 rounded-full bg-[#3B5998] border-b-2 border-[#1E305C] text-white font-black text-[10px] uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-sm"
        >
          PAUSE (0)
        </button>
      </div>

      {/* Main Steering & Boost Keypad */}
      <div className="w-full flex items-center justify-between px-2 pt-1 gap-3">
        {/* Left Turn Button */}
        <button
          type="button"
          onClick={() => onKeyPress("4")}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-[#2E333D] to-[#1B1E24] border-b-4 border-[#0F1114] text-white font-black text-[13px] flex flex-col items-center justify-center active:scale-95 shadow-md cursor-pointer hover:brightness-110"
        >
          <span className="text-xl leading-none">◄</span>
          <span className="text-[9px] text-zinc-300 font-bold mt-1">LEFT (4)</span>
        </button>

        {/* Center Boost Button */}
        <button
          type="button"
          onClick={() => onKeyPress("8")}
          className={`flex-1 h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-md cursor-pointer ${
            isBoosting
              ? "bg-gradient-to-b from-[#FF5722] to-[#D84315] border-[#BF360C] text-white ring-2 ring-orange-400"
              : "bg-gradient-to-b from-[#E68A2E] to-[#C96B12] border-[#8C4605] text-white hover:brightness-110"
          }`}
        >
          <span className="text-lg leading-none">🔥</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">
            {isBoosting ? "BOOST ON" : "BOOST (8)"}
          </span>
        </button>

        {/* Right Turn Button */}
        <button
          type="button"
          onClick={() => onKeyPress("6")}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-[#2E333D] to-[#1B1E24] border-b-4 border-[#0F1114] text-white font-black text-[13px] flex flex-col items-center justify-center active:scale-95 shadow-md cursor-pointer hover:brightness-110"
        >
          <span className="text-xl leading-none">►</span>
          <span className="text-[9px] text-zinc-300 font-bold mt-1">RIGHT (6)</span>
        </button>
      </div>
    </div>
  );
}
