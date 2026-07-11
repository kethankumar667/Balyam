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
 * Touch-first UNO board — same structural pieces as the desktop shell (header
 * with Leave + room code + turn pill, opponent seats, bordered table, tabbed
 * room rail), sized for one column. The room now gives UNO the same
 * full-bleed viewport shell Rummy uses (Room.tsx), so — unlike the previous
 * plain-document-scroll version — this shell owns its own internal scroll
 * area between a fixed header and the sticky bottom action bar.
 */
export default function UnoBoardMobile(props: UnoBoardProps) {
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

      {/* Header */}
      <div
        className="flex-shrink-0 border-b px-3 py-2 space-y-2"
        style={{ background: "#F6EDDB", borderColor: "#E8D8BE" }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onLeave}
            className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#6E5E4D] bg-[#EFE2C7] hover:bg-[#E5D4B2]"
          >
            ← Leave
          </button>
          <div className="flex items-baseline gap-1.5 bg-[#FFF9F0] border border-[#E8D8BE] px-2.5 py-1 rounded-md">
            <span className="font-script text-base leading-none text-[#B91C1C]">Bhalyam</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355]">UNO</span>
            <span className="font-mono text-[10px] text-[#8B7355]">· {roomCode}</span>
          </div>
          <TutorialButton onClick={() => tut.setOpen(true)} />
        </div>
        <div
          className={`flex items-center justify-between gap-2 border rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            m.myTurn ? "bg-[#E6A11E]/25 border-[#E6A11E] text-[#6E5E4D]" : "border-[#E8D8BE] text-[#8B7355]"
          }`}
        >
          <span className="truncate">{turnLabel}</span>
          {state.turnDeadline && (
            <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} />
          )}
        </div>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Scrollable body — the sticky action bar below sticks to the bottom
          of THIS container, not the page (the page itself no longer scrolls,
          see Room.tsx's uno full-bleed shell). */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {/* Opponent seats — horizontal scroll row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {state.playerOrder
            .filter((id) => id !== selfId)
            .map((id) => (
              <UnoOpponentSeat
                key={id}
                name={m.nameOf(id)}
                handSize={state.handSizes[id] ?? 0}
                isTurn={state.turnPlayerId === id}
                size="sm"
                canCatch={m.catchableOpponents.includes(id)}
                onCatch={() => m.catchUno(id)}
              />
            ))}
        </div>

        <DeckPanel
          topCard={state.topCard}
          currentColor={state.currentColor}
          deckCount={state.deckCount}
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

        {/* Action bar pinned to the bottom of the scroll area */}
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
      </div>

      {/* Room rail — floating trigger + full-screen sheet */}
      <UnoRoomRail
        variant="sheet"
        players={players}
        selfId={selfId}
        messages={messages}
        playerOrder={state.playerOrder}
        turnPlayerId={state.turnPlayerId}
        scores={state.scores}
        nameOf={m.nameOf}
      />

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
