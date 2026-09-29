#!/usr/bin/env node
/**
 * Reward-gateway schema verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The reward gateway's guarantees are database guarantees: a reward is granted
 * once because of a unique index, paid once because every state transition is a
 * guarded UPDATE, and unreadable to a client because RLS is forced. Unit tests
 * against an in-memory store can say the code asks the right questions; only a
 * real Postgres can say the answers hold under concurrency. This applies the
 * real migration to an actual PostgreSQL 17 (embedded-postgres, not an emulator)
 * and interrogates the result.
 *
 * CAN establish: the migration applies and re-applies, constraints reject what
 * they should, idempotency and the transition guards hold under real concurrent
 * connections, RLS is forced, an `authenticated` role is denied what it should
 * be, cascade delete reaches every table, and the rollback works.
 * CANNOT establish: that the SERVER's PostgREST calls are shaped right (that is
 * covered by rewardRepositoryContract.test.ts with a mocked fetch), nor anything
 * about Supabase's own auth schema, which is stubbed here exactly as
 * verifySchema.mjs stubs it.
 *
 * Prints REWARD_SCHEMA_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/persistence/verifyRewardSchema.mjs
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
const PROGRESSION = path.join(ROOT, "supabase/migrations/20260818000000_progression_persistence.sql");
const MIGRATION = path.join(ROOT, "supabase/migrations/20261012000000_reward_gateway.sql");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261012000000_reward_gateway_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55434;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-reward-pg-verify-${process.pid}`);

let failures = 0;
function check(name, passed, evidence = "") {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const guest = () => `guest_${crypto.randomBytes(16).toString("hex")}`;
const inMs = (ms) => new Date(Date.now() + ms).toISOString();

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

async function expectRejection(client, sql, params, code) {
  try {
    await client.query(sql, params);
    return { rejected: false, detail: "accepted" };
  } catch (err) {
    return { rejected: code ? err.code === code : true, detail: `${err.code} ${err.message}` };
  }
}

async function main() {
  console.log("\nReward gateway schema verification — real PostgreSQL\n");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
    // UTF8 explicitly: the migration's comments contain non-ASCII, and initdb
    // otherwise inherits a Windows host locale under which they fail to apply.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
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
    /* ═════════ 1. Migration ═════════ */
    console.log("1. Migration");
    await db.query(AUTH_STUB);
    await db.query(fs.readFileSync(PROGRESSION, "utf8"));
    check("dependency migration (progression) applies", true, "player_identities + owns_player_row available");

    const sql = fs.readFileSync(MIGRATION, "utf8");
    let first = null;
    try {
      await db.query(sql);
    } catch (err) {
      first = err;
    }
    check("reward migration applies cleanly", first === null, first ? first.message : "no errors");
    if (first) throw first;

    let second = null;
    try {
      await db.query(sql);
    } catch (err) {
      second = err;
    }
    check("reward migration is re-runnable", second === null, second ? second.message : "second apply changed nothing");

    const tables = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_name in ('reward_ledger','account_risk','risk_events')`,
    )).rows.map((r) => r.table_name).sort();
    check("all three tables exist", tables.join(",") === "account_risk,reward_ledger,risk_events", tables.join(","));

    const idx = (await db.query(`select indexname, indexdef from pg_indexes where schemaname='public' and tablename='reward_ledger'`)).rows;
    const due = idx.find((i) => i.indexname === "reward_due_idx");
    check("the sweeper's index is partial on PENDING", Boolean(due && /PENDING/.test(due.indexdef)), due?.indexdef ?? "missing");
    check("the source-uniqueness constraint exists",
      (await db.query(`select 1 from pg_constraint where conname='reward_source_unique'`)).rowCount === 1);

    /* ═════════ 2. Constraints ═════════ */
    console.log("\n2. Constraints refuse what they should");
    const p = guest();
    await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [p]);

    const base = (over = {}) => ({
      id: `rwd_${crypto.randomBytes(6).toString("hex")}`, type: "LEVEL_MILESTONE", amount: 500, source: `level:${crypto.randomBytes(3).toString("hex")}`,
      status: "PENDING", risk: "NORMAL", released: null, started: null, voided: null, ledger: null, ...over,
    });
    const insert = (c, r) => c.query(
      `insert into public.reward_ledger
         (reward_id, player_id, reward_type, reason_code, amount, source_id, vesting_until, status, risk_state,
          ledger_entry_id, release_started_at, released_at, voided_reason)
       values ($1,$2,$3,'TEST',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [r.id, p, r.type, r.amount, r.source, inMs(-1000), r.status, r.risk, r.ledger, r.started, r.released, r.voided],
    );
    const refused = async (label, over, code) => {
      let outcome;
      try {
        await insert(db, base(over));
        outcome = { rejected: false, detail: "accepted" };
      } catch (err) {
        outcome = { rejected: code ? err.code === code : true, detail: `${err.code}` };
      }
      check(label, outcome.rejected, outcome.detail);
    };
    await refused("a zero-coin reward is refused", { amount: 0 }, "23514");
    await refused("a negative reward is refused", { amount: -5 }, "23514");
    await refused("an unknown reward type is refused", { type: "FREE_MONEY" }, "23514");
    await refused("an unknown status is refused", { status: "PAID" }, "23514");
    await refused("an unknown risk state is refused", { risk: "BANNED" }, "23514");
    await refused("RELEASED without a release time is refused", { status: "RELEASED" }, "23514");
    await refused("RELEASING without a start time is refused", { status: "RELEASING" }, "23514");
    await refused("VOIDED without a reason is refused", { status: "VOIDED" }, "23514");
    await refused("VOIDED with a wallet entry (it was never paid) is refused", { status: "VOIDED", voided: "x", ledger: 5 }, "23514");
    const ok = base();
    let okErr = null;
    try {
      await insert(db, ok);
    } catch (err) {
      okErr = err;
    }
    check("a well-formed reward is accepted (positive control)", okErr === null, okErr?.message ?? "inserted");

    const dup = await expectRejection(
      db,
      `insert into public.reward_ledger (reward_id, player_id, reward_type, reason_code, amount, source_id, vesting_until)
       values ('rwd_other', $1, $2, 'TEST', 1, $3, now())`,
      [p, ok.type, ok.source],
      "23505",
    );
    check("the same (player, type, source) cannot be granted twice", dup.rejected, dup.detail);

    const badRisk = await expectRejection(db, `insert into public.account_risk (player_id, state, updated_by) values ($1, 'BANNED', 'op')`, [p], "23514");
    check("an unknown account_risk state is refused", badRisk.rejected, badRisk.detail);
    const badKind = await expectRejection(db, `insert into public.risk_events (player_id, kind, reason_code) values ($1, 'SHRUG', 'X')`, [p], "23514");
    check("an unknown risk_events kind is refused", badKind.rejected, badKind.detail);
    const noOwner = await expectRejection(db, `insert into public.reward_ledger (reward_id, player_id, reward_type, reason_code, amount, source_id, vesting_until) values ('rwd_orphan','guest_nobody','LEVEL_MILESTONE','T',1,'s', now())`, [], "23503");
    check("a reward for a player who does not exist is refused", noOwner.rejected, noOwner.detail);

    /* ═════════ 3. Idempotency under real concurrency ═════════ */
    console.log("\n3. Concurrent connections");
    const clients = await Promise.all(Array.from({ length: 12 }, connect));
    try {
      const shared = base();
      const inserts = await Promise.all(clients.map((c, i) => c.query(
        `insert into public.reward_ledger (reward_id, player_id, reward_type, reason_code, amount, source_id, vesting_until)
         values ($1,$2,$3,'TEST',500,$4,$5)
         on conflict (player_id, reward_type, source_id) do nothing returning reward_id`,
        [`${shared.id}_${i}`, p, shared.type, shared.source, inMs(-1000)],
      )));
      const wrote = inserts.filter((r) => r.rowCount > 0).length;
      check("12 simultaneous grants of the same reward write exactly one row", wrote === 1, `${wrote} row(s) written`);

      const claimRow = base();
      await insert(db, claimRow);
      const claims = await Promise.all(clients.map((c) => c.query(
        `update public.reward_ledger set status='RELEASING', release_started_at=now()
         where reward_id=$1 and status='PENDING' and vesting_until <= now() returning reward_id`,
        [claimRow.id],
      )));
      const won = claims.filter((r) => r.rowCount > 0).length;
      check("12 simultaneous claims for release: exactly one wins", won === 1, `${won} winner(s)`);

      const completes = await Promise.all(clients.map((c) => c.query(
        `update public.reward_ledger set status='RELEASED', released_at=now(), ledger_entry_id=42
         where reward_id=$1 and status='RELEASING' returning reward_id`,
        [claimRow.id],
      )));
      check("12 simultaneous completions: exactly one wins", completes.filter((r) => r.rowCount > 0).length === 1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }

    /* ═════════ 4. State machine ═════════ */
    console.log("\n4. State transitions are guarded");
    const a = base();
    await insert(db, a);
    const voidSql = `update public.reward_ledger set status='VOIDED', voided_reason='ring' where reward_id=$1 and status='PENDING' returning reward_id`;
    const claimSql = `update public.reward_ledger set status='RELEASING', release_started_at=now() where reward_id=$1 and status='PENDING' and vesting_until <= now() returning reward_id`;
    const completeSql = `update public.reward_ledger set status='RELEASED', released_at=now() where reward_id=$1 and status='RELEASING' returning reward_id`;

    check("cannot complete a reward that was never claimed", (await db.query(completeSql, [a.id])).rowCount === 0);
    check("a claim moves PENDING -> RELEASING", (await db.query(claimSql, [a.id])).rowCount === 1);
    check("cannot void a reward that is being paid", (await db.query(voidSql, [a.id])).rowCount === 0);
    check("completing moves RELEASING -> RELEASED", (await db.query(completeSql, [a.id])).rowCount === 1);
    check("cannot claim a reward that is already paid", (await db.query(claimSql, [a.id])).rowCount === 0);

    const b = base();
    await insert(db, b);
    check("an operator can void a PENDING reward", (await db.query(voidSql, [b.id])).rowCount === 1);
    check("a voided reward can never be claimed", (await db.query(claimSql, [b.id])).rowCount === 0);
    check("a voided reward can never be completed", (await db.query(completeSql, [b.id])).rowCount === 0);

    const future = base();
    await db.query(
      `insert into public.reward_ledger (reward_id, player_id, reward_type, reason_code, amount, source_id, vesting_until)
       values ($1,$2,$3,'TEST',10,$4,$5)`,
      [future.id, p, future.type, future.source, inMs(60_000)],
    );
    check("a reward cannot be claimed before it has vested", (await db.query(claimSql, [future.id])).rowCount === 0);

    const stale = base();
    await insert(db, stale);
    await db.query(`update public.reward_ledger set status='RELEASING', release_started_at=$2 where reward_id=$1`, [stale.id, inMs(-10 * 60_000)]);
    const dueRows = (await db.query(
      `select reward_id from public.reward_ledger where status='RELEASING' and release_started_at < $1`, [inMs(-5 * 60_000)],
    )).rows.map((r) => r.reward_id);
    check("a payment that died mid-way is found by its stale claim time", dueRows.includes(stale.id));

    /* ═════════ 5. Risk tables ═════════ */
    console.log("\n5. Risk tables");
    await db.query(`insert into public.account_risk (player_id, state, reason_codes, updated_by) values ($1,'WATCHLIST',array['AUTO_ABNORMAL_SESSIONS','TOO_SHORT'],'system')
                    on conflict (player_id) do update set state=excluded.state, reason_codes=excluded.reason_codes, updated_by=excluded.updated_by, updated_at=now()`, [p]);
    await db.query(`insert into public.account_risk (player_id, state, reason_codes, updated_by) values ($1,'RESTRICTED',array['OPERATOR_SET'],'op_1')
                    on conflict (player_id) do update set state=excluded.state, reason_codes=excluded.reason_codes, updated_by=excluded.updated_by, updated_at=now()`, [p]);
    const risk = (await db.query(`select state, reason_codes, updated_by from public.account_risk where player_id=$1`, [p])).rows;
    check("upserting an account's state keeps one row, the latest", risk.length === 1 && risk[0].state === "RESTRICTED" && risk[0].updated_by === "op_1", JSON.stringify(risk));
    check("reason codes round-trip as an array", Array.isArray(risk[0].reason_codes) && risk[0].reason_codes[0] === "OPERATOR_SET");

    await db.query(`insert into public.risk_events (player_id, kind, reason_code, detail) values ($1,'STATE_CHANGED','OPERATOR_SET',$2::jsonb)`, [p, JSON.stringify({ from: "WATCHLIST", to: "RESTRICTED", actor: "op_1" })]);
    const ev = (await db.query(`select detail from public.risk_events where player_id=$1 order by id desc limit 1`, [p])).rows[0];
    check("event detail round-trips as JSON", ev.detail.to === "RESTRICTED" && ev.detail.actor === "op_1");

    /* ═════════ 6. RLS and privileges ═════════ */
    console.log("\n6. Row Level Security and privileges");
    const rls = (await db.query(
      `select relname, relrowsecurity, relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and relname in ('reward_ledger','account_risk','risk_events')`,
    )).rows;
    check("RLS is enabled AND forced on all three tables", rls.length === 3 && rls.every((r) => r.relrowsecurity && r.relforcerowsecurity), JSON.stringify(rls));

    const policies = (await db.query(
      `select tablename, cmd, roles from pg_policies where schemaname='public' and tablename in ('reward_ledger','account_risk','risk_events')`,
    )).rows;
    check("the only policy is SELECT on reward_ledger", policies.length === 1 && policies[0].tablename === "reward_ledger" && policies[0].cmd === "SELECT", JSON.stringify(policies));

    const priv = async (role, table, action) =>
      (await db.query(`select has_table_privilege($1, $2, $3) as ok`, [role, `public.${table}`, action])).rows[0].ok;
    check("authenticated cannot read account_risk", !(await priv("authenticated", "account_risk", "select")));
    check("authenticated cannot read risk_events", !(await priv("authenticated", "risk_events", "select")));
    check("anon cannot read reward_ledger", !(await priv("anon", "reward_ledger", "select")));
    const col = async (column) =>
      (await db.query(`select has_column_privilege('authenticated', 'public.reward_ledger', $1, 'select') as ok`, [column])).rows[0].ok;
    check("authenticated may read the reward columns the app shows (own rows, by policy)",
      (await col("amount")) && (await col("status")) && (await col("vesting_until")));
    check("authenticated cannot read risk_state (a watch is never announced)", !(await col("risk_state")));
    check("authenticated cannot read the payment linkage or void reason",
      !(await col("ledger_entry_id")) && !(await col("voided_reason")));
    check("authenticated cannot write reward_ledger",
      !(await priv("authenticated", "reward_ledger", "insert")) && !(await priv("authenticated", "reward_ledger", "update")) && !(await priv("authenticated", "reward_ledger", "delete")));

    // The strongest form of the claim: actually be that role and try.
    const asAuth = await connect();
    try {
      await asAuth.query("set role authenticated");
      const read = await expectRejection(asAuth, `select * from public.account_risk`, [], "42501");
      check("as `authenticated`, reading account_risk is denied", read.rejected, read.detail);
      const write = await expectRejection(asAuth, `update public.reward_ledger set amount = 999999`, [], "42501");
      check("as `authenticated`, writing reward_ledger is denied", write.rejected, write.detail);
      const rows = await asAuth.query(`select count(*)::int n from public.reward_ledger`);
      check("as `authenticated` with no matching identity, reward_ledger shows no rows (RLS filters)", rows.rows[0].n === 0, `${rows.rows[0].n} visible`);
    } finally {
      await asAuth.end();
    }

    /* ═════════ 7. Cascade ═════════ */
    console.log("\n7. Erasing a player reaches every table");
    const counts = `select (select count(*) from public.reward_ledger where player_id=$1)::int r, (select count(*) from public.account_risk where player_id=$1)::int a, (select count(*) from public.risk_events where player_id=$1)::int e`;
    const before = (await db.query(counts, [p])).rows[0];
    check("the player has rows in all three tables to begin with", before.r > 0 && before.a > 0 && before.e > 0, JSON.stringify(before));
    await db.query(`delete from public.player_identities where player_id=$1`, [p]);
    const after = (await db.query(counts, [p])).rows[0];
    check("deleting the identity removes their rewards, risk state and risk events", after.r === 0 && after.a === 0 && after.e === 0, JSON.stringify(after));

    /* ═════════ 8. Rollback ═════════ */
    console.log("\n8. Rollback");
    let rollbackErr = null;
    try {
      await db.query(fs.readFileSync(ROLLBACK, "utf8"));
    } catch (err) {
      rollbackErr = err;
    }
    check("the rollback script applies cleanly", rollbackErr === null, rollbackErr?.message ?? "no errors");
    const left = (await db.query(
      `select count(*)::int n from information_schema.tables where table_schema='public' and table_name in ('reward_ledger','account_risk','risk_events')`,
    )).rows[0].n;
    check("the rollback removes all three tables", left === 0, `${left} left`);
    let reapply = null;
    try {
      await db.query(sql);
    } catch (err) {
      reapply = err;
    }
    check("the migration re-applies after a rollback", reapply === null, reapply?.message ?? "no errors");
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log("");
  if (failures > 0) {
    console.log(`REWARD_SCHEMA_FAILED: ${failures} check(s) did not pass`);
    process.exit(1);
  }
  console.log("REWARD_SCHEMA_VERIFIED");
}

main().catch((err) => {
  console.error("Verification aborted:", err);
  process.exit(1);
});
