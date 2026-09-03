import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { RoomPublicState } from "@shared/types";
import { capabilitiesFor } from "@shared/permissions";
import type { RoomCredentialResult } from "../../../lib/playerIdentity";

/**
 * Regression coverage for the create-room ErrorBoundary defect: `createRoom`'s
 * acknowledgement handler in GameRoomSheet.tsx never called
 * `useRoomStore.getState().setRoomState(res.state)` before navigating, unlike
 * `joinRoom`/`startPassAndPlay` which both already do. A browser holding
 * STALE `roomState` from a previous room (e.g. one that finished, or one the
 * player is mid-match in) would keep that stale state after creating a brand
 * new room — Room.tsx's own `if (!roomState) return <ConnectingScreen />`
 * guard only checks for `null`, not "does this state belong to this room",
 * so the first render after navigation combines the STALE room's players/
 * phase with the FRESH room's `playerId` (never a member of the stale
 * room's player list) and can throw straight into the global ErrorBoundary.
 *
 * These tests exercise the REAL `createRoom`/`joinRoom` code paths (not a
 * reimplementation) via a mocked socket ack, and assert on `useRoomStore`'s
 * actual state — the same contract Room.tsx's initial render depends on.
 */

const mockEmit = vi.fn();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// `createRoom`/`joinRoom`/`startPassAndPlay` now await a guest credential
// (`ensureGuestToken`) before emitting, so a guest whose very first action is
// a room action still has a durable identity to send (see the guest-wallet-
// consistency remediation). Mocked here to resolve immediately, with no real
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

// Imported AFTER the mocks above so the mocked modules are in place before
// GameRoomSheet's own top-level imports resolve them.
const { useRoomStore } = await import("../../../store/roomStore");
const { useAuthStore } = await import("../../../store/authStore");
const GameRoomSheet = (await import("../GameRoomSheet")).default;

const STALE_ROOM: RoomPublicState = {
  code: "STALE1",
  game: "ludo",
  phase: "playing",
  lifecycleState: "IN_PROGRESS",
  players: [
    { id: "p_stale_host", name: "OldHost", isHost: true, isReady: true, isConnected: true },
    { id: "p_stale_bot", name: "Botty", isHost: false, isReady: true, isConnected: true, isBot: true },
  ],
  hostId: "p_stale_host",
  maxPlayers: 4,
  name: null,
  history: [],
  champion: null,
  unoHistory: [],
  unoChampion: null,
  bingoHistory: [],
  ludoHistory: [],
  sealed: false,
} as unknown as RoomPublicState;

const NEW_ROOM: RoomPublicState = {
  code: "NEWCD1",
  game: "rps",
  phase: "lobby",
  lifecycleState: "WAITING_FOR_PLAYERS",
  players: [
    { id: "p_new_host", name: "Krishna", isHost: true, isReady: false, isConnected: true },
  ],
  hostId: "p_new_host",
  maxPlayers: 2,
  name: null,
  history: [],
  champion: null,
  unoHistory: [],
  unoChampion: null,
  bingoHistory: [],
  ludoHistory: [],
  sealed: false,
} as unknown as RoomPublicState;

function seedStaleRoomSession(): void {
  useRoomStore.setState({
    playerId: "p_stale_host_client_id",
    roomState: STALE_ROOM,
    gameState: { winnerId: null, board: "stale-ludo-board-data" },
  });
}

function fillNameAndClickCreate(name: string): void {
  const nameInput = screen.getByLabelText(/your name/i);
  fireEvent.change(nameInput, { target: { value: name } });
  const createButton = screen.getByRole("button", { name: /create room|play vs bots/i });
  fireEvent.click(createButton);
}

