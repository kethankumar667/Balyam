interface NokiaKeypadProps {
  onKeyPress: (key: string) => void;
}

export function NokiaKeypad({ onKeyPress }: NokiaKeypadProps) {
  return (
    <div className="w-full max-w-[320px] mt-3 flex flex-col items-center gap-2.5 select-none font-mono">
      {/* Soft Action Navigation Bar */}
      <div className="w-full flex justify-between px-1 gap-2.5">
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          className="flex-1 min-h-[38px] rounded-xl bg-[#36495C] hover:bg-[#455c74] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[10px] uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-sm transition"
        >
          SELECT / OK (5)
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex-1 min-h-[38px] rounded-xl bg-[#36495C] hover:bg-[#455c74] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[10px] uppercase tracking-wider text-center cursor-pointer active:translate-y-0.5 shadow-sm transition"
        >
          PAUSE (0)
        </button>
      </div>

      {/* Primary Batting Movement Shot Cluster (Extra Large Touch Targets) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {/* Pull Shot (Left - 4) */}
        <button
          type="button"
          onClick={() => onKeyPress("4")}
          aria-label="Pull Shot Left"
          className="min-h-[64px] sm:min-h-[72px] rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-lg cursor-pointer bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#B45309] border-[#78350F] text-white ring-2 ring-amber-400/80 hover:brightness-110"
        >
          <span className="text-2xl leading-none font-black">◄</span>
          <span className="text-[10px] font-black tracking-tight uppercase mt-1 text-amber-100">
            PULL (4)
          </span>
        </button>

        {/* Straight Drive (Center - 5) */}
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          aria-label="Straight Drive Up"
          className="min-h-[64px] sm:min-h-[72px] rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-lg cursor-pointer bg-gradient-to-b from-[#EA580C] via-[#C2410C] to-[#9A3412] border-[#7C2D12] text-white ring-2 ring-orange-400/80 hover:brightness-110"
        >
          <span className="text-2xl leading-none font-black">▲</span>
          <span className="text-[10px] font-black tracking-tight uppercase mt-1 text-orange-100">
            DRIVE (5)
          </span>
        </button>

        {/* Cut Shot (Right - 6) */}
        <button
          type="button"
          onClick={() => onKeyPress("6")}
          aria-label="Cut Shot Right"
          className="min-h-[64px] sm:min-h-[72px] rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-lg cursor-pointer bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#B45309] border-[#78350F] text-white ring-2 ring-amber-400/80 hover:brightness-110"
        >
          <span className="text-2xl leading-none font-black">►</span>
          <span className="text-[10px] font-black tracking-tight uppercase mt-1 text-amber-100">
            CUT (6)
          </span>
        </button>
      </div>

      {/* Auxiliary Keypad Row: 4 - Sound, 0 - Pause, 6 - High Score */}
      <div className="grid grid-cols-3 gap-2 w-full pt-0.5">
        <button
          type="button"
          onClick={() => onKeyPress("SOUND")}
          aria-label="Toggle Sound (4)"
          className="min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 bg-[#253240] hover:bg-[#2e3e50] border-b-2 border-[#18222C] text-[#8EA1B4] hover:text-[#DCE4EC] text-[11px] font-bold active:translate-y-0.5 cursor-pointer shadow-xs transition"
        >
          <span className="text-xs">🔊</span>
          <span>4 • SOUND</span>
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          aria-label="Pause / Resume (0)"
          className="min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 bg-[#253240] hover:bg-[#2e3e50] border-b-2 border-[#18222C] text-amber-300 hover:text-amber-200 text-[11px] font-bold active:translate-y-0.5 cursor-pointer shadow-xs transition"
        >
          <span>⏸</span>
          <span>0</span>
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("6")}
          aria-label="High Score (6)"
          className="min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 bg-[#253240] hover:bg-[#2e3e50] border-b-2 border-[#18222C] text-[#8EA1B4] hover:text-[#DCE4EC] text-[11px] font-bold active:translate-y-0.5 cursor-pointer shadow-xs transition"
        >
          <span className="text-xs">🏆</span>
          <span>6 • SCORE</span>
        </button>
      </div>
    </div>
  );
}
