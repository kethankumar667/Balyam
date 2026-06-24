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

  setSelectedCard: (cardId: string | null) => void;
  setWildColor: (color: UnoColor | null) => void;
  playCard: () => void;
  drawCard: () => void;
  passTurn: () => void;
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

  // Reset UI state on new turn
  useEffect(() => {
    if (myTurn) {
      resetUIState();
      setDrewThisTurn(false);
    }
  }, [state.turnPlayerId, myTurn, resetUIState]);

  // Reset UI on game over
  useEffect(() => {
    if (state.phase === "finished") {
      resetUIState();
    }
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
    setSelectedCard,
    setWildColor,
    playCard,
    drawCard,
    passTurn,
  };
}
