import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DSix({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes rocket-six-ball {
          0% { transform: translate3d(0, 80px, 0) scale(1); opacity: 1; }
          40% { transform: translate3d(15px, -120px, 200px) scale(2.5); opacity: 1; }
          100% { transform: translate3d(30px, -450px, 600px) scale(5); opacity: 0; }
        }
        @keyframes six-slam-3d {
          0% { transform: scale(3.5) rotateX(45deg) translateZ(200px); opacity: 0; }
          50% { transform: scale(1.15) rotateX(-10deg) translateZ(40px); opacity: 1; }
          75% { transform: scale(0.96) rotateX(4deg) translateZ(10px); }
          100% { transform: scale(1) rotateX(0deg) translateZ(0px); opacity: 1; }
        }
      `}</style>

      {/* 3D Fiery Rocketing Ball into Stadium Night Sky */}
      <div className="relative h-32 w-48 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute z-10"
          style={{
            animation: "rocket-six-ball 1.6s cubic-bezier(0.12, 0.9, 0.25, 1) forwards",
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Comet Flame Trail */}
            <div className="absolute top-8 w-6 h-20 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 rounded-full blur-xs opacity-90 animate-pulse" />
            <span className="text-4xl drop-shadow-[0_0_20px_#F59E0B]">🚀</span>
          </div>
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="sparks" intensity={1.8} />

      {/* 3D Extruded "SIX!" Lettering Slam */}
      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(80px, 26vw, 210px)",
          background: "linear-gradient(180deg, #FFFFFF 0%, #FEF08A 35%, #F97316 70%, #B91C1C 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.9))",
          textShadow: "0 3px 0 #EA580C, 0 6px 0 #C2410C, 0 9px 0 #7C2D12, 0 16px 30px rgba(0,0,0,0.9)",
          animation: "six-slam-3d 1.4s cubic-bezier(0.2, 1.2, 0.4, 1) forwards",
        }}
      >
        SIX!
      </div>

      <div className="text-base sm:text-xl font-extrabold text-amber-200 mt-2 drop-shadow max-w-md">
        {message ?? `${batter} sends it flying out of the stadium!`}
      </div>
    </div>
  );
}
