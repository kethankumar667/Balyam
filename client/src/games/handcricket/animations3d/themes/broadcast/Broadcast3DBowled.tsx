import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DBowled({
  batter,
  bowler,
  isYorker,
  message,
}: {
  batter: string;
  bowler: string;
  isYorker?: boolean;
  message?: string;
}) {
  const headline = isYorker ? "MYSTERY YORKER!" : "CLEAN BOWLED!";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes middle-stump-cartwheel {
          0% { transform: translate3d(0, 0, 0) rotateZ(0deg) rotateX(0deg); }
          40% { transform: translate3d(-15px, -30px, 40px) rotateZ(-35deg) rotateX(45deg); }
          75% { transform: translate3d(-35px, -60px, 90px) rotateZ(-90deg) rotateX(110deg); }
          100% { transform: translate3d(-55px, -80px, 140px) rotateZ(-150deg) rotateX(180deg); opacity: 0.7; }
        }
        @keyframes bail-left-fly {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          40% { transform: translate3d(-50px, -70px, 80px) rotate(180deg); opacity: 1; }
          100% { transform: translate3d(-120px, -110px, 160px) rotate(420deg); opacity: 0; }
        }
        @keyframes bail-right-fly {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          40% { transform: translate3d(50px, -70px, 80px) rotate(-180deg); opacity: 1; }
          100% { transform: translate3d(120px, -110px, 160px) rotate(-420deg); opacity: 0; }
        }
        @keyframes zing-bail-glow {
          0%, 100% { filter: drop-shadow(0 0 16px #EF4444); }
          50% { filter: drop-shadow(0 0 32px #DC2626) drop-shadow(0 0 48px #EF4444); }
        }
      `}</style>

      {/* 3D Wickets, Zing Bails & Wood Splinters Arena */}
      <div className="relative h-40 w-64 flex items-end justify-center pb-2 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
        {/* Left Stump (Off/Leg) */}
        <div className="h-28 w-3.5 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xs mx-2 shadow-lg" />

        {/* Middle Stump (Cartwheeling in 3D!) */}
        <div
          className="h-28 w-3.5 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xs mx-2 shadow-xl z-20"
          style={{
            animation: "middle-stump-cartwheel 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />

        {/* Right Stump */}
        <div className="h-28 w-3.5 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xs mx-2 shadow-lg" />

        {/* Flashing Red Zing Bails Flying Left & Right */}
        <div
          className="absolute -top-3 left-24 z-30 pointer-events-none"
          style={{
            animation: "bail-left-fly 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, zing-bail-glow 0.3s infinite",
          }}
        >
          <div className="h-2.5 w-8 rounded-full bg-rose-500 border border-white shadow-[0_0_15px_#EF4444]" />
        </div>
        <div
          className="absolute -top-3 right-24 z-30 pointer-events-none"
          style={{
            animation: "bail-right-fly 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, zing-bail-glow 0.3s infinite",
          }}
        >
          <div className="h-2.5 w-8 rounded-full bg-rose-500 border border-white shadow-[0_0_15px_#EF4444]" />
        </div>
      </div>

      <Hc3DImpactSparksCanvas skin="broadcast" mode="splinters" intensity={1.4} />

      {/* 3D Extruded Wicket Headline */}
      <div
        className="font-black tracking-tight leading-none uppercase mt-2"
        style={{
          fontSize: "clamp(56px, 16vw, 120px)",
          background: "linear-gradient(180deg, #FEE2E2 0%, #EF4444 50%, #991B1B 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.9))",
          textShadow: "0 2px 0 #DC2626, 0 5px 0 #991B1B, 0 8px 0 #450A0A, 0 12px 24px rgba(0,0,0,0.9)",
        }}
      >
        {headline}
      </div>

      {/* TV Lower Third Dismissal Card */}
      <div className="mt-3 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-rose-500/40 bg-slate-950/90 px-5 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 font-black text-white text-xs shadow-xs">
            W
          </div>
          <div className="text-left">
            <div className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              {batter} b {bowler}
            </div>
            <div className="text-[11px] font-bold text-rose-300">
              {message ?? `${bowler} rattles the timber with a thunderous delivery!`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
