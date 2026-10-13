import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import Room from "../Room";
import { AudioProvider } from "../../context/AudioContext";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import type { RoomPublicState, Player, ClientToServerEvents } from "@shared/types";
import { NAME_TAKEN_ERROR, NAME_NOT_ALLOWED_ERROR } from "@shared/playerName";
import type { RoomCredentialResult } from "../../lib/playerIdentity";
import { recoveryManager } from "../../core/recovery/RecoveryManager";
import { connectionStateManager } from "../../core/recovery/ConnectionStateManager";

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = { emit: mockEmit, on: mockOn, off: mockOff, connected: true, connect: vi.fn() };
const mockCredential = vi.fn<[], Promise<RoomCredentialResult>>();
let boardMove: ((type: string, data?: unknown) => void) | undefined;
type JoinAck = Parameters<ClientToServerEvents["room:join"]>[1];

function triggerSocket(event: string, ...args: unknown[]) {
  for (const call of mockOn.mock.calls.filter(([name]) => name === event)) {
    (call[1] as (...values: unknown[]) => void)(...args);
  }
}

function joinAck(index = 0): JoinAck {
  return mockEmit.mock.calls.filter(([event]) => event === "room:join")[index][2] as JoinAck;
}

vi.mock("../../lib/socket", () => ({
  getSocket: () => mockSocket,
  generateActionId: () => "mock-action-id",
}));

vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../lib/playerIdentity")>(),
  resolveRoomCredential: () => mockCredential(),
}));

vi.mock("@tsparticles/confetti", () => ({
  confetti: vi.fn(),
}));

vi.mock("../../games/snl/SnlBoard", () => ({
  default: () => <div>Test board</div>,
}));

vi.mock("../../games/tambola/TambolaBoard", () => ({
  default: ({ onMove }: { onMove: (type: string, data?: unknown) => void }) => {
    boardMove = onMove;
    return <button onClick={() => onMove("roll")}>Roll test dice</button>;
  },
}));

vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  useAppLayout: () => ({ openWallet: vi.fn() }),
}));

