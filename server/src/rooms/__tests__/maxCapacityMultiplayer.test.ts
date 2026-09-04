import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";
import { serverLifecycleRegistry } from "../../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../../reliability/ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

const origRequestGameStart = RoomManager.prototype.requestGameStart;
beforeAll(() => {
  RoomManager.prototype.requestGameStart = async function (socketId: string) {
    const res = await origRequestGameStart.call(this, socketId);
    const { room } = this.lookup(socketId);
    if (room?.activeStartAttempt && room.activeStartAttempt.status === "COLLECTING_PREFLIGHT") {
      const attempt = room.activeStartAttempt;
      for (const [sId, pId] of room.socketToPlayer.entries()) {
        if (attempt.requiredHumanPlayerIds.has(pId)) {
          await this.acknowledgeStart(sId, {
            startAttemptId: attempt.id,
            roomRevision: attempt.roomRevision,
            visible: true,
            orientationSatisfied: true,
          });
        }
      }
    }
    return res;
  };
});
afterAll(() => {
  RoomManager.prototype.requestGameStart = origRequestGameStart;
});

function makeIo() {
  const roomEmits: { room: string; event: string; data?: unknown }[] = [];
  const socketEmits: { socketId: string; event: string; data?: unknown }[] = [];
  const sockets = new Map<string, { id: string; join: (r: string) => void; leave: (r: string) => void; emit: (ev: string, data?: unknown) => void }>();

  const registerSocket = (id: string) => {
    const sock = {
      id,
      join: (_r: string) => {},
      leave: (_r: string) => {},
      emit: (event: string, data?: unknown) => {
        socketEmits.push({ socketId: id, event, data });
      },
    };
    sockets.set(id, sock);
    return sock;
  };

  const io = {
    sockets: {
      sockets,
      get: (id: string) => sockets.get(id),
    },
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => roomEmits.push({ room, event, data }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, registerSocket, roomEmits, socketEmits };
}

function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 3;
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function joinRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  code: string,
  accountKind: AccountKind,
  identityId: string | null,
) {
  return rooms.joinRoom(socketId, name, code, undefined, undefined, undefined, accountKind, identityId);
}

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({
    identityId,
    identityKind: "member",
    balance,
    lifetimeGranted: balance,
    starterGranted: true,
  });
}

