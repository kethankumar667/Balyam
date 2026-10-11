#!/usr/bin/env node
/**
 * Guest "first game on us", the welcome after it, and erasing an idle guest —
 * verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * These are money rules, and they live in database functions: when a guest wallet is made, what it is
 * given, when the rest of the welcome may be paid and only once, and what is deleted when nobody comes
 * back. They are shown here on an actual PostgreSQL 17 (embedded-postgres) with the whole migration
 * history applied, not assumed from reading the SQL.
 *
 * CAN establish: a new guest wallet holds only the first-game amount and is flagged pending; the welcome
 * is refused before a game is played and paid exactly once after it; members and legacy wallets are
 * unaffected; the NULL switch restores the old behaviour; the idle purge deletes a wallet-less guest,
 * erases (but keeps the ledger of) a guest with a wallet, and leaves fresh, absorbed and member
 * identities alone; the rollback restores the old functions and the migration re-applies.
 * CANNOT establish: anything about the Node server or PostgREST.
 *
 * Prints GUEST_FIRST_GAME_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/economy/verifyGuestFirstGame.mjs
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
const THIS_MIGRATION = "20261028000000_guest_first_game_welcome.sql";
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261028000000_guest_first_game_welcome_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55439;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-guest-first-game-pg-${process.pid}`);

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
  console.log("\nGuest first game / welcome / erasure verification — real PostgreSQL\n");
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
    await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [id, `${id}@example.com`]);
    await db.query(`insert into public.player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [id, id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    return id;
  };
  const wallet = async (id) =>
    one(`select balance::text b, welcome_pending p, lifetime_spent::text s, lifetime_granted::text g,
                (balance = lifetime_granted + lifetime_earned + lifetime_refunded - lifetime_spent) ok
           from public.coin_wallets where identity_id=$1`, [id]);
  const ledgerRows = async (id) =>
    q(`select amount::text a, idempotency_key k, description d from public.coin_ledger_entries
        where wallet_id=$1 and entry_type='STARTER_GRANT' order by created_at, idempotency_key`, [id]);
  /** A real match entry for a solo game: debits the guest's coins and counts as played. */
  const playSolo = (id) =>
    db.query(
      `select public.commit_match_entry($1::text, 'ROOM'::text, $2::text, 1::int, 1::int, 0::int, true, null::jsonb, null::text)`,
      [`m_${crypto.randomBytes(6).toString("hex")}`, id],
    );
  const welcome = async (id) => (await db.query(`select public.grant_guest_welcome($1) as r`, [id])).rows[0].r;
  const refused = async (fn, code) => {
    try { await fn(); return { ok: false, got: "no error" }; } catch (e) { return { ok: e.message.includes(code), got: e.message.slice(0, 90) }; }
  };
  const setFirstGame = (v) =>
    db.query(`update public.economy_configurations set guest_first_game_coins = $1 where is_active`, [v]);
  const age = (id, days) =>
    db.query(`update public.player_identities set last_seen_at = now() - make_interval(days => $2) where player_id=$1`, [id, days]);
  const purge = async (days = 8) => (await db.query(`select public.purge_idle_guests($1, 500) as r`, [days])).rows[0].r;

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
    check("the first-game amount is switched on at 100",
      (await one(`select guest_first_game_coins::text c from public.economy_configurations where is_active`)).c === "100");

    /* ═════════ 1. A new guest wallet is the first game only ═════════ */
    console.log("\n1. A new guest wallet holds only the first-game amount");
    const g1 = await newGuest();
    const w1 = await wallet(g1);
    check("the guest holds 100, not the whole welcome", w1.b === "100", w1.b);
    check("the wallet is flagged welcome-pending", w1.p === true);
    check("the wallet reconciles", w1.ok === true);
    const rows1 = await ledgerRows(g1);
    check("one STARTER_GRANT row says it is the first game on us",
      rows1.length === 1 && rows1[0].a === "100" && rows1[0].k === `starter-grant:${g1}` && /first game/i.test(rows1[0].d), JSON.stringify(rows1));
    const m1 = await newMember();
    const wm = await wallet(m1);
    check("a member is unaffected: 5000 and not pending", wm.b === "5000" && wm.p === false, JSON.stringify(wm));

    /* ═════════ 2. The welcome waits for a game ═════════ */
    console.log("\n2. The welcome is refused until a game has been played");
    const early = await refused(() => welcome(g1), "WELCOME_NEEDS_GAME");
    check("asking before playing is refused", early.ok, early.got);
    check("and nothing moved", (await wallet(g1)).b === "100" && (await ledgerRows(g1)).length === 1);

    /* ═════════ 3. After a game, once ═════════ */
    console.log("\n3. After the first game the welcome is paid, exactly once");
    await playSolo(g1);
    check("the first game spent the sponsored coins", (await wallet(g1)).b === "0");
    const granted = await welcome(g1);
    const w3 = await wallet(g1);
    check("the welcome is applied", granted.applied === true, JSON.stringify(granted).slice(0, 120));
    check("the guest now holds the full 2000", w3.b === "2000", w3.b);
    check("no longer pending, and the wallet reconciles", w3.p === false && w3.ok === true);
    const rows3 = await ledgerRows(g1);
    check("a second STARTER_GRANT row, under its own key",
      rows3.length === 2 && rows3.some((r) => r.k === `guest-welcome:${g1}` && r.a === "2000"), JSON.stringify(rows3));
    const again = await welcome(g1);
    check("asking again is a no-op", again.applied === false && (await wallet(g1)).b === "2000" && (await ledgerRows(g1)).length === 2);

    /* ═════════ 4. Refusals ═════════ */
    console.log("\n4. Who may not be welcomed");
    const notGuest = await refused(() => welcome(m1), "NOT_A_GUEST");
    check("a member is refused", notGuest.ok, notGuest.got);
    const noWallet = await refused(() => welcome(guestId()), "WALLET_NOT_FOUND");
    check("an id with no wallet is refused", noWallet.ok, noWallet.got);
    const gf = await newGuest();
    await playSolo(gf);
    await db.query(`update public.coin_wallets set is_frozen = true where identity_id=$1`, [gf]);
    const frozen = await refused(() => welcome(gf), "WALLET_FROZEN");
    check("a frozen wallet is not welcomed", frozen.ok && (await wallet(gf)).b === "0", frozen.got);

    /* ═════════ 5. The switch ═════════ */
    console.log("\n5. The configuration value is the switch");
    await setFirstGame(null);
    const legacy = await newGuest();
    const wl = await wallet(legacy);
    check("with the value NULL a new guest gets the whole welcome at once", wl.b === "2000" && wl.p === false, JSON.stringify(wl));
    check("and asking for the welcome is a no-op", (await welcome(legacy)).applied === false && (await wallet(legacy)).b === "2000");
    await setFirstGame(0);
    const zero = await newGuest();
    const wz = await wallet(zero);
    check("with 0 a new guest starts empty and pending, and no zero-coin ledger row is written",
      wz.b === "0" && wz.p === true && (await ledgerRows(zero)).length === 0, JSON.stringify(wz));
    await setFirstGame(100);
    check("a wallet made before the switch is untouched by it", (await wallet(legacy)).p === false);

    /* ═════════ 6. Erasing a guest nobody came back for ═════════ */
    console.log("\n6. The idle purge");
    const tooShort = await refused(() => purge(3), "INVALID_RETENTION");
    check("a retention under 7 days is refused", tooShort.ok, tooShort.got);

    const idleNoWallet = guestId();
    await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [idleNoWallet]);
    await age(idleNoWallet, 9);

    const idleWithWallet = await newGuest();
    await db.query(`insert into public.player_profiles (player_id, display_name) values ($1, 'Ravi')`, [idleWithWallet]);
    await age(idleWithWallet, 9);
    const ledgerBefore = (await ledgerRows(idleWithWallet)).length;
    const balanceBefore = (await wallet(idleWithWallet)).b;

    const fresh = await newGuest();
    const absorbed = await newGuest();
    const acct = await newMember();
    await db.query(`select public.claim_guest_wallet($1, $2)`, [absorbed, acct]);
    await age(absorbed, 20);
    const idleMember = await newMember();
    await db.query(`update public.player_identities set last_seen_at = now() - interval '30 days' where player_id=$1`, [idleMember]);

    const outcome = await purge(8);
    check("the run reports deleted, erased and none kept back",
      outcome.purged >= 1 && outcome.erased >= 1 && outcome.skipped === 0, JSON.stringify(outcome));
    check("a wallet-less idle guest is deleted outright",
      Number((await one(`select count(*)::int n from public.player_identities where player_id=$1`, [idleNoWallet])).n) === 0);
    check("an idle guest with a wallet loses their personal data",
      Number((await one(`select count(*)::int n from public.player_profiles where player_id=$1`, [idleWithWallet])).n) === 0);
    const erased = await one(`select erased_at is not null e from public.player_identities where player_id=$1`, [idleWithWallet]);
    check("but the identity row stays, marked erased", erased && erased.e === true);
    check("and the wallet and the coin ledger are kept whole",
      (await wallet(idleWithWallet)).b === balanceBefore && (await ledgerRows(idleWithWallet)).length === ledgerBefore);
    check("a guest who was active is left alone",
      Number((await one(`select count(*)::int n from public.player_identities where player_id=$1 and erased_at is null`, [fresh])).n) === 1);
    check("a guest absorbed into an account is left alone, however idle",
      Number((await one(`select count(*)::int n from public.player_identities where player_id=$1 and erased_at is null`, [absorbed])).n) === 1);
    check("an idle member is never touched",
      Number((await one(`select count(*)::int n from public.player_identities where player_id=$1 and erased_at is null`, [idleMember])).n) === 1);
    const second = await purge(8);
    check("an erased guest is not visited again", second.purged === 0 && second.erased === 0, JSON.stringify(second));

    /* ═════════ 7. Re-running and rolling back ═════════ */
    console.log("\n7. Re-running and rolling back");
    let reran = null;
    try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, THIS_MIGRATION), "utf8")); } catch (e) { reran = e.message; }
    check("the migration is safe to run twice — no errors", reran === null, reran ?? "no errors");
    check("the second run kept the switch on", (await one(`select guest_first_game_coins::text c from public.economy_configurations where is_active`)).c === "100");

    let rolledBack = null;
    try { await db.query(fs.readFileSync(ROLLBACK, "utf8")); } catch (e) { rolledBack = e.message; }
    check("the rollback runs — no errors", rolledBack === null, rolledBack ?? "no errors");
    check("the welcome function is gone",
      Number((await one(`select count(*)::int n from pg_proc where proname='grant_guest_welcome'`)).n) === 0);
    const afterRollback = await newGuest();
    const war = await wallet(afterRollback);
    check("a new guest gets the whole welcome at creation again", war.b === "2000" && war.p === false, JSON.stringify(war));
    const oldPurge = await purge(8);
    check("the original purge is back (no 'erased' count)", oldPurge.erased === undefined && "purged" in oldPurge, JSON.stringify(oldPurge));
    let reapplied = null;
    try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, THIS_MIGRATION), "utf8")); } catch (e) { reapplied = e.message; }
    check("the migration applies again after a rollback", reapplied === null, reapplied ?? "no errors");
    check("and the switch is back on", (await one(`select guest_first_game_coins::text c from public.economy_configurations where is_active`)).c === "100");
  } finally {
    await db.end().catch(() => {});
    await pg.stop().catch(() => {});
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nGUEST_FIRST_GAME_VERIFIED\n");
    process.exit(0);
  }
  console.log(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
