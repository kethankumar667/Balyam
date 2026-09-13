import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DMilestone({
  batter,
  runs,
  balls,
  fours,
  sixes,
}: {
  batter: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
}) {
  const isCentury = runs >= 100;
  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes hawkeye-track-arc {
          0% { stroke-dashoffset: 400; opacity: 0; }
          40% { stroke-dashoffset: 0; opacity: 1; filter: drop-shadow(0 0 10px #00B38A); }
          100% { stroke-dashoffset: 0; opacity: 0.6; }
        }
        @keyframes digital-block-reveal {
          0% { transform: scale(0.2) rotateY(90deg); opacity: 0; }
          50% { transform: scale(1.15) rotateY(-10deg); opacity: 1; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
      `}</style>

      {/* Hawk-Eye 3D Trajectory Telemetry Arc */}
      <div className="relative h-28 w-80 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
        <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
          <path
            d="M 20 85 Q 150 -20 280 85"
            fill="none"
            stroke="#00B38A"
            strokeWidth="3.5"
            strokeDasharray="400"
            style={{
              animation: "hawkeye-track-arc 1.5s ease-out forwards",
            }}
          />
          <circle cx="280" cy="85" r="7" fill="#FBBF24" className="animate-ping" />
          <circle cx="280" cy="85" r="5" fill="#F59E0B" />
        </svg>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="sparks" intensity={1.5} />

      {/* Faceted 3D Emerald-Gold Milestone Block */}
      <div
        className="font-black leading-none tracking-tight select-none mt-1"
        style={{
          fontSize: "clamp(80px, 24vw, 190px)",
          background: "linear-gradient(180deg, #A7F3D0 0%, #00B38A 50%, #064E3B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(0, 179, 138, 0.5))",
          textShadow: "0 2px 0 #047857, 0 5px 0 #065F46, 0 8px 0 #022C22, 0 14px 28px rgba(0,0,0,0.9)",
          animation: "digital-block-reveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {runs}
      </div>

      <div className="text-xl sm:text-2xl font-black uppercase text-[#34D399] tracking-widest -mt-2">
        {isCentury ? "CENTURY MILESTONE!" : "HALF-CENTURY!"}
      </div>

      {/* Live Cricbuzz Strike-Rate & Telemetry Card */}
      <div className="mt-4 inline-flex items-center gap-4 rounded-xl border border-[#00B38A]/50 bg-[#0E1815]/95 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00B38A]/20 border border-[#00B38A] font-mono text-[#34D399] font-black text-sm">
          📊
        </div>
        <div className="text-left font-mono">
          <div className="text-base font-bold text-white uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs text-[#34D399] flex items-center gap-2 mt-0.5">
            <span>{runs}* ({balls}b)</span>
            <span>•</span>
            <span>SR: {sr}</span>
            {fours != null && <span>• 4s: {fours}</span>}
            {sixes != null && <span>• 6s: {sixes}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
