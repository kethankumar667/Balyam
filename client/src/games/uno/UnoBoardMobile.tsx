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
  useUnoHitReaction,
  resolveSeatPosition,
  UnoHitBadge,
} from "./uno-table";
import { UnoRoomCodePlate, UnoIvoryButton, UnoDeclareCluster, UnoHouseRulesBadge } from "./uno-scene";
import { UnoRoomRail } from "./uno-rail";
import { UnoDealOverlay } from "./uno-deal";
import {
  useOrientationReport,
  useUnoRotationGate,
  UnoRotateDevicePrompt,
  UnoWaitingForPlayersBanner,
} from "./rotation-sync";
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
import { RevengeDrawFour } from "../../animations/card/RevengeDrawFour";
import { UnoPoliceBust } from "../../animations/card/UnoPoliceBust";
import { Draw20TruckAttack } from "../../animations/card/Draw20TruckAttack";
import { CardEvolutionSwap } from "../../animations/card/CardEvolutionSwap";
import { useJumpInDuel } from "../../animations/card/useJumpInDuel";
import { CardDuelJumpIn } from "../../animations/card/CardDuelJumpIn";
import { useComboCounter } from "../../animations/card/useComboCounter";
import { ComboReaction } from "../../animations/card/ComboReaction";
import { useLastCardTension } from "../../animations/card/useLastCardTension";
import { LastCardTension } from "../../animations/card/LastCardTension";
import { useFakeCelebration } from "../../animations/card/useFakeCelebration";
import { FakeCelebration } from "../../animations/card/FakeCelebration";
import { ColorChangeBalloon } from "../../animations/card/ColorChangeBalloon";
import type { FeltAnchor } from "../../animations/helpers/types";

/** The pile sits at the felt's visual centre — see UnoBoardDesktop.tsx's
 *  matching constant. */
