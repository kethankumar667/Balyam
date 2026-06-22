import { useEffect, useMemo, useRef, useState } from "react";
import type { MemoryMatchPublicState, Player, ChatMessage } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";

/**
 * Memory Match — Old Photo Album Edition.
 *
 * Grid of face-down cards. Players flip 2 cards per turn:
 * - Match → keep cards face-up, score, bonus turn
 * - No match → reveal both for ~1.5s, then flip back, next player
 * - Game ends when all pairs matched; most pairs wins.
 */

interface BoardProps {
  state: MemoryMatchPublicState;
  players: Player[];
  selfId: string | null;
  roomCode: string;
  messages: ChatMessage[];
  roomPhase: string;
}

export default function MemoryMatchBoard({
  state,
  players,
  selfId,
  roomCode,
  messages,
  roomPhase,
}: BoardProps) {
  const myTurn = state.turnPlayerId === selfId;
  const canPlay = myTurn && state.phase === "playing";

  // Turn-in haptic cue (fires once when it becomes the local player's turn).
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // Dismiss end-of-game panel on phase reset (rematch).
  const [panelDismissed, setPanelDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setPanelDismissed(false);
  }, [state.phase]);

  // Player name lookup.
  const nameOf = (id: string): string => players.find((p) => p.id === id)?.name ?? "?";

  // Pre-compute flipped set for fast O(1) lookup.
  const flippedSet = useMemo(() => new Set(state.flipped), [state.flipped]);

  // Owned cards per player (matched & claimed).
  const ownedBy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pid of state.playerOrder) map[pid] = 0;
    for (const card of state.board) {
      if (card.ownerId) map[card.ownerId] = (map[card.ownerId] ?? 0) + 1;
    }
    return map;
  }, [state.board, state.playerOrder]);

  // Card display state: each card tracks whether it's face-up (flipped or owned).
  const cardFaceUp = (cardId: number): boolean => {
    const card = state.board.find((c) => c.id === cardId);
    if (!card) return false;
    return card.ownerId !== null || flippedSet.has(cardId);
  };

  // Wall-clock countdown timer for turn & reveal phases.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Move dispatch: emit flip move. Only allow during playing phase and when it's the current player's turn.
  function flipCard(cardId: number) {
    if (!canPlay) return;
    const card = state.board.find((c) => c.id === cardId);
    if (!card) return;
    // Reject if already owned, already flipped, or we already have 2 flipped.
    if (card.ownerId !== null || flippedSet.has(cardId) || state.flipped.length >= 2) return;

    getSocket().emit("game:move", {
      type: "flip",
      data: { cardId },
      playerId: selfId ?? undefined,
    });
  }

  // Size and grid layout.
  const boardSize = state.options.boardSize;
  const cardSize = 80; // px
  const gap = 8; // px between cards
  const boardDim = boardSize * cardSize + (boardSize - 1) * gap; // total grid width/height

  // Winner determination.
  const winner = state.winnerId
    ? players.find((p) => p.id === state.winnerId)
    : null;
  const isWinner = state.winnerId === selfId;
  const isOver = state.phase === "finished";

  return (
    <div className="space-y-4">
      {/* Header: Game info & turn indicator */}
      <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6E5E4D]">
            {state.playerOrder.length} Players
            {state.phase !== "finished" && (
              <>
                {" · "}
                <span className={`${myTurn ? "font-bold text-[#E6A11E]" : ""}`}>
                  {myTurn ? "Your turn" : `${nameOf(state.turnPlayerId)}'s turn`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Pair count progress */}
        <div className="text-xs text-[#8B7355]">
          {state.matchedPairs} / {state.totalPairs} pairs matched
        </div>

        {/* Turn timer warning (shared component) */}
        {state.phase === "playing" && state.turnDeadline && (
          <TurnTimeWarning deadline={state.turnDeadline} active={myTurn} />
        )}
      </div>

      {/* Score card section */}
      <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4">
        <div className="text-xs font-bold uppercase text-[#6E5E4D] mb-2">Scores</div>
        <div className="grid grid-cols-2 gap-2">
          {state.playerOrder.map((pid) => (
            <div
              key={pid}
              className={`text-sm p-2 rounded text-center font-semibold ${
                myTurn && pid === state.turnPlayerId
                  ? "bg-[#E6A11E] text-[#2B2118]"
                  : "bg-[#F0E1D0] text-[#6E5E4D]"
              }`}
            >
              {nameOf(pid)}
              <div className="text-lg font-bold">{state.scores[pid] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card grid — Old Photo Album Edition */}
      <div
        className="mx-auto p-4 bg-[#E8D7C3] rounded-lg border-4 border-[#6D4323] shadow-lg"
        style={{ width: boardDim + 32, background: "#E8D7C3" }}
      >
        <div
          className="grid gap-2 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, ${cardSize}px)`,
            width: boardDim,
          }}
        >
          {state.board.map((card) => (
            <Card
              key={card.id}
              card={card}
              isFaceUp={cardFaceUp(card.id)}
              isFlipping={state.phase === "reveal" && state.flipped.includes(card.id)}
              canFlip={canPlay && state.flipped.length < 2 && !cardFaceUp(card.id)}
              onClick={() => flipCard(card.id)}
              size={cardSize}
            />
          ))}
        </div>
      </div>

      {/* Game finished panel */}
      {isOver && !panelDismissed && (
        <div className="bg-[#FFF9F0] border-2 border-[#E6A11E] rounded-lg p-6 text-center space-y-4">
          {state.winnerId ? (
            <>
              <div className="text-2xl font-bold text-[#6E5E4D]">
                {isWinner ? "🎉 You won! 🎉" : `${nameOf(state.winnerId)} wins!`}
              </div>
              <div className="text-sm text-[#8B7355]">
                {nameOf(state.winnerId)} matched {state.scores[state.winnerId] ?? 0} pairs
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-[#6E5E4D]">It's a tie!</div>
          )}
          <button
            onClick={() => setPanelDismissed(true)}
            className="bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] px-6 py-2 rounded font-semibold text-sm"
          >
            Close
          </button>
        </div>
      )}

      {/* Reveal phase indicator */}
      {state.phase === "reveal" && (
        <div className="text-center text-sm font-semibold text-[#C67C3C] animate-pulse">
          ✨ Cards revealing...
        </div>
      )}

      {/* Side rail */}
      <InlineRoomRail
        code={roomCode}
        game={state.kind}
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />
    </div>
  );
}

/**
 * Card — front side has emoji symbol (visible when face-up or matched),
 * back side is an old-photo frame aesthetic.
 */
interface CardProps {
  card: { id: number; symbol: string | null; ownerId: string | null };
  isFaceUp: boolean;
  isFlipping: boolean;
  canFlip: boolean;
  onClick: () => void;
  size: number;
}

function Card({ card, isFaceUp, isFlipping, canFlip, onClick, size }: CardProps) {
  // Sepia filter for emoji symbols — nostalgic old-photo effect.
  const sepia = "sepia(0.4) hue-rotate(20deg) brightness(0.95)";

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
              ? "bg-gradient-to-br from-[#8B5A3C] to-[#5D3A1F] border-2 border-[#4A2A15] cursor-pointer hover:shadow-lg active:shadow-md"
              : "bg-gradient-to-br from-[#6D4A35] to-[#4A2A15] border-2 border-[#3A1F0F] cursor-not-allowed opacity-75"
        }
        ${isFlipping ? "animate-pulse" : ""}
        flex items-center justify-center
      `}
      style={{
        width: size,
        height: size,
        filter: isFaceUp && card.symbol ? sepia : "none",
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
