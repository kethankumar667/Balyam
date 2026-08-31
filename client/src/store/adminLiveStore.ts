import { create } from "zustand";
import type {
  OperationalRoomSummary,
  OperationalRecoverySummary,
  PlatformHealthCounters,
  PlatformTickPayload,
  GameKind,
  RoomLifecycleState,
  RecoveryStatus,
} from "@shared/types";

export type StreamConnectionStatus = "connected" | "reconnecting" | "offline";

export interface AdminLiveFilterState {
  searchQuery: string;
  gameFilter: GameKind | "all";
  lifecycleFilter: RoomLifecycleState | "all";
  sortBy: "code" | "game" | "age" | "duration" | "players" | "lifecycleState";
  sortDirection: "asc" | "desc";
}

export interface RecoveryFiltersState {
  searchQuery: string;
  gameFilter: GameKind | "all";
  statusFilter: RecoveryStatus | "all";
  hostOnly: boolean;
  autoPlayOnly: boolean;
  sortBy: "urgency" | "grace" | "disconnectDuration" | "roomCode";
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
  selectedRoomCode: string | null;
  recoveryFilters: RecoveryFiltersState;

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

  // Room Inspector Actions
  inspectRoom: (code: string) => void;
  closeInspector: () => void;

  // Recovery Sentinel Filter Actions
  setRecoverySearchQuery: (query: string) => void;
  setRecoveryGameFilter: (game: GameKind | "all") => void;
  setRecoveryStatusFilter: (status: RecoveryStatus | "all") => void;
  setRecoveryHostOnly: (hostOnly: boolean) => void;
  setRecoveryAutoPlayOnly: (autoPlayOnly: boolean) => void;
  setRecoverySorting: (
    sortBy: RecoveryFiltersState["sortBy"],
    sortDirection?: "asc" | "desc"
  ) => void;
  resetRecoveryFilters: () => void;
}

const DEFAULT_RECOVERY_FILTERS: RecoveryFiltersState = {
  searchQuery: "",
  gameFilter: "all",
  statusFilter: "all",
  hostOnly: false,
  autoPlayOnly: false,
  sortBy: "urgency",
  sortDirection: "asc",
};

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
  selectedRoomCode: null,
  recoveryFilters: DEFAULT_RECOVERY_FILTERS,

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
      selectedRoomCode: null,
      recoveryFilters: DEFAULT_RECOVERY_FILTERS,
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

  // Room Inspector
  inspectRoom: (selectedRoomCode) => set({ selectedRoomCode }),
  closeInspector: () => set({ selectedRoomCode: null }),

  // Recovery Sentinel Filters
  setRecoverySearchQuery: (searchQuery) =>
    set((state) => ({ recoveryFilters: { ...state.recoveryFilters, searchQuery } })),
  setRecoveryGameFilter: (gameFilter) =>
    set((state) => ({ recoveryFilters: { ...state.recoveryFilters, gameFilter } })),
  setRecoveryStatusFilter: (statusFilter) =>
    set((state) => ({ recoveryFilters: { ...state.recoveryFilters, statusFilter } })),
  setRecoveryHostOnly: (hostOnly) =>
    set((state) => ({ recoveryFilters: { ...state.recoveryFilters, hostOnly } })),
  setRecoveryAutoPlayOnly: (autoPlayOnly) =>
    set((state) => ({ recoveryFilters: { ...state.recoveryFilters, autoPlayOnly } })),
  setRecoverySorting: (sortBy, sortDirection) =>
    set((state) => ({
      recoveryFilters: {
        ...state.recoveryFilters,
        sortBy,
        sortDirection:
          sortDirection ??
          (state.recoveryFilters.sortBy === sortBy && state.recoveryFilters.sortDirection === "asc"
            ? "desc"
            : "asc"),
      },
    })),
  resetRecoveryFilters: () =>
    set(() => ({
      recoveryFilters: DEFAULT_RECOVERY_FILTERS,
    })),
}));
