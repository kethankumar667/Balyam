import type { CSSProperties, ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Card as CardType, Rank } from "@shared/types";

const SUIT_GLYPHS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

/** Suit-specific ink color — Bhalyam Indian theme:
 *  Hearts=red, Diamonds=saffron/orange, Clubs=navy, Spades=black */
function suitInk(suit: string): string {
  if (suit === "H") return "#c8102e";
  if (suit === "D") return "#c75a00";
  if (suit === "C") return "#1b3a8c";
  return "#111827";
}
/** Lighter/brighter accent of the suit ink */
function suitGlow(suit: string): string {
  if (suit === "H") return "#e53e3e";
  if (suit === "D") return "#f97316";
  if (suit === "C") return "#3b82f6";
  return "#374151";
}

/**
 * Playing card — Bhalyam Indian theme.
 *
 * Design:
 *   - Warm parchment / ivory cardstock background for all cards
 *   - Four distinct suit colours: Hearts=red, Diamonds=saffron/orange,
 *     Clubs=navy-blue, Spades=black  (matching a traditional Indian deck)
 *   - Ace rank label shows "1" (Indian convention)
 *   - Face cards (J/Q/K) display double-headed Indian royal SVG artwork:
 *     turban warrior (J), crowned queen (Q), and crown-sceptre king (K)
 *   - Number cards (2–9) and Ace show a large centred suit pip
 *   - Printed jokers retain the purple gradient with a JOKER ribbon
 */
