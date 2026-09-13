import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Broadcast3DDuck({
  batter,
  duckType,
  balls,
}: {
  batter: string;
  duckType: "diamond" | "golden" | "duck";
  balls: number;
}) {
  const headline =
    duckType === "diamond"
      ? "DIAMOND DUCK!"
      : duckType === "golden"
      ? "GOLDEN DUCK!"
      : "DUCK OUT!";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      {/* 3D Duck Mascot with Cricket Helmet & Broken Bat */}
      <div
        className="relative mb-3 flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          animation: "broadcast-duck-waddle 2s ease-in-out infinite alternate",
        }}
      >
        <style>{`
          @keyframes broadcast-duck-waddle {
            0% { transform: translateY(0px) rotateY(-12deg) rotateZ(-4deg); }
            50% { transform: translateY(-8px) rotateY(12deg) rotateZ(4deg); }
            100% { transform: translateY(0px) rotateY(-12deg) rotateZ(-4deg); }
          }
          @keyframes bat-tumble-3d {
            0% { transform: translate3d(0, 0, 0) rotateZ(0deg) rotateX(0deg); opacity: 1; }
            50% { transform: translate3d(20px, 40px, 80px) rotateZ(180deg) rotateX(45deg); opacity: 1; }
            100% { transform: translate3d(35px, 85px, 140px) rotateZ(360deg) rotateX(90deg); opacity: 0.8; }
          }
          @keyframes halo-orbit-3d {
            0% { transform: rotateX(75deg) rotateZ(0deg); }
            100% { transform: rotateX(75deg) rotateZ(360deg); }
          }
        `}</style>

        {/* Orbiting 3D Golden Dizzy Stars Halo */}
        <div
          className="pointer-events-none absolute -top-8 left-1/2 -ml-16 h-8 w-32"
          style={{
            transformStyle: "preserve-3d",
            animation: "halo-orbit-3d 3s linear infinite",
          }}
        >
          <span className="absolute left-0 text-xl">⭐</span>
          <span className="absolute right-0 text-xl">⭐</span>
          <span className="absolute top-0 left-12 text-sm">💫</span>
        </div>

        {/* 3D High-Fidelity SVG Duck Mascot in Cricket Helmet */}
        <svg
          viewBox="0 0 160 160"
          className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Duck Body & Wings */}
          <ellipse cx="80" cy="105" rx="44" ry="34" fill="#FBBF24" />
          <ellipse cx="80" cy="110" rx="38" ry="26" fill="#F59E0B" opacity="0.6" />
          {/* Batting Pads on Feet */}
          <rect x="56" y="130" width="14" height="24" rx="4" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" />
          <line x1="56" y1="138" x2="70" y2="138" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="56" y1="146" x2="70" y2="146" stroke="#9CA3AF" strokeWidth="2" />
          <rect x="90" y="130" width="14" height="24" rx="4" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" />
          <line x1="90" y1="138" x2="104" y2="138" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="90" y1="146" x2="104" y2="146" stroke="#9CA3AF" strokeWidth="2" />

          {/* Duck Head */}
          <circle cx="80" cy="62" r="32" fill="#FBBF24" />

          {/* Cricket Helmet (Deep Navy Carbon-Fiber Shell with Visor) */}
          <path
            d="M 50 62 A 32 32 0 0 1 110 62 L 112 50 A 34 34 0 0 0 48 50 Z"
            fill="#1E3A8A"
          />
          <path d="M 48 50 A 34 34 0 0 1 112 50 L 110 44 A 32 32 0 0 0 50 44 Z" fill="#3B82F6" />
          {/* Metallic Grille / Visor */}
          <path d="M 58 64 L 102 64" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
          <path d="M 64 70 L 96 70" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 72 58 L 72 74" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M 88 58 L 88 74" stroke="#CBD5E1" strokeWidth="2" />

          {/* Dizzy Eyes */}
          <circle cx="68" cy="58" r="4.5" fill="#FFFFFF" />
          <circle cx="68" cy="58" r="2.5" fill="#1E293B" />
          <circle cx="92" cy="58" r="4.5" fill="#FFFFFF" />
          <circle cx="92" cy="58" r="2.5" fill="#1E293B" />

          {/* Sad Quacking Beak */}
          <path
            d="M 64 74 Q 80 84 96 74 Q 80 88 64 74 Z"
            fill="#EA580C"
            stroke="#9A3412"
            strokeWidth="1.5"
          />

          {/* Batting Gloves holding fallen bat */}
          <circle cx="48" cy="100" r="8" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1.5" />
          <circle cx="112" cy="100" r="8" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1.5" />
        </svg>

        {/* 3D Tumbling Broken Willow Bat */}
        <div
          className="absolute right-0 bottom-0 pointer-events-none"
          style={{
            animation: "bat-tumble-3d 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards",
          }}
        >
          <svg viewBox="0 0 40 80" className="w-12 h-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]">
            {/* Split fractured willow bat */}
            <path d="M 18 0 L 22 0 L 22 25 L 18 25 Z" fill="#E2E8F0" stroke="#64748B" />
            <path
              d="M 14 25 L 26 25 L 28 65 Q 28 75 20 75 Q 12 75 12 65 L 14 45 L 20 40 L 14 35 Z"
              fill="#D97706"
              stroke="#78350F"
            />
            {/* Crack zigzag line */}
            <path d="M 14 45 L 22 43 L 17 52 L 27 50" stroke="#451A03" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Floating Feather & Star Particles */}
      <Hc3DImpactSparksCanvas skin="broadcast" mode="duckFeathers" intensity={1.2} />

      {/* 3D Extruded Bevel Headline */}
      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(48px, 14vw, 100px)",
          background: "linear-gradient(180deg, #FEF08A 0%, #F59E0B 50%, #DC2626 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.85))",
          textShadow: "0 2px 0 #B45309, 0 4px 0 #78350F, 0 6px 0 #450A0A",
        }}
      >
        {headline}
      </div>

      {/* TV Broadcast Lower Third Telecast Ribbon */}
      <div className="mt-4 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-amber-400/40 bg-slate-900/90 px-5 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 font-black text-white text-xs shadow-xs">
            0
          </div>
          <div className="text-left">
            <div className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              {batter}
            </div>
            <div className="text-[11px] font-bold text-amber-300">
              DISMISSED FOR 0 ({balls} BALL{balls === 1 ? "" : "S"}) · WALK OF SHAME
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
