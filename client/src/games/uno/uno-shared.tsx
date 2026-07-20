import type { Player, UnoCard, UnoColor } from "@shared/types";
import { getCardLabel, CARD_DISPLAY } from "./helpers/deck";
import Avatar from "../rummy/Avatar";

/**
 * Dumb, presentation-only UNO building blocks shared by both shells. They hold
 * no game logic — every handler/value is passed down from {@link useUnoBoard}.
 * Centralising them here is what kills the per-card colour-class duplication the
 * original inline board carried.
 *
 * `DeckPanel`/`HandInfoPanel`/`HandPanel`/`UnoOpponentSeat` are no longer
 * imported by either board shell as of the circular-table redesign
 * (uno-table.tsx) — deliberately left in place rather than deleted, as a
 * known-working rollback path for a redesign that couldn't be visually
 * verified in a live browser during implementation. Remove once the new
 * table layout has been confirmed against a real device/browser.
 */

/** Colours offered by the Wild picker, hoisted so it is not re-allocated. */
const WILD_COLORS: ReadonlyArray<UnoColor> = ["R", "G", "B", "Y"];

/**
 * ----------------------------------------------------------------------------
 * Authentic UNO card art
 * ----------------------------------------------------------------------------
 * UNO is a card game and should read like one — the old faces were a colour
 * emoji on a pastel rectangle, which looked like a placeholder next to Rummy's
 * real playing cards. These render the genuine article: a solid vivid body, the
 * signature white diagonal oval, a large centre symbol, mirrored corner
 * indices, and a patterned back for the draw pile. Everything is one scalable
 * SVG (viewBox 100×150) so the hand (md/lg), the discard top, the draw pile and
 * the selected-card preview all stay crisp at any size. Both shells consume
 * these through `Card` / `DeckPanel`, so the look is defined exactly once.
 */

/** Solid card-body colours. */
const UNO_BODY: Record<UnoColor, string> = {
  R: "#D22B27",
  G: "#3AA03A",
  B: "#1C6DD0",
  Y: "#E8B100",
};
/** Same hues nudged darker for legibility as ink on the white oval. */
const UNO_INK: Record<UnoColor, string> = {
  R: "#C9241F",
  G: "#2E8B2E",
  B: "#1C5FC0",
  Y: "#C98A00",
};
/** Wild cards: near-black body with a four-colour centre. */
const WILD_BODY = "#17181d";

const UNO_FONT = "'Nunito','Poppins',sans-serif";

/** Bold italic text glyph (digits, "+2", "+4", the "UNO" wordmark). */
function unoText(
  x: number,
  y: number,
  size: number,
  fill: string,
  txt: string,
  edge?: string
) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={900}
      fontStyle="italic"
      fill={fill}
      stroke={edge}
      strokeWidth={edge ? size * 0.06 : 0}
      paintOrder="stroke"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={UNO_FONT}
    >
      {txt}
    </text>
  );
}

/** Skip: a ring with a diagonal bar through it. */
function SkipMark({ cx, cy, r, color, sw }: { cx: number; cy: number; r: number; color: string; sw: number }) {
  return (
    <g stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round">
      <circle cx={cx} cy={cy} r={r} />
      <line x1={cx - r * 0.72} y1={cy - r * 0.72} x2={cx + r * 0.72} y2={cy + r * 0.72} />
    </g>
  );
}

