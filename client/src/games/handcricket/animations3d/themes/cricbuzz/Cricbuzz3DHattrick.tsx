import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DHattrick({
  bowler,
  message,
}: {
  bowler: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 border border-rose-500/60 px-4 py-1 text-xs font-mono font-bold text-rose-400 uppercase tracking-widest mb-2 animate-pulse">
        <span>⚡ 3 CONSECUTIVE DISMISSALS CONFIRMED</span>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="sparks" intensity={1.8} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(54px, 16vw, 130px)",
          background: "linear-gradient(180deg, #FEE2E2 0%, #EF4444 50%, #991B1B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(239, 68, 68, 0.7))",
          textShadow: "0 3px 0 #DC2626, 0 6px 0 #991B1B, 0 9px 0 #450A0A",
        }}
      >
        HAT-TRICK!
      </div>

      <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-rose-500/50 bg-[#0E1815]/95 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="text-left font-mono">
          <div className="text-base sm:text-lg font-black text-rose-400 uppercase tracking-wider">
            {bowler} — HAT-TRICK FEAT
          </div>
          <div className="text-xs font-bold text-white/90">
            {message ?? "Three wickets in consecutive deliveries!"}
          </div>
        </div>
      </div>
    </div>
  );
}
