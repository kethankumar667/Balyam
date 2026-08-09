import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomManager } from "../RoomManager.js";

/**
 * Reconnecting into a solo-vs-bots game.
 *
 * The reported failure: playing Ludo against bots, wifi dropped, mobile data
 * came up, and the player could never get back in. Two independent defects
 * produced that, and both are pinned here.
 *
 *  1. The room was destroyed. `handleDisconnect` deleted the seat after 90s
 *     and then abandoned the room because no humans remained — but the only
 *     human was the one trying to return. Rejoining hit "Room not found".
 *
 *  2. The game played itself. The absent seat was auto-played and the bots
 *     kept moving, so even a successful rejoin landed on a finished match.
 *
 * (The third defect, the client giving up after ~37 seconds of retries, lives
 * in client/src/lib/socket.ts and is not reachable from here.)
 */

function makeHarness() {
  const emitted: { target: string; event: string; payload: unknown }[] = [];
  const mk = (id: string) => ({
    join: () => {},
    leave: () => {},
    emit: (event: string, payload: unknown) => emitted.push({ target: id, event, payload }),
  });
  const sockets = new Map<string, ReturnType<typeof mk>>();
  for (const id of ["sockA", "sockB", "sockA2"]) sockets.set(id, mk(id));

  const io = {
    sockets: { sockets },
    to: (code: string) => ({
      emit: (event: string, payload: unknown) =>
        emitted.push({ target: `room:${code}`, event, payload }),
    }),
  };
  return { rooms: new RoomManager(io as never), emitted };
}

/** Alice alone against one bot, mid-game. */
function soloVsBots() {
  const h = makeHarness();
  const { code, playerId } = h.rooms.createRoom("sockA", "Alice", "ludo");
  h.rooms.addBot("sockA", "Botty");
  h.rooms.setReady("sockA", true);
  h.rooms.startGame("sockA");
  return { ...h, code, playerId };
}

/** Alice and Bob, both human. */
function twoHumans() {
  const h = makeHarness();
  const { code, playerId } = h.rooms.createRoom("sockA", "Alice", "ludo");
  h.rooms.joinRoom("sockB", "Bob", code);
  h.rooms.setReady("sockA", true);
  h.rooms.setReady("sockB", true);
  h.rooms.startGame("sockA");
  return { ...h, code, playerId };
}

function roomExists(rooms: RoomManager, code: string): boolean {
  return (rooms as unknown as { rooms: Map<string, unknown> }).rooms.has(code);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("solo player vs bots loses connection", () => {
  it("keeps the room alive well past the multiplayer grace period", () => {
    const g = soloVsBots();
    g.rooms.handleDisconnect("sockA");

    // The old code deleted the room at 90s. Nobody was waiting on this seat —
    // every other player is a bot — so destroying it only punished the
    // person trying to come back.
    vi.advanceTimersByTime(120_000);
    expect(roomExists(g.rooms, g.code)).toBe(true);
  });

  it("lets them reclaim their seat after a long outage", () => {
    const g = soloVsBots();
    g.rooms.handleDisconnect("sockA");
    vi.advanceTimersByTime(5 * 60_000);

    const res = g.rooms.joinRoom("sockA2", "Alice", g.code, g.playerId);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.playerId).toBe(g.playerId);
  });

  it("does not auto-play their seat while they are away", () => {
    const g = soloVsBots();
    g.rooms.handleDisconnect("sockA");
    vi.advanceTimersByTime(60_000);

    const room = (g.rooms as unknown as {
      rooms: Map<string, { players: Map<string, { id: string; isAutoPlaying?: boolean }> }>;
    }).rooms.get(g.code)!;
    const alice = room.players.get(g.playerId)!;
    // Coming back to a match the bots finished is worse than the wait.
    expect(alice.isAutoPlaying).toBeFalsy();
  });

  it("eventually gives the room up rather than leaking it forever", () => {
    const g = soloVsBots();
    g.rooms.handleDisconnect("sockA");
    // Held generously, but not indefinitely — an abandoned room must not
    // stay resident for the life of the process.
    vi.advanceTimersByTime(11 * 60_000);
    expect(roomExists(g.rooms, g.code)).toBe(false);
  });

  it("still marks them away immediately, so the UI can say so", () => {
    const g = soloVsBots();
    g.rooms.handleDisconnect("sockA");
    const room = (g.rooms as unknown as {
      rooms: Map<string, { players: Map<string, { isConnected: boolean }> }>;
    }).rooms.get(g.code)!;
    expect(room.players.get(g.playerId)!.isConnected).toBe(false);
  });
});

describe("multiplayer behaviour is unchanged", () => {
  it("still takes over an absent seat when other humans are waiting", () => {
    const g = twoHumans();
    g.rooms.handleDisconnect("sockA");
    // Long enough for the takeover to arm, short of the 90s seat cleanup.
    vi.advanceTimersByTime(30_000);

    const room = (g.rooms as unknown as {
      rooms: Map<string, { players: Map<string, { id: string; isAutoPlaying?: boolean }> }>;
    }).rooms.get(g.code)!;
    // With Bob sitting there, Alice's empty seat must not stall the table.
    expect(room.players.get(g.playerId)!.isAutoPlaying).toBe(true);
  });

  it("still drops an absent seat on the short grace period", () => {
    const g = twoHumans();
    g.rooms.handleDisconnect("sockA");
    vi.advanceTimersByTime(95_000);

    const room = (g.rooms as unknown as {
      rooms: Map<string, { players: Map<string, unknown> }>;
    }).rooms.get(g.code);
    expect(room?.players.has(g.playerId)).toBe(false);
  });
});
