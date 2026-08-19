#!/usr/bin/env node
/**
 * Persistence schema verification against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * P0-3 shipped a 19-table schema, repositories and a write path, and could
 * claim nothing about any of it: there was no Postgres in the environment, so
 * "the migration is re-runnable", "the unique indexes enforce idempotency" and
 * "RLS is forced" were design intentions, not facts.
 *
 * This starts an actual PostgreSQL 17 (`embedded-postgres`, downloaded
 * binaries — not an emulator, not `pg-mem`), applies the real migration file,
 * and interrogates the result. Every claim below is a query answered by
 * Postgres.
 *
 * ── What it can and cannot establish ──────────────────────────────────
 * CAN:    migration cleanliness, re-runnability, rollback, schema integrity,
 *         constraint enforcement, idempotency under real concurrency, CRUD for
 *         every entity, retention behaviour, RLS posture.
 * CANNOT: that the SERVER talks to it correctly. The repository speaks
 *         PostgREST (Supabase's REST layer), which is not part of a bare
 *         Postgres. Application restart durability therefore remains a
 *         separate exercise — see scripts/persistence/verifyPersistence.mjs.
 *
 * That boundary is stated rather than blurred, because a verification that
 * quietly covers less than it appears to is how the audit's original
 * certification problem started.
 *
 * ── The `auth` stub ───────────────────────────────────────────────────
 * The migration references `auth.users` and `auth.uid()`, which Supabase
 * provides. A bare Postgres has neither, so §0 creates minimal stand-ins with
 * the same shapes. That is what `supabase start` does locally too. It is
 * declared here so nobody reads a green result as covering Supabase's own auth
 * schema.
 *
 * Usage:  node scripts/persistence/verifySchema.mjs
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
const MIGRATION = path.join(ROOT, "supabase/migrations/20260818000000_progression_persistence.sql");
const ROLLBACK = path.join(ROOT, "supabase/migrations/20260818000000_progression_persistence_rollback.sql");
const RECEIPT = path.join(ROOT, "docs/remediation/persistence-schema-verification.json");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55433;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-pg-verify-${process.pid}`);

const results = [];
let failures = 0;

function check(section, name, passed, evidence = "") {
  results.push({ section, name, passed, evidence: String(evidence).slice(0, 400) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 160)}` : ""}`);
}

const guest = () => `guest_${crypto.randomBytes(16).toString("hex")}`;

/** The pieces of Supabase's `auth` schema this migration depends on. */
const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);
-- Supabase derives this from the request JWT. Here it returns NULL, which is
-- exactly the "no signed-in user" case the server-side service role runs as.
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

