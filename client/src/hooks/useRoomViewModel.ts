import { useMemo } from "react";
import type { GameKind, Player, RoomPublicState } from "@shared/types";

export const MAX_PLAYERS_BY_GAME: Record<GameKind, number> = {
  rps: 2,
  rummy: 6,
  ludo: 8,
  snl: 10,
  handcricket: 2,
  uno: 8,
  wordbuilding: 4,
  dotsboxes: 6,
  stargame: 8,
  bingo: 8,
  namesplaceanimal: 8,
  tambola: 8,
  snake: 4,
  carrom: 2,
  roadrash: 4,
  chess: 2,
  blockblast: 8,
  spacewar: 1,
};

export const NO_BOT_GAMES: ReadonlySet<GameKind> = new Set<GameKind>([
  "snake",
  "roadrash",
  "spacewar",
]);

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
  canStartGame: boolean;
  startGameDisabledReason: string | null;
  noBotSupport: boolean;
  canAddBot: boolean;
  humanPlayers: Player[];
  botPlayers: Player[];
  localPlayers: Player[];
  colorPickerKind: "ludo" | "snl" | null;
}

export function useRoomViewModel(
  roomState: RoomPublicState | null,
  playerId: string | null
): RoomViewModel {
  return useMemo(() => {
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
    const canStartGame =
      selfIsHost && roomState.phase === "lobby" && allReady;

    let startGameDisabledReason: string | null = null;
    if (!selfIsHost) {
      startGameDisabledReason = "Waiting for host to start";
    } else if (!hasEnoughPlayers) {
      startGameDisabledReason = `Need at least ${minPlayersNeeded} player${
        minPlayersNeeded > 1 ? "s" : ""
      } to start`;
    } else if (!allReady) {
      startGameDisabledReason = `Waiting for ${unreadyPlayersCount} player${
        unreadyPlayersCount > 1 ? "s" : ""
      } to be ready`;
    }

    const noBotSupport = NO_BOT_GAMES.has(game);
    const canAddBot =
      selfIsHost && !isRoomFull && !noBotSupport && roomState.phase === "lobby";

    const humanPlayers = players.filter((p) => !p.isBot && !p.isLocal);
    const botPlayers = players.filter((p) => p.isBot);
    const localPlayers = players.filter((p) => p.isLocal);

    const colorPickerKind =
      game === "ludo" ? "ludo" : game === "snl" ? "snl" : null;

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
      canStartGame,
      startGameDisabledReason,
      noBotSupport,
      canAddBot,
      humanPlayers,
      botPlayers,
      localPlayers,
      colorPickerKind,
    };
  }, [roomState, playerId]);
}
