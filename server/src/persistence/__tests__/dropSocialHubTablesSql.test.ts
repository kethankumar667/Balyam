import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

/**
 * The Social Hub's tables are dropped by 20261114000000. The part that can hurt is not the
 * drops but `prune_expired_records()`, the daily retention job, which used to delete from
 * three of those tables: a plpgsql body is not checked until it runs, so dropping the tables
 * alone would leave a function that fails and rolls back every other retention delete.
 *
 * This runs the real migrations on real PostgreSQL (embedded), never against production.
 */

const sql = (path: string) => readFile(new URL(`../../../../supabase/${path}`, import.meta.url), "utf8");

let db: PGlite;

const exists = async (table: string): Promise<boolean> =>
  (await db.query<{ r: string | null }>(`select to_regclass('public.${table}')::text as r`)).rows[0]!.r !== null;

const pruneReport = async (): Promise<string[]> =>
  (await db.query<{ table_name: string }>("select table_name from public.prune_expired_records()")).rows.map((r) => r.table_name);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  await db.exec(await sql("migrations/20260818000000_progression_persistence.sql"));

  // One of every row the removed feature wrote, plus rows the retention job must still clear.
  await db.exec(`
    insert into public.player_identities (player_id, kind) values ('guest_a', 'guest'), ('guest_b', 'guest');
    insert into public.friends (player_id, friend_player_id) values ('guest_a', 'guest_b'), ('guest_b', 'guest_a');
    insert into public.friend_requests (id, sender_id, recipient_id, created_at)
      values ('req_old', 'guest_a', 'guest_b', now() - interval '40 days');
    insert into public.parties (id, leader_id) values ('party_1', 'guest_a');
    insert into public.party_members (party_id, player_id, is_leader) values ('party_1', 'guest_a', true);
    insert into public.party_invitations (id, party_id, inviter_id, invitee_id)
      values ('inv_1', 'party_1', 'guest_a', 'guest_b');
    insert into public.room_timelines (room_code, started_at, game, expires_at)
      values ('OLD111', now() - interval '60 days', 'ludo', now() - interval '1 day');
    insert into public.operational_telemetry (kind, payload, expires_at)
      values ('probe', '{}', now() - interval '1 day');
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("20261114000000 drop the Social Hub tables, on embedded PostgreSQL", () => {
  it("starts from the old shape: the retention job reports all five tables", async () => {
    expect(await pruneReport()).toEqual([
      "room_timelines", "operational_telemetry", "friend_requests", "party_invitations", "parties",
    ]);
  });

  it("drops the four tables and keeps `friends`, which the leaderboard still uses", async () => {
    await db.exec(await sql("migrations/20261114000000_drop_social_hub_tables.sql"));

    for (const table of ["friend_requests", "parties", "party_members", "party_invitations"]) {
      expect(await exists(table), table).toBe(false);
    }
    expect(await exists("friends")).toBe(true);
    expect((await db.query("select * from public.friends")).rows).toHaveLength(2);
  });

  it("leaves the retention job working: it reports only the tables that still exist and deletes their expired rows", async () => {
    // Seed again: the earlier call already pruned the first pair of expired rows.
    await db.exec(`
      insert into public.room_timelines (room_code, started_at, game, expires_at)
        values ('OLD222', now() - interval '60 days', 'ludo', now() - interval '1 day');
      insert into public.operational_telemetry (kind, payload, expires_at)
        values ('probe', '{}', now() - interval '1 day');
    `);
    const rows = (await db.query<{ table_name: string; deleted: number }>("select * from public.prune_expired_records()")).rows;
    expect(rows.map((r) => r.table_name)).toEqual(["room_timelines", "operational_telemetry"]);
    expect(rows.map((r) => Number(r.deleted))).toEqual([1, 1]);
  });

  it("keeps the retention job private: members and anonymous callers still cannot run it", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query("select * from public.prune_expired_records()")).rejects.toThrow("permission denied");
      } finally {
        await db.exec("reset role");
      }
    }
  });

  it("is safe to run twice, and on a database that never had the tables", async () => {
    await expect(db.exec(await sql("migrations/20261114000000_drop_social_hub_tables.sql"))).resolves.not.toThrow();
  });

  it("rolls back to the empty tables with the original five-table retention job", async () => {
    await db.exec(await sql("rollbacks/20261114000000_drop_social_hub_tables_rollback.sql"));

    for (const table of ["friend_requests", "parties", "party_members", "party_invitations"]) {
      expect(await exists(table), table).toBe(true);
      expect((await db.query(`select * from public.${table}`)).rows, `${table} comes back empty`).toHaveLength(0);
    }
    expect(await pruneReport()).toEqual([
      "room_timelines", "operational_telemetry", "friend_requests", "party_invitations", "parties",
    ]);
    // Row-level security is back on, so the restored tables are not world-readable.
    const { rows } = await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.friend_requests'::regclass",
    );
    expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });
});
