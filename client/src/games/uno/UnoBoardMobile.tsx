import { useEffect, useRef, useState } from "react";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import { ActionBar } from "./uno-shared";
import { useAudio } from "../../hooks/useAudio";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  onFullscreenChange,
} from "../../lib/fullscreen";
import { UnoHandFan, useUnoEventFlourish, useUnoHitReaction, UnoHitBadge } from "./uno-table";
import {
  computeStadiumSeating,
  computeSeatNumbers,
  computeStadiumPositions,
  stadiumSeatList,
  StadiumMat,
  StadiumDirectionArc,
  StadiumOpponentSeat,
  StadiumSelfPlate,
  StadiumPileCenter,
  StadiumRoomCodePlate,
  StadiumClassicModeBadge,
  StadiumHouseRulesBadge,
  StadiumIconButton,
  StadiumSettingsMenu,
  StadiumChatButton,
  StadiumUnoButton,
  StadiumTurnTimerPill,
} from "./uno-stadium";
import { UnoRoomRail, ReactionButton } from "./uno-rail";
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

/** The pile sits at the board area's visual centre. */
const PILE_ANCHOR: FeltAnchor = { left: "50%", top: "48%" };

/**
 * Touch-first UNO board — "stadium" redesign matching the max-players
 * mobile reference (dark-maroon FULL-BLEED composition: spotlight seat top-
 * centre, 3+3 side columns hugging the screen edges, self plate bottom-left
 * beside the hand fan). No fixed-aspect canvas and no internal scrolling —
 * the board area stretches to whatever space the viewport gives it (seat
 * anchors are percentages of the real container, like the reference's
 * edge-to-edge ellipse), while seat/pile contents scale from measured
 * container size so nothing collides on short landscape phones.
 * UnoBoardDesktop.tsx is untouched and keeps the separate wood-table look.
 */
