import { useCallback, useEffect, useMemo, useRef } from "react";
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
  myHand: StarCard[];

  // Per-phase "it's on me" flags driving the action area.
  iNeedToSelect: boolean;
  iAmShuffling: boolean;
  iNeedToPass: boolean;
  iAmEligible: boolean;
  iCanStack: boolean;
  iAmWinner: boolean;

  deadline: number | null;
  nameOf: (id: string) => string;

  // Actions (all flow through game:move).
  selectValue: (value: string) => void;
  shuffle: () => void;
  armCard: (cardId: string) => void;
  pass: () => void;
  pressStar: () => void;
  placeHand: () => void;
  nextRound: () => void;
}

function emitMove(type: string, data?: unknown): void {
  getSocket().emit("game:move", { type, data });
}

export function useStarBoard(props: StarBoardProps): StarBoardModel {
  const { state, players, selfId } = props;
  const { play } = useAudio();

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

  const selectValue = useCallback((value: string) => { play(AUDIO.UI_CLICK); emitMove("selectValue", { value }); }, [play]);
  const shuffle = useCallback(() => { play(AUDIO.STAR_SHUFFLE); emitMove("shuffle"); }, [play]);
  const armCard = useCallback((cardId: string) => { play(AUDIO.UI_CLICK); emitMove("selectCard", { cardId }); }, [play]);
  const pass = useCallback(() => { play(AUDIO.STAR_PASS); emitMove("pass"); }, [play]);
  const pressStar = useCallback(() => { play(AUDIO.STAR_WHISTLE); emitMove("pressStar"); }, [play]);
  const placeHand = useCallback(() => { play(AUDIO.STAR_STACK); emitMove("placeHand"); }, [play]);
  const nextRound = useCallback(() => { play(AUDIO.UI_CLICK); emitMove("nextRound"); }, [play]);

  const iAmWinner = state.starWinnerId === selfId && selfId != null;

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
    myHand: state.myHand,

    iNeedToSelect: state.phase === "themeSelect" && !state.mySelectedValue,
    iAmShuffling: state.phase === "shuffle" && state.shuffleTurnId === selfId,
    iNeedToPass: state.phase === "pass" && me?.pub.hasPassed === false,
    iAmEligible: state.phase === "star" && me?.pub.starEligible === true && state.starWinnerId == null,
    iCanStack: state.phase === "handstack" && !iAmWinner && me?.pub.hasStacked === false,
    iAmWinner,

    deadline: state.deadline,
    nameOf,

    selectValue,
    shuffle,
    armCard,
    pass,
    pressStar,
    placeHand,
    nextRound,
  };
}
