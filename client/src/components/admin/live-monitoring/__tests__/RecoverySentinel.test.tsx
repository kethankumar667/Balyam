import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import RecoverySentinel from "../RecoverySentinel";
import { useAdminLiveStore } from "../../../../store/adminLiveStore";
import type { DisconnectedSeatSummary, PlatformHealthCounters } from "@shared/types";

const now = 1_700_000_000_000;
let seatSeq = 1;

function createMockSeat(overrides: Partial<DisconnectedSeatSummary> = {}): DisconnectedSeatSummary {
  const seq = seatSeq++;
  return {
    roomCode: overrides.roomCode ?? `RM${seq}`,
    game: "rummy",
    playerId: overrides.playerId ?? `p_${seq}`,
    playerName: overrides.playerName ?? `Player_${seq}`,
    isGuest: false,
    isHost: true,
    awaySince: now - 30_000,
    awayUntil: now + 60_000,
    awayDurationMs: 30_000,
    gracePeriodMs: 90_000,
    remainingGraceMs: 60_000,
    isEligibleForRejoin: true,
    isAutoPlaying: false,
    autoPlayReason: null,
    idleStrikes: 0,
    autoTurnsPlayed: 0,
    autoTurnCap: 5,
    ...overrides,
  };
}

const mockPlatformCounters: PlatformHealthCounters = {
  onlineHumans: 10,
  activeBots: 2,
  activeRooms: 5,
  runningMatches: 3,
  disconnectedUsers: 2,
  rejoinEligibleUsers: 2,
  connectedSockets: 12,
  lobbyRooms: 2,
  recoveringRooms: 1,
  pausedRooms: 0,
  recoverySuccessRate: 80,
  hostMigrationCount: 1,
  abandonmentRate: 5,
};

