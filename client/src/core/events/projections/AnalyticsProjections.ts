import type { StateProjector } from "@shared/events/EventContracts";

export interface MatchDurationResult {
  game: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number;
  winnerId: string | null;
  isCompleted: boolean;
}

export const MatchDurationProjection: StateProjector<MatchDurationResult> = {
  name: "MatchDurationProjection",
  initialState: () => ({
    game: null,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
    winnerId: null,
    isCompleted: false,
  }),
  apply: (state, event) => {
    if (event.type === "GAME_STARTED") {
      const payload = event.payload as { game: string; timestamp: number };
      return {
        ...state,
        game: payload.game,
        startedAt: payload.timestamp ?? event.timestamp,
      };
    }

    if (event.type === "GAME_FINISHED") {
      const payload = event.payload as { winnerId: string | null; timestamp: number };
      const finishedAt = payload.timestamp ?? event.timestamp;
      const startedAt = state.startedAt ?? event.timestamp;
      const durationSeconds = Math.max(0, Math.round((finishedAt - startedAt) / 1000));

      return {
        ...state,
        finishedAt,
        durationSeconds,
        winnerId: payload.winnerId,
        isCompleted: true,
      };
    }

    return state;
  },
};

export interface RoomActivityMetrics {
  totalEvents: number;
  movesCount: number;
  chatsCount: number;
  recoveryCount: number;
  errorsCount: number;
  tabSwitchesCount: number;
}

export const RoomActivityProjection: StateProjector<RoomActivityMetrics> = {
  name: "RoomActivityProjection",
  initialState: () => ({
    totalEvents: 0,
    movesCount: 0,
    chatsCount: 0,
    recoveryCount: 0,
    errorsCount: 0,
    tabSwitchesCount: 0,
  }),
  apply: (state, event) => {
    const updated: RoomActivityMetrics = {
      ...state,
      totalEvents: state.totalEvents + 1,
    };

    switch (event.type) {
      case "MOVE_MADE":
        updated.movesCount += 1;
        break;
      case "CHAT_SENT":
        updated.chatsCount += 1;
        break;
      case "RECOVERY_STARTED":
      case "RECOVERY_SUCCEEDED":
        updated.recoveryCount += 1;
        break;
      case "ERROR_OCCURRED":
        updated.errorsCount += 1;
        break;
      case "TAB_HIDDEN":
      case "TAB_VISIBLE":
      case "APP_BACKGROUND":
      case "APP_FOREGROUND":
        updated.tabSwitchesCount += 1;
        break;
    }

    return updated;
  },
};

export interface PlayerRetentionItem {
  playerId: string;
  name: string;
  joinedAt: number;
  leftAt: number | null;
  activeMs: number;
}

export interface PlayerRetentionResult {
  players: Record<string, PlayerRetentionItem>;
}

export const PlayerRetentionProjection: StateProjector<PlayerRetentionResult> = {
  name: "PlayerRetentionProjection",
  initialState: () => ({
    players: {},
  }),
  apply: (state, event) => {
    if (event.type === "PLAYER_JOINED") {
      const payload = event.payload as { playerId: string; name: string };
      const current = state.players[payload.playerId] ?? {
        playerId: payload.playerId,
        name: payload.name,
        joinedAt: event.timestamp,
        leftAt: null,
        activeMs: 0,
      };

      return {
        players: {
          ...state.players,
          [payload.playerId]: {
            ...current,
            name: payload.name,
            joinedAt: current.joinedAt || event.timestamp,
            leftAt: null,
          },
        },
      };
    }

    if (event.type === "PLAYER_LEFT") {
      const payload = event.payload as { playerId: string };
      const current = state.players[payload.playerId];
      if (!current) return state;

      const activeMs = event.timestamp - current.joinedAt;
      return {
        players: {
          ...state.players,
          [payload.playerId]: {
            ...current,
            leftAt: event.timestamp,
            activeMs: Math.max(0, activeMs),
          },
        },
      };
    }

    return state;
  },
};
