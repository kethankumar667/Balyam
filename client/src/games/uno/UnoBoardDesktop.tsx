import { useEffect, useState } from "react";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
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
  UnoTimerBadge,
  computeSeatPosition,
  useUnoEventFlourish,
  useUnoHitReaction,
  resolveSeatPosition,
  UnoHitBadge,
} from "./uno-table";
import {
  UnoRoomCodePlate,
  UnoIvoryButton,
  UnoDeclareCluster,
  UnoPassButton,
  UnoNotebookPlaceholder,
  UnoHouseRulesBadge,
} from "./uno-scene";
import { UnoRoomRail } from "./uno-rail";
import { useUnoDealGate, UnoDealOverlay } from "./uno-deal";
import { UnoActionToast } from "./uno-action-toast";
import { UnoDeclareBubble } from "./uno-declare";
import { WildDrawFourChallengePrompt } from "./uno-challenge";
import UnoResultModal from "./UnoResultModal";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
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
  const activeHit = useUnoHitReaction(state.lastHit);
  // Drag-to-play: true while a hand card is mid-drag, so the discard pile
  // can show its "Drop to play" affordance. See uno-table.tsx's UnoHandFan.
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const opponents = state.playerOrder.filter((id) => id !== selfId);
  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  /* ─── Sound + fullscreen header controls — ported from Rummy's own
     header buttons. Sound is the app-wide AudioManager mute (UNO has no
     Rummy-style per-game synth layer to toggle separately, just the
     shared AUDIO.* asset player useUnoBoard.ts already calls). ─── */
  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("any");
  }

  /* ─── Keyboard shortcuts — desktop only, matching Rummy's own scoping
     (RummyBoardMobile.tsx has no keydown handler; touch devices rarely
     have a physical keyboard). D draw, P pass, U declare UNO, Escape
     deselects/cancels the Wild colour picker. There's no "confirm play"
     shortcut because there's nothing left to confirm — tapping/dragging a
     card (or Tab+Enter on it, see uno-table.tsx) plays it directly. ─── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "d":
          if (m.canDraw) { e.preventDefault(); m.drawCard(); }
          break;
        case "p":
          if (m.canPassTurn) { e.preventDefault(); m.passTurn(); }
          break;
        case "u":
          if (m.canDeclareUno) { e.preventDefault(); m.declareUno(); }
          break;
        case "escape":
          e.preventDefault();
          m.setSelectedCard(null);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.canDraw, m.canPassTurn, m.canDeclareUno]);

  return (
    <div className="uno-wood-surface relative h-full flex flex-col overflow-hidden">
      {dealStage !== "idle" && (
        <UnoDealOverlay stage={dealStage} playerCount={state.playerOrder.length} />
      )}

      {/* topOffsetRem clears the room-code pill below, which centres itself
          in this same top-of-screen slot (see the header block further
          down) — without it the two fixed-position elements overlap. */}
      {/* active also covers isChallengeTarget: the player the server will
          forcibly resolve on timeout (UnoEngine.getTimeoutActor returns
          pendingChallenge.challengerId during a Wild+4 decision, not just
          the normal turnPlayerId) must see the same escalating warning a
          normal turn gets — previously only myTurn triggered it, so the
          challenge target could lose their Accept/Challenge window with
          zero warning it was coming. */}
      {state.turnDeadline && (
        <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn || m.isChallengeTarget} topOffsetRem={3.25} />
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

      {/* Top-left: leave + room-code plate + turn timer */}
      <div className="absolute top-3 left-3 z-30 flex items-start gap-2">
        <UnoIvoryButton shape="round" ariaLabel="Leave game" title="Leave" onClick={onLeave}>
          <span className="text-lg leading-none">←</span>
        </UnoIvoryButton>
        <div className="flex flex-col gap-2">
          <UnoRoomCodePlate code={roomCode} />
          <UnoHouseRulesBadge rules={state.activeHouseRules} />
          {state.turnDeadline && <UnoTimerBadge deadline={state.turnDeadline} myTurn={m.myTurn || m.isChallengeTarget} />}
        </div>
      </div>

      {/* Top-right: sound / fullscreen / help */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
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

      {/* Decorative asset-placeholder prop — the notebook reads as an
          intentional sketchy sticky-note (paperclip, pencils, dashed
          cream cover matches Bhalyam's established notebook motif), kept.
          Its polaroid sibling (UnoPolaroidPlaceholder) was removed from
          this render: a flat gray-checkered box labelled "Photo" reads as
          a broken/missing image to a real player, not a stylised prop —
          revisit by rendering it again once real art exists to replace it
          with, matching how every other reserved-but-undelivered
          illustration slot in this codebase degrades (nothing shown,
          not a placeholder shown). */}
      <div className="absolute bottom-3 left-4 z-20 hidden xl:block">
        <UnoNotebookPlaceholder />
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* The felt table */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 pt-16 pb-1">
        <div className="relative w-full" style={{ maxWidth: 1140, aspectRatio: "1.8" }}>
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

            {/* Self plate, anchored at the base of the felt */}
            <div className="absolute left-1/2 bottom-[3%] -translate-x-1/2 z-[3]">
              <div className="relative flex flex-col items-center">
                <UnoDeclareBubble declared={selfDeclared} />
                <UnoNamePlate name={selfName} isSelf isTurn={m.myTurn} />
              </div>
            </div>

            {/* Comedic "fired at" flourish — a badge pops over whoever a
                special-power card just hit (Skip/Draw Two/Draw Four/stack/
                Seven Swap/Zero Rotate/UNO catch). translateY(-135%) lifts
                it clear of the seat chip/self plate it's anchored to. */}
            {activeHit?.targetIds.map((tid) => {
              const pos = resolveSeatPosition(tid, selfId, opponents);
              if (!pos) return null;
              return (
                <div
                  key={`${tid}-${activeHit.kind}`}
                  className="absolute z-40"
                  style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -135%)" }}
                >
                  <UnoHitBadge hit={activeHit} />
                </div>
              );
            })}
          </UnoTableMat>

          {/* UNO! declare cluster — bottom-right of the felt, and Pass —
              centred just below the pile, above the self plate. Both
              moved onto the felt itself per live user reference (a
              hand-annotated screenshot): previously UNO sat pinned to the
              felt's right edge and Pass rendered as a full-width bar
              below the hand fan, disconnected from the table action the
              player is actually looking at. */}
          <div className="absolute z-30" style={{ left: "77%", top: "77%", transform: "translate(-50%,-50%)" }}>
            <UnoDeclareCluster visible={m.canDeclareUno} onDeclare={m.declareUno} />
          </div>
          <div className="absolute z-30" style={{ left: "50%", top: "80%", transform: "translate(-50%,-50%)" }}>
            <UnoPassButton visible={m.myTurn && m.drewThisTurn && state.phase === "playing"} canPass={m.canPassTurn} onPass={m.passTurn} />
          </div>
        </div>
      </div>

      {/* Bottom: own hand fan. Pass and UNO! now live on the felt itself
          (see the on-felt UnoPassButton/UnoDeclareCluster above), matching
          the live reference — this row is hand + keyboard hint only. */}
      <div className="flex-shrink-0 px-4 pb-3 -mt-1">
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

        <div className="flex items-center justify-end gap-3 mt-2">
          <div className="hidden lg:block text-[10px] font-mono text-[#E9C892]/70 italic whitespace-nowrap">
            D draw · P pass · U declare · Esc cancel
          </div>
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
        round={state.round}
        targetScore={state.targetScore}
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
