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
import { animated } from "@react-spring/web";
import { useAnimationConfig } from "../../animations/helpers/useAnimationConfig";
import { useTableCamera } from "../../animations/camera/useTableCamera";
import { useScreenRecoil } from "../../animations/camera/useScreenRecoil";
import { usePlayerWobble } from "../../animations/player/usePlayerWobble";
import { PlusTwoFlyingSlippers } from "../../animations/card/PlusTwoFlyingSlippers";
import { DrawFourMeteorStrike } from "../../animations/card/DrawFourMeteorStrike";
import { SkipBananaPeel } from "../../animations/card/SkipBananaPeel";
import { useReverseFlip } from "../../animations/card/useReverseFlip";
import { useWildColorSplash } from "../../animations/card/useWildColorSplash";
import { WildColorSplash } from "../../animations/card/WildColorSplash";
import { useUnoCallCelebration } from "../../animations/card/useUnoCallCelebration";
import { UnoCallCelebration } from "../../animations/card/UnoCallCelebration";
import { ForgotUnoCallout } from "../../animations/card/ForgotUnoCallout";
import { StackAttack } from "../../animations/card/StackAttack";
import type { FeltAnchor } from "../../animations/helpers/types";

/** The pile sits at the felt's visual centre — `UnoTableCenter`'s wrapper
 *  below is `inset-0 flex items-center justify-center`. Shared anchor for
 *  every "thrown from the pile" animation. */
