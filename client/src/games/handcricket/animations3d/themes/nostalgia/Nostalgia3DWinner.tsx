import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DWinner({
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
    <div className="relative flex flex-col items-center justify-center text-center select-none font-mono">
      <div className="text-6xl sm:text-7xl mb-2 drop-shadow-md animate-bounce">
        {isTie ? "🤝" : "🏆"}
      </div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="confetti" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(52px, 16vw, 130px)",
          color: "#2563EB",
          textShadow: "4px 4px 0 #DBEAFE, 8px 8px 0 #1E40AF",
          transform: "rotate(-1deg)",
        }}
      >
        {isTie ? "MATCH TIED! 🤝" : youWon ? "YOU WON! 🏆" : "WINNER! 🏆"}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-blue-600 bg-[#FFFDF5] px-6 py-3 shadow-xl rounded-md">
        <div className="text-base sm:text-lg font-black text-blue-900 uppercase tracking-wider">
          {isTie ? "Thrilling match finishes level!" : `${winnerName} takes the match ${margin}!`}
        </div>
      </div>
    </div>
  );
}
