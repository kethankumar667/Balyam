#!/usr/bin/env node
/**
 * Verifies 20260830000000_economy_settlement_events.sql against a real
 * embedded PostgreSQL, applied on top of progression + economy v1 +
 * abandonment/forfeiture + seat-capacity-contract, mirroring
 * verifyAbandonmentForfeiture.mjs's own approach (no Docker in this
 * environment — confirmed by verifyEconomySchema.mjs's own header).
 *
 * This exists specifically to close the concurrency gap an independent
 * audit found in the settlement-events work: 21 unit tests all ran against
 * InMemoryEconomyRepository (a single-threaded JS mock with no real
 * interleaving), and neither this repo's existing concurrency scripts
 * (verifyEconomySchema.mjs, verifyAbandonmentForfeiture.mjs) nor
 * localMigrationTrial.mjs ever referenced settlement_events or
 * emit_settlement_event at all. Every concurrency check below uses genuinely
 * separate `pg` connections (never a single shared client racing itself),
 * per that audit's explicit requirement.
 *
 * Usage: node scripts/economy/verifySettlementEvents.mjs
 */

import EmbeddedPostgres from "embedded-postgres";
import pkg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PROGRESSION_MIGRATION = path.join(ROOT, "supabase/migrations/20260818000000_progression_persistence.sql");
const ECONOMY_V1_MIGRATION = path.join(ROOT, "supabase/migrations/20260826000000_economy_v1.sql");
const FORFEITURE_MIGRATION = path.join(ROOT, "supabase/migrations/20260828000000_economy_abandonment_forfeiture.sql");
const CAPACITY_MIGRATION = path.join(ROOT, "supabase/migrations/20260829000000_economy_seat_capacity_contract.sql");
const EVENTS_MIGRATION = path.join(ROOT, "supabase/migrations/20260830000000_economy_settlement_events.sql");
const EVENTS_ROLLBACK = path.join(ROOT, "supabase/rollbacks/20260830000000_economy_settlement_events_rollback.sql");

