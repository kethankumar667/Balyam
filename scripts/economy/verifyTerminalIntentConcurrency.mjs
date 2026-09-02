#!/usr/bin/env node
/**
 * Real PostgreSQL Concurrency Verification for Blocker 06.1A
 *
 * Verifies `create_terminal_intent` in `20260901000000_economy_terminal_intents.sql`
 * against a real embedded PostgreSQL instance with genuinely separate `pg` Client
 * connections (real TCP connections, real transactions, real advisory locks).
 *
 * Usage: node scripts/economy/verifyTerminalIntentConcurrency.mjs
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
const TERMINAL_INTENTS_MIGRATION = path.join(ROOT, "supabase/migrations/20260901000000_economy_terminal_intents.sql");

const PORT = Number(process.env.VERIFY_TERMINAL_INTENT_PG_PORT) || 55503;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-terminal-intent-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  results.push({ section, name, passed, evidence: String(evidence).slice(0, 500) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const matchId = (tag = "TI") => `m_${tag}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;

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
  console.log("  Blocker 06.1A — Real PostgreSQL Concurrency Verification");
  console.log("========================================================\n");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();

  const connect = async () => {
    const c = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
    await c.connect();
    return c;
  };

  const adminClient = await connect();

  try {
    console.log("0. Setup — full migration chain through Blocker 06");
    await adminClient.query(AUTH_STUB);
    await adminClient.query(`grant usage on schema public to service_role;`);
    await adminClient.query(`grant select, insert, update, delete on all tables in schema public to service_role;`);
    await adminClient.query(`alter default privileges in schema public grant select, insert, update, delete on tables to service_role;`);
    await adminClient.query(fs.readFileSync(PROGRESSION_MIGRATION, "utf8"));
    await adminClient.query(fs.readFileSync(ECONOMY_V1_MIGRATION, "utf8"));
    await adminClient.query(fs.readFileSync(FORFEITURE_MIGRATION, "utf8"));
    await adminClient.query(fs.readFileSync(CAPACITY_MIGRATION, "utf8"));
    await adminClient.query(fs.readFileSync(EVENTS_MIGRATION, "utf8"));
    await adminClient.query(fs.readFileSync(TERMINAL_INTENTS_MIGRATION, "utf8"));
    check("setup", "full migration chain applied cleanly including 20260901000000_economy_terminal_intents.sql", true);

    const helperCommitMatch = async (client, mId, hostId) => {
      await client.query(
        `insert into public.player_identities (player_id, kind)
         values ($1, 'guest')
         on conflict do nothing`,
        [hostId],
      );
      await client.query(`select public.ensure_wallet($1)`, [hostId]);
      await client.query(`select public.grant_starter_coins($1)`, [hostId]);
      await client.query(
        `select public.commit_match_entry($1, $2, $3, 2, 2, 0, false)`,
        [mId, "ROOMA", hostId],
      );
    };

    console.log("\n1. Sequential duplicate creation");
    {
      const mId = matchId("SEQ");
      const host = guestId();
      await helperCommitMatch(adminClient, mId, host);

      const payload = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }] };

      const res1 = await adminClient.query(
        `select public.create_terminal_intent($1, $2, $3, $4) as result`,
        [mId, "SETTLEMENT", JSON.stringify(payload), 1],
      );
      const val1 = res1.rows[0].result;
      check("sequential", "first call creates intent", val1.created === true && val1.conflict === false);

      const res2 = await adminClient.query(
        `select public.create_terminal_intent($1, $2, $3, $4) as result`,
        [mId, "SETTLEMENT", JSON.stringify(payload), 1],
      );
      const val2 = res2.rows[0].result;
      check("sequential", "second identical call is idempotent (created:false, conflict:false)", val2.created === false && val2.conflict === false);
      check("sequential", "both calls return same intent ID", val1.intent.id === val2.intent.id);
    }

    console.log("\n2. TRUE multi-connection concurrency — 8 simultaneous identical calls for brand-new match");
    {
      const mId = matchId("CONC_ID");
      const host = guestId();
      await helperCommitMatch(adminClient, mId, host);

      const payload = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }] };

      const pool = await Promise.all(Array.from({ length: 8 }, () => connect()));
      try {
        const queryPromises = pool.map((c) =>
          c.query(`select public.create_terminal_intent($1, $2, $3, $4) as result`, [
            mId,
            "SETTLEMENT",
            JSON.stringify(payload),
            1,
          ]),
        );

        const responses = await Promise.all(queryPromises);
        const parsed = responses.map((r) => r.rows[0].result);

        const created = parsed.filter((p) => p.created && !p.conflict);
        const idempotent = parsed.filter((p) => !p.created && !p.conflict);
        const conflicts = parsed.filter((p) => p.conflict);

        check("concurrency-identical", "exactly 1 connection received created:true", created.length === 1, `created=${created.length}`);
        check("concurrency-identical", "exactly 7 connections received created:false, conflict:false", idempotent.length === 7, `idempotent=${idempotent.length}`);
        check("concurrency-identical", "zero connections received conflict:true", conflicts.length === 0, `conflicts=${conflicts.length}`);

        const rowCount = await adminClient.query(`select count(*)::int as cnt from public.economy_terminal_intents where match_id = $1`, [mId]);
        check("concurrency-identical", "exactly 1 row exists in economy_terminal_intents", rowCount.rows[0].cnt === 1, `cnt=${rowCount.rows[0].cnt}`);
      } finally {
        await Promise.all(pool.map((c) => c.end()));
      }
    }

    console.log("\n3. TRUE multi-connection concurrency — conflicting operation kinds");
    {
      const mId = matchId("CONC_KIND");
      const host = guestId();
      await helperCommitMatch(adminClient, mId, host);

      const settlePayload = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }] };
      const refundPayload = { operationKind: "REFUND", matchId: mId, reason: "server crashed" };
      const forfeitPayload = { operationKind: "FORFEITURE", matchId: mId, reason: "player abandoned" };

      const pool = await Promise.all([connect(), connect(), connect()]);
      try {
        const queryPromises = [
          pool[0].query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 1) as result`, [mId, JSON.stringify(settlePayload)]),
          pool[1].query(`select public.create_terminal_intent($1, 'REFUND', $2::jsonb, 1) as result`, [mId, JSON.stringify(refundPayload)]),
          pool[2].query(`select public.create_terminal_intent($1, 'FORFEITURE', $2::jsonb, 1) as result`, [mId, JSON.stringify(forfeitPayload)]),
        ];

        const responses = await Promise.all(queryPromises);
        const parsed = responses.map((r) => r.rows[0].result);

        const created = parsed.filter((p) => p.created && !p.conflict);
        const conflicts = parsed.filter((p) => !p.created && p.conflict);

        check("concurrency-conflicts", "exactly 1 winner created:true", created.length === 1, `created=${created.length}`);
        check("concurrency-conflicts", "exactly 2 losers received explicit conflict:true", conflicts.length === 2, `conflicts=${conflicts.length}`);

        const winningKind = created[0].intent.operation_kind;
        const dbRow = await adminClient.query(`select operation_kind from public.economy_terminal_intents where match_id = $1`, [mId]);
        check("concurrency-conflicts", "database row retained winning operation_kind uncorrupted", dbRow.rows[0].operation_kind === winningKind, `db=${dbRow.rows[0].operation_kind}`);
      } finally {
        await Promise.all(pool.map((c) => c.end()));
      }
    }

    console.log("\n4. TRUE multi-connection concurrency — same kind, different authoritative payload");
    {
      const mId = matchId("CONC_PAYLOAD");
      const host = guestId();
      const guest = guestId();
      await helperCommitMatch(adminClient, mId, host);

      const payloadA = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }, { identityId: guest, identityKind: "guest", placement: 2 }] };
      const payloadB = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: guest, identityKind: "guest", placement: 1 }, { identityId: host, identityKind: "guest", placement: 2 }] };

      const pool = await Promise.all([connect(), connect()]);
      try {
        const queryPromises = [
          pool[0].query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 1) as result`, [mId, JSON.stringify(payloadA)]),
          pool[1].query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 1) as result`, [mId, JSON.stringify(payloadB)]),
        ];

        const responses = await Promise.all(queryPromises);
        const parsed = responses.map((r) => r.rows[0].result);

        const created = parsed.filter((p) => p.created && !p.conflict);
        const conflicts = parsed.filter((p) => !p.created && p.conflict);

        check("concurrency-payload", "exactly 1 winner created:true", created.length === 1);
        check("concurrency-payload", "differing payload received explicit conflict:true", conflicts.length === 1);
      } finally {
        await Promise.all(pool.map((c) => c.end()));
      }
    }

    console.log("\n5. TRUE multi-connection concurrency — different payload versions");
    {
      const mId = matchId("CONC_VERSION");
      const host = guestId();
      await helperCommitMatch(adminClient, mId, host);

      const payload = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }] };

      const pool = await Promise.all([connect(), connect()]);
      try {
        const queryPromises = [
          pool[0].query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 1) as result`, [mId, JSON.stringify(payload)]),
          pool[1].query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 2) as result`, [mId, JSON.stringify(payload)]),
        ];

        const responses = await Promise.all(queryPromises);
        const parsed = responses.map((r) => r.rows[0].result);

        const created = parsed.filter((p) => p.created && !p.conflict);
        const conflicts = parsed.filter((p) => !p.created && p.conflict);

        check("concurrency-version", "exactly 1 winner created:true", created.length === 1);
        check("concurrency-version", "differing payload_version received explicit conflict:true", conflicts.length === 1);
      } finally {
        await Promise.all(pool.map((c) => c.end()));
      }
    }

    console.log("\n6. Semantic JSONB equality — key order insensitivity in PostgreSQL");
    {
      const mId = matchId("JSONB_ORDER");
      const host = guestId();
      await helperCommitMatch(adminClient, mId, host);

      // JSON string with key order: operationKind, matchId, reason
      const payload1Str = JSON.stringify({ operationKind: "REFUND", matchId: mId, reason: "test reason" });
      // JSON string with key order: reason, matchId, operationKind
      const payload2Str = JSON.stringify({ reason: "test reason", matchId: mId, operationKind: "REFUND" });

      const res1 = await adminClient.query(`select public.create_terminal_intent($1, 'REFUND', $2::jsonb, 1) as result`, [mId, payload1Str]);
      const res2 = await adminClient.query(`select public.create_terminal_intent($1, 'REFUND', $2::jsonb, 1) as result`, [mId, payload2Str]);

      const val1 = res1.rows[0].result;
      const val2 = res2.rows[0].result;

      check("jsonb-order", "first call created intent", val1.created === true && val1.conflict === false);
      check("jsonb-order", "permuted key order recognized as identical in PostgreSQL jsonb = jsonb (conflict:false)", val2.created === false && val2.conflict === false);
    }

    console.log("\n7. Repeated multi-connection concurrency — 10 trials of 8 simultaneous connections");
    {
      let trialSuccesses = 0;
      for (let trial = 1; trial <= 10; trial++) {
        const mId = matchId(`TRIAL_${trial}`);
        const host = guestId();
        await helperCommitMatch(adminClient, mId, host);

        const payload = { operationKind: "SETTLEMENT", matchId: mId, isValidRanking: true, participants: [{ identityId: host, identityKind: "guest", placement: 1 }] };
        const pool = await Promise.all(Array.from({ length: 8 }, () => connect()));
        try {
          const promises = pool.map((c) =>
            c.query(`select public.create_terminal_intent($1, 'SETTLEMENT', $2::jsonb, 1) as result`, [mId, JSON.stringify(payload)]),
          );
          const res = await Promise.all(promises);
          const parsed = res.map((r) => r.rows[0].result);
          const created = parsed.filter((p) => p.created && !p.conflict);
          const idempotent = parsed.filter((p) => !p.created && !p.conflict);
          if (created.length === 1 && idempotent.length === 7) {
            trialSuccesses++;
          }
        } finally {
          await Promise.all(pool.map((c) => c.end()));
        }
      }
      check("repeated-concurrency", "10/10 repeated trials passed: exactly 1 winner, 7 idempotent, 0 errors", trialSuccesses === 10, `successes=${trialSuccesses}/10`);
    }

  } finally {
    await adminClient.end();
    await pg.stop();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log("\n========================================================");
  console.log(`  RESULT: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECKS FAILED`} (${results.length} total)`);
  console.log("========================================================\n");

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL ERROR in real postgres verification:", err);
  process.exit(1);
});
