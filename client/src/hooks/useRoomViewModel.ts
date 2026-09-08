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

/**
 * Most severe → least severe. Shared by the host's single aggregate
 * `startGameDisabledReason` below and by `dominantBlockerFor`/
 * `describeStartBlocker` (used per-player in `ParticipantRow`) so the two
 * surfaces can never silently drift into naming different blockers as "the"
 * reason for the same underlying `RoomStartReadiness` snapshot.
 */
export const BLOCKER_PRIORITY: readonly StartBlockReason[] = [
  "DISCONNECTED",
  "RECOVERING",
  "PAGE_NOT_VISIBLE",
  "ORIENTATION_REQUIRED",
  "ACKNOWLEDGEMENT_MISSING",
  "ACKNOWLEDGEMENT_EXPIRED",
  "NOT_READY",
  "REVISION_OUTDATED",
];

/** The single most-severe blocker in a player's own list, or null if they have none. */
export function dominantBlockerFor(
  blockers: readonly StartBlockReason[] | undefined
): StartBlockReason | null {
  if (!blockers || blockers.length === 0) return null;
  return BLOCKER_PRIORITY.find((b) => blockers.includes(b)) ?? blockers[0] ?? null;
}

/**
 * Player-specific, full-sentence description of a single blocker — the
 * per-row counterpart to the host-only aggregate reason below. Root-caused
 * 2026-09-09: the aggregate string was the ONLY readiness information any
 * client ever saw, and even that was host-only — a guest whose own teammate
 * needed to rotate their phone had no visibility into why the match hadn't
 * started. This is what `ParticipantRow` shows every player, for every
 * seat, in place of a plain "Waiting" badge once a start attempt is active.
 */
export function describeStartBlocker(
  reason: StartBlockReason,
  ctx: { playerName: string; requiredOrientation: "landscape" | "portrait" | null }
): string {
  const { playerName: name, requiredOrientation } = ctx;
  switch (reason) {
    case "DISCONNECTED":
      return `${name} disconnected — waiting for reconnection`;
    case "RECOVERING":
      return `${name} is reconnecting — please wait`;
    case "PAGE_NOT_VISIBLE":
      return `${name}'s app isn't in the foreground right now`;
    case "ORIENTATION_REQUIRED":
      return requiredOrientation
        ? `This game requires ${requiredOrientation} mode. ${name} needs to rotate their device to continue.`
        : `${name} needs to rotate their device to continue.`;
    case "ACKNOWLEDGEMENT_MISSING":
      return `${name} is confirming they're ready to start…`;
    case "ACKNOWLEDGEMENT_EXPIRED":
      return `${name} didn't confirm in time — retrying`;
    case "REVISION_OUTDATED":
      return `${name}'s app is syncing to the latest room state`;
    case "NOT_READY":
    default:
      return `${name} hasn't marked themselves ready yet`;
  }
}

/** Short pill label for the same blocker — paired with `describeStartBlocker`'s
 *  full sentence, which goes in the badge's `title` tooltip instead. */
export function shortStartBlockerLabel(reason: StartBlockReason): string {
  switch (reason) {
    case "DISCONNECTED":
      return "Disconnected";
    case "RECOVERING":
      return "Reconnecting";
    case "PAGE_NOT_VISIBLE":
      return "Away";
    case "ORIENTATION_REQUIRED":
      return "Rotate device";
    case "ACKNOWLEDGEMENT_MISSING":
    case "ACKNOWLEDGEMENT_EXPIRED":
      return "Confirming";
    case "REVISION_OUTDATED":
      return "Syncing";
    case "NOT_READY":
    default:
      return "Not ready";
  }
}

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
    // BLOCKER_PRIORITY is exported above and shared with `dominantBlockerFor`
    // (the per-player counterpart used in `ParticipantRow`) so the two
    // surfaces can never name different blockers as "the" reason for the
    // same `RoomStartReadiness` snapshot.
    const allBlockers = roomState.startReadiness.participants.flatMap(
      (p) => p.blockers as StartBlockReason[],
    );
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
