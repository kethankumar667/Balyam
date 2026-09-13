import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DBowled({
  batter,
  bowler,
  isYorker,
  message,
}: {
  batter: string;
  bowler: string;
  isYorker?: boolean;
  message?: string;
}) {
  const headline = isYorker ? "MYSTERY YORKER!" : "CLEAN BOWLED!";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      {/* Laser Target Reticle on Middle Stump */}
      <div className="relative h-28 w-48 flex items-center justify-center pointer-events-none">
        <div className="absolute h-24 w-24 rounded-full border border-rose-500 animate-ping opacity-75" />
        <div className="absolute h-16 w-16 rounded-full border-2 border-rose-600 flex items-center justify-center">
          <span className="text-rose-500 font-mono text-xs font-black">LOCKED</span>
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="splinters" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase mt-1"
        style={{
          fontSize: "clamp(56px, 16vw, 120px)",
          background: "linear-gradient(180deg, #FEE2E2 0%, #EF4444 50%, #991B1B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(239, 68, 68, 0.6))",
          textShadow: "0 2px 0 #DC2626, 0 5px 0 #991B1B, 0 8px 16px rgba(0,0,0,0.9)",
        }}
      >
        {headline}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-rose-500/50 bg-[#0E1815]/95 px-6 py-2.5 shadow-2xl backdrop-blur-md">
        <span className="text-sm sm:text-base font-black text-rose-400 uppercase tracking-wider font-mono">
          {batter} b {bowler}
        </span>
        <span className="text-white/40">•</span>
        <span className="text-xs sm:text-sm font-bold text-white/90">
          {message ?? (isYorker ? "Mystery yorker shatters the woodwork!" : "Stumps flattened at 145.8 km/h!")}
        </span>
      </div>
    </div>
  );
}
