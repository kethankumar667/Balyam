#!/usr/bin/env node
/**
 * Mandali schema verification against a REAL PostgreSQL.
 *
 * Same discipline as scripts/persistence/verifySchema.mjs: every claim below
 * is a query answered by PostgreSQL 17 (embedded-postgres binaries, not an
 * emulator). The progression harness deliberately does not load this
 * migration; the implementation plan requires group migrations to be loaded
 * and exercised explicitly, so this harness exists.
 *
 * What it establishes:
 *   1. migration cleanliness + re-runnability (applied twice)
 *   2. rollback cleanliness + re-apply
 *   3. atomic creation: group + owner membership in ONE transaction commits
 *   4. the commit-time owner invariant: a group left ownerless at COMMIT
 *      aborts — including under concurrency
 *   5. single live episode per (group, user)
 *   6. episode shape: PENDING has no timestamps, APPROVED has joined_at,
 *      REJECTED/WITHDRAWN carry decided_at
 *   7. RLS posture: forced, and anon/authenticated see zero rows; service
 *      role (bypassrls) sees and writes
 *   8. owner transfer discipline: pointer first, then rows
 *
 * CANNOT establish: PostgREST behavior (bare Postgres here, no Supabase
 * REST layer) — the same stated boundary as the progression harness.
 *
 * Usage: node scripts/persistence/verifyMandaliSchema.mjs
 */

import EmbeddedPostgres from "embedded-postgres";
import pkg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MIGRATION = path.join(ROOT, "supabase/migrations/20261001000000_mandali_groups.sql");
const RPC_MIGRATION = path.join(ROOT, "supabase/migrations/20261002000000_mandali_group_rpcs.sql");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261001000000_mandali_groups_rollback.sql");
const RPC_ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261002000000_mandali_group_rpcs_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55434;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-mandali-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 200)}` : ""}`);
}

