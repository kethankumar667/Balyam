import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DStreak({
  batter,
  title,
  message,
  variant,
}: {
  batter: string;
  title: string;
  message?: string;
  variant: "sixes" | "fours" | "mixed";
}) {
  const icon = variant === "sixes" ? "🚀" : variant === "fours" ? "⚡" : "🔥";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="flex items-center gap-2 text-4xl mb-2 animate-pulse">
        <span>{icon}</span>
        <span>{icon}</span>
        <span>{icon}</span>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="sparks" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(48px, 14vw, 110px)",
          background: "linear-gradient(180deg, #FFFFFF 0%, #FBBF24 50%, #EA580C 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.9))",
          textShadow: "0 3px 0 #D97706, 0 6px 0 #9A3412, 0 9px 0 #451A03",
        }}
      >
        {title}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-amber-400/50 bg-slate-950/90 px-6 py-2.5 shadow-2xl backdrop-blur-md">
        <span className="text-sm sm:text-base font-black text-amber-200 uppercase tracking-wider">
          {batter}
        </span>
        <span className="text-white/40">•</span>
        <span className="text-xs sm:text-sm font-bold text-white/90">
          {message}
        </span>
      </div>
    </div>
  );
}
