import { useId } from "react";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import { hopMsFor } from "@shared/ludo-pacing";
import type { LudoColor } from "@shared/types";

/** A hop that decelerates into the cell — no overshoot. See the `transition`
 *  comment on the pawn's style for why a spring is wrong here. */
const HOP_EASE = "cubic-bezier(.22,.85,.35,1)";

/** Used by call sites that render a static pawn (previews, the picker). */
const DEFAULT_HOP_MS = hopMsFor(1);

/**
 * 3D-styled "chess pawn" Ludo token rendered as inline SVG.
 * Has a domed base, a clear neck, and a rounded head — feels like a tactile playing piece.
 * Positioned absolutely by the parent via percent coords; smooth transitions on left/top.
 */
const CB_GLYPH: Record<LudoColor, string> = {
  red: "▲",
  green: "●",
  yellow: "■",
  blue: "◆",
  purple: "✦",
  cyan: "✚",
  orange: "✖",
  brown: "❖",
};

export function Token({
  color,
  left,
  top,
  size,
  movable,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
  cbMode = false,
  golden = false,
  celebrating = false,
  hex,
  hexDark,
  counterRotateDeg = 0,
  hopMs = DEFAULT_HOP_MS,
}: {
  color: LudoColor;
  left: number;
  top: number;
  size: number;
  movable: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  label?: string;
  cbMode?: boolean;
  golden?: boolean;
  celebrating?: boolean;
  /** Optional flat-palette override (print boards recolor seats by sector). */
  hex?: string;
  hexDark?: string;
  /** Cancels the board's egocentric rotation so the pawn and its number stay
   *  upright however the board is turned. */
  counterRotateDeg?: number;
  /**
   * How long ONE cell-to-cell hop takes. Must stay shorter than the interval
   * at which the board feeds new positions — see the transition comment below.
   */
  hopMs?: number;
}) {
  const main = golden ? "#D4AF37" : hex ?? COLOR_HEX[color];
  const dark = golden ? "#8B6914" : hexDark ?? COLOR_HEX_DARK[color];
  // Every token defines its own shine gradients, so the ids MUST be unique per
  // instance — they used to be the literals "baseShine"/"bodyShine", which
  // meant a full board emitted 100+ elements sharing two ids and every
  // `url(#baseShine)` resolved to whichever token mounted first. That happened
  // to render correctly only because both gradients are pure white/black and
  // carry no colour: the moment a shine is made seat-dependent, every token on
  // the board would silently wear the first token's colours. Colons are
  // stripped from useId() — legal in an id, but they break `url(#…)`.
  const uid = useId().replace(/:/g, "");
  const baseShine = `tkbase${uid}`;
  const bodyShine = `tkbody${uid}`;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!onClick}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        // Counter-rotation is applied about the pawn's own centre AFTER the
        // anchoring translate, so the piece stands upright without its
        // position on the board shifting.
        transform: `translate(-50%, -65%) rotate(${counterRotateDeg}deg)`,
        transformOrigin: "50% 65%",
        /**
         * The single most important number on this component.
         *
         * This was a fixed 380ms with a springy `cubic-bezier(.4,1.5,.6,1)`,
         * while the board advances the token one cell roughly every 130-190ms.
         * A CSS transition that is re-targeted before it finishes does not
         * restart — it re-aims from wherever it currently is — so the piece
         * never actually reached any intermediate square. Five steps rendered
         * as ONE straight glide that cut diagonally across the track to the
         * destination, which is exactly the "it jumped 5 in one shot" report.
         * The overshoot curve made it worse: `y1 = 1.5` means barely any
         * distance is covered in the first third, so the early cells of a walk
         * were invisible even in principle.
         *
         * Now the duration comes from the board and is deliberately SHORTER
         * than the step interval, so every hop completes and the piece sits
         * still on each square before leaving it. `HOP_EASE` lands rather than
         * springs — a spring on a chained hop reads as a wobble, not a step.
         */
        transition: `left ${hopMs}ms ${HOP_EASE}, top ${hopMs}ms ${HOP_EASE}, transform 200ms`,
        cursor: onClick ? "pointer" : "default",
        background: "transparent",
        border: "none",
        padding: 0,
        zIndex: movable ? 30 : 10,
        filter: movable
          ? `drop-shadow(0 0 6px ${main}) drop-shadow(0 4px 4px rgba(0,0,0,0.5))`
          : "drop-shadow(0 3px 3px rgba(0,0,0,0.5))",
      }}
      title={label}
      aria-label={label ? `Token ${label}` : `${color} token`}
      className={`${movable ? "ludo-token-bob hover:scale-110 active:scale-95 focus-visible:scale-110" : ""} ${celebrating ? "home-arrive" : ""}`}
    >
      <svg viewBox="-50 -65 100 130" width="100%" height="100%" overflow="visible">
        {/* Movable highlight ring (expanding pulse) */}
        {movable && (
          <>
            <circle cx="0" cy="50" r="40" fill="none" stroke="white" strokeWidth="3" opacity="0.6">
              <animate attributeName="r" values="35;48;35" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="50" r="38" fill="none" stroke={main} strokeWidth="2.5" opacity="0.8" />
          </>
        )}

        {/* Base (oval) */}
        <ellipse cx="0" cy="50" rx="38" ry="12" fill={dark} />
        <ellipse cx="0" cy="48" rx="38" ry="12" fill={main} />
        <ellipse cx="0" cy="46" rx="32" ry="8" fill={`url(#${baseShine})`} opacity="0.5" />

        {/* Body — pawn-shaped curve */}
        <path
          d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
          fill={main}
          stroke={dark}
          strokeWidth="2"
        />
        <path
          d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
          fill={`url(#${bodyShine})`}
          opacity="0.6"
        />

        {/* Neck ring */}
        <ellipse cx="0" cy="-18" rx="20" ry="6" fill={dark} />
        <ellipse cx="0" cy="-19" rx="20" ry="6" fill={main} />

        {/* Head — domed ball */}
        <circle cx="0" cy="-36" r="20" fill={dark} />
        <circle cx="0" cy="-37" r="19" fill={main} />
        <circle cx="-6" cy="-43" r="7" fill="white" opacity="0.55" />

        {/* Number badge on chest */}
        {label && (
          <text
            x="0"
            y="12"
            textAnchor="middle"
            // 22 → 26 with a 2.2 outline (was 0.8). On a phone each token is
            // roughly 24px of real estate, so this numeral was rendering at
            // about 6px against a saturated seat colour — the review called it
            // unreadable and it was. `paintOrder: stroke` below already draws
            // the outline behind the glyph, so a thicker one buys contrast
            // without eating the letterform.
            fontSize="26"
            fontWeight="900"
            fill="white"
            stroke={dark}
            strokeWidth="2.2"
            style={{ fontFamily: "'Fredoka','Poppins','Nunito',sans-serif", letterSpacing: "0.01em", paintOrder: "stroke" } as React.CSSProperties}
          >
            {label}
          </text>
        )}

        {/* Color-blind glyph badge on head — supplements color with shape */}
        {cbMode && (
          <text
            x="0"
            y="-32"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="white"
            stroke={dark}
            strokeWidth="0.6"
            style={{ paintOrder: "stroke" } as React.CSSProperties}
          >
            {CB_GLYPH[color]}
          </text>
        )}

        <defs>
          <linearGradient id={baseShine} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={bodyShine} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