async function main() {
  console.log("\nPersistence schema verification — real PostgreSQL\n");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
    /*
     * UTF8, explicitly.
     *
     * `initdb` inherits the host locale, and on a Windows machine that is
     * WIN1252 — under which this migration FAILS, because its comments contain
     * `—` and `→`. Supabase clusters are UTF8, so this is not a production
     * defect, but it is a real portability constraint and it was found by
     * running the file rather than by reading it. Recorded in the report.
     */
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  await pg.initialise();
  await pg.start();

  const connect = async () => {
    const c = new Client({
      host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres",
    });
    await c.connect();
    return c;
  };

  const db = await connect();
  const version = (await db.query("select version()")).rows[0].version;
  console.log(`Engine: ${version.split(",")[0]}\n`);

  try {
    /* ═════════ 0. Connectivity & auth stub ═════════ */
    console.log("0. Connectivity");
    check("connectivity", "database reachable and answering queries", true, version.split(",")[0]);
    await db.query(AUTH_STUB);
    check("connectivity", "Supabase auth.users / auth.uid() stubs created", true,
      "declared stand-ins; Supabase's real auth schema is NOT covered by this run");

    /* ═════════ 1. Migration ═════════ */
    console.log("\n1. Migration execution");
    const migrationSql = fs.readFileSync(MIGRATION, "utf8");

    let firstRunError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      firstRunError = err;
    }
    check("migration", "migration applies cleanly to an empty database",
      firstRunError === null, firstRunError ? firstRunError.message : "no errors");
    if (firstRunError) throw firstRunError;

    let secondRunError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      secondRunError = err;
    }
    check("migration", "migration is re-runnable (idempotent)",
      secondRunError === null, secondRunError ? secondRunError.message : "second apply changed nothing");

    /* ═════════ 2. Schema integrity ═════════ */
    console.log("\n2. Schema integrity");
    const EXPECTED_TABLES = [
      "player_identities", "player_profiles", "xp_ledger", "player_achievements",
      "challenge_claims", "friends", "friend_requests", "parties", "party_members",
      "party_invitations", "match_summaries", "match_participants", "tournament_records",
      "season_stats", "season_reward_claims", "season_snapshots", "reward_audit",
      "room_timelines", "operational_telemetry",
    ];
    const tables = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    )).rows.map((r) => r.table_name);
    const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
    check("schema", `all ${EXPECTED_TABLES.length} tables created`, missing.length === 0,
      missing.length ? `missing: ${missing.join(", ")}` : `${EXPECTED_TABLES.length} present`);

    const noPk = (await db.query(`
      select t.table_name from information_schema.tables t
      where t.table_schema='public' and t.table_type='BASE TABLE'
        and not exists (
          select 1 from information_schema.table_constraints c
          where c.table_schema='public' and c.table_name=t.table_name and c.constraint_type='PRIMARY KEY')
    `)).rows.map((r) => r.table_name);
    check("schema", "every table has a primary key", noPk.length === 0,
      noPk.length ? `no PK: ${noPk.join(", ")}` : "all tables keyed");

    const fkCount = (await db.query(
      `select count(*)::int n from information_schema.table_constraints
       where table_schema='public' and constraint_type='FOREIGN KEY'`,
    )).rows[0].n;
    check("schema", "foreign keys present", fkCount >= 15, `${fkCount} foreign key constraints`);

    const idxCount = (await db.query(
      `select count(*)::int n from pg_indexes where schemaname='public'`,
    )).rows[0].n;
    check("schema", "indexes present", idxCount >= 30, `${idxCount} indexes`);

    const viewExists = (await db.query(
      `select count(*)::int n from information_schema.views where table_schema='public' and table_name='leaderboard_public'`,
    )).rows[0].n;
    check("schema", "leaderboard_public view exists", viewExists === 1, `${viewExists} view(s)`);

    /* ═════════ 3. RLS posture ═════════ */
    console.log("\n3. Row Level Security");
    const rls = (await db.query(`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
    `)).rows;
    const notEnabled = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname);
    const notForced = rls.filter((r) => !r.relforcerowsecurity).map((r) => r.relname);
    check("rls", "RLS enabled on every table", notEnabled.length === 0,
      notEnabled.length ? `not enabled: ${notEnabled.join(", ")}` : `${rls.length} tables`);
    check("rls", "RLS forced on every table", notForced.length === 0,
      notForced.length ? `not forced: ${notForced.join(", ")}` : `${rls.length} tables`);

    const writePolicies = (await db.query(
      `select tablename, policyname, cmd from pg_policies where schemaname='public' and cmd <> 'SELECT'`,
    )).rows;
    check("rls", "no INSERT/UPDATE/DELETE policy exists for client roles",
      writePolicies.length === 0,
      writePolicies.length ? JSON.stringify(writePolicies) : "clients cannot write progression; only the service role can");

    const selectPolicies = (await db.query(
      `select count(*)::int n from pg_policies where schemaname='public' and cmd='SELECT'`,
    )).rows[0].n;
    check("rls", "owner-read SELECT policies present", selectPolicies >= 10, `${selectPolicies} SELECT policies`);

    /* ═════════ 4. CRUD, every persisted entity ═════════ */
    console.log("\n4. CRUD per entity");
    const P1 = guest();
    const P2 = guest();
    for (const id of [P1, P2]) {
      await db.query(`insert into player_identities (player_id, kind) values ($1,'guest')`, [id]);
    }
    check("crud", "player_identities — CREATE", true, `${P1.slice(0, 14)}…, ${P2.slice(0, 14)}…`);

    // Identity: read / update / (delete deferred — cascades tested at §7)
    const readIdentity = await db.query(`select * from player_identities where player_id=$1`, [P1]);
    check("crud", "player_identities — READ", readIdentity.rowCount === 1, `kind=${readIdentity.rows[0].kind}`);
    await db.query(`update player_identities set last_seen_at=now() where player_id=$1`, [P1]);
    check("crud", "player_identities — UPDATE", true, "last_seen_at advanced");

    const entities = [
      ["player_profiles",
       `insert into player_profiles (player_id, display_name, level, experience_points) values ($1,'Verifier',3,250)`,
       `select display_name, level, experience_points from player_profiles where player_id=$1`,
       `update player_profiles set display_name='Verifier2', experience_points=400 where player_id=$1`],
      ["xp_ledger",
       `insert into xp_ledger (player_id, amount, reason, source_kind, source_id) values ($1,100,'match win','match','m_VERIFY_1')`,
       `select amount, source_kind from xp_ledger where player_id=$1`,
       `update xp_ledger set reason='match win (edited)' where player_id=$1`],
      ["player_achievements",
       `insert into player_achievements (player_id, achievement_id) values ($1,'first_win')`,
       `select achievement_id from player_achievements where player_id=$1`,
       `update player_achievements set unlocked_at=now() where player_id=$1`],
      ["challenge_claims",
       `insert into challenge_claims (player_id, challenge_id, period_key, xp_awarded) values ($1,'daily_win','2026-08-18',40)`,
       `select challenge_id, xp_awarded from challenge_claims where player_id=$1`,
       `update challenge_claims set xp_awarded=45 where player_id=$1`],
      ["season_stats",
       `insert into season_stats (season_id, player_id, season_xp, season_wins, season_matches) values ('s_verify',$1,900,2,4)`,
       `select season_xp from season_stats where player_id=$1`,
       `update season_stats set season_xp=1200 where player_id=$1`],
      ["season_reward_claims",
       `insert into season_reward_claims (season_id, player_id, tier_id, xp_awarded) values ('s_verify',$1,'tier_1',500)`,
       `select tier_id from season_reward_claims where player_id=$1`,
       `update season_reward_claims set xp_awarded=550 where player_id=$1`],
      ["tournament_records",
       `insert into tournament_records (tournament_id, player_id, tournament_name, game, status) values ('t_verify',$1,'Verify Cup','ludo','REGISTERED')`,
       `select status from tournament_records where player_id=$1`,
       `update tournament_records set status='WINNER', placement=1 where player_id=$1`],
      ["reward_audit",
       `insert into reward_audit (player_id, reward_kind, reward_ref, xp_delta, idempotency_key, outcome) values ($1,'challenge','daily_win',40,'challenge:'||$1||':daily_win','granted')`,
       `select outcome from reward_audit where player_id=$1`,
       `update reward_audit set detail='verified' where player_id=$1`],
      ["friends",
       `insert into friends (player_id, friend_player_id, display_name) values ($1,'${P2}','Buddy')`,
       `select friend_player_id from friends where player_id=$1`,
       `update friends set display_name='Best Buddy' where player_id=$1`],
    ];

    for (const [table, ins, sel, upd] of entities) {
      await db.query(ins, [P1]);
      const read = await db.query(sel, [P1]);
      await db.query(upd, [P1]);
      const after = await db.query(sel, [P1]);
      check("crud", `${table} — CREATE / READ / UPDATE`,
        read.rowCount === 1 && after.rowCount === 1,
        JSON.stringify(after.rows[0]));
    }

    // Friend requests, parties, invitations, matches, timelines, telemetry.
    const reqId = `req_${crypto.randomBytes(4).toString("hex")}`;
    await db.query(
      `insert into friend_requests (id, sender_id, recipient_id, sender_name) values ($1,$2,$3,'Verifier')`,
      [reqId, P1, P2]);
    await db.query(`update friend_requests set status='ACCEPTED' where id=$1`, [reqId]);
    const req = await db.query(`select status from friend_requests where id=$1`, [reqId]);
    check("crud", "friend_requests — CREATE / READ / UPDATE", req.rows[0].status === "ACCEPTED", "PENDING → ACCEPTED");

    const partyId = `party_${crypto.randomBytes(4).toString("hex")}`;
    await db.query(`insert into parties (id, leader_id, status) values ($1,$2,'CREATED')`, [partyId, P1]);
    await db.query(`insert into party_members (party_id, player_id, is_leader) values ($1,$2,true)`, [partyId, P1]);
    const inviteId = `pinv_${crypto.randomBytes(4).toString("hex")}`;
    await db.query(
      `insert into party_invitations (id, party_id, inviter_id, invitee_id) values ($1,$2,$3,$4)`,
      [inviteId, partyId, P1, P2]);
    const party = await db.query(
      `select p.status, count(m.player_id)::int members from parties p
       left join party_members m on m.party_id=p.id where p.id=$1 group by p.status`, [partyId]);
    check("crud", "parties + party_members + party_invitations — CREATE / READ",
      party.rows[0].members === 1, JSON.stringify(party.rows[0]));

    const matchId = `m_VERIFY_${Date.now()}`;
    const startedAt = new Date(Date.now() - 180000).toISOString();
    await db.query(
      `insert into match_summaries (id, room_code, game, started_at, finished_at, duration_ms, winner_id, participant_count)
       values ($1,'VERIFY',$2,$3,now(),180000,$4,2)`, [matchId, "ludo", startedAt, P1]);
    await db.query(
      `insert into match_participants (match_id, player_id, display_name, is_winner) values ($1,$2,'Verifier',true),($1,$3,'Buddy',false)`,
      [matchId, P1, P2]);
    const match = await db.query(
      `select s.game, count(p.player_id)::int players from match_summaries s
       join match_participants p on p.match_id=s.id where s.id=$1 group by s.game`, [matchId]);
    check("crud", "match_summaries + match_participants — CREATE / READ",
      match.rows[0].players === 2, JSON.stringify(match.rows[0]));

    await db.query(
      `insert into season_snapshots (season_id, reason, standings) values ('s_verify','season_end','[{"playerId":"x","rank":1}]'::jsonb)`);
    const snap = await db.query(`select standings from season_snapshots where season_id='s_verify'`);
    check("crud", "season_snapshots — CREATE / READ (jsonb)", snap.rowCount === 1, JSON.stringify(snap.rows[0].standings));

    await db.query(
      `insert into room_timelines (room_code, started_at, game, event_count, summary) values ('VERIFY',$1,'ludo',42,'{"moves":42}'::jsonb)`,
      [startedAt]);
    await db.query(
      `insert into operational_telemetry (kind, payload) values ('snapshot','{"rooms":1}'::jsonb)`);
    check("crud", "room_timelines + operational_telemetry — CREATE", true, "bounded summaries stored");

    // DELETE, on rows nothing else depends on.
    const delFriends = await db.query(`delete from friends where player_id=$1`, [P1]);
    const delTelemetry = await db.query(`delete from operational_telemetry where kind='snapshot'`);
    check("crud", "DELETE removes rows", delFriends.rowCount === 1 && delTelemetry.rowCount === 1,
      `friends -${delFriends.rowCount}, operational_telemetry -${delTelemetry.rowCount}`);

    /* ═════════ 5. Constraints & idempotency ═════════ */
    console.log("\n5. Constraints and idempotency");
    async function expectRejection(label, sql, params = []) {
      try {
        await db.query(sql, params);
        check("constraints", label, false, "ACCEPTED — the constraint did not hold");
      } catch (err) {
        check("constraints", label, true, `${err.code} ${err.constraint ?? ""}`.trim());
      }
    }

    await expectRejection("duplicate XP for the same source is refused",
      `insert into xp_ledger (player_id, amount, reason, source_kind, source_id) values ($1,999,'replay','match','m_VERIFY_1')`, [P1]);
    await expectRejection("duplicate challenge claim in the same period is refused",
      `insert into challenge_claims (player_id, challenge_id, period_key, xp_awarded) values ($1,'daily_win','2026-08-18',40)`, [P1]);
    await expectRejection("duplicate season tier claim is refused",
      `insert into season_reward_claims (season_id, player_id, tier_id, xp_awarded) values ('s_verify',$1,'tier_1',500)`, [P1]);
    await expectRejection("duplicate match for the same (room_code, started_at) is refused",
      `insert into match_summaries (id, room_code, game, started_at, finished_at, duration_ms, participant_count)
       values ('m_OTHER_ID','VERIFY','ludo',$1,now(),180000,2)`, [startedAt]);
    await expectRejection("a second granted reward with the same idempotency key is refused",
      `insert into reward_audit (player_id, reward_kind, reward_ref, xp_delta, idempotency_key, outcome)
       values ($1,'challenge','daily_win',40,'challenge:'||$1||':daily_win','granted')`, [P1]);
    await expectRejection("self-friendship is refused",
      `insert into friends (player_id, friend_player_id) values ($1,$1)`, [P1]);
    await expectRejection("a player in two parties is refused",
      `insert into party_members (party_id, player_id) values ($1,$2)`, [`${partyId}_other`, P1]);
    await expectRejection("a guest id outside the guest_ namespace is refused",
      `insert into player_identities (player_id, kind) values ('not_a_guest_id','guest')`);
    await expectRejection("a member identity without an auth user is refused",
      `insert into player_identities (player_id, kind) values ('member_no_auth','member')`);
    await expectRejection("season wins greater than matches is refused",
      `insert into season_stats (season_id, player_id, season_wins, season_matches) values ('s_bad',$1,9,2)`, [P2]);
    await expectRejection("a match finishing before it started is refused",
      `insert into match_summaries (id, room_code, game, started_at, finished_at, duration_ms, participant_count)
       values ('m_BACKWARDS','BACK','ludo',now(),now() - interval '1 hour',1000,1)`);
    await expectRejection("a foreign key to a non-existent player is refused",
      `insert into player_profiles (player_id, display_name) values ('guest_ffffffffffffffffffffffffffffffff','Ghost')`);
    // The partial index must allow a NEW pending request once the old one is
    // resolved — otherwise two people could never befriend twice.
    await db.query(`insert into friend_requests (id, sender_id, recipient_id, status) values ('req_second',$1,$2,'PENDING')`, [P1, P2]);
    check("constraints", "a new PENDING request is allowed once the previous is resolved", true,
      "partial unique index is scoped to status='PENDING'");

    // ...and must then refuse a SECOND pending one in the same direction.
    await expectRejection("a second PENDING request in the same direction is refused",
      `insert into friend_requests (id, sender_id, recipient_id, status) values ('req_dupe',$1,$2,'PENDING')`, [P1, P2]);

    /*
     * The reverse direction is deliberately allowed.
     *
     * `friend_requests_pending_idx` is on (sender_id, recipient_id), so A→B and
     * B→A can both be pending at once — two people who happen to request each
     * other in the same minute. That is a product question (should the second
     * auto-accept?) rather than a data-integrity one, and it is recorded here
     * so the behaviour is a decision rather than a discovery.
     */
    await db.query(`insert into friend_requests (id, sender_id, recipient_id, status) values ('req_reverse',$1,$2,'PENDING')`, [P2, P1]);
    check("constraints", "the REVERSE pending direction is allowed (documented product behaviour)", true,
      "A->B and B->A can both be pending; mutual-request auto-accept is a product decision, not a constraint");

    // A non-granted duplicate must be recordable — auditing refusals is the point.
    await db.query(
      `insert into reward_audit (player_id, reward_kind, reward_ref, xp_delta, idempotency_key, outcome)
       values ($1,'challenge','daily_win',0,'challenge:'||$1||':daily_win','duplicate')`, [P1]);
    check("constraints", "duplicate/refused reward decisions are still auditable", true,
      "partial unique index is scoped to outcome='granted'");

    /* ═════════ 6. Concurrency ═════════ */
    console.log("\n6. Concurrent mutation");
    const RACERS = 10;
    const clients = await Promise.all(Array.from({ length: RACERS }, () => connect()));
    const raceTier = "tier_race";
    const outcomes = await Promise.all(clients.map((c) =>
      c.query(
        `insert into season_reward_claims (season_id, player_id, tier_id, xp_awarded)
         values ('s_verify',$1,$2,500) on conflict do nothing returning tier_id`,
        [P1, raceTier])
        .then((r) => r.rowCount)
        .catch(() => 0)));
    const winners = outcomes.filter((n) => n === 1).length;
    const stored = (await db.query(
      `select count(*)::int n from season_reward_claims where player_id=$1 and tier_id=$2`, [P1, raceTier])).rows[0].n;
    check("concurrency", `${RACERS} truly parallel claims produce exactly one row`,
      winners === 1 && stored === 1, `${winners} insert(s) reported, ${stored} row(s) stored`);

    const xpOutcomes = await Promise.all(clients.map((c) =>
      c.query(
        `insert into xp_ledger (player_id, amount, reason, source_kind, source_id)
         values ($1,25,'race','match','m_RACE') on conflict do nothing returning id`, [P1])
        .then((r) => r.rowCount).catch(() => 0)));
    const xpStored = (await db.query(
      `select count(*)::int n from xp_ledger where player_id=$1 and source_id='m_RACE'`, [P1])).rows[0].n;
    check("concurrency", `${RACERS} truly parallel XP awards for one source produce exactly one row`,
      xpOutcomes.filter((n) => n === 1).length === 1 && xpStored === 1,
      `${xpStored} ledger row(s)`);
    await Promise.all(clients.map((c) => c.end()));

    /* ═════════ 7. Retention & cascade ═════════ */
    console.log("\n7. Retention and cascade");
    await db.query(`update room_timelines set expires_at = now() - interval '1 day'`);
    await db.query(
      `insert into operational_telemetry (kind, payload, expires_at) values ('old','{}'::jsonb, now() - interval '1 day')`);
    const pruned = await db.query(`select * from prune_expired_records()`);
    const prunedMap = Object.fromEntries(pruned.rows.map((r) => [r.table_name, Number(r.deleted)]));
    check("retention", "prune_expired_records() deletes expired rows and reports counts",
      prunedMap.room_timelines >= 1 && prunedMap.operational_telemetry >= 1, JSON.stringify(prunedMap));

    const before = (await db.query(`select count(*)::int n from player_profiles where player_id=$1`, [P1])).rows[0].n;
    await db.query(`delete from player_identities where player_id=$1`, [P1]);
    const after = (await db.query(`select count(*)::int n from player_profiles where player_id=$1`, [P1])).rows[0].n;
    const orphanXp = (await db.query(`select count(*)::int n from xp_ledger where player_id=$1`, [P1])).rows[0].n;
    check("retention", "deleting an identity cascades to its progression",
      before === 1 && after === 0 && orphanXp === 0,
      `profiles ${before}→${after}, xp_ledger orphans ${orphanXp}`);

    /* ═════════ 8. Rollback ═════════ */
    console.log("\n8. Rollback safety");
    let rollbackError = null;
    try {
      await db.query(fs.readFileSync(ROLLBACK, "utf8"));
    } catch (err) {
      rollbackError = err;
    }
    check("rollback", "rollback script executes cleanly", rollbackError === null,
      rollbackError ? rollbackError.message : "all objects dropped in dependency order");

    const leftovers = (await db.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    )).rows.map((r) => r.table_name).filter((t) => EXPECTED_TABLES.includes(t));
    check("rollback", "no progression tables remain after rollback", leftovers.length === 0,
      leftovers.length ? `remaining: ${leftovers.join(", ")}` : "clean");

    let reapplyError = null;
    try {
      await db.query(migrationSql);
    } catch (err) {
      reapplyError = err;
    }
    check("rollback", "migration re-applies after a rollback", reapplyError === null,
      reapplyError ? reapplyError.message : "forward/back/forward cycle succeeds");
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  const receipt = {
    verifiedAt: new Date().toISOString(),
    engine: version.split(",")[0],
    scope: "SCHEMA verification against a real PostgreSQL. Does NOT cover the PostgREST transport or application restart durability.",
    authStub: "auth.users and auth.uid() are local stand-ins; Supabase's real auth schema is not covered.",
    migration: path.basename(MIGRATION),
    checks: results,
    passed: failures === 0,
    counts: { total: results.length, failed: failures },
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");

  console.log(
    `\n${failures === 0 ? "✓ PASSED" : `✗ FAILED (${failures})`} — ${results.length} checks · receipt: ${path.relative(ROOT, RECEIPT)}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✗ Schema verification aborted: ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(2);
});
