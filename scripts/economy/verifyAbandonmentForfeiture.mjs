#!/usr/bin/env node
/**
 * Verifies 20260828000000_economy_abandonment_forfeiture.sql against a real
 * embedded PostgreSQL, applied on top of the progression + economy v1
 * migrations, mirroring verifyEconomySchema.mjs's own approach (no Docker
 * in this environment — confirmed by that script's own header).
 *
 * Usage: node scripts/economy/verifyAbandonmentForfeiture.mjs
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

const PORT = Number(process.env.VERIFY_FORFEITURE_PG_PORT) || 55492;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-forfeiture-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  results.push({ section, name, passed, evidence: String(evidence).slice(0, 500) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;
const matchId = () => `m_FORFEIT_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

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
  console.log("  Abandonment Forfeiture Migration — Verification");
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
    console.log("0. Setup");
    await db.query(AUTH_STUB);
    await db.query(`grant usage on schema public to service_role;`);
    await db.query(`grant select, insert, update, delete on all tables in schema public to service_role;`);
    await db.query(`alter default privileges in schema public grant select, insert, update, delete on tables to service_role;`);
    await db.query(fs.readFileSync(PROGRESSION_MIGRATION, "utf8"));
    check("setup", "prerequisite progression migration applies", true);

    await db.query(fs.readFileSync(ECONOMY_V1_MIGRATION, "utf8"));
    check("setup", "economy v1 migration applies cleanly", true);

    let firstErr = null;
    try { await db.query(fs.readFileSync(FORFEITURE_MIGRATION, "utf8")); } catch (err) { firstErr = err; }
    check("migration", "forfeiture migration applies cleanly on top of economy v1", firstErr === null, firstErr ? firstErr.message : "no errors");
    if (firstErr) throw firstErr;

    let secondErr = null;
    try { await db.query(fs.readFileSync(FORFEITURE_MIGRATION, "utf8")); } catch (err) { secondErr = err; }
    check("migration", "forfeiture migration is idempotent (re-runnable)", secondErr === null, secondErr ? secondErr.message : "second apply changed nothing");

    console.log("\n1. Schema integrity");
    const cols = (await db.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='match_economy_settlements'`,
    )).rows.map((r) => r.column_name);
    check("schema", "match_economy_settlements has total_forfeited and forfeiture_reason", cols.includes("total_forfeited") && cols.includes("forfeiture_reason"), cols.join(", "));

    const wbCols = (await db.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='world_bank_accounts'`,
    )).rows.map((r) => r.column_name);
    check("schema", "world_bank_accounts has abandonment_forfeiture_revenue", wbCols.includes("abandonment_forfeiture_revenue"), wbCols.join(", "));

    const statusCheck = (await db.query(
      `select pg_get_constraintdef(oid) as def from pg_constraint where conname='match_economy_settlements_status_check'`,
    )).rows[0]?.def;
    check("schema", "status CHECK includes ABANDONMENT_FORFEITED", /ABANDONMENT_FORFEITED/.test(statusCheck ?? ""), statusCheck);

    async function setupHost(seatCount, humanSeatCount, botSeatCount, isSolo) {
      const host = guestId();
      await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [host]);
      await db.query(`select ensure_wallet($1)`, [host]);
      const mid = matchId();
      await db.query(`select commit_match_entry($1, 'ROOMF', $2, $3, $4, $5, $6)`, [mid, host, seatCount, humanSeatCount, botSeatCount, isSolo]);
      return { host, mid };
    }

    console.log("\n2. Core forfeiture flow (solo signed-in host vs bots, Example 3)");
    {
      const { host, mid } = await setupHost(3, 1, 2, true);
      const balBefore = (await db.query(`select balance from coin_wallets where identity_id=$1`, [host])).rows[0].balance;
      const wbBefore = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      const ledgerCountBefore = (await db.query(`select count(*)::int n from coin_ledger_entries where wallet_id=$1`, [host])).rows[0].n;

      const forfeit = (await db.query(`select forfeit_match_entry($1, $2) as r`, [mid, "Host abandoned mid-match, no eligible successor"])).rows[0].r;
      check("forfeiture", "forfeit_match_entry applies and returns ABANDONMENT_FORFEITED", forfeit.applied === true && forfeit.result?.status === "ABANDONMENT_FORFEITED", JSON.stringify(forfeit));

      const balAfter = (await db.query(`select balance from coin_wallets where identity_id=$1`, [host])).rows[0].balance;
      check("forfeiture", "host wallet balance UNCHANGED (no refund)", balAfter === balBefore, `${balBefore} -> ${balAfter}`);

      const wbAfter = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      check("forfeiture", "World Bank abandonment_forfeiture_revenue increased by EXACTLY the committed pool",
        (BigInt(wbAfter) - BigInt(wbBefore)).toString() === forfeit.result.total_collected,
        `before=${wbBefore} after=${wbAfter} collected=${forfeit.result.total_collected}`);

      const ledgerRows = (await db.query(`select affected_balance, entry_type, amount from world_bank_ledger where source_id=$1 and entry_type='ABANDONMENT_FORFEITURE'`, [mid])).rows;
      check("forfeiture", "exactly one ABANDONMENT_FORFEITURE ledger row inserted", ledgerRows.length === 1, JSON.stringify(ledgerRows));
      check("forfeiture", "ledger row's affected_balance is abandonment_forfeiture_revenue", ledgerRows[0]?.affected_balance === "abandonment_forfeiture_revenue", JSON.stringify(ledgerRows[0]));

      const participantRows = (await db.query(`select count(*)::int n from match_economy_participants where match_id=$1`, [mid])).rows[0].n;
      check("forfeiture", "no match_economy_participants rows created (no prize, no voucher, no bot winnings)", participantRows === 0, `${participantRows} row(s)`);

      const ledgerCountAfter = (await db.query(`select count(*)::int n from coin_ledger_entries where wallet_id=$1`, [host])).rows[0].n;
      check("forfeiture", "no NEW coin_ledger_entries row for the host from forfeiture (no refund credit)", ledgerCountAfter === ledgerCountBefore, `before=${ledgerCountBefore}, after=${ledgerCountAfter}`);
    }

    console.log("\n3. Idempotency (Example 7)");
    {
      const { mid } = await setupHost(2, 1, 1, false);
      const first = (await db.query(`select forfeit_match_entry($1, $2) as r`, [mid, "abandon"])).rows[0].r;
      const wbAfterFirst = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      const second = (await db.query(`select forfeit_match_entry($1, $2) as r`, [mid, "abandon again"])).rows[0].r;
      const wbAfterSecond = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      check("idempotency", "first call applies=true, second call applies=false (replay)", first.applied === true && second.applied === false, `${first.applied}, ${second.applied}`);
      check("idempotency", "World Bank balance unchanged by the duplicate call", wbAfterFirst === wbAfterSecond, `${wbAfterFirst} -> ${wbAfterSecond}`);
    }

    console.log("\n4. Concurrent forfeiture — exactly one applied=true, no double-credit (Example 7 under real concurrency)");
    {
      const { mid } = await setupHost(2, 1, 1, false);
      const RACERS = 8;
      const wbBefore = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      const clients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
      const outcomes = await Promise.all(clients.map((c) => c.query(`select forfeit_match_entry($1, 'race') as r`, [mid]).then((r) => r.rows[0].r.applied)));
      await Promise.all(clients.map((c) => c.end()));
      const appliedCount = outcomes.filter(Boolean).length;
      const wbAfter = (await db.query(`select abandonment_forfeiture_revenue from world_bank_accounts where id='primary'`)).rows[0].abandonment_forfeiture_revenue;
      const settlement = (await db.query(`select total_collected from match_economy_settlements where match_id=$1`, [mid])).rows[0];
      check("concurrency", `${RACERS} concurrent forfeit_match_entry calls: exactly one applied=true`, appliedCount === 1, `${appliedCount} applied`);
      check("concurrency", "World Bank credited exactly once (delta == total_collected)",
        (BigInt(wbAfter) - BigInt(wbBefore)).toString() === settlement.total_collected,
        `delta=${BigInt(wbAfter) - BigInt(wbBefore)}, collected=${settlement.total_collected}`);
    }

    console.log("\n5. Forfeiture races with settlement / refund — mutual exclusivity (Examples 8 & 9)");
    // TWO SEPARATE physical connections per race, matching section 4's own
    // 8-way pattern — a single shared `db` connection would serialize both
    // queries on ONE backend process (node-postgres queues queries on one
    // connection; it does not pipeline them), which only ever proves the
    // deterministic sequential-order case, never a genuine two-transaction
    // race for the SAME row. This was flagged in an independent audit of
    // this file (2026-08-28): the underlying `FOR UPDATE` guard was
    // separately confirmed correct under true concurrency at that time, but
    // this committed test did not yet prove it. Fixed here.
    {
      // 5a. forfeit vs settle, run 5 times: whichever wins, only one
      // terminal transition, no double economic action, every trial.
      for (let trial = 1; trial <= 5; trial++) {
        const { host, mid } = await setupHost(2, 1, 1, false);
        const connA = await connect();
        const connB = await connect();
        await Promise.allSettled([
          connA.query(`select forfeit_match_entry($1, 'abandon') as r`, [mid]),
          connB.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid, JSON.stringify([{ identityId: host, identityKind: "member", placement: 1 }])]),
        ]);
        await connA.end();
        await connB.end();
        const finalStatus = (await db.query(`select status, total_forfeited, total_wallet_rewarded, total_collected from match_economy_settlements where match_id=$1`, [mid])).rows[0];
        const oneOutcomeApplied =
          (finalStatus.status === "ABANDONMENT_FORFEITED" && finalStatus.total_wallet_rewarded === "0" && finalStatus.total_forfeited === finalStatus.total_collected) ||
          (finalStatus.status === "SETTLED" && finalStatus.total_forfeited === "0");
        check("concurrency", `forfeit-vs-settle TRUE two-connection race (trial ${trial}/5): exactly one terminal status wins, and that status's own money moved (not both)`,
          oneOutcomeApplied, JSON.stringify(finalStatus));
        check("concurrency", `forfeit-vs-settle TRUE two-connection race (trial ${trial}/5): no partial/mixed state (forfeited AND rewarded both nonzero)`,
          !(Number(finalStatus.total_forfeited) > 0 && Number(finalStatus.total_wallet_rewarded) > 0), JSON.stringify(finalStatus));
      }

      // 5b. forfeit vs refund, run 5 times, same two-connection discipline.
      for (let trial = 1; trial <= 5; trial++) {
        const { mid: mid2 } = await setupHost(1, 1, 0, true);
        const connA = await connect();
        const connB = await connect();
        await Promise.allSettled([
          connA.query(`select forfeit_match_entry($1, 'abandon') as r`, [mid2]),
          connB.query(`select refund_match_entry($1, 'refund') as r`, [mid2]),
        ]);
        await connA.end();
        await connB.end();
        const finalStatus2 = (await db.query(`select status, total_forfeited, total_refunded from match_economy_settlements where match_id=$1`, [mid2])).rows[0];
        const oneOutcome2 =
          (finalStatus2.status === "ABANDONMENT_FORFEITED" && finalStatus2.total_refunded === "0") ||
          (finalStatus2.status === "REFUNDED" && finalStatus2.total_forfeited === "0");
        check("concurrency", `forfeit-vs-refund TRUE two-connection race (trial ${trial}/5): exactly one terminal status wins, mutually exclusive money movement`,
          oneOutcome2, JSON.stringify(finalStatus2));
      }
    }

    console.log("\n6. Cross-terminal hard errors (settlement/refund cannot overwrite forfeiture, and vice versa)");
    {
      const { mid } = await setupHost(1, 1, 0, true);
      await db.query(`select forfeit_match_entry($1, 'abandon') as r`, [mid]);

      let refundAfterForfeitErr = null;
      try { await db.query(`select refund_match_entry($1, 'late refund attempt') as r`, [mid]); } catch (err) { refundAfterForfeitErr = err; }
      check("cross-terminal", "refund_match_entry on an already-forfeited match raises MATCH_ALREADY_FORFEITED",
        refundAfterForfeitErr?.message?.includes("MATCH_ALREADY_FORFEITED"), refundAfterForfeitErr?.message ?? "did not reject");

      const settleAfterForfeit = (await db.query(`select settle_match_economy($1, true, '[]'::jsonb) as r`, [mid])).rows[0].r;
      check("cross-terminal", "settle_match_economy on an already-forfeited match is a safe no-op (applied=false, status stays ABANDONMENT_FORFEITED)",
        settleAfterForfeit.applied === false && settleAfterForfeit.result?.status === "ABANDONMENT_FORFEITED", JSON.stringify(settleAfterForfeit));

      const { host: host2, mid: mid2 } = await setupHost(1, 1, 0, true);
      await db.query(`select refund_match_entry($1, 'normal refund') as r`, [mid2]);
      let forfeitAfterRefundErr = null;
      try { await db.query(`select forfeit_match_entry($1, 'late forfeit attempt') as r`, [mid2]); } catch (err) { forfeitAfterRefundErr = err; }
      check("cross-terminal", "forfeit_match_entry on an already-refunded match raises MATCH_ALREADY_REFUNDED",
        forfeitAfterRefundErr?.message?.includes("MATCH_ALREADY_REFUNDED"), forfeitAfterRefundErr?.message ?? "did not reject");
      void host2;

      const { host: host3, mid: mid3 } = await setupHost(1, 1, 0, true);
      await db.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid3, JSON.stringify([{ identityId: host3, identityKind: "member", placement: 1 }])]);
      let forfeitAfterSettleErr = null;
      try { await db.query(`select forfeit_match_entry($1, 'late forfeit attempt') as r`, [mid3]); } catch (err) { forfeitAfterSettleErr = err; }
      check("cross-terminal", "forfeit_match_entry on an already-settled match raises MATCH_ALREADY_SETTLED",
        forfeitAfterSettleErr?.message?.includes("MATCH_ALREADY_SETTLED"), forfeitAfterSettleErr?.message ?? "did not reject");
    }

    console.log("\n7. Balance conservation constraint enforced by Postgres itself");
    {
      const { mid } = await setupHost(1, 1, 0, true);
      let violation = null;
      try {
        await db.query(`update match_economy_settlements set status='ABANDONMENT_FORFEITED', total_forfeited=1 where match_id=$1`, [mid]);
      } catch (err) { violation = err; }
      check("conservation", "an ABANDONMENT_FORFEITED row with total_forfeited != total_collected is rejected by the CHECK constraint",
        violation?.code === "23514", violation?.message ?? "was NOT rejected");
    }

    console.log("\n8. Client-supplied amount/identity cannot control forfeiture");
    {
      // forfeit_match_entry's signature only accepts (match_id, reason) —
      // there is no amount or identity parameter to smuggle a value through,
      // which this asserts structurally via the function's own catalog entry.
      const sig = (await db.query(
        `select pg_get_function_arguments(oid) as args from pg_proc where proname='forfeit_match_entry' and pronamespace='public'::regnamespace`,
      )).rows[0]?.args;
      check("trust-boundary", "forfeit_match_entry accepts only (p_match_id text, p_reason text) — no amount, no identity",
        sig === "p_match_id text, p_reason text", sig);
    }

    console.log("\n9. Privilege boundary — forfeit_match_entry is service_role only");
    {
      const anonOk = (await db.query(
        `select has_function_privilege('anon', p.oid, 'EXECUTE') as ok from pg_proc p where p.proname='forfeit_match_entry' and p.pronamespace='public'::regnamespace`,
      )).rows[0].ok;
      const authOk = (await db.query(
        `select has_function_privilege('authenticated', p.oid, 'EXECUTE') as ok from pg_proc p where p.proname='forfeit_match_entry' and p.pronamespace='public'::regnamespace`,
      )).rows[0].ok;
      const serviceOk = (await db.query(
        `select has_function_privilege('service_role', p.oid, 'EXECUTE') as ok from pg_proc p where p.proname='forfeit_match_entry' and p.pronamespace='public'::regnamespace`,
      )).rows[0].ok;
      check("privileges", "forfeit_match_entry NOT executable by anon", anonOk === false, `anon=${anonOk}`);
      check("privileges", "forfeit_match_entry NOT executable by authenticated", authOk === false, `authenticated=${authOk}`);
      check("privileges", "forfeit_match_entry IS executable by service_role", serviceOk === true, `service_role=${serviceOk}`);
    }

    console.log("\n10. Existing behavior preserved (regression spot-check)");
    {
      const { host, mid } = await setupHost(2, 1, 1, false);
      const settle = (await db.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [mid, JSON.stringify([{ identityId: host, identityKind: "member", placement: 1 }])])).rows[0].r;
      check("regression", "normal settlement still works after this migration", settle.applied === true && settle.result?.status === "SETTLED", JSON.stringify(settle));

      const { mid: mid2 } = await setupHost(1, 1, 0, true);
      const refund = (await db.query(`select refund_match_entry($1, 'normal cancel') as r`, [mid2])).rows[0].r;
      check("regression", "normal refund still works after this migration", refund.applied === true && refund.result?.status === "REFUNDED", JSON.stringify(refund));
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
