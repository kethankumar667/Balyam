import { describe, it, expect, beforeEach } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { InMemoryRoomSnapshotRepository } from "../durability/InMemoryRoomSnapshotRepository.js";
import type { RoomSnapshot } from "../durability/types.js";
import { makeIo, createRoomAs, joinRoomAs, peek } from "./roomTestKit.js";

const FIVE_MINUTES_MS = 5 * 60_000;

/** A room mid-RPS-match, snapshotted by one manager for a second to hydrate. */
async function playingRpsSnapshot(repo: InMemoryRoomSnapshotRepository): Promise<RoomSnapshot> {
  const manager = new RoomManager(makeIo(), undefined, undefined, repo);
  const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
  const joined = await joinRoomAs(manager, "sock-2", "Bob", created.code, "member", "id-bob");
  expect(joined.ok).toBe(true);
  manager.setReady("sock-1", true);
  manager.setReady("sock-2", true);
  manager.startGame("sock-1");
  // Saves are write-behind (one in flight + one trailing); wait for the latest.
  await manager.flushSnapshots();
  const snap = await repo.getSnapshot(created.code);
  expect(snap?.phase).toBe("playing");
  return snap!;
}

/** Rewrites a stored snapshot the way an older or damaged save would look. */
async function rewrite(
  repo: InMemoryRoomSnapshotRepository,
  snap: RoomSnapshot,
  changes: Partial<RoomSnapshot>,
): Promise<void> {
  await repo.saveSnapshot({ ...snap, ...changes });
}

describe("Room durability hardening", () => {
  let repo: InMemoryRoomSnapshotRepository;

  beforeEach(() => {
    repo = new InMemoryRoomSnapshotRepository();
  });

  it("measures a hydrated seat's grace from restart, not from the last save", async () => {
    const snap = await playingRpsSnapshot(repo);
    // The save is five minutes old: a deploy took that long to come back.
    await rewrite(repo, snap, { savedAt: Date.now() - FIVE_MINUTES_MS });

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    await restarted.hydrateSnapshots();

    const room = peek(restarted, snap.code);
    expect(room.players.size).toBe(2);
    for (const player of room.players.values()) {
      // Counting from savedAt would already be in the past and drop the seat at once.
      expect(player.awayUntil!).toBeGreaterThan(Date.now() + 60_000);
    }
  });

  it("refunds and closes a match whose game state was not saved instead of restarting it", async () => {
    const snap = await playingRpsSnapshot(repo);
    await rewrite(repo, snap, { engineState: null });

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    const restored = await restarted.hydrateSnapshots();

    expect(restored).toBe(0);
    expect(restarted.getRoomStateByCode(snap.code)).toBeNull();
    expect(await repo.getSnapshot(snap.code)).toBeNull();
  });

  it("lets a terminal write that died mid-flight replay through the FAILED retry path", async () => {
    const snap = await playingRpsSnapshot(repo);
    await rewrite(repo, snap, {
      phase: "finished",
      terminalStatus: "PERSISTING",
      terminalOutcome: "REFUND",
      terminalPayload: { kind: "REFUND", matchId: "m_test", reason: "test" },
    });

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    await restarted.hydrateSnapshots();

    expect(restarted.getRoomTerminalStatus(snap.code)?.status).toBe("FAILED");
  });

  it("does not recreate a snapshot for a room that closed while its save was in flight", async () => {
    const slowRepo = new InMemoryRoomSnapshotRepository();
    const realSave = slowRepo.saveSnapshot.bind(slowRepo);
    slowRepo.saveSnapshot = async (snapshot) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      await realSave(snapshot);
    };
    const manager = new RoomManager(makeIo(), undefined, undefined, slowRepo);

    const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
    manager.leaveRoom("sock-1");
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(manager.getRoomStateByCode(created.code)).toBeNull();
    expect(await slowRepo.getSnapshot(created.code)).toBeNull();
  });

  it("coalesces a burst of broadcasts into one in-flight write plus one trailing write", async () => {
    const countingRepo = new InMemoryRoomSnapshotRepository();
    const realSave = countingRepo.saveSnapshot.bind(countingRepo);
    let saves = 0;
    countingRepo.saveSnapshot = async (snapshot) => {
      saves += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await realSave(snapshot);
    };
    const manager = new RoomManager(makeIo(), undefined, undefined, countingRepo);
    const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
    const room = peek(manager, created.code);

    const burst = Array.from({ length: 25 }, () => manager.persistRoomSnapshot(room));
    await Promise.all(burst);

    expect(saves).toBeLessThanOrEqual(3);
    expect((await countingRepo.getSnapshot(created.code))?.code).toBe(created.code);
  });

  it("flushSnapshots writes every live room's latest state", async () => {
    const manager = new RoomManager(makeIo(), undefined, undefined, repo);
    const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
    await repo.deleteSnapshot(created.code);

    await manager.flushSnapshots();

    expect((await repo.getSnapshot(created.code))?.code).toBe(created.code);
  });
});