describe("GameRoomSheet — create-room store synchronization (ErrorBoundary regression)", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockNavigate.mockClear();
    useAuthStore.setState({ kind: "member", capabilities: capabilitiesFor("member") });
    useRoomStore.setState({
      playerId: null,
      roomState: null,
      gameState: null,
      playerName: "",
    });
  });

  it("writes the returned room state to the store BEFORE navigating — reproduces stale Zustand state first", async () => {
    seedStaleRoomSession();
    expect(useRoomStore.getState().roomState?.code).toBe("STALE1"); // stale state genuinely present before create

    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        ack({ ok: true, code: NEW_ROOM.code, playerId: "p_new_host", seatToken: "tok_new", state: NEW_ROOM });
      }
    });

    let storeSnapshotAtNavigateTime: ReturnType<typeof useRoomStore.getState> | null = null;
    mockNavigate.mockImplementation(() => {
      // Captured INSIDE the navigate call itself — proves ordering, not
      // just an eventual-consistency check after the fact.
      storeSnapshotAtNavigateTime = useRoomStore.getState();
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    // `createRoom` now awaits `ensureGuestToken()` before emitting, so the
    // ack (and everything it drives) lands a microtask after the click.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/room/NEWCD1");
    expect(storeSnapshotAtNavigateTime).not.toBeNull();
    expect(storeSnapshotAtNavigateTime!.roomState?.code).toBe("NEWCD1"); // NOT the stale STALE1
    expect(storeSnapshotAtNavigateTime!.roomState?.players).toEqual(NEW_ROOM.players); // stale players replaced
  });

  it("new player ID and new room state are mutually consistent: the new playerId is a real seat in the new roomState", async () => {
    seedStaleRoomSession();
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        ack({ ok: true, code: NEW_ROOM.code, playerId: "p_new_host", seatToken: "tok_new", state: NEW_ROOM });
      }
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    await waitFor(() => expect(useRoomStore.getState().playerId).toBe("p_new_host"));
    const finalState = useRoomStore.getState();
    // The exact invariant Room.tsx's own `roomState.players.find(p => p.id
    // === playerId)` depends on — this is what throws/renders undefined
    // when stale state and a fresh playerId are combined.
    const selfSeat = finalState.roomState?.players.find((p) => p.id === finalState.playerId);
    expect(selfSeat).toBeDefined();
    expect(selfSeat?.id).toBe("p_new_host");
  });

  it("does not depend on a later room:state socket event — the store is already correct synchronously, from the ack alone", async () => {
    seedStaleRoomSession();
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        ack({ ok: true, code: NEW_ROOM.code, playerId: "p_new_host", seatToken: "tok_new", state: NEW_ROOM });
      }
      // Deliberately: no separate "room:state" event is ever emitted by
      // this mock. If the fix depended on one, this test would still show
      // stale state.
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    await waitFor(() => expect(useRoomStore.getState().roomState?.code).toBe("NEWCD1"));
  });

  it("a missing res.state on a successful create response is handled safely (no throw), matching the verified socket contract", async () => {
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        // Contractually never happens (server's createRoom return type
        // requires `state`), but the client guards with `if (res.state)`
        // exactly like joinRoom/startPassAndPlay — must not throw either way.
        ack({ ok: true, code: "NOSTATE", playerId: "p_x", seatToken: "tok_x" });
      }
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/room/NOSTATE"));
  });
});

describe("GameRoomSheet — join-room flow remains unchanged (regression guard)", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockNavigate.mockClear();
    useAuthStore.setState({ kind: "member", userId: "u_verified", capabilities: capabilitiesFor("member") });
    useRoomStore.setState({ playerId: null, roomState: null, gameState: null, playerName: "" });
  });

  it("joinRoom still synchronizes room state before navigating (unchanged, pre-existing behavior)", async () => {
    seedStaleRoomSession();
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:join" && ack) {
        ack({ ok: true, playerId: "p_new_host", seatToken: "tok_new", state: NEW_ROOM });
      }
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    const nameInput = screen.getByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: "Krishna" } });
    const codeInput = screen.getByPlaceholderText(/room code/i);
    fireEvent.change(codeInput, { target: { value: "NEWCD1" } });
    const joinButton = screen.getByRole("button", { name: /join room/i });
    fireEvent.click(joinButton);

    // `joinRoom` now awaits `ensureGuestToken()` before emitting.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/room/NEWCD1"));
    expect(useRoomStore.getState().roomState?.code).toBe("NEWCD1");
  });
});

