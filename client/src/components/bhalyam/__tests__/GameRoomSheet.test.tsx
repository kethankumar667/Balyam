import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { RoomPublicState } from "@shared/types";
import { capabilitiesFor } from "@shared/permissions";

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

  it("writes the returned room state to the store BEFORE navigating — reproduces stale Zustand state first", () => {
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

    expect(mockNavigate).toHaveBeenCalledTimes(1); // navigation happens exactly once
    expect(mockNavigate).toHaveBeenCalledWith("/room/NEWCD1");
    expect(storeSnapshotAtNavigateTime).not.toBeNull();
    expect(storeSnapshotAtNavigateTime!.roomState?.code).toBe("NEWCD1"); // NOT the stale STALE1
    expect(storeSnapshotAtNavigateTime!.roomState?.players).toEqual(NEW_ROOM.players); // stale players replaced
  });

  it("new player ID and new room state are mutually consistent: the new playerId is a real seat in the new roomState", () => {
    seedStaleRoomSession();
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        ack({ ok: true, code: NEW_ROOM.code, playerId: "p_new_host", seatToken: "tok_new", state: NEW_ROOM });
      }
    });

    render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
    fillNameAndClickCreate("Krishna");

    const finalState = useRoomStore.getState();
    expect(finalState.playerId).toBe("p_new_host");
    // The exact invariant Room.tsx's own `roomState.players.find(p => p.id
    // === playerId)` depends on — this is what throws/renders undefined
    // when stale state and a fresh playerId are combined.
    const selfSeat = finalState.roomState?.players.find((p) => p.id === finalState.playerId);
    expect(selfSeat).toBeDefined();
    expect(selfSeat?.id).toBe("p_new_host");
  });

  it("does not depend on a later room:state socket event — the store is already correct synchronously, from the ack alone", () => {
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

    expect(useRoomStore.getState().roomState?.code).toBe("NEWCD1");
  });

  it("a missing res.state on a successful create response is handled safely (no throw), matching the verified socket contract", () => {
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (res: unknown) => void) => {
      if (event === "room:create" && ack) {
        // Contractually never happens (server's createRoom return type
        // requires `state`), but the client guards with `if (res.state)`
        // exactly like joinRoom/startPassAndPlay — must not throw either way.
        ack({ ok: true, code: "NOSTATE", playerId: "p_x", seatToken: "tok_x" });
      }
    });

    expect(() => {
      render(React.createElement(GameRoomSheet, { game: "rps", onClose: () => {} }));
      fillNameAndClickCreate("Krishna");
    }).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/room/NOSTATE");
  });
});

describe("GameRoomSheet — join-room flow remains unchanged (regression guard)", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockNavigate.mockClear();
    useAuthStore.setState({ kind: "member", capabilities: capabilitiesFor("member") });
    useRoomStore.setState({ playerId: null, roomState: null, gameState: null, playerName: "" });
  });

  it("joinRoom still synchronizes room state before navigating (unchanged, pre-existing behavior)", () => {
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

    expect(useRoomStore.getState().roomState?.code).toBe("NEWCD1");
    expect(mockNavigate).toHaveBeenCalledWith("/room/NEWCD1");
  });
});