const PILE_ANCHOR: FeltAnchor = { left: "50%", top: "50%" };

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
  const { history, champion } = props;
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  // Mobile portrait detection — UNO now locks landscape, matching Rummy
  // (see rotation-sync.tsx for the full synchronized-gate rationale).
  // Declared before the gate call below, which needs this value (not the
  // server-echoed one) for the LOCAL player specifically.
  const needsLandscape = useOrientationReport();
  const gate = useUnoRotationGate({
    roomCode,
    phase: state.phase,
    players,
    selfId,
    selfNeedsRotation: needsLandscape,
  });
  const flourish = useUnoEventFlourish(state.lastAction);
  const activeHit = useUnoHitReaction(state.lastHit);
  // Drag-to-play: true while a hand card is mid-drag, so the discard pile
  // can show its "Drop to play" affordance. See uno-table.tsx's UnoHandFan.
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const directionLabel = state.direction === -1 ? "Counter-clockwise" : "Clockwise";
  const turnLabel = m.myTurn ? `Your Turn · ${directionLabel}` : `${m.currentPlayer}'s Turn · ${directionLabel}`;
  const opponents = state.playerOrder.filter((id) => id !== selfId);
  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  // ── Animation system — see UnoBoardDesktop.tsx's matching block for
  // the full rationale; identical wiring, mobile just uses smaller
  // shake/recoil intensity (screen real estate is tighter, per
  // AGENTS.md §6.1).
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
    shake({ disabled: animConfig.reducedMotion, intensity: 4 });
    punch({ disabled: animConfig.reducedMotion });
    triggerWobble(targetId);
  };
  const handleMeteorImpact = (targetId: string) => {
    recoil({ disabled: animConfig.reducedMotion, intensity: 9 });
    triggerWobble(targetId);
  };
  const handleSkipImpact = (targetId: string) => triggerWobble(targetId);
  const slipperHit = activeHit?.kind === "draw2" ? activeHit : null;
  const slipperTargetId = slipperHit?.targetIds[0] ?? null;
  const slipperTargetPos = slipperTargetId ? resolveSeatPosition(slipperTargetId, selfId, opponents) : null;
  const draw4Hit = activeHit?.kind === "draw4" ? activeHit : null;
  const draw4TargetId = draw4Hit?.targetIds[0] ?? null;
  const draw4TargetPos = draw4TargetId ? resolveSeatPosition(draw4TargetId, selfId, opponents) : null;
  const isRevenge = draw4Hit != null && state.lastAction != null && state.lastAction.includes("challenged and lost");
  const isPoliceBust = draw4Hit != null && state.lastAction != null && state.lastAction.includes("challenged successfully");
  const meteorHit = draw4Hit && !isRevenge && !isPoliceBust ? draw4Hit : null;
  const meteorTargetId = draw4TargetId;
  const meteorTargetPos = draw4TargetPos;
  const revengeHit = isRevenge ? draw4Hit : null;
  const policeHit = isPoliceBust ? draw4Hit : null;
  const skipHit = activeHit?.kind === "skip" ? activeHit : null;
  const skipTargetId = skipHit?.targetIds[0] ?? null;
  const skipTargetPos = skipTargetId ? resolveSeatPosition(skipTargetId, selfId, opponents) : null;
  const reverseTrigger = useReverseFlip(flourish, animConfig, tilt);
  const pileWobble = usePlayerWobble(reverseTrigger, "");
  const wildEvent = useWildColorSplash(state.lastAction, state.currentColor);
  const unoCallEvent = useUnoCallCelebration(state.unoDeclaredBy);
  const unoCallPos = unoCallEvent ? resolveSeatPosition(unoCallEvent.playerId, selfId, opponents) : null;
  const catchHit = activeHit?.kind === "catch" ? activeHit : null;
  const catchTargetId = catchHit?.targetIds[0] ?? null;
  const catchTargetPos = catchTargetId ? resolveSeatPosition(catchTargetId, selfId, opponents) : null;
  const stackHitRaw = activeHit?.kind === "stack" ? activeHit : null;
  const isBigStack = (stackHitRaw?.count ?? 0) >= 8;
  const stackHit = stackHitRaw && !isBigStack ? stackHitRaw : null;
  const truckHit = stackHitRaw && isBigStack ? stackHitRaw : null;
  const stackTargetId = stackHitRaw?.targetIds[0] ?? null;
  const stackTargetPos = stackTargetId ? resolveSeatPosition(stackTargetId, selfId, opponents) : null;
  const handleStackImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: 5 });
    triggerWobble(targetId);
  };
  const swapHit = activeHit?.kind === "swap" ? activeHit : null;
  const swapTargetAnchors = swapHit
    ? swapHit.targetIds
        .map((tid) => resolveSeatPosition(tid, selfId, opponents))
        .filter((p): p is NonNullable<typeof p> => p != null)
    : [];
  const duelTrigger = useJumpInDuel(state.lastAction);
  const comboEvent = useComboCounter(state.lastHit);
  const lastCardEvent = useLastCardTension(state.handSizes);
  const lastCardPos = lastCardEvent ? resolveSeatPosition(lastCardEvent.playerId, selfId, opponents) : null;
  const fakeCelebEvent = useFakeCelebration(state.unoDeclaredBy);
  const fakeCelebPos = fakeCelebEvent ? resolveSeatPosition(fakeCelebEvent.playerId, selfId, opponents) : null;

  /* ─── Sound + fullscreen header controls — same global toggles as
     desktop. No keyboard shortcuts here, matching Rummy's own scoping:
     RummyBoardMobile.tsx has no keydown handler either, since touch
     devices rarely have a physical keyboard attached. ─── */
  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("landscape");
  }

  return (
    <div className="uno-wood-surface relative h-full flex flex-col overflow-hidden">
      {/* Three cases, same priority order as Rummy's mobile shell:
           1. needsLandscape  → UnoRotateDevicePrompt blocks the board.
           2. !needsLandscape + gating → UnoWaitingForPlayersBanner (we're
              ready, someone else isn't).
           3. shuffle/deal → the animated deal opener. */}
      {needsLandscape && (
        <UnoRotateDevicePrompt
          readiness={gate.stage === "gating" ? { readyCount: gate.readyCount, totalCount: gate.totalCount } : undefined}
        />
      )}
      {gate.stage === "gating" && !needsLandscape && (
        <UnoWaitingForPlayersBanner blockers={gate.blockers} showNames={gate.showBlockerNames} variant="overlay" />
      )}
      {(gate.stage === "shuffle" || gate.stage === "deal") && (
        <UnoDealOverlay stage={gate.stage} playerCount={state.playerOrder.length} />
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
        {Object.values(state.activeHouseRules).some(Boolean) && (
          <div className="flex justify-center">
            <UnoHouseRulesBadge rules={state.activeHouseRules} compact />
          </div>
        )}
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
          {/* active also covers isChallengeTarget — see UnoBoardDesktop.tsx's
              matching comment: the player the server resolves on timeout
              during a Wild+4 decision must see the same warning a normal
              turn gets, not just whoever holds turnPlayerId. */}
          {state.turnDeadline && (
            <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn || m.isChallengeTarget} topOffsetRem={5.5} />
          )}
        </div>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Scrollable body — the sticky action bar below sticks to the bottom
          of THIS container, not the page (the page itself no longer scrolls,
          see Room.tsx's uno full-bleed shell). */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {/* The table — same oval mat as desktop, scaled to fit one column.
            Width-only caps (480 phone / 560 landscape phone-and-up / 680
            tablet) used to be the whole story, but on a landscape phone
            HEIGHT is the tight dimension, not width: at a typical ~390px
            landscape viewport the 560px tier rendered a ~500px-tall table
            that alone blew past the ~300px this scroll area actually has,
            pushing the hand fan (and the sticky Pass button below it)
            almost entirely off-screen — the exact "can't arrange my cards"
            complaint. The height term reserves header (~89px) + this
            container's own py-3 (24px) + the hand fan's fixed 8rem row
            (128px, see UnoHandFan in uno-table.tsx) + the space-y-3 gaps
            between the table/declare-row/hand-fan (36px) ≈ 277px, so the
            table shrinks to whatever's left instead of assuming landscape
            phones have as much vertical room as portrait ones (same
            reasoning as LudoBoardMobile.tsx's own vh-aware cap).
            The clamp() floor (314px) stops it shrinking past the point
            where opponent seats (UnoPlayerChip, ~58px, fixed size — it
            doesn't scale down with the table) start overlapping the pile
            (UnoTableCenter, ~140×96px, also fixed) — computeSeatPosition's
            42/46% radius needs a real table to place them around, and on
            the shortest phones this floor means a little scrolling to
            reach the hand remains, which beats a table with the opponents'
            names and card counts unreadably stacked on top of the pile. */}
        <div
          ref={cameraRef}
          className="relative mx-auto"
          style={{ aspectRatio: "1.12", width: "clamp(314px, min(92vw, calc((100vh - 277px) * 1.12)), 680px)" }}
        >
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
                      compact={opponents.length >= 3}
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

              <animated.div
                className="absolute left-1/2 bottom-[3%] z-[3]"
                style={{ transform: wobbleTargetId === selfId ? wobble.transform : "translateX(-50%)" }}
              >
                <div className="relative flex flex-col items-center">
                  <UnoDeclareBubble declared={selfDeclared} />
                  <UnoNamePlate name={selfName} isSelf isTurn={m.myTurn} />
                </div>
              </animated.div>

              {/* Comedic "fired at" flourish — every hit kind now has
                  its own cinematic except Zero Rotate, which still gets
                  the plain badge pop; see UnoBoardDesktop.tsx's matching
                  block for the full rationale. */}
              {slipperHit && slipperTargetPos && (
                <PlusTwoFlyingSlippers
                  key={`${slipperTargetId}-draw2-${slipperHit.count}`}
                  count={slipperHit.count ?? 2}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={slipperTargetPos}
                  config={animConfig}
                  onImpact={() => slipperTargetId && handleSlipperImpact(slipperTargetId)}
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
              {revengeHit && draw4TargetPos && (
                <RevengeDrawFour
                  key={`${draw4TargetId}-revenge-${revengeHit.count}`}
                  count={revengeHit.count ?? 6}
                  originAnchor={PILE_ANCHOR}
                  targetAnchor={draw4TargetPos}
                  config={animConfig}
                  onImpact={() => draw4TargetId && handleMeteorImpact(draw4TargetId)}
                  onComplete={() => {}}
                />
              )}
              {policeHit && draw4TargetPos && (
                <UnoPoliceBust
                  key={`${draw4TargetId}-police-${policeHit.count}`}
                  count={policeHit.count ?? 4}
                  targetAnchor={draw4TargetPos}
                  config={animConfig}
                  onImpact={() => draw4TargetId && triggerWobble(draw4TargetId)}
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
              {truckHit && stackTargetPos && (
                <Draw20TruckAttack
                  key={`${stackTargetId}-truck-${truckHit.count}`}
                  count={truckHit.count ?? 8}
                  targetAnchor={stackTargetPos}
                  config={animConfig}
                  onImpact={() => stackTargetId && handleStackImpact(stackTargetId)}
                  onComplete={() => {}}
                />
              )}
              {swapHit && swapTargetAnchors.length === 2 && (
                <CardEvolutionSwap
                  key={`swap-${swapHit.targetIds.join(",")}`}
                  targetAnchors={swapTargetAnchors}
                  config={animConfig}
                  onComplete={() => {}}
                />
              )}
              {activeHit &&
                activeHit.kind !== "draw2" &&
                activeHit.kind !== "draw4" &&
                activeHit.kind !== "skip" &&
                activeHit.kind !== "catch" &&
                activeHit.kind !== "stack" &&
                activeHit.kind !== "swap" &&
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
              {wildEvent && (
                <ColorChangeBalloon
                  key={`balloon-${wildEvent.key}`}
                  event={wildEvent}
                  anchor={PILE_ANCHOR}
                  config={animConfig}
                  onComplete={() => {}}
                />
              )}
              {duelTrigger && (
                <CardDuelJumpIn key={duelTrigger} anchor={PILE_ANCHOR} config={animConfig} onComplete={() => {}} />
              )}
              {comboEvent && (
                <ComboReaction key={comboEvent.key} count={comboEvent.count} config={animConfig} onComplete={() => {}} />
              )}
              {lastCardEvent && lastCardPos && (
                <LastCardTension key={lastCardEvent.key} anchor={lastCardPos} config={animConfig} onComplete={() => {}} />
              )}
              {fakeCelebEvent && fakeCelebPos && (
                <FakeCelebration key={fakeCelebEvent.key} anchor={fakeCelebPos} config={animConfig} onComplete={() => {}} />
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
            </UnoTableMat>
          </animated.div>
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
        density="mobile"
        players={players}
        selfId={selfId}
        messages={messages}
        playerOrder={state.playerOrder}
        turnPlayerId={state.turnPlayerId}
        scores={state.scores}
        round={state.round}
        targetScore={state.targetScore}
        history={history}
        champion={champion}
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
