import { create } from "zustand";
import type {
  OperationalRoomSummary,
  OperationalRecoverySummary,
  PlatformHealthCounters,
  PlatformTickPayload,
  GameKind,
  RoomLifecycleState,
} from "@shared/types";

export type StreamConnectionStatus = "connected" | "reconnecting" | "offline";

export interface AdminLiveFilterState {
  searchQuery: string;
  gameFilter: GameKind | "all";
  lifecycleFilter: RoomLifecycleState | "all";
  sortBy: "code" | "game" | "age" | "duration" | "players" | "lifecycleState";
  sortDirection: "asc" | "desc";
}

export interface AdminLiveState {
  platform: PlatformHealthCounters | null;
  rooms: OperationalRoomSummary[];
  recovery: OperationalRecoverySummary | null;
  connectionStatus: StreamConnectionStatus;
  lastTickAt: number | null;
  isLoading: boolean;
  error: string | null;
  /** Set once a 401 has come back from either the SSE stream or the REST
   *  fallback. While true, `operationalStream.ts` deliberately stops
   *  retrying — a changed/refreshed credential is what clears it (see
   *  `retryAdminLiveConnection`), never a timer. */
  isUnauthorized: boolean;
  filters: AdminLiveFilterState;

  // Actions
  ingestTick: (payload: PlatformTickPayload) => void;
  setRooms: (rooms: OperationalRoomSummary[]) => void;
  setPlatformCounters: (platform: PlatformHealthCounters) => void;
  setRecoverySummary: (recovery: OperationalRecoverySummary) => void;
  setConnectionStatus: (status: StreamConnectionStatus) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setUnauthorized: (isUnauthorized: boolean) => void;
  /** Logout / hard-stop: clears every piece of operational data this store
   *  holds, not just the connection status — a signed-out session should not
   *  keep showing whatever platform snapshot was last on screen. */
  resetOperationalState: () => void;
  setSearchQuery: (query: string) => void;
  setGameFilter: (game: GameKind | "all") => void;
  setLifecycleFilter: (state: RoomLifecycleState | "all") => void;
  setSorting: (sortBy: AdminLiveFilterState["sortBy"], sortDirection?: "asc" | "desc") => void;
  resetFilters: () => void;
}

export const useAdminLiveStore = create<AdminLiveState>((set) => ({
  platform: null,
  rooms: [],
  recovery: null,
  connectionStatus: "offline",
  lastTickAt: null,
  isLoading: true,
  error: null,
  isUnauthorized: false,
  filters: {
    searchQuery: "",
    gameFilter: "all",
    lifecycleFilter: "all",
    sortBy: "age",
    sortDirection: "desc",
  },

  ingestTick: (payload) =>
    set({
      platform: payload.platform,
      rooms: payload.rooms,
      recovery: payload.recovery,
      lastTickAt: payload.timestamp,
      isLoading: false,
      error: null,
    }),

  setRooms: (rooms) => set({ rooms }),
  setPlatformCounters: (platform) => set({ platform }),
  setRecoverySummary: (recovery) => set({ recovery }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setUnauthorized: (isUnauthorized) => set({ isUnauthorized }),
  resetOperationalState: () =>
    set({
      platform: null,
      rooms: [],
      recovery: null,
      connectionStatus: "offline",
      lastTickAt: null,
      isLoading: true,
      error: null,
      isUnauthorized: false,
    }),
  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),
  setGameFilter: (gameFilter) =>
    set((state) => ({ filters: { ...state.filters, gameFilter } })),
  setLifecycleFilter: (lifecycleFilter) =>
    set((state) => ({ filters: { ...state.filters, lifecycleFilter } })),
  setSorting: (sortBy, sortDirection) =>
    set((state) => ({
      filters: {
        ...state.filters,
        sortBy,
        sortDirection:
          sortDirection ??
          (state.filters.sortBy === sortBy && state.filters.sortDirection === "asc"
            ? "desc"
            : "asc"),
      },
    })),
  resetFilters: () =>
    set(() => ({
      filters: {
        searchQuery: "",
        gameFilter: "all",
        lifecycleFilter: "all",
        sortBy: "age",
        sortDirection: "desc",
      },
    })),
}));
