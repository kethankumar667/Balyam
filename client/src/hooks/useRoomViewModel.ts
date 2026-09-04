import { useMemo } from "react";
import type { GameKind, Player, RoomPublicState, StartBlockReason } from "@shared/types";
import {
  GAME_LIMITS,
  NO_BOT_GAMES,
  ECONOMY_MAX_APPROVED_SEAT_COUNT,
  isEconomySupportedSeatCount,
} from "@shared/catalog";

export const MAX_PLAYERS_BY_GAME: Record<GameKind, number> = Object.fromEntries(
  Object.entries(GAME_LIMITS).map(([k, v]) => [k, v.max])
) as Record<GameKind, number>;

export { NO_BOT_GAMES, ECONOMY_MAX_APPROVED_SEAT_COUNT, isEconomySupportedSeatCount };

export interface RoomViewModel {
  maxPlayers: number;
  availableSeats: number;
  isRoomFull: boolean;
  seatCountLabel: string;
  selfPlayer: Player | null;
  selfIsHost: boolean;
  selfIsReady: boolean;
  minPlayersNeeded: number;
  readyPlayersCount: number;
  totalPlayersCount: number;
  unreadyPlayersCount: number;
  allReady: boolean;
  isSeatCountSupported: boolean;
  canStartGame: boolean;
  startGameDisabledReason: string | null;
  noBotSupport: boolean;
  canAddBot: boolean;
  humanPlayers: Player[];
  botPlayers: Player[];
  localPlayers: Player[];
  colorPickerKind: "ludo" | "snl" | "dotsboxes" | null;
}