describe("BHALYAM — Maximum Capacity Multiplayer & Dynamic Economy Certification", () => {
  let repo: InMemoryEconomyRepository;
  let economy: EconomyService;

  beforeEach(async () => {
    serverLifecycleRegistry.reset();
    serverResourceTracker.reset();
    serverEventStore.reset();
    metricsRegistry.reset();
    repo = new InMemoryEconomyRepository();
    economy = new EconomyService(repo);
  });

  describe("1. Engine Maximum-Capacity Match Launches (Host + Bots)", () => {
    it("successfully launches 8-player Ludo with 1 host and 7 bots", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "ludo");
      const room = peek(rooms, created.code);

      // Add 7 bots to reach Ludo's maximum of 8 players
      for (let i = 1; i <= 7; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(8);

      // Ready up host and launch game
      rooms.setReady("sock-host", true);
      await rooms.requestGameStart("sock-host");
      expect(room.phase).toBe("playing");
      expect(room.engine).toBeDefined();

      // Verify Ludo state
      const ludoState = room.engine!.getPublicState() as any;
      expect(ludoState.playerOrder.length).toBe(8);
      expect(ludoState.turnPlayerId).toBeDefined();
      expect(ludoState.playerOrder).toContain(ludoState.turnPlayerId);
    });

    it("successfully launches 10-player UNO with 1 host and 9 bots", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "uno");
      const room = peek(rooms, created.code);

      // Add 9 bots to reach UNO's maximum of 10 players
      for (let i = 1; i <= 9; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(10);

      rooms.setReady("sock-host", true);
      await rooms.requestGameStart("sock-host");
      expect(room.phase).toBe("playing");
      expect(room.engine).toBeDefined();

      // Verify UNO state: 10 players, each dealt 7 cards initially
      const unoState = room.engine!.getPublicState() as any;
      expect(unoState.playerOrder.length).toBe(10);
      expect(unoState.topCard).toBeDefined();
      expect(unoState.deckCount).toBeGreaterThan(0);
      for (const pid of unoState.playerOrder) {
        expect(unoState.handSizes[pid]).toBe(7);
      }
    });

    it("successfully launches 6-player Rummy with 1 host and 5 bots", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "rummy");
      const room = peek(rooms, created.code);

      // Add 5 bots to reach Rummy's maximum of 6 players
      for (let i = 1; i <= 5; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(6);

      rooms.setReady("sock-host", true);
      await rooms.requestGameStart("sock-host");
      expect(room.phase).toBe("playing");
      expect(room.engine).toBeDefined();

      // Verify Rummy state: 6 players, dealt 13 cards each
      const rummyState = room.engine!.getPublicState() as any;
      expect(rummyState.playerOrder.length).toBe(6);
      for (const pid of rummyState.playerOrder) {
        expect(rummyState.handSizes[pid]).toBe(13);
      }
    });

    it("successfully launches 12-player Tambola with 1 host and 11 bots", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "tambola");
      const room = peek(rooms, created.code);

      // Add 11 bots to reach Tambola's maximum of 12 players
      for (let i = 1; i <= 11; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(12);

      rooms.setReady("sock-host", true);
      await rooms.requestGameStart("sock-host");
      expect(room.phase).toBe("playing");
      expect(room.engine).toBeDefined();

      const tambolaState = room.engine!.getPublicState() as any;
      expect(tambolaState.players.length).toBe(12);
      expect(tambolaState.seatOrder.length).toBe(12);
    });
  });

  describe("2. Game-Specific Maximum Player Enforcement", () => {
    it("rejects adding an 9th player to an 8-player Ludo room", () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "ludo");
      const room = peek(rooms, created.code);

      for (let i = 1; i <= 7; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(8);

      // Attempt to add an 8th bot (which would be the 9th player)
      rooms.addBot("sock-host", "ExcessBot", "easy");
      expect(room.players.size).toBe(8); // Still capped at 8
    });

    it("rejects adding an 11th player to a 10-player UNO room", () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "uno");
      const room = peek(rooms, created.code);

      for (let i = 1; i <= 9; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(10);

      rooms.addBot("sock-host", "ExcessBot", "easy");
      expect(room.players.size).toBe(10);
    });

    it("rejects adding a 7th player to a 6-player Rummy room", () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io);
      registerSocket("sock-host");

      const created = rooms.createRoom("sock-host", "Host", "rummy");
      const room = peek(rooms, created.code);

      for (let i = 1; i <= 5; i++) {
        rooms.addBot("sock-host", `Bot-${i}`, "easy");
      }
      expect(room.players.size).toBe(6);

      rooms.addBot("sock-host", "ExcessBot", "easy");
      expect(room.players.size).toBe(6);
    });
  });

  describe("3. Economy Prize Pool Conservation across Full Seat Spectrum (6 to 12 seats)", () => {
    it("conserves exact coin balance and prize pool for 8-player human Ludo match", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io, economy);

      const hostId = "11111111-0000-0000-0000-000000000001";
      seedMember(repo, hostId, "5000");

      const otherHumanIds: string[] = [];
      for (let i = 2; i <= 8; i++) {
        const id = `11111111-0000-0000-0000-00000000000${i}`;
        otherHumanIds.push(id);
        seedMember(repo, id, "5000");
      }

      registerSocket("sock-1");
      const created = createRoomAs(rooms, "sock-1", "Player1", "ludo", "member", hostId);
      rooms.setReady("sock-1", true);

      // Join remaining 7 humans
      for (let i = 2; i <= 8; i++) {
        registerSocket(`sock-${i}`);
        joinRoomAs(rooms, `sock-${i}`, `Player${i}`, created.code, "member", otherHumanIds[i - 2]);
        rooms.setReady(`sock-${i}`, true);
      }

      const room = peek(rooms, created.code);
      expect(room.players.size).toBe(8);

      await rooms.requestGameStart("sock-1");
      expect(room.phase).toBe("playing");

      // Verify economy commitment:
      // 8 seats * 100 coins = 800 total collected (debited from host wallet in Economy V1)
      expect(room.currentMatchId).not.toBeNull();
      const settlement = await repo.getSettlement(room.currentMatchId!);
      expect(settlement).toBeDefined();
      expect(settlement!.status).toBe("COMMITTED");
      expect(settlement!.totalCollected).toBe("800");

      const schedule = (await repo.getPrizeSchedule(8))!;
      expect(schedule.collectedCoins).toBe("800");
      expect(schedule.worldBankCoins).toBe("160");
      expect(schedule.firstPlaceCoins).toBe("320");
      expect(schedule.secondPlaceCoins).toBe("192");
      expect(schedule.thirdPlaceCoins).toBe("128");

      // Host was debited 800 coins: 5000 - 800 = 4200
      const hostWallet = await economy.getWallet(hostId);
      expect(hostWallet.balance).toBe("4200");
    });

    it("conserves exact coin balance and prize pool for 10-player human UNO match", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io, economy);

      const hostId = "22222222-0000-0000-0000-000000000001";
      seedMember(repo, hostId, "5000");

      const otherHumanIds: string[] = [];
      for (let i = 2; i <= 10; i++) {
        const id = `22222222-0000-0000-0000-0000000000${i.toString().padStart(2, "0")}`;
        otherHumanIds.push(id);
        seedMember(repo, id, "5000");
      }

      registerSocket("sock-1");
      const created = createRoomAs(rooms, "sock-1", "Player1", "uno", "member", hostId);
      rooms.setReady("sock-1", true);

      for (let i = 2; i <= 10; i++) {
        registerSocket(`sock-${i}`);
        joinRoomAs(rooms, `sock-${i}`, `Player${i}`, created.code, "member", otherHumanIds[i - 2]);
        rooms.setReady(`sock-${i}`, true);
      }

      const room = peek(rooms, created.code);
      expect(room.players.size).toBe(10);

      await rooms.requestGameStart("sock-1");
      expect(room.phase).toBe("playing");

      // 10 seats * 100 = 1000 collected
      expect(room.currentMatchId).not.toBeNull();
      const settlement = await repo.getSettlement(room.currentMatchId!);
      expect(settlement).toBeDefined();
      expect(settlement!.status).toBe("COMMITTED");
      expect(settlement!.totalCollected).toBe("1000");

      const schedule = (await repo.getPrizeSchedule(10))!;
      expect(schedule.collectedCoins).toBe("1000");
      expect(schedule.worldBankCoins).toBe("200");
      expect(schedule.firstPlaceCoins).toBe("400");
      expect(schedule.secondPlaceCoins).toBe("240");
      expect(schedule.thirdPlaceCoins).toBe("160");

      const hostWallet = await economy.getWallet(hostId);
      expect(hostWallet.balance).toBe("4000");
    });

    it("conserves exact coin balance and prize pool for 12-player human Tambola match", async () => {
      const { io, registerSocket } = makeIo();
      const rooms = new RoomManager(io, economy);

      const hostId = "33333333-0000-0000-0000-000000000001";
      seedMember(repo, hostId, "5000");

      const otherHumanIds: string[] = [];
      for (let i = 2; i <= 12; i++) {
        const id = `33333333-0000-0000-0000-0000000000${i.toString().padStart(2, "0")}`;
        otherHumanIds.push(id);
        seedMember(repo, id, "5000");
      }

      registerSocket("sock-1");
      const created = createRoomAs(rooms, "sock-1", "Player1", "tambola", "member", hostId);
      rooms.setReady("sock-1", true);

      for (let i = 2; i <= 12; i++) {
        registerSocket(`sock-${i}`);
        joinRoomAs(rooms, `sock-${i}`, `Player${i}`, created.code, "member", otherHumanIds[i - 2]);
        rooms.setReady(`sock-${i}`, true);
      }

      const room = peek(rooms, created.code);
      expect(room.players.size).toBe(12);

      await rooms.requestGameStart("sock-1");
      expect(room.phase).toBe("playing");

      // 12 seats * 100 = 1200 collected
      expect(room.currentMatchId).not.toBeNull();
      const settlement = await repo.getSettlement(room.currentMatchId!);
      expect(settlement).toBeDefined();
      expect(settlement!.status).toBe("COMMITTED");
      expect(settlement!.totalCollected).toBe("1200");

      const schedule = (await repo.getPrizeSchedule(12))!;
      expect(schedule.collectedCoins).toBe("1200");
      expect(schedule.worldBankCoins).toBe("240");
      expect(schedule.firstPlaceCoins).toBe("480");
      expect(schedule.secondPlaceCoins).toBe("288");
      expect(schedule.thirdPlaceCoins).toBe("192");

      const hostWallet = await economy.getWallet(hostId);
      expect(hostWallet.balance).toBe("3800");
    });
  });
});
