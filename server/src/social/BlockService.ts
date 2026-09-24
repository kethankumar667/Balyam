import type { BlockedPlayer } from "@shared/social/Block.js";
import { partyService } from "../party/PartyService.js";
import { blockRegistry } from "./BlockRegistry.js";
import { friendRequestsService } from "./FriendRequestsService.js";
import { friendsService } from "./FriendsService.js";
import { MAX_BLOCKS_PER_PLAYER } from "./limits.js";
import { presentationFor } from "./callerPresentation.js";

export type BlockResult =
  | { ok: true; alreadyBlocked: boolean }
  | { ok: false; code: "INVALID_TARGET" | "LIMIT_REACHED" };

/**
 * Blocking, and what blocking ends.
 *
 * ── The order is the design ───────────────────────────────────────────
 * The block is written FIRST. Everything after it (unfriending, resolving
 * requests, declining invitations) is cleanup, and if the process dies part
 * way through, the pair is already refused everywhere — a half-finished block
 * is a block with some old rows still lying around, never a friendship that
 * survived its own block. Every cleanup step is idempotent, and `block` runs
 * them even when the block already existed, so simply blocking again finishes
 * whatever an earlier attempt did not.
 *
 * Nothing here tells the blocked player. The requests that disappear do so as
 * "cancelled" or "declined" — the two ordinary ways a request goes away.
 */
class BlockService {
  public block(blockerId: string, targetId: string): BlockResult {
    if (blockerId === targetId) return { ok: false, code: "INVALID_TARGET" };

    const alreadyBlocked = blockRegistry.hasBlocked(blockerId, targetId);
    if (!alreadyBlocked && blockRegistry.countFor(blockerId) >= MAX_BLOCKS_PER_PLAYER) {
      return { ok: false, code: "LIMIT_REACHED" };
    }

    blockRegistry.add(blockerId, targetId);

    // Both directions: the graph stores one edge per side, and either may be
    // the only one left after an earlier partial failure.
    friendsService.removeFriend(blockerId, targetId);
    friendsService.removeFriend(targetId, blockerId);
    friendRequestsService.resolvePendingBetween(blockerId, targetId);
    partyService.declinePendingInvitationsBetween(blockerId, targetId);

    return { ok: true, alreadyBlocked };
  }

  /** Lifts the caller's own block. It does not bring the friendship or any request back. */
  public unblock(blockerId: string, targetId: string): boolean {
    return blockRegistry.remove(blockerId, targetId);
  }

  /** The caller's own block list, with names taken from the server's profiles. */
  public listBlocked(blockerId: string): BlockedPlayer[] {
    return blockRegistry.listFor(blockerId).map((entry) => {
      const { displayName, avatar } = presentationFor(entry.blockedId);
      return { playerId: entry.blockedId, displayName, avatar, blockedAt: entry.createdAt };
    });
  }
}

export const blockService = new BlockService();
