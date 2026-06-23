import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import { CardGrid } from "./memorymatch-shared";
import { useMemoryMatchBoard, type MemoryMatchBoardProps } from "./useMemoryMatchBoard";

const DESKTOP_CARD = 88; // px — larger fixed cards, mouse-targeted
const DESKTOP_GAP = 8; // px between cards

/**
 * Memory Match — desktop shell. The board sits on the left at a comfortable
 * fixed size; a right-hand info column carries turn status, pair progress and
 * the full scoreboard. The room rail spans the bottom. A genuinely two-column
 * arrangement that spends the extra width on side panels, not on a stretched
 * phone layout. Hover affordance on flippable cards comes from the shared Card.
 */
export default function MemoryMatchBoardDesktop(props: MemoryMatchBoardProps) {
  const { state, players, selfId, roomCode, messages, roomPhase } = props;
  const {
    myTurn,
    nameOf,
    cardFaceUp,
    canFlipCard,
    isCardFlipping,
    flipCard,
    boardSize,
    isWinner,
    isOver,
    panelDismissed,
    setPanelDismissed,
  } = useMemoryMatchBoard(props);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        {/* Left column — the board */}
        <div className="flex-shrink-0">
          <CardGrid
            board={state.board}
            boardSize={boardSize}
            cardSize={DESKTOP_CARD}
            gap={DESKTOP_GAP}
            cardFaceUp={cardFaceUp}
            canFlipCard={canFlipCard}
            isCardFlipping={isCardFlipping}
            onFlip={flipCard}
          />
          {/* Reveal phase indicator — under the board */}
          {state.phase === "reveal" && (
            <div className="mt-3 text-center text-sm font-semibold text-[#C67C3C] animate-pulse">
              ✨ Cards revealing...
            </div>
          )}
        </div>

        {/* Right column — turn / progress / scores info rail */}
        <div className="flex-1 min-w-[260px] max-w-sm space-y-4">
          {/* Turn + progress */}
          <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-[#6E5E4D]">
              {state.playerOrder.length} Players
              {state.phase !== "finished" && (
                <>
                  {" · "}
                  <span className={myTurn ? "font-bold text-[#E6A11E]" : ""}>
                    {myTurn ? "Your turn" : `${nameOf(state.turnPlayerId)}'s turn`}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-[#8B7355]">
              {state.matchedPairs} / {state.totalPairs} pairs matched
            </div>
            {state.phase === "playing" && state.turnDeadline && (
              <TurnTimeWarning deadline={state.turnDeadline} active={myTurn} />
            )}
          </div>

          {/* Scores — single column stack beside the board */}
          <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-4">
            <div className="text-xs font-bold uppercase text-[#6E5E4D] mb-2">Scores</div>
            <div className="space-y-2">
              {state.playerOrder.map((pid) => (
                <div
                  key={pid}
                  className={`flex items-center justify-between text-sm px-3 py-2 rounded font-semibold ${
                    myTurn && pid === state.turnPlayerId
                      ? "bg-[#E6A11E] text-[#2B2118]"
                      : "bg-[#F0E1D0] text-[#6E5E4D]"
                  }`}
                >
                  <span>{nameOf(pid)}</span>
                  <span className="text-lg font-bold">{state.scores[pid] ?? 0}</span>
                </div>
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
        </div>
      </div>

      {/* Side rail — full width below the two columns */}
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
