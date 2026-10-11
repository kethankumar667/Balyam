import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, ReactionRecvPayload } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";
import { peek } from "./roomTestKit.js";

/**
 * A friend's match can be watched from outside the table, and the audience can cheer and nothing
 * else. These pin the two server rules that make that safe: which rooms are offered as watchable
 * (never a sealed one, never a lobby), and what a spectator socket is allowed to send.
 */
function makeIo() {
  const emitted: Array<{ room?: string; event: string; payload: unknown }> = [];
  const io = {
    sockets: { sockets: new Map() },
    to: (room: string) => ({ emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }) }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  const reactions = () => emitted.filter((e) => e.event === "room:reaction").map((e) => e.payload as ReactionRecvPayload);
  const notices = () => emitted.filter((e) => e.event === "chat:message").map((e) => (e.payload as { text: string }).text);
  return { io, reactions, notices };
}

function startedLudoRoom(rooms: RoomManager) {
  const { code } = rooms.createRoom("sockA", "Alice", "ludo");
  rooms.joinRoom("sockB", "Bob", code);
  rooms.addBot("sockA");
  rooms.setReady("sockA", true);
  rooms.setReady("sockB", true);
  rooms.startGame("sockA");
  return code;
}

describe("getWatchableRoomsByPlayer", () => {
  it("lists nobody while the table is still a lobby", () => {
    const rooms = new RoomManager(makeIo().io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);

    expect(rooms.getWatchableRoomsByPlayer().size).toBe(0);
  });

  it("gives the room code for every human in a match under way, and never for a bot", () => {
    const rooms = new RoomManager(makeIo().io);
    const code = startedLudoRoom(rooms);
    const room = peek(rooms, code);
    const players = [...room.players.values()];
    const human = players.filter((p) => !p.isBot);
    const bot = players.find((p) => p.isBot)!;

    const watchable = rooms.getWatchableRoomsByPlayer();

    for (const p of human) expect(watchable.get(p.id)).toBe(code);
    expect(watchable.has(bot.id)).toBe(false);
  });

  it("also answers to the verified account id, which is how a Mandali knows its members", () => {
    const rooms = new RoomManager(makeIo().io);
    const code = startedLudoRoom(rooms);
    [...peek(rooms, code).players.values()].find((p) => p.name === "Alice")!.identityId = "acct_alice";

    expect(rooms.getWatchableRoomsByPlayer().get("acct_alice")).toBe(code);
  });

  it("leaves out a sealed room: it takes nobody new, so offering Watch would always fail", () => {
    const rooms = new RoomManager(makeIo().io);
    const code = startedLudoRoom(rooms);
    const room = peek(rooms, code);
    // A guest inheriting the host seat seals the room on the way (see `reassignHost`).
    (rooms as unknown as { sealRoom(r: unknown): void }).sealRoom(room);
    expect(room.sealed).toBe(true);

    expect(rooms.getWatchableRoomsByPlayer().size).toBe(0);
  });

  it("does not count a seat held open for someone who has dropped", () => {
    const rooms = new RoomManager(makeIo().io);
    const code = startedLudoRoom(rooms);
    const bob = [...peek(rooms, code).players.values()].find((p) => p.name === "Bob")!;
    bob.isConnected = false;

    expect(rooms.getWatchableRoomsByPlayer().has(bob.id)).toBe(false);
  });
});

