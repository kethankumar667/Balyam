import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Cricbuzz3DWinner({
  winnerName,
  margin,
  youWon,
  isTie,
}: {
  winnerName: string;
  margin: string;
  youWon: boolean;
  isTie: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="text-6xl sm:text-7xl mb-2 drop-shadow-[0_0_25px_#00B38A] animate-bounce">
        {isTie ? "🤝" : "🏆"}
      </div>

      <Hc3DImpactSparksCanvas skin="cricbuzz" mode="confetti" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(54px, 16vw, 130px)",
          background: "linear-gradient(180deg, #A7F3D0 0%, #00B38A 50%, #064E3B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(0, 179, 138, 0.7))",
          textShadow: "0 3px 0 #047857, 0 6px 0 #064E3B, 0 10px 20px rgba(0,0,0,0.9)",
        }}
      >
        {isTie ? "MATCH TIED" : youWon ? "MATCH WON!" : "VICTORY!"}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-[#00B38A]/50 bg-[#0E1815]/95 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
          {isTie ? "Final Score Level!" : `${winnerName} claims match victory ${margin}!`}
        </div>
      </div>
    </div>
  );
}
