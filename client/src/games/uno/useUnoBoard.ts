import { useEffect, useMemo, useState } from "react";
import type {
  ChatMessage,
  Player,
  UnoCard,
  UnoColor,
  UnoPlayerState,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useAudio } from "../../hooks/useAudio";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { AUDIO } from "../../constants/audio";
import { useUnoStore } from "../../store/unoStore";
import { sortHand } from "./helpers/deck";
import {
  canPlayCard,
  getPlayableCards,
  requiresColorChoice,
} from "./helpers/validation";

/**
 * Props passed from {@link Room.tsx} into the UNO board. Shared verbatim by the
 * picker, both shells, and this hook so the layout split stays contract-stable.
 */
export interface UnoBoardProps {
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  onLeave: () => void;
  /** Fired once the player dismisses UnoResultModal — lets Room.tsx run its
   *  generic post-match flow (GameOverScreen) afterward, same contract as
   *  RummyBoard/RpsBoard/HandCricketBoard's own scorecards. */
  onScorecardClose?: () => void;
}

/**
 * Everything the mobile and desktop shells need to render. The shells are pure
 * presentation; ALL state, effects, socket emits, and derived memos live here so
 * the logic runs exactly once in whichever shell the picker mounts.
 */
export interface UnoBoardModel {
  /** Raw server state — shells read scalar fields off this directly. */
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  onLeave: () => void;

  myTurn: boolean;
  /** Display name for the player whose turn it currently is. */
  currentPlayer: string;
  /** Resolved winner once the game is finished, else null. */
  winner: Player | null;
  nameOf: (id: string) => string;

  /** Ids of cards that are legal to play right now (built once per hand). */
  validMoveIds: Set<string>;
  sortedHand: UnoCard[];
  selectedCard: UnoCard | undefined;
  selectedCardId: string | null;
  selectedWildColor: UnoColor | null;
  needsColorChoice: boolean;

  canSubmitPlay: boolean;
  canDraw: boolean;
  canPassTurn: boolean;
  drewThisTurn: boolean;

  /** True when the caller's own hand is exactly 1 card and not yet declared. */
  canDeclareUno: boolean;
  /** Opponent ids currently sitting on an undeclared 1-card hand — catchable. */
  catchableOpponents: string[];
  /** Non-null while a Wild Draw Four decision is outstanding (server-driven). */
  pendingChallenge: { challengerId: string; playedById: string } | null;
  /** True when the caller is the player who must accept or challenge right now. */
  isChallengeTarget: boolean;

  /** True once the player has dismissed UnoResultModal for this round. */
  scorecardDismissed: boolean;
  dismissScorecard: () => void;

  setSelectedCard: (cardId: string | null) => void;
  setWildColor: (color: UnoColor | null) => void;
  playCard: () => void;
  drawCard: () => void;
  passTurn: () => void;
  declareUno: () => void;
  catchUno: (targetId: string) => void;
  challengeWildFour: () => void;
  acceptWildFourDraw: () => void;
}

/**
 * UNO board logic hook — the former `UnoBoard` component body minus its JSX.
 * Subscribes haptics/audio, owns the turn lifecycle, and exposes the play/draw/
 * pass emits unchanged (same payload shape, same `playerId` proxy).
 */
