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
 * Touch-first UNO board: a single scrolling column with the deck, scores, and
 * hand summary stacked, a full-width wrapping hand fan, and the action bar
 * pinned to the bottom of the viewport so the primary controls stay in thumb
 * reach. Handles every tier below the desktop gate (phones, tablets, landscape).
 */
export default function UnoBoardMobile(props: UnoBoardProps) {
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, roomPhase } = m;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6E5E4D]">
            {m.myTurn ? "🎮 Your Turn" : `${m.currentPlayer}'s turn`}
            {state.direction === -1 ? " ↩️ Counter-clockwise" : " ➡️ Clockwise"}
          </div>
          {state.turnDeadline && (
            <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} />
          )}
        </div>
      </div>

      {/* Stacked info panels */}
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
      <HandInfoPanel handCount={state.myHand.length} selectedCard={m.selectedCard} />

      {/* Full-width wrapping hand fan */}
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
      />

      {/* Action bar pinned to the bottom of the viewport */}
      {m.myTurn && state.phase === "playing" && (
        <div className="sticky bottom-0 z-20 -mx-1 px-1 pt-2 pb-2 bg-gradient-to-t from-[#F6EDDB] via-[#F6EDDB]/95 to-transparent">
          <ActionBar
            playCard={m.playCard}
            drawCard={m.drawCard}
            passTurn={m.passTurn}
            canSubmitPlay={m.canSubmitPlay}
            canDraw={m.canDraw}
            canPassTurn={m.canPassTurn}
            drewThisTurn={m.drewThisTurn}
          />
        </div>
      )}

      {/* Game over panel */}
      {state.phase === "finished" && m.winner && (
        <GameOverPanel winner={m.winner} selfId={selfId} scores={state.scores} />
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
