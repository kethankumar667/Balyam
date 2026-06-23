import type { MemoryMatchPublicState } from "@shared/types";

/**
 * Memory Match — Old Photo Album Edition shared presentation.
 *
 * Pure, layout-agnostic pieces consumed by BOTH the mobile and desktop shells:
 * the album-frame card grid and the individual flip card. All behaviour lives
 * in useMemoryMatchBoard; these components only render what the hook derives.
 */

/** Sepia filter for emoji symbols — nostalgic old-photo effect. */
const SEPIA_FILTER = "sepia(0.4) hue-rotate(20deg) brightness(0.95)";

type BoardCell = MemoryMatchPublicState["board"][number];

interface CardGridProps {
  board: BoardCell[];
  boardSize: number;
  cardSize: number;
  gap: number;
  cardFaceUp: (cardId: number) => boolean;
  canFlipCard: (cardId: number) => boolean;
  isCardFlipping: (cardId: number) => boolean;
  onFlip: (cardId: number) => void;
}

/**
 * CardGrid — the framed photo-album board. Width/height derive entirely from
 * `cardSize`/`gap`, so the mobile shell can shrink cards to fit a phone while
 * the desktop shell keeps larger fixed cards, both reusing this same grid.
 */
export function CardGrid({
  board,
  boardSize,
  cardSize,
  gap,
  cardFaceUp,
  canFlipCard,
  isCardFlipping,
  onFlip,
}: CardGridProps) {
  const boardDim = boardSize * cardSize + (boardSize - 1) * gap;

  return (
    <div
      className="mx-auto bg-[#E8D7C3] rounded-lg border-4 border-[#6D4323] shadow-lg"
      style={{ width: boardDim + 32, padding: 16 }}
    >
      <div
        className="grid mx-auto"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, ${cardSize}px)`,
          gap,
          width: boardDim,
        }}
      >
        {board.map((card) => (
          <Card
            key={card.id}
            card={card}
            isFaceUp={cardFaceUp(card.id)}
            isFlipping={isCardFlipping(card.id)}
            canFlip={canFlipCard(card.id)}
            onClick={() => onFlip(card.id)}
            size={cardSize}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  card: BoardCell;
  isFaceUp: boolean;
  isFlipping: boolean;
  canFlip: boolean;
  onClick: () => void;
  size: number;
}

/**
 * Card — front side has emoji symbol (visible when face-up or matched),
 * back side is an old-photo frame aesthetic.
 */
export function Card({ card, isFaceUp, isFlipping, canFlip, onClick, size }: CardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!canFlip}
      className={`
        relative w-full h-full rounded-md font-bold text-3xl
        transition-all duration-200 active:scale-95
        ${
          isFaceUp
            ? "bg-[#F7E8C4] border-2 border-[#E4B128] shadow-inner"
            : canFlip
              ? "bg-gradient-to-br from-[#8B5A3C] to-[#5D3A1F] border-2 border-[#4A2A15] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:shadow-md"
              : "bg-gradient-to-br from-[#6D4A35] to-[#4A2A15] border-2 border-[#3A1F0F] cursor-not-allowed opacity-75"
        }
        ${isFlipping ? "animate-pulse" : ""}
        flex items-center justify-center
      `}
      style={{
        width: size,
        height: size,
        filter: isFaceUp && card.symbol ? SEPIA_FILTER : "none",
      }}
    >
      {isFaceUp && card.symbol ? (
        <span>{card.symbol}</span>
      ) : (
        <span className="text-lg">🎴</span>
      )}
    </button>
  );
}
