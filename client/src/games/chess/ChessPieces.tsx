import type { ChessPieceSet } from "@shared/types";

/**
 * Chess pieces, drawn.
 *
 * Every piece used to come from one hardcoded Unicode map — `k: "♔"` and
 * friends — while `ChessPieceSet` ("neo" | "staunton" | "3d_glass") was
 * written by the picker and read by NOTHING. All three sets rendered
 * identically, which is what players reported.
 *
 * Glyphs were the wrong primitive regardless of the wiring bug. Chess
 * characters render from whatever font the device happens to have: filled on
 * one platform, outline-only on another, different proportions and baselines
 * everywhere. A "set" made of them cannot be art-directed at all.
 *
 * ── Why two sets and not three ────────────────────────────────────────
 * Colour is a FILL SWAP, not a redraw — the same silhouette serves white and
 * black — so a set costs 6 drawings, not 12. Two sets that genuinely differ
 * beat three that nearly don't, and "3d_glass" now renders the neo
 * silhouettes under a glass treatment rather than pretending to be a third
 * carving. That is honest: it IS a finish, not a different set of pieces.
 *
 * 45x45 viewBox, the de-facto standard for chess piece SVGs, so any
 * externally-sourced set can be dropped in beside these later.
 */

type PieceType = "k" | "q" | "r" | "b" | "n" | "p";

/** Traditional turned-wood silhouettes — collar, flare, weighted base. */
const STAUNTON: Record<PieceType, string> = {
  p: "M22.5 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19 18h7l1.5 7h-10zM16 25h13l2 6H14zM12 31h21v4H12z",
  r: "M11 12h4v3h5v-3h5v3h5v-3h4v7l-3 3v8l3 4v4H11v-4l3-4v-8l-3-3z",
  n: "M12 34c0-6 2-10 6-13 1-3 0-5-1-7 2-2 4-2 6-1 3-3 7-2 9 1 2 3 2 7 1 11-1 5-2 7-2 9zM17 15a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z",
  b: "M22.5 7c1.6 0 2.8 1.2 2.8 2.7 0 1-.5 1.8-1.2 2.3 3 1.6 5 4.6 5 8 0 2.4-1 4.5-2.6 6H18.5c-1.6-1.5-2.6-3.6-2.6-6 0-3.4 2-6.4 5-8-.7-.5-1.2-1.3-1.2-2.3C19.7 8.2 20.9 7 22.5 7zM15 26h15v4H15zM12 30h21v5H12z",
  q: "M8 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7.5-1a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM30 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 3a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM10 15l3 12h19l3-12-6 5-3-8-3 8-3-8-3 8zM12 28h21v4H12zM10 32h25v4H10z",
  k: "M22.5 5v6M20 8h5M22.5 12c4 0 7 3 7 7 0 3-2 5-4 7h-6c-2-2-4-4-4-7 0-4 3-7 7-7zM14 27h17v4H14zM11 31h23v5H11z",
};

/** Flat geometric set — simplified masses, no turned detail. */
const NEO: Record<PieceType, string> = {
  p: "M22.5 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM17 21h11l3 9H14zM13 30h19v5H13z",
  r: "M12 11h5v4h4v-4h3v4h4v-4h5v8h-3v11h3v5H12v-5h3V19h-3z",
  n: "M13 35c0-7 3-11 7-14l-2-6 5 1 3-4c4 2 6 6 6 11 0 5-1 8-2 12zM18 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  b: "M22.5 6l6 9-6 12-6-12zM16 27h13v4H16zM13 31h19v5H13z",
  q: "M9 12l3.5 15h20L36 12l-6.5 7-3.5-9-3.5 9-3.5-9-3.5 9zM12 28h21v4H12zM10 32h25v5H10z",
  k: "M22.5 4v7M19 7.5h7M22.5 13l7 7-2 8h-10l-2-8zM14 29h17v4H14zM11 33h23v5H11z",
};

const SETS: Record<ChessPieceSet, Record<PieceType, string>> = {
  staunton: STAUNTON,
  neo: NEO,
  // A finish over the neo silhouettes, not a third carving. See the header.
  "3d_glass": NEO,
};

export interface PieceGlyphProps {
  type: PieceType;
  color: "w" | "b";
  set?: ChessPieceSet;
  /** CSS size; the SVG scales to its box. */
  size?: string | number;
}

export default function PieceGlyph({
  type,
  color,
  set = "neo",
  size = "100%",
}: PieceGlyphProps) {
  const paths = SETS[set] ?? NEO;
  const d = paths[type];
  const isWhite = color === "w";
  const glass = set === "3d_glass";

  // White pieces are light with a dark outline, black pieces the reverse.
  // Both carry the outline: without it a white piece disappears on a light
  // square and a black one on a dark square, which is the failure mode the
  // font glyphs already had on some platforms.
  const fill = isWhite ? "#F7F4EC" : "#2A2622";
  const stroke = isWhite ? "#2A2622" : "#0D0B09";

  // Stable per-piece id so two boards on one page cannot collide.
  const gid = `pc-${set}-${type}-${color}`;

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className="block drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      {glass && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isWhite ? "#FFFFFF" : "#5A5450"} />
            <stop offset="55%" stopColor={fill} />
            <stop offset="100%" stopColor={isWhite ? "#C9C2B4" : "#141210"} />
          </linearGradient>
        </defs>
      )}
      <path
        d={d}
        fill={glass ? `url(#${gid})` : fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {glass && (
        // A single highlight sweep sells the material without a second path
        // set to maintain.
        <path
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.45}
          strokeWidth={0.7}
          strokeLinejoin="round"
          transform="translate(-0.5 -0.6)"
        />
      )}
    </svg>
  );
}
