import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DStreak({
  batter,
  title,
  message,
}: {
  batter: string;
  title: string;
  message?: string;
  variant: "sixes" | "fours" | "mixed";
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#00B38A]/20 border border-[#00B38A]/60 px-4 py-1 text-xs font-mono font-bold text-[#34D399] uppercase tracking-widest mb-2 animate-pulse">
        <span>⚡ POWER OVERLOAD · HOT STREAK</span>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="sparks" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(48px, 14vw, 110px)",
          background: "linear-gradient(180deg, #A7F3D0 0%, #00B38A 50%, #064E3B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(0, 179, 138, 0.6))",
          textShadow: "0 3px 0 #047857, 0 6px 0 #064E3B, 0 10px 20px rgba(0,0,0,0.9)",
        }}
      >
        {title}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-[#00B38A]/50 bg-[#0E1815]/95 px-6 py-2.5 shadow-2xl backdrop-blur-md">
        <span className="text-sm sm:text-base font-black text-[#34D399] uppercase tracking-wider font-mono">
          {batter}
        </span>
        <span className="text-white/40">•</span>
        <span className="text-xs sm:text-sm font-bold text-white/90 font-mono">
          {message}
        </span>
      </div>
    </div>
  );
}
