import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RoomManager, type Room } from "../RoomManager.js";
import { friendshipHistoryService } from "../../social/FriendshipHistoryService.js";
import { orderedPair } from "../../social/friendshipMath.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { freshSocialState } from "../../social/__tests__/socialTestKit.js";
import { createRoomAs, joinRoomAs, makeIo, peek, playRpsToCompletion } from "./roomTestKit.js";

/**
 * WP5 — a match that finishes through the real RoomManager is counted toward
 * the friendship of the verified people who played it. Real rooms, real RPS,
 * real verified `identityId`s — no mocks of RoomManager.
 */

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

interface PrivateSurface {
  recordPostMatchStats(room: Room): void;
}

describe("WP5 — friendship history from a finished match", () => {
  let repo: InMemoryProgressionRepository;

  const pairOfMembers = async () => {
    const { low, high } = orderedPair(MEMBER_A, MEMBER_B);
    return repo.getFriendshipPair(low, high);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    repo = freshSocialState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Two verified members, one match of RPS played to its end. */
  function playAMatch(rooms: RoomManager) {
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    rooms.startGame("s_a");
    playRpsToCompletion(rooms, "s_a", "s_b");
    return peek(rooms, host.code);
  }

  it("counts the match toward the two verified players, under their ACCOUNTS not their seats", async () => {
    const rooms = new RoomManager(makeIo());

    const room = playAMatch(rooms);
    await friendshipHistoryService.drain();

    expect(room.phase).toBe("finished");
    const pair = await pairOfMembers();
    expect(pair?.matchesTogether).toBe(1);
    const { low, high } = orderedPair(MEMBER_A, MEMBER_B);
    expect((await repo.listFriendshipMilestones(low, high)).map((m) => m.kind)).toContain("FIRST_MATCH");
  });

  it("does not count a win together, because a room reports only one winner", async () => {
    const rooms = new RoomManager(makeIo());

    playAMatch(rooms);
    await friendshipHistoryService.drain();

    expect((await pairOfMembers())?.winsTogether).toBe(0);
  });

  it("counts the match once even if the room reports its finish again", async () => {
    const rooms = new RoomManager(makeIo());
    const room = playAMatch(rooms);
    await friendshipHistoryService.drain();

    (rooms as unknown as PrivateSurface).recordPostMatchStats(room);
    (rooms as unknown as PrivateSurface).recordPostMatchStats(room);
    await friendshipHistoryService.drain();

    expect((await pairOfMembers())?.matchesTogether).toBe(1);
  });

  it("counts nothing for a table of one human and a bot", async () => {
    const claim = vi.spyOn(repo, "claimFriendshipMatch");
    const rooms = new RoomManager(makeIo());
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.startGame("s_a");

    (rooms as unknown as PrivateSurface).recordPostMatchStats(peek(rooms, host.code));
    await friendshipHistoryService.drain();

    expect(claim).not.toHaveBeenCalled();
  });

  it("counts nothing when one of the two players is not verified", async () => {
    const claim = vi.spyOn(repo, "claimFriendshipMatch");
    const rooms = new RoomManager(makeIo());
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "guest", null);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    rooms.startGame("s_a");

    (rooms as unknown as PrivateSurface).recordPostMatchStats(peek(rooms, host.code));
    await friendshipHistoryService.drain();

    expect(claim).not.toHaveBeenCalled();
  });
});