describe("what an audience member can send", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function watched() {
    const { io, reactions } = makeIo();
    const rooms = new RoomManager(io);
    const code = startedLudoRoom(rooms);
    expect(rooms.spectateRoom("viewer", code, "member").ok).toBe(true);
    return { rooms, code, reactions };
  }

  it("lets a spectator cheer, shown as the audience and aimed at nobody", () => {
    const { rooms, reactions } = watched();

    rooms.sendReaction("viewer", "🔥");

    expect(reactions()).toHaveLength(1);
    expect(reactions()[0]).toMatchObject({ fromPlayerId: "audience", fromAudience: true, emoji: "🔥" });
    expect(reactions()[0].targetPlayerId).toBeUndefined();
  });

  it("ignores a target: an audience member cannot aim a reaction at a player", () => {
    const { rooms, code, reactions } = watched();
    const playerId = [...peek(rooms, code).players.keys()][0];

    rooms.sendReaction("viewer", "👏", playerId);

    expect(reactions()).toHaveLength(1);
    expect(reactions()[0].targetPlayerId).toBeUndefined();
  });

  it.each(["🍅", "🩴", "🧨", "💔", "⏰", "🐌", "💣"])("drops %s: throwables, nudges and unknown emoji are for seated players only", (emoji) => {
    const { rooms, reactions } = watched();

    rooms.sendReaction("viewer", emoji);

    expect(reactions()).toHaveLength(0);
  });

  it("allows a short burst, then holds the rest, and recovers once the window passes", () => {
    const { rooms, reactions } = watched();

    for (let i = 0; i < 6; i++) rooms.sendReaction("viewer", "🎉");
    expect(reactions()).toHaveLength(3);

    vi.advanceTimersByTime(4_100);
    rooms.sendReaction("viewer", "🎉");
    expect(reactions()).toHaveLength(4);
  });

  it("budgets each spectator separately", () => {
    const { rooms, code, reactions } = watched();
    rooms.spectateRoom("viewer2", code, "member");

    for (let i = 0; i < 3; i++) rooms.sendReaction("viewer", "🎉");
    rooms.sendReaction("viewer2", "🎉");

    expect(reactions()).toHaveLength(4);
  });

  it("drops a reaction from a socket that is neither seated nor watching", () => {
    const { rooms, reactions } = watched();

    rooms.sendReaction("stranger", "🔥");

    expect(reactions()).toHaveLength(0);
  });

  it("stops accepting reactions the moment the spectator leaves", () => {
    const { rooms, reactions } = watched();
    rooms.stopSpectating("viewer");

    rooms.sendReaction("viewer", "🔥");

    expect(reactions()).toHaveLength(0);
  });

  it("gives a returning spectator a fresh budget rather than a stale one", () => {
    const { rooms, code, reactions } = watched();
    for (let i = 0; i < 3; i++) rooms.sendReaction("viewer", "🎉");
    rooms.stopSpectating("viewer");
    rooms.spectateRoom("viewer", code, "member");

    rooms.sendReaction("viewer", "🎉");

    expect(reactions()).toHaveLength(4);
  });

  it("leaves a seated player's reactions exactly as they were: throwables and targets still work", () => {
    const { rooms, code, reactions } = watched();
    const bobId = [...peek(rooms, code).players.values()].find((p) => p.name === "Bob")!.id;

    rooms.sendReaction("sockA", "🍅", bobId);

    expect(reactions()).toHaveLength(1);
    expect(reactions()[0]).toMatchObject({ emoji: "🍅", targetPlayerId: bobId });
    expect(reactions()[0].fromAudience).toBeUndefined();
  });
});

describe("telling the table it has an audience", () => {
  it("says so in the room chat when someone starts watching a live match", () => {
    const { io, notices } = makeIo();
    const rooms = new RoomManager(io);
    const code = startedLudoRoom(rooms);

    rooms.spectateRoom("viewer", code, "member");

    expect(notices()).toContain("Someone is now watching this match.");
  });

  it("counts them when more arrive", () => {
    const { io, notices } = makeIo();
    const rooms = new RoomManager(io);
    const code = startedLudoRoom(rooms);

    rooms.spectateRoom("viewer", code, "member");
    rooms.spectateRoom("viewer2", code, "member");

    expect(notices()).toContain("2 people are now watching this match.");
  });

  it("does not announce a screen attaching to a lobby", () => {
    const { io, notices } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");

    rooms.spectateRoom("tv", code, "member");

    expect(notices()).toHaveLength(0);
  });
});
