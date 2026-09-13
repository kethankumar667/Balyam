import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DMilestone({
  batter,
  runs,
  balls,
}: {
  batter: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
}) {
  const isCentury = runs >= 100;
  const hindiTitle = isCentury ? "शतक! (CENTURY)" : "अर्धशतक! (FIFTY)";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes dd-swirl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Rotating Doordarshan Nostalgic Gold Swirl Motif */}
      <div className="relative mb-2 h-16 w-16 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_0_12px_#F59E0B]"
          style={{ animation: "dd-swirl-spin 6s linear infinite" }}
        >
          <circle cx="50" cy="50" r="14" fill="#FBBF24" />
          <path
            d="M 50 15 C 75 15 85 45 75 65 C 65 85 35 85 25 65 C 15 45 25 15 50 15 Z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="6"
          />
        </svg>
      </div>

      <Hc3DImpactSparksCanvas skin="doordarshan" mode="sparks" intensity={1.5} />

      {/* 3D Extruded Retro Arcade Numerals */}
      <div
        className="font-black leading-none tracking-tight select-none font-mono"
        style={{
          fontSize: "clamp(80px, 24vw, 180px)",
          color: "#FEF08A",
          textShadow: "4px 4px 0 #B45309, 8px 8px 0 #78350F, 12px 12px 0 #000000",
        }}
      >
        {runs}
      </div>

      <div className="text-xl sm:text-2xl font-black uppercase text-[#FDE047] tracking-widest font-serif mt-1">
        {hindiTitle}
      </div>

      {/* Retro Doordarshan Scoreboard Chyron */}
      <div className="mt-4 inline-flex items-center gap-4 border-2 border-[#FEF08A] bg-[#0A0705]/95 px-6 py-3 shadow-2xl">
        <div className="text-left font-mono">
          <div className="text-base font-black text-[#FEF08A] uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs font-bold text-amber-200 mt-0.5">
            {runs} रन ({balls} गेंद) · दूरदर्शन सीधा प्रसारण
          </div>
        </div>
      </div>
    </div>
  );
}
