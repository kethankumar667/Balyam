interface BrickKeypadProps {
  onKeyPress: (key: string) => void;
  isBoosting: boolean;
}

export function BrickKeypad({ onKeyPress, isBoosting }: BrickKeypadProps) {
  return (
    <div className="w-full max-w-[380px] mt-3 flex flex-col items-center gap-3 select-none font-mono">
      {/* Top Small Action Buttons */}
      <div className="w-full flex justify-between px-1 gap-2.5">
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          className="flex-1 min-h-[42px] rounded-xl bg-gradient-to-b from-[#E53935] to-[#B71C1C] border-b-2 border-[#7F0000] text-white font-black text-xs uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-md hover:brightness-110 flex items-center justify-center gap-1"
        >
          <span>START / OK (5)</span>
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex-1 min-h-[42px] rounded-xl bg-gradient-to-b from-[#3949AB] to-[#1A237E] border-b-2 border-[#0D47A1] text-white font-black text-xs uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-md hover:brightness-110 flex items-center justify-center gap-1"
        >
          <span>PAUSE (0)</span>
        </button>
      </div>

      {/* Main Extra-Large Steering & Boost Controls */}
      <div className="w-full grid grid-cols-3 gap-2.5 px-1 pt-1">
        {/* Left Steering Button */}
        <button
          type="button"
          onClick={() => onKeyPress("4")}
          aria-label="Steer Left"
          className="min-h-[72px] sm:min-h-[80px] rounded-2xl bg-gradient-to-b from-[#374151] via-[#1F2937] to-[#111827] border-b-4 border-[#030712] text-white font-black flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:brightness-125 ring-2 ring-zinc-500/40"
        >
          <span className="text-3xl leading-none font-black text-amber-400">◄</span>
          <span className="text-[10px] text-zinc-300 font-black tracking-wider uppercase mt-1">
            LEFT (4)
          </span>
        </button>

        {/* Center Nitro Boost Button */}
        <button
          type="button"
          onClick={() => onKeyPress("8")}
          aria-label="Nitro Speed Boost"
          className={`min-h-[72px] sm:min-h-[80px] rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-xl cursor-pointer ${
            isBoosting
              ? "bg-gradient-to-b from-[#FF5722] via-[#E64A19] to-[#BF360C] border-[#870000] text-white ring-4 ring-orange-400 animate-pulse scale-[1.02]"
              : "bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#B45309] border-[#78350F] text-white ring-2 ring-amber-400/80 hover:brightness-110"
          }`}
        >
          <span className="text-2xl leading-none font-black">🔥</span>
          <span className="text-[10px] font-black uppercase tracking-tight mt-1">
            {isBoosting ? "BOOST ON" : "NITRO (8)"}
          </span>
        </button>

        {/* Right Steering Button */}
        <button
          type="button"
          onClick={() => onKeyPress("6")}
          aria-label="Steer Right"
          className="min-h-[72px] sm:min-h-[80px] rounded-2xl bg-gradient-to-b from-[#374151] via-[#1F2937] to-[#111827] border-b-4 border-[#030712] text-white font-black flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:brightness-125 ring-2 ring-zinc-500/40"
        >
          <span className="text-3xl leading-none font-black text-amber-400">►</span>
          <span className="text-[10px] text-zinc-300 font-black tracking-wider uppercase mt-1">
            RIGHT (6)
          </span>
        </button>
      </div>
    </div>
  );
}
