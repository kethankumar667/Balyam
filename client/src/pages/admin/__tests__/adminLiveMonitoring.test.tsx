import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import GlobalHealthStrip from "../../../components/admin/live-monitoring/GlobalHealthStrip";
import LiveRoomFilters from "../../../components/admin/live-monitoring/LiveRoomFilters";
import LiveRoomMatrix from "../../../components/admin/live-monitoring/LiveRoomMatrix";
import LiveRecoveryPanel from "../../../components/admin/live-monitoring/LiveRecoveryPanel";
import ConnectionStatusBadge from "../../../components/admin/live-monitoring/ConnectionStatusBadge";
import type { PlatformTickPayload, OperationalRoomSummary } from "@shared/types";

const mockSampleRooms: OperationalRoomSummary[] = [
  {
    code: "RF82A",
    game: "rummy",
    lifecycleState: "IN_PROGRESS",
    phase: "playing",
    createdAt: Date.now() - 300_000,
    matchStartedAt: Date.now() - 120_000,
    matchDurationMs: 120_000,
    host: {
      id: "p_1",
      name: "Rahul",
      isGuest: false,
    },
    playerCount: 3,
    humanCount: 3,
    botCount: 0,
    spectatorCount: 0,
    hasTakeover: false,
    sealed: false,
    disconnectedCount: 0,
  },
  {
    code: "XK992",
    game: "ludo",
    lifecycleState: "RECOVERING",
    phase: "playing",
    createdAt: Date.now() - 600_000,
    matchStartedAt: Date.now() - 300_000,
    matchDurationMs: 300_000,
    host: {
      id: "p_2",
      name: "Ananya",
      isGuest: true,
    },
    playerCount: 4,
    humanCount: 3,
    botCount: 1,
    spectatorCount: 1,
    hasTakeover: true,
    sealed: true,
    disconnectedCount: 1,
  },
];

const mockTickPayload: PlatformTickPayload = {
  timestamp: Date.now(),
  platform: {
    onlineHumans: 6,
    activeBots: 1,
    activeRooms: 2,
    runningMatches: 2,
    disconnectedUsers: 1,
    rejoinEligibleUsers: 1,
    connectedSockets: 7,
    lobbyRooms: 0,
    recoveringRooms: 1,
    pausedRooms: 0,
    recoverySuccessRate: 95,
    hostMigrationCount: 2,
    abandonmentRate: 4,
  },
  rooms: mockSampleRooms,
  recovery: {
    activeGraceCount: 1,
    seats: [
      {
        roomCode: "XK992",
        game: "ludo",
        playerId: "p_disconnected",
        playerName: "Vikram",
        isGuest: false,
        awaySince: Date.now() - 30_000,
        awayDurationMs: 30_000,
        gracePeriodMs: 90_000,
        remainingGraceMs: 60_000,
        isEligibleForRejoin: true,
        isAutoPlaying: true,
        autoPlayReason: "disconnected",
        idleStrikes: 0,
        autoTurnsPlayed: 1,
      },
    ],
  },
};

describe("Admin Live Monitoring Dashboard — Phase 1 Test Suite", () => {
  beforeEach(() => {
    useAdminLiveStore.getState().resetFilters();
    useAdminLiveStore.getState().ingestTick(mockTickPayload);
    useAdminLiveStore.getState().setConnectionStatus("connected");
  });

  it("1. useAdminLiveStore ingests tick correctly and updates platform counters", () => {
    const state = useAdminLiveStore.getState();
    expect(state.platform?.onlineHumans).toBe(6);
    expect(state.platform?.activeBots).toBe(1);
    expect(state.platform?.activeRooms).toBe(2);
    expect(state.platform?.runningMatches).toBe(2);
    expect(state.rooms).toHaveLength(2);
    expect(state.recovery?.activeGraceCount).toBe(1);
  });

  it("2. GlobalHealthStrip renders all 6 key operational metrics", () => {
    render(<GlobalHealthStrip />);
    expect(screen.getByText("Online Users")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
    expect(screen.getByText("+1 AI")).toBeDefined();

    expect(screen.getByText("Active Rooms")).toBeDefined();
    expect(screen.getAllByText("2")).toHaveLength(2);

    expect(screen.getByText("Live Matches")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Rejoin Ready")).toBeDefined();
    expect(screen.getByText("Sockets / Conns")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
  });

  it("3. ConnectionStatusBadge renders live SSE status indicator", () => {
    const { rerender } = render(<ConnectionStatusBadge />);
    expect(screen.getByText(/Live Stream \(1s\)/i)).toBeDefined();

    useAdminLiveStore.getState().setConnectionStatus("reconnecting");
    rerender(<ConnectionStatusBadge />);
    expect(screen.getByText(/Reconnecting Stream.../i)).toBeDefined();

    useAdminLiveStore.getState().setConnectionStatus("offline");
    rerender(<ConnectionStatusBadge />);
    expect(screen.getByText(/Polling Sync \(3s\)/i)).toBeDefined();
  });

  it("4. LiveRoomFilters allows searching and filtering by game kind", () => {
    render(<LiveRoomFilters totalRoomsCount={2} filteredRoomsCount={2} />);
    const searchInput = screen.getByPlaceholderText(/search by room code, host, or player/i);
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: "RF82A" } });
    expect(useAdminLiveStore.getState().filters.searchQuery).toBe("RF82A");

    const gameSelect = screen.getByLabelText(/filter by game/i);
    fireEvent.change(gameSelect, { target: { value: "ludo" } });
    expect(useAdminLiveStore.getState().filters.gameFilter).toBe("ludo");
  });

  it("5. LiveRoomMatrix renders active rooms with status, host, and live duration", () => {
    render(<LiveRoomMatrix />);
    expect(screen.getAllByText("RF82A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("XK992").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rahul").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ananya").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Takeover").length).toBeGreaterThan(0);
  });

  it("6. LiveRecoveryPanel displays disconnected seats in grace period", () => {
    render(<LiveRecoveryPanel />);
    expect(screen.getByText("Recovery Sentinel")).toBeDefined();
    expect(screen.getByText("Vikram")).toBeDefined();
    expect(screen.getByText(/Room: #XK992/i)).toBeDefined();
    expect(screen.getByText("Auto-Play")).toBeDefined();
  });

  // Test 7 (1,000-room "virtualization" check) removed from this file: it
  // only asserted the component didn't crash and that the first room's code
  // was present — true even if virtualization silently fell back to
  // rendering all 1,000 rows unvirtualized. Real, DOM-measured proof of
  // bounded rendering, scroll-window transitions, and filter-driven count
  // changes now lives in
  // `client/src/components/admin/live-monitoring/__tests__/LiveRoomMatrix.virtualization.test.tsx`.
});