describe("GameRoomSheet — guest token failure prevents room creation & joining", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockNavigate.mockClear();
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "mock-guest-token",
    };
    useAuthStore.setState({ kind: "member", userId: "u_verified", capabilities: capabilitiesFor("member") });
    useRoomStore.setState({ playerId: null, roomState: null, gameState: null, playerName: "Krishna" });
  });

  afterEach(() => {
    cleanup();
  });

  it("create-room aborts without socket emit when guest credential resolution fails", async () => {
    mockCredentialResult = {
      ok: false,
      error: "We could not prepare your guest session. Check your connection and try again.",
    };

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    // Must show accessible error message
    await waitFor(() => {
      expect(
        screen.getByText(/We could not prepare your guest session/i),
      ).toBeTruthy();
    });

    // Socket create event must NOT be emitted
    expect(mockEmit).not.toHaveBeenCalledWith("room:create", expect.anything(), expect.anything());

    // Navigation must NOT occur
    expect(mockNavigate).not.toHaveBeenCalled();

    // Input must be preserved
    const nameInput = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Krishna");

    // User can retry safely once credentials succeed
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "fresh-guest-token",
    };
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        ack({ ok: true, code: "RETRY1", playerId: "p_host", seatToken: "tok_1", state: NEW_ROOM });
      }
    });

    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        "room:create",
        expect.objectContaining({
          guestToken: "fresh-guest-token",
        }),
        expect.any(Function),
      );
    });
  });

  it("join-room aborts without socket emit when guest credential resolution fails", async () => {
    mockCredentialResult = {
      ok: false,
      error: "We could not prepare your guest session. Check your connection and try again.",
    };

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    const nameInput = screen.getByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: "Krishna" } });
    const codeInput = screen.getByPlaceholderText(/room code/i);
    fireEvent.change(codeInput, { target: { value: "NEWCD1" } });
    const joinButton = screen.getByRole("button", { name: /join room/i });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(
        screen.getByText(/We could not prepare your guest session/i),
      ).toBeTruthy();
    });

    expect(mockEmit).not.toHaveBeenCalledWith("room:join", expect.anything(), expect.anything());
    expect(mockNavigate).not.toHaveBeenCalled();

    // Input fields preserved
    expect((screen.getByLabelText(/your name/i) as HTMLInputElement).value).toBe("Krishna");
    expect((screen.getByPlaceholderText(/room code/i) as HTMLInputElement).value).toBe("NEWCD1");
  });

  it("pass-and-play aborts without socket emit when guest credential resolution fails", async () => {
    mockCredentialResult = {
      ok: false,
      error: "We could not prepare your guest session. Check your connection and try again.",
    };

    render(React.createElement(GameRoomSheet, { game: "ludo", onClose: () => {} }));
    const nameInput = screen.getByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: "Krishna" } });

    // Toggle Pass & Play
    const passPlayToggle = screen.getByLabelText(/toggle pass and play/i);
    fireEvent.click(passPlayToggle);

    // Enter Player 2 name so validation passes and startPassAndPlay proceeds to credential resolution
    const player2Input = screen.getByLabelText(/name for player 2/i);
    fireEvent.change(player2Input, { target: { value: "Radha" } });

    // Primary CTA is now "Start Pass & Play"
    const startButton = screen.getByRole("button", { name: /start pass & play/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(
        screen.getByText(/We could not prepare your guest session/i),
      ).toBeTruthy();
    });

    expect(mockEmit).not.toHaveBeenCalledWith("room:create", expect.anything(), expect.anything());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("rapid double click on create room does not emit duplicate create calls", async () => {
    mockCredentialResult = {
      ok: true,
      kind: "guest",
      accessToken: undefined,
      guestToken: "mock-guest-token",
    };

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    const nameInput = screen.getByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: "Krishna" } });

    const createButton = screen.getByRole("button", { name: /create room/i });
    // Rapid double click
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith("room:create", expect.anything(), expect.anything());
    });

    // Exactly one room:create emit should have been dispatched
    const createEmits = mockEmit.mock.calls.filter((c) => c[0] === "room:create");
    expect(createEmits).toHaveLength(1);
  });

  it("member session resolves accessToken directly and does not supply a guestToken", async () => {
    mockCredentialResult = {
      ok: true,
      kind: "member",
      accessToken: "verified_member_bearer_jwt",
      guestToken: undefined,
    };

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        "room:create",
        expect.objectContaining({
          accessToken: "verified_member_bearer_jwt",
          guestToken: undefined,
        }),
        expect.any(Function),
      );
    });
  });
});
