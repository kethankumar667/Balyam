import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactionRecvPayload } from "@shared/types";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useUnoBoard, type UnoBoardProps } from "./useUnoBoard";
import { useAudio } from "../../hooks/useAudio";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  onFullscreenChange,
} from "../../lib/fullscreen";
import { getSocket } from "../../lib/socket";
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
  StadiumChatButton,
  StadiumUnoButton,
  StadiumTurnTimerPill,
  StadiumPassButton,
  StadiumHouseRulesModal,
  StadiumSpeechBubble,
  QuickTauntTray,
} from "./uno-stadium";
import { UnoRoomRail, ReactionButton } from "./uno-rail";
import {
  SpeakerIcon,
  SpeakerMutedIcon,
  LeaveDoorIcon,
  GearIcon,
} from "./uno-icons";
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

export default function UnoBoardMobile(props: UnoBoardProps) {
  const { history, champion } = props;
  const m = useUnoBoard(props);
  const { state, players, selfId, messages, roomCode, onLeave } = m;
  const tut = useTutorialGate(UNO_TUTORIAL.key);

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
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showTaunts, setShowTaunts] = useState(false);

  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  // ── Seating in Widescreen Landscape Stadium Ring ──
  const seating = computeStadiumSeating(state.playerOrder, selfId);
  const seatNumbers = computeSeatNumbers(seating, selfId);
  const stadiumPositions = computeStadiumPositions(seating, selfId, "edge", false);
  const seatList = stadiumSeatList(seating);
  const selfSeatNumber = selfId ? seatNumbers[selfId] ?? 0 : 0;

  // ── Animation system ──
  const animConfig = useAnimationConfig();
  const { cameraRef, shake, punch, tilt } = useTableCamera();
  const { recoilRef, recoilStyle, recoil } = useScreenRecoil();
  const [wobbleKey, setWobbleKey] = useState<string | null>(null);
  const [wobbleTargetId, setWobbleTargetId] = useState<string | null>(null);

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
  const handleStackImpact = (targetId: string) => {
    shake({ disabled: animConfig.reducedMotion, intensity: 6 });
    triggerWobble(targetId);
  };

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

  const { settings: audioSettings, toggleMute } = useAudio();
  const [isFs, setIsFs] = useState(isFullscreenActive());
  useEffect(() => {
    return onFullscreenChange(() => setIsFs(isFullscreenActive()));
  }, []);
  const toggleFullscreen = () => {
    if (isFullscreenActive()) exitFullscreen();
    else enterFullscreen();
  };

  // ── Sizing refs and measurement ──
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fanInnerRef = useRef<HTMLDivElement | null>(null);
  const [rootBox, setRootBox] = useState({ w: 390, h: 844 });
  const [boardBox, setBoardBox] = useState({ w: 390, h: 520 });
  const [fanNaturalH, setFanNaturalH] = useState(150);

  useEffect(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    const fan = fanInnerRef.current;
    if (!root || !board || !fan) return;
    const measure = () => {
      setRootBox({ w: root.clientWidth, h: root.clientHeight });
      setBoardBox({ w: board.clientWidth, h: board.clientHeight });
      setFanNaturalH(fan.clientHeight || 150);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(board);
    ro.observe(fan);
    return () => ro.disconnect();
  }, []);

  // ── Live Throw Reaction Flight System ──
  const [reactionFlights, setReactionFlights] = useState<
    Array<{
      id: string;
      emoji: string;
      from: { left: string; top: string };
      to?: { left: string; top: string };
    }>
  >([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [reactionImpacts, setReactionImpacts] = useState<
    Array<{
      id: string;
      emoji: string;
      pos: { left: string; top: string };
    }>
  >([]);

  useEffect(() => {
    const socket = getSocket();
    function onReaction(data: ReactionRecvPayload) {
      const flightId = `${Date.now()}-${Math.random()}`;
      const senderId = data.fromPlayerId;
      const fromPos =
        (senderId && stadiumPositions[senderId]) ||
        (senderId === selfId ? stadiumPositions[selfId ?? ""] : undefined) || { left: "18%", top: "72%" };
      const toPos = data.targetPlayerId
        ? stadiumPositions[data.targetPlayerId] ||
          (data.targetPlayerId === selfId ? stadiumPositions[selfId ?? ""] : undefined)
        : undefined;

      setReactionFlights((prev) => [
        ...prev,
        {
          id: flightId,
          emoji: data.emoji,
          from: fromPos,
          to: toPos,
        },
      ]);

      if (toPos && data.targetPlayerId) {
        const targetId = data.targetPlayerId;
        window.setTimeout(() => {
          triggerWobble(targetId);
          const impactId = `${Date.now()}-imp`;
          setReactionImpacts((prev) => [...prev, { id: impactId, emoji: data.emoji, pos: toPos }]);
          window.setTimeout(() => {
            setReactionImpacts((prev) => prev.filter((x) => x.id !== impactId));
          }, 900);
        }, 500);
      }

      window.setTimeout(() => {
        setReactionFlights((prev) => prev.filter((x) => x.id !== flightId));
      }, 700);
    }

    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, [stadiumPositions, selfId]);

  const seatScale = Math.min(1.05, Math.max(0.65, Math.min(boardBox.w / 880, boardBox.h / 390)));
  const pileScale = Math.min(1.05, Math.max(0.70, Math.min(boardBox.w / 880, boardBox.h / 390)));
  const arcW = Math.max(340, Math.min(boardBox.w * 0.44, 460));
  const arcH = Math.max(110, Math.min(boardBox.h * 0.32, 135));
  const dense = seatScale < 0.78;
  const fanAvailableWidth = Math.max(320, rootBox.w - 180);
  const fanScale = Math.min(0.92, Math.max(0.70, rootBox.h / 450));

  const currentTurnIdx = state.playerOrder.indexOf(state.turnPlayerId ?? "");
  const nextPlayerId =
    currentTurnIdx !== -1
      ? state.playerOrder[(currentTurnIdx + state.direction + state.playerOrder.length) % state.playerOrder.length]
      : null;

  const turnSecondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const warningActive =
    (m.myTurn || m.isChallengeTarget) &&
    state.turnDeadline != null &&
    turnSecondsLeft <= 10 &&
    turnSecondsLeft > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full flex flex-col overflow-hidden select-none"
    >
      {needsLandscape && (
        <UnoRotateDevicePrompt
          readiness={gate.stage === "gating" ? { readyCount: gate.readyCount, totalCount: gate.totalCount } : undefined}
        />
      )}

      <StadiumMat activeColor={state.currentColor ?? state.topCard?.color ?? "red"}>
        {gate.stage === "gating" && (
          <UnoWaitingForPlayersBanner blockers={gate.blockers} showNames={gate.showBlockerNames} variant="overlay" />
        )}
        {(gate.stage === "shuffle" || gate.stage === "deal") && (
          <UnoDealOverlay stage={gate.stage} playerCount={state.playerOrder.length} />
        )}

        {/* Top Header matching UX image */}
        <div className="relative flex-shrink-0 px-3 pt-2.5 pb-1 flex flex-col gap-1.5 z-20">
          {/* Top Line: Room Code on Left, Meta in Center, Sound/Help/Reactions on Right */}
          <div className="flex items-center justify-between gap-1 w-full">
            <StadiumRoomCodePlate code={roomCode} />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/90 whitespace-nowrap">
              GAME: <span className="text-yellow-400 font-extrabold">UNO</span> &nbsp;·&nbsp; <span className="text-amber-300 font-extrabold">{state.phase.toUpperCase()}</span>
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StadiumIconButton
                onClick={toggleMute}
                ariaLabel={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
                title="Sound"
              >
                {audioSettings.isMuted ? <SpeakerMutedIcon size={15} /> : <SpeakerIcon size={15} />}
              </StadiumIconButton>
              <StadiumIconButton
                onClick={() => tut.setOpen(true)}
                ariaLabel="How to Play"
                title="How to Play"
              >
                <GearIcon size={15} />
              </StadiumIconButton>
              <ReactionButton dark />
            </div>
          </div>

          {/* Second Line: Classic Mode / Rules on Left, Leave Room Button on Right */}
          <div className="flex items-center justify-between w-full">
            {!warningActive && (
              Object.values(state.activeHouseRules).some(Boolean) ? (
                <StadiumHouseRulesBadge
                  rules={state.activeHouseRules}
                  onClick={() => setShowRulesModal(true)}
                />
              ) : (
                <StadiumClassicModeBadge onClick={() => setShowRulesModal(true)} />
              )
            )}
            <button
              onClick={() => setConfirmLeave(true)}
              aria-label="Leave Game"
              title="Leave Room"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-200 hover:text-white bg-red-950/85 hover:bg-red-600/90 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md active:scale-95 cursor-pointer ml-auto"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <LeaveDoorIcon size={12} />
              <span>LEAVE ROOM</span>
            </button>
          </div>
        </div>

        <UnoActionToast lastAction={state.lastAction} className="top-11" />

        {/* Board Arena */}
        <div ref={cameraRef} className="flex-1 min-h-0 relative">
          <animated.div ref={recoilRef} className="relative w-full h-full" style={recoilStyle}>
            <div ref={boardRef} className="relative w-full h-full">
              {/* Direction Ring */}
              <StadiumDirectionArc
                direction={state.direction}
                width={arcW}
                height={arcH}
                activeColor={state.currentColor ?? state.topCard?.color ?? "red"}
              />

              {/* 8 Opponent Seats */}
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
                        avatar={player?.avatar}
                        handSize={state.handSizes[id] ?? 0}
                        seatNumber={seatNumbers[id] ?? 0}
                        isHost={player?.isHost ?? false}
                        isTurn={state.turnPlayerId === id}
                        isNextTurn={nextPlayerId === id}
                        isConnected={player?.isConnected}
                        variant={variant}
                        dense={dense}
                        canCatch={m.catchableOpponents.includes(id)}
                        onCatch={() => m.catchUno(id)}
                        onReact={(emoji) => getSocket().emit("room:reaction", { emoji, targetPlayerId: id })}
                      />
                    </animated.div>
                  </div>
                );
              })}

              {/* Table Center: Draw & Discard Piles */}
              <div
                className="absolute z-[2]"
                style={{ left: "50%", top: "46%", transform: `translate(-50%, -50%) scale(${pileScale})` }}
              >
                <animated.div style={{ transform: pileWobble.transform }}>
                  <StadiumPileCenter
                    topCard={state.topCard}
                    currentColor={state.currentColor}
                    deckCount={state.deckCount}
                    isDragging={isDraggingCard}
                    canDraw={m.canDraw}
                    onDraw={m.drawCard}
                    showCaptions={false}
                  />
                </animated.div>
              </div>

              {/* Local Player Plate ("YOU / KETHAN") at Bottom Left */}
              <div
                className="absolute z-[3]"
                style={{
                  left: "10%",
                  top: "82%",
                  transform: `translate(-50%, -50%) scale(${seatScale})`,
                }}
              >
                <animated.div style={{ transform: wobbleTargetId === selfId ? wobble.transform : "none" }}>
                  <div className="relative">
                    <UnoDeclareBubble declared={selfDeclared} />
                    <StadiumSelfPlate
                      name={selfName}
                      avatar={players.find((p) => p.id === selfId)?.avatar}
                      seatNumber={selfSeatNumber}
                      handSize={m.sortedHand.length}
                      isTurn={m.myTurn}
                    />
                  </div>
                </animated.div>
              </div>

              {/* Comedic Special Attack Flourishes */}
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

              {/* Live Flying Reactions & Throwables Layer */}
              <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden>
                <AnimatePresence>
                  {reactionFlights.map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{
                        left: f.from.left,
                        top: f.from.top,
                        scale: 0.6,
                        opacity: 1,
                      }}
                      animate={
                        f.to
                          ? {
                              left: f.to.left,
                              top: f.to.top,
                              scale: [0.7, 1.4, 1.1],
                              rotate: [0, 180, 360],
                            }
                          : {
                              y: -50,
                              scale: [1, 1.3, 0.9],
                              opacity: [1, 1, 0],
                            }
                      }
                      transition={{
                        duration: f.to ? 0.55 : 1.0,
                        ease: "easeInOut",
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                    >
                      {f.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Explosion Impact Bursts */}
                <AnimatePresence>
                  {reactionImpacts.map((imp) => (
                    <motion.div
                      key={`impact-${imp.id}`}
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: [0.8, 1.6, 1.8], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.85, ease: "easeOut" }}
                      style={{ left: imp.pos.left, top: imp.pos.top }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl select-none filter drop-shadow-[0_0_20px_rgba(255,200,0,0.9)] z-50 flex items-center justify-center"
                    >
                      {imp.emoji === "🍅"
                        ? "💥🍅"
                        : imp.emoji === "🩴"
                        ? "💥🩴"
                        : imp.emoji === "🧨"
                        ? "💥🔥"
                        : imp.emoji === "🎉"
                        ? "🎊🎉"
                        : `✨${imp.emoji}`}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Live Speech Bubbles over Player Seats */}
              <AnimatePresence>
                {seatList.map(({ id }) => {
                  const pos = stadiumPositions[id];
                  if (!pos) return null;
                  const playerMsgs = messages.filter((msg) => msg.playerId === id && Date.now() - msg.ts < 4500);
                  const latestMsg = playerMsgs[playerMsgs.length - 1];
                  if (!latestMsg) return null;
                  return (
                    <div
                      key={`bubble-${id}-${latestMsg.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                      style={{ left: pos.left, top: pos.top }}
                    >
                      <StadiumSpeechBubble text={latestMsg.text} />
                    </div>
                  );
                })}
                {selfId && stadiumPositions[selfId] && (() => {
                  const pos = stadiumPositions[selfId];
                  const selfMsgs = messages.filter((msg) => msg.playerId === selfId && Date.now() - msg.ts < 4500);
                  const latestMsg = selfMsgs[selfMsgs.length - 1];
                  if (!latestMsg) return null;
                  return (
                    <div
                      key={`bubble-self-${latestMsg.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                      style={{ left: pos.left, top: pos.top }}
                    >
                      <StadiumSpeechBubble text={latestMsg.text} />
                    </div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </animated.div>
        </div>

        {/* Hand fan Container */}
        <div className="relative flex-shrink-0 w-full z-10" style={{ height: fanNaturalH * fanScale + 8 }}>
          {/* Centered Pass Button above Hand Cards */}
          {m.myTurn && state.phase === "playing" && m.drewThisTurn && (
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 animate-bounce">
              <StadiumPassButton canPass={m.canPassTurn} onPass={m.passTurn} />
            </div>
          )}
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
              availableWidth={fanAvailableWidth}
              compact
            />
          </div>
        </div>

        {/* Footer Drawer Handle & Turn Status Prompt */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pb-2 pt-0.5 px-3 z-10">
          <div className="w-6 h-1 rounded-full bg-amber-400/40 mb-1" />
          <p className="text-[12px] font-extrabold text-center tracking-wide" style={{ color: "#F7DA8B" }}>
            {m.myTurn ? (
              "— ◆ It's your turn. Play a card! ◆ —"
            ) : (
              <span>
                <strong className="text-yellow-300 font-black">{m.currentPlayer}</strong> is playing… &nbsp;→&nbsp; Next: <strong className="text-amber-200 font-black">{nextPlayerId ? m.nameOf(nextPlayerId) : ""}</strong>
              </span>
            )}
          </p>
        </div>

        {/* Bottom-Right HUD: 3D UNO Button + Turn Timer Pill */}
        <div className="fixed bottom-12 right-4 z-30 flex flex-col items-center gap-1.5">
          <StadiumUnoButton
            enabled={m.canDeclareUno}
            isPrimed={m.sortedHand.length === 2 && m.myTurn}
            onDeclare={m.declareUno}
          />
          <StadiumTurnTimerPill deadline={state.turnDeadline} myTurn={m.myTurn} />
        </div>

        {/* Urgency Edge Pulse */}
        {state.turnDeadline && (
          <TurnTimeWarning
            deadline={state.turnDeadline}
            active={m.myTurn || m.isChallengeTarget}
            topOffsetRem={0.5}
            chipless
          />
        )}

        {/* Modals & Room Rail */}
        {state.phase === "finished" && !m.scorecardDismissed && (
          <UnoResultModal state={state} players={players} selfId={selfId} onClose={m.dismissScorecard} onLeave={onLeave} />
        )}

        <StadiumHouseRulesModal
          open={showRulesModal}
          rules={state.activeHouseRules}
          onClose={() => setShowRulesModal(false)}
        />

        <QuickTauntTray
          isOpen={showTaunts}
          onClose={() => setShowTaunts(false)}
          onSendTaunt={(text) => getSocket().emit("chat:send", { text })}
        />

        {/* Room Rail Bottom-Left Trigger Stack (Chat, Quick Taunt, Emojis) */}
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
            <div className="fixed bottom-14 left-3 z-30 flex flex-col gap-2">
              <StadiumChatButton onClick={open} unread={unread} />
              <button
                onClick={() => setShowTaunts(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-base bg-black/80 hover:bg-amber-500/30 border border-white/20 hover:border-amber-400/60 shadow-lg active:scale-95 transition cursor-pointer"
                title="Quick Taunts"
                aria-label="Quick Taunts"
              >
                💬
              </button>
              <ReactionButton variant="square" />
            </div>
          )}
        />

        {tut.open && (
          <GameTutorial slides={UNO_TUTORIAL.slides} storageKey={UNO_TUTORIAL.key} accent={UNO_TUTORIAL.accent} onClose={() => tut.setOpen(false)} />
        )}

        {confirmLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center gap-4 animate-scale-up"
              style={{
                background: "linear-gradient(165deg, #2A0808 0%, #170404 100%)",
                border: "2px solid rgba(247,218,139,0.7)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(220,38,38,0.4)",
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-2xl shadow-inner">
                🚪
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wide text-white font-display">
                  Leave Match?
                </h3>
                <p className="text-xs text-amber-200/80 mt-1">
                  Leaving now will forfeit your seat. Your current hand will be folded.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-amber-100 bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition cursor-pointer"
                >
                  Stay & Play
                </button>
                <button
                  onClick={() => {
                    setConfirmLeave(false);
                    onLeave?.();
                  }}
                  className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 border border-red-400 active:scale-95 transition shadow-lg cursor-pointer"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}

        {m.isChallengeTarget && m.pendingChallenge && (
          <WildDrawFourChallengePrompt
            playedByName={m.nameOf(m.pendingChallenge.playedById)}
            onAccept={m.acceptWildFourDraw}
            onChallenge={m.challengeWildFour}
          />
        )}
      </StadiumMat>
    </div>
  );
}
