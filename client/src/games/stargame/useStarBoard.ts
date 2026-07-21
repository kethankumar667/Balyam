import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  Player,
  StarCard,
  StarPhase,
  StarPlayerPublic,
  StarPlayerView,
} from "@shared/types";
import { getStarTheme, type StarTheme } from "@shared/star-themes";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useBackgroundPause } from "../../hooks/useBackgroundPause";

/** Props handed down from Room.tsx to the gate, then to either shell. */
export interface StarBoardProps {
  state: StarPlayerView;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}

/** One seat: server public projection merged with lobby roster metadata. */
export interface StarSeat {
  id: string;
  pub: StarPlayerPublic;
  player: Player | undefined;
  name: string;
  isSelf: boolean;
  isBot: boolean;
  isConnected: boolean;
}

/**
 * Everything both Star Game shells render from. The hook owns all socket emits,
 * derivations and the phase-transition sound cues; the mobile/desktop shells are
 * pure presentational arrangements of these fields. Mount EXACTLY one shell so
 * the sound effect subscribes once (the viewport gate guarantees this).
 */
export interface StarBoardModel {
  state: StarPlayerView;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;

  theme: StarTheme;
  phase: StarPhase;
  round: number;
  totalRounds: number;

  /** clockwise seat order, merged with roster meta. */
  seats: StarSeat[];
  me: StarSeat | undefined;
  /** The player's own hand in LOCAL display order — reflects any drag
   *  reorder immediately (optimistic), reconciled with the server's card
   *  SET (not order) whenever it changes underneath (a card was received
   *  or passed away). See `reorderHand` below. */
  myHand: StarCard[];

  // Per-phase "it's on me" flags driving the action area.
  iNeedToSelect: boolean;
  iAmShuffling: boolean;
  /** Sequential relay: true only when it's THIS player's single turn to
   *  select-and-send, replacing the old simultaneous "hasn't passed yet". */
  iNeedToPass: boolean;
  iAmEligible: boolean;
  iCanStack: boolean;
  iAmWinner: boolean;

  deadline: number | null;
  nameOf: (id: string) => string;

  /** Whose turn to select+send during "pass", or null outside that phase. */
  currentPasserId: string | null;
  /** This round's designated relay starter, or null before the first shuffle. */
  starterId: string | null;
  /** seatOrder rotated to begin at starterId — the fixed relay route. */
  passOrder: string[];
  /** Most recent relay handoff, for the card-travel animation. Changes
   *  object identity every relay step (even same-direction repeats). */
  lastPass: { fromId: string; toId: string; cardId: string } | null;

  /** True while a bot other than the player owns the single active turn
   *  (shuffle or pass phase) — drives the "Bot is thinking…" indicator. */
  isBotThinking: boolean;
  thinkingBotId: string | null;

  /** Tab/app is currently backgrounded — shells use this to pause local
   *  animation sequences and block gesture completion, never to hide UI. */
  isBackgrounded: boolean;

  // Actions (all flow through game:move).
  selectValue: (value: string) => void;
  shuffle: () => void;
  armCard: (cardId: string) => void;
  pass: () => void;
  pressStar: () => void;
  placeHand: () => void;
  nextRound: () => void;
  /** Client-driven hand reorder (drag-and-drop). Optimistic locally,
   *  persisted server-side so auto-pass reads the player's own order. */
  reorderHand: (cardIds: string[]) => void;
}

function emitMove(type: string, data?: unknown): void {
  getSocket().emit("game:move", { type, data });
}

