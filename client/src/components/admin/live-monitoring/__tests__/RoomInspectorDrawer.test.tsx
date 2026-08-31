import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import RoomInspectorDrawer from "../RoomInspectorDrawer";
import { useAdminLiveStore } from "../../../../store/adminLiveStore";
import type { OperationalRoomSummary, PlatformHealthCounters } from "@shared/types";

const now = 1_700_000_000_000;

function createMockRoom(overrides: Partial<OperationalRoomSummary> = {}): OperationalRoomSummary {
  return {
    code: "RF82A",
    game: "rummy",
    lifecycleState: "IN_PROGRESS",
    phase: "playing",
    createdAt: now - 300_000,
    matchStartedAt: now - 120_000,
    matchDurationMs: 120_000,
    host: {
      id: "p_host_internal_123",
      name: "Rahul",
      isGuest: false,
      isConnected: true,
      isAway: false,
      inGrace: false,
    },
    playerCount: 3,
    humanCount: 2,
    botCount: 1,
    spectatorCount: 1,
    hasTakeover: false,
    sealed: true,
    disconnectedCount: 1,
    players: [
      {
        id: "p_host_internal_123",
        name: "Rahul",
        playerType: "human",
        accountType: "member",
        isHost: true,
        isConnected: true,
        isEligibleForRejoin: false,
        awaySince: null,
        awayUntil: null,
        remainingGraceMs: null,
        isAutoPlaying: false,
        autoPlayReason: null,
        autoTurnsPlayed: 0,
        autoTurnCap: 5,
        idleStrikes: 0,
        seatStatus: "active",
      },
      {
        id: "p_player_2",
        name: "Vikram",
        playerType: "human",
        accountType: "guest",
        isHost: false,
        isConnected: false,
        isEligibleForRejoin: true,
        awaySince: now - 40_000,
        awayUntil: now + 50_000,
        remainingGraceMs: 50_000,
        isAutoPlaying: true,
        autoPlayReason: "disconnected",
        autoTurnsPlayed: 2,
        autoTurnCap: 5,
        idleStrikes: 1,
        seatStatus: "auto_playing",
      },
      {
        id: "p_bot_3",
        name: "Anand",
        playerType: "bot",
        accountType: "bot",
        isHost: false,
        isConnected: true,
        isEligibleForRejoin: false,
        awaySince: null,
        awayUntil: null,
        remainingGraceMs: null,
        isAutoPlaying: false,
        autoPlayReason: null,
        autoTurnsPlayed: 0,
        autoTurnCap: 5,
        idleStrikes: 0,
        seatStatus: "active",
      },
    ],
    diagnostics: {
      currentTurnPlayerName: "Vikram",
      isOver: false,
      matchDurationMs: 120_000,
      matchStatus: "In Progress",
    },
    ...overrides,
  };
}

const mockPlatformCounters: PlatformHealthCounters = {
  onlineHumans: 8,
  activeBots: 1,
  activeRooms: 3,
  runningMatches: 2,
  disconnectedUsers: 1,
  rejoinEligibleUsers: 1,
  connectedSockets: 10,
  lobbyRooms: 1,
  recoveringRooms: 1,
  pausedRooms: 0,
  recoverySuccessRate: 90,
  hostMigrationCount: 0,
  abandonmentRate: 2,
};

