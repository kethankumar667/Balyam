#!/usr/bin/env node
/**
 * Email-uniqueness guard verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * "One person, one account" cannot be enforced in the client (it can be edited)
 * or in the server (the account layer is Supabase's, called straight from the
 * browser). The one place every signup path passes through is the `auth.users`
 * table, so the guard is a trigger on it, and a trigger is only proven by
 * running it. This applies the real migration to an actual PostgreSQL 17
 * (embedded-postgres) and tries to get a second account past it every way a
 * person reasonably would: another case, a dot, a +tag, the googlemail alias, a
 * throwaway domain, an email change, five at once.
 *
 * CAN establish: the migration applies, re-applies, and backfills existing users
 * without failing; aliases of one mailbox are refused; concurrency cannot let two
 * through; deleting an account frees the address; the table is closed to clients;
 * the rollback removes everything.
 * CANNOT establish: how Supabase's own auth service words the failure to a browser
 * (its `auth.users` is stubbed here, as in the other verify scripts), nor that
 * a person with five genuinely different mailboxes is one person.
 *
 * Prints EMAIL_GUARD_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/persistence/verifyEmailGuard.mjs
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
const MIGRATION = path.join(ROOT, "supabase/migrations/20261021000000_email_uniqueness_guard.sql");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261021000000_email_uniqueness_guard_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55435;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-email-pg-verify-${process.pid}`);

let failures = 0;
function check(name, passed, evidence = "") {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
}

const uuid = () => crypto.randomUUID();

/** Supabase's auth.users, reduced to what the guard reads. created_at orders the backfill. */
const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function attempt(client, sql, params = []) {
  try {
    await client.query(sql, params);
    return { ok: true, detail: "accepted" };
  } catch (err) {
    return { ok: false, detail: `${err.code} ${err.message}`, message: err.message };
  }
}

const signUp = (client, email) =>
  attempt(client, `insert into auth.users (id, email) values ($1, $2)`, [uuid(), email]);

