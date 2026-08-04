import { useId } from "react";
import type { CSSProperties, ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Card as CardType, Rank } from "@shared/types";

// The Card Room token system + this component's own rules. Imported here
// because Card.tsx is the atom every Rummy surface pulls in — board, result
// modal and tutorial all render cards — so one import covers the whole skin.
import "./rummy-tokens.css";
import "./rummy-card.css";

export const SUIT_GLYPHS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

/**
 * Suit → the token holding that suit's printed ink.
 *
 * Four colours, not two. The Indian convention this deck already followed is
 * also the more legible one here: a fanned 13-card hand shows only the
 * top-left corner of each card, so hue is carrying real information. The
 * tokens are tuned so the two confusable pairs (red/saffron, black/navy)
 * separate by LIGHTNESS as well as hue — see rummy-tokens.css.
 */
const SUIT_INK: Record<string, string> = {
  S: "var(--rm-suit-spade)",
  H: "var(--rm-suit-heart)",
  D: "var(--rm-suit-diamond)",
  C: "var(--rm-suit-club)",
};

function suitInk(suit: string): string {
  return SUIT_INK[suit] ?? SUIT_INK.S;
}

/**
 * The card's transient states, beyond the persistent `selected` / `dimmed`.
 *
 * These exist because drag-to-meld had no way to say "this move is in flight",
 * "the server refused it" or "that meld scores" — it failed silently, which is
 * the single most confusing thing the table did.
 */
export type CardState = "idle" | "loading" | "error" | "success";
export type CardSize = "sm" | "md" | "lg";

/** Cards may not be interacted with while a move is resolving or barred. */
function isInert(state: CardState, disabled: boolean): boolean {
  return disabled || state === "loading";
}

function sizeClass(size: CardSize): string {
  if (size === "sm") return " rm-card--sm";
  if (size === "lg") return " rm-card--lg";
  return "";
}

/**
 * Playing card — Bhalyam Indian theme, Card Room skin.
 *
 * Design:
 *   - Warm card stock (--rm-card), never pure white: #fff on dark felt glares
 *     under a turn timer.
 *   - ONE hairline edge. The previous card stacked a 1.5px border, a 2px inset
 *     ring, a 1px inset highlight and a drop shadow — four weights on a 40px
 *     object, which is most of why a fanned hand read as noise.
 *   - Four suit colours (Hearts red, Diamonds saffron, Clubs navy, Spades
 *     black), each verified to 4.5:1 on card stock in both themes.
 *   - Rank labels are "A" and "10" (see rankLabel).
 *   - Face cards (J/Q/K) keep the double-headed Indian royal artwork: this is
 *     where the nostalgia lives, so it is the one deliberately ornamental
 *     surface in the whole table.
 *   - Elevation is expressed as LIGHT, not a shadow stack — the table is lit
 *     from above centre, so a card that matters rises toward the light.
 */
