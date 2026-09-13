import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DMilestone({
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
  const headline = isCentury ? "CENTURY! 💯" : "FIFTY! 🌟";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-sans">
      <style>{`
        @keyframes doodle-starburst-pop {
          0% { transform: scale(0.2) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Comic Book Starburst "POW!" and Paper Airplanes */}
      <div
        className="relative mb-2 flex items-center justify-center pointer-events-none"
        style={{
          animation: "doodle-starburst-pop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="flex items-center gap-3 text-3xl sm:text-4xl">
          <span>✈️</span>
          <span className="font-mono text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 border-2 border-dashed border-blue-400 px-3 py-1 rounded-sm">
            BACK BENCH HERO!
          </span>
          <span>✈️</span>
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="sparks" intensity={1.5} />

      {/* Hand-Drawn 3D Bubble Letter Numerals */}
      <div
        className="font-black leading-none tracking-tight select-none font-mono"
        style={{
          fontSize: "clamp(80px, 24vw, 180px)",
          color: "#2563EB",
          textShadow: "4px 4px 0 #93C5FD, 8px 8px 0 #1E3A8A, 12px 12px 0 rgba(0,0,0,0.2)",
          transform: "rotate(-1deg)",
        }}
      >
        {runs}
      </div>

      <div className="text-xl sm:text-2xl font-black uppercase text-blue-700 tracking-wider font-mono mt-1">
        {headline}
      </div>

      {/* School Notebook Score Box */}
      <div className="mt-4 inline-flex items-center gap-4 border-2 border-blue-600 bg-[#FFFDF5] p-4 shadow-2xl rounded-md">
        <div className="text-left font-mono">
          <div className="text-base font-black text-blue-900 uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs font-bold text-blue-700 flex items-center gap-2 mt-0.5">
            <span>{runs} runs ({balls} balls)</span>
            {fours != null && <span>• 4s: {fours}</span>}
            {sixes != null && <span>• 6s: {sixes}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
