import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DHattrick({
  bowler,
  message,
}: {
  bowler: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes fire-wickets-burst {
          0% { transform: scale(0.4) rotateY(40deg); opacity: 0; }
          50% { transform: scale(1.15) rotateY(-10deg); opacity: 1; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
      `}</style>

      {/* 3 Fiery Wicket Targets */}
      <div
        className="flex items-center justify-center gap-6 mb-2"
        style={{
          animation: "fire-wickets-burst 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="flex flex-col items-center">
          <span className="text-4xl animate-bounce" style={{ animationDelay: "100ms" }}>🎯</span>
          <span className="text-xs font-black text-amber-400 mt-1">W-1</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-5xl animate-bounce" style={{ animationDelay: "250ms" }}>🔥</span>
          <span className="text-xs font-black text-rose-400 mt-1">W-2</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-4xl animate-bounce" style={{ animationDelay: "400ms" }}>🎯</span>
          <span className="text-xs font-black text-amber-400 mt-1">W-3</span>
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="sparks" intensity={2} />

      {/* 3D Extruded Hat-Trick Lettering */}
      <div
        className="font-black tracking-tight leading-none uppercase mt-2"
        style={{
          fontSize: "clamp(54px, 16vw, 130px)",
          background: "linear-gradient(180deg, #FEF08A 0%, #F97316 45%, #DC2626 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.9))",
          textShadow: "0 3px 0 #EA580C, 0 6px 0 #991B1B, 0 9px 0 #450A0A",
        }}
      >
        HAT-TRICK!
      </div>

      {/* TV Lower Third Hat-trick ticker */}
      <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-amber-400/50 bg-slate-950/90 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 font-black text-white text-sm shadow-xs">
          🎩
        </div>
        <div className="text-left">
          <div className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
            {bowler} — HAT-TRICK HERO!
          </div>
          <div className="text-xs font-bold text-amber-300">
            {message ?? `Three unplayable deliveries in three balls!`}
          </div>
        </div>
      </div>
    </div>
  );
}
