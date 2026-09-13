import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DMilestone({
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
  const headline = isCentury ? "CENTURY!" : "FIFTY!";
  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "—";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes bat-swing-impact {
          0% { transform: translate3d(120px, -40px, -200px) rotateZ(45deg) rotateY(-35deg); opacity: 0; }
          30% { transform: translate3d(40px, -10px, -60px) rotateZ(20deg) rotateY(-20deg); opacity: 1; }
          45% { transform: translate3d(0px, 0px, 0px) rotateZ(-15deg) rotateY(10deg); }
          65% { transform: translate3d(-60px, 20px, 40px) rotateZ(-40deg) rotateY(25deg); opacity: 1; }
          100% { transform: translate3d(-140px, 50px, 100px) rotateZ(-65deg) rotateY(40deg); opacity: 0; }
        }
        @keyframes ball-incoming-launch {
          0% { transform: translate3d(-80px, 60px, -600px) scale(0.2) rotate(0deg); opacity: 0; }
          35% { transform: translate3d(-20px, 20px, -200px) scale(0.6) rotate(180deg); opacity: 1; }
          45% { transform: translate3d(0px, 0px, 0px) scale(1) rotate(360deg); }
          55% { transform: translate3d(30px, -40px, 250px) scale(2.2) rotate(540deg); opacity: 1; filter: blur(0px); }
          100% { transform: translate3d(60px, -90px, 600px) scale(4.5) rotate(900deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes milestone-numeral-reveal {
          0% { transform: scale(0.2) rotateX(60deg) translateZ(-200px); opacity: 0; }
          45% { transform: scale(0.2) rotateX(60deg) translateZ(-200px); opacity: 0; }
          60% { transform: scale(1.18) rotateX(-10deg) translateZ(50px); opacity: 1; }
          75% { transform: scale(0.95) rotateX(4deg) translateZ(20px); }
          100% { transform: scale(1) rotateX(0deg) translateZ(0px); opacity: 1; }
        }
        @keyframes shockwave-pulse {
          0% { transform: scale(0.1); opacity: 0; }
          45% { transform: scale(0.2); opacity: 0; }
          48% { transform: scale(0.5); opacity: 1; border-width: 8px; }
          80% { transform: scale(3.2); opacity: 0; border-width: 1px; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>

      {/* 3D Bat Swing & Ball Strike Arena */}
      <div
        className="relative h-44 w-72 sm:h-56 sm:w-96 flex items-center justify-center pointer-events-none"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Sweet-Spot Collision Shockwave Ring */}
        <div
          className="absolute h-32 w-32 rounded-full border-4 border-amber-300 pointer-events-none"
          style={{
            animation: "shockwave-pulse 2.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards",
          }}
        />

        {/* 3D English Willow Cricket Bat */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            animation: "bat-swing-impact 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <svg viewBox="0 0 45 130" className="w-16 h-48 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]">
            <defs>
              <linearGradient id="willowWood" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="35%" stopColor="#FBBF24" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="rubberGrip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#E2E8F0" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>
            </defs>
            {/* Handle with rubber spiral texture */}
            <rect x="20" y="0" width="6" height="42" rx="3" fill="url(#rubberGrip)" stroke="#475569" strokeWidth="1" />
            <line x1="20" y1="10" x2="26" y2="12" stroke="#64748B" strokeWidth="1.2" />
            <line x1="20" y1="20" x2="26" y2="22" stroke="#64748B" strokeWidth="1.2" />
            <line x1="20" y1="30" x2="26" y2="32" stroke="#64748B" strokeWidth="1.2" />
            {/* Willow Blade with Sweet-Spot Spine */}
            <path
              d="M 12 42 L 34 42 L 36 118 Q 36 128 23 128 Q 10 128 10 118 Z"
              fill="url(#willowWood)"
              stroke="#78350F"
              strokeWidth="1.5"
            />
            {/* Chrome Holographic Sticker */}
            <rect x="15" y="55" width="16" height="30" rx="3" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" opacity="0.9" />
            <text x="23" y="74" fill="#FFFFFF" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              PRO
            </text>
          </svg>
        </div>

        {/* 3D Spinning Seam Leather Cricket Ball */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            animation: "ball-incoming-launch 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <svg viewBox="0 0 50 50" className="w-12 h-12 drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]">
            <defs>
              <radialGradient id="leatherBall" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="60%" stopColor="#B91C1C" />
                <stop offset="100%" stopColor="#450A0A" />
              </radialGradient>
            </defs>
            {/* Ball Sphere */}
            <circle cx="25" cy="25" r="23" fill="url(#leatherBall)" />
            {/* Raised White Seam & Stitches */}
            <path d="M 5 25 Q 25 10 45 25" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeDasharray="2,2" />
            <path d="M 5 25 Q 25 40 45 25" stroke="#FDE047" strokeWidth="1.2" fill="none" opacity="0.7" />
          </svg>
        </div>
      </div>

      {/* Explosive Sweet-Spot Golden Sparks & Fireworks Canvas */}
      <Hc3DImpactSparksCanvas skin="broadcast" mode="sparks" intensity={1.5} />
      {isCentury && <Hc3DImpactSparksCanvas skin="broadcast" mode="confetti" intensity={1} />}

      {/* Extruded 3D Sculpted Numerals Reveal ("50" or "100") */}
      <div
        className="relative z-30 flex flex-col items-center"
        style={{
          animation: "milestone-numeral-reveal 2.2s cubic-bezier(0.2, 1.2, 0.4, 1) forwards",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Diamond Laurels for Century */}
        {isCentury && (
          <div className="flex items-center gap-2 text-3xl sm:text-4xl mb-1">
            <span>👑</span>
            <span className="text-amber-400 font-extrabold text-sm tracking-widest uppercase bg-amber-950/80 px-3 py-1 rounded-full border border-amber-400">
              MAGNIFICENT 100
            </span>
            <span>👑</span>
          </div>
        )}

        {/* 3D Extruded Numerals */}
        <div
          className="font-black leading-none tracking-tight select-none"
          style={{
            fontSize: "clamp(80px, 24vw, 190px)",
            background: isCentury
              ? "linear-gradient(180deg, #FFFFFF 0%, #FEF08A 35%, #F59E0B 70%, #B45309 100%)"
              : "linear-gradient(180deg, #FFFBEB 0%, #FDE047 40%, #D97706 80%, #78350F 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.9))",
            textShadow: isCentury
              ? "0 3px 0 #D97706, 0 6px 0 #B45309, 0 9px 0 #78350F, 0 14px 28px rgba(0,0,0,0.95)"
              : "0 2px 0 #B45309, 0 5px 0 #78350F, 0 8px 0 #450A0A, 0 12px 24px rgba(0,0,0,0.9)",
          }}
        >
          {runs}
        </div>

        <div className="text-xl sm:text-2xl font-black uppercase text-amber-300 tracking-widest -mt-2">
          {headline}
        </div>

        {/* TV Broadcast Scorecard Stats Ribbon */}
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-4 rounded-xl border border-amber-400/50 bg-slate-950/90 px-6 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 font-black text-slate-950 text-base shadow-xs">
              🏏
            </div>
            <div className="text-left">
              <div className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                {batter}
              </div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>{runs}* ({balls} BALLS)</span>
                <span>•</span>
                <span>SR: {sr}</span>
                {fours != null && <span>• {fours}x4s</span>}
                {sixes != null && <span>• {sixes}x6s</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
