import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { RoomPublicState } from "@shared/types";
import { capabilitiesFor } from "@shared/permissions";
import type { RoomCredentialResult } from "../../../lib/playerIdentity";
import JoinRoomModal from "../JoinRoomModal";
import { useRoomStore } from "../../../store/roomStore";
import { useAuthStore } from "../../../store/authStore";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockEmit = vi.fn();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

let mockCredentialResult: RoomCredentialResult = {
  ok: true,
  kind: "guest",
  accessToken: undefined,
  guestToken: "mock-guest-token",
};

vi.mock("../../../lib/playerIdentity", () => ({
  ensureGuestToken: () => Promise.resolve(undefined),
  currentGuestToken: () => undefined,
  resolveRoomCredential: () => Promise.resolve(mockCredentialResult),
}));

const MOCK_ROOM_STATE: RoomPublicState = {
  code: "ABCDEF",
  game: "rps",
  hostId: "p_host",
  phase: "lobby",
  scores: {},
  players: [
    {
      id: "p_host",
      name: "Host Player",
      isConnected: true,
      avatar: "rabbit",
      isHost: true,
      isBot: false,
      isReady: true,
    },
  ],
  timer: null,
  voiceEnabled: false,
  rematchVotes: {},
  createdAt: Date.now(),
  lastActivity: Date.now(),
  sealed: false,
  rules: {
    roundsToWin: 3,
    roundTimeLimit: 15,
  },
} as unknown as RoomPublicState;

describe("JoinRoomModal — fail-closed room joining", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockNavigate.mockClear();
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "mock-guest-token",
    };
    useAuthStore.setState({
      kind: "member",
      userId: "u_test",
      capabilities: capabilitiesFor("member"),
    });
    useRoomStore.setState({
      playerId: null,
      roomState: null,
      gameState: null,
      playerName: "Arjun",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("joinWithCode aborts without socket emit when guest credential resolution fails", async () => {
    mockCredentialResult = {
      ok: false,
      error: "We could not prepare your guest session. Check your connection and try again.",
    };

    render(React.createElement(JoinRoomModal, { open: true, onClose: () => {} }));

    const codeInput = screen.getByPlaceholderText("ABC123");
    // Entering a complete 6-char code auto-initiates joinWithCode
    fireEvent.change(codeInput, { target: { value: "ABCDEF" } });

    await waitFor(() => {
      expect(
        screen.getByText(/We could not prepare your guest session/i),
      ).toBeTruthy();
    });

    expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
    expect(mockNavigate).not.toHaveBeenCalled();

    // Field value is preserved for retry
    expect((screen.getByPlaceholderText("ABC123") as HTMLInputElement).value).toBe("ABCDEF");

    // Allows clean retry once credentials succeed: button is back to "Join Room"
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "fresh-guest-token",
    };
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:join" && ack) {
        ack({ ok: true, playerId: "p_joiner", seatToken: "tok_join", state: MOCK_ROOM_STATE });
      }
    });

    const joinButton = screen.getByRole("button", { name: /join room/i });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        "room:join",
        expect.objectContaining({
          guestToken: "fresh-guest-token",
          code: "ABCDEF",
        }),
        expect.any(Function),
      );
    });
  });

  it("rapid double submit does not emit duplicate room:join requests", async () => {
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "mock-guest-token",
    };

    render(React.createElement(JoinRoomModal, { open: true, onClose: () => {} }));

    const codeInput = screen.getByPlaceholderText("ABC123");
    // Entering complete code triggers auto-join
    fireEvent.change(codeInput, { target: { value: "ABCDEF" } });

    // Simultaneous form submission (e.g. user pressed enter or clicked submit)
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
    });

    const joinEmits = mockEmit.mock.calls.filter((c) => c[0] === "room:join");
    expect(joinEmits).toHaveLength(1);
  });
});
