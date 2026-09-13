import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DDuck({
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
      ? "DIAMOND DUCK! 🦆"
      : duckType === "golden"
      ? "GOLDEN DUCK! 🦆"
      : "DUCK OUT! 🦆";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-sans">
      <style>{`
        @keyframes origami-pop-fold {
          0% { transform: rotateX(90deg) scale(0.3); opacity: 0; }
          50% { transform: rotateX(-15deg) scale(1.1); opacity: 1; }
          75% { transform: rotateX(5deg) scale(0.98); }
          100% { transform: rotateX(0deg) scale(1); opacity: 1; }
        }
      `}</style>

      {/* 3D Paper Pop-up Doodle Duck Mascot on Ruled Paper */}
      <div
        className="relative mb-3 flex items-center justify-center pointer-events-none"
        style={{
          animation: "origami-pop-fold 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformStyle: "preserve-3d",
        }}
      >
        <svg viewBox="0 0 140 140" className="w-36 h-36 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
          {/* Notebook ruled lines behind duck */}
          <line x1="10" y1="30" x2="130" y2="30" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="10" y1="60" x2="130" y2="60" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="10" y1="90" x2="130" y2="90" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="10" y1="120" x2="130" y2="120" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="30" y1="10" x2="30" y2="130" stroke="#FCA5A5" strokeWidth="1.5" />

          {/* Doodle Duck Body (Blue Ballpoint ink cross-hatching) */}
          <ellipse cx="70" cy="95" rx="36" ry="26" fill="#FEF08A" stroke="#1E3A8A" strokeWidth="2.5" strokeDasharray="3,1" />
          <path d="M 50 85 Q 70 80 90 85" stroke="#1E3A8A" strokeWidth="2" fill="none" />

          {/* Doodle Duck Head */}
          <circle cx="70" cy="55" r="25" fill="#FEF08A" stroke="#1E3A8A" strokeWidth="2.5" />

          {/* Broken Pencil Bat snapped in half */}
          <line x1="35" y1="105" x2="55" y2="115" stroke="#EAB308" strokeWidth="5" strokeLinecap="round" />
          <line x1="58" y1="122" x2="75" y2="132" stroke="#EAB308" strokeWidth="5" strokeLinecap="round" />
          <text x="56" y="118" fill="#DC2626" fontSize="12" fontWeight="bold">💥</text>

          {/* Doodle Eyes with Spiral Confusion */}
          <circle cx="62" cy="52" r="6" fill="#FFF" stroke="#1E3A8A" strokeWidth="1.5" />
          <path d="M 60 52 Q 62 50 64 52 Q 62 54 61 52" stroke="#DC2626" strokeWidth="1.5" fill="none" />
          <circle cx="78" cy="52" r="6" fill="#FFF" stroke="#1E3A8A" strokeWidth="1.5" />
          <path d="M 76 52 Q 78 50 80 52 Q 78 54 77 52" stroke="#DC2626" strokeWidth="1.5" fill="none" />

          {/* Open Sad Beak */}
          <path d="M 54 62 Q 70 72 86 62 Z" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
        </svg>
      </div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="duckFeathers" intensity={1} />

      {/* Hand-Drawn Doodle Headline */}
      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(48px, 14vw, 110px)",
          color: "#DC2626",
          textShadow: "3px 3px 0 #FEE2E2, 5px 5px 0 #1E3A8A",
          transform: "rotate(-2deg)",
        }}
      >
        {headline}
      </div>

      {/* Classroom Notepad Chip */}
      <div className="mt-3 inline-flex items-center gap-3 rounded-md border-2 border-dashed border-blue-600 bg-[#FFFDF5] px-6 py-2.5 shadow-xl rotate-1">
        <div className="text-left font-mono">
          <div className="text-sm sm:text-base font-black text-blue-900 uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs font-bold text-red-600">
            Out for 0 runs ({balls} balls) · Back to the classroom bench!
          </div>
        </div>
      </div>
    </div>
  );
}
