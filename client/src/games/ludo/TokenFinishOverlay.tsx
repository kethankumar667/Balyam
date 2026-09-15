/**
 * Premium token "craftsmanship finish" overlays.
 *
 * Unlike the reference pawn images (each a fixed color), every finish here
 * is colored entirely from the two values passed in — `main`/`dark`, the
 * SAME seat-color pair `Token.tsx` already derives from `COLOR_HEX`/
 * `COLOR_HEX_DARK`. A finish is a rendering TECHNIQUE (facets, grain,
 * cracks, sparkle...), never a fixed hue — a player's token always reads as
 * their own seat color, no matter which finish they've equipped. This is
 * deliberate: seat-color identity is how players tell pawns apart on the
 * board (and is what the color-blind glyph mode supplements), so a
 * purchased skin must never override it.
 *
 * Rendered as a `<g>` meant to sit inside the pawn's own
 * `viewBox="-50 -65 100 130"` coordinate space, layered on top of the base
 * body/neck/head paint in `PawnGlyph.tsx` and below any label/glyph text.
 */

const GOLD = "#F5C542";

export type TokenFinishId =
  | "polishedPearl"
  | "carvedGrain"
  | "matteNoir"
  | "roseGlass"
  | "crystalFacet"
  | "chromeMirror"
  | "iceCrystal"
  | "veinedMarble"
  | "gemCut"
  | "moltenCore"
  | "engravedLattice"
  | "nebulaSwirl"
  | "holographicShift";

