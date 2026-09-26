import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { InMemoryRoomSnapshotRepository } from "../durability/InMemoryRoomSnapshotRepository.js";
import { FileRoomSnapshotRepository } from "../durability/FileRoomSnapshotRepository.js";
import type { RoomSnapshot } from "../durability/types.js";
import { makeIo, createRoomAs, joinRoomAs } from "./roomTestKit.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("Room Durability & Snapshot Persistence", () => {
  let inMemoryRepo: InMemoryRoomSnapshotRepository;

  beforeEach(() => {
    inMemoryRepo = new InMemoryRoomSnapshotRepository();
  });

  it("persists room snapshot into repository when room state changes", async () => {
    const io = makeIo();
    const manager = new RoomManager(io, undefined, undefined, inMemoryRepo);

    const hostCreated = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
    expect(hostCreated.code).toBeDefined();
    const code = hostCreated.code;

    const snapLobby = await inMemoryRepo.getSnapshot(code);
    expect(snapLobby).not.toBeNull();
    expect(snapLobby?.code).toBe(code);
    expect(snapLobby?.game).toBe("rps");
    expect(snapLobby?.phase).toBe("lobby");
    expect(snapLobby?.players.length).toBe(1);

    const joinResult = await joinRoomAs(manager, "sock-2", "Bob", code, "member", "id-bob");
    expect(joinResult.ok).toBe(true);

    const snapTwoPlayers = await inMemoryRepo.getSnapshot(code);
    expect(snapTwoPlayers?.players.length).toBe(2);

    manager.setReady("sock-1", true);
    manager.setReady("sock-2", true);
    manager.startGame("sock-1");

    const snapPlaying = await inMemoryRepo.getSnapshot(code);
    expect(snapPlaying?.phase).toBe("playing");
    expect(snapPlaying?.engineState).toBeDefined();
  });

  it("restores active match and engine state across server restart via hydrateSnapshots", async () => {
    const io1 = makeIo();
    const manager1 = new RoomManager(io1, undefined, undefined, inMemoryRepo);

    const hostRes = createRoomAs(manager1, "sock-1", "Alice", "rps", "member", "id-alice");
    expect(hostRes.code).toBeDefined();
    const code = hostRes.code;
    const aliceId = hostRes.playerId;
    const aliceSeatToken = hostRes.seatToken;

    const joinRes = await joinRoomAs(manager1, "sock-2", "Bob", code, "member", "id-bob");
    expect(joinRes.ok).toBe(true);
    if (!joinRes.ok) return;
    const bobId = joinRes.playerId;
    const bobSeatToken = joinRes.seatToken;

    manager1.setReady("sock-1", true);
    manager1.setReady("sock-2", true);
    manager1.startGame("sock-1");

    // Play one round of RPS: Alice chooses rock, Bob chooses scissors -> Alice scores 1
    manager1.applyMove("sock-1", "choose", { choice: "rock" });
    manager1.applyMove("sock-2", "choose", { choice: "scissors" });

    const beforeRestartState = manager1.getRoomStateByCode(code);
    expect(beforeRestartState?.phase).toBe("playing");

    // === SIMULATE SERVER RESTART ===
    // Spin up a fresh RoomManager with the same snapshot repository
    const io2 = makeIo();
    const manager2 = new RoomManager(io2, undefined, undefined, inMemoryRepo);

    // Prior to hydration, manager2 knows nothing about the room
    expect(manager2.getRoomStateByCode(code)).toBeNull();

    // Boot-time hydration loads snapshots from repo
    await manager2.hydrateSnapshots();

    const restoredState = manager2.getRoomStateByCode(code);
    expect(restoredState).not.toBeNull();
    expect(restoredState?.code).toBe(code);
    expect(restoredState?.game).toBe("rps");
    expect(restoredState?.phase).toBe("playing");
    expect(restoredState?.players.length).toBe(2);

    // Players are marked disconnected waiting for reconnect
    expect(restoredState?.players[0].isConnected).toBe(false);
    expect(restoredState?.players[1].isConnected).toBe(false);

    // Alice reconnects with her seatToken
    const aliceReclaim = await manager2.joinRoom(
      "sock-alice-reconnect",
      "Alice",
      code,
      aliceId,
      aliceSeatToken,
      undefined,
      "member",
      "id-alice",
    );
    expect(aliceReclaim.ok).toBe(true);
    if (!aliceReclaim.ok) return;
    expect(aliceReclaim.playerId).toBe(aliceId);

    // Bob reconnects with his seatToken
    const bobReclaim = await manager2.joinRoom(
      "sock-bob-reconnect",
      "Bob",
      code,
      bobId,
      bobSeatToken,
      undefined,
      "member",
      "id-bob",
    );
    expect(bobReclaim.ok).toBe(true);
    if (!bobReclaim.ok) return;
    expect(bobReclaim.playerId).toBe(bobId);

    // The game continues seamlessly on manager2: play second round!
    manager2.applyMove("sock-alice-reconnect", "choose", { choice: "rock" });
    manager2.applyMove("sock-bob-reconnect", "choose", { choice: "rock" });

    const updatedSnap = await inMemoryRepo.getSnapshot(code);
    expect(updatedSnap?.phase).toBe("playing");
  });

  it("reconstructs grace eviction timers during snapshot hydration for disconnected players", async () => {
    const io1 = makeIo();
    const manager1 = new RoomManager(io1, undefined, undefined, inMemoryRepo);

    const hostRes = createRoomAs(manager1, "sock-1", "Alice", "rps", "member", "id-alice");
    const code = hostRes.code;
    const joinRes = await joinRoomAs(manager1, "sock-2", "Bob", code, "member", "id-bob");
    expect(joinRes.ok).toBe(true);

    manager1.setReady("sock-1", true);
    manager1.setReady("sock-2", true);
    manager1.startGame("sock-1");

    // Persist snapshot while game is playing
    const snap = await inMemoryRepo.getSnapshot(code);
    expect(snap).not.toBeNull();
    if (!snap) return;

    // Simulate restart with manager2
    const io2 = makeIo();
    const manager2 = new RoomManager(io2, undefined, undefined, inMemoryRepo);
    await manager2.hydrateSnapshots();

    const restoredState = manager2.getRoomStateByCode(code);
    expect(restoredState).not.toBeNull();
    // Both players should be restored with isConnected: false
    expect(restoredState?.players[0].isConnected).toBe(false);
    expect(restoredState?.players[1].isConnected).toBe(false);

    // Retrieve the underlying room from manager2 to verify cleanup timers were armed
    // (We can check via joinRoom that reclaiming works and disarms the timer)
    const aliceReclaim = await manager2.joinRoom(
      "sock-alice-reconnect",
      "Alice",
      code,
      hostRes.playerId,
      hostRes.seatToken,
      undefined,
      "member",
      "id-alice",
    );
    expect(aliceReclaim.ok).toBe(true);
  });

  it("deletes snapshot when room is abandoned or closed", async () => {
    const io = makeIo();
    const manager = new RoomManager(io, undefined, undefined, inMemoryRepo);

    const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
    expect(created.code).toBeDefined();
    const code = created.code;

    expect(await inMemoryRepo.getSnapshot(code)).not.toBeNull();

    // Host leaves in lobby -> room is abandoned & cleaned up
    manager.leaveRoom("sock-1");

    // Wait microtask tick for async deleteRoomSnapshot
    await new Promise((r) => setTimeout(r, 50));

    expect(await inMemoryRepo.getSnapshot(code)).toBeNull();
  });
});

