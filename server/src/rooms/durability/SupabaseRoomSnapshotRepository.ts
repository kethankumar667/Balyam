import { PostgrestClient, type PostgrestConfig } from "../../persistence/postgrest.js";
import type { RoomSnapshot, RoomSnapshotRepository } from "./types.js";

interface SnapshotRow {
  code: string;
  snapshot: RoomSnapshot;
}

/**
 * Private recovery data, never a client-readable table. RoomManager supplies
 * ordered/coalesced writes; this store does not enable multi-instance gameplay.
 */
export class SupabaseRoomSnapshotRepository implements RoomSnapshotRepository {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  async ping(): Promise<void> {
    if (await this.db.rpc<boolean>("probe_room_snapshot_store") !== true) {
      throw new Error("Supabase room snapshot probe failed");
    }
  }

  async saveSnapshot(snapshot: RoomSnapshot): Promise<void> {
    await this.db.upsert("room_snapshots", [{
      code: snapshot.code.toUpperCase(),
      snapshot,
      saved_at: snapshot.savedAt,
      expires_at: snapshot.expiresAt,
    }], "code");
  }

  async getSnapshot(code: string): Promise<RoomSnapshot | null> {
    const rows = await this.db.select<SnapshotRow>("room_snapshots",
      `select=code,snapshot&code=eq.${encodeURIComponent(code.toUpperCase())}&expires_at=gte.${Date.now()}&limit=1`);
    return rows[0]?.snapshot ?? null;
  }

  async deleteSnapshot(code: string): Promise<void> {
    await this.db.delete("room_snapshots", `code=eq.${encodeURIComponent(code.toUpperCase())}`);
  }

  async listActiveSnapshots(): Promise<RoomSnapshot[]> {
    const snapshots: RoomSnapshot[] = [];
    const now = Date.now();
    let cursor = "";
    for (;;) {
      const rows = await this.db.select<SnapshotRow>("room_snapshots",
        `select=code,snapshot&expires_at=gte.${now}&order=code.asc&limit=100${cursor ? `&code=gt.${encodeURIComponent(cursor)}` : ""}`);
      if (rows.length === 0) return snapshots;
      const next = rows[rows.length - 1]!.code;
      if (!next || next <= cursor) throw new Error("Invalid room snapshot pagination");
      snapshots.push(...rows.map((row) => row.snapshot));
      cursor = next;
      // Continue until empty: a project's PostgREST row cap may be below 100.
    }
  }

  async purgeExpiredSnapshots(maxAgeMs?: number): Promise<number> {
    return this.db.rpc<number>("purge_room_snapshots", {
      p_now_ms: Date.now(),
      p_max_age_ms: maxAgeMs ?? null,
    });
  }
}
