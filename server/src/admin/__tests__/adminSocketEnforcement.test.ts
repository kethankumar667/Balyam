import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Socket, Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, UnoPlayerState } from "@shared/types.js";
import { RoomManager, type Room } from "../../rooms/RoomManager.js";
import { UnoEngine, type InternalUnoState } from "../../games/uno/UnoEngine.js";
import { registerSocketHandlers } from "../../sockets/index.js";
import { InMemoryProgressionRepository, setProgressionRepository } from "../../persistence/index.js";
import { AdminPlayerService, MemoryAdminPlayerStore, setAdminPlayerService } from "../AdminPlayerService.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { profileService } from "../../profile/ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";

function socketHarness(id: string) {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const middleware: Array<(packet: unknown[], next: (error?: Error) => void) => void> = [];
  const socket = { id, connected: true, data: {} as Record<string, unknown>,
    on: (event: string, handler: (...args: unknown[]) => unknown) => handlers.set(event, handler),
    use: (handler: (packet: unknown[], next: (error?: Error) => void) => void) => middleware.push(handler),
    disconnect: vi.fn(), emit: vi.fn(), join: vi.fn(), leave: vi.fn() };
  return { socket, handlers, middleware };
}

describe("socket moderation enforcement", () => {
  let repo: InMemoryProgressionRepository;
  let service: AdminPlayerService;
  beforeEach(() => {
    vi.useFakeTimers();
    clearGuestIdentityProvisioningCache();
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    service = new AdminPlayerService(new MemoryAdminPlayerStore(repo), () => ["operator"]);
    setAdminPlayerService(service);
  });
  afterEach(async () => {
    await progressionSync.drain();
    profileService.reset();
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    setAdminPlayerService(null); setProgressionRepository(null);
  });
  function roomHarness() {
    const harness = socketHarness("host-socket");
    const roomEmit = vi.fn();
    const sockets = new Map([[harness.socket.id, harness.socket]]);
    const io = { to: () => ({ emit: roomEmit }), sockets: { sockets } } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
    const rooms = new RoomManager(io);
    registerSocketHandlers(io, harness.socket as unknown as Socket<ClientToServerEvents, ServerToClientEvents>, rooms);
    return { ...harness, rooms, roomEmit, sockets };
  }

  describe("join acknowledgement snapshots", () => {
    it.each(["playing", "finished"] as const)("returns only the accepted caller's UNO hand for %s reclaim and never broadcasts it", async (phase) => {
      const harness = roomHarness();
      const opponent = socketHarness("opponent-socket");
      const spectator = socketHarness("spectator-socket");
      harness.sockets.set(opponent.socket.id, opponent.socket);
      harness.sockets.set(spectator.socket.id, spectator.socket);
      const seat = harness.rooms.createRoom("old-socket", "Host", "uno");
      const otherSeat = harness.rooms.joinRoom(opponent.socket.id, "Opponent", seat.code);
      if (!otherSeat.ok) throw new Error(otherSeat.error);
      const room = (harness.rooms as unknown as { rooms: Map<string, Room> }).rooms.get(seat.code)!;
      const engine = new UnoEngine();
      engine.setRng(() => 0.5);
      engine.init([...room.players.values()]);
      if (phase === "finished") {
        const internal = engine as unknown as { state: InternalUnoState };
        internal.state.phase = "finished";
        internal.state.winnerId = seat.playerId;
      }
      room.engine = engine;
      room.phase = phase;
      room.spectators.add(spectator.socket.id);
      opponent.socket.emit.mockClear();
      spectator.socket.emit.mockClear();
      harness.roomEmit.mockClear();
      const ack = vi.fn();
      await harness.handlers.get("room:join")!({ name: "Host", code: seat.code.toLowerCase(), playerId: seat.playerId, seatToken: seat.seatToken }, ack);

      const response = ack.mock.calls[0][0] as Parameters<Parameters<ClientToServerEvents["room:join"]>[1]>[0];
      expect(response).toMatchObject({ ok: true, playerId: seat.playerId });
      expect(response.gameState).toEqual(engine.getStateFor(seat.playerId));
      expect(response.gameState).not.toEqual(engine.getStateFor(otherSeat.playerId));
      for (const [event, state] of opponent.socket.emit.mock.calls) {
        if (event === "game:state") expect((state as UnoPlayerState).myHand).toEqual(engine.getStateFor(otherSeat.playerId).myHand);
      }
      for (const [event, state] of spectator.socket.emit.mock.calls) {
        if (event === "game:state") expect(state).not.toHaveProperty("myHand");
      }
      expect(harness.roomEmit.mock.calls.every(([event]) => event !== "game:state")).toBe(true);
      expect(JSON.stringify(harness.roomEmit.mock.calls)).not.toContain('"myHand"');

      ack.mockClear();
      await harness.handlers.get("room:join")!({ name: "Host", code: seat.code, playerId: otherSeat.playerId }, ack);
      expect(ack.mock.calls[0][0]).toMatchObject({ ok: true, playerId: seat.playerId, gameState: engine.getStateFor(seat.playerId) });
    });

    it("returns null for a lobby and never reads private state for a rejected join", async () => {
      const harness = roomHarness();
      const seat = harness.rooms.createRoom(harness.socket.id, "Host", "uno");
      const ack = vi.fn();
      await harness.handlers.get("room:join")!({ name: "Host", code: seat.code }, ack);
      expect(ack.mock.calls[0][0]).toMatchObject({ ok: true, gameState: null });

      ack.mockClear();
      await harness.handlers.get("room:join")!({ name: "Host", code: "ABSENT" }, ack);
      expect(ack).toHaveBeenCalledWith({ ok: false, error: "Room not found" });
    });

    it("returns null without an engine and refuses an unverified private-seat claim", async () => {
      const harness = roomHarness();
      const seat = harness.rooms.createRoom("old-socket", "Host", "uno");
      const otherSeat = harness.rooms.joinRoom("other-socket", "Opponent", seat.code);
      if (!otherSeat.ok) throw new Error(otherSeat.error);
      const room = (harness.rooms as unknown as { rooms: Map<string, Room> }).rooms.get(seat.code)!;
      room.phase = "playing";
      const ack = vi.fn();
      await harness.handlers.get("room:join")!({ name: "Host", code: seat.code, playerId: seat.playerId, seatToken: seat.seatToken }, ack);
      expect(ack.mock.calls[0][0]).toMatchObject({ ok: true, gameState: null });

      const engine = new UnoEngine();
      engine.init([...room.players.values()]);
      room.engine = engine;
      const readPrivate = vi.spyOn(engine, "getStateFor");
      const stranger = socketHarness("stranger-socket");
      registerSocketHandlers(
        { to: () => ({ emit: vi.fn() }), sockets: { sockets: harness.sockets } } as unknown as Server<ClientToServerEvents, ServerToClientEvents>,
        stranger.socket as unknown as Socket<ClientToServerEvents, ServerToClientEvents>,
        harness.rooms,
      );
      ack.mockClear();
      await stranger.handlers.get("room:join")!({ name: "Stranger", code: seat.code, playerId: otherSeat.playerId, seatToken: "invalid" }, ack);
      expect(ack.mock.calls[0][0]).toMatchObject({ ok: false });
      expect(ack.mock.calls[0][0]).not.toHaveProperty("gameState");
      expect(readPrivate).not.toHaveBeenCalled();
      expect(harness.rooms.getGameStateForSocket(stranger.socket.id)).toBeNull();
    });
  });
  it("disconnects bound sockets and rejects packets without querying the store", async () => {
    const guest = mintGuestToken();
    const harness = roomHarness();
    const ack = vi.fn();
    await harness.handlers.get("room:create")!({ name: "Host", game: "ludo", guestToken: guest.token }, ack);
    expect(ack.mock.calls[0][0]).toMatchObject({ ok: true });
    await service.moderate("operator", guest.playerId, { action: "suspend", reason: "Abuse", expectedRevision: 0 });
    expect(harness.socket.disconnect).toHaveBeenCalledWith(true);
    const read = vi.spyOn(repo, "getIdentity");
    const next = vi.fn();
    harness.middleware[0](["game:move", { playerId: "another-user" }], next);
    expect(next).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it("denies a suspended stored-seat reclaim even when a different identity is supplied", async () => {
    const guest = mintGuestToken();
    await repo.upsertIdentity({ playerId: guest.playerId, kind: "guest", authUserId: null, lastSeenAt: Date.now() });
    const harness = roomHarness();
    const args: unknown[] = ["old-socket", "Host", "ludo"];
    while (args.length < harness.rooms.createRoom.length - 3) args.push(undefined);
    args.push("guest", guest.playerId);
    const seat = harness.rooms.createRoom(...args as Parameters<RoomManager["createRoom"]>);
    await service.moderate("operator", guest.playerId, { action: "suspend", reason: "Abuse", expectedRevision: 0 });
    expect(harness.rooms.joinRoom("new-socket", "Host", seat.code, seat.playerId, seat.seatToken, undefined, "member", "someone-else")).toMatchObject({ ok: false });
    await service.moderate("operator", guest.playerId, { action: "resume", reason: "Appeal", expectedRevision: 1 });
    expect(harness.rooms.joinRoom("new-socket", "Host", seat.code, seat.playerId, seat.seatToken)).toMatchObject({ ok: true });
  });
  it("rechecks denial after asynchronous guest provisioning before creating a room", async () => {
    const guest = mintGuestToken();
    await repo.upsertIdentity({ playerId: guest.playerId, kind: "guest", authUserId: null, lastSeenAt: Date.now() });
    let release: () => void = () => { throw new Error("missing deferred write"); };
    const pending = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(repo, "upsertIdentity").mockImplementation(async () => { await pending; });
    const harness = roomHarness();
    const create = vi.spyOn(harness.rooms, "createRoom");
    const ack = vi.fn();
    const request = harness.handlers.get("room:create")!({ name: "Host", game: "ludo", guestToken: guest.token }, ack);
    await service.moderate("operator", guest.playerId, { action: "suspend", reason: "Abuse", expectedRevision: 0 });
    release();
    await request;
    expect(create).not.toHaveBeenCalled();
    expect(ack.mock.calls[0][0]).toMatchObject({ ok: false });
  });

  it("records verified humans canonically and retains a bot win without synthetic identities", async () => {
    const human = mintGuestToken();
    profileService.recordMatchFinished({ roomCode: "BOTWIN", game: "ludo", startedAt: 1000, finishedAt: 61000,
      durationMs: 60000, winnerId: "bot-winner", participants: [
        { playerId: human.playerId, identityId: human.playerId, name: "Human", isWinner: false },
        { playerId: "bot-winner", identityId: null, name: "Bot", isBot: true, isWinner: true },
        { playerId: "p_local", identityId: null, name: "Local", isLocal: true, isWinner: false },
      ] });
    await progressionSync.drain();
    expect(await repo.getIdentity("p_local")).toBeNull();
    expect(await repo.getIdentity("bot-winner")).toBeNull();
    const records = await repo.listMatchesForPlayer(human.playerId);
    expect(records.matches[0]).toMatchObject({ winnerId: null, winnerKind: "bot", self: { isWinner: false } });
    expect(records.matches[0].participants.map(participant => participant.playerId)).toEqual([human.playerId]);
  });

  it("maps RoomManager human seats to verified identities before profile recording", () => {
    const harness = roomHarness();
    const args: unknown[] = ["host-socket", "Host", "ludo"];
    while (args.length < harness.rooms.createRoom.length - 3) args.push(undefined);
    args.push("member", "canonical-human");
    const seat = harness.rooms.createRoom(...args as Parameters<RoomManager["createRoom"]>);
    const internal = harness.rooms as unknown as { rooms: Map<string, unknown>; recordPostMatchStats(room: unknown): void };
    const record = vi.spyOn(profileService, "recordMatchFinished").mockImplementation(() => undefined);
    internal.recordPostMatchStats(internal.rooms.get(seat.code));
    expect(record.mock.calls[0][0].participants[0]).toMatchObject({ playerId: "canonical-human", identityId: "canonical-human" });
  });

  it("records a shared account once when it holds multiple seats", () => {
    const harness = roomHarness();
    const args: unknown[] = ["host-socket", "Host", "ludo"];
    while (args.length < harness.rooms.createRoom.length - 3) args.push(undefined);
    args.push("member", "canonical-human");
    const seat = harness.rooms.createRoom(...args as Parameters<RoomManager["createRoom"]>);
    const joined = harness.rooms.joinRoom("second-socket", "Second", seat.code, undefined, undefined, undefined, "member", "canonical-human");
    expect(joined.ok).toBe(true);
    const internal = harness.rooms as unknown as { rooms: Map<string, unknown>; recordPostMatchStats(room: unknown): void };
    const record = vi.spyOn(profileService, "recordMatchFinished").mockImplementation(() => undefined);
    internal.recordPostMatchStats(internal.rooms.get(seat.code));
    expect(record.mock.calls[0][0].participants).toHaveLength(1);
    expect(record.mock.calls[0][0].participants[0]).toMatchObject({ playerId: "canonical-human", identityId: "canonical-human" });
  });
});