import { useId } from "react";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import { hopMsFor } from "@shared/ludo-pacing";
import type { LudoColor } from "@shared/types";
import { useTokenSkin } from "../../lib/cosmeticsResolver";
import { PawnGlyph } from "./PawnGlyph";

/** A hop that decelerates into the cell — no overshoot. See the `transition`
 *  comment on the pawn's style for why a spring is wrong here. */
const HOP_EASE = "cubic-bezier(.22,.85,.35,1)";

/** Used by call sites that render a static pawn (previews, the picker). */
const DEFAULT_HOP_MS = hopMsFor(1);

/**
 * 3D-styled "chess pawn" Ludo token. The actual pawn shape/paint lives in
 * `PawnGlyph` (shared with the shop's preview and thumbnail rendering);
 * this component owns positioning, the hop transition, and the
 * movable/celebration interaction states around it.
 * Positioned absolutely by the parent via percent coords; smooth transitions on left/top.
 */

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
  skin,
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
  /** Cosmetic token skin identifier (e.g. token_golden_crown, token_fireball_ludo, token_neon_ring) */
  skin?: string;
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
  const tokenSkin = useTokenSkin("ludo", skin);
  const main = golden ? "#D4AF37" : hex ?? COLOR_HEX[color];
  const dark = golden ? "#8B6914" : hexDark ?? COLOR_HEX_DARK[color];
  // PawnGlyph derives its shine-gradient ids from this, so it MUST be unique
  // per instance — a full board renders 100+ tokens, and a shared literal id
  // would mean every `url(#…)` resolves to whichever token mounted first
  // (see PawnGlyph.tsx's own comment on this). Colons are stripped from
  // useId() — legal in an id, but they break `url(#…)`.
  const uid = useId().replace(/:/g, "");
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
      <PawnGlyph
        main={main}
        dark={dark}
        tokenSkin={tokenSkin}
        uid={uid}
        movable={movable}
        label={label}
        cbMode={cbMode}
        color={color}
      />
    </button>
  );
}
