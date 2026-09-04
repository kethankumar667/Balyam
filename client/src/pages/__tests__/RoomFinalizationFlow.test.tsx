import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Room from "../Room";
import { AudioProvider } from "../../context/AudioContext";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import type { RoomPublicState, Player } from "@shared/types";

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
    connected: true,
  }),
  generateActionId: () => "mock-action-id",
}));

vi.mock("@tsparticles/confetti", () => ({
  confetti: vi.fn(),
}));

vi.mock("../../lib/voice-session", () => ({
  useVoiceSession: () => ({ status: "idle", peers: [], isConnected: false }),
  useVoiceRoster: () => ({ peers: [], isConnected: false }),
  destroyVoiceSession: vi.fn(),
}));

vi.mock("../../store/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../store/authStore")>();
  return {
    ...actual,
    currentAccountKind: () => "member",
  };
});

describe("Real Room.tsx — Post-Match Finalization & Scorecard Continue Flow (Phase 6 Certification)", () => {
  const hostPlayer: Player = {
    id: "p_host",
    name: "Alice (Host)",
    isHost: true,
    isReady: true,
    isConnected: true,
  };

  const guestPlayer: Player = {
    id: "p_guest",
    name: "Bob (Guest)",
    isHost: false,
    isReady: true,
    isConnected: true,
    isGuest: true,
  };

  const baseRoomState: RoomPublicState = {
    code: "TEST99",
    game: "snl",
    phase: "finished",
    hostId: "p_host",
    players: [hostPlayer, guestPlayer],
    name: "Test Room",
    maxPlayers: 6,
    history: [],
    champion: null,
    unoHistory: [],
    unoChampion: null,
    bingoHistory: [],
    ludoHistory: [],
    sealed: false,
    roomRevision: 1,
    lifecycleState: "FINALIZING",
  };

  const baseGameState = {
    players: [
      { id: "p_host", name: "Alice (Host)", position: 100 },
      { id: "p_guest", name: "Bob (Guest)", position: 85 },
    ],
    currentTurn: "p_host",
    winner: "p_host",
    phase: "finished",
  };

  beforeEach(() => {
    mockEmit.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
    useAuthStore.setState({ isMember: true });
    useRoomStore.getState().rememberSeat("TEST99", "p_host", "seat_token_host");
    useRoomStore.getState().rememberSeat("TEST99", "p_guest", "seat_token_guest");
    useRoomStore.setState({
      gameState: baseGameState,
      messages: [],
      rematch: { status: "none", requestedBy: null, responses: {} } as any,
    });
  });

  it("FINALIZING: displays polite finalization message and does not falsely claim reward complete", () => {
    useRoomStore.setState({
      roomState: { ...baseRoomState, lifecycleState: "FINALIZING" },
      playerId: "p_host",
      playerName: "Alice (Host)",
    });

    render(
      <AudioProvider>
        <MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes>
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </MemoryRouter>
      </AudioProvider>
    );

    // Scorecard modal is open initially
    expect(screen.getByRole("dialog")).toBeDefined();
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Scorecard dismissed, table exposed
    expect(screen.queryByRole("dialog")).toBeNull();

    // FINALIZING status message is visible
    const finalizingMsg = screen.getByText(/finalizing prize settlement and rewards/i);
    expect(finalizingMsg).toBeDefined();

    // Honest representation: does NOT claim settlements or wallet rewards are already complete
    expect(screen.queryByText(/settlement complete/i)).toBeNull();
    expect(screen.queryByText(/rewards awarded/i)).toBeNull();
  });

  it("FINALIZATION_FAILED: shows retry sync button for host, hides it for non-host, and hides raw exceptions", () => {
    // 1. As Host (p_host)
    useRoomStore.setState({
      roomState: { ...baseRoomState, lifecycleState: "FINALIZATION_FAILED" },
      playerId: "p_host",
      playerName: "Alice (Host)",
    });

    const { unmount } = render(
      <AudioProvider>
        <MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes>
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </MemoryRouter>
      </AudioProvider>
    );

    // Dismiss scorecard
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Alert message is visible
    const alertMsg = screen.getByText(/Settlement synchronization is pending/i);
    expect(alertMsg).toBeDefined();

    // Host sees retry button
    const retryBtn = screen.getByRole("button", { name: /Retry Settlement Sync/i });
    expect(retryBtn).toBeDefined();

    // Clicking retry sends socket event
    fireEvent.click(retryBtn);
    expect(mockEmit).toHaveBeenCalledWith("room:retryTerminalPersistence");

    // No raw error/stack trace details leaked
    expect(screen.queryByText(/EconomyServiceInfrastructureError/i)).toBeNull();
    expect(screen.queryByText(/PostgresError/i)).toBeNull();
    expect(screen.queryByText(/ECONNREFUSED/i)).toBeNull();
    unmount();

    // 2. As Non-Host Guest (p_guest)
    useRoomStore.setState({
      roomState: { ...baseRoomState, lifecycleState: "FINALIZATION_FAILED" },
      playerId: "p_guest",
      playerName: "Bob (Guest)",
    });

    render(
      <AudioProvider>
        <MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes>
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </MemoryRouter>
      </AudioProvider>
    );

    // Dismiss scorecard
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Non-host still sees honest explanation
    expect(screen.getByText(/Settlement synchronization is pending/i)).toBeDefined();

    // Non-host does NOT see retry button
    expect(screen.queryByRole("button", { name: /Retry Settlement Sync/i })).toBeNull();
  });

  it("Continue Flow: dismisses scorecard, exposes table, does not re-open immediately, and COMPLETED clears failure state", () => {
    useRoomStore.setState({
      roomState: { ...baseRoomState, lifecycleState: "FINALIZATION_FAILED" },
      playerId: "p_host",
      playerName: "Alice (Host)",
    });

    const { rerender } = render(
      <AudioProvider>
        <MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes>
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </MemoryRouter>
      </AudioProvider>
    );

    // Modal is initially open
    expect(screen.getByRole("dialog")).toBeDefined();

    // Click Continue
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Modal is closed
    expect(screen.queryByRole("dialog")).toBeNull();

    // Table view with rematch controls is reached and visible
    expect(screen.getByRole("button", { name: /Play Again/i })).toBeDefined();

    // FINALIZATION_FAILED banner remains visible after dismissal
    expect(screen.getByText(/Settlement synchronization is pending/i)).toBeDefined();

    // Transition lifecycle to COMPLETED (e.g. background recovery succeeded)
    useRoomStore.setState({
      roomState: { ...baseRoomState, lifecycleState: "COMPLETED" },
    });

    rerender(
      <AudioProvider>
        <MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes>
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </MemoryRouter>
      </AudioProvider>
    );

    // Modal does not re-open on COMPLETED transition
    expect(screen.queryByRole("dialog")).toBeNull();

    // Failure / finalizing banner is cleared
    expect(screen.queryByText(/finalizing prize settlement/i)).toBeNull();
    expect(screen.queryByText(/Settlement synchronization is pending/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Retry Settlement Sync/i })).toBeNull();

    // Play Again button remains available for rematch
    expect(screen.getByRole("button", { name: /Play Again/i })).toBeDefined();
  });
});