/** One arrow polygon (shaft + head) pointing left/right from (cx,yc). */
function arrowPts(cx: number, yc: number, half: number, th: number, dir: 1 | -1): string {
  const tip = cx + dir * half;
  const base = tip - dir * (th * 1.7);
  const tail = cx - dir * half;
  return [
    [tip, yc],
    [base, yc - th * 1.5],
    [base, yc - th * 0.55],
    [tail, yc - th * 0.55],
    [tail, yc + th * 0.55],
    [base, yc + th * 0.55],
    [base, yc + th * 1.5],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

/** Reverse: two opposed arrows, tilted to echo the oval. */
function ReverseMark({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const half = r * 0.82;
  const th = r * 0.24;
  const off = r * 0.5;
  return (
    <g fill={color} transform={`rotate(-20 ${cx} ${cy})`}>
      <polygon points={arrowPts(cx, cy - off, half, th, 1)} />
      <polygon points={arrowPts(cx, cy + off, half, th, -1)} />
    </g>
  );
}

/** Four-colour pinwheel used by Wild faces. */
function Pinwheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const k = 0.7071;
  const wedges: ReadonlyArray<{ c: string; d: string }> = [
    { c: UNO_BODY.R, d: `M0 0 L${-k} ${-k} A1 1 0 0 1 ${k} ${-k} Z` },
    { c: UNO_BODY.B, d: `M0 0 L${k} ${-k} A1 1 0 0 1 ${k} ${k} Z` },
    { c: UNO_BODY.Y, d: `M0 0 L${k} ${k} A1 1 0 0 1 ${-k} ${k} Z` },
    { c: UNO_BODY.G, d: `M0 0 L${-k} ${k} A1 1 0 0 1 ${-k} ${-k} Z` },
  ];
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r}) rotate(-20)`}>
      {wedges.map((w, i) => (
        <path key={i} d={w.d} fill={w.c} />
      ))}
      <circle cx={0} cy={0} r={1} fill="none" stroke="#fff" strokeWidth={2.4 / r} />
    </g>
  );
}

function isNumber(rank: string): boolean {
  return /^[0-9]$/.test(rank);
}

/** Large centre symbol drawn in the card's ink colour on the white oval. */
function CentreGlyph({ card, ink }: { card: UnoCard; ink: string }) {
  const r = card.rank;
  if (isNumber(r)) return unoText(50, 75, 64, ink, r);
  if (r === "+2") return unoText(50, 75, 46, ink, "+2");
  if (r === "Skip") return <SkipMark cx={50} cy={75} r={24} color={ink} sw={7} />;
  if (r === "Reverse") return <ReverseMark cx={50} cy={75} r={26} color={ink} />;
  if (r === "Wild") return <Pinwheel cx={50} cy={75} r={28} />;
  if (r === "Wild+4")
    return (
      <>
        <Pinwheel cx={50} cy={75} r={26} />
        {unoText(50, 112, 22, "#fff", "+4", WILD_BODY)}
      </>
    );
  return null;
}

/** Small mirrored index symbol (white with a dark edge). */
function CornerGlyph({ card, x, y }: { card: UnoCard; x: number; y: number }) {
  const r = card.rank;
  const edge = "rgba(0,0,0,0.32)";
  if (isNumber(r)) return unoText(x, y, 22, "#fff", r, edge);
  if (r === "+2") return unoText(x, y, 16, "#fff", "+2", edge);
  if (r === "Wild+4") return unoText(x, y, 15, "#fff", "+4", edge);
  if (r === "Skip") return <SkipMark cx={x} cy={y} r={8} color="#fff" sw={2.4} />;
  if (r === "Reverse") return <ReverseMark cx={x} cy={y} r={8} color="#fff" />;
  if (r === "Wild") return <Pinwheel cx={x} cy={y} r={8} />;
  return null;
}

/** A complete UNO card face. */
export function UnoCardFace({ card, className }: { card: UnoCard; className?: string }) {
  const isWild = card.rank === "Wild" || card.rank === "Wild+4";
  const body = isWild || !card.color ? WILD_BODY : UNO_BODY[card.color];
  const ink = card.color ? UNO_INK[card.color] : "#222";
  return (
    <svg
      viewBox="0 0 100 150"
      className={className}
      role="img"
      aria-label={getCardLabel(card)}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={100} height={150} rx={14} fill="#fff" />
      <rect x={5} y={5} width={90} height={140} rx={10} fill={body} />
      <ellipse cx={50} cy={75} rx={46} ry={29} fill="#fff" transform="rotate(-20 50 75)" />
      <CentreGlyph card={card} ink={ink} />
      <CornerGlyph card={card} x={20} y={26} />
      <g transform="rotate(180 50 75)">
        <CornerGlyph card={card} x={20} y={26} />
      </g>
    </svg>
  );
}

/** The face-down draw-pile back: black body, red oval, slanted "UNO". */
export function UnoCardBack({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 150"
      className={className}
      role="img"
      aria-label="UNO card back"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={100} height={150} rx={14} fill="#fff" />
      <rect x={5} y={5} width={90} height={140} rx={10} fill={WILD_BODY} />
      <ellipse cx={50} cy={75} rx={46} ry={29} fill="#D22B27" transform="rotate(-20 50 75)" />
      <g transform="rotate(-20 50 75)">{unoText(50, 75, 30, "#F5C400", "UNO", "#fff")}</g>
    </svg>
  );
}

export interface CardProps {
  card: UnoCard;
  isSelected: boolean;
  isValid: boolean;
  isDisabled: boolean;
  /** Whether the player can interact (their turn) — gates hover affordances. */
  interactive: boolean;
  onClick?: () => void;
  /** "md" = mobile/default sizing; "lg" = roomier desktop hand. */
  size?: "md" | "lg";
}

/**
 * A single hand card button. The face is the shared `UnoCardFace`; this wrapper
 * only adds the selection ring, the valid-move hover lift, and the dimmed
 * disabled state. Mobile uses `md` dimensions; desktop opts into `lg`.
 */
export function Card({
  card,
  isSelected,
  isValid,
  isDisabled,
  interactive,
  onClick,
  size = "md",
}: CardProps) {
  const lg = size === "lg";
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-label={getCardLabel(card)}
      className={`
        relative ${lg ? "w-20 h-28" : "w-16 h-24"} rounded-lg
        transition-all duration-200
        ${
          isSelected
            ? "ring-4 ring-[#E6A11E] shadow-xl -translate-y-1 z-10"
            : isValid && interactive
              ? `hover:shadow-lg ${lg ? "hover:-translate-y-1" : "hover:-translate-y-0.5"}`
              : ""
        }
        ${isDisabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <UnoCardFace card={card} className="w-full h-full drop-shadow-sm" />
    </button>
  );
}

