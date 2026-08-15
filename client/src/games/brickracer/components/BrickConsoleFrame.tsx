interface BrickConsoleFrameProps {
  children: React.ReactNode;
}

export function BrickConsoleFrame({ children }: BrickConsoleFrameProps) {
  return (
    <div className="relative flex flex-col items-center bg-[#E4B128] border-4 border-[#9E7307] rounded-[44px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_2px_6px_rgba(255,255,255,0.4)] max-w-sm w-full mx-auto select-none">
      {/* Top Printed Console Header */}
      <div className="w-full flex items-center justify-between px-3 mb-2">
        <div className="text-[13px] font-black tracking-widest text-[#593E03] uppercase">
          BRICK GAME
        </div>
        <div className="px-2 py-0.5 rounded bg-[#9E7307] text-[#FFF6D6] font-black text-[10px] tracking-wider">
          9999 IN 1
        </div>
      </div>

      {/* Brand Subtitle */}
      <div className="text-[10px] font-black tracking-[0.2em] text-[#7A5504] uppercase mb-3">
        FORMULA 1 • BHALYAM
      </div>

      {/* Screen & Keypad Container */}
      {children}
    </div>
  );
}
