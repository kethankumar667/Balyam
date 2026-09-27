import type { RoomSnapshot, RoomSnapshotRepository } from "./types.js";

/**
 * In-memory room snapshot repository.
 * Useful for deterministic testing, unit test suites, and ephemeral environments.
 * Strictly isolates state via deep cloning to prevent reference leakage.
 */
export class InMemoryRoomSnapshotRepository implements RoomSnapshotRepository {
  readonly kind = "memory" as const;
  private readonly snapshots = new Map<string, RoomSnapshot>();

  async saveSnapshot(snapshot: RoomSnapshot): Promise<void> {
    // Deep clone to prevent accidental outside mutation
    const copy = JSON.parse(JSON.stringify(snapshot)) as RoomSnapshot;
    this.snapshots.set(snapshot.code.toUpperCase(), copy);
  }

  async getSnapshot(code: string): Promise<RoomSnapshot | null> {
    const raw = this.snapshots.get(code.toUpperCase());
    if (!raw) return null;
    if (Date.now() > raw.expiresAt) {
      this.snapshots.delete(code.toUpperCase());
      return null;
    }
    return JSON.parse(JSON.stringify(raw)) as RoomSnapshot;
  }

  async deleteSnapshot(code: string): Promise<void> {
    this.snapshots.delete(code.toUpperCase());
  }

  async listActiveSnapshots(): Promise<RoomSnapshot[]> {
    const now = Date.now();
    const active: RoomSnapshot[] = [];
    for (const [code, snap] of this.snapshots.entries()) {
      if (now > snap.expiresAt) {
        this.snapshots.delete(code);
      } else {
        active.push(JSON.parse(JSON.stringify(snap)) as RoomSnapshot);
      }
    }
    return active;
  }

  async purgeExpiredSnapshots(maxAgeMs?: number): Promise<number> {
    const now = Date.now();
    let purged = 0;
    for (const [code, snap] of this.snapshots.entries()) {
      const isPastTtl = now > snap.expiresAt;
      const isTooOld = maxAgeMs !== undefined && now - snap.savedAt > maxAgeMs;
      if (isPastTtl || isTooOld) {
        this.snapshots.delete(code);
        purged++;
      }
    }
    return purged;
  }

  async clear(): Promise<void> {
    this.snapshots.clear();
  }

  get size(): number {
    return this.snapshots.size;
  }
}
