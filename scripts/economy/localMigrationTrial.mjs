#!/usr/bin/env node
/**
 * Economy V1 — clean local migration trial (full history, in sequence).
 *
 * WHY THIS EXISTS, SEPARATELY FROM verifyEconomySchema.mjs:
 * The Supabase CLI's real local stack (`supabase db reset` / `supabase start`)
 * requires Docker, which is not installed in this environment — confirmed by
 * running `npx supabase db reset` directly, which fails with
 * `LegacyLocalDbRunningError: failed to inspect service` before it ever
 * reaches a migration. This script is the closest available substitute: a
 * FRESH embedded PostgreSQL 17 instance (equivalent in spirit to a clean
 * local reset — new data directory, nothing carried over) with ALL SEVEN
 * `supabase/migrations/*.sql` files applied in the exact lexicographic order
 * the Supabase CLI would use (filenames are timestamp-prefixed), not just the
 * two (progression + economy) that verifyEconomySchema.mjs applies for its
 * own narrower purpose.
 *
 * WHAT THIS DOES NOT PROVE: this is still direct-SQL application against a
 * bare Postgres engine, not the Supabase CLI's own migration-history
 * bookkeeping (the `supabase_migrations.schema_migrations` table it
 * maintains), and there is no PostgREST layer here at all — see the trial
 * report for what remains unverified as a result.
 *
 * Usage: node scripts/economy/localMigrationTrial.mjs
 */

import EmbeddedPostgres from "embedded-postgres";
import pkg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const PORT = Number(process.env.TRIAL_PG_PORT) || 55440;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-local-trial-pg-${process.pid}`);

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function main() {
  console.log("========================================================");
  console.log("  Economy V1 — clean local migration trial (full sequence)");
  console.log("========================================================\n");

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are timestamp/lexicographically ordered — same order the Supabase CLI applies them in

  console.log(`Pre-trial migration list (${migrationFiles.length} files, supabase/migrations/, sorted):`);
  migrationFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log("");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  console.log(`Starting fresh embedded PostgreSQL (clean-reset equivalent) — data dir: ${DATA_DIR}`);
  await pg.initialise();
  await pg.start();

  const db = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
  await db.connect();
  const version = (await db.query("select version()")).rows[0].version;
  console.log(`Engine: ${version.split(",")[0]}`);
  console.log("Pre-migration state: brand-new database, zero application tables (this IS the clean-reset baseline).\n");

  await db.query(AUTH_STUB);

  const results = [];
  console.log("Applying full migration sequence:\n");
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const start = Date.now();
    try {
      await db.query(sql);
      const ms = Date.now() - start;
      results.push({ file, ok: true, ms });
      console.log(`  ✓ ${file}  (${ms}ms)`);
    } catch (err) {
      const ms = Date.now() - start;
      results.push({ file, ok: false, ms, error: err.message });
      console.log(`  ✗ ${file}  (${ms}ms) — ${err.message}`);
      break; // stop at first failure, same as a real sequential migration run would
    }
  }

  const allOk = results.length === migrationFiles.length && results.every((r) => r.ok);
  console.log(`\nSequence result: ${allOk ? "ALL " + migrationFiles.length + " MIGRATIONS APPLIED CLEANLY, IN ORDER" : "FAILED — see above"}\n`);

  if (allOk) {
    const tableCount = (await db.query(
      `select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    )).rows[0].n;
    const economyTables = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name like '%economy%' or table_name in ('coin_wallets','coin_ledger_entries','reward_vouchers','world_bank_accounts','world_bank_ledger')`,
    )).rows.map((r) => r.table_name).sort();
    console.log(`Final schema: ${tableCount} public base tables total. Economy tables present: ${economyTables.join(", ")}`);

    // Function-privilege snapshot — the closest available proxy for "what
    // PostgREST would expose", since PostgREST itself never ran here (no
    // Docker). PostgREST's own exposure is entirely a function of these same
    // Postgres GRANT/REVOKE facts, introspected via the same information the
    // CLI's local stack would ultimately read.
    const economyFns = ["ensure_wallet", "grant_starter_coins", "commit_match_entry", "settle_match_economy",
      "refund_match_entry", "issue_guest_voucher", "redeem_reward_voucher", "reconcile_match_settlement",
      "list_stale_committed_settlements"];
    console.log("\nFunction privilege snapshot (proxy for PostgREST /rpc/* exposure — see trial report for the caveat):");
    for (const fn of economyFns) {
      const r = await db.query(
        `select
           bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_exec,
           bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as auth_exec,
           bool_or(has_function_privilege('service_role', p.oid, 'EXECUTE')) as service_exec
         from pg_proc p where p.proname=$1 and p.pronamespace='public'::regnamespace`,
        [fn],
      );
      const row = r.rows[0];
      console.log(`  ${fn.padEnd(30)} anon=${row.anon_exec ?? false}  authenticated=${row.auth_exec ?? false}  service_role=${row.service_exec ?? false}`);
    }
  }

  await db.end();
  await pg.stop();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });

  console.log("\n========================================================");
  console.log(`  TRIAL RESULT: ${allOk ? "PASSED" : "FAILED"}`);
  console.log("========================================================\n");
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}\n${err.stack ?? ""}`);
  process.exit(2);
});
