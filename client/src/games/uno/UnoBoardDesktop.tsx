import { useEffect, useRef, useState } from "react";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
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
import { ArrowLeftIcon, SpeakerIcon, SpeakerMutedIcon } from "./uno-icons";
import { UnoRoomRail, ReactionButton } from "./uno-rail";
import { ActionBar } from "./uno-shared";
import { UnoDealOverlay } from "./uno-deal";
import {
  useOrientationReport,
  useUnoRotationGate,
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

/** The pile sits at the board area's visual centre — matches the pile
 *  wrapper's `top: 48%` below. Shared anchor for every "thrown from the
 *  pile" animation. */
const PILE_ANCHOR: FeltAnchor = { left: "50%", top: "48%" };

/**
 * Desktop UNO board — "stadium" redesign, adopting the same dark-arena DNA
 * as UnoBoardMobile.tsx so both breakpoints match the max-players reference
 * (dark-maroon full-bleed composition: spotlight seat top-centre, 3+3 side
 * columns hugging the screen edges, self plate bottom-left beside the hand
 * fan, persistent UNO button + turn timer bottom-right). Replaced the older
 * wood-frame + red-felt skin (UnoTableMat / UnoPlayerChip / ivory buttons
 * from uno-table.tsx + uno-scene.tsx — those files are left in place, just
 * no longer imported here).
 *
 * Presentation-only rewrite — every value and handler still comes from
 * `useUnoBoard` unchanged; no hook, store, or engine logic was touched.
 * Desktop-only affordances kept over the shared stadium chrome: physical
 * keyboard shortcuts (D/P/U/Esc), dedicated fullscreen + help buttons in
 * the top-right rail (mobile buries these in a gear menu), and the keyboard
 * hint line by the hand fan.
 */
export default function UnoBoardDesktop(props: UnoBoardProps) {
  const { history, champion } = props;
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);
  // Desktop never needs to rotate itself, but stays synchronized with the
  // same gate mobile players are held by — see rotation-sync.tsx.
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

  // ── Seating — maps playerOrder onto the reference's fixed ring. See
  // uno-stadium.tsx's computeStadiumSeating doc comment for the derivation
  // (numbers/positions trace one clockwise lap from self).
  const seating = computeStadiumSeating(state.playerOrder, selfId);
  const seatNumbers = computeSeatNumbers(seating, selfId);
  const stadiumPositions = computeStadiumPositions(seating, selfId);
  const seatList = stadiumSeatList(seating);
  const selfSeatNumber = selfId ? seatNumbers[selfId] ?? 0 : 0;

  // ── Animation system — identical wiring to the mobile stadium board;
  // seat-position lookups read from `stadiumPositions` (the ring anchors),
  // not the old arc-based resolveSeatPosition (that helper stays with the
  // retired wood skin).
  const animConfig = useAnimationConfig();
  const { cameraRef, shake, punch, tilt } = useTableCamera();
  const { recoilRef, recoilStyle, recoil } = useScreenRecoil();
  const [wobbleKey, setWobbleKey] = useState<string | null>(null);
  const [wobbleTargetId, setWobbleTargetId] = useState<string | null>(null);
  // Seat anchoring/centering lives on a static OUTER wrapper per seat, so
  // the wobble spring only ever animates a plain (untranslated) inner
  // element — base transform is empty for every target.
  const wobble = usePlayerWobble(wobbleKey, "");
  const triggerWobble = (targetId: string) => {
    setWobbleTargetId(targetId);
    setWobbleKey(`${targetId}-${Date.now()}`);
  };
  const handleSlipperImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: 6 });
    punch({ disabled: animConfig.reducedMotion });
    triggerWobble(targetId);
  };
  const handleMeteorImpact = (targetId: string) => {
    recoil({ disabled: animConfig.reducedMotion, intensity: 14 });
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
    shake({ disabled: animConfig.reducedMotion, intensity: 7 });
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

  /* ─── Sound + fullscreen header controls — same global toggles as the
     retired wood skin. ─── */
  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => onFullscreenChange(() => setIsFs(isFullscreenActive())), []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("any");
  }

  /* ─── Keyboard shortcuts — desktop only. D draw, P pass, U declare UNO,
     Escape deselects/cancels the Wild colour picker. ─── */
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

  /* ─── Adaptive sizing — mirrors the mobile board's two board-box
     measurements, with desktop-friendly caps so the big-screen real estate
     is actually used (seats/pile render larger than the mobile ceilings).
     The hand fan is measured separately so its reserved height (and the
     Wild colour picker that can appear under it) never clips. */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fanInnerRef = useRef<HTMLDivElement | null>(null);
  const [rootH, setRootH] = useState(900);
  const [boardBox, setBoardBox] = useState({ w: 1400, h: 620 });
  const [fanNaturalH, setFanNaturalH] = useState(170);
  useEffect(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    const fan = fanInnerRef.current;
    if (!root || !board || !fan) return;
    const measure = () => {
      setRootH(root.clientHeight);
      setBoardBox({ w: board.clientWidth, h: board.clientHeight });
      setFanNaturalH(fan.offsetHeight || 170);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(board);
    ro.observe(fan);
    return () => ro.disconnect();
  }, []);
  const fanScale = Math.min(1.45, Math.max(0.7, rootH / 720));
  const seatScale = Math.min(1.5, Math.max(0.7, Math.min(boardBox.w / 1000, boardBox.h / 480)));
  const pileScale = Math.min(2.0, Math.max(0.8, Math.min(boardBox.w / 950, boardBox.h / 470) * 1.45));

  const turnSecondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const warningActive = (m.myTurn || m.isChallengeTarget) && state.turnDeadline != null && turnSecondsLeft <= 10 && turnSecondsLeft > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-full flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 44%, #F5442C 0%, #E51E1E 26%, #B81616 48%, #7E0F0F 72%, #3E0909 100%)" }}
    >
      {/* Desktop never rotates itself but stays synchronized with mobile
          players — a full-viewport block during "gating" so no board
          content flashes before the deal, then the deal opener. */}
      {gate.stage === "gating" && (
        <UnoWaitingForPlayersBanner blockers={gate.blockers} showNames={gate.showBlockerNames} variant="overlay" />
      )}
      {(gate.stage === "shuffle" || gate.stage === "deal") && (
        <UnoDealOverlay stage={gate.stage} playerCount={state.playerOrder.length} />
      )}

      {/* Screen-reader-only turn announcement. */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.phase === "playing" ? (m.myTurn ? "Your turn" : `${m.currentPlayer}'s turn`) : ""}
      </div>

      {/* Header — room-code plate + classic/house-rules badge stacked on the
          left (matching the reference), sound / fullscreen / help on the
          right. */}
      <div className="relative flex-shrink-0 px-4 pt-3 pb-1 flex items-start justify-between gap-2 z-20">
        <div className="flex flex-col items-start gap-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <StadiumIconButton onClick={onLeave} ariaLabel="Leave game" title="Leave">
              <ArrowLeftIcon size={18} />
            </StadiumIconButton>
            <StadiumRoomCodePlate code={roomCode} />
          </div>
          {!warningActive && (
            Object.values(state.activeHouseRules).some(Boolean) ? (
              <StadiumHouseRulesBadge rules={state.activeHouseRules} />
            ) : (
              <StadiumClassicModeBadge />
            )
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StadiumIconButton
            onClick={toggleMute}
            ariaLabel={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
            title="Sound"
          >
            {audioSettings.isMuted ? <SpeakerMutedIcon size={16} /> : <SpeakerIcon size={16} />}
          </StadiumIconButton>
          <StadiumSettingsMenu
            isFullscreen={isFs}
            onToggleFullscreen={toggleFullscreen}
            onOpenTutorial={() => tut.setOpen(true)}
          />
          <ReactionButton dark />
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
                  reference's "YOU / KETHAN" cluster. Left offset clears the
                  fixed chat/emoji rail in the corner. */}
              <div className="absolute z-[3]" style={{ left: 84, bottom: 4, transform: `scale(${seatScale})`, transformOrigin: "bottom left" }}>
                <animated.div style={{ transform: wobbleTargetId === selfId ? wobble.transform : "none" }}>
                  <div className="relative">
                    <UnoDeclareBubble declared={selfDeclared} />
                    <StadiumSelfPlate name={selfName} seatNumber={selfSeatNumber} handSize={m.sortedHand.length} isTurn={m.myTurn} />
                  </div>
                </animated.div>
              </div>

              {/* Pass button (rare, post-draw) — floats bottom-centre of the
                  board, just above the fan. */}
              {m.myTurn && state.phase === "playing" && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
                  <ActionBar passTurn={m.passTurn} canPassTurn={m.canPassTurn} drewThisTurn={m.drewThisTurn} />
                </div>
              )}

              {/* Comedic "fired at" flourish — every hit kind has its own
                  cinematic except Zero Rotate, which gets the plain badge
                  pop. */}
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

      {/* Hand fan — fixed bottom block, downscaled to fit whatever height is
          left (reserved height tracks the fan's measured natural height ×
          scale, so the Wild colour picker appearing never clips). */}
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

      {/* Tagline + keyboard hint — reference's "— It's your turn. Play a
          card! —" footer, with the desktop-only shortcut legend beside it. */}
      {state.phase === "playing" && (
        <div className="flex-shrink-0 pb-1.5 px-4 flex items-center justify-center gap-4 z-10">
          <p className="text-xs font-bold text-center" style={{ color: "#F0DDB4" }}>
            {m.myTurn ? "◆ It's your turn. Play a card! ◆" : `${m.currentPlayer} is playing…`}
          </p>
          <span className="hidden lg:block text-[10px] font-mono text-[#E9C892]/60 italic whitespace-nowrap">
            D draw · P pass · U declare · Esc cancel
          </span>
        </div>
      )}

      {/* Bottom-right HUD — persistent UNO declare button + turn timer. */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
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
          bottom-left CHAT + EMOJI trigger pair matching the reference. */}
      <UnoRoomRail
        variant="sheet"
        density="desktop"
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
          <div className="fixed bottom-4 left-4 z-30 flex flex-col gap-2">
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
