#!/usr/bin/env node
/**
 * Economy V1 schema verification against a REAL PostgreSQL — remediation pass.
 *
 * ── Why this version exists ─────────────────────────────────────────────
 * The previous version of this script passed every check while the migration
 * it was testing had a live privilege-escalation gap (service_role had
 * blanket table access). It passed because a freshly-created local
 * `service_role` role has no inherited default privileges — but the REAL
 * project's `service_role` does, because `alter default privileges in schema
 * public grant select, insert, update, delete on tables to service_role;`
 * was run against it on 2026-08-26 to unblock the progression migration.
 * §0b below reproduces that exact grant, in this local database, BEFORE the
 * economy migration is applied — so a passing "service_role cannot mutate
 * directly" check here means something, instead of being an artifact of a
 * clean-room test environment.
 *
 * ── What it can and cannot establish ────────────────────────────────────
 * CAN:    migration cleanliness, re-runnability, rollback (including against
 *         a database with real transaction history), schema integrity,
 *         constraint enforcement, function privilege grants under a
 *         production-like starting privilege state, the atomic functions'
 *         own logic under real concurrency, the idempotency response
 *         contract, frozen-wallet enforcement, revenue/escrow separation.
 * CANNOT: that the server (EconomyRepository, not built) calls these
 *         functions correctly via PostgREST's rpc(), or that a real
 *         Supabase project's auth schema behaves identically to the local
 *         stub. Both remain a separate exercise once that code exists.
 *
 * Usage:  node scripts/economy/verifyEconomySchema.mjs
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
const MIGRATION = path.join(ROOT, "supabase/migrations/20260826000000_economy_v1.sql");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20260826000000_economy_v1_rollback.sql");
const RECEIPT = path.join(ROOT, "docs/remediation/economy-v1-schema-verification.json");

const PORT = Number(process.env.VERIFY_ECONOMY_PG_PORT) || 55435;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-economy-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  results.push({ section, name, passed, evidence: String(evidence).slice(0, 500) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;
const matchId = () => `m_VERIFY_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
/** A well-formed 64-hex-char stand-in for a SHA-256/HMAC-SHA256 digest — the
 * migration only ever validates SHAPE, never entropy (that's future server
 * code's job), so a deterministic test hash is fine here. */
