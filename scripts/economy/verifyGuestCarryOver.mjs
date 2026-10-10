#!/usr/bin/env node
/**
 * Guest -> member carry-over — verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * "One guest per account, one account per guest, and never an unconfirmed mailbox" are
 * database rules, so they are shown here on an actual PostgreSQL 17 (embedded-postgres)
 * with the whole migration history applied, not assumed from reading the function.
 *
 * CAN establish: the claim debits the whole guest wallet with a ledger row and keeps every
 * wallet reconciled; a repeat of the same pair is a replay; a second account for the same
 * guest, and a second guest for the same account, are refused with nothing moved; an
 * unconfirmed or unknown account is refused with nothing moved; a frozen wallet is not
 * moved; two simultaneous claims move the coins once; the reward ledger accepts the two
 * new reward types; and the rollback removes them again.
 * CANNOT establish: anything about the Node server or PostgREST.
 *
 * Prints GUEST_CARRYOVER_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/economy/verifyGuestCarryOver.mjs
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
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261025000000_guest_carryover_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55438;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-guest-carryover-pg-${process.pid}`);

let failures = 0;
function check(name, passed, evidence = "") {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 200)}` : ""}`);
}

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;

async function main() {
  console.log("\nGuest carry-over verification — real PostgreSQL\n");
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres", port: PORT, persistent: false,
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
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const one = async (sql, params) => (await q(sql, params))[0];

  const newGuest = async (coins = 0) => {
    const id = guestId();
    await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    // Put the wallet at an exact balance through a real ledgered adjustment.
    const start = Number((await one(`select balance::text b from public.coin_wallets where identity_id=$1`, [id])).b);
    if (coins > start) await db.query(`select public.admin_adjust_wallet($1, $2, 'verify', 'seed', $3)`, [id, coins - start, `seed:${id}`]);
    return id;
  };
  const newMember = async ({ confirmed = true } = {}) => {
    const id = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)`, [id, `${id}@example.com`, confirmed ? new Date() : null]);
    await db.query(`insert into public.player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [id, id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    return id;
  };
  const balance = async (id) => (await one(`select balance::text b from public.coin_wallets where identity_id=$1`, [id])).b;
  const claim = async (client, g, m) => (await client.query(`select public.claim_guest_wallet($1, $2) as r`, [g, m])).rows[0].r;
  const refused = async (g, m, code) => {
    try { await claim(db, g, m); return { ok: false, got: "no error" }; } catch (e) { return { ok: e.message.includes(code), got: e.message.slice(0, 80) }; }
  };
  const reconciles = async (id) =>
    (await one(`select (balance = lifetime_granted + lifetime_earned + lifetime_refunded - lifetime_spent) as ok from public.coin_wallets where identity_id=$1`, [id])).ok;
  const debitRows = async (id) =>
    Number((await one(`select count(*)::int n from public.coin_ledger_entries where wallet_id=$1 and entry_type='GUEST_CARRYOVER_DEBIT'`, [id])).n);

  try {
    /* ═════════ 0. The whole history applies ═════════ */
    await db.query(AUTH_STUB);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    let applyError = null;
    for (const f of files) {
      try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")); } catch (e) { applyError = `${f}: ${e.message}`; break; }
    }
    check(`all ${files.length} migrations apply in order`, applyError === null, applyError ?? "no errors");
    if (applyError) throw new Error(applyError);

    /* ═════════ 1. A claim moves the whole wallet ═════════ */
    console.log("\n1. A claim debits the guest and records it");
    const g1 = await newGuest(3000);
    const m1 = await newMember();
    const memberBefore = await balance(m1);
    const r1 = await claim(db, g1, m1);
    check("the claim reports CLAIMED with the guest's whole balance", r1.status === "CLAIMED" && r1.amount === "3000", JSON.stringify(r1));
    check("the guest wallet is now empty", (await balance(g1)) === "0");
    check("the guest wallet still reconciles", await reconciles(g1));
    const ledger = await one(`select amount::text a, balance_after::text ba from public.coin_ledger_entries where wallet_id=$1 and entry_type='GUEST_CARRYOVER_DEBIT'`, [g1]);
    check("one GUEST_CARRYOVER_DEBIT ledger row explains it", ledger && ledger.a === "-3000" && ledger.ba === "0", JSON.stringify(ledger));
    check("the claim row holds the amount", (await one(`select amount::text a from public.guest_wallet_claims where guest_id=$1 and member_id=$2`, [g1, m1])).a === "3000");
    check("the claim does not credit the member (the gateway does, held)", (await balance(m1)) === memberBefore);

    /* ═════════ 2. Replay ═════════ */
    console.log("\n2. The same pair again is a replay");
    const again = await claim(db, g1, m1);
    check("REPLAY with the original amount, nothing moved", again.status === "REPLAY" && again.amount === "3000", JSON.stringify(again));
    check("still exactly one debit row", (await debitRows(g1)) === 1);

    /* ═════════ 3. One guest per account, one account per guest ═════════ */
    console.log("\n3. One guest per account, one account per guest");
    const m2 = await newMember();
    const refusedSecondAccount = await refused(g1, m2, "GUEST_ALREADY_CLAIMED");
    check("a second account cannot absorb the same guest", refusedSecondAccount.ok, refusedSecondAccount.got);
    const g2 = await newGuest(2500);
    const g2Before = await balance(g2);
    const refusedSecondGuest = await refused(g2, m1, "MEMBER_ALREADY_CLAIMED");
    check("a second guest cannot be absorbed by the same account", refusedSecondGuest.ok, refusedSecondGuest.got);
    check("the refused guest keeps every coin", (await balance(g2)) === g2Before);

    /* ═════════ 4. The mailbox must be proved ═════════ */
    console.log("\n4. An unconfirmed or unknown account is refused");
    const g3 = await newGuest(1000);
    const g3Before = await balance(g3);
    const unconfirmed = await newMember({ confirmed: false });
    const refusedUnconfirmed = await refused(g3, unconfirmed, "EMAIL_NOT_CONFIRMED");
    check("an unconfirmed email is refused", refusedUnconfirmed.ok, refusedUnconfirmed.got);
    check("nothing moved and no claim was written",
      (await balance(g3)) === g3Before && Number((await one(`select count(*)::int n from public.guest_wallet_claims where guest_id=$1`, [g3])).n) === 0);
    const refusedUnknown = await refused(g3, crypto.randomUUID(), "MEMBER_NOT_FOUND");
    check("an id with no account is refused", refusedUnknown.ok, refusedUnknown.got);

    /* ═════════ 5. Other refusals ═════════ */
    console.log("\n5. Other refusals leave the wallet alone");
    const frozen = await newGuest(800);
    const frozenBefore = await balance(frozen);
    await db.query(`update public.coin_wallets set is_frozen = true where identity_id=$1`, [frozen]);
    const m3 = await newMember();
    const refusedFrozen = await refused(frozen, m3, "WALLET_FROZEN");
    check("a frozen guest wallet is not moved", refusedFrozen.ok && (await balance(frozen)) === frozenBefore, refusedFrozen.got);
    const refusedMemberWallet = await refused(m3, await newMember(), "NOT_A_GUEST");
    check("a member wallet cannot be absorbed", refusedMemberWallet.ok, refusedMemberWallet.got);
    const refusedMissing = await refused(guestId(), m3, "GUEST_WALLET_NOT_FOUND");
    check("a guest with no wallet is refused", refusedMissing.ok, refusedMissing.got);
    const refusedSelf = await refused(m3, m3, "INVALID_CLAIM");
    check("a wallet cannot absorb itself", refusedSelf.ok, refusedSelf.got);

    /* ═════════ 6. Concurrency ═════════ */
    console.log("\n6. Simultaneous claims");
    const g4 = await newGuest(4000);
    const g5 = await newGuest(4500);
    const g4Before = await balance(g4);
    const g5Before = await balance(g5);
    const mc = await newMember();
    const c1 = await connect();
    const c2 = await connect();
    const settled = await Promise.allSettled([claim(c1, g4, mc), claim(c2, g5, mc)]);
    await c1.end();
    await c2.end();
    check("two guests racing into one account: exactly one wins", settled.filter((s) => s.status === "fulfilled").length === 1, settled.map((s) => s.status).join(","));
    const lost = settled[0].status === "fulfilled" ? g5 : g4;
    check("the loser keeps its coins", (await balance(lost)) === (lost === g4 ? g4Before : g5Before));

    const g6 = await newGuest(3500);
    const ma = await newMember();
    const mb = await newMember();
    const d1 = await connect();
    const d2 = await connect();
    const raced = await Promise.allSettled([claim(d1, g6, ma), claim(d2, g6, mb)]);
    await d1.end();
    await d2.end();
    check("one guest racing into two accounts: exactly one wins", raced.filter((s) => s.status === "fulfilled").length === 1, raced.map((s) => s.status).join(","));
    check("the guest was debited once", (await debitRows(g6)) === 1 && (await balance(g6)) === "0");

    /* ═════════ 7. A guest with nothing ═════════ */
    console.log("\n7. An empty guest wallet");
    const empty = await newGuest(0);
    await db.query(`update public.coin_wallets set lifetime_spent = lifetime_spent + balance, balance = 0 where identity_id=$1`, [empty]);
    const me = await newMember();
    const r0 = await claim(db, empty, me);
    check("an empty wallet claims cleanly with amount 0 and no ledger row",
      r0.status === "CLAIMED" && r0.amount === "0" && (await debitRows(empty)) === 0, JSON.stringify(r0));

    /* ═════════ 8. Reward ledger accepts the new types ═════════ */
    console.log("\n8. The reward ledger holds the two new reward types");
    const insertReward = async (type) => {
      try {
        await db.query(
          `insert into public.reward_ledger (reward_id, player_id, reward_type, reason_code, amount, source_id, earned_at, vesting_until, status, risk_state, description)
           values ($1, $2, $3, 'X', 100, $4, now(), now(), 'PENDING', 'NORMAL', 'verify')`,
          [`rwd_${crypto.randomBytes(8).toString("hex")}`, m1, type, `guest:${g1}`],
        );
        return null;
      } catch (e) { return e.message; }
    };
    const carryErr = await insertReward("GUEST_CARRYOVER");
    check("GUEST_CARRYOVER is accepted", carryErr === null, carryErr ?? "");
    const bonusErr = await insertReward("GUEST_UPGRADE_BONUS");
    check("GUEST_UPGRADE_BONUS is accepted", bonusErr === null, bonusErr ?? "");
    check("an unknown type is still refused", (await insertReward("MADE_UP")) !== null);

    /* ═════════ 9. Re-run and rollback ═════════ */
    console.log("\n9. Re-running and rolling back");
    let rerun = null;
    try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, "20261025000000_guest_carryover.sql"), "utf8")); } catch (e) { rerun = e.message; }
    check("the migration is safe to run twice", rerun === null, rerun ?? "no errors");
    check("the second run kept the claims", Number((await one(`select count(*)::int n from public.guest_wallet_claims`)).n) >= 4);

    let rolledBack = null;
    try { await db.query(fs.readFileSync(ROLLBACK, "utf8")); } catch (e) { rolledBack = e.message; }
    check("the rollback runs", rolledBack === null, rolledBack ?? "no errors");
    check("the claim table and function are gone",
      (await one(`select to_regclass('public.guest_wallet_claims') is null as gone`)).gone &&
      Number((await one(`select count(*)::int n from pg_proc where proname='claim_guest_wallet'`)).n) === 0);
    check("the new reward types are refused again", (await insertReward("GUEST_CARRYOVER")) !== null);
    check("the faucet reward type still works", (await insertReward("HOURLY_FAUCET")) === null);
  } finally {
    await db.end().catch(() => {});
    await pg.stop().catch(() => {});
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nGUEST_CARRYOVER_VERIFIED\n");
    process.exit(0);
  }
  console.log(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
