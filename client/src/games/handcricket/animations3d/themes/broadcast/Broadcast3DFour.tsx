import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DFour({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes grass-four-ball {
          0% { transform: translate3d(-200px, 40px, -200px) scale(0.6); opacity: 0; }
          40% { transform: translate3d(-30px, 10px, -50px) scale(1.1); opacity: 1; }
          65% { transform: translate3d(50px, -15px, 60px) scale(1.6); }
          100% { transform: translate3d(240px, -30px, 200px) scale(2.2); opacity: 0; }
        }
        @keyframes four-slide-3d {
          0% { transform: translateX(-80px) skewX(-12deg); opacity: 0; }
          60% { transform: translateX(10px) skewX(4deg); opacity: 1; }
          80% { transform: translateX(-4px) skewX(-2deg); }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
      `}</style>

      {/* Fast Grass Skimmer Ball */}
      <div className="relative h-20 w-64 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute z-10"
          style={{
            animation: "grass-four-ball 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-3xl">🏏</span>
            <span className="text-2xl drop-shadow-[0_0_15px_#FBBF24]">⚡</span>
          </div>
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="sparks" intensity={1} />

      {/* 3D Extruded "FOUR!" Lettering */}
      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(72px, 22vw, 180px)",
          background: "linear-gradient(180deg, #FEF9C3 0%, #FBBF24 50%, #B45309 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.85))",
          textShadow: "0 2px 0 #D97706, 0 4px 0 #92400E, 0 6px 0 #451A03, 0 12px 24px rgba(0,0,0,0.9)",
          animation: "four-slide-3d 1.2s cubic-bezier(0.2, 1.2, 0.4, 1) forwards",
        }}
      >
        FOUR!
      </div>

      <div className="text-base sm:text-xl font-extrabold text-amber-200 mt-2 drop-shadow max-w-md">
        {message ?? `${batter} pierces the field for a boundary!`}
      </div>
    </div>
  );
}
