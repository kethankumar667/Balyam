import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DDuck({
  batter,
  duckType,
  balls,
}: {
  batter: string;
  duckType: "diamond" | "golden" | "duck";
  balls: number;
}) {
  const duckLabel =
    duckType === "diamond"
      ? "DIAMOND DUCK"
      : duckType === "golden"
      ? "GOLDEN DUCK"
      : "DUCK OUT";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes cyber-hologram-glitch {
          0% { transform: translateY(0px) skewX(0deg); opacity: 0.95; }
          20% { transform: translateY(-4px) skewX(4deg); opacity: 0.8; }
          22% { transform: translateY(2px) skewX(-6deg); opacity: 1; filter: drop-shadow(0 0 12px #EF4444); }
          25% { transform: translateY(0px) skewX(0deg); opacity: 0.95; }
          60% { transform: translateY(-6px) skewX(-3deg); }
          100% { transform: translateY(0px) skewX(0deg); }
        }
      `}</style>

      {/* Holographic Cyber-Duck with Neon Grid Rings */}
      <div
        className="relative mb-3 flex items-center justify-center"
        style={{
          animation: "cyber-hologram-glitch 2.5s infinite ease-in-out",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Holographic Target Rings */}
        <div className="absolute h-40 w-40 rounded-full border border-[#00B38A]/40 border-dashed animate-spin pointer-events-none" style={{ animationDuration: "8s" }} />
        <div className="absolute h-32 w-32 rounded-full border border-rose-500/50 pointer-events-none animate-pulse" />

        {/* Cyber-Duck SVG with Neon Scanlines */}
        <svg viewBox="0 0 140 140" className="w-36 h-36 drop-shadow-[0_0_20px_#00B38A]">
          {/* Cyber Body */}
          <ellipse cx="70" cy="90" rx="40" ry="30" fill="#00261C" stroke="#00B38A" strokeWidth="2.5" />
          <line x1="40" y1="85" x2="100" y2="85" stroke="#34D399" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <line x1="45" y1="95" x2="95" y2="95" stroke="#34D399" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />

          {/* Cyber Head */}
          <circle cx="70" cy="50" r="26" fill="#051E17" stroke="#00B38A" strokeWidth="2" />

          {/* Hologram HUD Visor */}
          <rect x="48" y="44" width="44" height="12" rx="3" fill="#EF4444" opacity="0.85" />
          <text x="70" y="53" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            ERROR: 0 RUNS
          </text>

          {/* Beak */}
          <path d="M 58 60 Q 70 70 82 60 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />

          {/* Scanning Reticle Crosshair */}
          <circle cx="70" cy="50" r="20" stroke="#00B38A" strokeWidth="1" fill="none" opacity="0.4" />
          <line x1="70" y1="26" x2="70" y2="34" stroke="#00B38A" strokeWidth="2" />
          <line x1="70" y1="66" x2="70" y2="74" stroke="#00B38A" strokeWidth="2" />
        </svg>
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="sparks" intensity={1} />

      {/* Futuristic Cricbuzz Glitch Badge */}
      <div className="inline-flex items-center gap-2 rounded-md bg-rose-500/20 border border-rose-500/50 px-3 py-1 text-xs font-mono font-bold text-rose-400 uppercase tracking-widest mb-2">
        <span>⚠️ TELEMETRY FAILURE · {duckLabel}</span>
      </div>

      {/* 3D Extruded Telemetry Title */}
      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(52px, 15vw, 110px)",
          background: "linear-gradient(180deg, #FEE2E2 0%, #EF4444 50%, #991B1B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.9))",
          textShadow: "0 2px 0 #DC2626, 0 4px 0 #991B1B, 0 8px 16px rgba(0,0,0,0.95)",
        }}
      >
        {duckLabel}!
      </div>

      {/* Live Cricbuzz Match Telemetry Box */}
      <div className="mt-4 inline-flex items-center gap-4 rounded-xl border border-[#00B38A]/40 bg-[#0E1815]/95 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="text-left font-mono">
          <div className="text-sm font-bold text-white uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs text-[#34D399] flex items-center gap-3 mt-0.5">
            <span>RUNS: 0</span>
            <span>•</span>
            <span>BALLS: {balls}</span>
            <span>•</span>
            <span className="text-rose-400">SR: 0.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
