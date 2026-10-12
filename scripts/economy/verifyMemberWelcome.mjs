#!/usr/bin/env node
/**
 * A new member's welcome is paid by the welcome popup, not by the wallet being made —
 * verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * This is a money rule and it lives in database functions (migration 20261030000000): what a new
 * member's wallet is made with, when the welcome may be paid, and that it is paid exactly once. It is
 * shown here on an actual PostgreSQL 17 (embedded-postgres) with the whole migration history applied,
 * not assumed from reading the SQL.
 *
 * CAN establish: a new member wallet is empty and pending; the welcome is paid once, under its own
 * ledger key, and the wallet reconciles; concurrent claims pay once; guests, missing and frozen wallets
 * are refused; wallets that already exist are never offered the welcome; the configuration value is the
 * switch; the rollback restores the old behaviour and the migration re-applies.
 * CANNOT establish: anything about the Node server, PostgREST, or a real Supabase project.
 *
 * Prints MEMBER_WELCOME_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/economy/verifyMemberWelcome.mjs
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
const THIS_MIGRATION = "20261030000000_member_welcome_on_claim.sql";
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261030000000_member_welcome_on_claim_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55441;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-member-welcome-pg-${process.pid}`);

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
  console.log("\nMember welcome on claim — real PostgreSQL\n");
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
    one(`select balance::text b, welcome_pending p, lifetime_granted::text g, starter_granted sg,
                (balance = lifetime_granted + lifetime_earned + lifetime_refunded - lifetime_spent) ok
           from public.coin_wallets where identity_id=$1`, [id]);
  const ledgerRows = (id) =>
    q(`select amount::text a, idempotency_key k, description d from public.coin_ledger_entries
        where wallet_id=$1 and entry_type='STARTER_GRANT' order by created_at, idempotency_key`, [id]);
  const claim = async (id, client = db) => (await client.query(`select public.grant_member_welcome($1) as r`, [id])).rows[0].r;
  const pending = async (id) => (await one(`select public.member_welcome_pending($1) as p`, [id])).p;
  const refused = async (fn, code) => {
    try { await fn(); return { ok: false, got: "no error" }; } catch (e) { return { ok: e.message.includes(code), got: e.message.slice(0, 90) }; }
  };
  const setSwitch = (v) => db.query(`update public.economy_configurations set member_welcome_on_claim = $1 where is_active`, [v]);

  try {
    /* ═════════ 0. The whole history applies, and the migration re-applies ═════════ */
    await db.query(AUTH_STUB);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    // A member who existed BEFORE the migration: made while the welcome was still paid at creation.
    let applyError = null;
    let legacyMember = null;
    for (const f of files) {
      if (f === THIS_MIGRATION) legacyMember = await newMember();
      try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")); } catch (e) { applyError = `${f}: ${e.message}`; break; }
    }
    check(`all ${files.length} migrations apply in order`, applyError === null, applyError ?? "no errors");
    if (applyError) throw new Error(applyError);
    let reapplyError = null;
    try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, THIS_MIGRATION), "utf8")); } catch (e) { reapplyError = e.message; }
    check("the migration is re-runnable", reapplyError === null, reapplyError ?? "no errors");
    check("the switch is on", (await one(`select member_welcome_on_claim c from public.economy_configurations where is_active`)).c === true);

    /* ═════════ 1. A new member wallet is empty and pending ═════════ */
    console.log("\n1. A new member's wallet holds nothing until the popup is accepted");
    const m1 = await newMember();
    const w1 = await wallet(m1);
    check("the wallet is empty, not 5000", w1.b === "0", w1.b);
    check("it is flagged welcome-pending, and starter_granted so nothing re-grants it", w1.p === true && w1.sg === true, JSON.stringify(w1));
    check("no ledger row is written for a zero-coin grant", (await ledgerRows(m1)).length === 0);
    check("the wallet reconciles", w1.ok === true);
    check("member_welcome_pending says the popup is owed", (await pending(m1)) === true);
    const g1 = await newGuest();
    check("a guest is unaffected by the member rule: first game only, and member_welcome_pending is false for them",
      (await wallet(g1)).b === "100" && (await pending(g1)) === false);
    check("a wallet that does not exist is not pending", (await pending(guestId())) === false);

    /* ═════════ 2. Claimed once, under its own key ═════════ */
    console.log("\n2. Claiming pays the welcome exactly once");
    const granted = await claim(m1);
    const w2 = await wallet(m1);
    check("the welcome is applied", granted.applied === true, JSON.stringify(granted).slice(0, 120));
    check("the member now holds the full 5000", w2.b === "5000" && w2.g === "5000", JSON.stringify(w2));
    check("no longer pending, and the wallet reconciles", w2.p === false && w2.ok === true);
    const rows2 = await ledgerRows(m1);
    check("one STARTER_GRANT row, under the member-welcome key",
      rows2.length === 1 && rows2[0].k === `member-welcome:${m1}` && rows2[0].a === "5000", JSON.stringify(rows2));
    const again = await claim(m1);
    check("asking again is a no-op", again.applied === false && (await wallet(m1)).b === "5000" && (await ledgerRows(m1)).length === 1);
    check("the popup is no longer owed", (await pending(m1)) === false);

    /* ═════════ 3. Concurrent claims ═════════ */
    console.log("\n3. Simultaneous claims pay once");
    const mr = await newMember();
    const clients = await Promise.all(Array.from({ length: 6 }, connect));
    const results = await Promise.all(clients.map((c) => claim(mr, c)));
    await Promise.all(clients.map((c) => c.end()));
    check("exactly one of six simultaneous claims applied", results.filter((r) => r.applied).length === 1, results.map((r) => r.applied).join(","));
    check("and the member holds 5000, not more", (await wallet(mr)).b === "5000" && (await ledgerRows(mr)).length === 1);

    /* ═════════ 4. Refusals ═════════ */
    console.log("\n4. Who may not be welcomed");
    const notMember = await refused(() => claim(g1), "NOT_A_MEMBER");
    check("a guest is refused", notMember.ok && (await wallet(g1)).b === "100", notMember.got);
    const noWallet = await refused(() => claim(crypto.randomUUID()), "WALLET_NOT_FOUND");
    check("an id with no wallet is refused", noWallet.ok, noWallet.got);
    const mf = await newMember();
    await db.query(`update public.coin_wallets set is_frozen = true where identity_id=$1`, [mf]);
    const frozen = await refused(() => claim(mf), "WALLET_FROZEN");
    check("a frozen wallet is not welcomed, and nothing moves", frozen.ok && (await wallet(mf)).b === "0" && (await pending(mf)) === true, frozen.got);

    /* ═════════ 5. Wallets that already existed ═════════ */
    console.log("\n5. A member made before the migration is untouched");
    const wl = await wallet(legacyMember);
    check("they were paid when their wallet was made, and are not pending", wl.b === "5000" && wl.p === false, JSON.stringify(wl));
    check("the popup is never owed to them", (await pending(legacyMember)) === false);
    const legacyClaim = await claim(legacyMember);
    check("a claim for them is a no-op", legacyClaim.applied === false && (await wallet(legacyMember)).b === "5000");

    /* ═════════ 6. The switch ═════════ */
    console.log("\n6. The configuration value is the switch");
    await setSwitch(false);
    const off = await newMember();
    const wo = await wallet(off);
    check("with the switch off a new member is paid at once and is not pending", wo.b === "5000" && wo.p === false, JSON.stringify(wo));
    check("and claiming is a no-op", (await claim(off)).applied === false && (await wallet(off)).b === "5000");
    await setSwitch(true);
    check("a wallet made while it was off is untouched by turning it back on", (await wallet(off)).p === false && (await wallet(off)).b === "5000");
    const on = await newMember();
    check("a wallet made after turning it back on is pending again", (await wallet(on)).b === "0" && (await pending(on)) === true);

    /* ═════════ 7. Rollback ═════════ */
    console.log("\n7. The rollback restores the old behaviour, and the migration re-applies");
    await db.query(fs.readFileSync(ROLLBACK, "utf8"));
    const fnGone = (await q(`select count(*)::int n from pg_proc where proname in ('grant_member_welcome','member_welcome_pending')`))[0].n;
    check("the two new functions are dropped", fnGone === 0, `remaining=${fnGone}`);
    check("the switch is off", (await one(`select member_welcome_on_claim c from public.economy_configurations where is_active`)).c === false);
    const afterRollback = await newMember();
    const wr = await wallet(afterRollback);
    check("a new member is paid at once again", wr.b === "5000" && wr.p === false, JSON.stringify(wr));
    const guestAfter = await newGuest();
    check("the guest first-game rule is unharmed by the rollback", (await wallet(guestAfter)).b === "100");
    await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, THIS_MIGRATION), "utf8"));
    const reOn = await newMember();
    check("re-applying the migration puts the rule back", (await wallet(reOn)).b === "0" && (await pending(reOn)) === true);
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nMEMBER_WELCOME_VERIFIED\n");
    process.exit(0);
  }
  console.error(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((e) => {
  console.error("verification crashed:", e);
  process.exit(1);
});
