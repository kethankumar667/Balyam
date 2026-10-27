import { SLATE_ROOM_BACKGROUND } from "../../../lib/schoolSlateMaterial";
import { SKETCH_HOLES } from "../BrainVitaProps";
import { crossOutlinePath } from "../brainvitaTheme";

/**
 * The School Slate's drawing: the wall of a classroom behind the board, and what lies round it in the four corners
 * the cross leaves empty. The board itself is the classic carving in a slate palette (`WoodSurface`), so only the scene
 * and the props are here. Everything is decoration, hidden from assistive tech and never in the way of a tap.
 */

const CHALK = "#eef2e6";

/** The blackboard the table is: soft light across the green, the old doodles faint, a vignette at the edges. */
export function SlateScene() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: SLATE_ROOM_BACKGROUND }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.55) 100%)" }} />
    </>
  );
}

/** The goal, in chalk handwriting under a sketch of the board. */
function ChalkNote({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 210 190" className={className}>
      <g transform="translate(76 6) scale(9)" stroke={CHALK} fill="none" opacity="0.85">
        <path d={crossOutlinePath(0.3)} strokeWidth="0.12" />
        {SKETCH_HOLES.map(({ row, col }) => (
          <circle key={`${row}-${col}`} cx={col + 0.5} cy={row + 0.5} r="0.3" strokeWidth="0.09" />
        ))}
      </g>
      {/* Right-aligned and short on purpose: on a phone the board's own arm covers the left of this note, and the part
          that stays in view has to say the goal. */}
      <text transform="translate(198 108) rotate(-4)" textAnchor="end" fontFamily="Caveat, 'Noto Sans Telugu', cursive" fontSize="28" fontWeight="600" fill={CHALK} opacity="0.92">
        <tspan x="0" dy="0">
          Leave just
        </tspan>
        <tspan x="0" dy="28">
          one marble!
        </tspan>
      </text>
      <path d="M96 168 C 130 162 166 172 198 164" stroke={CHALK} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

/** A felt duster: a wooden back, a pale felt face and the chalk it has wiped. */
function Duster({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 170 80" className={className}>
      <rect x="6" y="14" width="160" height="62" rx="8" fill="rgba(0,0,0,0.35)" />
      <rect x="2" y="6" width="160" height="28" rx="6" fill="#c4955a" />
      <rect x="2" y="6" width="160" height="9" rx="5" fill="#dcb27a" />
      <rect x="6" y="32" width="152" height="36" rx="5" fill="#e2d4ae" />
      <ellipse cx="46" cy="46" rx="24" ry="8" fill="rgba(255,255,255,0.55)" />
      <ellipse cx="112" cy="54" rx="30" ry="7" fill="rgba(238,242,230,0.5)" />
    </svg>
  );
}

/** Three pieces of chalk, one broken. */
function Chalk({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 190" className={className}>
      <rect x="6" y="6" width="14" height="150" rx="5" fill="#f6f2e7" />
      <rect x="6" y="6" width="5" height="150" rx="3" fill="#ffffff" opacity="0.7" />
      <rect x="25" y="34" width="14" height="124" rx="5" fill="#f4dc83" />
      <rect x="25" y="34" width="5" height="124" rx="3" fill="#fff3b0" opacity="0.7" />
      <rect x="44" y="96" width="12" height="60" rx="5" fill="#eaa9b8" />
      <rect x="44" y="96" width="4" height="60" rx="3" fill="#f7cfd8" opacity="0.7" />
    </svg>
  );
}

/** The table dressing for one board. Sits behind the board and overflows its square into the corners. */
export function SlateProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <ChalkNote className="absolute right-0 -top-[15%] w-[34%] rotate-[4deg]" />
      <Duster className="absolute -left-[12%] -top-[9%] w-[32%] -rotate-[8deg] drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
      <Chalk className="absolute -right-[13%] top-[9%] h-[30%] w-auto rotate-[14deg] drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
