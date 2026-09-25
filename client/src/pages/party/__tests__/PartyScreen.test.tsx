import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PartyScreen from "../../PartyScreen";
import type { RoomPublicState, Player } from "@shared/types";

// Mock socket
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock("../../../lib/socket", () => ({
  getSocket: () => mockSocket,
}));

// Mock permissions
vi.mock("../../../store/authStore", () => ({
  useCapabilities: () => ({
    spectate: true,
  }),
}));

const mockPlayers: Player[] = [
  {
    id: "p1",
    name: "Alice",
    isHost: true,
    isReady: true,
    isBot: false,
    isConnected: true,
    avatar: "avatar-01",
  },
  {
    id: "p2",
    name: "Bob",
    isHost: false,
    isReady: true,
    isBot: false,
    isConnected: true,
    avatar: "avatar-02",
  },
];

const mockLobbyRoom: RoomPublicState = {
  code: "TV1234",
  game: "ludo",
  phase: "lobby",
  players: mockPlayers,
  hostId: "p1",
  maxPlayers: 4,
  name: "Living Room Arcade",
  history: [],
  champion: null,
  unoHistory: [],
  unoChampion: null,
  bingoHistory: [],
  ludoHistory: [],
  sealed: false,
  spectatorCount: 1,
  entryStakeCoins: 0,
};

const renderPartyScreen = (code = "TV1234") => {
  return render(
    <MemoryRouter initialEntries={[`/tv/${code}`]}>
      <Routes>
        <Route path="/tv/:code" element={<PartyScreen />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("PartyScreen (TV Mode Spectator Experience)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("emits room:spectate on mount with uppercase code without taking a seat", () => {
    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === "room:spectate" && typeof cb === "function") {
        cb({ ok: true });
      }
    });

    renderPartyScreen("tv1234");

    expect(mockSocket.emit).toHaveBeenCalledWith("room:spectate", "TV1234", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("room:state", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("game:state", expect.any(Function));
  });

  it("renders TV lobby with Room Code, QR code, and connected controllers", async () => {
    let roomStateListener: ((state: RoomPublicState) => void) | null = null;

    mockSocket.on.mockImplementation((event, listener) => {
      if (event === "room:state") {
        roomStateListener = listener;
      }
    });

    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === "room:spectate" && typeof cb === "function") {
        cb({ ok: true });
      }
    });

    renderPartyScreen("TV1234");

    // Trigger room state
    if (roomStateListener) {
      fireEvent(window, new CustomEvent("dummy")); // flush
      (roomStateListener as (state: RoomPublicState) => void)(mockLobbyRoom);
    }

    await waitFor(() => {
      expect(screen.getByText("Living Room Arcade")).toBeDefined();
    });

    // Code displayed in header and hero
    expect(screen.getAllByText("TV1234").length).toBeGreaterThan(0);
    // Player controllers
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Connected Controllers")).toBeDefined();
  });

  it("renders live spectator arena when phase is playing with active turn and no private hands", async () => {
    let roomStateListener: ((state: RoomPublicState) => void) | null = null;
    let gameStateListener: ((state: Record<string, unknown>) => void) | null = null;

    mockSocket.on.mockImplementation((event, listener) => {
      if (event === "room:state") roomStateListener = listener;
      if (event === "game:state") gameStateListener = listener;
    });

    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === "room:spectate" && typeof cb === "function") {
        cb({ ok: true });
      }
    });

    renderPartyScreen("TV1234");

    const playingRoom: RoomPublicState = {
      ...mockLobbyRoom,
      phase: "playing",
    };

    if (roomStateListener) {
      (roomStateListener as (state: RoomPublicState) => void)(playingRoom);
    }

    if (gameStateListener) {
      (gameStateListener as (state: Record<string, unknown>) => void)({
        kind: "ludo",
        phase: "playing",
        turnPlayerId: "p1",
        turnPhase: "rolling",
        diceValue: 6,
        turnDeadline: Date.now() + 20000,
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Active Turn")).toBeDefined();
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
      expect(screen.getByText("Latest Roll")).toBeDefined();
    });

    // Ensure private data like cards are not rendered
    expect(screen.queryByText("myHand")).toBeNull();
  });

  it("renders Olympic/Arcade Victory Podium when match is finished", async () => {
    let roomStateListener: ((state: RoomPublicState) => void) | null = null;
    let gameStateListener: ((state: Record<string, unknown>) => void) | null = null;

    mockSocket.on.mockImplementation((event, listener) => {
      if (event === "room:state") roomStateListener = listener;
      if (event === "game:state") gameStateListener = listener;
    });

    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === "room:spectate" && typeof cb === "function") {
        cb({ ok: true });
      }
    });

    renderPartyScreen("TV1234");

    const finishedRoom: RoomPublicState = {
      ...mockLobbyRoom,
      phase: "finished",
    };

    if (roomStateListener) {
      (roomStateListener as (state: RoomPublicState) => void)(finishedRoom);
    }

    if (gameStateListener) {
      (gameStateListener as (state: Record<string, unknown>) => void)({
        kind: "ludo",
        phase: "finished",
        winnerId: "p1",
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Victory Podium")).toBeDefined();
      expect(screen.getByText("#1 CHAMPION")).toBeDefined();
      expect(screen.getByText("Runner-Up")).toBeDefined();
    });
  });

  it("supports keyboard shortcuts and cleans up listeners on unmount", () => {
    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === "room:spectate" && typeof cb === "function") cb({ ok: true });
    });

    const { unmount } = renderPartyScreen("TV1234");

    // Space key triggers audio toggle without error
    fireEvent.keyDown(window, { code: "Space" });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith("room:state", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("game:state", expect.any(Function));
    expect(mockSocket.emit).toHaveBeenCalledWith("room:stopSpectate");
  });
});
