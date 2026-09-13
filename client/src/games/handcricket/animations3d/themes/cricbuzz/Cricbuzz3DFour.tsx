import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DFour({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/50 px-4 py-1 text-xs font-mono font-bold text-[#60A5FA] uppercase tracking-widest mb-2 animate-pulse">
        <span>⚡ SPEED GUN: 142.4 KM/H · GAP PIERCED</span>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="sparks" intensity={1.2} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(72px, 20vw, 170px)",
          background: "linear-gradient(180deg, #BAE6FD 0%, #38BDF8 50%, #0369A1 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 20px rgba(56, 189, 248, 0.5))",
          textShadow: "0 2px 0 #0284C7, 0 5px 0 #075985, 0 8px 16px rgba(0,0,0,0.9)",
        }}
      >
        FOUR!
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-sky-500/40 bg-[#0E1815]/95 px-6 py-2.5 shadow-2xl backdrop-blur-md">
        <span className="text-sm sm:text-base font-black text-sky-300 uppercase tracking-wider font-mono">
          {batter}
        </span>
        <span className="text-white/40">•</span>
        <span className="text-xs sm:text-sm font-bold text-white/90">
          {message ?? "Timed to perfection to the boundary rope!"}
        </span>
      </div>
    </div>
  );
}
