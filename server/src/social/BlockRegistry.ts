import { progressionSync } from "../persistence/ProgressionSync.js";

export interface BlockEntry {
  blockerId: string;
  blockedId: string;
  createdAt: number;
}

/**
 * Who has blocked whom — the state, its persistence, and the one question the
 * rest of the server asks: "is this pair blocked?"
 *
 * ── Why this is separate from `BlockService` ──────────────────────────
 * Friend requests and party invitations must consult the block list, and the
 * block ACTION in turn ends friendships, requests and invitations. Had both
 * lived in one class, `BlockService` would import `FriendRequestsService` and
 * `FriendRequestsService` would import `BlockService`. This file imports
 * neither; the services below it import it, and only `BlockService` reaches
 * back down.
 *
 * ── Directional storage, symmetric enforcement ────────────────────────
 * A block is recorded one way (A blocked B), so only A can lift it and only A
 * ever sees it. Enforcement is symmetric: `isBlockedEitherWay` is true from
 * both sides, because a block that stopped only one of the two from reaching
 * the other would be a way to keep harassing across it.
 */
class BlockRegistry {
  /** blocker -> (blocked -> entry) */
  private byBlocker = new Map<string, Map<string, BlockEntry>>();

  public hasBlocked(blockerId: string, blockedId: string): boolean {
    return this.byBlocker.get(blockerId)?.has(blockedId) ?? false;
  }

  public isBlockedEitherWay(a: string, b: string): boolean {
    return this.hasBlocked(a, b) || this.hasBlocked(b, a);
  }

  /** Records a block. Returns false when it already existed or was a self-block. */
  public add(blockerId: string, blockedId: string, now = Date.now()): boolean {
    if (blockerId === blockedId || this.hasBlocked(blockerId, blockedId)) return false;

    const entry: BlockEntry = { blockerId, blockedId, createdAt: now };
    let mine = this.byBlocker.get(blockerId);
    if (!mine) {
      mine = new Map();
      this.byBlocker.set(blockerId, mine);
    }
    mine.set(blockedId, entry);
    progressionSync.blockAdded({ ...entry });
    return true;
  }

  /** Lifts the caller's own block. Returns false when there was none. */
  public remove(blockerId: string, blockedId: string): boolean {
    const mine = this.byBlocker.get(blockerId);
    if (!mine?.delete(blockedId)) return false;
    if (mine.size === 0) this.byBlocker.delete(blockerId);
    progressionSync.blockRemoved(blockerId, blockedId);
    return true;
  }

  /** One player's own blocks, newest first, as copies. */
  public listFor(blockerId: string): BlockEntry[] {
    return [...(this.byBlocker.get(blockerId)?.values() ?? [])]
      .sort((x, y) => y.createdAt - x.createdAt)
      .map((entry) => ({ ...entry }));
  }

  public countFor(blockerId: string): number {
    return this.byBlocker.get(blockerId)?.size ?? 0;
  }

  /** Refill from the durable store at boot. Writes nothing back. */
  public hydrate(entries: readonly BlockEntry[]): void {
    for (const entry of entries) {
      if (entry.blockerId === entry.blockedId) continue;
      let mine = this.byBlocker.get(entry.blockerId);
      if (!mine) {
        mine = new Map();
        this.byBlocker.set(entry.blockerId, mine);
      }
      mine.set(entry.blockedId, { ...entry });
    }
  }

  public clear(): void {
    this.byBlocker.clear();
  }
}

export const blockRegistry = new BlockRegistry();
