import { useEffect, useState } from "react";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import { ActionBar } from "./uno-shared";
import { useAudio } from "../../hooks/useAudio";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  onFullscreenChange,
} from "../../lib/fullscreen";
import {
  UnoTableMat,
  UnoDirectionArc,
  UnoTableCenter,
  UnoPlayerChip,
  UnoNamePlate,
  UnoHandFan,
  computeSeatPosition,
  useUnoEventFlourish,
} from "./uno-table";
import { UnoRoomCodePlate, UnoIvoryButton, UnoDeclareCluster } from "./uno-scene";
import { UnoRoomRail } from "./uno-rail";
import { useUnoDealGate, UnoDealOverlay } from "./uno-deal";
import { UnoActionToast } from "./uno-action-toast";
import { UnoDeclareBubble } from "./uno-declare";
import { WildDrawFourChallengePrompt } from "./uno-challenge";
import UnoResultModal from "./UnoResultModal";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
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
  // Drag-to-play: true while a hand card is mid-drag, so the discard pile
  // can show its "Drop to play" affordance. See uno-table.tsx's UnoHandFan.
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const directionLabel = state.direction === -1 ? "Counter-clockwise" : "Clockwise";
  const turnLabel = m.myTurn ? `Your Turn · ${directionLabel}` : `${m.currentPlayer}'s Turn · ${directionLabel}`;
  const opponents = state.playerOrder.filter((id) => id !== selfId);
  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  /* ─── Sound + fullscreen header controls — same global toggles as
     desktop. No keyboard shortcuts here, matching Rummy's own scoping:
     RummyBoardMobile.tsx has no keydown handler either, since touch
     devices rarely have a physical keyboard attached. ─── */
  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("any");
  }

  return (
    <div className="uno-wood-surface relative h-full flex flex-col overflow-hidden">
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

      {/* Header — wood chrome matching the desktop scene */}
      <div className="flex-shrink-0 px-3 py-2 space-y-2 border-b border-[#5c3a1e]">
        <div className="flex items-center justify-between gap-2">
          <UnoIvoryButton shape="round" ariaLabel="Leave game" title="Leave" onClick={onLeave}>
            <span className="text-base leading-none">←</span>
          </UnoIvoryButton>
          <UnoRoomCodePlate code={roomCode} compact />
          <div className="flex items-center gap-1.5">
            <UnoIvoryButton
              shape="round"
              ariaLabel={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
              title="Sound"
              onClick={toggleMute}
            >
              {audioSettings.isMuted ? "🔇" : "🔊"}
            </UnoIvoryButton>
            <UnoIvoryButton
              shape="round"
              ariaLabel={isFs ? "Exit fullscreen" : "Enter fullscreen"}
              title="Fullscreen"
              onClick={toggleFullscreen}
            >
              ⛶
            </UnoIvoryButton>
            <UnoIvoryButton shape="round" ariaLabel="How to play" title="How to play" onClick={() => tut.setOpen(true)}>
              <span className="font-black">?</span>
            </UnoIvoryButton>
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide"
          style={
            m.myTurn
              ? { background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", color: "#3a2410" }
              : { background: "rgba(0,0,0,0.28)", color: "#F0DDB4", border: "1px solid rgba(233,200,146,0.35)" }
          }
        >
          <span className="truncate">{turnLabel}</span>
          {/* topOffsetRem clears this two-row header — the warning chip is
              position:fixed, so DOM nesting alone won't offset it. */}
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
        <div className="relative w-full mx-auto" style={{ maxWidth: 480, aspectRatio: "1.12" }}>
          <UnoTableMat>
            <UnoDirectionArc direction={state.direction} flourish={flourish !== null} />

            {opponents.map((id, i) => {
              const pos = computeSeatPosition(i, opponents.length);
              return (
                <div
                  key={id}
                  className="absolute z-[2]"
                  style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}
                >
                  <UnoPlayerChip
                    name={m.nameOf(id)}
                    handSize={state.handSizes[id] ?? 0}
                    isTurn={state.turnPlayerId === id}
                    fanDir={pos.fanDir}
                    canCatch={m.catchableOpponents.includes(id)}
                    onCatch={() => m.catchUno(id)}
                    compact={opponents.length >= 3}
                    isConnected={players.find((p) => p.id === id)?.isConnected}
                  />
                </div>
              );
            })}

            <div className="absolute inset-0 flex items-center justify-center z-[2]">
              <UnoTableCenter
                topCard={state.topCard}
                currentColor={state.currentColor}
                deckCount={state.deckCount}
                isDragging={isDraggingCard}
                canDraw={m.canDraw}
                onDraw={m.drawCard}
              />
            </div>

            <div className="absolute left-1/2 bottom-[3%] -translate-x-1/2 z-[3]">
              <div className="relative flex flex-col items-center">
                <UnoDeclareBubble declared={selfDeclared} />
                <UnoNamePlate name={selfName} isSelf isTurn={m.myTurn} />
              </div>
            </div>
          </UnoTableMat>
        </div>

        {/* UNO declare button — centred above the hand, not a floating
            corner button anymore. It used to sit fixed bottom-left, easy to
            miss and awkward to reach; right above the cards is exactly
            where the player is already looking once their hand gets down
            to one. */}
        <div className="flex justify-center">
          <UnoDeclareCluster visible={m.canDeclareUno} onDeclare={m.declareUno} />
        </div>

        {/* Full-width card fan */}
        <UnoHandFan
          sortedHand={m.sortedHand}
          validMoveIds={m.validMoveIds}
          selectedCardId={m.selectedCardId}
          myTurn={m.myTurn}
          phase={state.phase}
          onSelectCard={m.dropCardOnDiscard}
          needsColorChoice={m.needsColorChoice}
          selectedWildColor={m.selectedWildColor}
          onPickColor={m.pickColorAndPlay}
          onDropOnDiscard={m.dropCardOnDiscard}
          onDragStateChange={setIsDraggingCard}
        />

        {/* Action bar pinned to the bottom of the scroll area */}
        {m.myTurn && state.phase === "playing" && (
          <div className="sticky bottom-0 z-20 -mx-1 px-1 pt-2 pb-2 bg-gradient-to-t from-[#2a190d] via-[#2a190d]/95 to-transparent">
            <ActionBar
              passTurn={m.passTurn}
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
