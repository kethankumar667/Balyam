import type { CSSProperties } from "react";
import { TABLE_BACKGROUND } from "./vamanaTheme";

/**
 * The tabletop the match sits on: dark planks, a folded green cloth, a brass bowl of seeds and a few
 * leaves. It is pure decoration (hidden from assistive tech, never takes a tap) and sits behind
 * everything, so each shell just drops it in as the first child of its root.
 *
 * Sizes are in `vmin` so the props scale with the screen without any JavaScript, and they are
 * anchored to the edges, where the board and its cards are not.
 */

const GOLDEN_ANGLE = 2.399963;
const BOWL_SEEDS = 46;

const BOWL_SEED_POSITIONS = Array.from({ length: BOWL_SEEDS }, (_, index) => {
  const radius = 74 * Math.sqrt((index + 0.4) / BOWL_SEEDS);
  const angle = index * GOLDEN_ANGLE;
  return { x: 150 + radius * Math.cos(angle), y: 78 + radius * 0.46 * Math.sin(angle), tilt: (index * 53) % 180 };
});

const PLANKS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.0) 168px, rgba(0,0,0,0.34) 168px, rgba(0,0,0,0.34) 170px)";
const TABLE_GRAIN =
  "repeating-linear-gradient(90deg, rgba(255,214,150,0.045) 0px, rgba(255,214,150,0.045) 1px, transparent 1px, transparent 6px)";

function Leaf({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 140 80" className={className} style={style}>
      <path d="M4 40 C 34 -6 104 -6 136 40 C 104 86 34 86 4 40 Z" fill="url(#vg-leaf)" />
      <path d="M8 40 L 132 40" stroke="#1e5a22" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M40 40 L 62 18 M62 40 L 86 16 M86 40 L 108 22 M40 40 L 62 62 M62 40 L 86 64 M86 40 L 108 58" stroke="#1e5a22" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.45" />
    </svg>
  );
}

function SeedBowl({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 300 190" className={className}>
      <ellipse cx="150" cy="176" rx="118" ry="10" fill="rgba(0,0,0,0.35)" />
      <path d="M14 70 C 18 150 70 176 150 176 C 230 176 282 150 286 70 Z" fill="url(#vg-brass)" />
      <ellipse cx="150" cy="70" rx="138" ry="40" fill="#8a5d1c" />
      <ellipse cx="150" cy="70" rx="128" ry="34" fill="#3b2410" />
      {BOWL_SEED_POSITIONS.map((seed, index) => (
        <ellipse key={index} cx={seed.x} cy={seed.y} rx="15" ry="9.5" fill="url(#vg-seed)" transform={`rotate(${seed.tilt} ${seed.x} ${seed.y})`} />
      ))}
      <path d="M14 70 C 40 96 260 96 286 70" stroke="#f3d38a" strokeWidth="3" fill="none" opacity="0.7" />
    </svg>
  );
}

export interface VamanaSceneProps {
  /** Hides the bowl where a phone has no spare corner for it. */
  isCompact?: boolean;
  /** A wide screen keeps the right edge for the chat panel, so the cloth rides high and the bowl moves to the lower left. */
  isWide?: boolean;
}

export function VamanaScene({ isCompact = false, isWide = false }: VamanaSceneProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ background: TABLE_BACKGROUND }}>
      {/* the gradients every drawing below shares, defined once so no id repeats on the page */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="vg-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5fae4a" />
            <stop offset="100%" stopColor="#2f7d32" />
          </linearGradient>
          <radialGradient id="vg-brass" cx="0.4" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#f3d38a" />
            <stop offset="55%" stopColor="#c8932f" />
            <stop offset="100%" stopColor="#7a531a" />
          </radialGradient>
          <radialGradient id="vg-seed" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="60%" stopColor="#efd9a4" />
            <stop offset="100%" stopColor="#bf9b58" />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{ backgroundImage: `${PLANKS}, ${TABLE_GRAIN}` }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />

      {/* the folded cloth along the left edge */}
      <div
        className={`absolute -left-[9vmin] w-[24vmin] min-w-[60px] rotate-[-4deg] rounded-[22px] shadow-[8px_10px_26px_rgba(0,0,0,0.5)] ${isWide ? "top-[6%] h-[52%]" : "top-[22%] h-[70%]"}`}
        style={{
          background: "linear-gradient(100deg, #0f5a45 0%, #166d52 40%, #0c4a38 100%)",
          borderRight: "3px solid rgba(228,177,40,0.55)",
        }}
      >
        <div
          className="absolute inset-y-[6%] right-[9%] w-[16%] opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(228,177,40,0.95) 0 22%, transparent 24%), linear-gradient(rgba(228,177,40,0.55), rgba(228,177,40,0.55))",
            backgroundSize: "100% 26px, 2px 100%",
            backgroundPosition: "center 0, 50% 0",
            backgroundRepeat: "repeat-y, no-repeat",
          }}
        />
      </div>

      {!isCompact && (
        <SeedBowl
          className={`absolute w-[34vmin] min-w-[140px] max-w-[360px] drop-shadow-[0_14px_20px_rgba(0,0,0,0.5)] ${isWide ? "-left-[13vmin] -bottom-[5%]" : "-right-[7vmin] top-[30%]"}`}
        />
      )}

      <Leaf className="absolute -left-[3vmin] top-[16%] w-[16vmin] min-w-[56px] rotate-[-28deg]" />
      <Leaf className="absolute -right-[4vmin] bottom-[8%] w-[26vmin] min-w-[88px] rotate-[-36deg]" />
      <Leaf className="absolute -right-[2vmin] bottom-[3%] w-[18vmin] min-w-[64px] rotate-[18deg] opacity-90" />
      <Leaf className="absolute -left-[5vmin] bottom-[4%] w-[22vmin] min-w-[72px] rotate-[24deg] opacity-90" />
    </div>
  );
}
