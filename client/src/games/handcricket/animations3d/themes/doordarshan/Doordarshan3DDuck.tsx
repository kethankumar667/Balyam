import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DDuck({
  batter,
  duckType,
  balls,
}: {
  batter: string;
  duckType: "diamond" | "golden" | "duck";
  balls: number;
}) {
  const hindiHeadline =
    duckType === "diamond"
      ? "हीरा शून्य! (DIAMOND DUCK)"
      : duckType === "golden"
      ? "गोल्डन डक! (GOLDEN DUCK)"
      : "शून्य पर आउट! (DUCK OUT)";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <style>{`
        @keyframes dd-retro-duck-boing {
          0% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-24px) rotate(-10deg); }
          50% { transform: translateY(0) rotate(5deg); }
          70% { transform: translateY(-12px) rotate(-5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes crt-flicker-shimmer {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.85; }
        }
      `}</style>

      {/* 90s Vintage Cartoon Duck in Floppy Sun Hat */}
      <div
        className="relative mb-3 flex items-center justify-center pointer-events-none"
        style={{
          animation: "dd-retro-duck-boing 1.8s ease-in-out infinite, crt-flicker-shimmer 0.15s infinite",
        }}
      >
        <svg viewBox="0 0 140 140" className="w-36 h-36 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
          {/* Floppy Sun Hat (White 90s Indian Test Match Style) */}
          <ellipse cx="70" cy="40" rx="46" ry="12" fill="#FEF08A" stroke="#D97706" strokeWidth="2" />
          <ellipse cx="70" cy="36" rx="26" ry="16" fill="#FDE047" stroke="#D97706" strokeWidth="2" />
          <path d="M 50 36 L 90 36" stroke="#2563EB" strokeWidth="3" />

          {/* Duck Head */}
          <circle cx="70" cy="58" r="24" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
          {/* Cartoon Teardrop */}
          <path d="M 86 64 C 86 68 82 72 79 69 C 77 66 84 60 86 64 Z" fill="#38BDF8" />

          {/* Floppy Beak */}
          <path d="M 54 66 Q 70 76 86 66 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="2" />

          {/* Eyes with Spiral Cartoon Dizzy Pupils */}
          <circle cx="62" cy="54" r="5" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
          <circle cx="62" cy="54" r="2" fill="#000" />
          <circle cx="78" cy="54" r="5" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
          <circle cx="78" cy="54" r="2" fill="#000" />

          {/* Body */}
          <ellipse cx="70" cy="98" rx="34" ry="24" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
          {/* Wooden stump he tripped over */}
          <rect x="42" y="105" width="56" height="6" rx="2" fill="#78350F" transform="rotate(-15 70 108)" />
        </svg>
      </div>

      <Hc3DImpactSparksCanvas skin="doordarshan" mode="duckFeathers" intensity={1} />

      {/* Retro Doordarshan Yellow Chyron Headline */}
      <div
        className="font-black tracking-tight leading-none uppercase font-serif"
        style={{
          fontSize: "clamp(36px, 11vw, 76px)",
          color: "#FEF08A",
          textShadow: "3px 3px 0 #78350F, 6px 6px 0 #000000",
          letterSpacing: "0.04em",
        }}
      >
        {hindiHeadline}
      </div>

      {/* 1980s Vintage Teletext Box */}
      <div className="mt-3 inline-flex items-center gap-3 border-2 border-[#FEF08A] bg-[#0A0705]/95 px-6 py-2.5 shadow-2xl">
        <div className="text-left font-mono">
          <div className="text-sm sm:text-base font-black text-[#FEF08A] uppercase tracking-wider">
            {batter}
          </div>
          <div className="text-xs font-bold text-amber-200 mt-0.5">
            शून्य रन ({balls} गेंद) · वापस पवेलियन
          </div>
        </div>
      </div>
    </div>
  );
}
