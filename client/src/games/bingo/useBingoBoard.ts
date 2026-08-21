import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BingoPlayerState, ChatMessage, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useHaptics } from "../../hooks/useHaptics";
import { useTranslation } from "../../hooks/useTranslation";
import { announceNumber, stopAnnouncing } from "./announcer";

export interface BingoBoardProps {
  state: BingoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  onLeave: () => void;
  onScorecardClose: () => void;
}

export interface BingoBoardModel {
  state: BingoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  onLeave: () => void;
  onScorecardClose: () => void;

  nameOf: (id: string) => string;
  isOver: boolean;
  iHaveWon: boolean;
  canAttemptClaim: boolean;
  secondsUntilTurnTimeout: number | null;
  isMyTurn: boolean;
  currentTurnPlayerName: string;

  activeTab: "myBoard" | "allBoards";
  setActiveTab: (tab: "myBoard" | "allBoards") => void;

  /* ── Marking ──────────────────────────────────────────────────────
   * The number on the clock, and everything the UI needs to explain the
   * pause it causes. The engine holds the next call until every seat has
   * resolved this one, so a board that does not SAY why it is waiting
   * reads as a freeze — which is how the last round of pauses got
   * reported as bugs. */

  /** The number awaiting marks, or null when nothing is open. */
  pendingNumber: number | null;
  /** Whole seconds left in the mark window; null when nothing is open. */
  secondsToMark: number | null;
  /** Whether I have already dealt with the open number. */
  iHaveMarkedCurrent: boolean;
  /** Names of the players still being waited on — never includes me. */
  waitingOn: string[];
  /** True the instant the window rescues me, so the UI can own up to it. */
  wasAutoMarkedForMe: boolean;
  autoMark: boolean;
  activeBallCalled: number | null;

  markNumber: (num: number) => void;
  setAutoMark: (on: boolean) => void;

  shuffleBoard: () => void;
  lockBoard: () => void;
  callNumber: (num: number) => void;
  claimBingo: () => void;
}

function emitMove(type: string, data?: unknown): void {
  getSocket().emit("game:move", { type, data });
}

