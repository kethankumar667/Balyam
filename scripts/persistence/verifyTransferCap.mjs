/**
 * Verifies the in-transaction daily transfer cap against a REAL PostgreSQL.
 *
 * The cap exists so that parallel sends — or two server instances — cannot each
 * read the same day's total and all pass. An in-memory test cannot show that,
 * because the thing being proved is row locking. This applies the economy
 * migration, the P2P transfer migration and the cap migration to a throwaway
 * embedded Postgres and fires concurrent transfers from separate connections.
 *
 * Prints TRANSFER_CAP_VERIFIED and exits 0 only if every check passed.
 *
 * Usage:  node scripts/persistence/verifyTransferCap.mjs
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
const MIGRATIONS = path.join(ROOT, "supabase/migrations");
const read = (name) => fs.readFileSync(path.join(MIGRATIONS, name), "utf8");
const ROLLBACK = path.join(ROOT, "supabase/rollbacks/20261013000000_transfer_daily_cap_rollback.sql");

const PORT = Number(process.env.VERIFY_PG_PORT) || 55435;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-cap-pg-verify-${process.pid}`);

let failures = 0;
function check(name, passed, evidence = "") {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 180)}` : ""}`);
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

const ALICE = `guest_${"a".repeat(32)}`;
const BOB = `guest_${"b".repeat(32)}`;
const DAY_START = new Date(Math.floor(Date.now() / 86_400_000) * 86_400_000).toISOString();

async function main() {
  console.log("\nTransfer daily-cap verification — real PostgreSQL\n");
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
    console.log("1. Migrations");
    await db.query(AUTH_STUB);
    for (const file of [
      "20260818000000_progression_persistence.sql",
      "20260826000000_economy_v1.sql",
      "20260930000000_mandali_p2p_wallet_transfer.sql",
      "20261013000000_transfer_daily_cap.sql",
    ]) {
      let err = null;
      try {
        await db.query(read(file));
      } catch (e) {
        err = e;
      }
      check(`${file} applies`, err === null, err ? err.message : "ok");
      if (err) throw err;
    }
    let again = null;
    try {
      await db.query(read("20261013000000_transfer_daily_cap.sql"));
    } catch (e) {
      again = e;
    }
    check("the cap migration re-applies", again === null, again ? again.message : "ok");

    console.log("\n2. Seeding");
    const seed = async (id, balance) => {
      await db.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest') on conflict do nothing`, [id]);
      await db.query(`select public.ensure_wallet($1)`, [id]);
      if (balance === null) return;
      await db.query(`update public.coin_wallets set balance = $2, lifetime_earned = $2 - lifetime_granted where identity_id = $1`, [id, balance]);
    };
    await seed(ALICE, 10_000);
    await seed(BOB, null);
    const bobStart = 2_000; // a guest wallet's starter grant
    check("two wallets are seeded", true);

    const capped = (client, n, cap = 500) =>
      client.query(`select public.transfer_wallet_coins_capped($1,$2,$3,$4,$5,$6,$7)`, [ALICE, BOB, 100, "race", `k:${n}`, cap, DAY_START]);

    console.log("\n3. Concurrent sends from separate connections");
    const clients = await Promise.all(Array.from({ length: 12 }, connect));
    const outcomes = await Promise.all(
      clients.map((c, n) => capped(c, n).then(() => "ok", (e) => (String(e.message).includes("TRANSFER_CAP_EXCEEDED") ? "cap" : `error:${e.message}`))),
    );
    await Promise.all(clients.map((c) => c.end()));
    const landed = outcomes.filter((o) => o === "ok").length;
    check("exactly five 100-coin sends land under a 500 cap", landed === 5, outcomes.join(","));
    check("every other send is refused with TRANSFER_CAP_EXCEEDED", outcomes.filter((o) => o === "cap").length === 7);
    const sent = (await db.query(`select coalesce(sum(-amount),0)::int as s from public.coin_ledger_entries where wallet_id='${ALICE}' and entry_type='P2P_TRANSFER_SEND'`)).rows[0].s;
    check("the ledger total is exactly the cap", sent === 500, sent);
    const bob = (await db.query(`select balance::int as b from public.coin_wallets where identity_id='${BOB}'`)).rows[0].b;
    check("the recipient received exactly what was sent", bob - bobStart === 500, bob);

    console.log("\n4. Replays and boundaries");
    const firstKey = outcomes.indexOf("ok");
    const replay = await capped(db, firstKey).then(() => true, () => false);
    check("replaying a send that already landed is answered, not refused", replay === true);
    const after = (await db.query(`select coalesce(sum(-amount),0)::int as s from public.coin_ledger_entries where wallet_id='${ALICE}' and entry_type='P2P_TRANSFER_SEND'`)).rows[0].s;
    check("the replay moved nothing", after === 500, after);

    const tomorrowStart = new Date(Date.parse(DAY_START) + 86_400_000).toISOString();
    const nextDay = await db.query(`select public.transfer_wallet_coins_capped('${ALICE}','${BOB}',100,'next day','k:next',500,$1)`, [tomorrowStart]).then(() => true, () => false);
    check("a new day starts from zero", nextDay === true);

    const refused = await db
      .query(`select public.transfer_wallet_coins_capped('${ALICE}','${BOB}',100,'zero cap','k:zero',0,$1)`, [DAY_START])
      .then(() => false, (e) => e.message.includes("TRANSFER_CAP_EXCEEDED"));
    check("a cap of zero refuses everything", refused === true);

    console.log("\n5. Privileges");
    const priv = async (role) =>
      (await db.query(`select has_function_privilege($1, 'public.transfer_wallet_coins_capped(text,text,bigint,text,text,bigint,timestamptz)', 'execute') as ok`, [role])).rows[0].ok;
    check("service_role may call it", await priv("service_role"));
    check("authenticated and anon may not", !(await priv("authenticated")) && !(await priv("anon")));

    console.log("\n6. Rollback");
    await db.query(fs.readFileSync(ROLLBACK, "utf8"));
    const gone = (await db.query(`select count(*)::int as n from pg_proc where proname='transfer_wallet_coins_capped'`)).rows[0].n;
    const inner = (await db.query(`select count(*)::int as n from pg_proc where proname='transfer_wallet_coins'`)).rows[0].n;
    check("the rollback removes only the wrapper", gone === 0 && inner === 1);
  } finally {
    await db.end().catch(() => {});
    await pg.stop().catch(() => {});
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.\n`);
    process.exit(1);
  }
  console.log("\nTRANSFER_CAP_VERIFIED\n");
}

main().catch((err) => {
  console.error("\nVerification aborted:", err);
  process.exit(1);
});
