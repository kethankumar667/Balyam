import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { matchHistoryService } from "../../profile/MatchHistoryService.js";
import { profileService } from "../../profile/ProfileService.js";
import { friendshipHistoryService } from "../../social/FriendshipHistoryService.js";
import { orderedPair } from "../../social/friendshipMath.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { freshSocialState } from "../../social/__tests__/socialTestKit.js";
import { createRoomAs, joinRoomAs, makeIo, peek, playRpsToCompletion } from "./roomTestKit.js";

/**
 * A rematch reuses the room, so it reuses the room's code and creation time.
 * Match recording once keyed a match on those two alone, which made the second
 * match in a room look like a replay of the first: it was dropped from the
 * players' history, and its XP with it. These tests play two real matches in one
 * room and check that both are recorded.
 */

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

describe("a rematch in the same room is its own match", () => {
  let repo: InMemoryProgressionRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    repo = freshSocialState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Two members play RPS to the end, accept a rematch, and play it to the end too. Alice wins both. */
  async function playTwoMatchesInOneRoom() {
    const rooms = new RoomManager(makeIo());
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    rooms.startGame("s_a");
    const room = peek(rooms, host.code);

    playRpsToCompletion(rooms, "s_a", "s_b");
    expect(room.phase).toBe("finished");

    // The rematch starts after a countdown, and a real rematch starts later than the room did.
    vi.advanceTimersByTime(60_000);
    rooms.requestRematch("s_a");
    rooms.respondRematch("s_b", "accept");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(room.phase).toBe("playing");

    playRpsToCompletion(rooms, "s_a", "s_b");
    expect(room.phase).toBe("finished");
    return { rooms, room, aliceSeat: host.playerId };
  }

  it("puts both matches in the winner's history", async () => {
    const { aliceSeat } = await playTwoMatchesInOneRoom();

    const history = matchHistoryService.getMatches(aliceSeat);

    expect(history.total).toBe(2);
    expect(new Set(history.matches.map((m) => m.matchId)).size).toBe(2);
  });

  it("pays XP for both wins, not just the first", async () => {
    const { aliceSeat } = await playTwoMatchesInOneRoom();

    const oneWin = 50;
    expect(profileService.getProfile(aliceSeat)?.experiencePoints).toBeGreaterThanOrEqual(2 * oneWin);
  });

  it("counts both matches toward the players' friendship", async () => {
    await playTwoMatchesInOneRoom();
    await friendshipHistoryService.drain();

    const { low, high } = orderedPair(MEMBER_A, MEMBER_B);
    expect((await repo.getFriendshipPair(low, high))?.matchesTogether).toBe(2);
  });

  it("still records a repeated finish of the SAME match only once", async () => {
    const { rooms, room, aliceSeat } = await playTwoMatchesInOneRoom();
    const before = matchHistoryService.getMatches(aliceSeat).total;

    (rooms as unknown as { recordPostMatchStats(r: typeof room): void }).recordPostMatchStats(room);

    expect(matchHistoryService.getMatches(aliceSeat).total).toBe(before);
  });
});
