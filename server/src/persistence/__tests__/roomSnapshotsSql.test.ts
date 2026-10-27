import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let db: PGlite;
let directory: string;
const migration = new URL("../../../../supabase/migrations/20261109000000_room_snapshots.sql", import.meta.url);
const rollback = new URL("../../../../supabase/rollbacks/20261109000000_room_snapshots_rollback.sql", import.meta.url);

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "bhalyam-room-sql-"));
  db = new PGlite(join(directory, "postgres"));
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
  await db.exec(await readFile(migration, "utf8"));
}, 30_000);

afterAll(async () => {
  await db?.close();
  if (directory) await rm(directory, { recursive: true });
});

describe("private room snapshot migration on embedded PostgreSQL", () => {
  it("permits service-only CRUD and transactionally probes without leaving a row", async () => {
    await db.exec("SET ROLE service_role");
    try {
      await db.exec(`INSERT INTO public.room_snapshots VALUES ('ABC123', '{"code":"ABC123","engineState":{"privateHand":["secret"]}}', 100, 1000);
        UPDATE public.room_snapshots SET saved_at=200 WHERE code='ABC123';`);
      expect((await db.query("SELECT * FROM public.room_snapshots")).rows).toHaveLength(1);
      expect((await db.query<{ ready: boolean }>("SELECT public.probe_room_snapshot_store() AS ready")).rows[0]!.ready).toBe(true);
      expect((await db.query("SELECT * FROM public.room_snapshots")).rows).toHaveLength(1);
    } finally { await db.exec("RESET ROLE"); }
  });

  it("retains complete snapshots after closing and reopening PostgreSQL", async () => {
    await db.close();
    db = new PGlite(join(directory, "postgres"));
    expect((await db.query<{ snapshot: unknown }>("SELECT snapshot FROM public.room_snapshots WHERE code='ABC123'")).rows[0]!.snapshot)
      .toEqual({ code: "ABC123", engineState: { privateHand: ["secret"] } });
  }, 30_000);

  it("denies anonymous and member reads, writes, deletes and both RPCs", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      try {
        for (const query of [
          "SELECT * FROM public.room_snapshots",
          "INSERT INTO public.room_snapshots VALUES ('BAD123', '{}', 0, 100)",
          "UPDATE public.room_snapshots SET snapshot='{}'",
          "DELETE FROM public.room_snapshots",
          "SELECT public.probe_room_snapshot_store()",
          "SELECT public.purge_room_snapshots(1000, NULL)",
        ]) await expect(db.query(query)).rejects.toThrow("permission denied");
      } finally { await db.exec("RESET ROLE"); }
    }
    const { rows } = await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid='public.room_snapshots'::regclass",
    );
    expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });

  it("purges by expiry or maximum age and returns the actual number removed", async () => {
    await db.exec(`INSERT INTO public.room_snapshots VALUES ('OLD123','{}',0,2000), ('NEW123','{}',950,2000); SET ROLE service_role`);
    try {
      expect((await db.query<{ count: number }>("SELECT public.purge_room_snapshots(1000,NULL) AS count")).rows[0]!.count).toBe(0);
      expect((await db.query<{ count: number }>("SELECT public.purge_room_snapshots(1001,500) AS count")).rows[0]!.count).toBe(2);
      expect((await db.query("SELECT code FROM public.room_snapshots")).rows).toEqual([{ code: "NEW123" }]);
      expect((await db.query<{ count: number }>("SELECT public.purge_room_snapshots(1001,NULL) AS count")).rows[0]!.count).toBe(0);
      await expect(db.query("SELECT public.purge_room_snapshots(1001,-1)")).rejects.toThrow();
    } finally { await db.exec("RESET ROLE"); }
  });

  it("rejects malformed JSON snapshots and invalid expiry bounds", async () => {
    await expect(db.query("INSERT INTO public.room_snapshots VALUES ('BAD123','[]',0,100)")).rejects.toThrow("check constraint");
    await expect(db.query("INSERT INTO public.room_snapshots VALUES ('BAD123','{}',100,100)")).rejects.toThrow("check constraint");
    await expect(db.query("SELECT public.purge_room_snapshots(NULL,NULL)")).rejects.toThrow("Invalid room snapshot retention bounds");
  });

  it("rolls back only the new objects and can reapply cleanly", async () => {
    await db.exec(await readFile(rollback, "utf8"));
    expect((await db.query("SELECT to_regclass('public.room_snapshots') AS name")).rows).toEqual([{ name: null }]);
    await db.exec(await readFile(migration, "utf8"));
    expect((await db.query<{ ready: boolean }>("SELECT public.probe_room_snapshot_store() AS ready")).rows[0]!.ready).toBe(true);
  });
});