vi.mock("../../hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({ isFullscreen: false, isSupported: false, needsGesture: false, requestFullscreen: vi.fn() }),
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
    entryStakeCoins: 100,
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
    mockEmit.mockReset();
    mockOn.mockClear();
    mockOff.mockClear();
    mockSocket.connected = true;
    mockSocket.connect.mockClear();
    boardMove = undefined;
    mockCredential.mockReset().mockResolvedValue({ ok: true, kind: "member", accessToken: "test-token", guestToken: undefined });
    recoveryManager.destroy();
    useAuthStore.setState({ isMember: true, ready: true });
    useRoomStore.getState().rememberSeat("TEST99", "p_host", "seat_token_host");
    useRoomStore.getState().rememberSeat("TEST99", "p_guest", "seat_token_guest");
    useRoomStore.setState({
      gameState: baseGameState,
      messages: [],
      lastError: null,
    });
    mockEmit.mockImplementation((event: string, _payload: unknown, ack: JoinAck) => {
      if (event !== "room:join") return;
      const state = useRoomStore.getState().roomState;
      if (!state) return;
      triggerSocket("game:state", baseGameState);
      const playerId = useRoomStore.getState().playerId ?? "p_host";
      const response = { ok: true, state, playerId, seatToken: `seat_token_${playerId}`, gameState: baseGameState };
      ack(response);
    });
  });

  afterEach(() => {
    cleanup();
    recoveryManager.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Room recovery", () => {
    function mountRoom(playerName = "Alice (Host)", routeCode = "TEST99") {
      useRoomStore.setState({ roomState: null, playerId: "p_host", playerName, gameState: baseGameState });
      mockEmit.mockImplementation(() => {});
      return render(
        <AudioProvider>
          <MemoryRouter initialEntries={[`/room/${routeCode}`]}>
            <Routes>
              <Route path="/room/:code" element={<><Room /><Link to="/room/NEXT99">Change room</Link></>} />
              <Route path="/" element={<div>Test lounge</div>} />
            </Routes>
          </MemoryRouter>
        </AudioProvider>,
      );
    }

    const joined = (phase: RoomPublicState["phase"] = "playing") => ({
      ok: true, state: { ...baseRoomState, phase }, playerId: "p_host", seatToken: "seat_token_host",
      gameState: phase === "lobby" ? null : baseGameState,
    });

    it("restores a lowercase route from a canonical uppercase ACK using its saved seat", async () => {
      mountRoom("Alice (Host)", "test99");
      await act(async () => {});
      await act(async () => joinAck()(joined()));

      expect(connectionStateManager.getState()).toBe("RECOVERED");
      expect(useRoomStore.getState().roomState?.code).toBe("TEST99");
      expect(useRoomStore.getState().gameState).toEqual(baseGameState);
      expect(useRoomStore.getState().lastError).toBeNull();
      expect(mockEmit).toHaveBeenCalledWith("room:join", expect.objectContaining({
        code: "TEST99", playerId: "p_guest", seatToken: "seat_token_guest",
      }), expect.any(Function));
      expect(useRoomStore.getState().seatFor("TEST99")?.seatToken).toBe("seat_token_host");
      const update = { ...baseGameState, currentTurn: "p_guest" };
      act(() => triggerSocket("game:state", update));
      expect(useRoomStore.getState().gameState).toEqual(update);
      const roomUpdate = { ...joined().state, name: "Canonical room update" };
      act(() => triggerSocket("room:state", roomUpdate));
      expect(useRoomStore.getState().roomState).toEqual(roomUpdate);
    });

    it("rejects a different-room ACK for a lowercase route without restoring readiness", async () => {
      mountRoom("Alice (Host)", "test99");
      await act(async () => {});
      const response = joined();
      await act(async () => joinAck()({ ...response, state: { ...response.state, code: "OTHER9" } }));

      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().roomState).toBeNull();
      expect(useRoomStore.getState().gameState).toBeNull();
      expect(useRoomStore.getState().seatFor("TEST99")?.seatToken).toBe("seat_token_guest");
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
      act(() => triggerSocket("game:state", baseGameState));
      expect(useRoomStore.getState().gameState).toBeNull();
    });

    it("resumes an offline-first unemitted attempt immediately on online with a connected socket", async () => {
      vi.useFakeTimers();
      const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      mountRoom();
      await act(async () => {});
      const oldRecoverySettled = vi.fn();
      void recoveryManager.attemptRecovery("TEST99").then(oldRecoverySettled);
      expect(connectionStateManager.getState()).toBe("RECONNECTING");
      expect(mockCredential).not.toHaveBeenCalled();
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(0);
      expect(mockSocket.connect).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(5_000));

      online.mockReturnValue(true);
      await act(async () => window.dispatchEvent(new Event("online")));
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
      expect(mockCredential).toHaveBeenCalledTimes(1);
      expect(oldRecoverySettled).toHaveBeenCalledWith(false);
      expect(connectionStateManager.getState()).toBe("RECOVERING");
      act(() => triggerSocket("game:state", { obsolete: true }));
      expect(useRoomStore.getState().gameState).toBeNull();
      expect(screen.queryByRole("button", { name: "Roll test dice" })).toBeNull();

      const response = joined();
      const freshPrivateState = { ...baseGameState, currentTurn: "p_guest" };
      await act(async () => joinAck()({
        ...response, state: { ...response.state, game: "tambola" }, gameState: freshPrivateState,
      }));
      expect(connectionStateManager.getState()).toBe("RECOVERED");
      expect(useRoomStore.getState().gameState).toEqual(freshPrivateState);
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(0);
      await act(async () => window.dispatchEvent(new Event("online")));
      act(() => vi.advanceTimersByTime(20_000));
      expect(connectionStateManager.isOnline()).toBe(true);
      expect(useRoomStore.getState().lastError).toBeNull();
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Roll test dice" }));
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(1);
    });

    it("bounds the join timeout, retains the seat, ignores late ACK and makes Retry usable", async () => {
      vi.useFakeTimers();
      mountRoom();
      await act(async () => {});
      const lateAck = joinAck();
      act(() => vi.advanceTimersByTime(20_000));

      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().lastError).toMatch(/try again|retry/i);
      expect(useRoomStore.getState().seatFor("TEST99")?.seatToken).toBe("seat_token_guest");
      act(() => lateAck(joined()));
      expect(useRoomStore.getState().roomState).toBeNull();
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: /retry/i })); });
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(2);
    });

    it.each(["Room not found", "Game already in progress"])("shows the authoritative recovery rejection '%s' for a refreshed guest instead of new-seat entry", async (error) => {
      useAuthStore.setState({ isMember: false, ready: true });
      useRoomStore.getState().rememberSeat("TEST99", "p_host", "seat_token_host", "Alice");
      mockCredential.mockResolvedValue({ ok: true, kind: "guest", guestToken: "test-guest-token", accessToken: undefined });
      mountRoom("");
      await act(async () => {});

      expect(connectionStateManager.getState()).toBe("RECOVERING");
      expect(useRoomStore.getState().playerName).toBe("");
      expect(mockEmit).toHaveBeenCalledWith("room:join", expect.objectContaining({
        name: "Alice", code: "TEST99", playerId: "p_host", seatToken: "seat_token_host", guestToken: "test-guest-token",
      }), expect.any(Function));
      expect(screen.queryByRole("textbox")).toBeNull();

      await act(async () => joinAck()({ ok: false, error }));

      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().seatFor("TEST99")).toBeNull();
      const message = error === "Room not found"
        ? "This room is no longer active. The host may have left or the server restarted. Ask for a fresh code."
        : error;
      expect(useRoomStore.getState().lastError).toBe(message);
      expect(screen.getByText(message)).toBeDefined();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByText(/take your seat/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /join lounge room/i })).toBeNull();
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: /return to lounge/i }));
      expect(screen.getByText("Test lounge")).toBeDefined();
    });

    it.each([NAME_TAKEN_ERROR, NAME_NOT_ALLOWED_ERROR])("keeps first-time guest check-in and name correction available after '%s'", async (error) => {
      const identity = await import("../../lib/playerIdentity");
      vi.spyOn(identity, "peekPlayerCredential").mockReturnValue({ kind: "guest", playerId: "p_guest", token: "test-guest-token" });
      useAuthStore.setState({ isMember: false, ready: true });
      useRoomStore.getState().forgetSeat("TEST99");
      mockCredential.mockResolvedValue({ ok: true, kind: "guest", guestToken: "test-guest-token", accessToken: undefined });
      mountRoom("");
      const probeAck = mockEmit.mock.calls.find(([event]) => event === "room:probe")![2] as Parameters<ClientToServerEvents["room:probe"]>[1];
      await act(async () => probeAck({ status: "open" }));
      const input = await screen.findByRole("textbox", { name: /your player name/i });
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(0);
      fireEvent.change(input, { target: { value: "Alice" } });
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: /enter the game table/i })); });
      expect(mockEmit).toHaveBeenCalledWith("room:join", expect.objectContaining({ name: "Alice", seatToken: undefined }), expect.any(Function));

      await act(async () => joinAck()({ ok: false, error }));
      const correctionProbeAck = mockEmit.mock.calls.filter(([event]) => event === "room:probe")[1][2] as Parameters<ClientToServerEvents["room:probe"]>[1];
      await act(async () => correctionProbeAck({ status: "open" }));

      expect(useRoomStore.getState().lastError).toBeNull();
      expect(screen.getByRole("alert").textContent).toBe(error);
      const correctedInput = screen.getByRole("textbox", { name: /your player name/i });
      expect(correctedInput.getAttribute("aria-invalid")).toBe("true");
      fireEvent.change(correctedInput, { target: { value: "Charlie" } });
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: /enter the game table/i })); });
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(2);
      expect(mockEmit).toHaveBeenLastCalledWith("room:join", expect.objectContaining({ name: "Charlie", seatToken: undefined }), expect.any(Function));
    });

    it("does not queue a join while disconnected and joins once on connect", async () => {
      mockSocket.connected = false;
      mountRoom();
      await act(async () => {});
      expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
      act(() => { mockSocket.connected = true; triggerSocket("connect"); });
      await act(async () => {});
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
    });

    it("ignores credentials resolved after a disconnect and permits a new attempt", async () => {
      let resolveCredential!: (value: RoomCredentialResult) => void;
      mockCredential.mockImplementationOnce(() => new Promise((resolve) => { resolveCredential = resolve; }));
      mountRoom();
      act(() => { mockSocket.connected = false; triggerSocket("disconnect"); });
      await act(async () => resolveCredential({ ok: true, kind: "member", accessToken: "obsolete", guestToken: undefined }));
      expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
      act(() => { mockSocket.connected = true; triggerSocket("connect"); });
      await act(async () => {});
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
    });

    it("ignores an obsolete ACK after reconnect and waits for the current attempt", async () => {
      mountRoom();
      await act(async () => {});
      const oldAck = joinAck();
      act(() => { mockSocket.connected = false; triggerSocket("disconnect"); mockSocket.connected = true; triggerSocket("connect"); });
      await act(async () => {});
      act(() => oldAck({ ...joined(), playerId: "obsolete-player" }));
      expect(useRoomStore.getState().roomState).toBeNull();
      expect(useRoomStore.getState().playerId).not.toBe("obsolete-player");
    });

    it("ignores late ACK and credential callbacks after unmount", async () => {
      const view = mountRoom();
      await act(async () => {});
      const ack = joinAck();
      view.unmount();
      act(() => ack(joined()));
      expect(useRoomStore.getState().roomState).toBeNull();
      expect(await recoveryManager.attemptRecovery("TEST99")).toBe(false);
    });

    it.each(["playing", "finished"] as const)("restores %s from the acknowledged private snapshot even when the broadcast is lost", async (phase) => {
      mountRoom();
      await act(async () => {});
      act(() => joinAck()(joined(phase)));
      expect(connectionStateManager.getState()).toBe("RECOVERED");
      expect(useRoomStore.getState().gameState).toEqual(baseGameState);
    }, 15000);

    it("ignores stale same-transport private broadcasts before ACK and restores only its snapshot", async () => {
      mountRoom();
      let stateBeforeAck: string | undefined;
      let privateStateBeforeAck: unknown;
      mockEmit.mockImplementation((event: string, _payload: unknown, ack: JoinAck) => {
        if (event !== "room:join") return;
        triggerSocket("game:state", { hand: ["another-seat-card"] });
        stateBeforeAck = connectionStateManager.getState();
        privateStateBeforeAck = useRoomStore.getState().gameState;
        ack(joined());
      });
      await act(async () => {});
      expect(stateBeforeAck).toBe("RECOVERING");
      expect(privateStateBeforeAck).toBeNull();
      expect(connectionStateManager.getState()).toBe("RECOVERED");
      expect(useRoomStore.getState().gameState).toEqual(baseGameState);
    });

    it.each([undefined, null])("rejects a missing ACK snapshot (%s) despite broadcasts before and after ACK", async (gameState) => {
      mountRoom();
      await act(async () => {});
      act(() => triggerSocket("game:state", baseGameState));
      act(() => joinAck()({ ...joined(), gameState }));
      act(() => triggerSocket("game:state", baseGameState));
      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().gameState).toBeNull();
      expect(useRoomStore.getState().seatFor("TEST99")).not.toBeNull();
      expect(screen.getByText(/server could not restore.*game/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
      expect(screen.queryByText("Test board")).toBeNull();
    });

    it("accepts ordinary private broadcasts only after an acknowledged restore", async () => {
      mountRoom();
      await act(async () => {});
      act(() => triggerSocket("game:state", { obsolete: true }));
      expect(useRoomStore.getState().gameState).toBeNull();
      act(() => joinAck()(joined()));
      const update = { ...baseGameState, currentTurn: "p_guest" };
      act(() => triggerSocket("game:state", update));
      expect(useRoomStore.getState().gameState).toEqual(update);
    });

    it("completes lobby recovery on ACK without requiring a game snapshot", async () => {
      mountRoom();
      await act(async () => {});
      act(() => joinAck()(joined("lobby")));
      expect(connectionStateManager.getState()).toBe("RECOVERED");
    });

    it("bounds stalled credentials without forgetting a seat and discards the late resolution", async () => {
      vi.useFakeTimers();
      let resolveCredential!: (value: RoomCredentialResult) => void;
      mockCredential.mockImplementationOnce(() => new Promise((resolve) => { resolveCredential = resolve; }));
      mountRoom();
      act(() => vi.advanceTimersByTime(20_000));
      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().seatFor("TEST99")).not.toBeNull();
      await act(async () => resolveCredential({ ok: true, kind: "member", accessToken: "late", guestToken: undefined }));
      expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
    });

    it("blocks moves offline, disconnected and restoring, and never replays them", async () => {
      mountRoom();
      await act(async () => {});
      const moveRoom = { ...joined(), state: { ...joined().state, game: "tambola" as const } };
      await act(async () => { joinAck()(moveRoom); triggerSocket("game:state", baseGameState); });
      fireEvent.click(await screen.findByRole("button", { name: "Roll test dice" }));
      expect(mockEmit).toHaveBeenCalledWith("game:move", { type: "roll", data: undefined, actionId: "mock-action-id" });
      const send = boardMove!;
      mockEmit.mockClear();
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      send("roll");
      expect(mockEmit).not.toHaveBeenCalled();
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      mockSocket.connected = false;
      send("roll");
      expect(mockEmit).not.toHaveBeenCalled();
      act(() => triggerSocket("disconnect"));
      expect(useRoomStore.getState().gameState).toBeNull();
      act(() => { mockSocket.connected = true; triggerSocket("connect"); });
      await act(async () => {});
      send("roll");
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(0);
      await act(async () => { joinAck()(moveRoom); triggerSocket("game:state", baseGameState); });
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(0);
      send("roll");
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(1);
    }, 15000);

    it("fails missing private state after ACK and Retry uses the Room credential resolver", async () => {
      vi.useFakeTimers();
      mountRoom();
      await act(async () => {});
      act(() => joinAck()({ ...joined(), gameState: undefined }));
      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().seatFor("TEST99")).not.toBeNull();
      let retry!: Promise<boolean>;
      await act(async () => { retry = recoveryManager.attemptRecovery("TEST99"); });
      expect(mockCredential).toHaveBeenCalledTimes(2);
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(2);
      act(() => joinAck(1)(joined("lobby")));
      expect(await retry).toBe(true);
    });

    it("retains seats after credential failure but clears them for an authoritative gone room", async () => {
      mockCredential.mockResolvedValueOnce({ ok: false, error: "Check your connection and retry." });
      mountRoom();
      await act(async () => {});
      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(useRoomStore.getState().seatFor("TEST99")).not.toBeNull();
      await act(async () => { void recoveryManager.attemptRecovery("TEST99"); });
      act(() => joinAck()({ ok: false, error: "Room not found" }));
      expect(useRoomStore.getState().seatFor("TEST99")).toBeNull();
      expect(screen.getByText(/no longer active/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /return to lounge/i })).toBeDefined();
    });

    it("ignores credential resolution after unmount and removes the pending timeout", async () => {
      vi.useFakeTimers();
      let resolveCredential!: (value: RoomCredentialResult) => void;
      mockCredential.mockImplementationOnce(() => new Promise((resolve) => { resolveCredential = resolve; }));
      const view = mountRoom();
      view.unmount();
      act(() => vi.advanceTimersByTime(20_000));
      await act(async () => resolveCredential({ ok: false, error: "obsolete failure" }));
      expect(useRoomStore.getState().lastError).toBeNull();
      expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
    });

    it("does not restart an in-flight join on online events or repeated Retry", async () => {
      mountRoom();
      await act(async () => {});
      await act(async () => {
        window.dispatchEvent(new Event("online"));
        void recoveryManager.attemptRecovery("TEST99");
        void recoveryManager.attemptRecovery("TEST99");
      });
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
      expect(mockCredential).toHaveBeenCalledTimes(1);
      expect(connectionStateManager.getState()).toBe("RECOVERING");
      await act(async () => joinAck()(joined()));
      expect(connectionStateManager.getState()).toBe("RECOVERED");
      expect(useRoomStore.getState().gameState).toEqual(baseGameState);
    });

    it("rejects callbacks and board moves belonging to a changed room", async () => {
      mountRoom();
      await act(async () => {});
      const oldAck = joinAck();
      const oldGameListener = mockOn.mock.calls.find(([event]) => event === "game:state")![1] as (state: unknown) => void;
      const moveRoom = { ...joined(), state: { ...joined().state, game: "tambola" as const } };
      await act(async () => { oldAck(moveRoom); triggerSocket("game:state", baseGameState); });
      await screen.findByRole("button", { name: "Roll test dice" });
      const oldMove = boardMove!;
      await act(async () => { fireEvent.click(screen.getByRole("link", { name: "Change room" })); });
      expect(useRoomStore.getState().roomState).toBeNull();
      act(() => oldAck({ ...joined(), playerId: "obsolete-player" }));
      expect(useRoomStore.getState().playerId).not.toBe("obsolete-player");
      await act(async () => {
        joinAck(1)({ ...moveRoom, state: { ...moveRoom.state, code: "NEXT99" } });
        triggerSocket("game:state", baseGameState);
      });
      act(() => oldGameListener({ obsoletePrivateState: true }));
      expect(useRoomStore.getState().gameState).toEqual(baseGameState);
      oldMove("roll");
      expect(mockEmit.mock.calls.filter(([event]) => event === "game:move")).toHaveLength(0);
    }, 15000);

    it("joins once under StrictMode even when obsolete credentials resolve", async () => {
      useRoomStore.setState({ roomState: null, playerId: "p_host", playerName: "Alice (Host)" });
      mockEmit.mockImplementation(() => {});
      render(
        <React.StrictMode><AudioProvider><MemoryRouter initialEntries={["/room/TEST99"]}>
          <Routes><Route path="/room/:code" element={<Room />} /></Routes>
        </MemoryRouter></AudioProvider></React.StrictMode>,
      );
      await act(async () => {});
      expect(mockEmit.mock.calls.filter(([event]) => event === "room:join")).toHaveLength(1);
    });
  });

  it("FINALIZING: displays polite finalization message and does not falsely claim reward complete", async () => {
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
    expect(await screen.findByRole("dialog", {}, { timeout: 10000 })).toBeDefined();
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
  }, 15000);

  it("FINALIZATION_FAILED: shows retry sync button for host, hides it for non-host, and hides raw exceptions", async () => {
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
    fireEvent.click(await screen.findByRole("button", { name: /Continue/i }, { timeout: 10000 }));

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
    fireEvent.click(await screen.findByRole("button", { name: /Continue/i }, { timeout: 10000 }));

    // Non-host still sees honest explanation
    expect(screen.getByText(/Settlement synchronization is pending/i)).toBeDefined();

    // Non-host does NOT see retry button
    expect(screen.queryByRole("button", { name: /Retry Settlement Sync/i })).toBeNull();
  }, 20000);

  it("Continue Flow: dismisses scorecard, exposes table, does not re-open immediately, and COMPLETED clears failure state", async () => {
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
    expect(await screen.findByRole("dialog", {}, { timeout: 10000 })).toBeDefined();

    // Click Continue
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Modal is closed
    expect(screen.queryByRole("dialog")).toBeNull();

    // The finished table is reached and visible
    expect(await screen.findByRole("region", { name: /Match finished/i }, { timeout: 10000 })).toBeDefined();

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

    // The finished table stays, with no way to start another match from it
    expect(screen.getByRole("region", { name: /Match finished/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Play (Rematch|Again)/i })).toBeNull();
  }, 15000);

  /**
   * A host left alone at a finished table (their opponent departed) must not be offered the
   * lobby's stake controls, nor see a "Locked — Match is already active" badge: nothing is
   * running and nothing can start. The finished table says the match is over and offers Leave.
   */
  it("Finished table (alone after opponent left): no lobby stake controls, no false 'match is active' badge", async () => {
    useRoomStore.setState({
      roomState: {
        ...baseRoomState,
        lifecycleState: "COMPLETED",
        // Only the host remains — the opponent already left, same as the
        // live report.
        players: [hostPlayer],
      },
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

    fireEvent.click(await screen.findByRole("button", { name: /Continue/i }, { timeout: 10000 }));

    // The wrong, misleading tooltip must never appear here.
    expect(screen.queryByTitle(/Match is already active/i)).toBeNull();
    // No lobby stake control at a finished table; just the way out.
    expect(screen.queryByRole("button", { name: /Change/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Leave table/i })).toBeDefined();
  }, 15000);
});