export function TokenFinishOverlay({
  finish,
  main,
  dark,
}: {
  finish: TokenFinishId | undefined;
  main: string;
  dark: string;
}) {
  if (!finish) return null;

  switch (finish) {
    case "polishedPearl":
      return (
        <>
          <ellipse cx="-6" cy="-8" rx="16" ry="24" fill="white" opacity="0.28" />
          <ellipse cx="-8" cy="-40" rx="8" ry="10" fill="white" opacity="0.4" />
        </>
      );

    case "carvedGrain":
      return (
        <g stroke={dark} strokeWidth="1.1" opacity="0.45" fill="none">
          <path d="M -18 30 Q 0 26 18 30" />
          <path d="M -19 14 Q 0 10 19 14" />
          <path d="M -18 -2 Q 0 -6 18 -2" />
          <path d="M -14 -16 Q 0 -19 14 -16" />
        </g>
      );

    case "matteNoir":
      return (
        <>
          <path
            d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
            fill="black"
            opacity="0.22"
          />
          <ellipse cx="-5" cy="-40" rx="4" ry="5" fill="white" opacity="0.22" />
          <path d="M -20 40 Q -28 0 -14 -18" stroke="black" strokeWidth="1.5" opacity="0.3" fill="none" strokeLinecap="round" />
        </>
      );

    case "roseGlass":
      return (
        <>
          <circle cx="0" cy="-10" r="34" fill="white" opacity="0.1" />
          <ellipse cx="-6" cy="-8" rx="14" ry="22" fill="white" opacity="0.38" />
          <ellipse cx="-6" cy="-40" rx="7" ry="9" fill="white" opacity="0.55" />
        </>
      );

    case "crystalFacet":
      return (
        <g stroke="white" strokeWidth="1.3" opacity="0.65" fill="none">
          <path d="M 0 -56 L -14 -37 L 0 -18" />
          <path d="M 0 -56 L 14 -37 L 0 -18" />
          <path d="M -14 -37 L 0 -37 L 14 -37" />
        </g>
      );

    case "chromeMirror":
      return (
        <g>
          <path d="M -14 40 Q -20 0 -10 -30" stroke="white" strokeWidth="3" opacity="0.5" fill="none" strokeLinecap="round" />
          <path d="M 6 44 Q 12 10 8 -22" stroke="white" strokeWidth="1.6" opacity="0.35" fill="none" strokeLinecap="round" />
          <ellipse cx="0" cy="20" rx="20" ry="6" fill={dark} opacity="0.35" />
        </g>
      );

    case "iceCrystal":
      return (
        <>
          <ellipse cx="0" cy="-10" rx="24" ry="38" fill="#EFF6FF" opacity="0.12" />
          <g stroke="#F0F9FF" strokeWidth="0.9" opacity="0.7" fill="none">
            <path d="M -16 20 L -6 6 L -12 -8" />
            <path d="M 14 30 L 6 12 L 12 -4" />
            <path d="M -4 -30 L 4 -42 L -2 -52" />
          </g>
        </>
      );

    case "veinedMarble":
      return (
        <>
          <ellipse cx="0" cy="-10" rx="26" ry="40" fill="white" opacity="0.14" />
          <g stroke={dark} strokeWidth="0.7" opacity="0.5" fill="none">
            <path d="M -18 40 Q -8 18 -14 -4 Q -18 -20 -8 -34" />
            <path d="M 12 44 Q 18 20 10 0 Q 4 -18 12 -40" />
          </g>
        </>
      );

    case "gemCut":
      return (
        <g>
          <g stroke="white" strokeWidth="0.9" opacity="0.6" fill="none">
            <path d="M -20 40 L 0 20 L 20 40" />
            <path d="M -16 10 L 0 -6 L 16 10" />
            <path d="M 0 -56 L -14 -37 L 0 -18 L 14 -37 Z" />
          </g>
          <ellipse cx="-7" cy="-42" rx="5" ry="6" fill="white" opacity="0.6" />
          <ellipse cx="0" cy="-18" rx="21" ry="6.5" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.85" />
        </g>
      );

    case "moltenCore":
      return (
        <>
          <path
            d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
            fill="black"
            opacity="0.3"
          />
          <g stroke={main} strokeWidth="1.4" fill="none" opacity="0.9">
            <path d="M -14 40 L -4 18 L -10 0" />
            <path d="M 10 42 L 4 20 L 12 2" />
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
          </g>
          <circle cx="0" cy="-10" r="30" fill="none" stroke={main} strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="28;33;28" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      );

    case "engravedLattice":
      return (
        <g stroke={GOLD} strokeWidth="1.4" opacity="0.85" fill="none">
          <path d="M -10 30 L 0 22 L 10 30 L 0 38 Z" />
          <path d="M -10 8 L 0 0 L 10 8 L 0 16 Z" />
          <path d="M -8 -14 L 0 -20 L 8 -14 L 0 -8 Z" />
          <circle cx="0" cy="-48" r="6" fill="none" strokeWidth="1.6" />
        </g>
      );

    case "nebulaSwirl":
      return (
        <>
          <path
            d="M -22 46 Q -32 0 -16 -20 Q 0 -32 16 -20 Q 32 0 22 46 Z"
            fill="black"
            opacity="0.32"
          />
          <path d="M -18 22 Q 0 2 16 -12" stroke="white" strokeWidth="1.4" opacity="0.4" fill="none" strokeLinecap="round" />
          <path d="M -14 -4 Q 4 -18 8 -38" stroke={main} strokeWidth="2" opacity="0.5" fill="none" strokeLinecap="round" />
          {[
            [-12, 32],
            [9, 26],
            [-16, 12],
            [7, 8],
            [-4, -12],
            [13, -18],
            [-8, -32],
            [4, -46],
            [-14, -40],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.9 : 1.3} fill={i % 3 === 0 ? GOLD : "white"} opacity="0.95">
              <animate attributeName="opacity" values="0.25;1;0.25" dur={`${1.4 + i * 0.25}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </>
      );

    case "holographicShift":
      return (
        <g opacity="0.65">
          <path d="M -20 36 L -6 -6" stroke="white" strokeWidth="3.5" opacity="0.4" strokeLinecap="round" />
          <path d="M -6 44 L 8 -14" stroke={GOLD} strokeWidth="2.6" opacity="0.5" strokeLinecap="round" />
          <path d="M 10 40 L 20 4" stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
          <animate attributeName="opacity" values="0.45;0.8;0.45" dur="2.4s" repeatCount="indefinite" />
        </g>
      );

    default:
      return null;
  }
}