export function useStarBoard(props: StarBoardProps): StarBoardModel {
  const { state, players, selfId } = props;
  const { play } = useAudio();
  const { isBackgrounded } = useBackgroundPause();

  const theme = useMemo(() => getStarTheme(state.themeId), [state.themeId]);

  const rosterById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const seats = useMemo<StarSeat[]>(() => {
    const pubById = new Map<string, StarPlayerPublic>();
    for (const p of state.players) pubById.set(p.id, p);
    return state.seatOrder.map((id) => {
      const player = rosterById.get(id);
      return {
        id,
        pub: pubById.get(id) ?? {
          id,
          hasSelected: false,
          hasShuffled: false,
          hasPassed: false,
          hasStacked: false,
          score: 0,
          roundWins: 0,
          cardCount: 0,
          starEligible: false,
          stackRank: null,
        },
        player,
        name: player?.name ?? "Player",
        isSelf: id === selfId,
        isBot: player?.isBot === true,
        isConnected: player?.isConnected !== false,
      };
    });
  }, [state.players, state.seatOrder, rosterById, selfId]);

  const me = useMemo(() => seats.find((s) => s.isSelf), [seats, selfId]);

  const nameOf = useCallback(
    (id: string) => rosterById.get(id)?.name ?? "Player",
    [rosterById],
  );

  // ── Local hand order (drag reorder) ─────────────────────────────────────
  // Tracks the player's own preferred card order, reconciled against the
  // server's card SET (ids, unordered) whenever it changes — a received or
  // passed-away card rebuilds the order fresh from the server; a pure
  // reorder (same set, different arrangement) leaves the local order alone
  // so a drag never gets clobbered by an unrelated broadcast landing
  // mid-gesture (e.g. another player's move ticking `round`/`deadline`).
  const [handOrder, setHandOrder] = useState<string[]>(() => state.myHand.map((c) => c.id));
  const prevHandKeyRef = useRef<string>("");
  useEffect(() => {
    const key = [...state.myHand.map((c) => c.id)].sort().join(",");
    if (key !== prevHandKeyRef.current) {
      prevHandKeyRef.current = key;
      setHandOrder(state.myHand.map((c) => c.id));
    }
  }, [state.myHand]);

  const handById = useMemo(
    () => new Map(state.myHand.map((c) => [c.id, c] as const)),
    [state.myHand],
  );
  const myHand = useMemo<StarCard[]>(
    () => handOrder.map((id) => handById.get(id)).filter((c): c is StarCard => !!c),
    [handOrder, handById],
  );

  const reorderHand = useCallback((cardIds: string[]) => {
    setHandOrder(cardIds);
    emitMove("reorderHand", { cardIds });
  }, []);

  // Phase-transition sound cues. Silent until audio assets are mapped (keys are
  // wired; the AudioManager no-ops an unmapped key), but the wiring is complete.
  const prevPhase = useRef<StarPhase | null>(null);
  const prevWinner = useRef<string | null>(null);
  useEffect(() => {
    const p = state.phase;
    if (prevPhase.current !== p) {
      if (p === "shuffle") play(AUDIO.STAR_SHUFFLE);
      else if (p === "deal") play(AUDIO.STAR_DEAL);
      else if (p === "star") play(AUDIO.STAR_WHISTLE);
      else if (p === "handstack") play(AUDIO.STAR_STACK);
      prevPhase.current = p;
    }
    if (state.starWinnerId && prevWinner.current !== state.starWinnerId) {
      if (state.starWinnerId === selfId) play(AUDIO.STAR_WIN);
      prevWinner.current = state.starWinnerId;
    }
    if (!state.starWinnerId) prevWinner.current = null;
  }, [state.phase, state.starWinnerId, selfId, play]);

  // Card-travel sound cue — one-shot on every relay handoff (object changes
  // identity per step even when it's the same fromId/toId pair repeating).
  const prevLastPass = useRef<StarPlayerView["lastPass"]>(null);
  useEffect(() => {
    if (state.lastPass && state.lastPass !== prevLastPass.current) {
      play(AUDIO.STAR_PASS);
    }
    prevLastPass.current = state.lastPass;
  }, [state.lastPass, play]);

  const selectValue = useCallback((value: string) => { play(AUDIO.UI_CLICK); emitMove("selectValue", { value }); }, [play]);
  const shuffle = useCallback(() => { play(AUDIO.STAR_SHUFFLE); emitMove("shuffle"); }, [play]);
  const armCard = useCallback((cardId: string) => { play(AUDIO.UI_CLICK); emitMove("selectCard", { cardId }); }, [play]);
  const pass = useCallback(() => { emitMove("pass"); }, []);
  const pressStar = useCallback(() => { play(AUDIO.STAR_WHISTLE); emitMove("pressStar"); }, [play]);
  const placeHand = useCallback(() => { play(AUDIO.STAR_STACK); emitMove("placeHand"); }, [play]);
  const nextRound = useCallback(() => { play(AUDIO.UI_CLICK); emitMove("nextRound"); }, [play]);

  const iAmWinner = state.starWinnerId === selfId && selfId != null;

  const thinkingBotId = useMemo(() => {
    let actorId: string | null = null;
    if (state.phase === "shuffle") actorId = state.shuffleTurnId;
    else if (state.phase === "pass") actorId = state.currentPasserId;
    if (!actorId || actorId === selfId) return null;
    return rosterById.get(actorId)?.isBot ? actorId : null;
  }, [state.phase, state.shuffleTurnId, state.currentPasserId, selfId, rosterById]);

  return {
    state,
    players,
    selfId,
    messages: props.messages,
    roomCode: props.roomCode,

    theme,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,

    seats,
    me,
    myHand,

    iNeedToSelect: state.phase === "themeSelect" && !state.mySelectedValue,
    iAmShuffling: state.phase === "shuffle" && state.shuffleTurnId === selfId,
    iNeedToPass: state.phase === "pass" && state.currentPasserId === selfId,
    iAmEligible: state.phase === "star" && me?.pub.starEligible === true && state.starWinnerId == null,
    iCanStack: state.phase === "handstack" && !iAmWinner && me?.pub.hasStacked === false,
    iAmWinner,

    deadline: state.deadline,
    nameOf,

    currentPasserId: state.currentPasserId,
    starterId: state.starterId,
    passOrder: state.passOrder,
    lastPass: state.lastPass,

    isBotThinking: thinkingBotId != null,
    thinkingBotId,

    isBackgrounded,

    selectValue,
    shuffle,
    armCard,
    pass,
    pressStar,
    placeHand,
    nextRound,
    reorderHand,
  };
}
