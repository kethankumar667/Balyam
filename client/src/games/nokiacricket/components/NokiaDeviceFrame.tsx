interface NokiaDeviceFrameProps {
  children: React.ReactNode;
}

export function NokiaDeviceFrame({ children }: NokiaDeviceFrameProps) {
  return (
    // `short-land:` — a phone held sideways has ~365px of height, so the handset lays its screen and keypad
    // side by side and drops the earpiece/brand decoration instead of stacking ~760px of device.
    <div className="relative flex flex-col items-center bg-[#283848] border-4 border-[#1A2530] rounded-[48px] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_2px_6px_rgba(255,255,255,0.2)] max-w-sm w-full mx-auto select-none short-land:max-w-none short-land:w-auto short-land:flex-row short-land:gap-4 short-land:rounded-3xl short-land:p-3">
      {/* Top Earpiece Speaker Grille */}
      <div className="w-16 h-2 rounded-full bg-[#182430] border border-[#3A4E62] mb-3 shadow-inner flex items-center justify-center gap-1 short-land:hidden">
        <div className="w-1 h-1 rounded-full bg-black/50" />
        <div className="w-1 h-1 rounded-full bg-black/50" />
        <div className="w-1 h-1 rounded-full bg-black/50" />
      </div>

      {/* Brand Label */}
      <div className="text-[12px] font-black tracking-[0.25em] text-[#8EA1B4] uppercase mb-2 short-land:hidden">
        BHALYAM
      </div>

      {/* Inner Screen Area & Keypad */}
      {children}
    </div>
  );
}