export function useBingoBoard(props: BingoBoardProps): BingoBoardModel {
  const { state, players, selfId } = props;
  const { play } = useAudio();
  const haptics = useHaptics();
  const { locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<"myBoard" | "allBoards">("myBoard");

  const rosterById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const nameOf = useCallback(
    (id: string) => rosterById.get(id)?.name ?? "Player",
    [rosterById]
  );

  const isOver = state.phase === "finished" || state.isOver;
  const me = state.players.find((p) => p.id === selfId);
  const iHaveWon = me?.hasWon === true || state.winnerId === selfId;
  const canAttemptClaim = state.canClaimBingo && !iHaveWon && !isOver;
  const isMyTurn = state.isMyTurn;

  const currentTurnPlayerName = useMemo(() => {
    if (!state.currentTurnPlayerId) return "Waiting...";
    return nameOf(state.currentTurnPlayerId);
  }, [state.currentTurnPlayerId, nameOf]);

  const secondsUntilTurnTimeout = useTurnSecondsLeft(
    isOver ? null : state.callDeadline
  );

  /* ── The open number ──────────────────────────────────────────────── */

  const pendingNumber =
    state.markDeadline != null ? (state.lastCalledNumber?.value ?? null) : null;

  const secondsToMark = useTurnSecondsLeft(isOver ? null : state.markDeadline);

  const iHaveMarkedCurrent = me?.hasMarkedCurrent !== false;

  /**
   * Who the table is waiting on. Excludes me — I already know whether I have
   * marked, and naming myself in "waiting for…" reads as an accusation
   * rather than an explanation.
   */
  const waitingOn = useMemo(() => {
    if (pendingNumber == null) return [];
    return state.players
      .filter((p) => !p.hasMarkedCurrent && p.id !== selfId && p.isConnected)
      .map((p) => p.name);
  }, [state.players, pendingNumber, selfId]);

  /**
   * Did the window just mark a number for me?
   *
   * Worth surfacing: the rescue is invisible otherwise — the cell simply
   * fills in — so players never learn that missing one costs them nothing,
   * and switch on auto-mark out of an anxiety the rules do not justify.
   */
  const [wasAutoMarkedForMe, setWasAutoMarkedForMe] = useState(false);
  const unmarkedWhenOpen = useRef<number | null>(null);
  useEffect(() => {
    if (pendingNumber != null && !iHaveMarkedCurrent) {
      unmarkedWhenOpen.current = pendingNumber;
      setWasAutoMarkedForMe(false);
      return;
    }
    // The number closed while it was still unmarked by me → the window
    // marked it. Distinguishable from tapping, which clears the ref first.
    if (pendingNumber == null && unmarkedWhenOpen.current != null) {
      setWasAutoMarkedForMe(true);
      unmarkedWhenOpen.current = null;
      const t = window.setTimeout(() => setWasAutoMarkedForMe(false), 2200);
      return () => window.clearTimeout(t);
    }
  }, [pendingNumber, iHaveMarkedCurrent]);

  /* ── Calling out ──────────────────────────────────────────────────── */

  const [activeBallCalled, setActiveBallCalled] = useState<number | null>(null);
  const prevCalledCount = useRef<number>(0);
  useEffect(() => {
    if (state.calledNumbers.length > prevCalledCount.current) {
      const called = state.lastCalledNumber?.value;
      play(AUDIO.SYS_TICK);
      haptics.subtle();
      if (typeof called === "number") {
        announceNumber(called, locale);
        setActiveBallCalled(called);
        const t = window.setTimeout(() => setActiveBallCalled(null), 1200);
        return () => window.clearTimeout(t);
      }
    }
    prevCalledCount.current = state.calledNumbers.length;
  }, [state.calledNumbers, state.lastCalledNumber, play, haptics, locale]);

  // Never leave a number being spoken over the end of a round or a leave.
  useEffect(() => stopAnnouncing, []);

  const wonAlready = useRef(false);
  useEffect(() => {
    if (iHaveWon && !wonAlready.current) {
      play(AUDIO.SYS_SUCCESS);
    }
    wonAlready.current = iHaveWon;
  }, [iHaveWon, play]);

  const shuffleBoard = useCallback(() => {
    play(AUDIO.UI_CLICK);
    emitMove("shuffleBoard");
  }, [play]);

  const lockBoard = useCallback(() => {
    play(AUDIO.UI_CLICK);
    emitMove("lockBoard");
  }, [play]);

  const callNumber = useCallback(
    (num: number) => {
      play(AUDIO.UI_CLICK);
      emitMove("callNumber", { number: num });
    },
    [play]
  );

  const claimBingo = useCallback(() => {
    play(AUDIO.SYS_SUCCESS);
    emitMove("claimBingo");
  }, [play]);

  /**
   * Strike the open number off my card.
   *
   * Optimistically silent about success: the server is the only authority on
   * whether the mark landed, and it re-broadcasts within a frame or two.
   * Firing the feedback here rather than on the round trip is what makes the
   * tap feel like a pen hitting paper instead of a form submission.
   */
  const markNumber = useCallback(
    (num: number) => {
      play(AUDIO.UI_CLICK);
      haptics.subtle();
      emitMove("markNumber", { number: num });
    },
    [play, haptics]
  );

  const setAutoMark = useCallback(
    (on: boolean) => {
      play(AUDIO.UI_TOGGLE);
      emitMove("setAutoMark", { on });
    },
    [play]
  );

  return {
    state,
    players,
    selfId,
    messages: props.messages,
    roomCode: props.roomCode,
    onLeave: props.onLeave,
    onScorecardClose: props.onScorecardClose,

    nameOf,
    isOver,
    iHaveWon,
    canAttemptClaim,
    secondsUntilTurnTimeout: state.callDeadline != null ? secondsUntilTurnTimeout : null,
    isMyTurn,
    currentTurnPlayerName,

    activeTab,
    setActiveTab,

    pendingNumber,
    activeBallCalled,
    secondsToMark: state.markDeadline != null ? secondsToMark : null,
    iHaveMarkedCurrent,
    waitingOn,
    wasAutoMarkedForMe,
    autoMark: me?.autoMark === true,
    markNumber,
    setAutoMark,

    shuffleBoard,
    lockBoard,
    callNumber,
    claimBingo,
  };
}
