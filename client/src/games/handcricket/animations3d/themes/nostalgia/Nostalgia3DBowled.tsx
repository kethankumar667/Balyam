import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DBowled({
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
  const headline = isYorker ? "YORKER OUT! ⚡" : "BOWLED OUT! 🎯";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-mono">
      <div className="text-4xl mb-2 animate-bounce">🪵💥</div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="splinters" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(52px, 16vw, 120px)",
          color: "#DC2626",
          textShadow: "4px 4px 0 #FEE2E2, 8px 8px 0 #991B1B",
          transform: "rotate(-2deg)",
        }}
      >
        {headline}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-red-500 bg-[#FFFDF5] px-6 py-2.5 shadow-xl rounded-md">
        <span className="text-sm sm:text-base font-black text-red-900 uppercase tracking-wider">
          {batter} b {bowler}
        </span>
        <span className="text-red-300">•</span>
        <span className="text-xs sm:text-sm font-bold text-red-700">
          {message ?? "Wooden wickets knocked down!"}
        </span>
      </div>
    </div>
  );
}
