import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BingoPlayerState, ChatMessage, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import type { BingoSeat } from "./bingo-shared";

/** Props handed down from Room.tsx to the picker, then to either shell. */
export interface BingoBoardProps {
  state: BingoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  onLeave: () => void;
  /** Dismisses this board's own result modal and hands off to the
   * platform's generic GameOverScreen — same contract as Rummy/RPS/
   * HandCricket/UNO's own scorecards (see Room.tsx's GAMES_WITH_OWN_SCORECARD). */
  onScorecardClose: () => void;
}

/**
 * Everything both Bingo shells render from. The hook owns the socket emit
 * and every derived value; the mobile/desktop shells are pure layout over
 * this model — same split as useStarBoard/useUnoBoard.
 */
export interface BingoBoardModel {
  state: BingoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  onLeave: () => void;
  onScorecardClose: () => void;

  seats: BingoSeat[];
  nameOf: (id: string) => string;

  isOver: boolean;
  iHaveWon: boolean;
  /** Round is live, I haven't won yet, and (under stopOnFirstWin) nobody
   * else has either — the only gate on showing the Claim button at all.
   * The button stays enabled regardless of whether MY board actually has
   * a valid pattern — the server is the sole authority on that (see
   * AGENTS.md §14: never branch truth by pre-validating a server-owned
   * decision client-side); an invalid tap just surfaces a toast. */
  canAttemptClaim: boolean;
  secondsUntilNextCall: number | null;

  claim: () => void;
}

function emitMove(type: string): void {
  getSocket().emit("game:move", { type });
}

export function useBingoBoard(props: BingoBoardProps): BingoBoardModel {
  const { state, players, selfId } = props;
  const { play } = useAudio();

  const rosterById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const nameOf = useCallback(
    (id: string) => rosterById.get(id)?.name ?? "Player",
    [rosterById],
  );

  const seats = useMemo<BingoSeat[]>(
    () =>
      state.players.map((p) => ({
        id: p.id,
        name: nameOf(p.id),
        markedCount: p.markedCount,
        hasWon: p.hasWon,
        isBot: p.isBot,
        isConnected: p.isConnected,
        isSelf: p.id === selfId,
      })),
    [state.players, nameOf, selfId],
  );

  const isOver = state.phase === "finished";
  const me = state.players.find((p) => p.id === selfId);
  const iHaveWon = me?.hasWon === true;
  const canAttemptClaim =
    !isOver && !iHaveWon && (!state.stopOnFirstWin || state.winners.length === 0);

  const secondsUntilNextCall = useTurnSecondsLeft(isOver ? null : state.callDeadline);

  // Call-tick cue — one-shot per new number, mirrors StarGame's
  // phase-transition sound pattern (identity/order tracked, not content).
  const prevCallOrder = useRef<number | null>(null);
  useEffect(() => {
    const order = state.currentCall?.order ?? null;
    if (order != null && order !== prevCallOrder.current) {
      play(AUDIO.SYS_TICK);
    }
    prevCallOrder.current = order;
  }, [state.currentCall, play]);

  // Win cue — fires once, only for the player who actually won.
  const wonAlready = useRef(false);
  useEffect(() => {
    if (iHaveWon && !wonAlready.current) {
      play(AUDIO.SYS_SUCCESS);
    }
    wonAlready.current = iHaveWon;
  }, [iHaveWon, play]);

  const claim = useCallback(() => {
    play(AUDIO.UI_CLICK);
    emitMove("claim");
  }, [play]);

  return {
    state,
    players,
    selfId,
    messages: props.messages,
    roomCode: props.roomCode,
    onLeave: props.onLeave,
    onScorecardClose: props.onScorecardClose,

    seats,
    nameOf,

    isOver,
    iHaveWon,
    canAttemptClaim,
    secondsUntilNextCall: state.callDeadline != null ? secondsUntilNextCall : null,

    claim,
  };
}