export interface DeckPanelProps {
  topCard: UnoCard;
  currentColor: UnoColor | null;
  deckCount: number;
}

/**
 * Draw pile (face-down back + count) beside the discard top card. Styled as a
 * sunken "mat" (deeper cream, thicker border, inset shadow) rather than a flat
 * dashboard card, so the table reads as a play surface — same structural idea
 * as Rummy's felt, in UNO's own cream/gold palette rather than Rummy's wood/green.
 */
export function DeckPanel({ topCard, currentColor, deckCount }: DeckPanelProps) {
  const wildTop = topCard.rank === "Wild" || topCard.rank === "Wild+4";
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "#FBF3E3",
        border: "2px solid #E0CBA0",
        boxShadow:
          "inset 0 2px 6px rgba(109,67,35,0.10), inset 0 -2px 6px rgba(109,67,35,0.06)",
      }}
    >
      <h3 className="text-xs font-bold uppercase text-[#6E5E4D] tracking-wide">Table</h3>
      <div className="flex items-start justify-around gap-3">
        {/* Draw pile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-20 h-28">
            <UnoCardBack className="w-full h-full drop-shadow-md" />
            <span className="absolute -bottom-1.5 -right-1.5 min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-full bg-[#6D4323] text-[#F7E8C4] text-xs font-bold ring-2 ring-[#FFF9F0]">
              {deckCount}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-[#8B7355]">
            Draw
          </div>
        </div>
        {/* Discard top card */}
        <div className="flex flex-col items-center gap-1.5">
          <UnoCardFace card={topCard} className="w-24 h-32 drop-shadow-md" />
          <div className="text-[10px] uppercase tracking-wide font-semibold text-[#8B7355] text-center">
            {wildTop && currentColor
              ? `Wild → ${CARD_DISPLAY[currentColor]?.label}`
              : getCardLabel(topCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface UnoOpponentSeatProps {
  name: string;
  handSize: number;
  isTurn: boolean;
  /** "sm" = mobile horizontal-scroll row; "md" = desktop opponent row. */
  size?: "sm" | "md";
  /** True when this opponent has exactly 1 undeclared card — catchable. */
  canCatch?: boolean;
  onCatch?: () => void;
}

/**
 * One opponent's seat at the table: avatar, name, live card count, and a
 * fanned stack of face-down cards. Modeled on Rummy's `Notepad` seat
 * (client/src/games/rummy/RummyBoardDesktop.tsx) — same fan technique, UNO's
 * own gold turn-glow instead of Rummy's brass. Reads `state.handSizes`, which
 * exists on the wire already but wasn't rendered anywhere before this.
 *
 * `canCatch`/`onCatch` (added for the UNO declaration mechanic, Phase 3):
 * an undeclared 1-card opponent gets a small pulsing "Catch!" button right
 * on their seat — the lowest-friction place to put it, since catching is
 * meant to feel like spotting something, not navigating to it.
 */
export function UnoOpponentSeat({
  name,
  handSize,
  isTurn,
  size = "md",
  canCatch = false,
  onCatch,
}: UnoOpponentSeatProps) {
  const isSmall = size === "sm";
  const fanCount = Math.min(handSize, isSmall ? 5 : 7);
  return (
    <div
      className={`relative flex-shrink-0 rounded-lg bg-[#FFF9F0] transition-all duration-300 ${
        isSmall ? "px-2.5 py-2" : "px-3 py-2.5"
      }`}
      style={{
        border: canCatch ? "2px solid #DC2626" : isTurn ? "2px solid #E6A11E" : "1px solid #E8D8BE",
        boxShadow: canCatch
          ? "0 0 0 3px rgba(220,38,38,0.22), 0 0 16px rgba(220,38,38,0.2)"
          : isTurn
            ? "0 0 0 3px rgba(230,161,30,0.28), 0 0 16px rgba(230,161,30,0.22)"
            : undefined,
      }}
    >
      {isTurn && !canCatch && (
        <div className="absolute -top-3 left-0 right-0 flex justify-center pointer-events-none">
          <span
            className="text-[8px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full text-[#2B2118]"
            style={{ background: "linear-gradient(135deg, #F7DA8B, #E6A11E)" }}
          >
            ▸ Playing
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Avatar name={name} size={isSmall ? 28 : 36} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#6E5E4D] truncate leading-tight">
            {name}
          </div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-[#8B7355]">
            {handSize} card{handSize === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      {fanCount > 0 && (
        <div className="flex items-center mt-1.5 pl-1" aria-hidden>
          {Array.from({ length: fanCount }).map((_, i) => (
            <div
              key={i}
              className={isSmall ? "w-4 h-6" : "w-5 h-7"}
              style={{ marginLeft: i === 0 ? 0 : isSmall ? -10 : -13 }}
            >
              <UnoCardBack className="w-full h-full drop-shadow-sm" />
            </div>
          ))}
        </div>
      )}
      {canCatch && (
        <button
          onClick={onCatch}
          className="mt-1.5 w-full rounded-md py-1 text-[10px] font-black uppercase tracking-wide text-white animate-pulse"
          style={{ background: "#DC2626" }}
          aria-label={`Catch ${name} without UNO — they draw 2`}
        >
          Catch! +2
        </button>
      )}
    </div>
  );
}

export interface ScorePanelProps {
  playerOrder: string[];
  turnPlayerId: string;
  selfId: string | null;
  scores: Record<string, number>;
  /** Current round number (Volume 2/6 multi-round matches). */
  round?: number;
  /** Race-to-target-score match length, or null/undefined for a single round. */
  targetScore?: number | null;
  nameOf: (id: string) => string;
}

/** Per-player score list with the active player highlighted. Shows a
 *  "Round N • Race to T" subtitle when the room is playing a Volume 2/6
 *  multi-round match — a single-round match (the pre-existing default)
 *  renders exactly as before. */
export function ScorePanel({
  playerOrder,
  turnPlayerId,
  selfId,
  scores,
  round,
  targetScore,
  nameOf,
}: ScorePanelProps) {
  return (
    <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4">
      <h3 className={`text-xs font-bold uppercase text-[#6E5E4D] ${targetScore != null ? "mb-1" : "mb-3"}`}>Scores</h3>
      {targetScore != null && (
        <p className="text-[11px] font-semibold text-[#B08942] mb-2">
          Round {round ?? 1} · Race to {targetScore}
        </p>
      )}
      <div className="space-y-2">
        {playerOrder.map((pid) => {
          const isCurrentPlayer = pid === turnPlayerId;
          const isSelf = pid === selfId;
          return (
            <div
              key={pid}
              className={`flex items-center justify-between p-2 rounded text-sm font-semibold ${
                isCurrentPlayer
                  ? "bg-[#E6A11E] text-[#2B2118]"
                  : "bg-[#F0E1D0] text-[#6E5E4D]"
              }`}
            >
              <span>
                {nameOf(pid)}
                {isSelf && " (you)"}
              </span>
              <span>{scores[pid] ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface HandInfoPanelProps {
  handCount: number;
  selectedCard: UnoCard | undefined;
}

/** "Your Hand" summary: card count + a preview of the selected card. */
export function HandInfoPanel({ handCount, selectedCard }: HandInfoPanelProps) {
  return (
    <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">Your Hand</h3>
      <div className="text-sm text-[#8B7355]">
        {handCount} card{handCount !== 1 ? "s" : ""}
      </div>
      {selectedCard && (
        <div className="bg-[#E8D7C3] border border-[#6D4323] rounded p-2">
          <div className="text-xs font-semibold text-[#6E5E4D] mb-1">Selected</div>
          <div className="flex items-center gap-2">
            <UnoCardFace card={selectedCard} className="w-12 h-[4.5rem] shrink-0" />
            <div className="text-xs font-semibold text-[#6E5E4D]">
              {getCardLabel(selectedCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface WildColorPickerProps {
  selectedWildColor: UnoColor | null;
  onPick: (color: UnoColor) => void;
}

/** Colour swatches shown when a Wild card is selected. Exported (not just
 *  HandPanel-internal) so the circular-table hand fan (uno-table.tsx) can
 *  reuse the exact same picker rather than duplicating it. */
export function WildColorPicker({ selectedWildColor, onPick }: WildColorPickerProps) {
  return (
    <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded p-3 space-y-2">
      <div className="text-xs font-bold text-[#6E5E4D]">Choose Color</div>
      <div className="flex gap-2">
        {WILD_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onPick(color)}
            style={{ background: UNO_BODY[color] }}
            className={`
              flex-1 py-2 rounded font-semibold text-sm text-white
              transition-all
              ${
                selectedWildColor === color
                  ? "ring-2 ring-offset-2 ring-[#E6A11E] scale-105"
                  : "hover:brightness-110"
              }
            `}
          >
            {CARD_DISPLAY[color]?.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface HandPanelProps {
  sortedHand: UnoCard[];
  validMoveIds: Set<string>;
  selectedCardId: string | null;
  myTurn: boolean;
  phase: "playing" | "finished";
  onSelectCard: (cardId: string) => void;
  needsColorChoice: boolean;
  selectedWildColor: UnoColor | null;
  onPickColor: (color: UnoColor) => void;
  /** Card sizing — desktop passes "lg" for a larger fan. */
  size?: "md" | "lg";
}

/**
 * The interactive hand: the wrapping card fan plus the Wild colour picker. The
 * empty-hand state shows the win flourish exactly as before.
 */
export function HandPanel({
  sortedHand,
  validMoveIds,
  selectedCardId,
  myTurn,
  phase,
  onSelectCard,
  needsColorChoice,
  selectedWildColor,
  onPickColor,
  size = "md",
}: HandPanelProps) {
  return (
    <div className="bg-[#E8D7C3] border-4 border-[#6D4323] rounded-lg p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">Your Cards</h3>

      {sortedHand.length === 0 ? (
        <div className="text-center py-6 text-[#8B7355]">You win! 🎉</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {sortedHand.map((card) => {
              const isSelected = card.id === selectedCardId;
              const isValid = validMoveIds.has(card.id);
              const isDisabled = !isValid && myTurn && phase === "playing";
              return (
                <Card
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  isValid={isValid}
                  isDisabled={isDisabled}
                  interactive={myTurn}
                  size={size}
                  onClick={() => (myTurn ? onSelectCard(card.id) : undefined)}
                />
              );
            })}
          </div>

          {needsColorChoice && (
            <WildColorPicker
              selectedWildColor={selectedWildColor}
              onPick={onPickColor}
            />
          )}
        </>
      )}
    </div>
  );
}

export interface ActionBarProps {
  passTurn: () => void;
  canPassTurn: boolean;
  drewThisTurn: boolean;
  /** Shows the "P" kbd badge — desktop only, where the keyboard shortcut
   *  actually exists (see UnoBoardDesktop.tsx's keydown handler). */
  showKbdHint?: boolean;
}

/** Just the (conditional) Pass button now — Play and Draw are both
 *  automated: tapping/dragging a valid card plays it directly
 *  (useUnoBoard.ts's dropCardOnDiscard), and the draw pile itself is
 *  tappable (UnoTableCenter's canDraw/onDraw), mirroring Rummy's own
 *  button-free draw. Pass is the one action that still needs an explicit
 *  control — the player has a real choice, once they've drawn, between
 *  playing what they can and passing anyway. See useUnoBoard.ts's
 *  auto-pass effect for the case where they have no choice at all. */
export function ActionBar({ passTurn, canPassTurn, drewThisTurn, showKbdHint = false }: ActionBarProps) {
  if (!drewThisTurn) return null;
  return (
    <button
      onClick={passTurn}
      disabled={!canPassTurn}
      className={`
        w-full py-3 rounded-lg font-bold text-white
        transition-all flex items-center justify-center gap-2
        ${
          canPassTurn
            ? "bg-orange-500 hover:bg-orange-600 active:scale-95"
            : "bg-gray-400 cursor-not-allowed opacity-50"
        }
      `}
    >
      <span>Pass</span>
      {showKbdHint && (
        <span className="font-mono text-[10px] opacity-70 border border-current rounded px-1 py-0.5">
          P
        </span>
      )}
    </button>
  );
}

export interface GameOverPanelProps {
  winner: Player;
  selfId: string | null;
  scores: Record<string, number>;
}

/** End-of-game banner naming the winner and their score. */
export function GameOverPanel({ winner, selfId, scores }: GameOverPanelProps) {
  return (
    <div className="bg-[#FFF9F0] border-2 border-[#E6A11E] rounded-lg p-6 text-center space-y-4">
      <div className="text-2xl font-bold text-[#6E5E4D]">
        {winner.id === selfId ? "🎉 You won! 🎉" : `${winner.name} wins!`}
      </div>
      <div className="text-sm text-[#8B7355]">
        {winner.name} won with {scores[winner.id] ?? 0} points
      </div>
    </div>
  );
}