const PILE_ANCHOR: FeltAnchor = { left: "50%", top: "50%" };

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

  // ── Animation system (client/src/animations/) ─────────────────────
  // `useTableCamera` (GSAP shake/punch) attaches to the outer felt
  // wrapper below; `useScreenRecoil` (React Spring) attaches to a
  // SEPARATE, inner wrapper around `UnoTableMat` — two concentric
  // layers by construction, so the two camera systems (each owned by a
  // different animation per the guide) can never fight over the same
  // DOM node's transform.
  const animConfig = useAnimationConfig();
  const { cameraRef, shake, punch, tilt } = useTableCamera();
  const { recoilRef, recoilStyle, recoil } = useScreenRecoil();
  const [wobbleKey, setWobbleKey] = useState<string | null>(null);
  const [wobbleTargetId, setWobbleTargetId] = useState<string | null>(null);
  const wobbleBaseTransform = wobbleTargetId === selfId ? "translateX(-50%)" : "translate(-50%, -50%)";
  const wobble = usePlayerWobble(wobbleKey, wobbleBaseTransform);
  const triggerWobble = (targetId: string) => {
    setWobbleTargetId(targetId);
    setWobbleKey(`${targetId}-${Date.now()}`);
  };
  const handleSlipperImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: animConfig.mobileMode ? 4 : 6 });
    punch({ disabled: animConfig.reducedMotion });
    triggerWobble(targetId);
  };
  const handleMeteorImpact = (targetId: string) => {
    recoil({ disabled: animConfig.reducedMotion, intensity: animConfig.mobileMode ? 9 : 14 });
    triggerWobble(targetId);
  };
  // Skip has no camera-library assignment in the guide (a lesser
  // penalty than +2/+4) — just the seat-chip wobble.
  const handleSkipImpact = (targetId: string) => triggerWobble(targetId);
  // "+2 Flying Slippers"/"+4 Meteor Strike"/"Skip Banana Peel"
  // (animations/card/) replace the plain UnoHitBadge for draw2/draw4/
  // skip — every other hit kind still uses the badge until its own
  // cinematic is built.
  const slipperHit = activeHit?.kind === "draw2" ? activeHit : null;
  const slipperTargetId = slipperHit?.targetIds[0] ?? null;
  const slipperTargetPos = slipperTargetId ? resolveSeatPosition(slipperTargetId, selfId, opponents) : null;
  const meteorHit = activeHit?.kind === "draw4" ? activeHit : null;
  const meteorTargetId = meteorHit?.targetIds[0] ?? null;
  const meteorTargetPos = meteorTargetId ? resolveSeatPosition(meteorTargetId, selfId, opponents) : null;
  const skipHit = activeHit?.kind === "skip" ? activeHit : null;
  const skipTargetId = skipHit?.targetIds[0] ?? null;
  const skipTargetPos = skipTargetId ? resolveSeatPosition(skipTargetId, selfId, opponents) : null;
  // Reverse — table-wide, no seat target. `pileWobble` reuses
  // `usePlayerWobble`'s physics on the pile wrapper (see
  // useReverseFlip.ts's header comment for why this is a deliberate
  // reuse, not a new hook).
  const reverseTrigger = useReverseFlip(flourish, animConfig, tilt);
  const pileWobble = usePlayerWobble(reverseTrigger, "");
  // Wild Card colour splash — also table-wide.
  const wildEvent = useWildColorSplash(state.lastAction, state.currentColor);
  // UNO Call — table-wide (self or any opponent).
  const unoCallEvent = useUnoCallCelebration(state.unoDeclaredBy);
  const unoCallPos = unoCallEvent ? resolveSeatPosition(unoCallEvent.playerId, selfId, opponents) : null;
  // Forgot UNO / Stack Attack — per-target, same pattern as +2/+4/Skip.
  const catchHit = activeHit?.kind === "catch" ? activeHit : null;
  const catchTargetId = catchHit?.targetIds[0] ?? null;
  const catchTargetPos = catchTargetId ? resolveSeatPosition(catchTargetId, selfId, opponents) : null;
  const stackHit = activeHit?.kind === "stack" ? activeHit : null;
  const stackTargetId = stackHit?.targetIds[0] ?? null;
  const stackTargetPos = stackTargetId ? resolveSeatPosition(stackTargetId, selfId, opponents) : null;
  const handleStackImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: animConfig.mobileMode ? 5 : 7 });
    triggerWobble(targetId);
  };

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
        <div ref={cameraRef} className="relative w-full" style={{ maxWidth: 1140, aspectRatio: "1.8" }}>
          <animated.div ref={recoilRef} className="relative w-full h-full" style={recoilStyle}>
            <UnoTableMat>
              <UnoDirectionArc direction={state.direction} flourish={flourish !== null} spinTrigger={reverseTrigger} />

              {opponents.map((id, i) => {
                const pos = computeSeatPosition(i, opponents.length);
                return (
                  <animated.div
                    key={id}
                    className="absolute z-[2]"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: wobbleTargetId === id ? wobble.transform : "translate(-50%, -50%)",
                    }}
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
                  </animated.div>
                );
              })}

              <animated.div
                className="absolute inset-0 flex items-center justify-center z-[2]"
                style={{ transform: pileWobble.transform }}
              >
                <UnoTableCenter
                  topCard={state.topCard}
                  currentColor={state.currentColor}
                  deckCount={state.deckCount}
                  isDragging={isDraggingCard}
                  canDraw={m.canDraw}
                  onDraw={m.drawCard}
                />
              </animated.div>

              {/* Self plate, anchored at the base of the felt */}
              <animated.div
                className="absolute left-1/2 bottom-[3%] z-[3]"
                style={{ transform: wobbleTargetId === selfId ? wobble.transform : "translateX(-50%)" }}
              >
                <div className="relative flex flex-col items-center">
                  <UnoDeclareBubble declared={selfDeclared} />
                  <UnoNamePlate name={selfName} isSelf isTurn={m.myTurn} />
                </div>
              </animated.div>

              {/* Comedic "fired at" flourish — draw2/draw4 get full
                  cinematics (animations/card/); every other kind (Skip/
                  stack/Seven Swap/Zero Rotate/UNO catch) still gets the
                  plain badge pop until its own animation is built.
                  translateY(-135%) lifts the badge clear of the seat
                  chip/self plate it's anchored to. */}
              {slipperHit && slipperTargetPos && (
                <PlusTwoFlyingSlippers
                  key={`${slipperTargetId}-draw2-${slipperHit.count}`}
                  count={slipperHit.count ?? 2}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={slipperTargetPos}
                  config={animConfig}
                  onImpact={() => slipperTargetId && handleSlipperImpact(slipperTargetId)}
                  // The board doesn't need to react to sequence-end — the
                  // hit itself auto-clears via useUnoHitReaction's own
                  // per-kind hold timer (HIT_HOLD_MS.draw2), sized to
                  // outlast this animation's internal timeline.
                  onComplete={() => {}}
                />
              )}
              {meteorHit && meteorTargetPos && (
                <DrawFourMeteorStrike
                  key={`${meteorTargetId}-draw4-${meteorHit.count}`}
                  count={meteorHit.count ?? 4}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={meteorTargetPos}
                  config={animConfig}
                  onImpact={() => meteorTargetId && handleMeteorImpact(meteorTargetId)}
                  onComplete={() => {}}
                />
              )}
              {skipHit && skipTargetPos && (
                <SkipBananaPeel
                  key={`${skipTargetId}-skip-${skipHit.targetIds.join(",")}`}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={skipTargetPos}
                  config={animConfig}
                  onImpact={() => skipTargetId && handleSkipImpact(skipTargetId)}
                  onComplete={() => {}}
                />
              )}
              {catchHit && catchTargetPos && (
                <ForgotUnoCallout
                  key={`${catchTargetId}-catch-${catchHit.count}`}
                  count={catchHit.count ?? 2}
                  targetAnchor={catchTargetPos}
                  config={animConfig}
                  onImpact={() => catchTargetId && triggerWobble(catchTargetId)}
                  onComplete={() => {}}
                />
              )}
              {stackHit && stackTargetPos && (
                <StackAttack
                  key={`${stackTargetId}-stack-${stackHit.count}`}
                  count={stackHit.count ?? 4}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={stackTargetPos}
                  config={animConfig}
                  onImpact={() => stackTargetId && handleStackImpact(stackTargetId)}
                  onComplete={() => {}}
                />
              )}
              {activeHit &&
                activeHit.kind !== "draw2" &&
                activeHit.kind !== "draw4" &&
                activeHit.kind !== "skip" &&
                activeHit.kind !== "catch" &&
                activeHit.kind !== "stack" &&
                activeHit.targetIds.map((tid) => {
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
              {wildEvent && (
                <WildColorSplash
                  key={wildEvent.key}
                  event={wildEvent}
                  anchor={PILE_ANCHOR}
                  config={animConfig}
                  onComplete={() => {}}
                />
              )}
              {unoCallEvent && unoCallPos && (
                <UnoCallCelebration
                  key={unoCallEvent.key}
                  anchor={unoCallPos}
                  isSelf={unoCallEvent.playerId === selfId}
                  config={animConfig}
                  onComplete={() => {}}
                />
              )}
              {wildEvent && (
                <WildColorSplash
                  key={wildEvent.key}
                  event={wildEvent}
                  anchor={PILE_ANCHOR}
                  config={animConfig}
                  onComplete={() => {}}
                />
              )}
            </UnoTableMat>
          </animated.div>

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
