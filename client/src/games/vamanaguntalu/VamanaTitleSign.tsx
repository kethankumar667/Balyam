import { CARD_INK } from "./vamanaTheme";

const SPRIG = "M2 30 C 14 4 44 -2 62 8 C 50 12 40 22 34 34 C 24 28 12 28 2 30 Z";

function Sprig({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 36" className={`pointer-events-none ${className ?? ""}`}>
      <path d={SPRIG} fill="url(#vg-leaf)" />
      <path d="M6 28 C 22 20 40 14 58 9" stroke="#1e5a22" strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

export interface VamanaTitleSignProps {
  /** Two lines on a phone, one on a wide screen. */
  isStacked?: boolean;
  /** A slim sign for a short screen: one small line and no leaves. */
  isCompact?: boolean;
  className?: string;
}

/**
 * The game's name on a hanging wooden board. The leaf gradient it borrows is defined once by
 * `VamanaScene`, so the sign always sits inside a scene.
 */
export function VamanaTitleSign({ isStacked = false, isCompact = false, className = "" }: VamanaTitleSignProps) {
  const lines = isStacked && !isCompact ? ["VAMANA", "GUNTALU"] : ["VAMANA GUNTALU"];
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <span aria-hidden className="absolute -top-2 left-[22%] h-3 w-[2px] bg-amber-900/80" />
      <span aria-hidden className="absolute -top-2 right-[22%] h-3 w-[2px] bg-amber-900/80" />
      <div
        className={`relative rounded-xl text-center ${isCompact ? "px-3 py-0.5" : "px-3 py-1 min-[360px]:px-5 md:px-7 md:py-1.5"}`}
        style={{
          background: "linear-gradient(180deg, #8a5629 0%, #5f3615 100%)",
          border: "2px solid #c99a4a",
          boxShadow: "0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,226,170,0.35)",
        }}
      >
        {!isCompact && (
          <>
            <Sprig className="absolute -left-5 -top-3 hidden h-6 w-9 min-[360px]:block md:-left-7 md:h-8 md:w-12" />
            <Sprig className="absolute -right-5 -top-3 hidden h-6 w-9 -scale-x-100 min-[360px]:block md:-right-7 md:h-8 md:w-12" />
          </>
        )}
        <h1
          aria-label="Vamana Guntalu"
          className="font-display font-black uppercase leading-[1.02] tracking-wide text-[#fff3d2]"
          style={{
            fontSize: isCompact ? "1rem" : isStacked ? "clamp(1.05rem, 5.4vw, 1.9rem)" : "clamp(1.1rem, 2vw, 1.7rem)",
            WebkitTextStroke: `0.6px ${CARD_INK}`,
            textShadow: "0 2px 0 rgba(40,20,6,0.85), 0 3px 8px rgba(0,0,0,0.5)",
          }}
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
