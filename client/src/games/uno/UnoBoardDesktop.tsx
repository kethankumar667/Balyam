import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import {
  DeckPanel,
  ScorePanel,
  HandInfoPanel,
  HandPanel,
  ActionBar,
  GameOverPanel,
} from "./uno-shared";

/**
 * Desktop UNO board — a genuine multi-region layout, not the mobile column
 * stretched. The extra width buys a persistent right rail (room/chat/players)
 * that stays put while the board area owns the left. Within the board a 3-column
 * info row (deck · scores · hand summary) sits above a roomy hand fan whose
 * cards are larger and lift on hover. The action bar flows inline, no pinning.
 */
export default function UnoBoardDesktop(props: UnoBoardProps) {
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, roomPhase } = m;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      {/* Board column */}
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-[#6E5E4D]">
              {m.myTurn ? "🎮 Your Turn" : `${m.currentPlayer}'s turn`}
              {state.direction === -1 ? " ↩️ Counter-clockwise" : " ➡️ Clockwise"}
            </div>
            {state.turnDeadline && (
              <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} />
            )}
          </div>
        </div>

        {/* 3-column info row: deck info | scores | hand info */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <DeckPanel
            topCard={state.topCard}
            currentColor={state.currentColor}
            deckCount={state.deckCount}
          />
          <ScorePanel
            playerOrder={state.playerOrder}
            turnPlayerId={state.turnPlayerId}
            selfId={selfId}
            scores={state.scores}
            nameOf={m.nameOf}
          />
          <HandInfoPanel
            handCount={state.myHand.length}
            selectedCard={m.selectedCard}
          />
        </div>

        {/* Roomy hand fan with larger, hover-lifting cards */}
        <HandPanel
          sortedHand={m.sortedHand}
          validMoveIds={m.validMoveIds}
          selectedCardId={m.selectedCardId}
          myTurn={m.myTurn}
          phase={state.phase}
          onSelectCard={m.setSelectedCard}
          needsColorChoice={m.needsColorChoice}
          selectedWildColor={m.selectedWildColor}
          onPickColor={m.setWildColor}
          size="lg"
        />

        {/* Inline action bar */}
        {m.myTurn && state.phase === "playing" && (
          <ActionBar
            playCard={m.playCard}
            drawCard={m.drawCard}
            passTurn={m.passTurn}
            canSubmitPlay={m.canSubmitPlay}
            canDraw={m.canDraw}
            canPassTurn={m.canPassTurn}
            drewThisTurn={m.drewThisTurn}
          />
        )}

        {/* Game over panel */}
        {state.phase === "finished" && m.winner && (
          <GameOverPanel winner={m.winner} selfId={selfId} scores={state.scores} />
        )}
      </div>

      {/* Persistent side rail */}
      <aside className="sticky top-4">
        <InlineRoomRail
          code={roomCode}
          game="uno"
          phase={roomPhase}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      </aside>
    </div>
  );
}
