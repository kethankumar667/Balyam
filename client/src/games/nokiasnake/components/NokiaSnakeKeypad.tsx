interface NokiaSnakeKeypadProps {
  onKeyPress: (key: string) => void;
}

export function NokiaSnakeKeypad({ onKeyPress }: NokiaSnakeKeypadProps) {
  const keys = [
    ["1", "2\n▲ UP", "3"],
    ["4\n◄ LEFT", "5\n● OK", "6\n► RIGHT"],
    ["7", "8\n▼ DOWN", "9"],
    ["*", "0\n⏸ PAUSE", "#"],
  ];

  return (
    <div className="w-full max-w-[320px] mt-3 flex flex-col items-center gap-2.5 select-none font-mono">
      {/* Soft Action Navigation Bar */}
      <div className="w-full flex justify-between px-1 gap-2.5">
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          className="flex-1 min-h-[38px] rounded-xl bg-[#36495C] hover:bg-[#455c74] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[10px] uppercase tracking-wider text-center cursor-pointer hover:brightness-110 active:translate-y-0.5 shadow-sm transition flex items-center justify-center gap-1"
        >
          <span>SELECT / OK (5)</span>
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex-1 min-h-[38px] rounded-xl bg-[#36495C] hover:bg-[#455c74] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[10px] uppercase tracking-wider text-center cursor-pointer hover:brightness-110 active:translate-y-0.5 shadow-sm transition flex items-center justify-center gap-1"
        >
          <span>PAUSE (0)</span>
        </button>
      </div>

      {/* 3x4 Rubber Tactile Keypad with Enlarged Directional Movement Buttons */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {keys.flat().map((k) => {
          const [primary, secondary] = k.split("\n");
          const isDirectional =
            primary === "2" ||
            primary === "4" ||
            primary === "6" ||
            primary === "8";
          const isSelect = primary === "5";
          const isPause = primary === "0";
          const isActive = isDirectional || isSelect || isPause;

          if (!isActive) {
            return (
              <div
                key={primary}
                className="h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center border-b-2 bg-[#253240] border-[#18222C] text-[#556778] opacity-35 select-none"
              >
                <span className="text-xs font-bold leading-none">{primary}</span>
              </div>
            );
          }

          // Large Directional & Action Buttons
          return (
            <button
              key={primary}
              type="button"
              onClick={() => onKeyPress(primary)}
              aria-label={secondary || primary}
              className={`min-h-[58px] sm:min-h-[66px] rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 shadow-md cursor-pointer ${
                isDirectional
                  ? "bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#B45309] border-[#78350F] text-white ring-2 ring-amber-400/80 shadow-amber-950/40 hover:brightness-110"
                  : isSelect
                  ? "bg-gradient-to-b from-[#EA580C] via-[#C2410C] to-[#9A3412] border-[#7C2D12] text-white ring-2 ring-orange-400/80 hover:brightness-110"
                  : "bg-gradient-to-b from-[#3B5998] to-[#1E305C] border-[#121E3B] text-white ring-1 ring-blue-400/40"
              }`}
            >
              <span className="text-xl sm:text-2xl font-black leading-none">{primary}</span>
              {secondary && (
                <span className="text-[9px] font-black tracking-tight text-amber-100 uppercase mt-0.5">
                  {secondary}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
