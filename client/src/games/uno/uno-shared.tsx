import type { Player, UnoCard, UnoColor } from "@shared/types";
import { getCardEmoji, getCardLabel, CARD_DISPLAY } from "./helpers/deck";

/**
 * Dumb, presentation-only UNO building blocks shared by both shells. They hold
 * no game logic — every handler/value is passed down from {@link useUnoBoard}.
 * Centralising them here is what kills the per-card colour-class duplication the
 * original inline board carried.
 */

/** Colours offered by the Wild picker, hoisted so it is not re-allocated. */
const WILD_COLORS: ReadonlyArray<{ color: UnoColor; swatch: string }> = [
  { color: "R", swatch: "bg-red-400" },
  { color: "G", swatch: "bg-green-400" },
  { color: "B", swatch: "bg-blue-400" },
  { color: "Y", swatch: "bg-yellow-400" },
];

/**
 * Single source of truth for a card's face tint. Wild/colourless cards fall
 * through to the rainbow gradient. Previously this ternary was copy-pasted into
 * the hand fan render.
 */
function cardFaceClass(color: UnoColor | null): string {
  switch (color) {
    case "R":
      return "bg-red-200";
    case "G":
      return "bg-green-200";
    case "B":
      return "bg-blue-200";
    case "Y":
      return "bg-yellow-200";
    default:
      return "bg-gradient-to-br from-purple-200 to-pink-200";
  }
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
 * A single hand card button. Encapsulates the colour-class logic so neither
 * shell re-implements it. Mobile uses the original `md` dimensions verbatim;
 * desktop opts into `lg` for a larger hand area plus a hover lift.
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
      className={`
        flex flex-col items-center justify-center
        ${lg ? "w-20 h-28 text-3xl" : "w-16 h-24 text-2xl"} rounded-lg font-bold
        transition-all duration-200
        ${
          isSelected
            ? "ring-4 ring-[#E6A11E] shadow-lg"
            : isValid && interactive
              ? `hover:shadow-md active:scale-95${lg ? " hover:-translate-y-1" : ""}`
              : ""
        }
        ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${cardFaceClass(card.color)}
        border-2 border-gray-400
      `}
    >
      <div>{getCardEmoji(card)}</div>
      <div
        className={`${lg ? "text-xs" : "text-[10px]"} font-semibold text-gray-700 mt-1`}
      >
        {card.rank === "0" ? "0" : card.rank.slice(0, 2)}
      </div>
    </button>
  );
}

export interface DeckPanelProps {
  topCard: UnoCard;
  currentColor: UnoColor | null;
  deckCount: number;
}

/** Draw-pile count + discard top card. */
export function DeckPanel({ topCard, currentColor, deckCount }: DeckPanelProps) {
  const wildTop = topCard.rank === "Wild" || topCard.rank === "Wild+4";
  return (
    <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">Deck Info</h3>

      {/* Draw pile */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#8B7355]">Draw Pile</div>
        <div className="bg-[#6D4323] text-[#F7E8C4] rounded px-2 py-1 text-sm font-bold">
          {deckCount}
        </div>
      </div>

      {/* Top card / discard pile */}
      <div className="text-xs font-bold text-[#6E5E4D] mb-2">Top Card</div>
      <div className="h-32 flex items-center justify-center bg-gradient-to-br from-[#F7E8C4] to-[#E4B128] border-2 border-[#E4B128] rounded-lg">
        <div className="text-center">
          <div className="text-5xl mb-1">{getCardEmoji(topCard)}</div>
          <div className="text-xs font-semibold text-[#6E5E4D]">
            {getCardLabel(topCard)}
          </div>
          {currentColor && wildTop && (
            <div className="text-xs text-[#C67C3C] mt-1">
              {CARD_DISPLAY[currentColor]?.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ScorePanelProps {
  playerOrder: string[];
  turnPlayerId: string;
  selfId: string | null;
  scores: Record<string, number>;
  nameOf: (id: string) => string;
}

/** Per-player score list with the active player highlighted. */
export function ScorePanel({
  playerOrder,
  turnPlayerId,
  selfId,
  scores,
  nameOf,
}: ScorePanelProps) {
  return (
    <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4">
      <h3 className="text-xs font-bold uppercase text-[#6E5E4D] mb-3">Scores</h3>
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
          <div className="text-center">
            <div className="text-3xl mb-1">{getCardEmoji(selectedCard)}</div>
            <div className="text-xs text-[#6E5E4D]">{getCardLabel(selectedCard)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WildColorPickerProps {
  selectedWildColor: UnoColor | null;
  onPick: (color: UnoColor) => void;
}

/** Colour swatches shown when a Wild card is selected. */
function WildColorPicker({ selectedWildColor, onPick }: WildColorPickerProps) {
  return (
    <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded p-3 space-y-2">
      <div className="text-xs font-bold text-[#6E5E4D]">Choose Color</div>
      <div className="flex gap-2">
        {WILD_COLORS.map(({ color, swatch }) => (
          <button
            key={color}
            onClick={() => onPick(color)}
            className={`
              flex-1 py-2 rounded font-semibold text-sm
              transition-all
              ${
                selectedWildColor === color
                  ? "ring-2 ring-offset-2 ring-[#E6A11E]"
                  : "hover:opacity-80"
              }
              ${swatch}
              text-white
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
  playCard: () => void;
  drawCard: () => void;
  passTurn: () => void;
  canSubmitPlay: boolean;
  canDraw: boolean;
  canPassTurn: boolean;
  drewThisTurn: boolean;
}

/** Play / Draw / (conditional) Pass buttons. Shells position the wrapper. */
export function ActionBar({
  playCard,
  drawCard,
  passTurn,
  canSubmitPlay,
  canDraw,
  canPassTurn,
  drewThisTurn,
}: ActionBarProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={playCard}
        disabled={!canSubmitPlay}
        className={`
          flex-1 py-3 rounded-lg font-bold text-white
          transition-all
          ${
            canSubmitPlay
              ? "bg-green-500 hover:bg-green-600 active:scale-95"
              : "bg-gray-400 cursor-not-allowed opacity-50"
          }
        `}
      >
        Play Card
      </button>

      <button
        onClick={drawCard}
        disabled={!canDraw}
        className={`
          flex-1 py-3 rounded-lg font-bold text-white
          transition-all
          ${
            canDraw
              ? "bg-blue-500 hover:bg-blue-600 active:scale-95"
              : "bg-gray-400 cursor-not-allowed opacity-50"
          }
        `}
      >
        Draw Card
      </button>

      {drewThisTurn && (
        <button
          onClick={passTurn}
          disabled={!canPassTurn}
          className={`
            flex-1 py-3 rounded-lg font-bold text-white
            transition-all
            ${
              canPassTurn
                ? "bg-orange-500 hover:bg-orange-600 active:scale-95"
                : "bg-gray-400 cursor-not-allowed opacity-50"
            }
          `}
        >
          Pass
        </button>
      )}
    </div>
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
