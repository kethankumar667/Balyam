#!/usr/bin/env node
/**
 * Idle-guest purge — verification against a REAL PostgreSQL.
 *
 * CAN establish: an idle guest who never got a wallet is purged; a recent guest, a guest with a wallet
 * (the ledger is immutable, so they are kept whole), a guest absorbed into an account, and every
 * member are never touched; a guest something still references is skipped and left whole
 * rather than partly deleted; the batch limit is honoured; bad arguments are refused; and the
 * rollback removes the function.
 * CANNOT establish: anything about the Node server or the schedule that calls it.
 *
 * Prints IDLE_GUEST_PURGE_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/persistence/verifyIdleGuestPurge.mjs
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
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261026000000_purge_idle_guests_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55439;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-idle-guest-pg-${process.pid}`);

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
  console.log("\nIdle-guest purge verification — real PostgreSQL\n");
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

  /** A guest last seen `idleDays` ago, with a wallet (and so its welcome grant) only if asked. */
  const newGuest = async (idleDays, { wallet = false } = {}) => {
    const id = guestId();
    await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [id]);
    if (wallet) await db.query(`select public.ensure_wallet($1)`, [id]);
    await db.query(`update public.player_identities set last_seen_at = now() - make_interval(days => $2) where player_id = $1`, [id, idleDays]);
    return id;
  };
  const newMember = async (idleDays) => {
    const id = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [id, `${id}@example.com`]);
    await db.query(`insert into public.player_identities (player_id, kind, auth_user_id) values ($1, 'member', $2)`, [id, id]);
    await db.query(`select public.ensure_wallet($1)`, [id]);
    await db.query(`update public.player_identities set last_seen_at = now() - make_interval(days => $2) where player_id = $1`, [id, idleDays]);
    return id;
  };
  const exists = async (id) => Number((await one(`select count(*)::int n from public.player_identities where player_id=$1`, [id])).n) === 1;
  const walletRows = async (id) => Number((await one(`select count(*)::int n from public.coin_wallets where identity_id=$1`, [id])).n);
  const ledgerRows = async (id) => Number((await one(`select count(*)::int n from public.coin_ledger_entries where wallet_id=$1`, [id])).n);
  const purge = async (days = 45, batch = 500) => (await one(`select public.purge_idle_guests($1, $2) as r`, [days, batch])).r;

  try {
    await db.query(AUTH_STUB);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    let applyError = null;
    for (const f of files) {
      try { await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")); } catch (e) { applyError = `${f}: ${e.message}`; break; }
    }
    check(`all ${files.length} migrations apply in order`, applyError === null, applyError ?? "no errors");
    if (applyError) throw new Error(applyError);

    /* ═════════ 1. Who is purged and who is not ═════════ */
    console.log("\n1. Only a guest who did nothing is purged");
    const idle = await newGuest(60);
    const recent = await newGuest(3);
    // A guest who got as far as a wallet: its ledger is immutable, so they are kept whole.
    const withWallet = await newGuest(60, { wallet: true });
    const absorbed = await newGuest(60, { wallet: true });
    const memberForClaim = await newMember(1);
    await db.query(`insert into public.guest_wallet_claims (guest_id, member_id, amount) values ($1, $2, 0)`, [absorbed, memberForClaim]);
    const oldMember = await newMember(200);

    check("the idle guest has no wallet", (await walletRows(idle)) === 0);
    const result = await purge(45, 500);
    check("the purge reports at least the idle guest", Number(result.purged) >= 1, JSON.stringify(result));
    check("the idle guest is gone", !(await exists(idle)));
    check("a recent guest is kept", await exists(recent));
    check("a guest with a wallet is kept, wallet and ledger intact", (await exists(withWallet)) && (await walletRows(withWallet)) === 1 && (await ledgerRows(withWallet)) >= 1);
    check("a guest absorbed into an account is kept", await exists(absorbed));
    check("a long-idle member is never touched", await exists(oldMember));
    check("the member with the claim is untouched", await exists(memberForClaim));

    /* ═════════ 2. Fail safe: something still references the guest ═════════ */
    console.log("\n2. A guest something still references is skipped, whole");
    const referenced = await newGuest(60);
    // Prove the safety net directly: add a restricting reference ourselves and watch the purge skip.
    await db.query(`create table public.verify_guest_ref (g text not null references public.player_identities(player_id) on delete restrict)`);
    await db.query(`insert into public.verify_guest_ref (g) values ($1)`, [referenced]);
    const r2 = await purge(45, 500);
    check("the referenced guest is skipped, not deleted", await exists(referenced), JSON.stringify(r2));
    check("the skip is counted", Number(r2.skipped) >= 1, JSON.stringify(r2));

    /* ═════════ 3. Batch limit and arguments ═════════ */
    console.log("\n3. Batch size and argument checks");
    for (let i = 0; i < 5; i++) await newGuest(90);
    const r3 = await purge(45, 2);
    check("a batch of 2 purges at most 2", Number(r3.purged) <= 2, JSON.stringify(r3));
    let tooShort = null;
    try { await purge(3, 10); } catch (e) { tooShort = e.message; }
    check("a retention shorter than a week is refused", !!tooShort && tooShort.includes("INVALID_RETENTION"), tooShort ?? "no error");
    let badBatch = null;
    try { await purge(45, 0); } catch (e) { badBatch = e.message; }
    check("a batch of zero is refused", !!badBatch && badBatch.includes("INVALID_BATCH"), badBatch ?? "no error");

    /* ═════════ 4. Rollback ═════════ */
    console.log("\n4. Rollback");
    let rolledBack = null;
    try { await db.query(fs.readFileSync(ROLLBACK, "utf8")); } catch (e) { rolledBack = e.message; }
    check("the rollback runs", rolledBack === null, rolledBack ?? "no errors");
    check("the function is gone", Number((await one(`select count(*)::int n from pg_proc where proname='purge_idle_guests'`)).n) === 0);
  } finally {
    await db.end().catch(() => {});
    await pg.stop().catch(() => {});
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nIDLE_GUEST_PURGE_VERIFIED\n");
    process.exit(0);
  }
  console.log(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
