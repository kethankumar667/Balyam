import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DWinner({
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
      <style>{`
        @keyframes trophy-elevate-3d {
          0% { transform: scale(0.3) translateY(80px) rotateY(60deg); opacity: 0; }
          50% { transform: scale(1.15) translateY(-20px) rotateY(-10deg); opacity: 1; }
          100% { transform: scale(1) translateY(0px) rotateY(0deg); opacity: 1; }
        }
      `}</style>

      {/* 3D Golden Trophy Elevation */}
      <div
        className="relative mb-3 flex items-center justify-center"
        style={{
          animation: "trophy-elevate-3d 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformStyle: "preserve-3d",
        }}
      >
        <span className="text-7xl sm:text-8xl drop-shadow-[0_15px_30px_rgba(251,191,36,0.5)] animate-bounce">
          {isTie ? "🤝" : "🏆"}
        </span>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="confetti" intensity={1.8} />

      {/* 3D Extruded Victory Title */}
      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(56px, 18vw, 140px)",
          background: "linear-gradient(180deg, #FFFFFF 0%, #FBBF24 50%, #B45309 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.9))",
          textShadow: "0 3px 0 #D97706, 0 6px 0 #92400E, 0 9px 0 #451A03",
        }}
      >
        {isTie ? "MATCH TIED" : youWon ? "CHAMPION!" : "VICTORY!"}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-amber-400/50 bg-slate-950/90 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
          {isTie ? "Incredible match finishes level!" : `${winnerName} takes the crown ${margin}!`}
        </div>
      </div>
    </div>
  );
}