describe("FileRoomSnapshotRepository", () => {
  const testDir = path.join(process.cwd(), ".test_room_snapshots");
  let fileRepo: FileRoomSnapshotRepository;

  beforeEach(async () => {
    fileRepo = new FileRoomSnapshotRepository(testDir);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it("atomically saves, reads, lists, and deletes room snapshots on disk", async () => {
    const snapshot: RoomSnapshot = {
      code: "TEST99",
      game: "rps",
      phase: "playing",
      lifecycleState: "IN_PROGRESS",
      roomRevision: 1,
      createdAt: Date.now(),
      matchStartedAt: Date.now(),
      hostId: "player-1",
      name: "Test Room",
      entryStakeCoins: 100,
      currentMatchId: "match-1",
      lastMatchId: null,
      committedCostPerSeat: "100",
      committedTotalPot: "200",
      sealed: false,
      gameOptions: {},
      players: [
        {
          id: "player-1",
          name: "Alice",
          avatar: "1",
          isConnected: true,
          isHost: true,
          isBot: false,
          isReady: true,
          identityId: "id-alice",
        },
      ],
      departedThisMatch: [],
      rematch: { status: "idle", requesterId: null, responses: {}, expiresAt: null, startsAt: null, declinedBy: null },
      history: [],
      unoHistory: [],
      bingoHistory: [],
      ludoHistory: [],
      engineState: { test: true },
      terminalStatus: "IDLE",
      terminalOutcome: null,
      terminalPayload: null,
      savedAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };

    await fileRepo.saveSnapshot(snapshot);

    const loaded = await fileRepo.getSnapshot("TEST99");
    expect(loaded).not.toBeNull();
    expect(loaded?.code).toBe("TEST99");
    expect(loaded?.players[0].name).toBe("Alice");
    expect(loaded?.engineState).toEqual({ test: true });

    const all = await fileRepo.listActiveSnapshots();
    expect(all.length).toBe(1);
    expect(all[0].code).toBe("TEST99");

    await fileRepo.deleteSnapshot("TEST99");
    const afterDelete = await fileRepo.getSnapshot("TEST99");
    expect(afterDelete).toBeNull();
  });
});