describe("RoomInspectorDrawer — Deep Diagnostics Drawer Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useAdminLiveStore.getState().closeInspector();
    useAdminLiveStore.getState().setRooms([createMockRoom()]);
    useAdminLiveStore.getState().setPlatformCounters(mockPlatformCounters);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when no room is selected (closed state)", () => {
    render(<RoomInspectorDrawer />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders when selectedRoomCode is set and exposes role='dialog' and aria-modal='true'", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Room #RF82A")).toBeDefined();
  });

  it("renders room information, lifecycle state, created time, and duration", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getAllByText(/Playing/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Sealed/i)).toBeDefined();
    expect(screen.getByText("Room Timelines & State")).toBeDefined();
    expect(screen.getByText("Room Lifecycle")).toBeDefined();
  });

  it("renders host information safely without exposing raw internal host ID", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getAllByText("Rahul").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Member Account")).toBeDefined();
    expect(screen.getAllByText("Connected").length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Raw internal host id MUST NOT be rendered
    expect(screen.queryByText("p_host_internal_123")).toBeNull();
  });

  it("renders room seat statistics (humans, bots, connected, disconnected, active recoveries)", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getByText("Total Players")).toBeDefined();
    expect(screen.getByText("Humans / Bots")).toBeDefined();
    expect(screen.getByText("Connected / Disconnected")).toBeDefined();
    expect(screen.getAllByText("2 / 1").length).toBe(2); // 2 humans / 1 bot AND 2 connected / 1 disconnected
  });

  it("renders player seat matrix with connection, auto-play, strikes, and grace details", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    // Vikram is disconnected and auto-playing
    expect(screen.getAllByText("Vikram").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText(/auto playing/i)).toBeDefined();
    expect(screen.getByText("2 / 5")).toBeDefined(); // 2 auto turns / 5 cap

    // Anand is AI Bot
    expect(screen.getByText("Anand")).toBeDefined();
    expect(screen.getByText("AI Bot")).toBeDefined();
  });

  it("renders match diagnostics (current turn player, match status, duration)", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getByText("Current Turn Player:")).toBeDefined();
    expect(screen.getByText("Match Status:")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
  });

  it("renders room-scoped recovery diagnostics with clearly labeled platform-level rate", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getByText("Recovery Diagnostics (Room Scope)")).toBeDefined();
    expect(screen.getByText("Active in Room")).toBeDefined();
    expect(screen.getByText(/Platform-wide recovery success rate/i)).toBeDefined();
    expect(screen.getByText("90%")).toBeDefined();
    expect(screen.getByText(/since server process start/i)).toBeDefined();
  });

  it("closes the drawer when clicking the close button", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    const closeBtn = screen.getByLabelText("Close room inspector");
    fireEvent.click(closeBtn);

    expect(useAdminLiveStore.getState().selectedRoomCode).toBeNull();
  });

  it("closes the drawer on Escape key press", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(useAdminLiveStore.getState().selectedRoomCode).toBeNull();
  });

  it("handles non-existent or closed room gracefully without crashing", () => {
    useAdminLiveStore.getState().inspectRoom("NON_EXISTENT_ROOM");
    render(<RoomInspectorDrawer />);

    expect(screen.getByText("Room Closed or Concluded")).toBeDefined();
    expect(screen.getByText("Room #NON_EXISTENT_ROOM is no longer active in memory on the server.")).toBeDefined();

    const closeBtn = screen.getByText("Close Inspector");
    fireEvent.click(closeBtn);
    expect(useAdminLiveStore.getState().selectedRoomCode).toBeNull();
  });

  it("updates live telemetry reactively when store rooms update while drawer is open", () => {
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getAllByText("Vikram").length).toBeGreaterThanOrEqual(1);

    // Simulate match finishing on the server
    const updatedRoom = createMockRoom({
      lifecycleState: "COMPLETED",
      diagnostics: {
        currentTurnPlayerName: null,
        isOver: true,
        matchDurationMs: 180_000,
        matchStatus: "Completed",
      },
    });

    act(() => {
      useAdminLiveStore.getState().setRooms([updatedRoom]);
    });

    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders '—' when autoTurnCap is null without defaulting to fabricated constant 5", () => {
    const roomWithNoCap = createMockRoom({
      players: [
        {
          id: "p_1",
          name: "NoCapPlayer",
          playerType: "human",
          accountType: "guest",
          isHost: true,
          isConnected: true,
          isEligibleForRejoin: false,
          awaySince: null,
          awayUntil: null,
          remainingGraceMs: null,
          isAutoPlaying: false,
          autoPlayReason: null,
          autoTurnsPlayed: 2,
          autoTurnCap: null, // Explicitly null
          idleStrikes: 0,
          seatStatus: "active",
        },
      ],
    });

    useAdminLiveStore.getState().setRooms([roomWithNoCap]);
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    expect(screen.getByText("NoCapPlayer")).toBeDefined();
    expect(screen.getByText("2 / —")).toBeDefined();
  });

  it("harmonizes live room recovery counts and player countdowns when clock advances past grace deadline", () => {
    const expiringRoom = createMockRoom({
      players: [
        {
          id: "p_expiring",
          name: "ExpiringUser",
          playerType: "human",
          accountType: "guest",
          isHost: false,
          isConnected: false,
          isEligibleForRejoin: true,
          awaySince: now - 30_000,
          awayUntil: now + 5_000, // 5 seconds remaining
          remainingGraceMs: 5_000,
          isAutoPlaying: false,
          autoPlayReason: "disconnected",
          autoTurnsPlayed: 0,
          autoTurnCap: 5,
          idleStrikes: 0,
          seatStatus: "disconnected_grace",
        },
      ],
    });

    useAdminLiveStore.getState().setRooms([expiringRoom]);
    useAdminLiveStore.getState().inspectRoom("RF82A");
    render(<RoomInspectorDrawer />);

    // Initially 5s remaining: Active recoveries = 1, Rejoin eligible = 1
    expect(screen.getByText("00:05")).toBeDefined();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);

    // Advance fake timer by 6 seconds (grace period expires locally)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Countdown reaches 00:00 (clamped to 0), and active room recoveries becomes 0
    expect(screen.getAllByText("00:00").length).toBeGreaterThanOrEqual(1);
    // Both Section 3 Active Recoveries and Section 6 Active in Room now render 0
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(2);
  });
});