describe("RecoverySentinel — Operations Console Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useAdminLiveStore.getState().resetRecoveryFilters();
    useAdminLiveStore.getState().setPlatformCounters(mockPlatformCounters);
    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 0,
      seats: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders empty state when there are zero active recoveries", () => {
    render(<RecoverySentinel />);
    expect(screen.getByText(/All Player Seats Connected/i)).toBeDefined();
    expect(screen.getByText(/0 Active/i)).toBeDefined();
  });

  it("renders summary KPI strip correctly with active recoveries and success/expiry rates", () => {
    const seat1 = createMockSeat({
      playerName: "Alice",
      awaySince: now - 20_000,
      awayUntil: now + 40_000,
    });
    const seat2 = createMockSeat({
      roomCode: "RM202",
      playerName: "Bob",
      awaySince: now - 50_000,
      awayUntil: now + 10_000,
      isAutoPlaying: true,
      autoPlayReason: "disconnected",
      autoTurnsPlayed: 2,
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 2,
      seats: [seat1, seat2],
    });

    render(<RecoverySentinel />);

    // Active recoveries counter
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);

    // Success Rate 80% and Expiry Rate 20% (100 - 80)
    expect(screen.getByText("80%")).toBeDefined();
    expect(screen.getByText("20%")).toBeDefined();

    // Rejoin Eligible count (both have remainingGrace > 0)
    expect(screen.getAllByText(/Rejoin Eligible/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'N/A' for success and expiry rate when platform rate is null", () => {
    useAdminLiveStore.getState().setPlatformCounters({
      ...mockPlatformCounters,
      recoverySuccessRate: null,
    });
    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [createMockSeat()],
    });

    render(<RecoverySentinel />);
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(2);
  });

  it("renders card fields: player name, host indicator, account classification, and recovery timeline", () => {
    const seat = createMockSeat({
      playerName: "Kiran",
      isHost: true,
      isGuest: false,
      game: "ludo",
      roomCode: "LU777",
      awaySince: now - 30_000,
      awayUntil: now + 60_000,
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [seat],
    });

    render(<RecoverySentinel />);

    expect(screen.getByText("Kiran")).toBeDefined();
    expect(screen.getByText("Host")).toBeDefined();
    expect(screen.getByText("Member")).toBeDefined();
    expect(screen.getByText(/Room: #LU777/i)).toBeDefined();

    // Timeline labels
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Grace Expires")).toBeDefined();
    expect(screen.getByText("Elapsed")).toBeDefined();
    expect(screen.getByText("Remaining")).toBeDefined();
  });

  it("applies deterministic status precedence: Critical (<15s) -> Expiring Soon", () => {
    const criticalSeat = createMockSeat({
      playerName: "UrgentPlayer",
      awayUntil: now + 10_000, // 10s left (< 15s)
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [criticalSeat],
    });

    render(<RecoverySentinel />);
    expect(screen.getByText("Expiring Soon")).toBeDefined();
  });

  it("applies deterministic status precedence: Warning (<30s) -> Near Expiry", () => {
    const warningSeat = createMockSeat({
      playerName: "WarningPlayer",
      awayUntil: now + 25_000, // 25s left (< 30s)
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [warningSeat],
    });

    render(<RecoverySentinel />);
    expect(screen.getByText("Near Expiry")).toBeDefined();
  });

  it("applies deterministic status precedence: Auto-Playing when >= 30s and isAutoPlaying", () => {
    const autoSeat = createMockSeat({
      playerName: "AutoPlayer",
      awayUntil: now + 50_000,
      isAutoPlaying: true,
      autoPlayReason: "idle",
      autoTurnsPlayed: 3,
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [autoSeat],
    });

    render(<RecoverySentinel />);
    expect(screen.getByText("Auto Playing")).toBeDefined();
    expect(screen.getByText(/Turns: 3 \/ 5/i)).toBeDefined();
  });

  it("filters recoveries by search query (player name or room code)", () => {
    const seat1 = createMockSeat({ playerName: "Farhan", roomCode: "FH100" });
    const seat2 = createMockSeat({ playerName: "Geeta", roomCode: "GT200" });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 2,
      seats: [seat1, seat2],
    });

    render(<RecoverySentinel />);
    expect(screen.getByText("Farhan")).toBeDefined();
    expect(screen.getByText("Geeta")).toBeDefined();

    const searchInput = screen.getByLabelText("Search recovery seats");
    fireEvent.change(searchInput, { target: { value: "Farhan" } });

    expect(screen.getByText("Farhan")).toBeDefined();
    expect(screen.queryByText("Geeta")).toBeNull();
  });

  it("filters recoveries by game and status", () => {
    const rummySeat = createMockSeat({ game: "rummy", playerName: "RummyFan" });
    const ludoSeat = createMockSeat({
      game: "ludo",
      playerName: "LudoFan",
      awayUntil: now + 10_000, // Expiring Soon
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 2,
      seats: [rummySeat, ludoSeat],
    });

    render(<RecoverySentinel />);

    // Filter by Game: Ludo
    const gameSelect = screen.getByLabelText("Filter recoveries by game");
    fireEvent.change(gameSelect, { target: { value: "ludo" } });

    expect(screen.queryByText("RummyFan")).toBeNull();
    expect(screen.getByText("LudoFan")).toBeDefined();

    // Filter by Status: Expiring Soon
    const statusSelect = screen.getByLabelText("Filter recoveries by status");
    fireEvent.change(statusSelect, { target: { value: "EXPIRING_SOON" } });

    expect(screen.getByText("LudoFan")).toBeDefined();
  });

  it("exposes accessible toggle states via aria-pressed for Hosts Only and Auto-Play Active", () => {
    const hostSeat = createMockSeat({ playerName: "HostPlayer", isHost: true, isAutoPlaying: false });
    const autoSeat = createMockSeat({ playerName: "AutoPlayer", isHost: false, isAutoPlaying: true });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 2,
      seats: [hostSeat, autoSeat],
    });

    render(<RecoverySentinel />);

    const hostFilterBtn = screen.getByRole("button", { name: "Hosts Only" });
    const autoFilterBtn = screen.getByRole("button", { name: "Auto-Play Active" });

    // Initial state: unpressed
    expect(hostFilterBtn.getAttribute("aria-pressed")).toBe("false");
    expect(autoFilterBtn.getAttribute("aria-pressed")).toBe("false");

    // Click Hosts Only toggle
    fireEvent.click(hostFilterBtn);
    expect(hostFilterBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("HostPlayer")).toBeDefined();
    expect(screen.queryByText("AutoPlayer")).toBeNull();

    // Click Auto-Play Active toggle
    fireEvent.click(autoFilterBtn);
    expect(autoFilterBtn.getAttribute("aria-pressed")).toBe("true");

    // Click again to unpress
    fireEvent.click(hostFilterBtn);
    expect(hostFilterBtn.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("AutoPlayer")).toBeDefined();
    expect(screen.queryByText("HostPlayer")).toBeNull();
  });

  it("sorts recoveries by least grace remaining with exact card order assertions in asc and desc", () => {
    const seatLong = createMockSeat({
      playerName: "LongGracePlayer",
      awayUntil: now + 80_000,
    });
    const seatShort = createMockSeat({
      playerName: "ShortGracePlayer",
      awayUntil: now + 12_000,
    });
    const seatMedium = createMockSeat({
      playerName: "MediumGracePlayer",
      awayUntil: now + 40_000,
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 3,
      seats: [seatLong, seatShort, seatMedium],
    });

    render(<RecoverySentinel />);

    // Select "Least Grace Remaining"
    const sortSelect = screen.getByLabelText("Sort recoveries");
    fireEvent.change(sortSelect, { target: { value: "grace" } });

    // In ascending order: ShortGracePlayer (12s) -> MediumGracePlayer (40s) -> LongGracePlayer (80s)
    const cardElementsAsc = screen.getAllByTitle("Inspect Room");
    expect(cardElementsAsc.length).toBe(3);

    const player1 = screen.getByText("ShortGracePlayer");
    const player2 = screen.getByText("MediumGracePlayer");
    const player3 = screen.getByText("LongGracePlayer");

    // Verify DOM document order: player1 before player2 before player3
    expect(player1.compareDocumentPosition(player2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(player2.compareDocumentPosition(player3) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Toggle sort direction to descending
    const toggleDirBtn = screen.getByLabelText("Toggle sort direction");
    fireEvent.click(toggleDirBtn);

    // In descending order: LongGracePlayer -> MediumGracePlayer -> ShortGracePlayer
    expect(player3.compareDocumentPosition(player2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(player2.compareDocumentPosition(player1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("clicking room code in recovery card opens Room Inspector", () => {
    const seat = createMockSeat({ roomCode: "QC999", playerName: "InspectorTarget" });
    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [seat],
    });

    render(<RecoverySentinel />);

    const inspectBtn = screen.getByTitle("Inspect Room");
    fireEvent.click(inspectBtn);

    expect(useAdminLiveStore.getState().selectedRoomCode).toBe("QC999");
  });

  it("updates countdown values when shared timer advances without local state mutation errors", () => {
    const seat = createMockSeat({
      playerName: "TickerPlayer",
      awayUntil: now + 20_000,
    });

    useAdminLiveStore.getState().setRecoverySummary({
      activeGraceCount: 1,
      seats: [seat],
    });

    render(<RecoverySentinel />);

    expect(screen.getAllByText("00:20").length).toBeGreaterThanOrEqual(1);

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getAllByText("00:15").length).toBeGreaterThanOrEqual(1);
  });
});