export function computeRoomViewModel(
  roomState: RoomPublicState | null,
  playerId: string | null
): RoomViewModel {
  if (!roomState) {
    return {
      maxPlayers: 4,
      availableSeats: 4,
      isRoomFull: false,
      seatCountLabel: "4 seats left",
      selfPlayer: null,
      selfIsHost: false,
      selfIsReady: false,
      minPlayersNeeded: 2,
      readyPlayersCount: 0,
      totalPlayersCount: 0,
      unreadyPlayersCount: 0,
      allReady: false,
      isSeatCountSupported: true,
      canStartGame: false,
      startGameDisabledReason: null,
      noBotSupport: false,
      canAddBot: false,
      humanPlayers: [],
      botPlayers: [],
      localPlayers: [],
      colorPickerKind: null,
    };
  }

  const game = roomState.game;
  const maxPlayers = MAX_PLAYERS_BY_GAME[game] ?? roomState.maxPlayers ?? 4;
  const players = roomState.players;
  const totalPlayersCount = players.length;
  const availableSeats = Math.max(0, maxPlayers - totalPlayersCount);
  const isRoomFull = availableSeats <= 0;

  const seatCountLabel = isRoomFull
    ? `Table Full (${totalPlayersCount}/${maxPlayers})`
    : availableSeats === 1
    ? "1 seat remaining"
    : `${availableSeats} seats remaining`;

  const selfPlayer = players.find((p) => p.id === playerId) ?? null;
  const selfIsHost = roomState.hostId === playerId;
  const selfIsReady = selfPlayer?.isReady ?? false;

  const minPlayersNeeded =
    game === "snake" || game === "carrom" || game === "spacewar" ? 1 : 2;

  const readyPlayers = players.filter((p) => p.isReady);
  const readyPlayersCount = readyPlayers.length;
  const unreadyPlayersCount = Math.max(0, totalPlayersCount - readyPlayersCount);

  const hasEnoughPlayers = totalPlayersCount >= minPlayersNeeded;
  const allReady = hasEnoughPlayers && players.every((p) => p.isReady);
  const isSeatCountSupported = isEconomySupportedSeatCount(totalPlayersCount, game);
  const canStartGame =
    selfIsHost && roomState.phase === "lobby" && allReady && isSeatCountSupported;

  let startGameDisabledReason: string | null = null;
  if (!selfIsHost) {
    startGameDisabledReason = "Waiting for host to start";
  } else if (!hasEnoughPlayers) {
    startGameDisabledReason = `Need at least ${minPlayersNeeded} player${
      minPlayersNeeded > 1 ? "s" : ""
    } to start`;
  } else if (!isSeatCountSupported) {
    const excess = totalPlayersCount - maxPlayers;
    startGameDisabledReason = `Table size exceeds maximum capacity (max ${maxPlayers} seats). Remove ${excess} player${excess > 1 ? "s" : ""} to start.`;
  } else if (!allReady) {
    startGameDisabledReason = `Waiting for ${unreadyPlayersCount} player${
      unreadyPlayersCount > 1 ? "s" : ""
    } to be ready`;
  } else if (roomState.startReadiness && !roomState.startReadiness.canStart) {
    // Server has an active start attempt in progress — surface the most
    // informative blocker reason across all participants so the host can act.
    // Priority (most severe → least): disconnected, recovering, not visible,
    // orientation required, ack missing/expired, revision outdated.
    const allBlockers = roomState.startReadiness.participants.flatMap(
      (p) => p.blockers as StartBlockReason[],
    );
    const BLOCKER_PRIORITY: readonly StartBlockReason[] = [
      "DISCONNECTED",
      "RECOVERING",
      "PAGE_NOT_VISIBLE",
      "ORIENTATION_REQUIRED",
      "ACKNOWLEDGEMENT_MISSING",
      "ACKNOWLEDGEMENT_EXPIRED",
      "NOT_READY",
      "REVISION_OUTDATED",
    ];
    const dominantBlocker = BLOCKER_PRIORITY.find((b) => allBlockers.includes(b));
    if (dominantBlocker === "DISCONNECTED") {
      startGameDisabledReason = "A player has disconnected — waiting for them to reconnect";
    } else if (dominantBlocker === "RECOVERING") {
      startGameDisabledReason = "A player is reconnecting — please wait";
    } else if (dominantBlocker === "PAGE_NOT_VISIBLE") {
      startGameDisabledReason = "Waiting for all players to return to the game";
    } else if (dominantBlocker === "ORIENTATION_REQUIRED") {
      startGameDisabledReason = "A player still needs to rotate their device";
    } else if (
      dominantBlocker === "ACKNOWLEDGEMENT_MISSING" ||
      dominantBlocker === "ACKNOWLEDGEMENT_EXPIRED"
    ) {
      startGameDisabledReason = "Waiting for all players to confirm readiness";
    } else {
      startGameDisabledReason = "Waiting for all players to be ready";
    }
  }

  const noBotSupport = NO_BOT_GAMES.has(game);
  const canAddBot =
    selfIsHost && !isRoomFull && !noBotSupport && roomState.phase === "lobby";

  const humanPlayers = players.filter((p) => !p.isBot && !p.isLocal);
  const botPlayers = players.filter((p) => p.isBot);
  const localPlayers = players.filter((p) => p.isLocal);

  const colorPickerKind =
    game === "ludo" ? "ludo" : game === "snl" ? "snl" : game === "dotsboxes" ? "dotsboxes" : null;

  return {
    maxPlayers,
    availableSeats,
    isRoomFull,
    seatCountLabel,
    selfPlayer,
    selfIsHost,
    selfIsReady,
    minPlayersNeeded,
    readyPlayersCount,
    totalPlayersCount,
    unreadyPlayersCount,
    allReady,
    isSeatCountSupported,
    canStartGame,
    startGameDisabledReason,
    noBotSupport,
    canAddBot,
    humanPlayers,
    botPlayers,
    localPlayers,
    colorPickerKind,
  };
}

export function useRoomViewModel(
  roomState: RoomPublicState | null,
  playerId: string | null
): RoomViewModel {
  return useMemo(() => computeRoomViewModel(roomState, playerId), [roomState, playerId]);
}
