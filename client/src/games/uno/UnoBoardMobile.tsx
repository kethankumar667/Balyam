import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import { ActionBar } from "./uno-shared";
import {
  UnoTableMat,
  UnoDirectionArc,
  UnoTableCenter,
  UnoPlayerChip,
  UnoHandFan,
  computeSeatPosition,
  useUnoEventFlourish,
} from "./uno-table";
import { UnoRoomRail } from "./uno-rail";
import { useUnoDealGate, UnoDealOverlay } from "./uno-deal";
import { UnoActionToast } from "./uno-action-toast";
import { UnoCallButton, UnoDeclareBubble } from "./uno-declare";
import { WildDrawFourChallengePrompt } from "./uno-challenge";
import UnoResultModal from "./UnoResultModal";
import Avatar from "../rummy/Avatar";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { UNO_TUTORIAL } from "../tutorials";

/**
 * Touch-first UNO board — circular-table redesign (see UnoBoardDesktop.tsx's
 * header comment and PLAN_REVIEW_REPORT.md §9 for the full rationale/asset
 * constraints). Keeps the existing header UNCHANGED (Leave, room code,
 * Tutorial, and an explicit "Your Turn · Clockwise" text pill — clearer at
 * phone sizes than icon-only turn signalling would be) and swaps the body
 * for a smaller version of the same oval mat + hand fan desktop now uses,
 * inside the existing internal-scroll shell.
 */
export default function UnoBoardMobile(props: UnoBoardProps) {
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  const dealStage = useUnoDealGate(roomCode);
  const flourish = useUnoEventFlourish(state.lastAction);

  const directionLabel = state.direction === -1 ? "Counter-clockwise" : "Clockwise";
  const turnLabel = m.myTurn ? `Your Turn · ${directionLabel}` : `${m.currentPlayer}'s Turn · ${directionLabel}`;
  const opponents = state.playerOrder.filter((id) => id !== selfId);
  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {dealStage !== "idle" && (
        <UnoDealOverlay stage={dealStage} playerCount={state.playerOrder.length} />
      )}

      {/* Screen-reader-only turn announcement — matches UnoBoardDesktop.tsx.
          The visible turn pill below updates too, but without aria-live a
          screen-reader user isn't proactively notified of the change, only
          told if they manually re-navigate to it (Volume 3 §25). */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.phase === "playing"
          ? m.myTurn
            ? "Your turn"
            : `${m.currentPlayer}'s turn`
          : ""}
      </div>

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
          {/* topOffsetRem clears this two-row header (Leave/pill/Tutorial +
              this turn-label row) — the chip is `position: fixed`, so
              mounting it here doesn't visually nest it; without the offset
              it renders on top of the header regardless of DOM position. */}
          {state.turnDeadline && (
            <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} topOffsetRem={5.5} />
          )}
        </div>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Scrollable body — the sticky action bar below sticks to the bottom
          of THIS container, not the page (the page itself no longer scrolls,
          see Room.tsx's uno full-bleed shell). */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {/* The table — same oval mat as desktop, scaled to fit one column. */}
        <div className="relative w-full mx-auto" style={{ maxWidth: 480, aspectRatio: "1.35" }}>
          <UnoTableMat>
            <UnoDirectionArc direction={state.direction} flourish={flourish !== null} />

            {opponents.map((id, i) => {
              const pos = computeSeatPosition(i, opponents.length);
              return (
                <div
                  key={id}
                  className="absolute"
                  style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}
                >
                  <UnoPlayerChip
                    name={m.nameOf(id)}
                    handSize={state.handSizes[id] ?? 0}
                    isTurn={state.turnPlayerId === id}
                    fanDir={pos.fanDir}
                    canCatch={m.catchableOpponents.includes(id)}
                    onCatch={() => m.catchUno(id)}
                    compact={opponents.length > 4}
                  />
                </div>
              );
            })}

            <div className="absolute inset-0 flex items-center justify-center">
              <UnoTableCenter
                topCard={state.topCard}
                currentColor={state.currentColor}
                deckCount={state.deckCount}
              />
            </div>

            <div className="absolute left-1/2 bottom-[4%] -translate-x-1/2">
              <div className="relative flex flex-col items-center gap-1">
                <UnoDeclareBubble declared={selfDeclared} />
                <Avatar name={selfName} size={44} />
              </div>
            </div>
          </UnoTableMat>
        </div>

        {/* Full-width card fan */}
        <UnoHandFan
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

      </div>

      {state.phase === "finished" && !m.scorecardDismissed && (
        <UnoResultModal
          state={state}
          players={players}
          selfId={selfId}
          onClose={m.dismissScorecard}
          onLeave={onLeave}
        />
      )}

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

      {/* Floating declare button — bottom-left, clear of the room-rail
          trigger (bottom-right) and the sticky action bar underneath it. */}
      <div className="fixed bottom-20 left-4 z-30">
        <UnoCallButton visible={m.canDeclareUno} onDeclare={m.declareUno} />
      </div>

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
