#!/usr/bin/env node
/**
 * Guest prizes go to the wallet — verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * Money rules are database rules. This applies the migration history to an actual
 * PostgreSQL 17 (embedded-postgres) in two steps — everything BEFORE
 * 20261023000000_guest_prizes_to_wallet.sql, then that migration — and settles real
 * matches on each side, so "a guest winner is paid into their wallet, not sealed in a
 * voucher" is shown as a before and an after in the same database.
 *
 * CAN establish: today's behaviour (a guest prize becomes a voucher and leaves the wallet
 * untouched), the new behaviour (credited at once, with a ledger row, nothing escrowed),
 * that a member is unaffected, that a losing guest is simply not paid, that settlement is
 * still idempotent and still conserves every coin, that a server that still sends a
 * voucher hash cannot make one, and that the rollback restores the old behaviour.
 * CANNOT establish: anything about the Node server or PostgREST.
 *
 * Prints GUEST_PRIZE_TO_WALLET_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/economy/verifyGuestPrizeToWallet.mjs
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
const THIS_MIGRATION = "20261023000000_guest_prizes_to_wallet.sql";
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261023000000_guest_prizes_to_wallet_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55437;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-guest-prize-pg-${process.pid}`);

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
const matchId = () => `m_${crypto.randomBytes(6).toString("hex")}`;
const fakeHash = () => crypto.createHash("sha256").update(crypto.randomBytes(20)).digest("hex");

async function main() {
  console.log("\nGuest prizes → wallet verification — real PostgreSQL\n");
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres", port: PORT, persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();
  const db = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
  await db.connect();

  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const one = async (sql, params) => (await q(sql, params))[0];
  const newGuest = async () => {
    const id = guestId();
    await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    return id;
  };
  const newMember = async () => {
    const id = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${id}@example.com`]);
    await db.query(`insert into public.player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [id, id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    return id;
  };
  const balance = async (id) => (await one(`select balance::text b from public.coin_wallets where identity_id=$1`, [id])).b;
  const settle = async (m, participants, prizes, cut) =>
    (await one(`select public.settle_match_economy($1, true, $2::jsonb, null, $3::jsonb, $4) as r`,
      [m, JSON.stringify(participants), JSON.stringify(prizes), cut])).r;
  const commit = (m, host, seats, humans, bots) =>
    // The full 9-argument form, as the server calls it — two overloads share a prefix, so a shorter call is ambiguous.
    db.query(
      `select public.commit_match_entry($1::text, 'ROOM'::text, $2::text, $3::int, $4::int, $5::int, false, null::jsonb, null::text)`,
      [m, host, seats, humans, bots],
    );

  try {
    /* ═════════ 0. History up to, but not including, this migration ═════════ */
    await db.query(AUTH_STUB);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    const before = files.filter((f) => f < THIS_MIGRATION);
    let applyError = null;
    for (const f of before) {
      try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")); } catch (e) { applyError = `${f}: ${e.message}`; break; }
    }
    check(`the ${before.length} migrations before this one apply in order`, applyError === null, applyError ?? "no errors");
    if (applyError) throw new Error(applyError);

    /* ═════════ 1. Before: today's behaviour ═════════ */
    console.log("\n1. Before — a guest prize is sealed in a voucher");
    const oldGuest = await newGuest();
    const mOld = matchId();
    await commit(mOld, oldGuest, 2, 1, 1);
    const oldRes = await settle(mOld, [
      { identityId: oldGuest, identityKind: "guest", placement: 1, voucherCodeHash: fakeHash() },
      { identityId: "bot_old", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("settles", oldRes.applied === true, JSON.stringify(oldRes.result).slice(0, 100));
    check("the guest's wallet does not receive the prize", (await balance(oldGuest)) === "2800", `balance=${await balance(oldGuest)}`);
    check("a voucher was created instead", (await one(`select count(*)::int n from public.reward_vouchers where issued_to_guest_id=$1`, [oldGuest])).n === 1);

    /* ═════════ 2. Apply the migration ═════════ */
    console.log("\n2. Apply the migration");
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, THIS_MIGRATION), "utf8");
    let e1 = null, e2 = null;
    try { await db.query(sql); } catch (e) { e1 = e; }
    try { await db.query(sql); } catch (e) { e2 = e; }
    check("applies cleanly", e1 === null, e1?.message);
    check("is re-runnable", e2 === null, e2?.message);
    if (e1) throw e1;

    /* ═════════ 3. After: a guest winner is paid ═════════ */
    console.log("\n3. After — a guest winner is paid into their wallet");
    const winner = await newGuest();
    const m1 = matchId();
    await commit(m1, winner, 2, 1, 1);
    check("the stake was taken (3000 - 200)", (await balance(winner)) === "2800", `balance=${await balance(winner)}`);
    const res = await settle(m1, [
      { identityId: winner, identityKind: "guest", placement: 1 },
      { identityId: "bot_1", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("settles", res.applied === true && res.result.status === "SETTLED", JSON.stringify(res.result).slice(0, 120));
    check("the guest's wallet is credited the prize at once (2800 + 150)", (await balance(winner)) === "2950", `balance=${await balance(winner)}`);
    const led = await one(`select amount::text a, entry_type, source_kind from public.coin_ledger_entries where wallet_id=$1 and entry_type='MATCH_PRIZE_CREDIT'`, [winner]);
    check("with an ordinary Match Prize ledger row", led?.a === "150" && led?.source_kind === "match", JSON.stringify(led));
    const part = await one(`select identity_kind, payout_status, prize_coins::text p, voucher_id from public.match_economy_participants where match_id=$1 and identity_id=$2`, [m1, winner]);
    check("the participant row says paid to wallet, no voucher", part?.identity_kind === "guest" && part?.payout_status === "PAID_WALLET" && part?.p === "150" && part?.voucher_id === null, JSON.stringify(part));
    check("no voucher exists for it", (await one(`select count(*)::int n from public.reward_vouchers where match_id=$1`, [m1])).n === 0);
    const stl = await one(`select total_wallet_rewarded::text w, total_guest_escrow::text e, total_world_bank_cut::text c, total_collected::text t from public.match_economy_settlements where match_id=$1`, [m1]);
    check("nothing is escrowed; every coin collected is accounted for", stl.e === "0" && stl.w === "150" && stl.c === "50" && stl.t === "200", JSON.stringify(stl));
    const wbBefore = (await one(`select guest_escrow_liability::text l from public.world_bank_accounts`)).l;

    /* ═════════ 4. Replay ═════════ */
    console.log("\n4. Settling twice pays once");
    const replay = await settle(m1, [
      { identityId: winner, identityKind: "guest", placement: 1 },
      { identityId: "bot_1", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("the replay is refused as already applied", replay.applied === false);
    check("the balance does not move", (await balance(winner)) === "2950");
    check("only one prize ledger row exists", (await one(`select count(*)::int n from public.coin_ledger_entries where wallet_id=$1 and entry_type='MATCH_PRIZE_CREDIT'`, [winner])).n === 1);

    /* ═════════ 5. A guest who loses ═════════ */
    console.log("\n5. A guest who loses is simply not paid; the pot goes to the winner");
    const loser = await newGuest();
    const champ = await newMember();
    const m2 = matchId();
    await commit(m2, champ, 2, 2, 0);
    const champBefore = await balance(champ);
    const loserBefore = await balance(loser);
    const r2 = await settle(m2, [
      { identityId: champ, identityKind: "member", placement: 1 },
      { identityId: loser, identityKind: "guest", placement: 2 },
    ], [150, 0], 50);
    check("settles", r2.applied === true);
    check("the winner receives the prize", BigInt(await balance(champ)) - BigInt(champBefore) === 150n, `${champBefore} -> ${await balance(champ)}`);
    check("the losing guest's wallet is untouched by settlement", (await balance(loser)) === loserBefore);
    const lp = await one(`select payout_status, prize_coins::text p from public.match_economy_participants where match_id=$1 and identity_id=$2`, [m2, loser]);
    check("their row says no prize", lp?.payout_status === "NO_PRIZE" && lp?.p === "0", JSON.stringify(lp));

    /* ═════════ 6. Member, guest and bot together ═════════ */
    console.log("\n6. A member, a guest and a bot in one match");
    const mem = await newMember();
    const gst = await newGuest();
    const m3 = matchId();
    await commit(m3, mem, 5, 2, 3);
    const memBefore = await balance(mem);
    const gstBefore = await balance(gst);
    const r3 = await settle(m3, [
      { identityId: mem, identityKind: "member", placement: 1 },
      { identityId: gst, identityKind: "guest", placement: 2 },
      { identityId: "bot_a", identityKind: "bot", placement: 3 },
      { identityId: "bot_b", identityKind: "bot", placement: 4 },
      { identityId: "bot_c", identityKind: "bot", placement: 5 },
    ], [300, 100, 50], 50);
    check("settles with every coin accounted for", r3.applied === true && r3.result.status === "SETTLED");
    check("the member is paid 300", BigInt(await balance(mem)) - BigInt(memBefore) === 300n);
    check("the guest is paid 100", BigInt(await balance(gst)) - BigInt(gstBefore) === 100n);
    const sums = await one(`select total_wallet_rewarded::text w, total_guest_escrow::text e, total_bot_collection::text b, total_world_bank_cut::text c from public.match_economy_settlements where match_id=$1`, [m3]);
    check("wallet 400, escrow 0, bot 50, house 50", sums.w === "400" && sums.e === "0" && sums.b === "50" && sums.c === "50", JSON.stringify(sums));

    /* ═════════ 7. A server that still sends a voucher hash ═════════ */
    console.log("\n7. A server that has not been updated yet, still sending a voucher hash");
    const stale = await newGuest();
    const m4 = matchId();
    await commit(m4, stale, 2, 1, 1);
    const r4 = await settle(m4, [
      { identityId: stale, identityKind: "guest", placement: 1, voucherCodeHash: fakeHash() },
      { identityId: "bot_s", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("is paid into the wallet all the same", r4.applied === true && (await balance(stale)) === "2950", `balance=${await balance(stale)}`);
    check("and no voucher is made from the stray hash", (await one(`select count(*)::int n from public.reward_vouchers where match_id=$1`, [m4])).n === 0);
    check("the escrow liability never moved", (await one(`select guest_escrow_liability::text l from public.world_bank_accounts`)).l === wbBefore);
    check("vouchers issued before the change are untouched", (await one(`select status from public.reward_vouchers where issued_to_guest_id=$1`, [oldGuest])).status === "ACTIVE");

    /* ═════════ 8. Rollback ═════════ */
    console.log("\n8. Rollback");
    let rb = null;
    try { await db.query(fs.readFileSync(ROLLBACK, "utf8")); } catch (e) { rb = e; }
    check("applies", rb === null, rb?.message);
    const back = await newGuest();
    const m5 = matchId();
    await commit(m5, back, 2, 1, 1);
    await settle(m5, [
      { identityId: back, identityKind: "guest", placement: 1, voucherCodeHash: fakeHash() },
      { identityId: "bot_r", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("a guest prize is a voucher again, and the wallet is untouched", (await balance(back)) === "2800" && (await one(`select count(*)::int n from public.reward_vouchers where match_id=$1`, [m5])).n === 1);
    await db.query(sql);
    check("re-applying the migration after a rollback works", true);

    /* ═════════ 9. Removing the voucher structure ═════════ */
    console.log("\n9. Remove the voucher structure (20261024000000)");
    const REMOVE = path.join(MIGRATIONS_DIR, "20261024000000_remove_vouchers.sql");
    const REMOVE_ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261024000000_remove_vouchers_rollback.sql");
    const removeSql = fs.readFileSync(REMOVE, "utf8");
    let rm1 = null, rm2 = null;
    try { await db.query(removeSql); } catch (e) { rm1 = e; }
    try { await db.query(removeSql); } catch (e) { rm2 = e; }
    check("applies cleanly", rm1 === null, rm1?.message);
    check("is re-runnable", rm2 === null, rm2?.message);
    if (rm1) throw rm1;

    const exists = async (sqlText) => (await one(sqlText)).n;
    check("the voucher table is gone", (await exists(`select count(*)::int n from pg_class where relname = 'reward_vouchers'`)) === 0);
    check("the safe view is gone", (await exists(`select count(*)::int n from pg_class where relname = 'reward_vouchers_safe'`)) === 0);
    check("the issue / redeem / helper functions are gone",
      (await exists(`select count(*)::int n from pg_proc where proname in ('issue_guest_voucher','redeem_reward_voucher','voucher_to_safe_jsonb')`)) === 0);
    check("the participant link column is gone",
      (await exists(`select count(*)::int n from information_schema.columns where table_name='match_economy_participants' and column_name='voucher_id'`)) === 0);

    check("history survives: the world bank still reads its escrow figures",
      (await one(`select guest_escrow_liability::text l, total_voucher_redeemed::text r from public.world_bank_accounts`)).l !== undefined);
    check("history survives: the old sealed-voucher participant row is still there",
      (await one(`select payout_status from public.match_economy_participants where match_id=$1 and identity_id=$2`, [mOld, oldGuest]))?.payout_status === "ESCROWED_VOUCHER");

    const after = await newGuest();
    const m6 = matchId();
    await commit(m6, after, 2, 1, 1);
    const r6 = await settle(m6, [
      { identityId: after, identityKind: "guest", placement: 1 },
      { identityId: "bot_after", identityKind: "bot", placement: 2 },
    ], [150, 0], 50);
    check("settlement still works, and a guest winner is still paid", r6.applied === true && (await balance(after)) === "2950", `balance=${await balance(after)}`);

    let rb2 = null;
    try { await db.query(fs.readFileSync(REMOVE_ROLLBACK, "utf8")); } catch (e) { rb2 = e; }
    check("the removal's rollback applies", rb2 === null, rb2?.message);
    check("and puts the empty structure back",
      (await exists(`select count(*)::int n from pg_class where relname = 'reward_vouchers'`)) === 1
      && (await exists(`select count(*)::int n from pg_proc where proname in ('issue_guest_voucher','redeem_reward_voucher','voucher_to_safe_jsonb')`)) === 3);
    await db.query(removeSql);
    check("removing again after a rollback works", (await exists(`select count(*)::int n from pg_class where relname = 'reward_vouchers'`)) === 0);
  } catch (err) {
    failures += 1;
    console.log(`  ✗ ABORTED — ${err.message}`);
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nGUEST_PRIZE_TO_WALLET_VERIFIED\n");
    process.exit(0);
  }
  console.log(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error("verification aborted:", err);
  process.exit(1);
});
