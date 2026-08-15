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
    <div className="w-full max-w-[280px] mt-4 flex flex-col items-center gap-2 select-none">
      {/* Soft Action Navigation Bar */}
      <div className="w-full flex justify-between px-1 gap-3">
        <button
          type="button"
          onClick={() => onKeyPress("5")}
          className="flex-1 py-1.5 rounded-t-xl bg-[#36495C] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-bold text-[9px] uppercase tracking-wider text-center cursor-pointer hover:brightness-110 active:translate-y-0.5"
        >
          Options
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex-1 py-1.5 rounded-t-xl bg-[#36495C] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-bold text-[9px] uppercase tracking-wider text-center cursor-pointer hover:brightness-110 active:translate-y-0.5"
        >
          Pause
        </button>
      </div>

      {/* 3x4 Rubber Tactile Keypad */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {keys.flat().map((k) => {
          const [primary, secondary] = k.split("\n");
          const isActive =
            primary === "2" ||
            primary === "4" ||
            primary === "5" ||
            primary === "6" ||
            primary === "8" ||
            primary === "0";

          if (!isActive) {
            return (
              <div
                key={primary}
                className="h-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center border-b-2 bg-[#253240] border-[#18222C] text-[#556778] opacity-35 select-none"
              >
                <span className="text-[14px] font-bold leading-none">{primary}</span>
              </div>
            );
          }

          return (
            <button
              key={primary}
              type="button"
              onClick={() => onKeyPress(primary)}
              className="h-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center border-b-2 transition-all active:scale-95 shadow-md cursor-pointer bg-gradient-to-b from-[#E68A2E] to-[#C96B12] border-[#8C4605] text-white ring-2 ring-amber-400/60 shadow-amber-900/30 hover:brightness-110"
            >
              <span className="text-[15px] font-black leading-none">{primary}</span>
              {secondary && (
                <span className="text-[8px] font-black tracking-tighter text-amber-100 uppercase mt-0.5">
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
