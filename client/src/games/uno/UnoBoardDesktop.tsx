import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import { ActionBar } from "./uno-shared";
import {
  UnoTableMat,
  UnoDirectionArc,
  UnoTableCenter,
  UnoPlayerChip,
  UnoHandFan,
  UnoTimerBadge,
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
 * Desktop UNO board — circular-table redesign (see PLAN_REVIEW_REPORT.md §9,
 * "table redesign" implementation-log entry, and uno-table.tsx's own header
 * comment for the asset constraints this works within). Oval mat, opponents
 * arranged across the top arc via `computeSeatPosition`, own hand as a
 * tilted card fan at the bottom, self avatar + declare bubble anchored at
 * the mat's base, round UNO button beside the action row.
 *
 * Presentation-only rewrite — every value and handler still comes from
 * `useUnoBoard` unchanged; no hook, store, or engine logic was touched.
 */
export default function UnoBoardDesktop(props: UnoBoardProps) {
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  const dealStage = useUnoDealGate(roomCode);
  const flourish = useUnoEventFlourish(state.lastAction);

  const opponents = state.playerOrder.filter((id) => id !== selfId);
  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  return (
    <div
      className="relative h-full flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #EFE0BE 0%, #E4CE9E 55%, #D8BD84 100%)" }}
    >
      {dealStage !== "idle" && (
        <UnoDealOverlay stage={dealStage} playerCount={state.playerOrder.length} />
      )}

      {/* topOffsetRem clears the room-code pill below, which centres itself
          in this same top-of-screen slot (see the header block further
          down) — without it the two fixed-position elements overlap. */}
      {state.turnDeadline && (
        <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn} topOffsetRem={3.25} />
      )}

      {/* Screen-reader-only turn announcement — the visual design conveys
          whose turn it is via the avatar glow/pill, same as the reference,
          which isn't enough on its own (Volume 3 §25 accessibility). */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.phase === "playing"
          ? m.myTurn
            ? "Your turn"
            : `${m.currentPlayer}'s turn`
          : ""}
      </div>

      {/* Minimal top chrome */}
      <div className="absolute top-3 left-3 z-20">
        <button
          onClick={onLeave}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#6E5E4D] bg-[#FFF9F0] shadow-md hover:bg-[#F0E1D0]"
        >
          ← Leave
        </button>
      </div>
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {state.turnDeadline && <UnoTimerBadge deadline={state.turnDeadline} />}
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-baseline gap-2 bg-[#FFF9F0]/90 border border-[#E8D8BE] px-3 py-1 rounded-md shadow-sm">
        <span className="font-script text-lg leading-none text-[#B91C1C]">Bhalyam</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">UNO</span>
        <span className="font-mono text-xs text-[#8B7355]">· {roomCode}</span>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* The table */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 pt-16">
        <div className="relative w-full" style={{ maxWidth: 760, aspectRatio: "1.55" }}>
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

            {/* Self seat, anchored at the base of the mat */}
            <div className="absolute left-1/2 bottom-[4%] -translate-x-1/2">
              <div className="relative flex flex-col items-center gap-1">
                <UnoDeclareBubble declared={selfDeclared} />
                <div className="relative">
                  <Avatar name={selfName} size={56} />
                  {m.myTurn && (
                    <>
                      <div
                        className="absolute -inset-1.5 rounded-full pointer-events-none animate-pulse"
                        style={{ boxShadow: "0 0 0 3px #E6A11E, 0 0 14px 2px rgba(230,161,30,0.65)" }}
                        aria-hidden
                      />
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden>
                        <span
                          className="text-[8px] font-black uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full text-[#2B2118] whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg, #F7DA8B, #E6A11E)" }}
                        >
                          ▸ Your Turn
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white whitespace-nowrap"
                  style={{ background: "rgba(43,33,24,0.82)" }}
                >
                  {selfName} (you)
                </div>
              </div>
            </div>
          </UnoTableMat>
        </div>
      </div>

      {/* Bottom: hand fan + action row */}
      <div className="flex-shrink-0 px-4 pb-4">
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

        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="flex-1 max-w-md">
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
          </div>
          <UnoCallButton visible={m.canDeclareUno} onDeclare={m.declareUno} />
        </div>
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

      {/* Room rail — sheet variant (floating trigger, not a persistent
          sidebar) now that the table fills the full width, matching the
          reference's minimal chrome (hamburger + share icon only). */}
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

      {m.isChallengeTarget && m.pendingChallenge && (
        <WildDrawFourChallengePrompt
          playedByName={m.nameOf(m.pendingChallenge.playedById)}
          onAccept={m.acceptWildFourDraw}
          onChallenge={m.challengeWildFour}
        />
      )}

      {tut.open && (
        <GameTutorial
          slides={UNO_TUTORIAL.slides}
          storageKey={UNO_TUTORIAL.key}
          accent={UNO_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
  );
}