const fakeHash = () => crypto.createHash("sha256").update(crypto.randomBytes(20)).digest("hex");

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function main() {
  console.log("\n========================================================");
  console.log("  BHALYAM Economy V1 Schema Verification — Remediation Pass ");
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

  const db = await connect();
  const version = (await db.query("select version()")).rows[0].version;
  console.log(`Engine: ${version.split(",")[0]}\n`);

  /** A service_role connection, for the privilege-boundary tests. Postgres
   * lets a superuser session (this `postgres` connection) SET ROLE to any
   * role without a password — that's what lets these queries genuinely run
   * AS service_role, not merely as postgres pretending. */
  async function asServiceRole(sql, params = []) {
    const c = await connect();
    try {
      await c.query("set role service_role");
      return await c.query(sql, params);
    } finally {
      await c.query("reset role").catch(() => undefined);
      await c.end();
    }
  }

  try {
    /* ═════════ 0. Connectivity, auth stub, prerequisite migration ═════════ */
    console.log("0. Connectivity and prerequisites");
    check("setup", "database reachable and answering queries", true, version.split(",")[0]);
    await db.query(AUTH_STUB);
    check("setup", "Supabase auth.users / auth.uid() stubs created", true, "local stand-ins only");

    await db.query(fs.readFileSync(PROGRESSION_MIGRATION, "utf8"));
    check("setup", "prerequisite progression migration applies (player_identities exists)", true);

    /* ── 0b. Reproduce the REAL project's inherited default privilege ──── */
    await db.query(`grant usage on schema public to service_role;`);
    await db.query(`grant select, insert, update, delete on all tables in schema public to service_role;`);
    await db.query(`alter default privileges in schema public grant select, insert, update, delete on tables to service_role;`);
    check("setup", "production-like default privilege reproduced BEFORE applying the economy migration",
      true, "mirrors the exact ALTER DEFAULT PRIVILEGES already run against the real project on 2026-08-26");

    /* ═════════ 1. Migration ═════════ */
    console.log("\n1. Migration execution");
    const migrationSql = fs.readFileSync(MIGRATION, "utf8");

    let firstRunError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      firstRunError = err;
    }
    check("migration", "Economy V1 migration applies cleanly despite the pre-existing default privilege",
      firstRunError === null, firstRunError ? firstRunError.message : "no errors");
    if (firstRunError) throw firstRunError;

    let secondRunError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      secondRunError = err;
    }
    check("migration", "Economy V1 migration is idempotent (re-runnable)", secondRunError === null,
      secondRunError ? secondRunError.message : "second apply changed nothing");

    /* ═════════ 2. Schema integrity ═════════ */
    console.log("\n2. Schema integrity");
    const EXPECTED_TABLES = [
      "economy_configurations", "economy_prize_schedules", "world_bank_accounts", "world_bank_ledger",
      "coin_wallets", "coin_ledger_entries", "reward_vouchers", "match_economy_settlements", "match_economy_participants",
    ];
    const tables = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    )).rows.map((r) => r.table_name);
    const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
    check("schema", `all ${EXPECTED_TABLES.length} Economy V1 tables exist`, missing.length === 0,
      missing.length ? `missing: ${missing.join(", ")}` : `${EXPECTED_TABLES.length} present`);

    const worldBank = (await db.query(`select * from world_bank_accounts`)).rows;
    check("schema", "world_bank_accounts is a true singleton with four separate balances",
      worldBank.length === 1 && "base_fee_revenue" in worldBank[0] && "bot_prize_revenue" in worldBank[0]
        && "guest_escrow_liability" in worldBank[0] && "total_voucher_redeemed" in worldBank[0],
      JSON.stringify(worldBank[0]));

    const ledgerCols = (await db.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='coin_ledger_entries'`,
    )).rows.map((r) => r.column_name);
    check("schema", "coin_ledger_entries has balance_before, wallet_version_before, wallet_version_after",
      ["balance_before", "balance_after", "wallet_version_before", "wallet_version_after"].every((c) => ledgerCols.includes(c)),
      ledgerCols.join(", "));
    check("schema", "coin_ledger_entries.entry_type no longer includes GUEST_PRIZE_ESCROW",
      !(await db.query(
        `select 1 from information_schema.check_constraints cc
         join information_schema.constraint_column_usage ccu on ccu.constraint_name = cc.constraint_name
         where ccu.table_name = 'coin_ledger_entries' and cc.check_clause like '%GUEST_PRIZE_ESCROW%'`,
      )).rowCount, "GUEST_PRIZE_ESCROW removed from the wallet ledger's entry_type enum");

    /* ═════════ 2a. ensure_wallet requires a pre-existing identity (Correction 4) ═════════ */
    console.log("\n2a. ensure_wallet requires a pre-existing player_identities row");
    const neverRegisteredGuest = guestId(); // deliberately NOT inserted into player_identities
    let unregisteredGuestError = null;
    try {
      await db.query(`select ensure_wallet($1)`, [neverRegisteredGuest]);
    } catch (err) {
      unregisteredGuestError = err;
    }
    check("identity-provisioning", "ensure_wallet REJECTS a guest-shaped identity_id with no player_identities row, rather than silently creating one",
      unregisteredGuestError?.message?.includes("IDENTITY_NOT_FOUND"), unregisteredGuestError?.message ?? "did not reject — auto-provisioned instead");
    const guestRowCreated = (await db.query(`select 1 from player_identities where player_id=$1`, [neverRegisteredGuest])).rowCount;
    check("identity-provisioning", "no player_identities row was created as a side effect of the rejected call",
      guestRowCreated === 0, `rowCount=${guestRowCreated}`);

    const neverRegisteredMember = crypto.randomUUID();
    let unregisteredMemberError = null;
    try {
      await db.query(`select ensure_wallet($1)`, [neverRegisteredMember]);
    } catch (err) {
      unregisteredMemberError = err;
    }
    check("identity-provisioning", "ensure_wallet REJECTS a non-guest-shaped identity_id with no player_identities row the same way",
      unregisteredMemberError?.message?.includes("IDENTITY_NOT_FOUND"), unregisteredMemberError?.message ?? "did not reject");

    /* ═════════ 3. Privilege boundary (audit B1/B2) ═════════ */
    console.log("\n3. Privilege boundary — direct service-role mutation must fail");

    const HOST = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [HOST]);
    await db.query(`select ensure_wallet($1)`, [HOST]);

    async function expectServiceRoleDenied(label, sql, params = []) {
      try {
        await asServiceRole(sql, params);
        check("privileges", label, false, "service_role's direct write SUCCEEDED — should have been denied");
      } catch (err) {
        check("privileges", label, /permission denied/i.test(err.message), err.message);
      }
    }

    await expectServiceRoleDenied(
      "service_role cannot UPDATE coin_wallets.balance directly",
      `update coin_wallets set balance = balance + 999999 where identity_id = $1`, [HOST],
    );
    await expectServiceRoleDenied(
      "service_role cannot INSERT into coin_ledger_entries directly",
      `insert into coin_ledger_entries (wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after, entry_type, source_kind, source_id, idempotency_key, description)
       values ($1, 100, 0, 100, 0, 1, 'ADMIN_ADJUSTMENT', 'fraud', 'x', 'forged-key', 'forged row')`, [HOST],
    );
    await expectServiceRoleDenied(
      "service_role cannot UPDATE match_economy_settlements directly",
      `update match_economy_settlements set status = 'SETTLED' where match_id = 'nonexistent'`,
    );
    await expectServiceRoleDenied(
      "service_role cannot INSERT into reward_vouchers directly",
      `insert into reward_vouchers (id, code_hash, coin_amount, match_id, issued_to_guest_id, status)
       values ('vch_forged', $1, 999, 'm_forged', $2, 'ACTIVE')`, [fakeHash(), HOST],
    );
    await expectServiceRoleDenied(
      "service_role cannot UPDATE world_bank_accounts directly",
      `update world_bank_accounts set base_fee_revenue = base_fee_revenue + 999999 where id = 'primary'`,
    );

    const walletUnchanged = (await db.query(`select balance from coin_wallets where identity_id=$1`, [HOST])).rows[0].balance;
    check("privileges", "no forged mutation actually reached the wallet balance", walletUnchanged === "2000", `balance=${walletUnchanged}`);

    // HOST is a guest, so this correctly hits ONLY_MEMBERS_CAN_REDEEM_VOUCHERS
    // before ever reaching the voucher lookup — the point of this check is
    // only that service_role reaches the function's OWN business logic at
    // all, not which specific business rule fires first. A raw Postgres
    // "permission denied" would mean the EXECUTE grant itself is broken;
    // anything else means the RPC path works.
    let rpcStillWorks = null;
    try {
      rpcStillWorks = (await asServiceRole(`select redeem_reward_voucher($1, $2) as r`, [fakeHash(), HOST])).rows;
    } catch (err) {
      rpcStillWorks = err.message;
    }
    check("privileges", "service_role CAN still call approved RPC functions (business-logic error, not a permission error)",
      typeof rpcStillWorks === "string" && !/permission denied/i.test(rpcStillWorks)
        && /ONLY_MEMBERS_CAN_REDEEM_VOUCHERS|VOUCHER_NOT_FOUND/.test(rpcStillWorks),
      String(rpcStillWorks));

    const ECONOMY_FUNCTIONS = [
      "ensure_wallet", "grant_starter_coins", "commit_match_entry", "settle_match_economy",
      "refund_match_entry", "issue_guest_voucher", "redeem_reward_voucher",
      "reconcile_match_settlement", "list_stale_committed_settlements",
    ];
    async function canExecute(role, fn) {
      const r = await db.query(
        `select bool_or(has_function_privilege($1, p.oid, 'EXECUTE')) as ok
         from pg_proc p where p.proname=$2 and p.pronamespace='public'::regnamespace`,
        [role, fn],
      );
      return r.rows[0]?.ok === true;
    }
    let clientCallable = [];
    let serviceRoleBlocked = [];
    for (const fn of ECONOMY_FUNCTIONS) {
      const [anonOk, authOk, serviceOk] = await Promise.all([canExecute("anon", fn), canExecute("authenticated", fn), canExecute("service_role", fn)]);
      if (anonOk || authOk) clientCallable.push(fn);
      if (!serviceOk) serviceRoleBlocked.push(fn);
    }
    check("privileges", "no economy function is EXECUTE-able by anon or authenticated", clientCallable.length === 0,
      clientCallable.length ? `callable: ${clientCallable.join(", ")}` : "all blocked");
    check("privileges", "every top-level economy function grants EXECUTE to service_role", serviceRoleBlocked.length === 0,
      serviceRoleBlocked.length ? `missing grant: ${serviceRoleBlocked.join(", ")}` : "all granted");

    const internalCallable = await Promise.all([canExecute("service_role", "economy_apply_refund"), canExecute("service_role", "prevent_ledger_mutation")]);
    check("privileges", "internal-only helpers (economy_apply_refund, prevent_ledger_mutation) are not directly callable, even by service_role",
      internalCallable.every((ok) => ok === false), JSON.stringify(internalCallable));

    /* ═════════ 4. Ledger balance-transition invariants ═════════ */
    console.log("\n4. Ledger balance-transition invariants");
    let badLedgerRowRejected = null;
    try {
      await db.query(
        `insert into coin_ledger_entries (wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after, entry_type, source_kind, source_id, idempotency_key, description)
         values ($1, 100, 0, 999, 0, 1, 'ADMIN_ADJUSTMENT', 'test', 'x', $2, 'deliberately wrong arithmetic')`,
        [HOST, `bad-${crypto.randomBytes(4).toString("hex")}`],
      );
    } catch (err) {
      badLedgerRowRejected = err;
    }
    check("ledger", "a ledger row whose balance_after != balance_before + amount is rejected by the CHECK constraint",
      badLedgerRowRejected?.code === "23514", badLedgerRowRejected?.message ?? "was NOT rejected");

    let badVersionRowRejected = null;
    try {
      await db.query(
        `insert into coin_ledger_entries (wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after, entry_type, source_kind, source_id, idempotency_key, description)
         values ($1, 100, 0, 100, 0, 5, 'ADMIN_ADJUSTMENT', 'test', 'x', $2, 'deliberately wrong version jump')`,
        [HOST, `bad-version-${crypto.randomBytes(4).toString("hex")}`],
      );
    } catch (err) {
      badVersionRowRejected = err;
    }
    check("ledger", "a ledger row whose wallet_version_after != wallet_version_before + 1 is rejected",
      badVersionRowRejected?.code === "23514", badVersionRowRejected?.message ?? "was NOT rejected");

    /* ═════════ 5. Idempotency response contract ═════════ */
    console.log("\n5. Idempotency response contract");
    const grantReplay = (await db.query(`select grant_starter_coins($1) as r`, [HOST])).rows[0].r;
    check("idempotency", "grant_starter_coins replay returns applied=false with the ORIGINAL result, not a bare row",
      grantReplay.applied === false && grantReplay.operation === "grant_starter_coins" && typeof grantReplay.idempotencyKey === "string"
        && grantReplay.result?.identity_id === HOST,
      JSON.stringify(grantReplay));

    const m1 = matchId();
    const commit1 = (await db.query(`select commit_match_entry($1, 'ROOM1', $2, 5, 4, 1, false) as r`, [m1, HOST])).rows[0].r;
    check("idempotency", "commit_match_entry returns {applied:true, operation, idempotencyKey, result}",
      commit1.applied === true && commit1.operation === "commit_match_entry" && commit1.idempotencyKey === `match-entry:${m1}`
        && commit1.result?.status === "COMMITTED",
      JSON.stringify(commit1));
    const commit1Replay = (await db.query(`select commit_match_entry($1, 'ROOM1', $2, 5, 4, 1, false) as r`, [m1, HOST])).rows[0].r;
    check("idempotency", "commit_match_entry replay returns applied=false, no second debit",
      commit1Replay.applied === false && commit1Replay.result?.match_id === m1, JSON.stringify(commit1Replay));
    const balanceAfterReplay = (await db.query(`select balance from coin_wallets where identity_id=$1`, [HOST])).rows[0].balance;
    check("idempotency", "host balance unchanged by the commit replay (2000 - 500 = 1500)", balanceAfterReplay === "1500", `balance=${balanceAfterReplay}`);

    /* ═════════ 6. Settlement: revenue / escrow / bot-collection separation ═════════ */
    console.log("\n6. Settlement — World Bank revenue/escrow/bot-collection separation");
    const MEMBER = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [MEMBER, "verify@example.com"]);
    await db.query(`insert into player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [MEMBER, MEMBER]);
    const GUEST_WINNER = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [GUEST_WINNER]);
    const voucherHash1 = fakeHash();

    const settle1 = (await db.query(
      `select settle_match_economy($1, true, $2::jsonb) as r`,
      [m1, JSON.stringify([
        { identityId: MEMBER, identityKind: "member", placement: 1 },
        { identityId: GUEST_WINNER, identityKind: "guest", placement: 2, voucherCodeHash: voucherHash1 },
        { identityId: "bot_seat_3", identityKind: "bot", placement: 3 },
      ])],
    )).rows[0].r;
    check("settlement", "settle_match_economy returns applied=true with the standardized contract",
      settle1.applied === true && settle1.operation === "settle_match_economy" && settle1.result?.status === "SETTLED",
      JSON.stringify(settle1));
    // m1 was committed as a 5-seat match, so the 5-seat schedule applies:
    // 1st=200, 2nd=150, 3rd=100, world bank=50 (total 500). Values here come
    // through settlement_to_safe_jsonb() (bigint transport remediation,
    // §11a of the migration), which explicitly casts every bigint field to
    // text — so these are now genuinely STRINGS, matching a direct `select`
    // via node-postgres exactly, and matching every OTHER bigint value this
    // whole script already asserts as a string. Before the remediation this
    // came through raw to_jsonb(row), which mapped bigint columns to JSON
    // NUMBERS instead — that asymmetry is exactly what this migration
    // change closes.
    check("settlement", "member winner credited 200, guest escrowed 150, bot collection 100, base cut 50",
      settle1.result.total_wallet_rewarded === "200" && settle1.result.total_guest_escrow === "150"
        && settle1.result.total_bot_collection === "100" && settle1.result.total_world_bank_cut === "50",
      JSON.stringify(settle1.result));

    const guestWalletBalance = (await db.query(`select balance from coin_wallets where identity_id=$1`, [GUEST_WINNER])).rows[0]?.balance ?? null;
    check("settlement", "guest winner's wallet balance was NOT touched (no wallet ledger row for a guest prize)",
      guestWalletBalance === null || guestWalletBalance === "0", `balance=${guestWalletBalance}`);
    const guestLedgerRows = (await db.query(`select count(*)::int n from coin_ledger_entries where wallet_id=$1`, [GUEST_WINNER])).rows[0].n;
    check("settlement", "coin_ledger_entries has ZERO rows for the guest's prize (Phase 2: wallet ledger represents wallet mutations only)",
      guestLedgerRows === 0, `${guestLedgerRows} row(s)`);

    const wb2 = (await db.query(`select base_fee_revenue, bot_prize_revenue, guest_escrow_liability, total_voucher_redeemed from world_bank_accounts`)).rows[0];
    check("settlement", "World Bank's three earned/liability balances are independently correct after settlement",
      wb2.base_fee_revenue === "50" && wb2.bot_prize_revenue === "100" && wb2.guest_escrow_liability === "150" && wb2.total_voucher_redeemed === "0",
      JSON.stringify(wb2));

    const wbLedgerTypes = (await db.query(`select entry_type from world_bank_ledger where source_id=$1 order by id`, [m1])).rows.map((r) => r.entry_type);
    check("settlement", "world_bank_ledger uses BASE_FEE_REVENUE, GUEST_ESCROW_DEPOSIT, and BOT_PRIZE_REVENUE as distinct entry types (never merged)",
      wbLedgerTypes.includes("BASE_FEE_REVENUE") && wbLedgerTypes.includes("GUEST_ESCROW_DEPOSIT") && wbLedgerTypes.includes("BOT_PRIZE_REVENUE"),
      wbLedgerTypes.join(", "));

    /* ═════════ 7. Solo session uses its dedicated ledger type ═════════ */
    console.log("\n7. Solo entry ledger type");
    const soloHost = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [soloHost]);
    await db.query(`select ensure_wallet($1)`, [soloHost]);
    const mSolo = matchId();
    await db.query(`select commit_match_entry($1, null, $2, 1, 1, 0, true)`, [mSolo, soloHost]);
    const soloSettle = (await db.query(`select settle_match_economy($1, true, '[]'::jsonb) as r`, [mSolo])).rows[0].r;
    const soloLedgerType = (await db.query(`select entry_type from world_bank_ledger where source_id=$1`, [mSolo])).rows[0]?.entry_type;
    check("solo", "a 1-seat (solo) settlement tags its World Bank collection SOLO_ENTRY_COLLECTION, not BASE_FEE_REVENUE",
      soloLedgerType === "SOLO_ENTRY_COLLECTION", `entry_type=${soloLedgerType}, applied=${soloSettle.applied}`);

    /* ═════════ 8. Invalid/tied ranking causes refund from inside settle_match_economy ═════════ */
    console.log("\n8. Invalid ranking -> refund (audit finding M6)");
    const m3 = matchId();
    const hostForRefund = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [hostForRefund]);
    await db.query(`select ensure_wallet($1)`, [hostForRefund]);
    await db.query(`select commit_match_entry($1, 'ROOM3', $2, 5, 4, 1, false)`, [m3, hostForRefund]);
    const balanceBeforeInvalid = (await db.query(`select balance from coin_wallets where identity_id=$1`, [hostForRefund])).rows[0].balance;
    const invalidRankingResult = (await db.query(
      `select settle_match_economy($1, false, '[]'::jsonb, $2) as r`, [m3, "Tied placements, no valid ranking"],
    )).rows[0].r;
    check("refund", "settle_match_economy(is_valid_ranking=false) refunds internally, without a separate caller-side detection step",
      invalidRankingResult.applied === true && invalidRankingResult.operation === "refund_match_entry"
        && invalidRankingResult.result?.status === "REFUNDED" && invalidRankingResult.result?.refund_reason === "Tied placements, no valid ranking",
      JSON.stringify(invalidRankingResult));
    const balanceAfterInvalid = (await db.query(`select balance from coin_wallets where identity_id=$1`, [hostForRefund])).rows[0].balance;
    check("refund", "host balance fully restored", balanceAfterInvalid === (Number(balanceBeforeInvalid) + 500).toString(), `${balanceBeforeInvalid} -> ${balanceAfterInvalid}`);

    /* ═════════ 9. lifetime_spent never decreases; refunds tracked separately ═════════ */
    console.log("\n9. lifetime_spent / lifetime_refunded separation (Phase 12)");
    const lifetimeCols = (await db.query(`select lifetime_spent, lifetime_refunded from coin_wallets where identity_id=$1`, [hostForRefund])).rows[0];
    check("wallet", "lifetime_spent still reflects the original spend (500), NOT decremented by the refund",
      lifetimeCols.lifetime_spent === "500", JSON.stringify(lifetimeCols));
    check("wallet", "lifetime_refunded tracks the refund separately (500)", lifetimeCols.lifetime_refunded === "500", JSON.stringify(lifetimeCols));

    /* ═════════ 10. Frozen-wallet enforcement ═════════ */
    console.log("\n10. Frozen-wallet enforcement");
    const frozenHost = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [frozenHost]);
    await db.query(`select ensure_wallet($1)`, [frozenHost]);
    await db.query(`update coin_wallets set is_frozen = true where identity_id = $1`, [frozenHost]);

    let frozenCommitError = null;
    try {
      await db.query(`select commit_match_entry($1, 'ROOM_F', $2, 1, 1, 0, true)`, [matchId(), frozenHost]);
    } catch (err) {
      frozenCommitError = err;
    }
    check("frozen", "a frozen wallet CANNOT commit a match entry (spend)", frozenCommitError?.message?.includes("WALLET_FROZEN"), frozenCommitError?.message ?? "did not reject");

    const frozenMemberId = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [frozenMemberId, "frozen@example.com"]);
    await db.query(`insert into player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [frozenMemberId, frozenMemberId]);
    await db.query(`select ensure_wallet($1)`, [frozenMemberId]);

    // Issue a REAL, redeemable voucher first (a guest winner, not a bot —
    // the earlier draft of this test never actually created a voucher, so it
    // could only ever prove "redeeming a nonexistent voucher fails," which is
    // true regardless of frozen status and isn't a meaningful test of the
    // frozen-wallet rule specifically).
    const guestForFrozenTest = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [guestForFrozenTest]);
    const mFrozenVoucher = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_FV', $2, 2, 1, 1, false)`, [mFrozenVoucher, HOST]);
    const frozenVoucherHash = fakeHash();
    const issuedForFrozenTest = (await db.query(
      `select settle_match_economy($1, true, $2::jsonb) as r`,
      [mFrozenVoucher, JSON.stringify([{ identityId: guestForFrozenTest, identityKind: "guest", placement: 1, voucherCodeHash: frozenVoucherHash }])],
    )).rows[0].r;
    check("frozen", "setup: a real voucher was issued for the frozen-redemption test", issuedForFrozenTest.applied === true, JSON.stringify(issuedForFrozenTest));

    // NOW freeze the member and attempt to redeem the REAL voucher.
    await db.query(`update coin_wallets set is_frozen = true where identity_id = $1`, [frozenMemberId]);
    let frozenRedeemError = null;
    try {
      await db.query(`select redeem_reward_voucher($1, $2)`, [frozenVoucherHash, frozenMemberId]);
    } catch (err) {
      frozenRedeemError = err;
    }
    check("frozen", "a frozen wallet CANNOT redeem a voucher that would otherwise be perfectly valid",
      frozenRedeemError?.message?.includes("WALLET_FROZEN"), frozenRedeemError?.message ?? "did not reject");
    const voucherStillActive = (await db.query(`select status from reward_vouchers where code_hash=$1`, [frozenVoucherHash])).rows[0]?.status;
    check("frozen", "the voucher itself remains ACTIVE — the frozen rejection did not partially consume it",
      voucherStillActive === "ACTIVE", `status=${voucherStillActive}`);

    // Frozen wallet MAY still receive a match reward and a refund.
    const mFrozenReward = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_FR', $2, 2, 1, 1, false)`, [mFrozenReward, HOST]);
    const rewardToFrozen = (await db.query(
      `select settle_match_economy($1, true, $2::jsonb) as r`,
      [mFrozenReward, JSON.stringify([{ identityId: frozenMemberId, identityKind: "member", placement: 1 }])],
    )).rows[0].r;
    check("frozen", "a frozen wallet MAY still receive a match reward (settle_match_economy does not check is_frozen for credits)",
      rewardToFrozen.applied === true && rewardToFrozen.result?.status === "SETTLED", JSON.stringify(rewardToFrozen));

    const mFrozenRefund = matchId();
    await db.query(`update coin_wallets set is_frozen = false where identity_id = $1`, [frozenHost]);
    await db.query(`select commit_match_entry($1, 'ROOM_FRF', $2, 1, 1, 0, true)`, [mFrozenRefund, frozenHost]);
    await db.query(`update coin_wallets set is_frozen = true where identity_id = $1`, [frozenHost]);
    const refundToFrozen = (await db.query(`select refund_match_entry($1, 'test') as r`, [mFrozenRefund])).rows[0].r;
    check("frozen", "a frozen wallet MAY still receive a refund", refundToFrozen.applied === true && refundToFrozen.result?.status === "REFUNDED", JSON.stringify(refundToFrozen));

    /* ═════════ 11. Voucher collision rejection ═════════ */
    console.log("\n11. Voucher collision rejection (Phase 7)");
    const collisionHash = fakeHash();
    const mv1 = matchId();
    await db.query(`select commit_match_entry($1, 'ROOMV1', $2, 2, 1, 1, false)`, [mv1, HOST]);
    const guestA = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [guestA]);
    const issue1 = (await db.query(
      `select settle_match_economy($1, true, $2::jsonb) as r`,
      [mv1, JSON.stringify([{ identityId: guestA, identityKind: "guest", placement: 1, voucherCodeHash: collisionHash }])],
    )).rows[0].r;
    check("vouchers", "first voucher with a fresh code_hash issues successfully", issue1.applied === true, JSON.stringify(issue1));

    const mv2 = matchId();
    await db.query(`select commit_match_entry($1, 'ROOMV2', $2, 2, 1, 1, false)`, [mv2, HOST]);
    const guestB = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [guestB]);
    let collisionError = null;
    try {
      await db.query(
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mv2, JSON.stringify([{ identityId: guestB, identityKind: "guest", placement: 1, voucherCodeHash: collisionHash }])],
      );
    } catch (err) {
      collisionError = err;
    }
    check("vouchers", "a SECOND voucher reusing the same code_hash is a hard failure (unique violation), never a silent update",
      collisionError?.code === "23505", collisionError?.message ?? "did NOT fail — collision was silently accepted");
    const voucherStillOwnedByFirstGuest = (await db.query(`select issued_to_guest_id from reward_vouchers where code_hash=$1`, [collisionHash])).rows[0]?.issued_to_guest_id;
    check("vouchers", "the original voucher row is untouched by the failed collision attempt", voucherStillOwnedByFirstGuest === guestA, `owner=${voucherStillOwnedByFirstGuest}`);

    let malformedHashError = null;
    try {
      await db.query(`select issue_guest_voucher('vch_bad', 'not-a-real-hash', 100, 'm_bad', $1)`, [HOST]);
    } catch (err) {
      malformedHashError = err;
    }
    check("vouchers", "a malformed (non-64-hex) code_hash is rejected", malformedHashError?.message?.includes("INVALID_VOUCHER_HASH"), malformedHashError?.message ?? "did not reject");

    /* ═════════ 11a. Invalid participant inputs & full-transaction rollback (Corrections 2/3) ═════════ */
    console.log("\n11a. Invalid member/guest/bot/unknown participant inputs; settlement failure rolls back completely");

    // Dedicated host for this section, funded well past the sum of every
    // commit below (5 x 200 + 1 x 300 = 1300 of 2000), so these checks never
    // depend on — or perturb — HOST's running balance from earlier sections.
    const invalidParticipantHost = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [invalidParticipantHost]);
    await db.query(`select ensure_wallet($1)`, [invalidParticipantHost]);

    // ── Invalid MEMBER participant: identityId with no player_identities row.
    // ensure_wallet now rejects this (Correction 4) instead of silently
    // provisioning it, so this exercises Corrections 2 and 4 together.
    const mBadMember = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_BADM', $2, 2, 1, 1, false)`, [mBadMember, invalidParticipantHost]);
    const nonexistentMember = crypto.randomUUID();
    let badMemberError = null;
    try {
      await db.query(
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mBadMember, JSON.stringify([{ identityId: nonexistentMember, identityKind: "member", placement: 1 }])],
      );
    } catch (err) {
      badMemberError = err;
    }
    check("invalid-participants", "a member participant whose identityId has no player_identities row is rejected (IDENTITY_NOT_FOUND), not silently provisioned",
      badMemberError?.message?.includes("IDENTITY_NOT_FOUND"), badMemberError?.message ?? "did not reject");
    const badMemberSettlementStatus = (await db.query(`select status from match_economy_settlements where match_id=$1`, [mBadMember])).rows[0]?.status;
    check("invalid-participants", "the settlement for the rejected member input remains COMMITTED, not partially SETTLED",
      badMemberSettlementStatus === "COMMITTED", `status=${badMemberSettlementStatus}`);

    // ── Invalid GUEST participant: identityId with no player_identities row.
    // The guest branch doesn't call ensure_wallet, but issue_guest_voucher's
    // insert into reward_vouchers still requires the FK target to exist —
    // this proves the guest path is equally guarded, just by a different
    // mechanism (a real foreign key, not an application check).
    const mBadGuest = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_BADG', $2, 2, 1, 1, false)`, [mBadGuest, invalidParticipantHost]);
    const nonexistentGuest = guestId();
    let badGuestError = null;
    try {
      await db.query(
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mBadGuest, JSON.stringify([{ identityId: nonexistentGuest, identityKind: "guest", placement: 1, voucherCodeHash: fakeHash() }])],
      );
    } catch (err) {
      badGuestError = err;
    }
    check("invalid-participants", "a guest participant whose identityId has no player_identities row is rejected (foreign key violation on reward_vouchers)",
      badGuestError?.code === "23503", badGuestError?.message ?? "did not reject");

    // ── Invalid BOT participant: placement outside the 1-5 range allowed by
    // match_economy_participants' own CHECK constraint.
    const mBadBot = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_BADB', $2, 2, 1, 1, false)`, [mBadBot, invalidParticipantHost]);
    let badBotError = null;
    try {
      await db.query(
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mBadBot, JSON.stringify([{ identityId: "bot_seat_x", identityKind: "bot", placement: 99 }])],
      );
    } catch (err) {
      badBotError = err;
    }
    check("invalid-participants", "a bot participant with an out-of-range placement (99) is rejected by match_economy_participants' own CHECK constraint",
      badBotError?.code === "23514", badBotError?.message ?? "did not reject");

    // ── Invalid/UNKNOWN identityKind — the Correction 1 fix itself.
    const mBadKind = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_BADK', $2, 2, 1, 1, false)`, [mBadKind, invalidParticipantHost]);
    let badKindError = null;
    try {
      await db.query(
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mBadKind, JSON.stringify([{ identityId: "whatever", identityKind: "alien", placement: 1 }])],
      );
    } catch (err) {
      badKindError = err;
    }
    check("invalid-participants", "[Correction 1] a participant with an unrecognized identityKind ('alien') is rejected with INVALID_IDENTITY_KIND, not silently skipped",
      badKindError?.message?.includes("INVALID_IDENTITY_KIND"), badKindError?.message ?? "did not reject");

    // ── Correction 3: a settlement that fails PARTWAY through a multi-
    // participant array must roll back in full — the valid member credited
    // BEFORE the invalid participant is reached must NOT keep its credit.
    const mPartial = matchId();
    await db.query(`select commit_match_entry($1, 'ROOM_PARTIAL', $2, 3, 2, 1, false)`, [mPartial, invalidParticipantHost]);
    const partialMember = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [partialMember, "partial@example.com"]);
    await db.query(`insert into player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [partialMember, partialMember]);
    await db.query(`select ensure_wallet($1)`, [partialMember]);
    const partialMemberBalanceBefore = (await db.query(`select balance from coin_wallets where identity_id=$1`, [partialMember])).rows[0].balance;
    const partialLedgerCountBefore = (await db.query(`select count(*)::int n from coin_ledger_entries where wallet_id=$1`, [partialMember])).rows[0].n;

    let partialError = null;
    try {
      await db.query(
        // First participant (1st place, a valid member) would be credited
        // BEFORE the loop reaches the second, invalid ('alien') participant.
        `select settle_match_economy($1, true, $2::jsonb)`,
        [mPartial, JSON.stringify([
          { identityId: partialMember, identityKind: "member", placement: 1 },
          { identityId: "whatever", identityKind: "alien", placement: 2 },
        ])],
      );
    } catch (err) {
      partialError = err;
    }
    check("invalid-participants", "[Correction 3] the failing settlement call itself raises INVALID_IDENTITY_KIND (setup for the rollback assertions below)",
      partialError?.message?.includes("INVALID_IDENTITY_KIND"), partialError?.message ?? "did not reject");

    const partialMemberBalanceAfter = (await db.query(`select balance from coin_wallets where identity_id=$1`, [partialMember])).rows[0].balance;
    check("invalid-participants", "[Correction 3] the FIRST (valid) participant's wallet credit was rolled back — balance unchanged despite being processed before the failure",
      partialMemberBalanceAfter === partialMemberBalanceBefore, `before=${partialMemberBalanceBefore}, after=${partialMemberBalanceAfter}`);

    const partialLedgerCountAfter = (await db.query(`select count(*)::int n from coin_ledger_entries where wallet_id=$1`, [partialMember])).rows[0].n;
    check("invalid-participants", "[Correction 3] no coin_ledger_entries row was left behind for the rolled-back credit",
      partialLedgerCountAfter === partialLedgerCountBefore, `before=${partialLedgerCountBefore}, after=${partialLedgerCountAfter}`);

    const partialParticipantRows = (await db.query(`select count(*)::int n from match_economy_participants where match_id=$1`, [mPartial])).rows[0].n;
    check("invalid-participants", "[Correction 3] no match_economy_participants rows exist for the failed settlement — not even for the valid participant processed first",
      partialParticipantRows === 0, `${partialParticipantRows} row(s)`);

    const partialSettlementStatus = (await db.query(`select status, total_wallet_rewarded from match_economy_settlements where match_id=$1`, [mPartial])).rows[0];
    check("invalid-participants", "[Correction 3] the settlement itself remains COMMITTED with zero disbursed, as if settlement was never attempted",
      partialSettlementStatus.status === "COMMITTED" && partialSettlementStatus.total_wallet_rewarded === "0", JSON.stringify(partialSettlementStatus));

    /* ═════════ 12. Concurrency ═════════ */
    console.log("\n12. Concurrent operations — exactly one applied=true");
    const RACERS = 8;

    // 12a. Concurrent starter grants for a brand-new identity.
    const raceGrantId = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [raceGrantId]);
    const grantClients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    await Promise.all(grantClients.map((c) => c.query(`insert into coin_wallets (identity_id, identity_kind) values ($1, 'guest') on conflict do nothing`, [raceGrantId])));
    const grantOutcomes = await Promise.all(grantClients.map((c) => c.query(`select grant_starter_coins($1) as r`, [raceGrantId]).then((r) => r.rows[0].r.applied)));
    await Promise.all(grantClients.map((c) => c.end()));
    const grantAppliedCount = grantOutcomes.filter(Boolean).length;
    const finalGrantBalance = (await db.query(`select balance from coin_wallets where identity_id=$1`, [raceGrantId])).rows[0].balance;
    check("concurrency", `${RACERS} concurrent starter-grant calls: exactly one applied=true, balance credited once`,
      grantAppliedCount === 1 && finalGrantBalance === "2000", `${grantAppliedCount} applied, balance=${finalGrantBalance}`);

    // 12b. Concurrent commit_match_entry for the SAME match id.
    const raceCommitHost = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [raceCommitHost]);
    await db.query(`select ensure_wallet($1)`, [raceCommitHost]);
    const raceMatchId = matchId();
    const commitClients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    const commitOutcomes = await Promise.all(
      // 2 seats (200 total, 1st=150, world bank=50), not 5 — so the later
      // concurrent-settlement test (12c) can conserve the full 200 with a
      // SINGLE 1st-place participant, rather than needing to also supply
      // 2nd/3rd place entries just to satisfy the accounting identity.
      commitClients.map((c) => c.query(`select commit_match_entry($1, 'RACE', $2, 2, 1, 1, false) as r`, [raceMatchId, raceCommitHost]).then((r) => r.rows[0].r.applied)),
    );
    await Promise.all(commitClients.map((c) => c.end()));
    const commitAppliedCount = commitOutcomes.filter(Boolean).length;
    const finalCommitBalance = (await db.query(`select balance from coin_wallets where identity_id=$1`, [raceCommitHost])).rows[0].balance;
    check("concurrency", `${RACERS} concurrent commit_match_entry calls for the SAME match: exactly one applied=true, debited once (2000-200=1800)`,
      commitAppliedCount === 1 && finalCommitBalance === "1800", `${commitAppliedCount} applied, balance=${finalCommitBalance}`);

    // 12c. Concurrent settle_match_economy for the SAME match.
    const raceSettleGuest = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [raceSettleGuest]);
    const raceSettleHash = fakeHash();
    const settleClients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    const settleOutcomes = await Promise.all(
      settleClients.map((c) =>
        c.query(`select settle_match_economy($1, true, $2::jsonb) as r`, [raceMatchId, JSON.stringify([{ identityId: raceSettleGuest, identityKind: "guest", placement: 1, voucherCodeHash: raceSettleHash }])])
          .then((r) => r.rows[0].r.applied)
          .catch(() => "error"),
      ),
    );
    await Promise.all(settleClients.map((c) => c.end()));
    const settleAppliedCount = settleOutcomes.filter((o) => o === true).length;
    const voucherRowCount = (await db.query(`select count(*)::int n from reward_vouchers where code_hash=$1`, [raceSettleHash])).rows[0].n;
    check("concurrency", `${RACERS} concurrent settle_match_economy calls for the SAME match: exactly one applied=true, exactly one voucher issued`,
      settleAppliedCount === 1 && voucherRowCount === 1, `${settleAppliedCount} applied, ${voucherRowCount} voucher(s), outcomes=${JSON.stringify(settleOutcomes)}`);

    // 12d. Concurrent refund_match_entry for the SAME match.
    const raceRefundHost = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [raceRefundHost]);
    await db.query(`select ensure_wallet($1)`, [raceRefundHost]);
    const raceRefundMatch = matchId();
    await db.query(`select commit_match_entry($1, 'REFUNDRACE', $2, 1, 1, 0, true)`, [raceRefundMatch, raceRefundHost]);
    const refundClients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    const refundOutcomes = await Promise.all(
      refundClients.map((c) => c.query(`select refund_match_entry($1, 'race test') as r`, [raceRefundMatch]).then((r) => r.rows[0].r.applied)),
    );
    await Promise.all(refundClients.map((c) => c.end()));
    const refundAppliedCount = refundOutcomes.filter(Boolean).length;
    const finalRefundBalance = (await db.query(`select balance from coin_wallets where identity_id=$1`, [raceRefundHost])).rows[0].balance;
    check("concurrency", `${RACERS} concurrent refund_match_entry calls for the SAME match: exactly one applied=true, credited once`,
      refundAppliedCount === 1 && finalRefundBalance === "2000", `${refundAppliedCount} applied, balance=${finalRefundBalance}`);

    // 12e. Concurrent voucher redemption for the SAME voucher.
    const raceRedeemer = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [raceRedeemer, "racer@example.com"]);
    await db.query(`insert into player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [raceRedeemer, raceRedeemer]);
    const voucherAmount = Number((await db.query(`select coin_amount from reward_vouchers where code_hash=$1`, [raceSettleHash])).rows[0].coin_amount);
    const wbBeforeRedeem = (await db.query(`select guest_escrow_liability, total_voucher_redeemed from world_bank_accounts where id='primary'`)).rows[0];
    const redeemClients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    const redeemOutcomes = await Promise.all(
      redeemClients.map((c) => c.query(`select redeem_reward_voucher($1, $2) as r`, [raceSettleHash, raceRedeemer]).then((r) => r.rows[0].r.applied)),
    );
    await Promise.all(redeemClients.map((c) => c.end()));
    const redeemAppliedCount = redeemOutcomes.filter(Boolean).length;
    const finalRedeemerBalance = (await db.query(`select balance from coin_wallets where identity_id=$1`, [raceRedeemer])).rows[0].balance;
    check("concurrency", `${RACERS} concurrent redeem_reward_voucher calls for the SAME voucher: exactly one applied=true, credited once`,
      redeemAppliedCount === 1, `${redeemAppliedCount} applied, balance=${finalRedeemerBalance}`);

    // World Bank side of the SAME redemption above — previously only the
    // member wallet credit was independently asserted; the treasury-side
    // accounting (liability release, redemption counter) was exercised but
    // never itself checked. Closes that gap explicitly.
    const wbAfterRedeem = (await db.query(`select guest_escrow_liability, total_voucher_redeemed from world_bank_accounts where id='primary'`)).rows[0];
    const liabilityBefore = Number(wbBeforeRedeem.guest_escrow_liability);
    const liabilityAfter = Number(wbAfterRedeem.guest_escrow_liability);
    const redeemedBefore = Number(wbBeforeRedeem.total_voucher_redeemed);
    const redeemedAfter = Number(wbAfterRedeem.total_voucher_redeemed);
    check("settlement", "voucher redemption decreases guest_escrow_liability by EXACTLY the voucher amount, once, despite 8 concurrent attempts",
      liabilityBefore - liabilityAfter === voucherAmount,
      `before=${liabilityBefore}, after=${liabilityAfter}, voucherAmount=${voucherAmount}`);
    check("settlement", "voucher redemption increases total_voucher_redeemed by EXACTLY the voucher amount, once",
      redeemedAfter - redeemedBefore === voucherAmount,
      `before=${redeemedBefore}, after=${redeemedAfter}, voucherAmount=${voucherAmount}`);
    const redemptionLedgerRow = (await db.query(
      `select affected_balance, amount from world_bank_ledger where entry_type='GUEST_ESCROW_REDEMPTION' and source_id=$1`,
      [(await db.query(`select id from reward_vouchers where code_hash=$1`, [raceSettleHash])).rows[0].id],
    )).rows[0];
    check("settlement", "exactly one GUEST_ESCROW_REDEMPTION world_bank_ledger row exists, moving guest_escrow_liability by -voucherAmount",
      redemptionLedgerRow?.affected_balance === "guest_escrow_liability" && Number(redemptionLedgerRow?.amount) === -voucherAmount,
      JSON.stringify(redemptionLedgerRow));

    /* ═════════ 13. Identity deletion policy / anonymization compatibility ═════════ */
    console.log("\n13. Identity deletion policy (audit finding B3)");
    let deleteRejected = null;
    try {
      await db.query(`delete from player_identities where player_id=$1`, [HOST]);
    } catch (err) {
      deleteRejected = err;
    }
    check("identity", "a player_identities row with economy history CANNOT be physically deleted (RESTRICT, not CASCADE)",
      deleteRejected?.code === "23503", deleteRejected?.message ?? "delete SUCCEEDED — should have been restricted");

    const profileTableExists = (await db.query(`select 1 from information_schema.tables where table_name='player_profiles'`)).rowCount > 0;
    if (profileTableExists) {
      await db.query(`insert into player_profiles (player_id, display_name) values ($1, 'Verifier') on conflict (player_id) do nothing`, [HOST]);
      await db.query(`update player_profiles set display_name = 'Anonymized Player', avatar = null where player_id=$1`, [HOST]);
      const anonymized = (await db.query(`select display_name from player_profiles where player_id=$1`, [HOST])).rows[0];
      check("identity", "personal data (player_profiles.display_name) CAN still be anonymized while economy history remains intact and valid",
        anonymized?.display_name === "Anonymized Player", JSON.stringify(anonymized));
      const walletStillValid = (await db.query(`select balance from coin_wallets where identity_id=$1`, [HOST])).rows[0];
      check("identity", "the wallet/ledger FK reference to the (now-anonymized) identity is still valid — nothing broke",
        walletStillValid !== undefined, JSON.stringify(walletStillValid));
    } else {
      check("identity", "player_profiles anonymization compatibility", false, "player_profiles table not found — cannot verify");
    }

    /* ═════════ 14. Constraints ═════════ */
    console.log("\n14. Constraints");
    async function expectRejection(label, sql, params = []) {
      try {
        await db.query(sql, params);
        check("constraints", label, false, "ACCEPTED — the constraint did not hold");
      } catch (err) {
        check("constraints", label, true, `${err.code} ${err.constraint ?? ""}`.trim());
      }
    }
    await expectRejection("a negative balance is refused", `update coin_wallets set balance = -1 where identity_id = $1`, [HOST]);
    await expectRejection("balance drifting from lifetime_* counters is refused (coin_wallets_balance_reconciles)",
      `update coin_wallets set lifetime_earned = lifetime_earned + 999999 where identity_id = $1`, [HOST]);
    await expectRejection("a second world_bank_accounts row is refused (singleton)",
      `insert into world_bank_accounts (id) values ('secondary')`);

    /* ═════════ 14a. Bigint boundary-value serialization (text-cast transport remediation) ═════════ */
    console.log("\n14a. Bigint boundary-value serialization — exact digits in, exact digits out, beyond 2^53");
    // These prove Step 6 of the bigint transport remediation: for every
    // boundary value, the digits PostgreSQL stores are EXACTLY the digits
    // that cross the PostgREST-shaped boundary (the `::text` cast the
    // *_safe views and *_to_safe_jsonb() helpers use, §11a of the
    // migration) — no rounding, no scientific notation, no silent
    // corruption via IEEE-754 double parsing anywhere in the path.
    const BIGINT_MAX = "9223372036854775807";
    const BIGINT_MIN = "-9223372036854775808";
    const MAX_SAFE = String(Number.MAX_SAFE_INTEGER); // "9007199254740991"
    const MAX_SAFE_PLUS_1 = "9007199254740992";
    // The canonical proof that Number parsing corrupts values in this
    // range: 9007199254740993 (an odd number one above MAX_SAFE_INTEGER)
    // is not representable as a double and silently rounds to
    // 9007199254740992 when passed through Number(). If the migration's
    // views ever regressed to emitting bigint as a JSON number instead of
    // text, THIS is the exact kind of value that would silently corrupt.
    const UNSAFE_ODD = "9007199254740993";
    check("bigint-boundary", "sanity check: Number() truly corrupts the unsafe odd value above 2^53 (this is the bug the remediation closes)",
      String(Number(UNSAFE_ODD)) !== UNSAFE_ODD, `Number("${UNSAFE_ODD}") stringifies to "${String(Number(UNSAFE_ODD))}"`);

    // 14a-i. The cast expression itself — exactly what every *_safe view's
    // SELECT list does per bigint column (`col::text`) — is lossless for
    // every boundary value, independent of any table's own CHECK
    // constraints (some of which make certain absolute extremes
    // unconstructible in a real row; see 14a-ii/iii below).
    for (const value of ["0", "1", "-1", MAX_SAFE, MAX_SAFE_PLUS_1, UNSAFE_ODD, BIGINT_MAX, BIGINT_MIN]) {
      const { rows } = await db.query(`select $1::bigint::text as t`, [value]);
      check("bigint-boundary", `bigint::text cast round-trip is exact for ${value}`, rows[0].t === value, `in=${value}, out=${rows[0].t}`);
    }

    // 14a-ii. A real coin_wallets row at the exact bigint maximum, read back
    // through coin_wallets_safe — proves the view (not just the bare cast
    // expression) is lossless for a genuinely large wallet balance and a
    // genuinely large lifetime counter and version simultaneously.
    const boundaryWalletId = guestId();
    await db.query(`insert into player_identities (player_id, kind) values ($1, 'guest')`, [boundaryWalletId]);
    await db.query(
      `insert into coin_wallets (identity_id, identity_kind, balance, version, lifetime_granted, lifetime_earned, lifetime_spent, lifetime_refunded, starter_granted)
       values ($1, 'guest', $2::bigint, $2::bigint, $2::bigint, 0, 0, 0, true)`,
      [boundaryWalletId, BIGINT_MAX],
    );
    const boundaryWalletRow = (await db.query(
      `select balance, version, lifetime_granted from coin_wallets_safe where identity_id = $1`, [boundaryWalletId],
    )).rows[0];
    check("bigint-boundary", "coin_wallets_safe emits the exact bigint-maximum balance as a text string, not a rounded number",
      boundaryWalletRow.balance === BIGINT_MAX && typeof boundaryWalletRow.balance === "string", `balance=${boundaryWalletRow.balance} (${typeof boundaryWalletRow.balance})`);
    check("bigint-boundary", "coin_wallets_safe emits the exact bigint-maximum version and lifetime_granted as text strings too",
      boundaryWalletRow.version === BIGINT_MAX && boundaryWalletRow.lifetime_granted === BIGINT_MAX,
      `version=${boundaryWalletRow.version}, lifetime_granted=${boundaryWalletRow.lifetime_granted}`);

    // 14a-iii. A real coin_ledger_entries row exercising the largest
    // representable negative delta the table's own domain constraints
    // permit (balance_before/after must stay >= 0, so the true bigint
    // minimum cannot appear as `amount` in a valid row here — that absolute
    // extreme is already covered directly against the cast expression in
    // 14a-i above), read back through coin_ledger_entries_safe.
    const largestNegativeDelta = "-9223372036854775807"; // -(bigint max); balance_before=max, balance_after=0
    await db.query(
      `insert into coin_ledger_entries (wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after, entry_type, source_kind, source_id, idempotency_key, description)
       values ($1, $2::bigint, $3::bigint, 0, $4::bigint, $3::bigint, 'ADMIN_ADJUSTMENT', 'verify', 'boundary', $5, 'boundary test')`,
      [boundaryWalletId, largestNegativeDelta, BIGINT_MAX, String(BigInt(BIGINT_MAX) - 1n), `boundary-ledger-${boundaryWalletId}`],
    );
    const boundaryLedgerRow = (await db.query(
      `select amount, balance_before, balance_after from coin_ledger_entries_safe where wallet_id = $1`, [boundaryWalletId],
    )).rows[0];
    check("bigint-boundary", "coin_ledger_entries_safe emits the largest constructible negative amount and its balance_before as exact text",
      boundaryLedgerRow.amount === largestNegativeDelta && boundaryLedgerRow.balance_before === BIGINT_MAX && boundaryLedgerRow.balance_after === "0",
      JSON.stringify(boundaryLedgerRow));

    /* ═════════ 15. Rollback WITH populated transaction history (audit finding H6) ═════════ */
    console.log("\n15. Rollback safety, against a database with real transaction history");
    const preRollbackRowCounts = {};
    for (const t of EXPECTED_TABLES) {
      preRollbackRowCounts[t] = (await db.query(`select count(*)::int n from ${t}`)).rows[0].n;
    }
    check("rollback", "the database carries real transaction history before rollback is attempted (not an empty schema)",
      preRollbackRowCounts.coin_ledger_entries > 0 && preRollbackRowCounts.match_economy_settlements > 0 && preRollbackRowCounts.reward_vouchers > 0,
      JSON.stringify(preRollbackRowCounts));

    let rollbackError = null;
    try {
      await db.query(fs.readFileSync(ROLLBACK, "utf8"));
    } catch (err) {
      rollbackError = err;
    }
    check("rollback", "rollback executes cleanly against a POPULATED database, not just an empty one",
      rollbackError === null, rollbackError ? rollbackError.message : "all objects dropped in dependency order");

    const leftovers = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    )).rows.map((r) => r.table_name).filter((t) => EXPECTED_TABLES.includes(t));
    check("rollback", "no economy tables remain after rollback", leftovers.length === 0, leftovers.length ? `remaining: ${leftovers.join(", ")}` : "clean");

    let reapplyError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      reapplyError = err;
    }
    check("rollback", "migration re-applies after a rollback (forward/back/forward cycle)", reapplyError === null, reapplyError ? reapplyError.message : "succeeded");
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  const receipt = {
    verifiedAt: new Date().toISOString(),
    engine: version.split(",")[0],
    scope: "SCHEMA + FUNCTION-LOGIC + PRIVILEGE-BOUNDARY + CONCURRENCY verification against a real local PostgreSQL, with the real project's inherited default privilege reproduced before the migration is applied. Does NOT cover PostgREST transport, a real Supabase service_role key, or EconomyRepository (not built). This is self-authored verification and does not itself constitute independent re-audit approval.",
    migration: path.basename(MIGRATION),
    checks: results,
    passed: failures === 0,
    counts: { total: results.length, failed: failures },
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");

  console.log("\n========================================================");
  console.log(`  VERIFICATION SUMMARY: ${results.length - failures} PASSED, ${failures} FAILED`);
  console.log("========================================================\n");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✗ Economy schema verification aborted: ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(2);
});
