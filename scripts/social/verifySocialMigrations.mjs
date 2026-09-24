#!/usr/bin/env node
/**
 * The social-graph migrations, executed against a REAL PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The repository tests run against an in-memory store, which has no idea what a
 * check constraint, a cascade, a collation or a primary-key race is. So none of
 * the rules the migrations declare — "a pair is stored smaller-id-first", "a
 * report reason is one of six", "erasing an account erases its blocks" — is
 * established by them. This applies the real files to a real engine
 * (`embedded-postgres`, actual PostgreSQL binaries, not an emulator) and then
 * tries to break every rule, one attempt at a time.
 *
 * ── What it can and cannot establish ──────────────────────────────────
 * CAN:    the SQL is valid and re-runnable, constraints refuse what they should
 *         and accept what they should, cascades reach every row, RLS is forced
 *         with nothing granted, and a primary-key claim is won by exactly one of
 *         several concurrent connections.
 * CANNOT: that the SERVER talks to it correctly (it speaks PostgREST, which a
 *         bare Postgres does not have), or anything about Supabase's own
 *         `auth` schema — the parent table needs `auth.users`, so local
 *         stand-ins are created, exactly as scripts/persistence/verifySchema.mjs
 *         does. Guests are used throughout so no auth user is needed.
 *
 * Usage:  node scripts/social/verifySocialMigrations.mjs
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
const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");

/** The parent table, then the social migrations in order. */
const BASE = "20260818000000_progression_persistence.sql";
const SOCIAL = ["20261007000000_player_blocks_and_reports.sql", "20261008000000_friendship_history.sql"];

