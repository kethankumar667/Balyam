import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@shared/types.js";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { HapticsManager } from "../../services/HapticsManager";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useTutorialGate } from "../../components/GameTutorial";
import type { VamanaBoardProps } from "./VamanaBoardProps";
import { vamanaAudio } from "./vamanaAudio";
import { describeVamanaOutcome } from "./vamanaOutcome";
import { seatOfPit, viewerSeatOf } from "./vamanaLayout";
import { describeLastMove } from "./vamanaSummary";
import { useVamanaMove } from "./useVamanaMove";
import { useVamanaReplay } from "./useVamanaReplay";

/** The Game Academy is found by the first segment of this key; the rest is the seen-it flag. */
export const VAMANA_TUTORIAL_KEY = "vamanaguntalu.tutorial.completed.v1";

/** At or under this many seconds the clock is flagged as urgent. */
const TIMER_CRITICAL_SECONDS = 5;

type BoardHookProps = Pick<VamanaBoardProps, "state" | "players" | "selfId">;

/**
 * State, derived values, sounds and handlers shared by the mobile and desktop boards. The two shells
 * differ only in layout, so everything that is the game's behaviour lives here once.
 */
export function useVamanaBoard({ state, players, selfId }: BoardHookProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const replay = useVamanaReplay(state, !reducedMotion);
  const { isPending, isMyTurn, canSow, sowPit } = useVamanaMove({ state, selfId });
  useTurnHaptics(state.turnPlayerId, selfId);

  const [isMuted, setIsMuted] = useState(vamanaAudio.isMuted());
  const handleMuteToggle = useCallback(() => setIsMuted(vamanaAudio.toggleMute()), []);

  const isPlayer = selfId !== "" && state.playerOrder.includes(selfId);
  const seat = viewerSeatOf(state.playerOrder, selfId);
  const isOver = state.phase === "finished";
  const isBusy = isPending || replay.isReplaying;

  const playerAt = (id: string | undefined): Player | undefined => players.find((p) => p.id === id);
  const mineId = state.playerOrder[seat];
  const rivalId = state.playerOrder[seat === 0 ? 1 : 0];
  const mine = playerAt(mineId);
  const rival = playerAt(rivalId);
  const nameOf = useCallback((id: string): string => players.find((p) => p.id === id)?.name ?? "Opponent", [players]);

  const onRow = (id: string | undefined): number => {
    if (id === undefined) return 0;
    const side = state.playerOrder.indexOf(id);
    return replay.pits.reduce((sum, count, pit) => (seatOfPit(pit) === side ? sum + count : sum), 0);
  };

  // The result is worded only once the last turn has finished playing out on screen.
  const outcome = useMemo(() => describeVamanaOutcome(state, selfId, players), [state, selfId, players]);
  const showOutcome = isOver && !replay.isReplaying;
  const lastMoveText = useMemo(() => describeLastMove(state.lastMove, nameOf), [state.lastMove, nameOf]);

  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const isTimerCritical =
    state.phase === "playing" && state.turnDeadline != null && secondsLeft > 0 && secondsLeft <= TIMER_CRITICAL_SECONDS;

  const hasTurnClock = state.phase === "playing" && state.turnDeadline != null;
  const turnTotalSeconds = state.options.turnTimerSeconds;
  const clockSeconds = hasTurnClock ? secondsLeft : null;
  const turnFraction = hasTurnClock && turnTotalSeconds > 0 ? Math.min(1, secondsLeft / turnTotalSeconds) : null;

  const capturedBy = (id: string | undefined): number => (id === undefined ? 0 : (replay.captured[id] ?? 0));
  const mineCaptured = capturedBy(mineId);
  const rivalCaptured = capturedBy(rivalId);
  const leaderId = mineCaptured === rivalCaptured ? null : mineCaptured > rivalCaptured ? mineId : rivalId;

  /** The sentence on the turn bar. A mouse can be told about the keyboard; a finger just needs to be told where to tap. */
  const turnText = (pointer: "touch" | "mouse"): string => {
    if (!isMyTurn) return `Waiting for ${nameOf(state.turnPlayerId)}`;
    return pointer === "touch" ? "Your turn — tap a pit on your row" : "Your turn — click a pit on your row, or use the arrow keys and Enter";
  };

  /** What the board's polite live region says: the result once it is on screen, otherwise whose turn it is. */
  const statusText = isOver
    ? showOutcome
      ? outcome.announcement
      : ""
    : isMyTurn
      ? `Your turn. ${secondsLeft > 0 ? `${secondsLeft} seconds left.` : ""}`
      : `${nameOf(state.turnPlayerId)}'s turn.`;

  // Auto-open the how-to-play once, but never over the player's own running turn clock.
  const tutorial = useTutorialGate(VAMANA_TUTORIAL_KEY, !isMyTurn);

  // Sounds follow what is on screen: a tick per seed dropped, a chime on the capture, a phrase at the end.
  useEffect(() => {
    if (replay.isReplaying && replay.activePit !== null) vamanaAudio.playSeed(replay.activePit);
  }, [replay.isReplaying, replay.activePit]);

  useEffect(() => {
    if (replay.capturedPit === null) return;
    vamanaAudio.playCapture();
    HapticsManager.getInstance().subtle();
  }, [replay.capturedPit]);

  const announcedOutcome = useRef<string>("none");
  useEffect(() => {
    if (!showOutcome || !isPlayer || announcedOutcome.current === outcome.kind) return;
    announcedOutcome.current = outcome.kind;
    if (outcome.kind === "win") {
      vamanaAudio.playVictory();
      HapticsManager.getInstance().win();
    } else if (outcome.kind === "loss") {
      vamanaAudio.playDefeat();
    }
  }, [showOutcome, isPlayer, outcome.kind]);

  return {
    replay,
    seat,
    isPlayer,
    isOver,
    isBusy,
    isMyTurn,
    canSow,
    sowPit,
    mine,
    rival,
    mineId,
    rivalId,
    nameOf,
    onRow,
    outcome,
    showOutcome,
    lastMoveText,
    secondsLeft,
    clockSeconds,
    turnTotalSeconds,
    turnFraction,
    leaderId,
    turnText,
    statusText,
    isTimerCritical,
    isMuted,
    handleMuteToggle,
    tutorial,
  };
}
