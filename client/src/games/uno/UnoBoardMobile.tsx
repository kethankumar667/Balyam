import { useEffect, useRef, useState } from "react";
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

/** The pile sits at the felt's visual centre. */
const PILE_ANCHOR: FeltAnchor = { left: "50%", top: "48%" };

/** Reference size the stadium canvas (rings, seats, pile, every hit
 *  animation inside it) is laid out at, then uniformly scaled down to fit
 *  — see the scaling effect below for why. Wider than the old wood-table's
 *  480x428 reference: the reference mockup's 3-left/3-right column grid
 *  needs a landscape-proportioned canvas, matching this shell's existing
 *  landscape lock (useUnoRotationGate). */
const STADIUM_BASE_W = 660;
const STADIUM_BASE_H = 420;

/**
 * Touch-first UNO board — "stadium" redesign matching the max-players
 * mobile reference (dark-maroon grid seating: 1 spotlight top, 3+3 side
 * columns, self bottom-centre). See uno-stadium.tsx for the chrome this
 * shell is built from; UnoBoardDesktop.tsx is untouched and keeps the
 * separate wood-table look from uno-table.tsx/uno-scene.tsx.
 */
export default function UnoBoardMobile(props: UnoBoardProps) {
  const { history, champion } = props;
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  // Mobile portrait detection — UNO locks landscape, matching Rummy (see
  // rotation-sync.tsx for the full synchronized-gate rationale). Declared
  // before the gate call below, which needs this value (not the
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
  const selfPos = selfId ? stadiumPositions[selfId] : undefined;

  // ── Animation system — see UnoBoardDesktop.tsx's matching block for the
  // full rationale; identical wiring, only the seat-position lookups below
  // now read from `stadiumPositions` instead of uno-table.tsx's arc-based
  // resolveSeatPosition (that helper stays desktop-only).
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

  /* ─── Stadium scaling — fits the whole canvas (rings, seats, pile, every
     hit animation) into whatever vertical room is left below the header
     once the hand fan / tagline / action bar have taken theirs. A uniform
     CSS transform: scale() on the whole canvas (rendered internally at a
     constant STADIUM_BASE_W×STADIUM_BASE_H) keeps every seat's relative
     layout correct at any scale — same approach the previous wood-table
     shell used, see git history for the fixed-px-seat overlap this avoids.
     ResizeObserver on both the scroll area and the "rest" group below the
     canvas (whose height changes live as the action bar shows/hides) keeps
     this correct through every state change, not just window resizes. The
     0.5 floor stops it shrinking past legibility. */
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const restRef = useRef<HTMLDivElement | null>(null);
  const [tableScale, setTableScale] = useState(1);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const rest = restRef.current;
    if (!scroller || !rest) return;
    const compute = () => {
      const cs = getComputedStyle(scroller);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const gapY = parseFloat(cs.rowGap) || 0;
      const availableH = scroller.clientHeight - padY - rest.getBoundingClientRect().height - gapY;
      const availableW = scroller.clientWidth - padX;
      const scale = Math.min(1, availableH / STADIUM_BASE_H, availableW / STADIUM_BASE_W);
      setTableScale(Math.max(0.5, scale));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(scroller);
    ro.observe(rest);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="relative h-full flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #3a1410 0%, #1c0806 60%, #100302 100%)" }}
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

      {/* Header — room code, classic-mode/house-rules badge, icon rail. */}
      <div className="flex-shrink-0 px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
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
        <div className="flex justify-center">
          {Object.values(state.activeHouseRules).some(Boolean) ? (
            <StadiumHouseRulesBadge rules={state.activeHouseRules} />
          ) : (
            <StadiumClassicModeBadge />
          )}
        </div>
      </div>

      <UnoActionToast lastAction={state.lastAction} />

      {/* Scrollable body — the sticky action bar below sticks to the
          bottom of THIS container, not the page. Flex column so the
          stadium canvas and the "rest" group below it are each
          independently measurable for the scaling effect above. */}
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col items-center gap-2">
        <div
          ref={cameraRef}
          className="relative mx-auto flex-shrink-0"
          style={{ width: STADIUM_BASE_W * tableScale, height: STADIUM_BASE_H * tableScale }}
        >
          <animated.div ref={recoilRef} className="relative w-full h-full overflow-hidden" style={recoilStyle}>
            {/* Laid out at the constant reference size, then scaled as a
                whole — see the table-scaling effect above for why this
                can't just be a resized container. */}
            <div
              className="absolute top-0 left-0"
              style={{
                width: STADIUM_BASE_W,
                height: STADIUM_BASE_H,
                transform: `scale(${tableScale})`,
                transformOrigin: "top left",
              }}
            >
            <StadiumMat>
              <StadiumDirectionArc direction={state.direction} />

              {seatList.map(({ id, variant }) => {
                const pos = stadiumPositions[id];
                if (!pos) return null;
                const player = players.find((p) => p.id === id);
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
                    <StadiumOpponentSeat
                      name={m.nameOf(id)}
                      handSize={state.handSizes[id] ?? 0}
                      seatNumber={seatNumbers[id] ?? 0}
                      isHost={player?.isHost ?? false}
                      isTurn={state.turnPlayerId === id}
                      isConnected={player?.isConnected}
                      variant={variant}
                      canCatch={m.catchableOpponents.includes(id)}
                      onCatch={() => m.catchUno(id)}
                    />
                  </animated.div>
                );
              })}

              <animated.div
                className="absolute inset-0 flex items-center justify-center z-[2]"
                style={{ transform: pileWobble.transform }}
              >
                <StadiumPileCenter
                  topCard={state.topCard}
                  currentColor={state.currentColor}
                  deckCount={state.deckCount}
                  isDragging={isDraggingCard}
                  canDraw={m.canDraw}
                  onDraw={m.drawCard}
                />
              </animated.div>

              {selfPos && (
                <animated.div
                  className="absolute left-1/2 z-[3]"
                  style={{
                    top: selfPos.top,
                    transform: wobbleTargetId === selfId ? wobble.transform : "translateX(-50%)",
                  }}
                >
                  <div className="relative flex flex-col items-center">
                    <UnoDeclareBubble declared={selfDeclared} />
                    <StadiumSelfPlate name={selfName} seatNumber={selfSeatNumber} handSize={m.sortedHand.length} isTurn={m.myTurn} />
                  </div>
                </animated.div>
              )}

              {/* Comedic "fired at" flourish — every hit kind now has its
                  own cinematic except Zero Rotate, which still gets the
                  plain badge pop; see UnoBoardDesktop.tsx's matching block
                  for the full rationale. */}
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

        {/* Hand fan / tagline / action bar — measured as one group by the
            table-scaling effect above (restRef), since its total height is
            what's left over for the stadium canvas. */}
        <div ref={restRef} className="w-full flex-shrink-0 flex flex-col items-center gap-1">
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

          {state.phase === "playing" && (
            <p className="text-[11px] font-bold text-center px-2" style={{ color: "#F0DDB4" }}>
              {m.myTurn ? "It's your turn. Play a card!" : `${m.currentPlayer} is playing…`}
            </p>
          )}

          {/* Action bar pinned to the bottom of the scroll area */}
          {m.myTurn && state.phase === "playing" && (
            <div className="sticky bottom-0 z-20 -mx-1 px-1 pt-2 pb-2 w-full bg-gradient-to-t from-[#1c0806] via-[#1c0806]/95 to-transparent">
              <ActionBar passTurn={m.passTurn} canPassTurn={m.canPassTurn} drewThisTurn={m.drewThisTurn} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom-right HUD — persistent UNO declare button + turn timer,
          floating above the scroll area so it never contributes to the
          scaling calc and never overflows. */}
      <div className="fixed bottom-4 right-3 z-30 flex flex-col items-end gap-2">
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
          <div className="fixed bottom-4 left-3 z-30 flex flex-col gap-2">
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