export function PlayingCard({
  card,
  isWildJoker = false,
  selected = false,
  dimmed = false,
  onClick,
  small = false,
  size,
  state = "idle",
  disabled = false,
  draggable,
  title,
}: {
  card: CardType;
  isWildJoker?: boolean;
  selected?: boolean;
  /** De-emphasised but still playable — NOT the same as `disabled`. */
  dimmed?: boolean;
  onClick?: () => void;
  /** Legacy size flag. `size` wins when both are given. */
  small?: boolean;
  size?: CardSize;
  /** Transient feedback for drag-to-meld. */
  state?: CardState;
  /** Out of play — cannot be picked up at all. */
  disabled?: boolean;
  // When set, the rendered element advertises itself as a drag source so HTML5
  // drag fires even though the card is a <button>. Without this, mousedown is
  // captured by the button and never bubbles up to a draggable wrapper.
  draggable?: boolean;
  title?: string;
}) {
  const ink = suitInk(card.suit);
  const resolvedSize: CardSize = size ?? (small ? "sm" : "md");
  const inert = isInert(state, disabled);
  const interactive = Boolean(onClick) && !inert;

  // Face cards (J/Q/K) get Indian royal SVG artwork.
  const isCourt =
    !card.isPrintedJoker &&
    (card.rank === "J" || card.rank === "Q" || card.rank === "K");
  // "Index" treatment for 10 and A — large rank between two pips.
  const isIndex =
    !card.isPrintedJoker &&
    !isCourt &&
    (card.rank === "T" || card.rank === "A");

  const Tag: ElementType = draggable ? "div" : onClick ? "button" : "div";

  // A <div> drag source still has to behave like a button for keyboard users;
  // a real <button> gets that for free. Neither should be reachable by tab
  // while it is inert.
  const ariaProps =
    draggable && onClick
      ? {
          role: "button" as const,
          tabIndex: inert ? -1 : 0,
          "aria-disabled": inert || undefined,
          onKeyDown: (e: ReactKeyboardEvent) => {
            if (inert) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          },
          onClick: inert ? undefined : onClick,
        }
      : onClick && !draggable
      ? { onClick: inert ? undefined : onClick, disabled: inert }
      : {};

  const cls =
    "rummy-playing-card rm-card" +
    sizeClass(resolvedSize) +
    (interactive ? " rm-card--interactive" : "") +
    (selected ? " is-selected" : "") +
    (dimmed ? " is-dimmed" : "") +
    (disabled ? " is-disabled" : "") +
    (state !== "idle" ? ` is-${state}` : "");

  const cardStyle = {
    "--rm-suit-ink": ink,
    ...(draggable ? { touchAction: "none" } : null),
  } as CSSProperties;

  // Printed joker — the one violet in the set, per the token system.
  if (card.isPrintedJoker) {
    return (
      <Tag
        draggable={draggable && !inert}
        {...ariaProps}
        className={`${cls} rm-card--joker`}
        style={cardStyle}
        title={title ?? "Printed Joker"}
      >
        <span className="rm-card__sheen" aria-hidden />
        <span className="rm-card__joker-ribbon">JOKER</span>
      </Tag>
    );
  }

  return (
    <Tag
      draggable={draggable && !inert}
      {...ariaProps}
      className={cls}
      style={cardStyle}
      title={title}
    >
      <span className="rm-card__sheen" aria-hidden />

      {/* Top-left corner — rank above suit */}
      <span className="rm-card__corner rm-card__corner--tl">
        <span className="rm-card__rank">{rankLabel(card.rank)}</span>
        <span className="rm-card__pip">{SUIT_GLYPHS[card.suit]}</span>
      </span>

      {/* Centre — face cards get Indian royal artwork; index cards (10/A)
          get a rank-between-pips treatment; number cards 2–9 get a big pip. */}
      {isCourt ? (
        <IndianCourtCenter rank={card.rank as "J" | "Q" | "K"} suit={card.suit} small={resolvedSize === "sm"} />
      ) : isIndex ? (
        <IndexCenter rank={card.rank} suit={card.suit} ink={ink} small={resolvedSize === "sm"} />
      ) : (
        <span className="rm-card__center" aria-hidden>
          {SUIT_GLYPHS[card.suit]}
        </span>
      )}

      {/* Bottom-right mirror corner */}
      <span className="rm-card__corner rm-card__corner--br" aria-hidden>
        <span className="rm-card__rank">{rankLabel(card.rank)}</span>
        <span className="rm-card__pip">{SUIT_GLYPHS[card.suit]}</span>
      </span>

      {/* Wild-rank-match joker badges — top-right AND bottom-left so the
          card reads as a joker regardless of how it's fanned/overlapped in
          the player's hand. A card behind a sibling on its right is
          covered on the right edge; one behind a sibling on its left is
          covered on the left edge. Duplicating the marker into the
          opposite corners means at least one is always visible. */}
      {isWildJoker && (
        <>
          <span className="rm-card__joker rm-card__joker--tr" title="Wild Joker">
            J
          </span>
          <span className="rm-card__joker rm-card__joker--bl" title="Wild Joker" aria-hidden>
            J
          </span>
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
        className="flex flex-col items-center justify-center gap-0.5"
        style={{ width: frameW, height: frameH }}
      >
        <span style={{ color: ink, fontSize: pipSize, lineHeight: 1 }}>
          {SUIT_GLYPHS[suit]}
        </span>
        <span
          className="leading-none"
          style={{
            color: ink,
            fontSize: letterSize,
            fontWeight: 700,
            fontFamily: "var(--rm-font-card)",
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
 * use the suit's own ink colour; --rm-art-gold is used for jewellery,
 * crowns, and sceptre ornaments; skin tone is --rm-art-skin.
 *
 * NOTE ON UNITS: every stroke width and coordinate below is relative to THIS
 * component's viewBox (vw ≈ 26–30 × vh ≈ 36–42). They are NOT interchangeable
 * with the numbers in FaceDownCard, whose viewBox is 48×66 — a stroke of 1.5
 * means something ~1.7× different there. Do not copy values between the two.
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
  const gold = "var(--rm-art-gold)";
  const skin = "var(--rm-art-skin)";
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

        {/* Centre divider ornament. Opacity is an ATTRIBUTE, not a hex alpha
            suffix — `${ink}77` silently stops working once ink is a var(). */}
        <line x1="3" y1={hh} x2={vw - 3} y2={hh} stroke={ink} strokeOpacity={0.47} strokeWidth="0.5" />
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
      <ellipse cx={cx - 1.8} cy={ey + 3} rx={0.8} ry={1} fill="var(--rm-art-eye)" />
      <ellipse cx={cx + 1.8} cy={ey + 3} rx={0.8} ry={1} fill="var(--rm-art-eye)" />
      {/* Mustache */}
      <path d={`M ${cx - 3.5},${fy + 4.5} Q ${cx},${fy + 6} ${cx + 3.5},${fy + 4.5}`}
        stroke="var(--rm-art-hair)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Beard hint */}
      <path d={`M ${cx - 2.5},${fy + 5.5} Q ${cx},${fy + 7.5} ${cx + 2.5},${fy + 5.5}`}
        stroke="var(--rm-art-hair)" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* Body — sherwani */}
      <path
        d={`M ${cx - 7},${fY} L ${cx + 6},${fY} L ${cx + 6},${bY} L ${cx - 7},${bY} Z`}
        fill={ink}
      />
      {/* V-neck */}
      <path d={`M ${cx - 1.5},${fY} L ${cx},${fY + 1.5} L ${cx + 1.5},${fY}`}
        fill="none" stroke="var(--rm-art-relief)" strokeWidth="0.6" />
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
      <line x1={cx - 9} y1={bY} x2={cx - 9} y2={bY - 5} stroke="var(--rm-art-stem)" strokeWidth="1" />
      <ellipse cx={cx - 9} cy={bY - 7} rx={3} ry={2} fill="var(--rm-art-lotus)" />
      <ellipse cx={cx - 9} cy={bY - 6.5} rx={2} ry={1.2} fill="var(--rm-art-lotus-2)" />
      <circle cx={cx - 9} cy={bY - 7} r={0.8} fill={gold} />

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
      <ellipse cx={cx - 1.8} cy={ey + 3.5} rx={0.9} ry={1.1} fill="var(--rm-art-eye)" />
      <ellipse cx={cx + 1.8} cy={ey + 3.5} rx={0.9} ry={1.1} fill="var(--rm-art-eye)" />
      <line x1={cx - 2.7} y1={ey + 2.5} x2={cx - 0.9} y2={ey + 2.5} stroke="var(--rm-art-eye)" strokeWidth="0.5" />
      <line x1={cx + 0.9} y1={ey + 2.5} x2={cx + 2.7} y2={ey + 2.5} stroke="var(--rm-art-eye)" strokeWidth="0.5" />
      {/* Bindi */}
      <circle cx={cx} cy={ey + 1} r={0.7} fill="var(--rm-art-bindi)" />
      {/* Lips */}
      <path d={`M ${cx - 1.8},${fy + 5.2} Q ${cx},${fy + 6.4} ${cx + 1.8},${fy + 5.2}`}
        stroke="var(--rm-art-lip)" strokeWidth="0.7" fill="none" strokeLinecap="round" />
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
      <line x1={cx - 6} y1={fY + 2} x2={cx - 1} y2={bY} stroke="var(--rm-art-relief)" strokeWidth="0.5" opacity="0.6" />

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
      {/* Turban band. Opacity is an ATTRIBUTE — `${ink}dd` breaks on a var(). */}
      <rect x={cx - 7} y={turbanBase + 2.5} width={14} height={2.5} fill={ink} fillOpacity={0.87} rx="0.4" />
      {/* Turban wrap lines */}
      <path d={`M ${cx - 6.5},${turbanBase + 1} C ${cx - 2},${turbanBase - 1} ${cx + 2},${turbanBase - 1} ${cx + 6.5},${turbanBase + 1}`}
        stroke="var(--rm-art-relief)" strokeWidth="0.35" fill="none" opacity="0.7" />
      <path d={`M ${cx - 6},${turbanBase} C ${cx - 2},${turbanBase - 2} ${cx + 2},${turbanBase - 2} ${cx + 6},${turbanBase}`}
        stroke="var(--rm-art-relief)" strokeWidth="0.35" fill="none" opacity="0.5" />
      {/* Turban jewel (diamond-shaped) */}
      <path d={`M ${cx},${turbanBase - 2} L ${cx + 1.5},${turbanBase} L ${cx},${turbanBase + 2} L ${cx - 1.5},${turbanBase} Z`}
        fill={gold} stroke={ink} strokeWidth="0.3" />
      {/* Plume (peacock feather hint) */}
      <path d={`M ${cx + 2},${turbanBase - 4} C ${cx + 3},${turbanBase - 7} ${cx + 1},${turbanBase - 9} ${cx},${turbanBase - 9}`}
        stroke="var(--rm-art-plume)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={turbanBase - 9} r={0.8} fill="var(--rm-art-plume-2)" />

      {/* Face */}
      <ellipse cx={cx} cy={fy + 3} rx={5} ry={5.5} fill={skin} />
      {/* Eyes */}
      <ellipse cx={cx - 1.8} cy={ey + 3} rx={0.8} ry={1} fill="var(--rm-art-eye)" />
      <ellipse cx={cx + 1.8} cy={ey + 3} rx={0.8} ry={1} fill="var(--rm-art-eye)" />
      {/* Young mustache (light) */}
      <path d={`M ${cx - 3},${fy + 4.8} Q ${cx},${fy + 5.8} ${cx + 3},${fy + 4.8}`}
        stroke="var(--rm-art-hair)" strokeWidth="0.6" fill="none" strokeLinecap="round" />

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
 * Card back used for the closed deck and other face-down piles — shared by
 * both shells. Navy card stock (--rm-card-back), brass dot-lattice, and a
 * brass "B" (BHALYAM) monogram medallion.
 *
 * It now shares the `.rm-card` silhouette with the face-up card — same width,
 * same corner radius, same hairline, same lift. Previously the back was a bare
 * SVG with its own drop-shadow and a slightly different aspect ratio, so a
 * pile of backs never quite lined up with the hand.
 *
 * NOTE ON UNITS: the geometry below is relative to a 48×66 viewBox and is NOT
 * interchangeable with the court-card artwork above (viewBox ≈ 30×42).
 */
export function FaceDownCard({
  small = false,
  size,
}: {
  small?: boolean;
  size?: CardSize;
}) {
  const resolvedSize: CardSize = size ?? (small ? "sm" : "md");
  // Unique per instance: a face-down pile renders many of these, and a literal
  // id meant every copy shared one definition (all `url(#…)` resolving to
  // whichever mounted first). Harmless while the gradient is a fixed navy, but
  // it silently breaks the moment the back is themed per deck/player. Colons
  // are stripped from useId() — legal in an id, but they break `url(#…)`.
  const bgId = `rcb${useId().replace(/:/g, "")}`;

  return (
    <div className={`rm-card rm-card--back${sizeClass(resolvedSize)}`} aria-hidden>
      <svg
        viewBox="0 0 48 66"
        preserveAspectRatio="none"
        className="rm-card__back-art"
      >
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--rm-card-back)" />
            <stop offset="100%" stopColor="var(--rm-card-back-deep)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="48" height="66" fill={`url(#${bgId})`} />
        <rect
          x="5" y="5" width="38" height="56" rx="3"
          fill="none" stroke="var(--rm-brass)" strokeWidth="0.75" opacity="0.6"
        />
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 3 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={12 + col * 12}
              cy={14 + row * 13}
              r="2.6"
              fill="none"
              stroke="var(--rm-brass)"
              strokeWidth="0.9"
              opacity="0.65"
            />
          )),
        )}
        <circle cx="24" cy="33" r="8" fill="var(--rm-brass)" opacity="0.9" />
        <text
          x="24" y="36.5" textAnchor="middle"
          fontSize="9" fontWeight="700"
          fill="var(--rm-card-back)"
          fontFamily="var(--rm-font-card)"
        >
          B
        </text>
      </svg>
    </div>
  );
}

/**
 * The empty slot a player drops their final card onto to declare.
 *
 * `dragOver` is the drop-target half of drag-to-meld: without it the slot gave
 * no feedback at all, so a player dragging toward it could not tell whether it
 * was a legal target until they let go.
 */
export function FinishSlot({
  small = false,
  size,
  dragOver = false,
  state = "idle",
}: {
  small?: boolean;
  size?: CardSize;
  dragOver?: boolean;
  state?: CardState;
}) {
  const resolvedSize: CardSize = size ?? (small ? "sm" : "md");
  const cls =
    "rm-finish-slot" +
    (resolvedSize === "sm" ? " rm-finish-slot--sm" : "") +
    (resolvedSize === "lg" ? " rm-finish-slot--lg" : "") +
    (dragOver ? " is-over" : "") +
    (state !== "idle" ? ` is-${state}` : "");

  return (
    <div className={cls}>
      <span>Finish</span>
      <span>Slot</span>
    </div>
  );
}

function rankLabel(r: Rank): string {
  if (r === "T") return "10";
  return r;
}
