import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { profileService } from "../../profile/ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { setProgressionRepository, progressionRepository } from "../../persistence/index.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { makeIo, createRoomAs, joinRoomAs, playRpsToCompletion } from "./roomTestKit.js";

/**
 * The seam between the room and the XP ledger: a real RPS match played through
 * `RoomManager` must reach the ledger as real-people XP only when both seats are
 * signed-in members. If `isMember` were dropped on the way, every real match would
 * silently become capped practice XP, so this is checked end to end.
 */
describe("which room matches earn real-people XP", () => {
  beforeEach(() => {
    setProgressionRepository(new InMemoryProgressionRepository());
    profileService.reset();
    // Only the clock is faked, so a match can be given a believable length.
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    setProgressionRepository(null);
  });

  async function playedKinds(joinerKind: "member" | "guest"): Promise<string[]> {
    const rooms = new RoomManager(makeIo());
    const host = createRoomAs(rooms, "sock-host", "Host", "rps", "member", "id-host");
    const joined = await joinRoomAs(
      rooms,
      "sock-join",
      "Joiner",
      host.code,
      joinerKind,
      joinerKind === "member" ? "id-joiner" : null,
    );
    expect(joined.ok).toBe(true);
    rooms.setReady("sock-host", true);
    rooms.setReady("sock-join", true);
    rooms.startGame("sock-host");
    // A real match takes longer than the instant one a test can play.
    vi.setSystemTime(Date.now() + 2 * 60_000);
    playRpsToCompletion(rooms, "sock-host", "sock-join");
    await progressionSync.drain();

    const ledger = await progressionRepository().listXp(host.playerId, 50);
    return ledger.map((entry) => entry.sourceKind);
  }

  it("credits two signed-in members as a real-people match", async () => {
    expect(await playedKinds("member")).toEqual(["match"]);
  });

  it("treats a member and a guest as practice, so a throwaway guest cannot farm full XP", async () => {
    expect(await playedKinds("guest")).toEqual(["practice_match"]);
  });
});
