import type { DomainEvent, StateProjector } from "@shared/events/EventContracts";

/**
 * Executes a deterministic projection fold over an array of domain events.
 * Guarantees pure, side-effect-free state reconstruction.
 */
export function projectState<TState>(
  events: DomainEvent[],
  projector: StateProjector<TState>
): TState {
  let state = projector.initialState();
  for (const event of events) {
    try {
      state = projector.apply(state, event);
    } catch {
      // Ignore unhandled event folds gracefully to keep projection robust
    }
  }
  return state;
}

export interface ReconstructedRoomMetadata {
  code: string;
  game: string | null;
  hostId: string | null;
  players: { id: string; name: string }[];
  status: "waiting" | "playing" | "finished";
  winnerId: string | null;
  movesCount: number;
  chatsCount: number;
}

export const RoomMetadataProjector: StateProjector<ReconstructedRoomMetadata> = {
  name: "RoomMetadataProjector",
  initialState: () => ({
    code: "",
    game: null,
    hostId: null,
    players: [],
    status: "waiting",
    winnerId: null,
    movesCount: 0,
    chatsCount: 0,
  }),
  apply: (state, event) => {
    switch (event.type) {
      case "ROOM_CREATED": {
        const payload = event.payload as { code: string; game: string; hostId: string };
        return {
          ...state,
          code: payload.code,
          game: payload.game,
          hostId: payload.hostId,
        };
      }
      case "PLAYER_JOINED": {
        const payload = event.payload as { playerId: string; name: string };
        const exists = state.players.some((p) => p.id === payload.playerId);
        return {
          ...state,
          players: exists ? state.players : [...state.players, { id: payload.playerId, name: payload.name }],
        };
      }
      case "PLAYER_LEFT": {
        const payload = event.payload as { playerId: string };
        return {
          ...state,
          players: state.players.filter((p) => p.id !== payload.playerId),
        };
      }
      case "GAME_STARTED": {
        return {
          ...state,
          status: "playing",
        };
      }
      case "MOVE_MADE": {
        return {
          ...state,
          movesCount: state.movesCount + 1,
        };
      }
      case "CHAT_SENT": {
        return {
          ...state,
          chatsCount: state.chatsCount + 1,
        };
      }
      case "GAME_FINISHED": {
        const payload = event.payload as { winnerId: string | null };
        return {
          ...state,
          status: "finished",
          winnerId: payload.winnerId,
        };
      }
      default:
        return state;
    }
  },
};
