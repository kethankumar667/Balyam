import { describe, expect, it } from "vitest";
import { RoomManager } from "../RoomManager.js";

/**
 * Smart TV / Party Mode — the spectator role.
 *
 * The security property under test is one line in `broadcastGameState`:
 * screens get `getPublicState()`, seats get `getStateFor(playerId)`. A TV in
 * a living room is the least private surface in the app, so a regression that
 * sends it a player's hand would expose every card in the room to anyone
 * glancing at the screen.
 *
 * The second property is that a screen is not a player: it must not take a
 * seat, move, stall a turn, or inherit the host role.
 */

interface Emitted {
  target: string;
  event: string;
  payload: unknown;
}

function makeHarness() {
  const emitted: Emitted[] = [];
  const joined = new Map<string, Set<string>>();
  const mkSocket = (id: string) => ({
    join: (c: string) => {
      if (!joined.has(id)) joined.set(id, new Set());
      joined.get(id)!.add(c);
    },
    leave: (c: string) => joined.get(id)?.delete(c),
    emit: (event: string, payload: unknown) => emitted.push({ target: id, event, payload }),
  });
  const sockets = new Map<string, ReturnType<typeof mkSocket>>();
  for (const id of ["sockA", "sockB", "tv1", "tv2"]) sockets.set(id, mkSocket(id));

  const io = {
    sockets: { sockets },
    to: (code: string) => ({
      emit: (event: string, payload: unknown) =>
        emitted.push({ target: `room:${code}`, event, payload }),
    }),
  };

  const rooms = new RoomManager(io as never);
  const { code } = rooms.createRoom("sockA", "Alice", "rummy");
  const joinedRes = rooms.joinRoom("sockB", "Bob", code);
  const bobId = joinedRes.ok ? joinedRes.playerId : "";
  rooms.setReady("sockA", true);
  rooms.setReady("sockB", true);
  rooms.startGame("sockA");

  const to = (id: string, event: string) =>
    emitted.filter((e) => e.target === id && e.event === event);

  return { rooms, code, bobId, emitted, to, joined };
}

describe("spectator role", () => {
  it("attaches a screen to a live room", () => {
    const h = makeHarness();
    const res = h.rooms.spectateRoom("tv1", h.code);
    expect(res.ok).toBe(true);
    // It gets the room immediately rather than waiting for the next change.
    expect(h.to("tv1", "room:state").length).toBeGreaterThan(0);
    expect(h.to("tv1", "game:state").length).toBeGreaterThan(0);
  });

  it("is case-insensitive about the room code", () => {
    const h = makeHarness();
    expect(h.rooms.spectateRoom("tv1", h.code.toLowerCase()).ok).toBe(true);
  });

  it("rejects an unknown room", () => {
    const h = makeHarness();
    const res = h.rooms.spectateRoom("tv1", "ZZZZ");
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("refuses to let a seated player also be a screen", () => {
    const h = makeHarness();
    // Otherwise a player could open the TV view and receive a second,
    // differently-filtered copy of state for their own room.
    expect(h.rooms.spectateRoom("sockA", h.code).ok).toBe(false);
  });

  it("NEVER sends a screen a player's private state", () => {
    const h = makeHarness();
    h.rooms.spectateRoom("tv1", h.code);
    h.emitted.length = 0;
    h.rooms.applyMove("sockA", "draw", { from: "closed" });

    const tvStates = h.to("tv1", "game:state").map((e) => e.payload as Record<string, unknown>);
    expect(tvStates.length).toBeGreaterThan(0);
    for (const st of tvStates) {
      // `myHand` is Rummy's private field — its presence on a screen payload
      // is exactly the leak this feature must not have.
      expect(st).not.toHaveProperty("myHand");
    }

    // Meanwhile the seated players still get their own hands.
    const seatStates = h.to("sockA", "game:state").map((e) => e.payload as Record<string, unknown>);
    expect(seatStates.length).toBeGreaterThan(0);
    expect(seatStates[seatStates.length - 1]).toHaveProperty("myHand");
  });

  it("does not let a screen make a move", () => {
    const h = makeHarness();
    h.rooms.spectateRoom("tv1", h.code);
    const before = h.emitted.length;
    // A screen resolves to no player, so the move cannot even be attributed.
    h.rooms.applyMove("tv1", "draw", { from: "closed" });
    const stateBroadcasts = h.emitted
      .slice(before)
      .filter((e) => e.event === "game:state");
    expect(stateBroadcasts).toHaveLength(0);
  });

  it("does not take a seat", () => {
    const h = makeHarness();
    const before = (h.rooms as unknown as {
      rooms: Map<string, { players: Map<string, unknown> }>;
    }).rooms.get(h.code)!.players.size;
    h.rooms.spectateRoom("tv1", h.code);
    const after = (h.rooms as unknown as {
      rooms: Map<string, { players: Map<string, unknown> }>;
    }).rooms.get(h.code)!.players.size;
    expect(after).toBe(before);
  });

  it("reports how many screens are watching, so players know", () => {
    const h = makeHarness();
    h.rooms.spectateRoom("tv1", h.code);
    h.rooms.spectateRoom("tv2", h.code);
    const last = h.emitted
      .filter((e) => e.event === "room:state")
      .map((e) => e.payload as { spectatorCount?: number })
      .pop();
    expect(last?.spectatorCount).toBe(2);
  });

  it("forgets a screen when it disconnects, without touching seats", () => {
    const h = makeHarness();
    h.rooms.spectateRoom("tv1", h.code);
    const room = (h.rooms as unknown as {
      rooms: Map<string, { players: Map<string, { isConnected: boolean }> }>;
    }).rooms.get(h.code)!;
    const connectedBefore = [...room.players.values()].filter((p) => p.isConnected).length;

    h.rooms.handleDisconnect("tv1");

    // A TV going dark must not trigger the disconnect-takeover machinery.
    const connectedAfter = [...room.players.values()].filter((p) => p.isConnected).length;
    expect(connectedAfter).toBe(connectedBefore);
    const last = h.emitted
      .filter((e) => e.event === "room:state")
      .map((e) => e.payload as { spectatorCount?: number })
      .pop();
    expect(last?.spectatorCount).toBe(0);
  });

  it("detaches cleanly on request and stops receiving state", () => {
    const h = makeHarness();
    h.rooms.spectateRoom("tv1", h.code);
    h.rooms.stopSpectating("tv1");
    h.emitted.length = 0;
    h.rooms.applyMove("sockA", "draw", { from: "closed" });
    expect(h.to("tv1", "game:state")).toHaveLength(0);
  });

  it("tolerates a stop from a socket that was never watching", () => {
    const h = makeHarness();
    expect(() => h.rooms.stopSpectating("tv2")).not.toThrow();
  });
});