const PORT = Number(process.env.VERIFY_SETTLEMENT_EVENTS_PG_PORT) || 55501;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-settlement-events-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  results.push({ section, name, passed, evidence: String(evidence).slice(0, 500) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;
const matchId = () => `m_EVENTS_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function main() {
  console.log("\n========================================================");
  console.log("  Settlement Events Migration (Phase 6A) — Verification");
  console.log("========================================================\n");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres", port: PORT,
    persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();

  const connect = async () => {
    const c = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
    await c.connect();
    return c;
  };

  const db = await connect();

  try {
    console.log("0. Setup — full migration chain through Phase 6A");
    await db.query(AUTH_STUB);
    await db.query(`grant usage on schema public to service_role;`);
    await db.query(`grant select, insert, update, delete on all tables in schema public to service_role;`);
    await db.query(`alter default privileges in schema public grant select, insert, update, delete on tables to service_role;`);
    await db.query(fs.readFileSync(PROGRESSION_MIGRATION, "utf8"));
    await db.query(fs.readFileSync(ECONOMY_V1_MIGRATION, "utf8"));
    await db.query(fs.readFileSync(FORFEITURE_MIGRATION, "utf8"));
    await db.query(fs.readFileSync(CAPACITY_MIGRATION, "utf8"));
    check("setup", "prerequisite migration chain applies (progression, economy v1, forfeiture, seat-capacity)", true);

    let firstErr = null;
    try { await db.query(fs.readFileSync(EVENTS_MIGRATION, "utf8")); } catch (err) { firstErr = err; }
    check("migration", "settlement-events migration applies cleanly on the full chain", firstErr === null, firstErr ? firstErr.message : "no errors");
    if (firstErr) throw firstErr;

    let secondErr = null;
    try { await db.query(fs.readFileSync(EVENTS_MIGRATION, "utf8")); } catch (err) { secondErr = err; }
    check("migration", "settlement-events migration is idempotent (re-runnable)", secondErr === null, secondErr ? secondErr.message : "second apply changed nothing");

    console.log("\n1. Schema integrity");
    const cols = (await db.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='settlement_events'`,
    )).rows.map((r) => r.column_name);
    check("schema", "settlement_events has sequence_number, event_type, idempotency_key, initiator_kind",
      ["sequence_number", "event_type", "idempotency_key", "initiator_kind"].every((c) => cols.includes(c)), cols.join(", "));

    const uq = (await db.query(
      `select conname from pg_constraint where conname = 'settlement_events_match_seq_unique'`,
    )).rows[0]?.conname;
    check("schema", "unique (match_id, sequence_number) constraint exists", uq === "settlement_events_match_seq_unique", uq ?? "missing");

    async function setupHost(seatCount, humanSeatCount, botSeatCount, isSolo) {
      const host = guestId();
      await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [host]);
      await db.query(`select ensure_wallet($1)`, [host]);
      const mid = matchId();
      await db.query(`select commit_match_entry($1, 'ROOME', $2, $3, $4, $5, $6)`, [mid, host, seatCount, humanSeatCount, botSeatCount, isSolo]);
      return { host, mid };
    }

    console.log("\n2. Immutability — trigger rejects UPDATE and DELETE, not just REVOKE");
    {
      const { mid } = await setupHost(1, 1, 0, true);
      const row = (await db.query(`select id from settlement_events where match_id=$1 limit 1`, [mid])).rows[0];

      let updateErr = null;
      try { await db.query(`update settlement_events set reason='tampered' where id=$1`, [row.id]); } catch (err) { updateErr = err; }
      check("immutability", "UPDATE on settlement_events is rejected", /LEDGER_IS_IMMUTABLE/.test(updateErr?.message ?? ""), updateErr?.message ?? "was NOT rejected");

      let deleteErr = null;
      try { await db.query(`delete from settlement_events where id=$1`, [row.id]); } catch (err) { deleteErr = err; }
      check("immutability", "DELETE on settlement_events is rejected", /LEDGER_IS_IMMUTABLE/.test(deleteErr?.message ?? ""), deleteErr?.message ?? "was NOT rejected");

      const stillThere = (await db.query(`select count(*)::int n from settlement_events where id=$1`, [row.id])).rows[0].n;
      check("immutability", "the row genuinely still exists after both rejected attempts", stillThere === 1, `count=${stillThere}`);
    }

    console.log("\n3. Sequential lifecycle — correct event_type, sequence, and applied/replay flags");
    {
      const { host, mid } = await setupHost(2, 1, 1, false);
      const replay = (await db.query(`select commit_match_entry($1, 'ROOME', $2, 2, 1, 1, false) as r`, [mid, host])).rows[0].r;
      check("lifecycle", "duplicate commit returns applied=false", replay.applied === false, JSON.stringify(replay));

      const settle = (await db.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid, JSON.stringify([{ identityId: host, identityKind: "member", placement: 1 }])])).rows[0].r;
      check("lifecycle", "settle applies", settle.applied === true, JSON.stringify(settle));

      const events = (await db.query(`select sequence_number, event_type, applied, is_replay from settlement_events where match_id=$1 order by sequence_number asc`, [mid])).rows;
      check("lifecycle", "exactly 3 events recorded (COMMITTED, REPLAYED, SETTLED)", events.length === 3, JSON.stringify(events));
      check("lifecycle", "sequence_number is 1,2,3 with no gaps or duplicates", JSON.stringify(events.map((e) => e.sequence_number)) === JSON.stringify([1, 2, 3]), JSON.stringify(events.map((e) => e.sequence_number)));
      check("lifecycle", "event_type order is MATCH_COMMITTED, MATCH_COMMITMENT_REPLAYED, MATCH_SETTLED",
        JSON.stringify(events.map((e) => e.event_type)) === JSON.stringify(["MATCH_COMMITTED", "MATCH_COMMITMENT_REPLAYED", "MATCH_SETTLED"]),
        JSON.stringify(events.map((e) => e.event_type)));
    }

    console.log("\n4. TRUE multi-connection concurrency — commit_match_entry sequence allocation");
    // Genuinely separate physical connections, not one shared client — a
    // single connection cannot race against itself (node-postgres queues
    // queries on one connection, it does not pipeline them).
    {
      const host = guestId();
      await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [host]);
      await db.query(`select ensure_wallet($1)`, [host]);
      const mid = matchId();
      const RACERS = 8;
      const clients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
      const outcomes = await Promise.all(
        clients.map((c) => c.query(`select commit_match_entry($1, 'ROOME', $2, 2, 2, 0, false) as r`, [mid, host]).then((r) => r.rows[0].r.applied)),
      );
      await Promise.all(clients.map((c) => c.end()));
      const appliedCount = outcomes.filter(Boolean).length;
      check("concurrency", `${RACERS} concurrent commit_match_entry calls for the SAME match: exactly one applied=true`, appliedCount === 1, `${appliedCount} applied`);

      const events = (await db.query(`select sequence_number, event_type, applied from settlement_events where match_id=$1 order by sequence_number asc`, [mid])).rows;
      check("concurrency", `exactly ${RACERS} settlement_events rows recorded (one per attempt, no attempt silently dropped)`, events.length === RACERS, `${events.length} rows`);
      const seqs = events.map((e) => e.sequence_number);
      const uniqueSeqs = new Set(seqs);
      check("concurrency", "every sequence_number is unique — no two concurrent transactions received the same value", uniqueSeqs.size === seqs.length, JSON.stringify(seqs));
      check("concurrency", "sequence_number is exactly 1..N with no gaps", JSON.stringify([...seqs].sort((a, b) => a - b)) === JSON.stringify(Array.from({ length: RACERS }, (_, i) => i + 1)), JSON.stringify(seqs));
      const committedEvents = events.filter((e) => e.event_type === "MATCH_COMMITTED");
      check("concurrency", "exactly one MATCH_COMMITTED event, at sequence_number 1 (the winner)", committedEvents.length === 1 && committedEvents[0].sequence_number === 1, JSON.stringify(committedEvents));
    }

    console.log("\n5. TRUE multi-connection concurrency — reconcile_match_settlement (the audited race)");
    // This is the specific gap an independent audit found: reconcile used a
    // bare, unlocked SELECT before calling emit_settlement_event, so two
    // concurrent reconcile calls for the same match could compute the same
    // sequence_number and collide on settlement_events_match_seq_unique.
    // The fix serializes reconcile with the same advisory-lock + FOR UPDATE
    // discipline every other settlement-mutating RPC already uses. Proving
    // it requires the same real, separate-connection race every other
    // concurrency check here uses — never a single shared client.
    {
      const { mid } = await setupHost(1, 1, 0, true);
      const RACERS = 10;
      const clients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
      const settled = await Promise.allSettled(
        clients.map((c) => c.query(`select reconcile_match_settlement($1) as r`, [mid])),
      );
      await Promise.all(clients.map((c) => c.end()));
      const rejected = settled.filter((s) => s.status === "rejected");
      check("concurrency", `${RACERS} concurrent reconcile_match_settlement calls for the SAME match: zero errors (no unique-violation from racing sequence allocation)`,
        rejected.length === 0, rejected.map((r) => r.reason?.message).join(" | "));

      const events = (await db.query(`select sequence_number, event_type from settlement_events where match_id=$1 and event_type='RECONCILIATION_AUDITED' order by sequence_number asc`, [mid])).rows;
      check("concurrency", `exactly ${RACERS} RECONCILIATION_AUDITED events recorded, one per call`, events.length === RACERS, `${events.length} rows`);
      const seqs = events.map((e) => e.sequence_number);
      const uniqueSeqs = new Set(seqs);
      check("concurrency", "every reconciliation's sequence_number is unique under real concurrency", uniqueSeqs.size === seqs.length, JSON.stringify(seqs));
    }

    console.log("\n6. TRUE two-connection race — settle vs refund, settlement_events reflect exactly one winner");
    {
      for (let trial = 1; trial <= 5; trial++) {
        const { host, mid } = await setupHost(1, 1, 0, true);
        const connA = await connect();
        const connB = await connect();
        await Promise.allSettled([
          connA.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid, JSON.stringify([{ identityId: host, identityKind: "member", placement: 1 }])]),
          connB.query(`select refund_match_entry($1, 'cancel') as r`, [mid]),
        ]);
        await connA.end();
        await connB.end();

        const finalStatus = (await db.query(`select status from match_economy_settlements where match_id=$1`, [mid])).rows[0].status;
        const events = (await db.query(`select sequence_number, event_type from settlement_events where match_id=$1 order by sequence_number asc`, [mid])).rows;
        const terminalEvents = events.filter((e) => e.event_type === "MATCH_SETTLED" || e.event_type === "MATCH_REFUNDED");
        check("concurrency", `settle-vs-refund TRUE two-connection race (trial ${trial}/5): exactly one terminal settlement_events row, matching the settlement's own final status`,
          terminalEvents.length === 1 && ((finalStatus === "SETTLED" && terminalEvents[0].event_type === "MATCH_SETTLED") || (finalStatus === "REFUNDED" && terminalEvents[0].event_type === "MATCH_REFUNDED")),
          `status=${finalStatus}, terminalEvents=${JSON.stringify(terminalEvents)}`);
        const seqs = events.map((e) => e.sequence_number);
        check("concurrency", `settle-vs-refund TRUE two-connection race (trial ${trial}/5): no duplicate sequence_number`,
          new Set(seqs).size === seqs.length, JSON.stringify(seqs));
      }
    }

    console.log("\n7. Rollback safety with real settlement_events rows already present");
    {
      let rollbackErr = null;
      try { await db.query(fs.readFileSync(EVENTS_ROLLBACK, "utf8")); } catch (err) { rollbackErr = err; }
      check("rollback", "rollback applies cleanly even though settlement_events already has rows from every check above",
        rollbackErr === null, rollbackErr?.message ?? "no errors");

      const tableGone = (await db.query(`select to_regclass('public.settlement_events') as t`)).rows[0].t;
      check("rollback", "settlement_events table is gone after rollback", tableGone === null, `to_regclass=${tableGone}`);

      const { host, mid } = await setupHost(1, 1, 0, true);
      const settle = (await db.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid, JSON.stringify([{ identityId: host, identityKind: "member", placement: 1 }])])).rows[0].r;
      check("rollback", "commit_match_entry / settle_match_economy still work after rollback (restored to pre-6A behavior)",
        settle.applied === true && settle.result?.status === "SETTLED", JSON.stringify(settle));
    }

  } catch (err) {
    console.error(`\nFATAL: ${err.message}\n${err.stack ?? ""}`);
    failures += 1;
  } finally {
    await db.end();
    await pg.stop();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log("\n========================================================");
  console.log(`  RESULT: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} (${results.length} total)`);
  console.log("========================================================\n");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}\n${err.stack ?? ""}`);
  process.exit(2);
});
