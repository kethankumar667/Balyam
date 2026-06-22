import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player, UnoPlayerState } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { AUDIO } from "../../constants/audio";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useUnoStore } from "../../store/unoStore";
import {
  sortHand,
  getCardEmoji,
  getCardLabel,
  CARD_DISPLAY,
} from "./helpers/deck";
import {
  canPlayCard,
  getPlayableCards,
  requiresColorChoice,
  isColorChosen,
  canPass,
} from "./helpers/validation";

interface UnoBoardProps {
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}

export default function UnoBoard({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: UnoBoardProps) {
  const myTurn = state.turnPlayerId === selfId && state.phase === "playing";

  // Haptic cue on turn
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // Audio for game events
  const { play: playSound } = useAudio();

  // Local UI state
  const {
    selectedCardId,
    setSelectedCard,
    selectedWildColor,
    setWildColor,
    reset: resetUIState,
  } = useUnoStore();

  // Game loop state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drewThisTurn, setDrewThisTurn] = useState(false);

  // Reset UI state on new turn
  useEffect(() => {
    if (myTurn) {
      resetUIState();
      setDrewThisTurn(false);
    }
  }, [state.turnPlayerId, myTurn, resetUIState]);

  // Reset UI on game over
  useEffect(() => {
    if (state.phase === "finished") {
      resetUIState();
    }
  }, [state.phase, resetUIState]);

  // Player name lookup
  const nameOf = (id: string): string => players.find((p) => p.id === id)?.name ?? "?";

  // Compute valid moves
  const validMoves = useMemo(
    () => getPlayableCards(state.myHand, state.topCard, state.currentColor),
    [state.myHand, state.topCard, state.currentColor]
  );

  const selectedCard = useMemo(
    () => state.myHand.find((c) => c.id === selectedCardId),
    [state.myHand, selectedCardId]
  );

  const canPlaySelectedCard =
    selectedCard && canPlayCard(selectedCard, state.topCard, state.currentColor);

  const needsColorChoice = selectedCard ? requiresColorChoice(selectedCard) : false;
  const colorChosen = !needsColorChoice || selectedWildColor !== null;

  const canSubmitPlay = canPlaySelectedCard && colorChosen && !isSubmitting;
  const canDraw = myTurn && !drewThisTurn && !isSubmitting;
  const canPassTurn = myTurn && drewThisTurn && !isSubmitting;

  // Sorted hand for display
  const sortedHand = useMemo(() => sortHand(state.myHand), [state.myHand]);

  // Send move
  function playCard() {
    if (!canSubmitPlay || !selectedCard) return;

    playSound(
      selectedCard.rank === "Wild" || selectedCard.rank === "Wild+4"
        ? AUDIO.UNO_WILD
        : AUDIO.UNO_PLAY
    );

    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "play",
      data: {
        cardId: selectedCard.id,
        color: selectedWildColor || selectedCard.color,
      },
      playerId: selfId ?? undefined,
    });

    setSelectedCard(null);
    setWildColor(null);
  }

  function drawCard() {
    if (!canDraw) return;
    playSound(AUDIO.UNO_DRAW);
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "draw",
      playerId: selfId ?? undefined,
    });
    setDrewThisTurn(true);
    setIsSubmitting(false);
  }

  function passTurn() {
    if (!canPassTurn) return;
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "pass",
      playerId: selfId ?? undefined,
    });
    setDrewThisTurn(false);
    setIsSubmitting(false);
  }

  const currentPlayer = nameOf(state.turnPlayerId);
  const winner = state.winnerId
    ? players.find((p) => p.id === state.winnerId)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6E5E4D]">
            {myTurn ? "🎮 Your Turn" : `${currentPlayer}'s turn`}
            {state.direction === -1 ? " ↩️ Counter-clockwise" : " ➡️ Clockwise"}
          </div>
          {state.turnDeadline && (
            <TurnTimeWarning
              deadline={state.turnDeadline}
              active={myTurn}
            />
          )}
        </div>
      </div>

      {/* Game board layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Draw & Discard piles */}
        <div className="space-y-3">
          <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">
              Deck Info
            </h3>

            {/* Draw pile */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#8B7355]">Draw Pile</div>
              <div className="bg-[#6D4323] text-[#F7E8C4] rounded px-2 py-1 text-sm font-bold">
                {state.deckCount}
              </div>
            </div>

            {/* Top card / discard pile */}
            <div className="text-xs font-bold text-[#6E5E4D] mb-2">
              Top Card
            </div>
            <div className="h-32 flex items-center justify-center bg-gradient-to-br from-[#F7E8C4] to-[#E4B128] border-2 border-[#E4B128] rounded-lg">
              <div className="text-center">
                <div className="text-5xl mb-1">
                  {getCardEmoji(state.topCard)}
                </div>
                <div className="text-xs font-semibold text-[#6E5E4D]">
                  {getCardLabel(state.topCard)}
                </div>
                {state.currentColor && (
                  state.topCard.rank === "Wild" ||
                  state.topCard.rank === "Wild+4"
                ) && (
                  <div className="text-xs text-[#C67C3C] mt-1">
                    {CARD_DISPLAY[state.currentColor]?.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Players and scores */}
        <div className="space-y-3">
          <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase text-[#6E5E4D] mb-3">
              Scores
            </h3>
            <div className="space-y-2">
              {state.playerOrder.map((pid) => {
                const isCurrentPlayer = pid === state.turnPlayerId;
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
                    <span>{state.scores[pid] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Hand info */}
        <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">
            Your Hand
          </h3>
          <div className="text-sm text-[#8B7355]">
            {state.myHand.length} card{state.myHand.length !== 1 ? "s" : ""}
          </div>
          {selectedCard && (
            <div className="bg-[#E8D7C3] border border-[#6D4323] rounded p-2">
              <div className="text-xs font-semibold text-[#6E5E4D] mb-1">
                Selected
              </div>
              <div className="text-center">
                <div className="text-3xl mb-1">{getCardEmoji(selectedCard)}</div>
                <div className="text-xs text-[#6E5E4D]">
                  {getCardLabel(selectedCard)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player hand */}
      <div className="bg-[#E8D7C3] border-4 border-[#6D4323] rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase text-[#6E5E4D]">
          Your Cards
        </h3>

        {sortedHand.length === 0 ? (
          <div className="text-center py-6 text-[#8B7355]">
            You win! 🎉
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {sortedHand.map((card) => {
                const isSelected = card.id === selectedCardId;
                const isValid = validMoves.some((c) => c.id === card.id);
                const isDisabled = !isValid && myTurn && state.phase === "playing";

                return (
                  <button
                    key={card.id}
                    onClick={() =>
                      myTurn ? setSelectedCard(card.id) : undefined
                    }
                    disabled={isDisabled}
                    className={`
                      flex flex-col items-center justify-center
                      w-16 h-24 rounded-lg font-bold text-2xl
                      transition-all duration-200
                      ${
                        isSelected
                          ? "ring-4 ring-[#E6A11E] shadow-lg"
                          : isValid && myTurn
                            ? "hover:shadow-md active:scale-95"
                            : ""
                      }
                      ${
                        isDisabled
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer"
                      }
                      ${
                        card.color === "R"
                          ? "bg-red-200"
                          : card.color === "G"
                            ? "bg-green-200"
                            : card.color === "B"
                              ? "bg-blue-200"
                              : card.color === "Y"
                                ? "bg-yellow-200"
                                : "bg-gradient-to-br from-purple-200 to-pink-200"
                      }
                      border-2 border-gray-400
                    `}
                  >
                    <div>{getCardEmoji(card)}</div>
                    <div className="text-[10px] font-semibold text-gray-700 mt-1">
                      {card.rank === "0"
                        ? "0"
                        : card.rank.slice(0, 2)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Wild color picker */}
            {needsColorChoice && (
              <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded p-3 space-y-2">
                <div className="text-xs font-bold text-[#6E5E4D]">
                  Choose Color
                </div>
                <div className="flex gap-2">
                  {(["R", "G", "B", "Y"] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => setWildColor(color)}
                      className={`
                        flex-1 py-2 rounded font-semibold text-sm
                        transition-all
                        ${
                          selectedWildColor === color
                            ? "ring-2 ring-offset-2 ring-[#E6A11E]"
                            : "hover:opacity-80"
                        }
                        ${
                          color === "R"
                            ? "bg-red-400"
                            : color === "G"
                              ? "bg-green-400"
                              : color === "B"
                                ? "bg-blue-400"
                                : "bg-yellow-400"
                        }
                        text-white
                      `}
                    >
                      {CARD_DISPLAY[color]?.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {myTurn && state.phase === "playing" && (
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
      )}

      {/* Game over panel */}
      {state.phase === "finished" && winner && (
        <div className="bg-[#FFF9F0] border-2 border-[#E6A11E] rounded-lg p-6 text-center space-y-4">
          <div className="text-2xl font-bold text-[#6E5E4D]">
            {winner.id === selfId ? "🎉 You won! 🎉" : `${winner.name} wins!`}
          </div>
          <div className="text-sm text-[#8B7355]">
            {winner.name} won with {state.scores[winner.id] ?? 0} points
          </div>
        </div>
      )}

      {/* Side rail */}
      <InlineRoomRail
        code={roomCode}
        game="uno"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />
    </div>
  );
}