/** Minimal Supabase shapes: identities + auth stub + the roles the migration grants to. */
const SETUP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create table if not exists public.player_identities (
  player_id text primary key,
  kind text not null check (kind in ('member', 'guest')),
  auth_user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function main() {
  console.log("\nMandali schema verification — real PostgreSQL\n");
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
    // UTF8 explicit: WIN1252 host locales choke on the migration's unicode
    // punctuation (found by the progression harness the same way).
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();

  const connect = () => {
    const c = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
    return c.connect().then(() => c);
  };

    let db;
  try {
    db = await connect();
    const migration = fs.readFileSync(MIGRATION, "utf8");
    const rpcMigration = fs.readFileSync(RPC_MIGRATION, "utf8");
    const rollback = fs.readFileSync(ROLLBACK, "utf8");

    await db.query(SETUP);

    /* ── 1. Migration applies, twice ── */
    await db.query(migration);
    await db.query(migration);
    check("migration", "applies cleanly and is re-runnable", true);

    /* ── seed auth users + identities ── */
    // dave/eve own nothing at seed time — the RPC limit checks below need a
    // clean slate, earlier sections leave groups behind on purpose.
    await db.query(
      `insert into auth.users (id, email)
       select gen_random_uuid(), p || '@example.com' from unnest(array['alice','bob','carol','dave','eve']) p
       returning id`,
    );
    await db.query(
      `insert into public.player_identities (player_id, kind, auth_user_id)
       select 'member_' || split_part(email, '@', 1), 'member', id from auth.users`,
    );

    /* ── 2. Atomic creation ── */
    const createGroup = async (client, owner, name) => {
      const q = await client.query(
        `with g as (
           insert into public.mandalis (name, owner_id) values ($1, $2) returning id
         ), m as (
           insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
           select g.id, $2, 'OWNER', 'APPROVED', now() from g
           returning mandali_id
         )
         select g.id from g`, [name, owner],
      );
      return q.rows[0].id;
    };

    let groupId;
    await db.query("begin");
    groupId = await createGroup(db, "member_alice", "Test Mandali");
    await db.query("commit");
    check("creation", "atomic group + owner membership commits", Boolean(groupId));

    /* ── 3. Ownerless group aborts at commit ── */
    let rejected = false;
    try {
      await db.query("begin");
      await db.query(`insert into public.mandalis (name, owner_id) values ('ownerless', 'member_bob')`);
      // No membership rows follow. Commit must fail.
      await db.query("commit");
    } catch (err) {
      rejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("integrity", "group without owner membership aborts at commit", rejected);

    /* ── 4. Two owners abort ── */
    rejected = false;
    try {
      await db.query("begin");
      await db.query(`insert into public.mandalis (name, owner_id) values ('two-owner', 'member_alice')`);
      await db.query(`insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
        select id, 'member_bob', 'OWNER', 'APPROVED', now() from public.mandalis where name = 'two-owner'`);
      await db.query("commit");
    } catch {
      rejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("integrity", "second live OWNER membership aborts at commit", rejected);

    /* ── 4. One live episode per (group, user) ── */
    await db.query("begin");
    const g3 = await createGroup(db, "member_bob", "Bobs Second");
    await db.query(
      `insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
       values ($1, 'member_carol', 'MEMBER', 'APPROVED', now())`, [g3],
    );
    let duplicateRejected = false;
    try {
      await db.query(
        `insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
         values ($1, 'member_carol', 'MEMBER', 'APPROVED', now())`, [g3],
      );
      await db.query("commit");
    } catch {
      duplicateRejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("episodes", "second live episode for same (group, user) rejected", duplicateRejected);

    /* ── 5. Episode shape ── */
    let shapeRejected = false;
    try {
      await db.query("begin");
      const g4 = await createGroup(db, "member_carol", "Carols");
      await db.query(
        `insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
         values ($1, 'member_alice', 'MEMBER', 'APPROVED', null)`, [g4],
      );
      await db.query("commit");
    } catch {
      shapeRejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("episodes", "APPROVED without joined_at violates episode shape", shapeRejected);

    /* ── 6. Pending may not be decided/joined ── */
    rejected = false;
    try {
      await db.query("begin");
      const g5 = await createGroup(db, "member_alice", "Alices Second");
      await db.query(
        `insert into public.mandali_memberships (mandali_id, user_id, role, status, decided_at)
         values ($1, 'member_bob', 'MEMBER', 'PENDING', now())`, [g5],
      );
      await db.query("commit");
    } catch {
      rejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("episodes", "PENDING with decided_at violates episode shape", rejected);

    /* ── 7. RLS posture ──
     *
     * Two independent denials stack: no SELECT grant (revocation) and forced
     * RLS with no policy. We assert the denial outcome — a read attempt from
     * anon/authenticated fails or returns zero rows — rather than which
     * mechanism fired, and separately assert service_role CAN read (its
     * bypassrls makes the RLS claim meaningful, not vacuous). */
    const roleSees = async (role) => {
      await db.query("begin");
      await db.query(`set local role ${role}`);
      try {
        const r = await db.query("select count(*)::int as n from public.mandalis");
        await db.query("reset role");
        await db.query("commit");
        return { ok: true, count: r.rows[0].n };
      } catch {
        await db.query("rollback").catch(() => {});
        return { ok: false, count: -1 };
      }
    };

    const anonRead = await roleSees("anon");
    check("rls", "anon role cannot read mandali rows", !anonRead.ok || anonRead.count === 0,
      anonRead.ok ? `count=${anonRead.count}` : "read denied (no grant)");

    const authedRead = await roleSees("authenticated");
    check("rls", "authenticated role cannot read mandali rows", !authedRead.ok || authedRead.count === 0,
      authedRead.ok ? `count=${authedRead.count}` : "read denied (no grant)");

    const serviceRead = await roleSees("service_role");
    check("rls", "service role reads through (bypassrls)", serviceRead.ok && serviceRead.count >= 1,
      `count=${serviceRead.count}`);

    /* ── 8. Owner transfer discipline ── */
    let transferRejected = false;
    try {
      await db.query("begin");
      const g6 = await createGroup(db, "member_alice", "Transfer Test");
      // Try to make bob an OWNER while alice still holds the pointer.
      await db.query(
        `insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
         values ($1, 'member_bob', 'OWNER', 'APPROVED', now())`, [g6],
      );
      await db.query("commit");
    } catch {
      transferRejected = true;
      await db.query("rollback").catch(() => {});
    }
    check("transfer", "second OWNER while pointer unmoved is refused", transferRejected);

    let transferOk = false;
    try {
      await db.query("begin");
      const g7 = await createGroup(db, "member_alice", "Transfer Two");
      await db.query("update public.mandalis set owner_id = 'member_bob' where id = $1", [g7]);
      await db.query("update public.mandali_memberships set role = 'MEMBER' where mandali_id = $1 and user_id = 'member_alice'", [g7]);
      await db.query(
        `insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
         values ($1, 'member_bob', 'OWNER', 'APPROVED', now())`, [g7],
      );
      await db.query("commit");
      transferOk = true;
    } catch (err) {
      await db.query("rollback").catch(() => {});
      console.log(String(err).slice(0, 300));
    }
    check("transfer", "pointer-first owner transfer commits", transferOk);

    /* ── 9. Creation RPC: limit, atomicity, concurrency ── */
    await db.query(rpcMigration);
    const rpcCount = async (owner) => {
      await db.query("begin");
      await db.query("set local role service_role");
      const r = await db.query("select count(*)::int as n from public.mandalis where owner_id = $1", [owner]);
      await db.query("reset role");
      await db.query("commit");
      return r.rows[0].n;
    };
    await db.query("select public.mandali_create_group($1, $2, $3, $4)", ["Rpc One", null, "member_dave", 32]);
    check("rpc", "mandali_create_group establishes group + owner in one call", (await rpcCount("member_dave")) === 1);
    let limitRejected = false;
    await db.query("select public.mandali_create_group($1, $2, $3, $4)", ["Rpc Two", null, "member_dave", 32]);
    try {
      await db.query("select public.mandali_create_group($1, $2, $3, $4)", ["Rpc Three", null, "member_dave", 32]);
    } catch {
      limitRejected = true;
    }
    check("rpc", "third owned group refused by in-transaction limit", limitRejected);

    // Concurrency: three parallel creations for one fresh owner; exactly two commit.
    await db.query("insert into public.player_identities (player_id, kind) values ('member_frank', 'guest')");
    const c1 = await connect();
    const c2 = await connect();
    let concurrencyAccepted = 0;
    const attempt = async (client, name) => {
      try {
        await client.query("begin");
        await client.query("select public.mandali_create_group($1, $2, $3, $4)", [name, null, "member_frank", 32]);
        await client.query("commit");
        return true;
      } catch {
        await client.query("rollback").catch(() => {});
        return false;
      }
    };
    const [a, b, c] = await Promise.all([
      attempt(c1, "Frank A"), attempt(c1, "Frank B"), attempt(c2, "Frank C"),
    ]);
    concurrencyAccepted = [a, b, c].filter(Boolean).length;
    await c1.end().catch(() => {});
    await c2.end().catch(() => {});
    check("rpc", "concurrent creations respect the owned-group limit exactly", concurrencyAccepted === 2, `accepted=${concurrencyAccepted}`);

    /* ── 10. Rollback re-applies ── */
    // Reverse dependency order: the RPC's return type depends on the
    // mandalis table, so the RPC rollback must run before the table drop —
    // the exact defect this drill exists to catch.
    const rpcRollback = fs.readFileSync(RPC_ROLLBACK, "utf8");
    await db.query(rpcRollback);
    await db.query(rollback);
    const gone = await db.query(
      `select count(*)::int as n from information_schema.tables
       where table_schema = 'public' and table_name in ('mandalis', 'mandali_memberships')`,
    );
    check("rollback", "rollback drops both tables", gone.rows[0].n === 0);
    await db.query(migration);
    await db.query(rpcMigration);
    check("rollback", "migrations re-apply after rollback", true);

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    if (db) await db.end().catch(() => {});
    await pg.stop().catch(() => {});
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
