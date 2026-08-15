interface NokiaKeypadProps {
  onKeyPress: (key: string) => void;
}

export function NokiaKeypad({ onKeyPress }: NokiaKeypadProps) {
  const keys = [
    ["1", "2\nABC", "3\nDEF"],
    ["4\n◄ PULL", "5\n▲ DRIVE", "6\n► CUT"],
    ["7\nPQRS", "8\nTUV", "9\nWXYZ"],
    ["*", "0\n+", "#"],
  ];

  return (
    <div className="w-full max-w-[280px] mt-4 flex flex-col items-center gap-2">
      {/* Soft Action Navigation Keys */}
      <div className="w-full flex justify-between px-1 gap-3">
        <button
          type="button"
          onClick={() => onKeyPress("SOFT_L")}
          className="flex-1 py-2.5 rounded-t-2xl bg-[#36495C] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[11px] uppercase tracking-wider active:translate-y-0.5 shadow-md transition-transform cursor-pointer"
        >
          Options
        </button>
        <button
          type="button"
          onClick={() => onKeyPress("SOFT_R")}
          className="flex-1 py-2.5 rounded-t-2xl bg-[#36495C] border-b-2 border-[#1E2B38] text-[#DCE4EC] font-black text-[11px] uppercase tracking-wider active:translate-y-0.5 shadow-md transition-transform cursor-pointer"
        >
          Back
        </button>
      </div>

      {/* 3x4 Rubber Tactile Keypad */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {keys.flat().map((k) => {
          const [primary, secondary] = k.split("\n");
          const isActionKey = primary === "4" || primary === "5" || primary === "6";

          return (
            <button
              key={primary}
              type="button"
              onClick={() => onKeyPress(primary)}
              className={`h-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center border-b-2 transition-all active:scale-95 shadow-sm cursor-pointer ${
                isActionKey
                  ? "bg-gradient-to-b from-[#E68A2E] to-[#C96B12] border-[#8C4605] text-white ring-2 ring-amber-400/60 shadow-amber-900/30"
                  : "bg-gradient-to-b from-[#3E5266] to-[#2E3F50] border-[#1B2632] text-[#DCE4EC] hover:brightness-105"
              }`}
            >
              <span className="text-[15px] font-black leading-none">{primary}</span>
              {secondary && (
                <span
                  className={`text-[8.5px] font-extrabold tracking-tighter ${
                    isActionKey ? "text-amber-100" : "text-zinc-400"
                  }`}
                >
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
