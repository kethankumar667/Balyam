import { describe, it, expect, beforeEach } from "vitest";
import { blockRegistry } from "../BlockRegistry.js";
import { blockService } from "../BlockService.js";
import { friendsService } from "../FriendsService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { partyService } from "../../party/PartyService.js";
import { profileService } from "../../profile/ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { MAX_BLOCKS_PER_PLAYER } from "../limits.js";
import { UNABLE_TO_INVITE, UNABLE_TO_SEND_REQUEST } from "../refusals.js";
import { freshSocialState } from "./socialTestKit.js";

const A = "player_block_a";
const B = "player_block_b";

function befriend(x: string, y: string): void {
  friendsService.addFriend(x, y, y);
  friendsService.addFriend(y, x, x);
}

describe("WP1 — BlockService", () => {
  let repo: InMemoryProgressionRepository;

  beforeEach(() => {
    repo = freshSocialState();
  });

  describe("blocking", () => {
    it("records the block and enforces it in BOTH directions", () => {
      const result = blockService.block(A, B);

      expect(result).toEqual({ ok: true, alreadyBlocked: false });
      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(true);
      expect(blockRegistry.isBlockedEitherWay(B, A)).toBe(true);
      expect(blockRegistry.hasBlocked(A, B)).toBe(true);
      expect(blockRegistry.hasBlocked(B, A)).toBe(false);
    });

    it("is idempotent and writes one row", async () => {
      blockService.block(A, B);
      const again = blockService.block(A, B);
      await progressionSync.drain();

      expect(again).toEqual({ ok: true, alreadyBlocked: true });
      expect((await repo.listAllBlocks()).length).toBe(1);
    });

    it("refuses to block yourself and records nothing", async () => {
      expect(blockService.block(A, A)).toEqual({ ok: false, code: "INVALID_TARGET" });
      await progressionSync.drain();

      expect(blockRegistry.countFor(A)).toBe(0);
      expect((await repo.listAllBlocks()).length).toBe(0);
    });

    it("stops at the per-player limit, but an existing block stays idempotent", () => {
      const now = Date.now();
      blockRegistry.hydrate(
        Array.from({ length: MAX_BLOCKS_PER_PLAYER }, (_, i) => ({
          blockerId: A,
          blockedId: `existing_${i}`,
          createdAt: now,
        })),
      );

      expect(blockService.block(A, "one_too_many")).toEqual({ ok: false, code: "LIMIT_REACHED" });
      expect(blockService.block(A, "existing_0")).toEqual({ ok: true, alreadyBlocked: true });
    });
  });

  describe("what a block undoes", () => {
    it("removes the friendship in both directions, durably", async () => {
      befriend(A, B);
      await progressionSync.drain();

      blockService.block(A, B);
      await progressionSync.drain();

      expect(friendsService.isFriend(A, B)).toBe(false);
      expect((await repo.listFriends(A)).length).toBe(0);
      expect((await repo.listFriends(B)).length).toBe(0);
    });

    it("also removes a friendship when the OTHER side is the one who blocks", () => {
      befriend(A, B);
      blockService.block(B, A);

      expect(friendsService.isFriend(A, B)).toBe(false);
    });

    it("resolves pending requests in both directions without saying why", async () => {
      const sentByBlocker = friendRequestsService.sendRequest(A, "A", "player_block_c");
      const receivedByBlocker = friendRequestsService.sendRequest("player_block_d", "D", A);
      const fromTheBlocked = friendRequestsService.sendRequest(B, "B", A);
      await progressionSync.drain();

      blockService.block(A, "player_block_c");
      blockService.block(A, "player_block_d");
      blockService.block(A, B);
      await progressionSync.drain();

      // A request the blocker SENT looks cancelled; one they RECEIVED looks declined —
      // both are ordinary ways a request disappears, so neither reveals a block.
      expect((await repo.getFriendRequest(sentByBlocker.id))?.status).toBe("CANCELLED");
      expect((await repo.getFriendRequest(receivedByBlocker.id))?.status).toBe("DECLINED");
      expect((await repo.getFriendRequest(fromTheBlocked.id))?.status).toBe("DECLINED");
      expect(friendRequestsService.getIncomingRequests(A).length).toBe(0);
      expect(friendRequestsService.getOutgoingRequests(B).length).toBe(0);
    });

    it("declines pending party invitations between the pair, durably", async () => {
      const party = partyService.createParty(B, "B");
      const invite = partyService.invitePlayer(party.id, B, "B", A);
      await progressionSync.drain();

      blockService.block(A, B);
      await progressionSync.drain();

      expect(partyService.getPendingInvitations(A).length).toBe(0);
      expect((await repo.getInvitation(invite.id))?.status).toBe("DECLINED");
    });

    it("finishes the job when repeated after a partial failure", () => {
      befriend(A, B);
      // Simulate a first attempt that recorded the block and died before unfriending.
      blockRegistry.add(A, B);

      blockService.block(A, B);

      expect(friendsService.isFriend(A, B)).toBe(false);
    });
  });

  describe("enforcement", () => {
    it("refuses a friend request in either direction with the generic message", () => {
      blockService.block(A, B);

      expect(() => friendRequestsService.sendRequest(B, "B", A)).toThrow(UNABLE_TO_SEND_REQUEST);
      expect(() => friendRequestsService.sendRequest(A, "A", B)).toThrow(UNABLE_TO_SEND_REQUEST);
      expect(UNABLE_TO_SEND_REQUEST).toBe("Unable to send friend request to this player");
    });

    it("uses the SAME message as the decline cooldown, so the two cannot be told apart", () => {
      const declined = friendRequestsService.sendRequest("player_block_e", "E", "player_block_f");
      friendRequestsService.declineRequest(declined.id);
      blockService.block(A, B);

      const messageFor = (fn: () => unknown): string => {
        try {
          fn();
          return "no error";
        } catch (err) {
          return err instanceof Error ? err.message : String(err);
        }
      };

      expect(messageFor(() => friendRequestsService.sendRequest("player_block_e", "E", "player_block_f"))).toBe(
        messageFor(() => friendRequestsService.sendRequest(B, "B", A)),
      );
    });

    it("will not create a friendship for a blocked pair even if a request slipped through", () => {
      const request = friendRequestsService.sendRequest(B, "B", A);
      // The block arrives without the cascade (e.g. a hydrate ordering quirk).
      blockRegistry.add(A, B);

      expect(() => friendRequestsService.acceptRequest(request.id, "A")).toThrow("Friend request is not pending");
      expect(friendsService.isFriend(A, B)).toBe(false);
    });

    it("refuses a party invitation in either direction", () => {
      const partyOfA = partyService.createParty(A, "A");
      blockService.block(A, B);

      expect(() => partyService.invitePlayer(partyOfA.id, A, "A", B)).toThrow(UNABLE_TO_INVITE);

      const partyOfB = partyService.createParty(B, "B");
      expect(() => partyService.invitePlayer(partyOfB.id, B, "B", A)).toThrow(UNABLE_TO_INVITE);
    });

    it("will not let a blocked player accept an invitation that was already pending", () => {
      const party = partyService.createParty(B, "B");
      const invite = partyService.invitePlayer(party.id, B, "B", A);
      blockRegistry.add(A, B); // block without the cascade

      expect(() => partyService.acceptInvitation(invite.id, "A")).toThrow("Invitation is not pending");
    });
  });

  describe("unblocking", () => {
    it("lifts the block but does not bring the friendship back", async () => {
      befriend(A, B);
      blockService.block(A, B);
      await progressionSync.drain();

      expect(blockService.unblock(A, B)).toBe(true);
      await progressionSync.drain();

      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(false);
      expect(friendsService.isFriend(A, B)).toBe(false);
      expect((await repo.listAllBlocks()).length).toBe(0);
      expect(friendRequestsService.sendRequest(B, "B", A).status).toBe("PENDING");
    });

    it("returns false when there was nothing to lift", () => {
      expect(blockService.unblock(A, B)).toBe(false);
    });

    it("only lifts the caller's own block, never the other direction", () => {
      blockService.block(B, A);

      expect(blockService.unblock(A, B)).toBe(false);
      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(true);
    });
  });

  describe("surviving a restart", () => {
    it("still enforces a block rebuilt from the repository", async () => {
      blockService.block(A, B);
      await progressionSync.drain();

      blockRegistry.clear();
      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(false);
      blockRegistry.hydrate(await repo.listAllBlocks());

      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(true);
      expect(() => friendRequestsService.sendRequest(B, "B", A)).toThrow(UNABLE_TO_SEND_REQUEST);
    });

    it("does not resurrect a block that was lifted", async () => {
      blockService.block(A, B);
      blockService.unblock(A, B);
      await progressionSync.drain();

      blockRegistry.clear();
      blockRegistry.hydrate(await repo.listAllBlocks());

      expect(blockRegistry.isBlockedEitherWay(A, B)).toBe(false);
    });
  });

  describe("the block list", () => {
    it("shows the server's copy of each player's name, newest block first", () => {
      profileService.getOrCreateProfile(B, "Real B");
      const first = Date.now();
      blockRegistry.add(A, B, first);
      blockRegistry.add(A, "player_block_unnamed", first + 1000);

      const list = blockService.listBlocked(A);

      expect(list.map((p) => p.playerId)).toEqual(["player_block_unnamed", B]);
      expect(list[0].displayName).toBe("Player");
      expect(list[1].displayName).toBe("Real B");
      expect(list[1].blockedAt).toBe(first);
    });

    it("hands out copies", () => {
      blockService.block(A, B);
      const list = blockService.listBlocked(A);
      list[0].displayName = "tampered";
      list.pop();

      expect(blockService.listBlocked(A)[0].displayName).not.toBe("tampered");
      expect(blockService.listBlocked(A).length).toBe(1);
    });

    it("is never visible to the player who was blocked", () => {
      blockService.block(A, B);

      expect(blockService.listBlocked(B)).toEqual([]);
    });
  });
});