export default function UnoBoardMobile(props: UnoBoardProps) {
  const { history, champion } = props;
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  // Mobile portrait detection — UNO locks landscape, matching Rummy (see
  // rotation-sync.tsx for the full synchronized-gate rationale).
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

  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  // ── Seating — maps playerOrder onto the reference's fixed grid. See
  // uno-stadium.tsx's computeStadiumSeating doc comment for the full
  // derivation (numbers/positions trace one clockwise lap from self).
  const seating = computeStadiumSeating(state.playerOrder, selfId);
  const seatNumbers = computeSeatNumbers(seating, selfId);
  const stadiumPositions = computeStadiumPositions(seating, selfId);
  const seatList = stadiumSeatList(seating);
  const selfSeatNumber = selfId ? seatNumbers[selfId] ?? 0 : 0;

  // ── Animation system — see UnoBoardDesktop.tsx's matching block for the
  // full rationale; identical wiring, only the seat-position lookups below
  // now read from `stadiumPositions` instead of uno-table.tsx's arc-based
  // resolveSeatPosition (that helper stays desktop-only).
  const animConfig = useAnimationConfig();
  const { cameraRef, shake, punch, tilt } = useTableCamera();
  const { recoilRef, recoilStyle, recoil } = useScreenRecoil();
  const [wobbleKey, setWobbleKey] = useState<string | null>(null);
  const [wobbleTargetId, setWobbleTargetId] = useState<string | null>(null);
  // Seat anchoring/centering now lives on a static OUTER wrapper per seat,
  // so the wobble spring only ever animates a plain (untranslated) inner
  // element — base transform is empty for every target.
  const wobble = usePlayerWobble(wobbleKey, "");
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
  const slipperTargetPos = slipperTargetId ? stadiumPositions[slipperTargetId] : undefined;
  const draw4Hit = activeHit?.kind === "draw4" ? activeHit : null;
  const draw4TargetId = draw4Hit?.targetIds[0] ?? null;
  const draw4TargetPos = draw4TargetId ? stadiumPositions[draw4TargetId] : undefined;
  const isRevenge = draw4Hit != null && state.lastAction != null && state.lastAction.includes("challenged and lost");
  const isPoliceBust = draw4Hit != null && state.lastAction != null && state.lastAction.includes("challenged successfully");
  const meteorHit = draw4Hit && !isRevenge && !isPoliceBust ? draw4Hit : null;
  const meteorTargetId = draw4TargetId;
  const meteorTargetPos = draw4TargetPos;
  const revengeHit = isRevenge ? draw4Hit : null;
  const policeHit = isPoliceBust ? draw4Hit : null;
  const skipHit = activeHit?.kind === "skip" ? activeHit : null;
  const skipTargetId = skipHit?.targetIds[0] ?? null;
  const skipTargetPos = skipTargetId ? stadiumPositions[skipTargetId] : undefined;
  const reverseTrigger = useReverseFlip(flourish, animConfig, tilt);
  const pileWobble = usePlayerWobble(reverseTrigger, "");
  const wildEvent = useWildColorSplash(state.lastAction, state.currentColor);
  const unoCallEvent = useUnoCallCelebration(state.unoDeclaredBy);
  const unoCallPos = unoCallEvent ? stadiumPositions[unoCallEvent.playerId] : undefined;
  const catchHit = activeHit?.kind === "catch" ? activeHit : null;
  const catchTargetId = catchHit?.targetIds[0] ?? null;
  const catchTargetPos = catchTargetId ? stadiumPositions[catchTargetId] : undefined;
  const stackHitRaw = activeHit?.kind === "stack" ? activeHit : null;
  const isBigStack = (stackHitRaw?.count ?? 0) >= 8;
  const stackHit = stackHitRaw && !isBigStack ? stackHitRaw : null;
  const truckHit = stackHitRaw && isBigStack ? stackHitRaw : null;
  const stackTargetId = stackHitRaw?.targetIds[0] ?? null;
  const stackTargetPos = stackTargetId ? stadiumPositions[stackTargetId] : undefined;
  const handleStackImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: 5 });
    triggerWobble(targetId);
  };
  const swapHit = activeHit?.kind === "swap" ? activeHit : null;
  const swapTargetAnchors = swapHit
    ? swapHit.targetIds
        .map((tid) => stadiumPositions[tid])
        .filter((p): p is NonNullable<typeof p> => p != null)
    : [];
  const duelTrigger = useJumpInDuel(state.lastAction);
  const comboEvent = useComboCounter(state.lastHit);
  const lastCardEvent = useLastCardTension(state.handSizes);
  const lastCardPos = lastCardEvent ? stadiumPositions[lastCardEvent.playerId] : undefined;
  const fakeCelebEvent = useFakeCelebration(state.unoDeclaredBy);
  const fakeCelebPos = fakeCelebEvent ? stadiumPositions[fakeCelebEvent.playerId] : undefined;

  /* ─── Sound + fullscreen header controls — same global toggles as
     desktop. No keyboard shortcuts here, matching Rummy's own scoping. ─── */
  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("landscape");
  }

  /* ─── Adaptive sizing — three independent, loop-free measurements:
     1. rootH (ResizeObserver on the shell) → fanScale: the hand fan
        shrinks on short viewports so board + fan + tagline always fit
        with ZERO scrolling (the previous canvas-scale + internal-scroll
        approach clipped the fan on short screens — the exact bug the
        live screenshot showed).
     2. board box (ResizeObserver on the flex-1 board area) → seatScale:
        seat/pile CONTENTS shrink when the leftover board area is small,
        while their percentage ANCHORS keep hugging the screen edges at
        every size — full-bleed like the reference, uncollided on phones.
     3. fanNaturalH (ResizeObserver on the fan's unscaled content) → the
        fan wrapper's reserved height, so the Wild colour picker appearing
        under the fan grows the reservation instead of clipping. */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fanInnerRef = useRef<HTMLDivElement | null>(null);
  const [rootH, setRootH] = useState(720);
  const [boardBox, setBoardBox] = useState({ w: 1280, h: 480 });
  const [fanNaturalH, setFanNaturalH] = useState(150);
  useEffect(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    const fan = fanInnerRef.current;
    if (!root || !board || !fan) return;
    const measure = () => {
      setRootH(root.clientHeight);
      setBoardBox({ w: board.clientWidth, h: board.clientHeight });
      setFanNaturalH(fan.offsetHeight || 150);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(board);
    ro.observe(fan);
    return () => ro.disconnect();
  }, []);
  const fanScale = Math.min(1.5, Math.max(0.55, rootH / 460));
  const seatScale = Math.min(1.2, Math.max(0.55, Math.min(boardBox.w / 1100, boardBox.h / 430)));
  const pileScale = Math.min(1.6, Math.max(0.6, Math.min(boardBox.w / 1000, boardBox.h / 430) * 1.45));
  const dense = seatScale < 0.7;
  // The urgent countdown (TurnTimeWarning's top-centre chip) and the
  // CLASSIC MODE badge both want the top-centre slot; yield it to the
  // time-critical one during its ≤10s window.
  const turnSecondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const warningActive = (m.myTurn || m.isChallengeTarget) && state.turnDeadline != null && turnSecondsLeft <= 10 && turnSecondsLeft > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-full flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 38%, #6b1c11 0%, #3a1009 45%, #1c0806 78%, #120403 100%)" }}
    >
      {/* Three cases, same priority order as Rummy's mobile shell:
           1. needsLandscape  → UnoRotateDevicePrompt blocks the board.
           2. !needsLandscape + gating → UnoWaitingForPlayersBanner.
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

      {/* Screen-reader-only turn announcement. */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.phase === "playing" ? (m.myTurn ? "Your turn" : `${m.currentPlayer}'s turn`) : ""}
      </div>

      {/* Header — one slim row; the classic-mode badge sits absolutely
          centred inside it (a second layout row would waste height, and
          floating it over the board collided with the spotlight seat). */}
      <div className="relative flex-shrink-0 px-3 pt-2 pb-1 flex items-center justify-between gap-2 z-20">
        {!warningActive && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mt-0.5">
            {Object.values(state.activeHouseRules).some(Boolean) ? (
              <StadiumHouseRulesBadge rules={state.activeHouseRules} />
            ) : (
              <StadiumClassicModeBadge />
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          <StadiumIconButton onClick={onLeave} ariaLabel="Leave game" title="Leave">
            <span className="text-base leading-none">←</span>
          </StadiumIconButton>
          <StadiumRoomCodePlate code={roomCode} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StadiumIconButton
            onClick={toggleMute}
            ariaLabel={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
            title="Sound"
          >
            {audioSettings.isMuted ? "🔇" : "🔊"}
          </StadiumIconButton>
          <StadiumSettingsMenu
            isFullscreen={isFs}
            onToggleFullscreen={toggleFullscreen}
            onOpenTutorial={() => tut.setOpen(true)}
          />
          <ReactionButton />
        </div>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Board area — full-bleed, fills all space between header and hand
          fan. Seats/pile/hit-animations are all percentage-anchored to
          THIS box, matching the reference's edge-to-edge composition. */}
      <div ref={cameraRef} className="flex-1 min-h-0 relative">
        <animated.div ref={recoilRef} className="relative w-full h-full" style={recoilStyle}>
          <div ref={boardRef} className="relative w-full h-full">
            <StadiumMat>
              <StadiumDirectionArc direction={state.direction} />

              {seatList.map(({ id, variant }) => {
                const pos = stadiumPositions[id];
                if (!pos) return null;
                const player = players.find((p) => p.id === id);
                return (
                  <div
                    key={id}
                    className="absolute z-[2]"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: `translate(-50%, -50%) scale(${seatScale})`,
                    }}
                  >
                    <animated.div style={{ transform: wobbleTargetId === id ? wobble.transform : "none" }}>
                      <StadiumOpponentSeat
                        name={m.nameOf(id)}
                        handSize={state.handSizes[id] ?? 0}
                        seatNumber={seatNumbers[id] ?? 0}
                        isHost={player?.isHost ?? false}
                        isTurn={state.turnPlayerId === id}
                        isConnected={player?.isConnected}
                        variant={variant}
                        dense={dense}
                        canCatch={m.catchableOpponents.includes(id)}
                        onCatch={() => m.catchUno(id)}
                      />
                    </animated.div>
                  </div>
                );
              })}

              <div
                className="absolute z-[2]"
                style={{ left: "50%", top: "48%", transform: `translate(-50%, -50%) scale(${pileScale})` }}
              >
                <animated.div style={{ transform: pileWobble.transform }}>
                  <StadiumPileCenter
                    topCard={state.topCard}
                    currentColor={state.currentColor}
                    deckCount={state.deckCount}
                    isDragging={isDraggingCard}
                    canDraw={m.canDraw}
                    onDraw={m.drawCard}
                  />
                </animated.div>
              </div>

              {/* Self plate — bottom-left beside the hand fan, like the
                  reference's "YOU / KETHAN" cluster. Left offset clears
                  the fixed chat/emoji rail in the corner. */}
              <div className="absolute z-[3]" style={{ left: 74, bottom: 2, transform: `scale(${seatScale})`, transformOrigin: "bottom left" }}>
                <animated.div style={{ transform: wobbleTargetId === selfId ? wobble.transform : "none" }}>
                  <div className="relative">
                    <UnoDeclareBubble declared={selfDeclared} />
                    <StadiumSelfPlate name={selfName} seatNumber={selfSeatNumber} handSize={m.sortedHand.length} isTurn={m.myTurn} />
                  </div>
                </animated.div>
              </div>

              {/* Pass button (rare, post-draw) — floats bottom-centre of
                  the board, just above the fan. */}
              {m.myTurn && state.phase === "playing" && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
                  <ActionBar passTurn={m.passTurn} canPassTurn={m.canPassTurn} drewThisTurn={m.drewThisTurn} />
                </div>
              )}

              {/* Comedic "fired at" flourish — every hit kind has its own
                  cinematic except Zero Rotate, which gets the plain badge
                  pop; see UnoBoardDesktop.tsx's matching block. */}
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
                  const pos = stadiumPositions[tid];
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
                <WildColorSplash key={wildEvent.key} event={wildEvent} anchor={PILE_ANCHOR} config={animConfig} onComplete={() => {}} />
              )}
              {wildEvent && (
                <ColorChangeBalloon key={`balloon-${wildEvent.key}`} event={wildEvent} anchor={PILE_ANCHOR} config={animConfig} onComplete={() => {}} />
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
            </StadiumMat>
          </div>
        </animated.div>
      </div>

      {/* Hand fan — fixed bottom block, downscaled on short viewports so
          it ALWAYS fits fully (reserved height tracks the fan's measured
          natural height × scale, so the Wild colour picker appearing
          never clips). */}
      <div className="relative flex-shrink-0 w-full z-10" style={{ height: fanNaturalH * fanScale }}>
        <div
          ref={fanInnerRef}
          className="absolute top-0 left-1/2"
          style={{ transform: `translateX(-50%) scale(${fanScale})`, transformOrigin: "top center" }}
        >
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
        </div>
      </div>

      {/* Tagline — reference's "— It's your turn. Play a card! —" footer. */}
      {state.phase === "playing" && (
        <p className="flex-shrink-0 pb-1 text-[11px] font-bold text-center px-2 z-10" style={{ color: "#F0DDB4" }}>
          {m.myTurn ? "— It's your turn. Play a card! —" : `${m.currentPlayer} is playing…`}
        </p>
      )}

      {/* Bottom-right HUD — persistent UNO declare button + turn timer. */}
      <div className="fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2">
        <StadiumUnoButton enabled={m.canDeclareUno} onDeclare={m.declareUno} />
        <StadiumTurnTimerPill deadline={state.turnDeadline} myTurn={m.myTurn} />
      </div>

      {/* Full-screen urgency pulse for the final ≤10s — see
          TurnTimeWarning.tsx. active also covers isChallengeTarget: the
          player the server resolves on timeout during a Wild+4 decision
          must see the same warning a normal turn gets. */}
      {state.turnDeadline && (
        <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn || m.isChallengeTarget} topOffsetRem={0.5} />
      )}

      {state.phase === "finished" && !m.scorecardDismissed && (
        <UnoResultModal state={state} players={players} selfId={selfId} onClose={m.dismissScorecard} onLeave={onLeave} />
      )}

      {/* Room rail — chat/voice/players/points/history sheet, with a
          bottom-left CHAT + EMOJI trigger pair matching the reference
          instead of the default bottom-right floating buttons (which
          UnoBoardDesktop.tsx's own UnoRoomRail call still uses). */}
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
        renderTriggers={(open, unread) => (
          <div className="fixed bottom-3 left-3 z-30 flex flex-col gap-2">
            <StadiumChatButton onClick={open} unread={unread} />
            <ReactionButton variant="square" />
          </div>
        )}
      />

      {tut.open && (
        <GameTutorial slides={UNO_TUTORIAL.slides} storageKey={UNO_TUTORIAL.key} accent={UNO_TUTORIAL.accent} onClose={() => tut.setOpen(false)} />
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