export function useUnoBoard({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
  onLeave,
  onScorecardClose,
}: UnoBoardProps): UnoBoardModel {
  const myTurn = state.turnPlayerId === selfId && state.phase === "playing";

  // Haptic cue on turn
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // Audio for game events
  const { play: playSound } = useAudio();

  // Local UI state
  const {
    selectedCardId,
    setSelectedCard,
    selectedWildColor,
    setWildColor,
    reset: resetUIState,
  } = useUnoStore();

  // Game loop state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drewThisTurn, setDrewThisTurn] = useState(false);
  const [scorecardDismissed, setScorecardDismissed] = useState(false);

  // A rematch starts a fresh round (`phase` flips back to "playing") — reset
  // so UnoResultModal is ready to show again next time the round ends.
  useEffect(() => {
    if (state.phase === "playing") setScorecardDismissed(false);
  }, [state.phase]);

  function dismissScorecard() {
    setScorecardDismissed(true);
    onScorecardClose?.();
  }

  // Reset UI state on new turn
  useEffect(() => {
    if (myTurn) {
      resetUIState();
      setDrewThisTurn(false);
    }
  }, [state.turnPlayerId, myTurn, resetUIState]);

  // Reset UI on game over. Only the winner gets a sound — Volume 8 §25
  // ("defeat should remain respectful... avoid negative effects") argues
  // against a "you lost" sting, so everyone else stays silent here rather
  // than getting a defeat-flavoured cue.
  useEffect(() => {
    if (state.phase === "finished") {
      resetUIState();
      if (state.winnerId != null && state.winnerId === selfId) {
        playSound(AUDIO.UNO_WIN);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, resetUIState]);

  // The real double-submit guard. Each emit (play/draw/pass) sets `isSubmitting`;
  // we clear it only once the server echoes a fresh `state` — the authoritative
  // turn transition. A frantic double-tap between the emit and that echo is
  // dropped because the second tap still sees `isSubmitting === true`. Replaces
  // the old synchronous true→false in drawCard/passTurn (which never blocked
  // anything) and also releases the play() lock that previously stuck on.
  useEffect(() => {
    setIsSubmitting(false);
  }, [state]);

  // Player name lookup — Map built once per roster instead of a find per call.
  const nameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players]
  );
  const nameOf = (id: string): string => nameById.get(id) ?? "?";

  // Compute valid moves, then index by id so the hand fan is an O(1) `has`
  // check per card instead of a linear `find` per card.
  const validMoves = useMemo(
    () => getPlayableCards(state.myHand, state.topCard, state.currentColor),
    [state.myHand, state.topCard, state.currentColor]
  );
  const validMoveIds = useMemo(
    () => new Set(validMoves.map((c) => c.id)),
    [validMoves]
  );

  const selectedCard = useMemo(
    () => state.myHand.find((c) => c.id === selectedCardId),
    [state.myHand, selectedCardId]
  );

  const canPlaySelectedCard =
    selectedCard && canPlayCard(selectedCard, state.topCard, state.currentColor);

  const needsColorChoice = selectedCard ? requiresColorChoice(selectedCard) : false;
  const colorChosen = !needsColorChoice || selectedWildColor !== null;

  const canSubmitPlay = Boolean(canPlaySelectedCard && colorChosen && !isSubmitting);
  const canDraw = myTurn && !drewThisTurn && !isSubmitting;
  const canPassTurn = myTurn && drewThisTurn && !isSubmitting;

  // Sorted hand for display
  const sortedHand = useMemo(() => sortHand(state.myHand), [state.myHand]);

  // Send move
  function playCard() {
    if (!canSubmitPlay || !selectedCard) return;

    playSound(
      selectedCard.rank === "Wild" || selectedCard.rank === "Wild+4"
        ? AUDIO.UNO_WILD
        : AUDIO.UNO_PLAY
    );

    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "play",
      data: {
        cardId: selectedCard.id,
        color: selectedWildColor || selectedCard.color,
      },
      playerId: selfId ?? undefined,
    });

    setSelectedCard(null);
    setWildColor(null);
  }

  function drawCard() {
    if (!canDraw) return;
    playSound(AUDIO.UNO_DRAW);
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "draw",
      playerId: selfId ?? undefined,
    });
    setDrewThisTurn(true);
  }

  function passTurn() {
    if (!canPassTurn) return;
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "pass",
      playerId: selfId ?? undefined,
    });
    setDrewThisTurn(false);
  }

  // Declare / catch / challenge — none of these are gated by "myTurn": the
  // server (UnoEngine.applyMove) accepts them from any seated player at any
  // time, matching official UNO's "before the next turn begins" / "any
  // player may notice" rules. Gating the UI the same way (not on isSubmitting-
  // free turn state) keeps the client's affordances honest about what the
  // server will actually accept.
  const canDeclareUno =
    selfId !== null &&
    state.myHand.length === 1 &&
    !state.unoDeclaredBy.includes(selfId) &&
    !isSubmitting;

  const catchableOpponents = state.playerOrder.filter(
    (id) => id !== selfId && state.handSizes[id] === 1 && !state.unoDeclaredBy.includes(id)
  );

  const pendingChallenge = state.pendingChallenge;
  const isChallengeTarget = pendingChallenge?.challengerId === selfId;

  function declareUno() {
    if (!canDeclareUno) return;
    playSound(AUDIO.UNO_DECLARED);
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "declareUno",
      playerId: selfId ?? undefined,
    });
  }

  function catchUno(targetId: string) {
    if (isSubmitting) return;
    if (!catchableOpponents.includes(targetId)) return;
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "catchUno",
      data: { targetId },
      playerId: selfId ?? undefined,
    });
  }

  function challengeWildFour() {
    if (!isChallengeTarget || isSubmitting) return;
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "challenge",
      playerId: selfId ?? undefined,
    });
  }

  function acceptWildFourDraw() {
    if (!isChallengeTarget || isSubmitting) return;
    setIsSubmitting(true);
    getSocket().emit("game:move", {
      type: "acceptDraw",
      playerId: selfId ?? undefined,
    });
  }

  const currentPlayer = nameOf(state.turnPlayerId);
  const winner = state.winnerId
    ? players.find((p) => p.id === state.winnerId) ?? null
    : null;

  return {
    state,
    players,
    selfId,
    messages,
    roomCode,
    roomPhase,
    onLeave,
    myTurn,
    currentPlayer,
    winner,
    nameOf,
    validMoveIds,
    sortedHand,
    selectedCard,
    selectedCardId,
    selectedWildColor,
    needsColorChoice,
    canSubmitPlay,
    canDraw,
    canPassTurn,
    drewThisTurn,
    canDeclareUno,
    catchableOpponents,
    pendingChallenge,
    isChallengeTarget,
    scorecardDismissed,
    dismissScorecard,
    setSelectedCard,
    setWildColor,
    playCard,
    drawCard,
    passTurn,
    declareUno,
    catchUno,
    challengeWildFour,
    acceptWildFourDraw,
  };
}