export function PlayingCard({
  card,
  isWildJoker = false,
  selected = false,
  dimmed = false,
  onClick,
  small = false,
  draggable,
}: {
  card: CardType;
  isWildJoker?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  small?: boolean;
  // When set, the rendered element advertises itself as a drag source so HTML5
  // drag fires even though the card is a <button>. Without this, mousedown is
  // captured by the button and never bubbles up to a draggable wrapper.
  draggable?: boolean;
}) {
  const ink = suitInk(card.suit);
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  const rankSize = small ? "text-[13px]" : "text-[13px] sm:text-[15px]";
  const suitCornerSize = small ? "text-[11px]" : "text-[10px] sm:text-[12px]";
  // Face cards (J/Q/K) get Indian royal SVG artwork.
  const isCourt =
    !card.isPrintedJoker &&
    (card.rank === "J" || card.rank === "Q" || card.rank === "K");
  // "Index" treatment for 10 and A — large rank between two pips.
  const isIndex =
    !card.isPrintedJoker &&
    !isCourt &&
    (card.rank === "T" || card.rank === "A");
  // Plain number pip size for 2–9 and for A/10 fallback centre pip.
  const centerSize = small ? "text-[24px]" : "text-[22px] sm:text-[28px]";
  const Tag: ElementType = draggable ? "div" : onClick ? "button" : "div";
  const ariaProps = draggable && onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
        onClick,
      }
    : onClick && !draggable
    ? { onClick, disabled: false }
    : {};
  const touchActionStyle: CSSProperties = draggable
    ? { touchAction: "none" }
    : {};

  // Printed joker — bolder gradient with a fan motif behind the JOKER ribbon.
  if (card.isPrintedJoker) {
    return (
      <Tag
        draggable={draggable}
        {...ariaProps}
        className={`rummy-playing-card relative ${sizeCls} rounded-[7px] flex-shrink-0 transition transform select-none overflow-hidden
          ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : ""}
          ${dimmed ? "opacity-50" : ""}
          ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
        style={{
          ...touchActionStyle,
          background:
            "linear-gradient(140deg, #6d28d9 0%, #4c1d95 55%, #2e1065 100%)",
          border: "1px solid #1e0843",
          boxShadow: selected
            ? "0 12px 24px rgba(245,158,11,0.45), inset 0 0 0 1px rgba(251,191,36,0.5), 0 2px 4px rgba(0,0,0,0.3)"
            : "0 3px 6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(251,191,36,0.35)",
        }}
        title="Printed Joker"
      >
        {/* Diagonal sheen */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.10) 100%)",
          }}
        />
        {/* Star burst */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(251,191,36,0.32) 0%, rgba(251,191,36,0) 55%)",
          }}
        />
        {/* Centre ribbon */}
        <span
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-1 py-0.5 text-center font-black tracking-[0.2em] text-[8px] sm:text-[9px]"
          style={{
            color: "#fef3c7",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.0), rgba(0,0,0,0.45), rgba(0,0,0,0.0))",
            borderTop: "1px solid rgba(251,191,36,0.55)",
            borderBottom: "1px solid rgba(251,191,36,0.55)",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        >
          JOKER
        </span>
        {/* Corner mini-stars hinting "wild" */}
        <span className="absolute top-0.5 left-1 text-[9px] text-amber-200/85" aria-hidden>★</span>
        <span className="absolute bottom-0.5 right-1 text-[9px] text-amber-200/85 rotate-180" aria-hidden>★</span>
      </Tag>
    );
  }

  return (
    <Tag
      draggable={draggable}
      {...ariaProps}
      className={`rummy-playing-card relative ${sizeCls} rounded-[7px] flex-shrink-0 transition transform select-none overflow-hidden
        ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : ""}
        ${dimmed ? "opacity-50" : ""}
        ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
      style={{
        ...touchActionStyle,
        // Warm parchment for all cards — matches the Indian Bhalyam aesthetic.
        background: isCourt
          ? "linear-gradient(168deg, #fffbf0 0%, #fff7e0 55%, #fef0c0 100%)"
          : "linear-gradient(168deg, #fffdf8 0%, #fff9ef 60%, #fef3d8 100%)",
        border: isCourt ? `1.5px solid ${ink}` : "1.5px solid #b0a080",
        boxShadow: selected
          ? "0 14px 26px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(252,211,77,0.7)"
          : isCourt
          ? `0 4px 9px rgba(0,0,0,0.30), inset 0 0 0 2px rgba(212,160,23,0.28)`
          : "0 4px 9px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(176,160,128,0.22)",
      }}
    >
      {/* Top glossy sheen */}
      <div
        className="absolute inset-x-1 top-0.5 h-4 rounded-t-[5px] opacity-55"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))",
        }}
        aria-hidden
      />
      {/* Top-left corner — rank above suit */}
      <div
        className={`absolute top-[1px] left-[3px] leading-[0.92] font-black ${rankSize}`}
        style={{
          color: ink,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div
          className={`${suitCornerSize} leading-none mt-[1px]`}
          style={{ color: ink }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      </div>

      {/* Centre — face cards get Indian royal artwork; index cards (10/A)
          get a rank-between-pips treatment; number cards 2–9 get a big pip. */}
      {isCourt ? (
        <IndianCourtCenter rank={card.rank as "J" | "Q" | "K"} suit={card.suit} small={small} />
      ) : isIndex ? (
        <IndexCenter rank={card.rank} suit={card.suit} ink={ink} small={small} />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center font-black ${centerSize}`}
          style={{
            color: ink,
            textShadow: `0 1px 1px ${ink}30`,
          }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      )}

      {/* Bottom-right mirror corner */}
      <div
        className={`absolute bottom-[1px] right-[3px] leading-[0.92] font-black rotate-180 ${rankSize}`}
        style={{
          color: ink,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div
          className={`${suitCornerSize} leading-none mt-[1px]`}
          style={{ color: ink }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      </div>

      {/* Wild-rank-match joker badges — top-right AND bottom-left so the
          card reads as a joker regardless of how it's fanned/overlapped in
          the player's hand. A card behind a sibling on its right is
          covered on the right edge; one behind a sibling on its left is
          covered on the left edge. Duplicating the marker into the
          opposite corners means at least one is always visible. */}
      {isWildJoker && (
        <>
          <div
            className="absolute top-[1px] right-[1px] w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #ea580c)",
              color: "#1f1300",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45)",
            }}
            title="Wild Joker"
          >
            J
          </div>
          <div
            className="absolute bottom-[1px] left-[1px] w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #ea580c)",
              color: "#1f1300",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45)",
              transform: "rotate(180deg)",
            }}
            title="Wild Joker"
            aria-hidden
          >
            J
          </div>
        </>
      )}
    </Tag>
  );
}

/**
 * Centre artwork for the "index" cards — 10 and A.
 * A large rank glyph sits between two mirrored suit pips inside a slim frame.
 */
function IndexCenter({
  rank,
  suit,
  ink,
  small,
}: {
  rank: Rank;
  suit: string;
  ink: string;
  small: boolean;
}) {
  const label = rankLabel(rank);
  const isTen = rank === "T";
  const frameW = small ? 28 : 34;
  const frameH = small ? 38 : 46;
  const letterSize = Math.round((small ? 21 : 26) * (isTen ? 0.7 : 1));
  const pipSize = small ? 8 : 9;

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div
        className="flex flex-col items-center justify-center gap-0.5 rounded-[3px]"
        style={{
          width: frameW,
          height: frameH,
        }}
      >
        <span style={{ color: ink, fontSize: pipSize, lineHeight: 1 }}>
          {SUIT_GLYPHS[suit]}
        </span>
        <span
          className="font-black leading-none"
          style={{
            color: ink,
            fontSize: letterSize,
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 1px rgba(0,0,0,0.15)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: ink,
            fontSize: pipSize,
            lineHeight: 1,
            transform: "rotate(180deg)",
          }}
        >
          {SUIT_GLYPHS[suit]}
        </span>
      </div>
    </div>
  );
}

/**
 * Double-headed Indian royal artwork for face cards (J, Q, K).
 *
 * Each figure is drawn in the top half of a 30×42 SVG viewBox and then
 * the same figure is rotated 180° around the centre point to produce the
 * traditional "double-headed" court-card layout.  Garments and accessories
 * use the suit's own ink colour; gold (#d4a017) is used for jewellery,
 * crowns, and sceptre ornaments; skin tone is warm ochre (#e8c89a).
 */
function IndianCourtCenter({
  rank,
  suit,
  small,
}: {
  rank: "J" | "Q" | "K";
  suit: string;
  small: boolean;
}) {
  const ink = suitInk(suit);
  const gold = "#d4a017";
  const skin = "#e8c89a";
  const vw = small ? 26 : 30;
  const vh = small ? 36 : 42;
  const cx = vw / 2;
  const hh = vh / 2; // half-height — bottom figure pivots around this

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width={vw}
        height={vh}
        style={{ overflow: "visible" }}
      >
        {/* Top figure */}
        <CourtFigureTop rank={rank} ink={ink} gold={gold} skin={skin} cx={cx} hh={hh} />

        {/* Bottom figure — same figure rotated 180° around the centre point */}
        <g transform={`rotate(180, ${cx}, ${hh})`}>
          <CourtFigureTop rank={rank} ink={ink} gold={gold} skin={skin} cx={cx} hh={hh} />
        </g>

        {/* Centre divider ornament */}
        <line x1="3" y1={hh} x2={vw - 3} y2={hh} stroke={`${ink}77`} strokeWidth="0.5" />
        <polygon
          points={`${cx},${hh - 2.5} ${cx + 2},${hh} ${cx},${hh + 2.5} ${cx - 2},${hh}`}
          fill={gold}
        />
      </svg>
    </div>
  );
}

/** Draws the top-half royal figure (head near y≈2, feet near y≈hh-1). */
function CourtFigureTop({
  rank,
  ink,
  gold,
  skin,
  cx,
  hh,
}: {
  rank: "J" | "Q" | "K";
  ink: string;
  gold: string;
  skin: string;
  cx: number;
  hh: number;
}) {
  if (rank === "K") return <KingTop ink={ink} gold={gold} skin={skin} cx={cx} hh={hh} />;
  if (rank === "Q") return <QueenTop ink={ink} gold={gold} skin={skin} cx={cx} hh={hh} />;
  return <JackTop ink={ink} gold={gold} skin={skin} cx={cx} hh={hh} />;
}

/* ───────── KING ───────── */
function KingTop({ ink, gold, skin, cx, hh }: { ink: string; gold: string; skin: string; cx: number; hh: number }) {
  const bY = hh - 1; // bottom of figure
  const fY = bY - 5; // top of torso / shoulder line
  const fy = fY - 6; // chin
  const ey = fy - 1; // eyes
  const crownBase = ey - 3;

  return (
    <g>
      {/* Sceptre shaft (right side) */}
      <line x1={cx + 9} y1={1.5} x2={cx + 9} y2={bY} stroke={ink} strokeWidth="1.4" />
      {/* Sceptre top orb */}
      <circle cx={cx + 9} cy={2.5} r={2} fill={gold} stroke={ink} strokeWidth="0.5" />
      <circle cx={cx + 9} cy={2.5} r={0.8} fill={ink} />
      {/* Sceptre mid ring */}
      <line x1={cx + 7.5} y1={hh / 2} x2={cx + 10.5} y2={hh / 2} stroke={gold} strokeWidth="0.8" />

      {/* Crown — three arched points */}
      <path
        d={`M ${cx - 8},${crownBase + 2} L ${cx - 8},${crownBase - 1} L ${cx - 5},${crownBase + 2}`}
        fill={ink} stroke={ink} strokeWidth="0.3"
      />
      <path
        d={`M ${cx - 3},${crownBase + 2} L ${cx - 2.5},${crownBase - 3} L ${cx},${crownBase - 5} L ${cx + 2.5},${crownBase - 3} L ${cx + 3},${crownBase + 2}`}
        fill={ink} stroke={ink} strokeWidth="0.3"
      />
      <path
        d={`M ${cx + 5},${crownBase + 2} L ${cx + 8},${crownBase - 1} L ${cx + 8},${crownBase + 2}`}
        fill={ink} stroke={ink} strokeWidth="0.3"
      />
      {/* Crown base band */}
      <rect x={cx - 8} y={crownBase + 2} width={16} height={2.5} fill={ink} rx="0.5" />
      {/* Crown jewels */}
      <circle cx={cx} cy={crownBase - 4} r={1.3} fill={gold} stroke={ink} strokeWidth="0.3" />
      <circle cx={cx - 6} cy={crownBase} r={0.8} fill={gold} />
      <circle cx={cx + 6} cy={crownBase} r={0.8} fill={gold} />

      {/* Face */}
      <ellipse cx={cx} cy={fy + 3} rx={5} ry={5.5} fill={skin} />
      {/* Eyes */}
      <ellipse cx={cx - 1.8} cy={ey + 3} rx={0.8} ry={1} fill="#1a0800" />
      <ellipse cx={cx + 1.8} cy={ey + 3} rx={0.8} ry={1} fill="#1a0800" />
      {/* Mustache */}
      <path d={`M ${cx - 3.5},${fy + 4.5} Q ${cx},${fy + 6} ${cx + 3.5},${fy + 4.5}`}
        stroke="#5a3a00" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Beard hint */}
      <path d={`M ${cx - 2.5},${fy + 5.5} Q ${cx},${fy + 7.5} ${cx + 2.5},${fy + 5.5}`}
        stroke="#5a3a00" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* Body — sherwani */}
      <path
        d={`M ${cx - 7},${fY} L ${cx + 6},${fY} L ${cx + 6},${bY} L ${cx - 7},${bY} Z`}
        fill={ink}
      />
      {/* V-neck */}
      <path d={`M ${cx - 1.5},${fY} L ${cx},${fY + 1.5} L ${cx + 1.5},${fY}`}
        fill="none" stroke="#fffbf0" strokeWidth="0.6" />
      {/* Gold chest ornament */}
      <path d={`M ${cx - 1},${fY + 2} L ${cx},${fY + 1} L ${cx + 1},${fY + 2} L ${cx},${fY + 3} Z`}
        fill={gold} />
      {/* Epaulettes */}
      <circle cx={cx - 7} cy={fY + 0.5} r={2} fill={gold} stroke={ink} strokeWidth="0.4" />
      <circle cx={cx - 7} cy={fY + 0.5} r={0.9} fill={ink} />
      <circle cx={cx + 6} cy={fY + 0.5} r={2} fill={gold} stroke={ink} strokeWidth="0.4" />
      <circle cx={cx + 6} cy={fY + 0.5} r={0.9} fill={ink} />

      {/* Right arm extended to sceptre */}
      <path d={`M ${cx + 6},${fY + 2} Q ${cx + 8},${fY + 3} ${cx + 9},${bY - 1}`}
        stroke={skin} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ───────── QUEEN ───────── */
function QueenTop({ ink, gold, skin, cx, hh }: { ink: string; gold: string; skin: string; cx: number; hh: number }) {
  const bY = hh - 1;
  const fY = bY - 5;
  const fy = fY - 6;
  const ey = fy - 1;
  const crownBase = ey - 2.5;

  return (
    <g>
      {/* Lotus held in left hand */}
      <line x1={cx - 9} y1={bY} x2={cx - 9} y2={bY - 5} stroke="#4a7c40" strokeWidth="1" />
      <ellipse cx={cx - 9} cy={bY - 7} rx={3} ry={2} fill="#f9a8d4" />
      <ellipse cx={cx - 9} cy={bY - 6.5} rx={2} ry={1.2} fill="#f472b6" />
      <circle cx={cx - 9} cy={bY - 7} r={0.8} fill="#fbbf24" />

      {/* Tiara / crown — delicate arches */}
      <path
        d={`M ${cx - 7},${crownBase + 1.5} L ${cx - 5.5},${crownBase - 0.5} L ${cx - 4},${crownBase + 1.5}`}
        fill={ink} stroke={gold} strokeWidth="0.3"
      />
      <path
        d={`M ${cx - 3},${crownBase + 1.5} L ${cx - 1.5},${crownBase - 2} L ${cx},${crownBase - 3.5} L ${cx + 1.5},${crownBase - 2} L ${cx + 3},${crownBase + 1.5}`}
        fill={ink} stroke={gold} strokeWidth="0.3"
      />
      <path
        d={`M ${cx + 4},${crownBase + 1.5} L ${cx + 5.5},${crownBase - 0.5} L ${cx + 7},${crownBase + 1.5}`}
        fill={ink} stroke={gold} strokeWidth="0.3"
      />
      <rect x={cx - 7} y={crownBase + 1.5} width={14} height={2} fill={ink} rx="0.4" />
      {/* Crown jewels */}
      <circle cx={cx} cy={crownBase - 3} r={1.2} fill={gold} stroke={ink} strokeWidth="0.3" />
      <circle cx={cx - 5.5} cy={crownBase + 0.5} r={0.7} fill={gold} />
      <circle cx={cx + 5.5} cy={crownBase + 0.5} r={0.7} fill={gold} />

      {/* Maang tikka chain + jewel */}
      <line x1={cx} y1={crownBase + 3.5} x2={cx} y2={ey + 1.5} stroke={gold} strokeWidth="0.5" strokeDasharray="0.8 0.6" />
      <circle cx={cx} cy={ey + 1.5} r={1} fill={gold} stroke={ink} strokeWidth="0.3" />

      {/* Face */}
      <ellipse cx={cx} cy={fy + 3} rx={4.8} ry={5.3} fill={skin} />
      {/* Eyes — slightly larger with eyelash hint */}
      <ellipse cx={cx - 1.8} cy={ey + 3.5} rx={0.9} ry={1.1} fill="#1a0800" />
      <ellipse cx={cx + 1.8} cy={ey + 3.5} rx={0.9} ry={1.1} fill="#1a0800" />
      <line x1={cx - 2.7} y1={ey + 2.5} x2={cx - 0.9} y2={ey + 2.5} stroke="#1a0800" strokeWidth="0.5" />
      <line x1={cx + 0.9} y1={ey + 2.5} x2={cx + 2.7} y2={ey + 2.5} stroke="#1a0800" strokeWidth="0.5" />
      {/* Bindi (always red) */}
      <circle cx={cx} cy={ey + 1} r={0.7} fill="#c8102e" />
      {/* Lips */}
      <path d={`M ${cx - 1.8},${fy + 5.2} Q ${cx},${fy + 6.4} ${cx + 1.8},${fy + 5.2}`}
        stroke="#b05060" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      {/* Earrings */}
      <ellipse cx={cx - 5.2} cy={fy + 3} rx={0.7} ry={2} fill={gold} stroke={ink} strokeWidth="0.3" />
      <ellipse cx={cx + 5.2} cy={fy + 3} rx={0.7} ry={2} fill={gold} stroke={ink} strokeWidth="0.3" />

      {/* Body — saree blouse + dupatta */}
      <path
        d={`M ${cx - 6},${fY} L ${cx + 7},${fY} L ${cx + 7},${bY} L ${cx - 6},${bY} Z`}
        fill={ink}
      />
      {/* Necklace */}
      <path d={`M ${cx - 3.5},${fY + 0.5} Q ${cx},${fY + 2.5} ${cx + 3.5},${fY + 0.5}`}
        stroke={gold} strokeWidth="0.7" fill="none" />
      <circle cx={cx} cy={fY + 2.2} r={0.8} fill={gold} />
      {/* Dupatta drape diagonal lines */}
      <line x1={cx - 6} y1={fY + 2} x2={cx - 1} y2={bY} stroke="#fffbf0" strokeWidth="0.5" opacity="0.6" />

      {/* Left arm reaching to lotus */}
      <path d={`M ${cx - 6},${fY + 2} Q ${cx - 8},${fY + 3} ${cx - 9},${bY - 1}`}
        stroke={skin} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ───────── JACK ───────── */
function JackTop({ ink, gold, skin, cx, hh }: { ink: string; gold: string; skin: string; cx: number; hh: number }) {
  const bY = hh - 1;
  const fY = bY - 5;
  const fy = fY - 6;
  const ey = fy - 1;
  const turbanBase = ey - 2;

  return (
    <g>
      {/* Sword on left side */}
      <path d={`M ${cx - 9},${turbanBase + 3} L ${cx - 8},${bY}`}
        stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {/* Sword crossguard */}
      <line x1={cx - 11} y1={hh / 2 + 1} x2={cx - 6.5} y2={hh / 2 + 1}
        stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
      {/* Sword pommel */}
      <circle cx={cx - 9} cy={turbanBase + 3.5} r={1.5} fill={gold} stroke={ink} strokeWidth="0.4" />

      {/* Turban / pagri dome */}
      <path
        d={`M ${cx - 7},${turbanBase + 3} C ${cx - 8},${turbanBase - 2} ${cx - 4},${turbanBase - 4} ${cx},${turbanBase - 5} C ${cx + 4},${turbanBase - 4} ${cx + 8},${turbanBase - 2} ${cx + 7},${turbanBase + 3} Z`}
        fill={ink}
      />
      {/* Turban band */}
      <rect x={cx - 7} y={turbanBase + 2.5} width={14} height={2.5} fill={`${ink}dd`} rx="0.4" />
      {/* Turban wrap lines */}
      <path d={`M ${cx - 6.5},${turbanBase + 1} C ${cx - 2},${turbanBase - 1} ${cx + 2},${turbanBase - 1} ${cx + 6.5},${turbanBase + 1}`}
        stroke="#fffbf0" strokeWidth="0.35" fill="none" opacity="0.7" />
      <path d={`M ${cx - 6},${turbanBase} C ${cx - 2},${turbanBase - 2} ${cx + 2},${turbanBase - 2} ${cx + 6},${turbanBase}`}
        stroke="#fffbf0" strokeWidth="0.35" fill="none" opacity="0.5" />
      {/* Turban jewel (diamond-shaped) */}
      <path d={`M ${cx},${turbanBase - 2} L ${cx + 1.5},${turbanBase} L ${cx},${turbanBase + 2} L ${cx - 1.5},${turbanBase} Z`}
        fill={gold} stroke={ink} strokeWidth="0.3" />
      {/* Plume (peacock feather hint) */}
      <path d={`M ${cx + 2},${turbanBase - 4} C ${cx + 3},${turbanBase - 7} ${cx + 1},${turbanBase - 9} ${cx},${turbanBase - 9}`}
        stroke="#22c55e" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={turbanBase - 9} r={0.8} fill="#1d4ed8" />

      {/* Face */}
      <ellipse cx={cx} cy={fy + 3} rx={5} ry={5.5} fill={skin} />
      {/* Eyes */}
      <ellipse cx={cx - 1.8} cy={ey + 3} rx={0.8} ry={1} fill="#1a0800" />
      <ellipse cx={cx + 1.8} cy={ey + 3} rx={0.8} ry={1} fill="#1a0800" />
      {/* Young mustache (light) */}
      <path d={`M ${cx - 3},${fy + 4.8} Q ${cx},${fy + 5.8} ${cx + 3},${fy + 4.8}`}
        stroke="#5a3a00" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* Body — angarkha */}
      <path
        d={`M ${cx - 6.5},${fY} L ${cx + 7.5},${fY} L ${cx + 7.5},${bY} L ${cx - 6.5},${bY} Z`}
        fill={ink}
      />
      {/* Waist belt */}
      <rect x={cx - 6.5} y={bY - 2} width={14} height={1.5} fill={gold} rx="0.4" />
      {/* Chest emblem */}
      <path d={`M ${cx},${fY + 1} L ${cx + 1.2},${fY + 2.2} L ${cx},${fY + 3.4} L ${cx - 1.2},${fY + 2.2} Z`}
        fill={gold} />
      {/* Shoulder epaulettes */}
      <circle cx={cx - 6.5} cy={fY + 0.5} r={1.8} fill={gold} stroke={ink} strokeWidth="0.4" />
      <circle cx={cx - 6.5} cy={fY + 0.5} r={0.8} fill={ink} />
      <circle cx={cx + 7.5} cy={fY + 0.5} r={1.8} fill={gold} stroke={ink} strokeWidth="0.4" />
      <circle cx={cx + 7.5} cy={fY + 0.5} r={0.8} fill={ink} />

      {/* Left arm reaching to sword */}
      <path d={`M ${cx - 6.5},${fY + 2.5} Q ${cx - 8},${fY + 3.5} ${cx - 8.5},${bY - 1}`}
        stroke={skin} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

/**
 * Card back used for the closed deck and other face-down piles.
 *
 * Diamond lattice over a deep crimson gradient, with a gold inner border
 * and a centred "B" monogram (BHALYAM). The pattern is pure CSS so it
 * scales crisply at all card sizes.
 */
export function FaceDownCard({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-[7px] flex-shrink-0 relative overflow-hidden`}
      style={{
        background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
        border: "1.5px solid #2c0507",
        boxShadow:
          "0 4px 9px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(251,191,36,0.55)",
      }}
    >
      {/* Diamond lattice */}
      <div
        aria-hidden
        className="absolute inset-1 rounded-[4px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px)",
          border: "1px solid rgba(251,191,36,0.4)",
        }}
      />
      {/* Centre monogram */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className="inline-flex items-center justify-center rounded-full font-black"
          style={{
            width: small ? 18 : 22,
            height: small ? 18 : 22,
            background: "radial-gradient(circle, #fbbf24 0%, #d97706 100%)",
            color: "#3a1f00",
            fontSize: small ? 10 : 12,
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.55)",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          B
        </span>
      </div>
      {/* Subtle glossy sheen */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-3 opacity-25"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0))",
        }}
      />
    </div>
  );
}

export function FinishSlot({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-[7px] flex-shrink-0 flex items-center justify-center text-[8px] uppercase tracking-widest font-black text-emerald-200`}
      style={{
        background: "rgba(6,78,59,0.5)",
        border: "2px dashed rgba(16,185,129,0.7)",
      }}
    >
      Finish
      <br />
      Slot
    </div>
  );
}

function rankLabel(r: Rank): string {
  if (r === "T") return "10";
  return r;
}
