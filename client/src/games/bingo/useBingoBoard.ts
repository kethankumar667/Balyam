import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BingoPlayerState, ChatMessage, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

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

  const prevCalledCount = useRef<number>(0);
  useEffect(() => {
    if (state.calledNumbers.length > prevCalledCount.current) {
      play(AUDIO.SYS_TICK);
    }
    prevCalledCount.current = state.calledNumbers.length;
  }, [state.calledNumbers, play]);

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

    shuffleBoard,
    lockBoard,
    callNumber,
    claimBingo,
  };
}
