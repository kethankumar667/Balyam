import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DWinner({
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
      <div className="text-6xl sm:text-7xl mb-2 drop-shadow-[0_0_20px_#F59E0B] animate-bounce">
        {isTie ? "🤝" : "🏆"}
      </div>

      <Hc3DImpactSparksCanvas skin="doordarshan" mode="confetti" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(54px, 16vw, 130px)",
          color: "#FEF08A",
          textShadow: "4px 4px 0 #D97706, 8px 8px 0 #92400E, 12px 12px 0 #000000",
        }}
      >
        {isTie ? "मुकाबला बराबर!" : youWon ? "शानदार जीत!" : "विजेता घोषित!"}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-[#FEF08A] bg-[#0A0705]/95 px-6 py-3 shadow-2xl">
        <div className="text-base sm:text-lg font-black text-[#FEF08A] uppercase tracking-wider font-mono">
          {isTie ? "अद्भुत रोमांचक मुकाबला बराबर छूटा!" : `${winnerName} ने मैच जीता (${margin})!`}
        </div>
      </div>
    </div>
  );
}
