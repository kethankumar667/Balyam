import { useEffect, useMemo, useRef, useState } from "react";
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
  StadiumSettingsMenu,
  StadiumChatButton,
  StadiumUnoButton,
  StadiumTurnTimerPill,
  StadiumPassButton,
  StadiumHouseRulesModal,
  StadiumSpeechBubble,
  QuickTauntTray,
} from "./uno-stadium";
import {
  ArrowLeftIcon,
  SpeakerIcon,
  SpeakerMutedIcon,
  ExpandIcon,
  CompressIcon,
  HelpIcon,
  LeaveDoorIcon,
} from "./uno-icons";
import { UnoRoomRail, ReactionButton } from "./uno-rail";
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
  // Never over a live turn or challenge window — same condition this board
  // already uses to decide whether the turn-timer warning is active (below).
  // See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(
    UNO_TUTORIAL.key,
    (!m.myTurn && !m.isChallengeTarget) || state.turnDeadline == null,
  );
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
  const [showTaunts, setShowTaunts] = useState(false);

  const selfDeclared = selfId != null && state.unoDeclaredBy.includes(selfId);
  const selfName = selfId ? m.nameOf(selfId) : "You";

  // ── Sizing refs and measurement ──
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fanInnerRef = useRef<HTMLDivElement | null>(null);
  const [rootBox, setRootBox] = useState({ w: 1400, h: 900 });
  const [boardBox, setBoardBox] = useState({ w: 1400, h: 620 });
  const [fanNaturalH, setFanNaturalH] = useState(170);
  useEffect(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    const fan = fanInnerRef.current;
    if (!root || !board || !fan) return;
    const measure = () => {
      setRootBox({ w: root.clientWidth, h: root.clientHeight });
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

  // ── Seating — maps playerOrder onto the reference's fixed ring.
  const seating = computeStadiumSeating(state.playerOrder, selfId);
  const seatNumbers = computeSeatNumbers(seating, selfId);
  const stadiumPositions = computeStadiumPositions(seating, selfId, "ring");
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
  const [showRulesModal, setShowRulesModal] = useState(false);

  /* ─── Live Flying Reactions & Throwables ─── */
  const [reactionFlights, setReactionFlights] = useState<
    Array<{
      id: string;
      emoji: string;
      from: { left: string; top: string };
      to?: { left: string; top: string };
    }>
  >([]);
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
        (senderId === selfId ? stadiumPositions[selfId ?? ""] : undefined) || { left: "50%", top: "76%" };
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
  }, [stadiumPositions, selfId, triggerWobble]);

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

  /* ─── Adaptive sizing & scales ─── */
  const rootH = rootBox.h;
  const fanScale = Math.min(1.45, Math.max(0.7, rootH / 720));
  /* Corridor the fan may use. The bottom-left chat/emoji rail and the
     bottom-right UNO+timer HUD are `fixed`, so they don't reserve layout
     space — a wide hand would slide straight under them. Kept symmetric so
     the fan stays optically centred. Divided by fanScale because the fan
     lays itself out in pre-scale pixels. */
  const FAN_SIDE_RESERVE = 168;
  const fanAvailableWidth = Math.max(320, (rootBox.w - FAN_SIDE_RESERVE * 2) / fanScale);
  const seatScale = Math.min(1.15, Math.max(0.8, Math.min(boardBox.w / 1150, boardBox.h / 550)));
  const pileScale = Math.min(1.08, Math.max(0.85, Math.min(boardBox.w / 1250, boardBox.h / 600)));
  /* Direction ring — expansive stadium elliptical orbit framing the table. */
  const arcW = Math.max(500, Math.min(boardBox.w * 0.62, 780));
  const arcH = Math.max(200, Math.min(boardBox.h * 0.44, 280));

  const turnSecondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const warningActive = (m.myTurn || m.isChallengeTarget) && state.turnDeadline != null && turnSecondsLeft <= 10 && turnSecondsLeft > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full flex flex-col overflow-hidden select-none"
    >
      <StadiumMat activeColor={state.currentColor ?? state.topCard.color ?? "red"}>
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
            left (matching the reference), sound / settings / emoji on the right. */}
        <div className="relative flex-shrink-0 px-6 pt-4 pb-1 flex items-start justify-between gap-4 z-30">
          <div className="flex flex-col items-start gap-1.5 min-w-0">
            <StadiumRoomCodePlate code={roomCode} />
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
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <StadiumIconButton
              onClick={toggleFullscreen}
              ariaLabel={isFs ? "Exit Fullscreen" : "Enter Fullscreen"}
              title={isFs ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFs ? <CompressIcon size={18} /> : <ExpandIcon size={18} />}
            </StadiumIconButton>
            <StadiumIconButton
              onClick={toggleMute}
              ariaLabel={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
              title={audioSettings.isMuted ? "Unmute sound" : "Mute sound"}
            >
              {audioSettings.isMuted ? <SpeakerMutedIcon size={18} /> : <SpeakerIcon size={18} />}
            </StadiumIconButton>
            <StadiumIconButton
              onClick={() => tut.setOpen(true)}
              ariaLabel="How to Play"
              title="How to Play"
            >
              <HelpIcon size={18} />
            </StadiumIconButton>
            <ReactionButton dark />
            {onLeave && (
              <button
                onClick={onLeave}
                aria-label="Leave Game"
                title="Leave Room"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black uppercase tracking-wider text-red-300 hover:text-white bg-red-950/70 hover:bg-red-600/90 border border-red-500/40 hover:border-red-400 transition-all duration-150 shadow-md active:scale-95 cursor-pointer ml-0.5"
                style={{ backdropFilter: "blur(8px)" }}
              >
                <LeaveDoorIcon size={14} />
                <span>Leave</span>
              </button>
            )}
          </div>
        </div>

        <UnoActionToast lastAction={state.lastAction} />

        {/* Board area — full-bleed, fills all space between header and hand
            fan. Seats/pile/hit-animations are all percentage-anchored to
            THIS box, matching the reference's edge-to-edge composition. */}
        <div ref={cameraRef} className="flex-1 min-h-0 relative">
          <animated.div ref={recoilRef} className="relative w-full h-full" style={recoilStyle}>
            <div ref={boardRef} className="relative w-full h-full">
              <StadiumDirectionArc
                direction={state.direction}
                width={arcW}
                height={arcH}
                activeColor={state.currentColor ?? state.topCard?.color ?? "red"}
              />

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
                        isConnected={player?.isConnected}
                        variant={variant}
                        canCatch={m.catchableOpponents.includes(id)}
                        onCatch={() => m.catchUno(id)}
                        onReact={(emoji) => {
                          getSocket().emit("room:reaction", { emoji, targetPlayerId: id });
                        }}
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
                    showCaptions
                  />
                </animated.div>
              </div>

              {/* Self plate — positioned at bottom center on the stadium oval ring */}
              {(() => {
                const selfPlayer = players.find((p) => p.id === selfId);
                const selfPos = (selfId && stadiumPositions[selfId]) || { left: "50%", top: "76%" };
                return (
                  <div
                    className="absolute z-[3]"
                    style={{
                      left: selfPos.left,
                      top: selfPos.top,
                      transform: `translate(-50%, -50%) scale(${seatScale})`,
                    }}
                  >
                    <animated.div style={{ transform: wobbleTargetId === selfId ? wobble.transform : "none" }}>
                      <div className="relative">
                        <UnoDeclareBubble declared={selfDeclared} />
                        <StadiumSelfPlate
                          name={selfName}
                          avatar={selfPlayer?.avatar}
                          seatNumber={selfSeatNumber}
                          handSize={m.sortedHand.length}
                          isTurn={m.myTurn}
                        />
                      </div>
                    </animated.div>
                  </div>
                );
              })()}

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
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                    >
                      {f.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {reactionImpacts.map((imp) => (
                    <motion.div
                      key={imp.id}
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: [0.8, 1.6, 1.8], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.85, ease: "easeOut" }}
                      style={{ left: imp.pos.left, top: imp.pos.top }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl select-none filter drop-shadow-[0_0_20px_rgba(255,200,0,0.9)] z-50 flex items-center justify-center"
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

        {/* Hand fan — fixed bottom block, downscaled to fit whatever height is
            left (reserved height tracks the fan's measured natural height ×
            scale, so the Wild colour picker appearing never clips). */}
        <div className="relative flex-shrink-0 w-full z-20" style={{ height: fanNaturalH * fanScale + 12 }}>
          {/* Centered Pass Button — ergonomic and prominently accessible above the hand cards when you have drawn */}
          {m.myTurn && state.phase === "playing" && m.drewThisTurn && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 animate-bounce">
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
            />
          </div>
        </div>

        {/* Dynamic Contextual Match Prompt + keyboard hint */}
        {state.phase === "playing" && (
          <div className="flex-shrink-0 pb-2.5 px-4 flex items-center justify-center gap-4 z-10">
            <p className="text-xs font-black text-center tracking-wide" style={{ color: "#F0DDB4" }}>
              {m.myTurn
                ? m.validMoveIds.size > 0
                  ? `— ◆ Your turn! Match ${state.currentColor ?? state.topCard.color ?? "Color"} or ${state.topCard.rank} ◆ —`
                  : "— ◆ No matching cards! Tap Draw Pile to draw ◆ —"
                : `${m.currentPlayer} is playing…`}
            </p>
            <span className="hidden lg:block text-[10px] font-mono text-[#E9C892]/60 italic whitespace-nowrap">
              D draw · P pass · U declare · Esc cancel
            </span>
          </div>
        )}

        {/* Bottom-right HUD — persistent UNO declare button + turn timer. */}
        <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2.5">
          <StadiumUnoButton
            enabled={m.canDeclareUno}
            isPrimed={m.sortedHand.length === 2 && m.myTurn}
            onDeclare={m.declareUno}
          />
          <StadiumTurnTimerPill deadline={state.turnDeadline} myTurn={m.myTurn} />
        </div>

        {/* Full-screen urgency pulse for the final ≤10s */}
        {state.turnDeadline && (
          <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn || m.isChallengeTarget} topOffsetRem={0.5} />
        )}

        {state.phase === "finished" && !m.scorecardDismissed && (
          <UnoResultModal state={state} players={players} selfId={selfId} onClose={m.dismissScorecard} onLeave={onLeave} />
        )}

        <StadiumHouseRulesModal
          open={showRulesModal}
          rules={state.activeHouseRules}
          onClose={() => setShowRulesModal(false)}
        />

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
            <div className="fixed bottom-6 left-6 z-30 flex flex-col gap-2.5">
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

        <QuickTauntTray
          isOpen={showTaunts}
          onClose={() => setShowTaunts(false)}
          onSendTaunt={(text) => getSocket().emit("chat:send", { text })}
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
      </StadiumMat>
    </div>
  );
}