const PORT = Number(process.env.VERIFY_PG_PORT) || 55434;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-social-verify-${process.pid}`);

const TABLES = [
  "player_blocks",
  "player_reports",
  "friendship_pairs",
  "friendship_milestones",
  "friendship_processed_matches",
];

const REPORT_REASONS = ["HARASSMENT", "SPAM", "CHEATING", "INAPPROPRIATE_NAME", "IMPERSONATION", "OTHER"];
const MILESTONE_KINDS = [
  "FRIENDS_SINCE", "FIRST_MATCH", "FIRST_WIN", "MATCHES_10", "MATCHES_50",
  "MATCHES_100", "MATCHES_500", "MATCHES_1000", "FIRST_TOURNAMENT",
];

let failures = 0;
let total = 0;

function check(name, passed, evidence = "") {
  total += 1;
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 150)}` : ""}`);
}

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

const guest = (tag = "") => `guest_${tag}${crypto.randomBytes(12).toString("hex")}`;
/** A pair, smaller id first — by BYTE value, as the server orders them. */
const ordered = (a, b) => (a < b ? [a, b] : [b, a]);

async function main() {
  console.log("\nSocial-graph migrations — real PostgreSQL\n");

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
  console.log(`Engine: ${(await db.query("select version()")).rows[0].version.split(",")[0]}\n`);

  /** Runs `sql` in a transaction that is always rolled back; returns the error, or null. */
  const attempt = async (sql, params = []) => {
    await db.query("begin");
    try {
      await db.query(sql, params);
      return null;
    } catch (err) {
      return err;
    } finally {
      await db.query("rollback");
    }
  };
  const refuses = async (name, sql, params, mention) => {
    const err = await attempt(sql, params);
    check(name, err !== null && (!mention || String(err.message + (err.constraint ?? "")).includes(mention)),
      err ? err.message : "it was ACCEPTED");
  };
  const accepts = async (name, sql, params) => {
    const err = await attempt(sql, params);
    check(name, err === null, err ? err.message : "accepted");
  };
  const identity = (id) => db.query(
    "insert into public.player_identities (player_id, kind) values ($1, 'guest') on conflict do nothing", [id]);

  try {
    /* ═════════ 1. Applying the migrations ═════════ */
    console.log("1. Applying the migrations");
    await db.query(AUTH_STUB);
    await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, BASE), "utf8"));
    check("the parent (progression) migration applies", true, BASE);

    for (const file of SOCIAL) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      let first = null;
      let second = null;
      try { await db.query(sql); } catch (err) { first = err; }
      check(`${file} applies to a database that has the parent tables`, first === null, first?.message ?? "no errors");
      if (first) throw first;
      try { await db.query(sql); } catch (err) { second = err; }
      check(`${file} is re-runnable`, second === null, second?.message ?? "no errors on the second run");
    }

    const versions = SOCIAL.map((f) => f.split("_")[0]);
    check("the migration versions are unique and later than every earlier one",
      new Set(versions).size === versions.length && versions.every((v) => v > BASE.split("_")[0]), versions.join(", "));

    /* ═════════ 2. Blocks and reports ═════════ */
    console.log("\n2. player_blocks and player_reports");
    const [a, b, c] = [guest(), guest(), guest()];
    for (const id of [a, b, c]) await identity(id);

    await accepts("a block is accepted", "insert into public.player_blocks (blocker_id, blocked_id) values ($1, $2)", [a, b]);
    await db.query("insert into public.player_blocks (blocker_id, blocked_id) values ($1, $2)", [a, b]);
    await refuses("the same block twice is refused (primary key)",
      "insert into public.player_blocks (blocker_id, blocked_id) values ($1, $2)", [a, b], "player_blocks_pkey");
    await accepts("the reverse block is a separate, allowed row",
      "insert into public.player_blocks (blocker_id, blocked_id) values ($1, $2)", [b, a]);
    await refuses("blocking yourself is refused",
      "insert into public.player_blocks (blocker_id, blocked_id) values ($1, $1)", [a], "player_blocks_no_self");
    await refuses("blocking a player who does not exist is refused (foreign key)",
      "insert into public.player_blocks (blocker_id, blocked_id) values ($1, $2)", [a, "guest_nobody"], "foreign key");

    for (const reason of REPORT_REASONS) {
      await accepts(`a report for ${reason} is accepted`,
        "insert into public.player_reports (id, reporter_id, reported_id, reason) values ($1, $2, $3, $4)",
        [`rep_${reason}`, a, c, reason]);
    }
    await refuses("a reason outside the list is refused",
      "insert into public.player_reports (id, reporter_id, reported_id, reason) values ('r1', $1, $2, 'harassment')",
      [a, c], "reason");
    await refuses("reporting yourself is refused",
      "insert into public.player_reports (id, reporter_id, reported_id, reason) values ('r2', $1, $1, 'SPAM')",
      [a], "player_reports_no_self");

    await db.query("insert into public.player_reports (id, reporter_id, reported_id, reason) values ('rep_keep', $1, $2, 'SPAM')", [b, c]);
    await db.query("delete from public.player_identities where player_id = $1", [c]);
    const leftBlocks = (await db.query("select count(*)::int n from public.player_blocks where blocker_id = $1 or blocked_id = $1", [c])).rows[0].n;
    const leftReports = (await db.query("select count(*)::int n from public.player_reports where reporter_id = $1 or reported_id = $1", [c])).rows[0].n;
    check("erasing an account erases the reports made about it and by it", leftReports === 0, `${leftReports} left`);
    check("erasing an account leaves no block naming it", leftBlocks === 0, `${leftBlocks} left`);
    await db.query("delete from public.player_identities where player_id = $1", [b]);
    const blocksByA = (await db.query("select count(*)::int n from public.player_blocks where blocker_id = $1", [a])).rows[0].n;
    check("erasing the BLOCKED account removes the blocker's row for it", blocksByA === 0, `${blocksByA} left`);

    /* ═════════ 3. Friendship pairs ═════════ */
    console.log("\n3. friendship_pairs");
    const [p, q, r] = [guest("m"), guest("m"), guest("m")];
    for (const id of [p, q, r]) await identity(id);
    const [low, high] = ordered(p, q);
    const insertPair = (l, h, extra = {}) => {
      const cols = { matches_together: 3, wins_together: 1, tournaments_together: 0, current_daily_streak: 2, best_daily_streak: 5, ...extra };
      const names = Object.keys(cols);
      return [
        `insert into public.friendship_pairs (player_low, player_high, ${names.join(", ")}) values ($1, $2, ${names.map((_, i) => `$${i + 3}`).join(", ")})`,
        [l, h, ...Object.values(cols)],
      ];
    };

    await accepts("an ordered pair is accepted", ...insertPair(low, high));
    await refuses("the same pair the wrong way round is refused", ...insertPair(high, low), "friendship_pairs_ordered");
    await refuses("a player paired with themselves is refused", ...insertPair(low, low), "friendship_pairs_ordered");
    await refuses("more wins than matches is refused", ...insertPair(low, high, { wins_together: 4 }), "friendship_pairs_wins_within_matches");
    await refuses("more tournaments than matches is refused", ...insertPair(low, high, { tournaments_together: 4 }), "friendship_pairs_tournaments_within_matches");
    await refuses("a best streak below the current one is refused", ...insertPair(low, high, { best_daily_streak: 1 }), "friendship_pairs_best_streak");
    await refuses("a negative count is refused", ...insertPair(low, high, { matches_together: -1, wins_together: 0 }), "matches_together");

    await db.query(...insertPair(low, high));
    const upsert = await db.query(
      `insert into public.friendship_pairs (player_low, player_high, matches_together, streak_last_day)
       values ($1, $2, 4, '2026-03-11')
       on conflict (player_low, player_high) do update set matches_together = excluded.matches_together, streak_last_day = excluded.streak_last_day
       returning matches_together, to_char(streak_last_day, 'YYYY-MM-DD') as day`, [low, high]);
    check("an upsert on (low, high) overwrites the row, as the server's save does",
      upsert.rows[0].matches_together === 4 && upsert.rows[0].day === "2026-03-11", JSON.stringify(upsert.rows[0]));

    /* The order check must agree with the SERVER's byte ordering, not the
     * database's locale: 'B' (0x42) sorts before 'a' (0x61) by byte value. */
    const [upper, lower] = [`guest_B${crypto.randomBytes(6).toString("hex")}`, `guest_a${crypto.randomBytes(6).toString("hex")}`];
    for (const id of [upper, lower]) await identity(id);
    check("(sanity) the server's ordering puts an upper-case id before a lower-case one", upper < lower);
    await accepts("the pair is accepted in the SERVER's byte order (upper-case id first)", ...insertPair(upper, lower));
    await refuses("and refused in the opposite order, whatever the database's locale", ...insertPair(lower, upper), "friendship_pairs_ordered");

    /* This cluster is C-locale, so on its own it cannot show the clause was NEEDED.
     * A locale-aware collation can: there 'a' sorts before 'B', the opposite of
     * byte order — which is exactly the disagreement the clause protects against. */
    try {
      await db.query("create collation if not exists social_verify_en (provider = icu, locale = 'en-US')");
      const aware = (await db.query(
        `select ('guest_B' collate social_verify_en < 'guest_a' collate social_verify_en) as aware_b_first,
                ('guest_B' collate "C" < 'guest_a' collate "C") as byte_b_first`)).rows[0];
      check("a locale-aware collation orders these two ids OPPOSITE to byte order, so COLLATE \"C\" was needed",
        aware.aware_b_first === false && aware.byte_b_first === true, JSON.stringify(aware));
    } catch (err) {
      console.log(`  – (skipped) this PostgreSQL build has no ICU collations, so the necessity of COLLATE "C" is not demonstrated here: ${err.message}`);
    }

    /* ═════════ 4. Milestones ═════════ */
    console.log("\n4. friendship_milestones");
    for (const kind of MILESTONE_KINDS) {
      await accepts(`the ${kind} milestone is accepted`,
        "insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, $3, now())", [low, high, kind]);
    }
    await refuses("a kind outside the closed list is refused",
      "insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, 'MADE_UP', now())", [low, high], "kind");
    await refuses("the pair the wrong way round is refused",
      "insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, 'FIRST_MATCH', now())", [high, low], "friendship_milestones_ordered");

    await db.query("insert into public.friendship_milestones (player_low, player_high, kind, reached_at, match_id) values ($1, $2, 'FIRST_MATCH', now(), 'm_first')", [low, high]);
    await refuses("the same kind twice for one pair is refused",
      "insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, 'FIRST_MATCH', now())", [low, high], "friendship_milestones_pkey");
    const ignored = await db.query(
      "insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, 'FIRST_MATCH', now()) on conflict do nothing", [low, high]);
    check("inserting an existing kind with 'ignore duplicates' writes nothing, as the server's add relies on", ignored.rowCount === 0, `rowCount ${ignored.rowCount}`);
    await accepts("a milestone with no match is accepted (FRIENDS_SINCE has none)",
      "insert into public.friendship_milestones (player_low, player_high, kind, reached_at, match_id) values ($1, $2, 'FRIENDS_SINCE', now(), null)", [upper, lower]);

    /* ═════════ 5. Matches counted once ═════════ */
    console.log("\n5. friendship_processed_matches");
    const claim = async (client, id) => (await client.query(
      "insert into public.friendship_processed_matches (match_id) values ($1) on conflict do nothing", [id])).rowCount;
    const solo = `m_SOLO_${Date.now()}`;
    const firstClaim = await claim(db, solo);
    const secondClaim = await claim(db, solo);
    check("a match is claimed once: the first insert writes, the repeat writes nothing", firstClaim === 1 && secondClaim === 0, `${firstClaim}, ${secondClaim}`);

    const racers = await Promise.all(Array.from({ length: 8 }, connect));
    const raced = `m_RACE_${Date.now()}`;
    const wins = (await Promise.all(racers.map((client) => claim(client, raced)))).reduce((sum, n) => sum + n, 0);
    await Promise.all(racers.map((client) => client.end()));
    check("of 8 simultaneous connections claiming one match, exactly one wins", wins === 1, `${wins} won`);

    /* ═════════ 6. Erasure, RLS and indexes ═════════ */
    console.log("\n6. Erasure, row-level security and indexes");
    await db.query("insert into public.friendship_milestones (player_low, player_high, kind, reached_at) values ($1, $2, 'MATCHES_10', now()) on conflict do nothing", [low, high]);
    await db.query("delete from public.player_identities where player_id = $1", [low]);
    const pairsLeft = (await db.query("select count(*)::int n from public.friendship_pairs where player_low = $1 or player_high = $1", [low])).rows[0].n;
    const milestonesLeft = (await db.query("select count(*)::int n from public.friendship_milestones where player_low = $1 or player_high = $1", [low])).rows[0].n;
    check("erasing an account erases its shared history and milestones", pairsLeft === 0 && milestonesLeft === 0, `${pairsLeft} pairs, ${milestonesLeft} milestones left`);

    const rls = (await db.query(
      "select relname, relrowsecurity, relforcerowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = any($1)", [TABLES])).rows;
    check("every social table exists", rls.length === TABLES.length, rls.map((t) => t.relname).join(", "));
    for (const t of rls) {
      check(`${t.relname}: row-level security is enabled AND forced`, t.relrowsecurity && t.relforcerowsecurity);
      for (const role of ["anon", "authenticated"]) {
        const priv = (await db.query(
          "select has_table_privilege($1, $2, 'SELECT') as s, has_table_privilege($1, $2, 'INSERT') as i, has_table_privilege($1, $2, 'DELETE') as d",
          [role, `public.${t.relname}`])).rows[0];
        check(`${t.relname}: ${role} can read, write and delete nothing`, !priv.s && !priv.i && !priv.d, JSON.stringify(priv));
      }
    }

    const indexes = (await db.query("select indexname from pg_indexes where schemaname = 'public'")).rows.map((r) => r.indexname);
    for (const idx of [
      "player_blocks_blocked_idx", "player_reports_reporter_idx", "player_reports_created_idx", "player_reports_reported_idx",
      "friendship_pairs_high_idx", "friendship_milestones_high_idx",
    ]) {
      check(`index ${idx} exists`, indexes.includes(idx));
    }
  } finally {
    await db.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log(`\n${failures === 0 ? "✓ PASSED" : `✗ FAILED (${failures})`} — ${total} checks\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✗ Social migration verification aborted: ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(2);
});