async function main() {
  console.log("\nEmail-uniqueness guard verification — real PostgreSQL\n");

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

  try {
    /* ═════════ 1. Existing accounts, before the guard exists ═════════ */
    console.log("1. Accounts that already exist when the migration arrives");
    await db.query(AUTH_STUB);
    const firstId = uuid();
    const secondId = uuid();
    await db.query(`insert into auth.users (id, email, created_at) values ($1, 'Old.Timer@gmail.com', now() - interval '10 days')`, [firstId]);
    await db.query(`insert into auth.users (id, email, created_at) values ($1, 'oldtimer+again@gmail.com', now() - interval '2 days')`, [secondId]);
    await db.query(`insert into auth.users (id, email) values ($1, 'someone.else@example.com')`, [uuid()]);
    await db.query(`insert into auth.users (id, email) values ($1, null)`, [uuid()]);

    const sql = fs.readFileSync(MIGRATION, "utf8");
    let first = null;
    try { await db.query(sql); } catch (err) { first = err; }
    check("migration applies cleanly over existing users, including a colliding pair", first === null, first ? first.message : "no errors");
    if (first) throw first;

    let second = null;
    try { await db.query(sql); } catch (err) { second = err; }
    check("migration is re-runnable", second === null, second ? second.message : "second apply changed nothing");

    const owner = (await db.query(`select user_id from public.account_emails where canonical_email = 'oldtimer@gmail.com'`)).rows[0]?.user_id;
    check("the earliest of two existing look-alikes owns the address; the later one is grandfathered, not deleted",
      owner === firstId && (await db.query(`select 1 from auth.users where id = $1`, [secondId])).rowCount === 1, `owner=${owner}`);
    check("an account with no email is skipped, not an error",
      (await db.query(`select count(*)::int as n from public.account_emails`)).rows[0].n === 2);

    /* ═════════ 2. Canonical form ═════════ */
    console.log("\n2. What counts as the same mailbox");
    const canon = async (e) => (await db.query(`select public.canonical_email($1) as c`, [e])).rows[0].c;
    check("case and padding are ignored", (await canon("  Kethan.K@Example.COM ")) === "kethan.k@example.com");
    check("a +tag is ignored on any domain", (await canon("kethan+games@example.com")) === "kethan@example.com");
    check("dots are ignored for Gmail", (await canon("k.e.t.h.a.n@gmail.com")) === "kethan@gmail.com");
    check("googlemail.com is Gmail", (await canon("kethan@googlemail.com")) === "kethan@gmail.com");
    check("dots are kept elsewhere, because elsewhere they are different mailboxes", (await canon("a.b@example.com")) === "a.b@example.com");
    check("nothing in, nothing out", (await canon(null)) === null);

    /* ═════════ 3. The guard ═════════ */
    console.log("\n3. A second account for the same mailbox is refused");
    check("a brand-new address signs up", (await signUp(db, "kethan.k@gmail.com")).ok);
    for (const [label, email] of [
      ["the exact address", "kethan.k@gmail.com"],
      ["another case", "KETHAN.K@GMAIL.COM"],
      ["without the dot", "kethank@gmail.com"],
      ["with extra dots", "k.e.t.h.a.n.k@gmail.com"],
      ["with a +tag", "kethank+two@gmail.com"],
      ["as googlemail", "kethank@googlemail.com"],
      ["with padding", "  kethank@gmail.com "],
    ]) {
      const r = await signUp(db, email);
      check(`refused: ${label}`, !r.ok && /EMAIL_ALREADY_REGISTERED/.test(r.message ?? ""), r.detail);
    }
    check("five at once from one mailbox: exactly one gets in", await (async () => {
      const clients = await Promise.all(Array.from({ length: 5 }, connect));
      const variants = ["racer@gmail.com", "ra.cer@gmail.com", "racer+1@gmail.com", "RACER@googlemail.com", "r.a.c.e.r+x@gmail.com"];
      const results = await Promise.all(clients.map((c, i) => signUp(c, variants[i])));
      await Promise.all(clients.map((c) => c.end()));
      return results.filter((r) => r.ok).length === 1;
    })());
    check("only one row exists for that mailbox", (await db.query(`select count(*)::int as n from public.account_emails where canonical_email = 'racer@gmail.com'`)).rows[0].n === 1);

    /* ═════════ 4. Throwaway mail ═════════ */
    console.log("\n4. Throwaway addresses");
    const burner = await signUp(db, "x1@mailinator.com");
    check("a throwaway domain is refused", !burner.ok && /EMAIL_DOMAIN_NOT_ALLOWED/.test(burner.message ?? ""), burner.detail);
    check("a subdomain of a throwaway domain is refused too", !(await signUp(db, "x1@eu.mailinator.com")).ok);
    check("an ordinary domain with a similar name is not", (await signUp(db, "x1@mailinator-fans.org")).ok);

    /* ═════════ 5. Changing an email ═════════ */
    console.log("\n5. Changing an email cannot be used to get round it");
    const mover = uuid();
    await db.query(`insert into auth.users (id, email) values ($1, 'mover@example.com')`, [mover]);
    const steal = await attempt(db, `update auth.users set email = 'KETHAN.K+x@gmail.com' where id = $1`, [mover]);
    check("moving to another account's mailbox is refused", !steal.ok && /EMAIL_ALREADY_REGISTERED/.test(steal.message ?? ""), steal.detail);
    check("a refused change leaves the old address registered to them",
      (await db.query(`select user_id from public.account_emails where canonical_email = 'mover@example.com'`)).rows[0]?.user_id === mover);
    check("moving to a free address works", (await attempt(db, `update auth.users set email = 'mover.new@example.com' where id = $1`, [mover])).ok);
    check("and frees the old one", (await signUp(db, "mover@example.com")).ok);
    check("changing something other than the email does not trip the guard",
      (await attempt(db, `update auth.users set created_at = now() where id = $1`, [mover])).ok);

    /* ═════════ 6. Deleting an account ═════════ */
    console.log("\n6. Deleting an account");
    const gone = uuid();
    await db.query(`insert into auth.users (id, email) values ($1, 'goner@example.com')`, [gone]);
    await db.query(`delete from auth.users where id = $1`, [gone]);
    check("frees the address", (await signUp(db, "goner+back@example.com")).ok);

    /* ═════════ 7. Closed to clients ═════════ */
    console.log("\n7. Nobody but the server can read the table");
    for (const role of ["anon", "authenticated"]) {
      await db.query(`set role ${role}`);
      const read = await attempt(db, `select * from public.account_emails`);
      await db.query(`reset role`);
      check(`${role} cannot read it`, !read.ok, read.detail);
    }
    check("RLS is forced on it", (await db.query(`select relforcerowsecurity from pg_class where relname = 'account_emails'`)).rows[0]?.relforcerowsecurity === true);

    /* ═════════ 8. Rollback ═════════ */
    console.log("\n8. Rollback");
    let rb = null;
    try { await db.query(fs.readFileSync(ROLLBACK, "utf8")); } catch (err) { rb = err; }
    check("the rollback applies", rb === null, rb ? rb.message : "no errors");
    check("after it, a look-alike address signs up again", (await signUp(db, "kethank+afterrollback@gmail.com")).ok);
    check("and nothing of the guard is left behind",
      (await db.query(`select count(*)::int as n from pg_proc where proname = 'canonical_email'`)).rows[0].n === 0
      && (await db.query(`select to_regclass('public.account_emails') as t`)).rows[0].t === null);
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures === 0) {
    console.log("\nEMAIL_GUARD_VERIFIED\n");
    process.exit(0);
  }
  console.log(`\n${failures} check(s) failed\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error("verification aborted:", err);
  process.exit(1);
});
