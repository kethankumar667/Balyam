import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

/**
 * `tournament_records` is dropped by 20261115000000 because the Tournaments feature was removed.
 * What must NOT go with it: `season_stats.tournament_wins`, which the dormant seasons code still
 * reads and writes. This runs the real migrations on real PostgreSQL (embedded), never against
 * production.
 */

const sql = (path: string) => readFile(new URL(`../../../../supabase/${path}`, import.meta.url), "utf8");

let db: PGlite;

const exists = async (table: string): Promise<boolean> =>
  (await db.query<{ r: string | null }>(`select to_regclass('public.${table}')::text as r`)).rows[0]!.r !== null;

const hasColumn = async (table: string, column: string): Promise<boolean> =>
  (
    await db.query(
      "select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2",
      [table, column],
    )
  ).rows.length === 1;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  await db.exec(await sql("migrations/20260818000000_progression_persistence.sql"));
  await db.exec(`
    insert into public.player_identities (player_id, kind) values ('guest_a', 'guest');
    insert into public.tournament_records (tournament_id, player_id, tournament_name, status)
      values ('cup_1', 'guest_a', 'Demo Cup', 'WINNER');
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("20261115000000 drop tournament_records, on embedded PostgreSQL", () => {
  it("starts from the old shape: the table exists and holds the seeded row", async () => {
    expect(await exists("tournament_records")).toBe(true);
    expect((await db.query("select * from public.tournament_records")).rows).toHaveLength(1);
  });

  it("drops the table and keeps the season data the dormant seasons code still uses", async () => {
    await db.exec(await sql("migrations/20261115000000_drop_tournament_records.sql"));

    expect(await exists("tournament_records")).toBe(false);
    expect(await exists("season_stats")).toBe(true);
    expect(await hasColumn("season_stats", "tournament_wins")).toBe(true);
    expect(await exists("player_identities")).toBe(true);
  });

  it("is safe to run twice, and on a database that never had the table", async () => {
    await expect(db.exec(await sql("migrations/20261115000000_drop_tournament_records.sql"))).resolves.not.toThrow();
  });

  it("rolls back to the empty table with forced row-level security", async () => {
    await db.exec(await sql("rollbacks/20261115000000_drop_tournament_records_rollback.sql"));

    expect(await exists("tournament_records")).toBe(true);
    expect((await db.query("select * from public.tournament_records")).rows, "comes back empty").toHaveLength(0);

    const { rows } = await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.tournament_records'::regclass",
    );
    expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });

  it("restores a working table: one row per player per tournament, status checked", async () => {
    await db.exec(
      "insert into public.tournament_records (tournament_id, player_id, status) values ('cup_2', 'guest_a', 'REGISTERED')",
    );
    await expect(
      db.exec("insert into public.tournament_records (tournament_id, player_id) values ('cup_2', 'guest_a')"),
    ).rejects.toThrow();
    await expect(
      db.exec("insert into public.tournament_records (tournament_id, player_id, status) values ('cup_3', 'guest_a', 'BOGUS')"),
    ).rejects.toThrow();
  });
});
