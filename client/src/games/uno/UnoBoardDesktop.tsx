import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import {
  DeckPanel,
  HandInfoPanel,
  HandPanel,
  ActionBar,
  GameOverPanel,
  UnoOpponentSeat,
} from "./uno-shared";
import { UnoRoomRail } from "./uno-rail";
import { useUnoDealGate, UnoDealOverlay } from "./uno-deal";
import { UnoActionToast } from "./uno-action-toast";
import { UnoCallButton } from "./uno-declare";
import { WildDrawFourChallengePrompt } from "./uno-challenge";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { UNO_TUTORIAL } from "../tutorials";

/**
 * Desktop UNO board — structural parity with Rummy's desktop board
 * (RummyBoardDesktop.tsx): a header with Leave + room code + turn pill, an
 * opponent seat row with live card counts, a bordered table area, and a
 * persistent Chat/Voice/Players/Points sidebar — all in UNO's own cream/gold
 * palette rather than Rummy's wood/green. See uno-shared.tsx (UnoOpponentSeat,
 * DeckPanel) and uno-rail.tsx (UnoRoomRail) for the reusable pieces.
 */
export default function UnoBoardDesktop(props: UnoBoardProps) {
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  const dealStage = useUnoDealGate(roomCode);

  const directionLabel = state.direction === -1 ? "Counter-clockwise" : "Clockwise";
  const turnLabel = m.myTurn ? `Your Turn · ${directionLabel}` : `${m.currentPlayer}'s Turn · ${directionLabel}`;

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {dealStage !== "idle" && (
        <UnoDealOverlay stage={dealStage} playerCount={state.playerOrder.length} />
      )}

      {/* Header — Leave + room code tag + turn pill + Rules, mirrors Rummy's
          top bar shape (RummyBoardDesktop.tsx:765-812). */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-2.5 border-b flex-shrink-0"
        style={{ background: "#F6EDDB", borderColor: "#E8D8BE" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onLeave}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#6E5E4D] bg-[#EFE2C7] hover:bg-[#E5D4B2]"
          >
            ← Leave
          </button>
          <div className="flex items-baseline gap-2 bg-[#FFF9F0] border border-[#E8D8BE] px-3 py-1 rounded-md">
            <span className="font-script text-lg leading-none text-[#B91C1C]">Bhalyam</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">UNO</span>
            <span className="font-mono text-xs text-[#8B7355]">· {roomCode}</span>
          </div>
          <div
            className={`flex items-center gap-2 border rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-widest ${
              m.myTurn ? "bg-[#E6A11E]/25 border-[#E6A11E] text-[#6E5E4D]" : "border-[#E8D8BE] text-[#8B7355]"
            }`}
          >
            <span>{turnLabel}</span>
            {state.turnDeadline && (
              <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} />
            )}
          </div>
        </div>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Main row: board area + persistent rail. */}
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div className="flex flex-col gap-3 px-5 py-4 overflow-y-auto">
          {/* Opponent seats — live card-back fan + count, reads state.handSizes
              (already on the wire, never rendered before this). */}
          <div className="flex gap-3 justify-center flex-wrap">
            {state.playerOrder
              .filter((id) => id !== selfId)
              .map((id) => (
                <UnoOpponentSeat
                  key={id}
                  name={m.nameOf(id)}
                  handSize={state.handSizes[id] ?? 0}
                  isTurn={state.turnPlayerId === id}
                  canCatch={m.catchableOpponents.includes(id)}
                  onCatch={() => m.catchUno(id)}
                />
              ))}
          </div>

          {/* Table mat + hand summary */}
          <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
            <DeckPanel
              topCard={state.topCard}
              currentColor={state.currentColor}
              deckCount={state.deckCount}
            />
            <HandInfoPanel handCount={state.myHand.length} selectedCard={m.selectedCard} />
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

        {/* Persistent tabbed rail — Chat / Voice / Players / Points */}
        <UnoRoomRail
          variant="sidebar"
          players={players}
          selfId={selfId}
          messages={messages}
          playerOrder={state.playerOrder}
          turnPlayerId={state.turnPlayerId}
          scores={state.scores}
          nameOf={m.nameOf}
        />
      </div>

      {tut.open && (
        <GameTutorial
          slides={UNO_TUTORIAL.slides}
          storageKey={UNO_TUTORIAL.key}
          accent={UNO_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      <UnoCallButton visible={m.canDeclareUno} onDeclare={m.declareUno} />

      {m.isChallengeTarget && m.pendingChallenge && (
        <WildDrawFourChallengePrompt
          playedByName={m.nameOf(m.pendingChallenge.playedById)}
          onAccept={m.acceptWildFourDraw}
          onChallenge={m.challengeWildFour}
        />
      )}
    </div>
  );
}
