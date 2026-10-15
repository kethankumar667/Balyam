import { beforeEach, describe, expect, it } from "vitest";
import type { GameKind } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";
import { InMemoryRoomSnapshotRepository } from "../durability/InMemoryRoomSnapshotRepository.js";
import type { RoomSnapshot } from "../durability/types.js";
import { createRoomAs, joinRoomAs, makeIo } from "./roomTestKit.js";

/**
 * A game can be removed while a table of it is still saved to disk. A deploy that removes it must not
 * resurrect that table: nobody can play it, and coins already put in must come back.
 *
 * The saved room is made with a real game and then relabelled, because the game's engine no longer
 * exists to make one honestly. That is also exactly what an old snapshot looks like to the new code.
 */

const RETIRED = "carrom" as unknown as GameKind;

async function savedRoom(repo: InMemoryRoomSnapshotRepository, phase: "lobby" | "playing"): Promise<RoomSnapshot> {
  const manager = new RoomManager(makeIo(), undefined, undefined, repo);
  const created = createRoomAs(manager, "sock-1", "Alice", "rps", "member", "id-alice");
  if (phase === "playing") {
    const joined = await joinRoomAs(manager, "sock-2", "Bob", created.code, "member", "id-bob");
    expect(joined.ok).toBe(true);
    manager.setReady("sock-1", true);
    manager.setReady("sock-2", true);
    manager.startGame("sock-1");
  }
  await manager.flushSnapshots();
  const snap = await repo.getSnapshot(created.code);
  expect(snap?.phase).toBe(phase);
  return snap!;
}

describe("restoring saved rooms after a game has been removed", () => {
  let repo: InMemoryRoomSnapshotRepository;

  beforeEach(() => {
    repo = new InMemoryRoomSnapshotRepository();
  });

  it("refunds and closes a match that was in progress, instead of restoring a table nobody can play", async () => {
    const snap = await savedRoom(repo, "playing");
    await repo.saveSnapshot({ ...snap, game: RETIRED });

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    const restored = await restarted.hydrateSnapshots();

    expect(restored).toBe(0);
    expect(restarted.getRoomStateByCode(snap.code)).toBeNull();
    expect(await repo.getSnapshot(snap.code)).toBeNull();
  });

  it("does not bring back a lobby of the removed game", async () => {
    const snap = await savedRoom(repo, "lobby");
    await repo.saveSnapshot({ ...snap, game: RETIRED });

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    const restored = await restarted.hydrateSnapshots();

    expect(restored).toBe(0);
    expect(restarted.getRoomStateByCode(snap.code)).toBeNull();
    expect(await repo.getSnapshot(snap.code)).toBeNull();
  });

  it("still restores a lobby of a game that exists", async () => {
    const snap = await savedRoom(repo, "lobby");

    const restarted = new RoomManager(makeIo(), undefined, undefined, repo);
    const restored = await restarted.hydrateSnapshots();

    expect(restored).toBe(1);
    expect(restarted.getRoomStateByCode(snap.code)?.game).toBe("rps");
  });
});
