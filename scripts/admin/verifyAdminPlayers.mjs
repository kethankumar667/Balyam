#!/usr/bin/env node
/**
 * Real PostgreSQL 17 regression: node scripts/admin/verifyAdminPlayers.mjs
 * Local only: no environment connection strings, Supabase, or PostgREST.
 * Uses real accounts/progression migrations and a declared erased_at fixture
 * from 20261028000000_guest_first_game_welcome.sql. Optional absent sources
 * are checked for unavailable responses, not certified as installed schemas.
 */
import EmbeddedPostgres from "embedded-postgres";
import pkg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const { Client } = pkg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NAME = "20261101000000_admin_player_inspection.sql";
const results = [];
const AUTH_STUB = `
  create schema auth;
  create table auth.users (
    id uuid primary key, email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(), last_sign_in_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

function check(name, passed, evidence = {}) {
  const result = { name, passed, evidence };
  results.push(result);
  console.log(JSON.stringify(result));
}

function sqlError(error, sql = "") {
  const position = Number(error.position);
  return {
    code: error.code, message: error.message, detail: error.detail,
    line: position ? sql.slice(0, position - 1).split("\n").length : undefined,
    internalQuery: error.internalQuery, where: error.where,
  };
}

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function expectError(db, name, sql, params, code) {
  try {
    await db.query(sql, params);
    check(name, false, { expectedCode: code, actual: "succeeded" });
  } catch (error) {
    check(name, error.code === code, sqlError(error, sql));
  }
}

async function directoryChecks(service, actor, target, guest, blankGuest) {
  const directory = async (page, size, search = "", kind = "all", role = "all", roles = {}) =>
    (await service.query("select public.admin_player_directory($1,$2,$3,$4,$5,$6) result",
      [page, size, search, kind, role, roles])).rows[0].result;
  const first = await directory(1, 100);
  const second = await directory(2, 100);
  const ids = [...first.users, ...second.users].map((user) => user.id);
  check("directory exceeds 100, stable nonoverlapping pages", first.total === 124 &&
    first.users.length === 100 && second.users.length === 24 && new Set(ids).size === 124,
  { total: first.total, pageLengths: [first.users.length, second.users.length] });
  const guestResult = await directory(1, 100, guest);
  check("profile-less guest is discoverable", guestResult.users[0]?.id === guest &&
    guestResult.users[0]?.name === guest && guestResult.users[0]?.email === "");
  const emptyEmail = await directory(1, 100, target);
  check("member with empty email is discoverable", emptyEmail.users[0]?.email === "");
  const blankName = await directory(1, 100, blankGuest);
  check("empty progression name falls back to guest identity", blankName.users[0]?.name === blankGuest);
  const roles = { [actor]: "super_admin", [guest]: "admin" };
  const admins = await directory(1, 100, "", "member", "super_admin", roles);
  const guests = await directory(1, 100, "", "guest", "all", roles);
  check("role and kind filters; guests cannot inherit admin role", admins.total === 1 &&
    admins.users[0]?.id === actor && guests.total === 2 && guests.users.every((user) => user.role === "member"));
  check("literal search and empty page", (await directory(1, 100, "%_")).total === 0 &&
    (await directory(100, 100)).users.length === 0);
  await expectError(service, "directory refuses zero page", "select public.admin_player_directory(0,100,'','all','all','{}')", [], "P0001");
  await expectError(service, "directory refuses page size above 100", "select public.admin_player_directory(1,101,'','all','all','{}')", [], "P0001");
}

async function recordChecks(db, service, target) {
  await db.query(`insert into public.xp_ledger(player_id,amount,reason,source_kind,source_id)
    select $1,10,'local verification','manual','verify_'||counter from generate_series(1,105) counter`, [target]);
  await db.query(`insert into public.match_summaries(id,room_code,game,started_at,finished_at,duration_ms,winner_id,winner_kind,participant_count)
    values ('verify_win','WIN001','ludo',now()-interval '1 minute',now(),60000,$1,'human',1),
      ('verify_loss','LOSS01','ludo',now()-interval '2 minutes',now(),120000,null,'bot',1),
      ('verify_draw','DRAW01','rps',now()-interval '3 minutes',now(),180000,null,'draw',1)`, [target]);
  await db.query(`insert into public.match_participants(match_id,player_id,is_winner)
    values ('verify_win',$1,true),('verify_loss',$1,false),('verify_draw',$1,false)`, [target]);
  const records = async (section, page = 1) => (await service.query(
    "select public.admin_player_records($1,$2,$3,100) result", [target, section, page])).rows[0].result;
  const first = await records("xp");
  const second = await records("xp", 2);
  check("record paging covers all 105 XP rows without duplicates", first.total === 105 &&
    first.hasMore && !second.hasMore && first.records.length === 100 && second.records.length === 5 &&
    new Set([...first.records, ...second.records].map((row) => row.id)).size === 105,
  { total: first.total, pageLengths: [first.records.length, second.records.length] });
  const available = ["account", "profile", "matches", "participants", "xp", "achievements", "challenges",
    "progression", "reward_audit", "friends", "friend_requests", "moderation"];
  for (const section of available) {
    const result = await records(section);
    check(`records section ${section}`, result.key === section && Array.isArray(result.records) &&
      Number.isInteger(result.total) && !result.unavailable, { total: result.total });
  }
  for (const section of ["wallet", "ledger", "rewards", "mandali"]) {
    const result = await records(section);
    check(`optional absent source ${section} reports unavailable`, typeof result.unavailable === "string" &&
      result.total === null && result.records.length === 0 && result.hasMore === false);
  }
  const summary = (await service.query("select public.admin_player_summary($1) result", [target])).rows[0].result;
  check("summary derives match count, bot loss, draw and favorite game", summary.matchesPlayed === 3 &&
    summary.winRate === "33%" && summary.rating === 615 && summary.favoriteGame === "ludo",
  { matches: summary.matchesPlayed, winRate: summary.winRate, rating: summary.rating });
  await expectError(service, "records refuses unknown section", "select public.admin_player_records($1,'bogus',1,10)", [target], "P0001");
  await expectError(service, "records refuses missing identity", "select public.admin_player_records('guest_missing','xp',1,10)", [], "P0001");
}

async function moderationChecks(db, service, connect, actor, target) {
  const sql = "select public.admin_moderate_player($1,$2,$3,$4,$5) result";
  const moderate = async (action, revision) => (await service.query(sql, [actor, target, action, "Verified reason", revision])).rows[0].result;
  check("suspend revision 0 succeeds", (await moderate("suspend", 0)).status === 200);
  const peer = await connect();
  try {
    await peer.query("set role service_role");
    const outcomes = await Promise.all([
      moderate("resume", 1),
      peer.query(sql, [actor, target, "resume", "Concurrent reason", 1]).then((result) => result.rows[0].result),
    ]);
    check("concurrent same-revision requests yield 200 and 409", outcomes.map((row) => row.status).sort().join(",") === "200,409",
      { statuses: outcomes.map((row) => row.status) });
  } finally {
    await peer.end();
  }
  const state = (await db.query(`select revision,is_suspended,(select count(*)::int from public.player_moderation_audit where player_id=$1) audits
    from public.player_moderation where player_id=$1`, [target])).rows[0];
  check("two successful actions produce exactly two audits; conflict is atomic", state.revision === 2 &&
    state.is_suspended === false && state.audits === 2, state);
  const auditPage = (await service.query("select public.admin_player_records($1,'moderation',1,1) result", [target])).rows[0].result;
  const auditNext = (await service.query("select public.admin_player_records($1,'moderation',2,1) result", [target])).rows[0].result;
  check("moderation records page two audits newest revision first", auditPage.total === 2 &&
    auditPage.hasMore && !auditNext.hasMore && auditPage.records[0]?.revision === 2 && auditNext.records[0]?.revision === 1);
  const denied = [
    [actor, actor, "suspend", "Self denied", 0, 403],
    ["guest_missing", target, "suspend", "Unknown actor", 2, 403],
    [actor, "guest_missing", "suspend", "Unknown target", 0, 404],
    [actor, target, "bogus", "Invalid action", 2, 400],
    [actor, target, "suspend", "x", 2, 400],
    [actor, target, "suspend", "Bad\nreason", 2, 400],
    [actor, target, "suspend", "Negative revision", -1, 400],
  ];
  for (const [actorId, playerId, action, reason, revision, expected] of denied) {
    const result = (await service.query(sql, [actorId, playerId, action, reason, revision])).rows[0].result;
    check(`moderation rejection ${action}/${expected}/${reason.length}`, result.status === expected, { status: result.status });
  }
  await db.query("begin");
  await db.query(sql, [actor, target, "suspend", "Rollback test", 2]);
  await db.query("rollback");
  check("caller transaction rollback restores state and audit", (await db.query(
    "select count(*)::int count from public.player_moderation_audit where player_id=$1", [target])).rows[0].count === 2);
  await moderate("suspend", 2);
  const suspended = (await service.query("select public.admin_suspended_players(0,1) result")).rows[0].result;
  check("suspended RPC paging", suspended.length === 1 && suspended[0].id === target &&
    (await service.query("select public.admin_suspended_players(1,1) result")).rows[0].result.length === 0);
}

async function roleChecks(db, client, target, actor) {
  const signatures = ["admin_player_summary(text)", "admin_player_directory(integer,integer,text,text,text,jsonb)",
    "admin_suspended_players(integer,integer)", "admin_moderate_player(text,text,text,text,integer)",
    "admin_player_records(text,text,integer,integer)"];
  for (const signature of signatures) {
    const grants = (await db.query(`select has_function_privilege('anon',$1,'EXECUTE') anon,
      has_function_privilege('authenticated',$1,'EXECUTE') authenticated,
      has_function_privilege('service_role',$1,'EXECUTE') service`, [`public.${signature}`])).rows[0];
    check(`RPC grants ${signature}`, !grants.anon && !grants.authenticated && grants.service, grants);
  }
  for (const role of ["anon", "authenticated"]) {
    await client.query(`set role ${role}`);
    await expectError(client, `${role} cannot execute admin RPC`, "select public.admin_player_summary($1)", [target], "42501");
    await expectError(client, `${role} cannot read moderation`, "select * from public.player_moderation", [], "42501");
    await expectError(client, `${role} cannot insert audit`, "insert into public.player_moderation_audit(player_id,action,reason,revision) values ($1,'resume','Forbidden',99)", [target], "42501");
    await client.query("reset role");
  }
  const posture = (await db.query("select relname,relrowsecurity,relforcerowsecurity from pg_class where oid in ('public.player_moderation'::regclass,'public.player_moderation_audit'::regclass)")).rows;
  check("moderation tables enable RLS (not forced)", posture.every((row) => row.relrowsecurity && !row.relforcerowsecurity), posture);
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [target]);
  await client.query("set role authenticated");
  check("suspended owner cannot read own profile", (await client.query("select * from public.profiles where id=$1", [target])).rowCount === 0);
  check("suspended owner cannot update own profile", (await client.query("update public.profiles set display_name='Denied' where id=$1", [target])).rowCount === 0);
  await expectError(client, "suspended owner cannot insert own profile", "insert into public.profiles(id,display_name) values ($1,'Denied')", [target], "42501");
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
  check("active owner can read/update own profile", (await client.query("select * from public.profiles where id=$1", [actor])).rowCount === 1 &&
    (await client.query("update public.profiles set display_name='Active owner' where id=$1", [actor])).rowCount === 1);
  check("active owner cannot read another profile", (await client.query("select * from public.profiles where id=$1", [target])).rowCount === 0);
  await client.query("reset role");
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-admin-pg-"));
  let postgres;
  const clients = new Set();
  try {
    const port = await freePort();
    const password = crypto.randomBytes(32).toString("hex");
    postgres = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password, port,
      persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"] });
    await postgres.initialise();
    await postgres.start();
    const connect = async () => {
      const client = new Client({ host: "127.0.0.1", port, user: "postgres", password, database: "postgres",
        connectionTimeoutMillis: 10000, statement_timeout: 15000 });
      clients.add(client);
      await client.connect();
      return client;
    };
    const db = await connect();
    const version = (await db.query("select version(),current_setting('server_version_num')::int number")).rows[0];
    check("real PostgreSQL 17", version.number >= 170000 && version.number < 180000, { version: version.version });
    await db.query(AUTH_STUB);
    for (const file of ["0001_accounts.sql", "20260818000000_progression_persistence.sql"]) {
      await db.query(fs.readFileSync(path.join(ROOT, "supabase/migrations", file), "utf8"));
    }
    await db.query("alter table public.player_identities add column if not exists erased_at timestamptz");
    await db.query("grant select,insert,update on public.profiles to authenticated; grant select on public.profiles to anon");
    console.log(JSON.stringify({ fixtures: ["AUTH_STUB (JWT sub via session GUC)", "0001_accounts.sql", "20260818000000_progression_persistence.sql",
      "erased_at timestamptz from 20261028000000_guest_first_game_welcome.sql", "Supabase-style profiles role grants"],
    limits: ["No Supabase Auth/JWT verification, PostgREST, Node service integration, or optional economy/mandali installed-schema certification"] }));
    const members = Array.from({ length: 121 }, () => crypto.randomUUID());
    for (const [index, id] of members.entries()) {
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)",
        [id, index === 1 ? "" : `local-${index}@example.invalid`, { display_name: `Local ${index}` }]);
    }
    const actor = members[0];
    const target = members[1];
    await db.query("insert into public.player_identities(player_id,kind,auth_user_id,created_at) values ($1::text,'member',$1::uuid, '2020-01-01T00:00:00Z')", [actor]);
    const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations", NAME), "utf8");
    try {
      await db.query(sql);
      check("migration applies", true);
    } catch (error) {
      check("migration applies", false, sqlError(error, sql));
      await db.query("rollback");
      return;
    }
    try {
      await db.query(sql);
      check("migration reapplies", true);
    } catch (error) {
      check("migration reapplies", false, sqlError(error, sql));
      await db.query("rollback");
    }
    check("backfill includes all 121 currently registered Auth users", (await db.query(
      "select count(*)::int count from public.player_identities where kind='member'")).rows[0].count === 121);
    check("backfill preserves an existing canonical identity", (await db.query(
      "select created_at='2020-01-01T00:00:00Z'::timestamptz preserved from public.player_identities where player_id=$1", [actor])).rows[0].preserved);
    const newMember = crypto.randomUUID();
    await db.query("insert into auth.users(id,email) values ($1,null)", [newMember]);
    check("Auth insert trigger registers canonical identity and profile", (await db.query(
      "select count(*)::int count from public.player_identities identity join public.profiles profile on profile.id=identity.auth_user_id where identity.player_id=$1 and identity.kind='member'", [newMember])).rows[0].count === 1);
    const guest = `guest_${crypto.randomBytes(16).toString("hex")}`;
    const blankGuest = `guest_${crypto.randomBytes(16).toString("hex")}`;
    const erasedGuest = `guest_${crypto.randomBytes(16).toString("hex")}`;
    for (const id of [guest, blankGuest, erasedGuest]) await db.query("insert into public.player_identities(player_id,kind) values ($1,'guest')", [id]);
    await db.query("update public.player_identities set erased_at=now() where player_id=$1", [erasedGuest]);
    await db.query("insert into public.player_profiles(player_id,display_name) values ($1,''),($2,'Target profile')", [blankGuest, target]);
    const service = await connect();
    const client = await connect();
    await service.query("set role service_role");
    for (const [name, run] of [
      ["directory", () => directoryChecks(service, actor, target, guest, blankGuest)],
      ["records", () => recordChecks(db, service, target)],
      ["moderation", () => moderationChecks(db, service, connect, actor, target)],
      ["roles/RLS", () => roleChecks(db, client, target, actor)],
    ]) {
      try { await run(); } catch (error) { check(`${name} runtime`, false, sqlError(error)); }
    }
    await db.query(fs.readFileSync(path.join(ROOT, "supabase/rollbacks", NAME), "utf8"));
    const remaining = (await db.query(`select
      to_regclass('public.player_moderation') is null and to_regclass('public.player_moderation_audit') is null and
      to_regclass('public.admin_player_summary_rows') is null and
      not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and (proname like 'admin_player_%' or proname in ('admin_suspended_players','admin_moderate_player','admin_identity_active','register_canonical_admin_identity'))) and
      not exists(select 1 from pg_attribute where attrelid='public.match_summaries'::regclass and attname='winner_kind' and not attisdropped) and
      not exists(select 1 from pg_policies where schemaname='public' and policyname like 'admin_active_profile_%') and
      not exists(select 1 from pg_trigger where tgname='register_canonical_admin_identity') as clean`)).rows[0];
    check("rollback removes all admin objects, policies, trigger and winner_kind", remaining.clean);
    check("rollback preserves backfilled identities and account schema", (await db.query(
      "select count(*)::int count from public.player_identities where kind='member'")).rows[0].count === 122);
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [target]);
    await client.query("set role authenticated");
    check("rollback restores suspended owner's original profile access", (await client.query("select * from public.profiles where id=$1", [target])).rowCount === 1);
  } finally {
    await Promise.all([...clients].map((client) => client.end().catch(() => {})));
    try {
      if (postgres) await postgres.stop();
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
      check("temporary database directory removed", !fs.existsSync(dataDir));
    }
  }
}

main().catch((error) => check("harness runtime", false, sqlError(error))).finally(() => {
  const failed = results.filter((result) => !result.passed);
  console.log(JSON.stringify({ summary: { passed: results.length - failed.length, failed: failed.length }, failures: failed }));
  process.exitCode = failed.length ? 1 : 0;
});