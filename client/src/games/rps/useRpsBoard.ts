import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  Player,
  ReactionRecvPayload,
  RpsChoice,
  RpsState,
} from "@shared/types";
import { getSocket } from "../../lib/socket";

/**
 * Client-side RPS state: the server `RpsState` augmented with the per-player
 * `currentChoices` map that `Room.tsx` injects. Preserved exactly as the
 * single board declared it — both shells and the hook share this shape.
 */
export interface ClientRpsState extends RpsState {
  currentChoices: Partial<Record<string, RpsChoice>>;
}

export type RoundOutcome = "you-win" | "you-lose" | "tie";

/** Props handed down from `Room.tsx` → picker → either shell. */
export interface RpsBoardProps {
  state: ClientRpsState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}

/**
 * Everything the mobile and desktop shells need to render. The hook owns ALL
 * state, effects, socket emits/listeners and derived values; the shells are
 * pure presentational arrangements of these fields.
 */
export interface RpsBoardModel {
  // Raw passthrough (so shells read everything off one object).
  state: ClientRpsState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  // Identities.
  me: Player | undefined;
  opponent: Player | undefined;
  myId: string;
  // Round-in-progress derivations.
  myChoice: RpsChoice | null;
  oppChoice: RpsChoice | null;
  bothChose: boolean;
  // Score / streak derivations.
  target: number;
  myScore: number;
  oppScore: number;
  myStreak: number;
  oppStreak: number;
  myMatchPoint: boolean;
  oppMatchPoint: boolean;
  // Reveal + banner.
  revealKey: number;
  bannerOutcome: RoundOutcome | null;
  // Overlay feeds.
  reactions: ReactionRecvPayload[];
  rains: { id: string; emoji: string }[];
  confettiUntil: number;
  // Actions + helpers.
  pick: (c: RpsChoice) => void;
  rematch: () => void;
  nameOf: (id: string) => string;
  reactionAnchor: (playerId: string) => { left: number; top: number } | null;
  /** Ref-setter for a player score card; feeds the reaction anchor lookup. */
  registerCardRef: (id: string | null) => (el: HTMLDivElement | null) => void;
}

/**
 * The original `RpsBoard` component body, minus the JSX. Subscribes the reveal
 * banner, reaction/emoji-rain and confetti effects exactly once, so the picker
 * must mount only ONE shell that calls this hook.
 */
export function useRpsBoard(props: RpsBoardProps): RpsBoardModel {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;

  const opponent = players.find((p) => p.id !== selfId);
  const me = players.find((p) => p.id === selfId);
  const myId = selfId ?? "";

  const myChoice = (selfId && state.currentChoices[selfId]) || null;
  const oppChoice = (opponent && state.currentChoices[opponent.id]) || null;
  const bothChose = !!myChoice && !!oppChoice;
  const lastResult = state.history[state.history.length - 1];

  function pick(c: RpsChoice) {
    if (myChoice || state.isOver) return;
    getSocket().emit("game:move", { type: "choose", data: { choice: c } });
  }

  function rematch() {
    getSocket().emit("game:move", { type: "rematch" });
  }

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  // Reveal + outcome banner (driven by state.lastRevealTs) -------------------
  const [revealKey, setRevealKey] = useState(0);
  const [bannerOutcome, setBannerOutcome] = useState<RoundOutcome | null>(null);
  const prevRevealRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.lastRevealTs || state.lastRevealTs === prevRevealRef.current) return;
    prevRevealRef.current = state.lastRevealTs;
    setRevealKey((k) => k + 1);
    if (lastResult) {
      const outcome: RoundOutcome = !lastResult.winnerId
        ? "tie"
        : lastResult.winnerId === myId
        ? "you-win"
        : "you-lose";
      setBannerOutcome(outcome);
      const t = setTimeout(() => setBannerOutcome(null), 1300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastRevealTs]);

  // Reactions + emoji rain ---------------------------------------------------
  const [reactions, setReactions] = useState<ReactionRecvPayload[]>([]);
  const [rains, setRains] = useState<{ id: string; emoji: string }[]>([]);
  const playerCardRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    const onReaction = (r: ReactionRecvPayload) => {
      setReactions((prev) => [...prev, r]);
      setRains((prev) => [...prev.slice(-2), { id: r.id, emoji: r.emoji }]);
      setTimeout(() => setReactions((p) => p.filter((x) => x.id !== r.id)), 2000);
      setTimeout(() => setRains((p) => p.filter((x) => x.id !== r.id)), 3200);
    };
    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, []);

  const registerCardRef = useCallback(
    (id: string | null) => (el: HTMLDivElement | null) => {
      if (!id) return;
      if (el) playerCardRefs.current.set(id, el);
      else playerCardRefs.current.delete(id);
    },
    [],
  );

  function reactionAnchor(playerId: string): { left: number; top: number } | null {
    const el = playerCardRefs.current.get(playerId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: ((r.left + r.width / 2) / window.innerWidth) * 100,
      top: (r.top / window.innerHeight) * 100,
    };
  }

  // Streak + score helpers ---------------------------------------------------
  const target = state.target;
  const myScore = state.scores[myId] ?? 0;
  const oppScore = opponent ? state.scores[opponent.id] ?? 0 : 0;
  const myStreak = state.streak[myId] ?? 0;
  const oppStreak = opponent ? state.streak[opponent.id] ?? 0 : 0;
  const myMatchPoint = myScore === target - 1;
  const oppMatchPoint = oppScore === target - 1;

  // Confetti when this player wins the match
  const [confettiUntil, setConfettiUntil] = useState(0);
  const prevWinnerRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.winnerId && state.winnerId !== prevWinnerRef.current) {
      prevWinnerRef.current = state.winnerId;
      if (state.winnerId === myId) {
        setConfettiUntil(Date.now() + 3400);
      }
    } else if (!state.winnerId) {
      prevWinnerRef.current = null;
    }
  }, [state.winnerId, myId]);

  return {
    state,
    players,
    selfId,
    messages,
    roomCode,
    roomPhase,
    me,
    opponent,
    myId,
    myChoice,
    oppChoice,
    bothChose,
    target,
    myScore,
    oppScore,
    myStreak,
    oppStreak,
    myMatchPoint,
    oppMatchPoint,
    revealKey,
    bannerOutcome,
    reactions,
    rains,
    confettiUntil,
    pick,
    rematch,
    nameOf,
    reactionAnchor,
    registerCardRef,
  };
}
