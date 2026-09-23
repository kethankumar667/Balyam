#!/usr/bin/env node
/**
 * Real-PostgreSQL verification of the Mandali RPCs.
 *
 * Applies EVERY supabase/migrations/*.sql in order to a fresh embedded
 * PostgreSQL, then drives the Mandali RPCs directly. Concurrency checks use
 * genuinely separate `pg` connections (real transactions, real row locks and
 * advisory locks) — not mocks.
 *
 * What this covers that `npm run verify:schema` does NOT: that script applies
 * only the progression migration, so it never touched any Mandali table or
 * function.
 *
 * Honest scope: proves the SQL semantics and race-safety of the RPCs. It does
 * not prove Supabase's PostgREST/RLS layer (there is none here) or the HTTP
 * controllers — see the server test suite and a browser pass for those.
 *
 *   node scripts/mandali/verifyMandaliRpcs.mjs
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
const PORT = Number(process.env.VERIFY_MANDALI_PG_PORT) || 55611;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-mandali-pg-verify-${process.pid}`);

const COIN_AMOUNT = 100;
const COOLDOWN_SECONDS = 4 * 60 * 60;
const FAR_FUTURE = "2099-01-01T00:00:00Z";

let failures = 0;
const check = (section, name, passed, evidence = "") => {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} [${section}] ${name}${evidence ? ` — ${String(evidence).slice(0, 200)}` : ""}`);
};

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

const uid = (tag) => `${tag}_${crypto.randomBytes(4).toString("hex")}`;
const guestId = () => `guest_${crypto.randomBytes(16).toString("hex")}`;

/** Runs a query and returns { ok, rows } | { ok:false, error } — never throws. */
async function attempt(client, sql, params = []) {
  try {
    const res = await client.query(sql, params);
    return { ok: true, rows: res.rows };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log("\n==============================================");
  console.log("  Mandali RPCs — real PostgreSQL verification");
  console.log("==============================================\n");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres", port: PORT,
    persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();

  const open = async () => {
    const c = new Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
    await c.connect();
    return c;
  };
  const admin = await open();

  try {
    console.log("0. Setup — full migration chain");
    await admin.query(AUTH_STUB);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      await admin.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    }
    check("setup", `all ${files.length} migrations applied in order`, true, files[files.length - 1]);

    const person = async (coins = true) => {
      const id = guestId();
      await admin.query(`insert into public.player_identities (player_id, kind) values ($1, 'guest')`, [id]);
      if (coins) {
        await admin.query(`select public.ensure_wallet($1)`, [id]);
        await admin.query(`select public.grant_starter_coins($1)`, [id]);
      }
      return id;
    };
    const balance = async (id) =>
      BigInt((await admin.query(`select balance from public.coin_wallets where identity_id = $1`, [id])).rows[0].balance);
    const makeMandali = async (ownerId, { approval = false } = {}) => {
      const id = uid("m");
      await admin.query(
        `select public.create_mandali_with_owner($1, $2, $3, 'E', 'd', $4, 'Owner', 'a1')`,
        [id, id.replace(/_/g, "-"), `Group ${id}`, ownerId],
      );
      if (approval) await admin.query(`update public.mandalis set join_approval = true where id = $1`, [id]);
      return id;
    };
    const join = (client, mandaliId, who) =>
      attempt(client, `select public.create_join_request($1, $2, $3, 'N', 'a1', null)`, [uid("jr"), mandaliId, who]);
    const activeMembers = async (mandaliId) =>
      Number((await admin.query(
        `select count(*)::int as n from public.mandali_memberships where mandali_id = $1 and state = 'ACTIVE'`, [mandaliId],
      )).rows[0].n);
    const requestCoins = (client, mandaliId, requester, payer, cooldown = COOLDOWN_SECONDS) => {
      const requestId = uid("cr");
      return attempt(
        client,
        `select public.create_coin_request($1, $2, $3, $4, $5, $6::bigint, $7::timestamptz, $8::integer) as r`,
        [requestId, mandaliId, `${mandaliId}_lounge-chat`, requester, payer, COIN_AMOUNT, FAR_FUTURE, cooldown],
      ).then((res) => ({ ...res, requestId }));
    };

    // ── 1. Creation, joining, roles ─────────────────────────────────────
    console.log("\n1. Creation, joining, roles");
    {
      const owner = await person();
      const mid = await makeMandali(owner);
      const row = (await admin.query(`select member_count from public.mandalis where id = $1`, [mid])).rows[0];
      check("create", "owner becomes the single ACTIVE OWNER", (await activeMembers(mid)) === 1 && row.member_count === 1);
      const ch = (await admin.query(`select count(*)::int as n from public.mandali_channels where mandali_id = $1`, [mid])).rows[0].n;
      check("create", "default channels are created", ch === 3, `${ch} channels`);

      const a = await person();
      const r1 = await join(admin, mid, a);
      check("join", "open group: join is an immediate ACTIVE membership", r1.ok && (await activeMembers(mid)) === 2, r1.error);
      const dup = await join(admin, mid, a);
      check("join", "joining twice is refused", !dup.ok && /ALREADY_MEMBER/.test(dup.error), dup.error);

      const approvalId = await makeMandali(owner, { approval: true });
      const b = await person();
      const pending = await join(admin, approvalId, b);
      check("join", "approval group: join creates a PENDING request, not a membership",
        pending.ok && (await activeMembers(approvalId)) === 1, pending.error);
      const reqId = (await admin.query(
        `select id from public.mandali_join_requests where mandali_id = $1 and requester_identity_id = $2`, [approvalId, b],
      )).rows[0].id;
      const stranger = await person();
      const forged = await attempt(admin, `select public.decide_join_request($1, $2, true)`, [reqId, stranger]);
      check("join", "a non-admin cannot approve a request", !forged.ok && /FORBIDDEN/.test(forged.error), forged.error);
      const approved = await attempt(admin, `select public.decide_join_request($1, $2, true)`, [reqId, owner]);
      check("join", "owner approves → member is ACTIVE", approved.ok && (await activeMembers(approvalId)) === 2, approved.error);

      const ban = await attempt(admin, `select public.transition_membership($1, $2, $3, 'BAN')`, [mid, owner, a]);
      const rejoin = await join(admin, mid, a);
      check("roles", "a banned member cannot rejoin", ban.ok && !rejoin.ok && /BANNED/.test(rejoin.error), rejoin.error ?? ban.error);
      const promoteByMember = await attempt(admin, `select public.transition_membership($1, $2, $3, 'PROMOTE')`, [approvalId, b, owner]);
      check("roles", "a plain member cannot promote anyone", !promoteByMember.ok && /FORBIDDEN/.test(promoteByMember.error), promoteByMember.error);
    }

    // ── 2. Concurrency: membership + ownership ──────────────────────────
    console.log("\n2. Concurrency — membership and ownership");
    {
      const owner = await person();
      const mid = await makeMandali(owner, { approval: true });
      await admin.query(`update public.mandalis set max_members = 2 where id = $1`, [mid]);
      const [x, y] = [await person(), await person()];
      await join(admin, mid, x);
      await join(admin, mid, y);
      const ids = (await admin.query(
        `select id from public.mandali_join_requests where mandali_id = $1 order by requester_identity_id`, [mid],
      )).rows.map((r) => r.id);
      const [c1, c2] = [await open(), await open()];
      const results = await Promise.all(
        ids.map((id, i) => attempt([c1, c2][i], `select public.decide_join_request($1, $2, true)`, [id, owner])),
      );
      await c1.end();
      await c2.end();
      const wins = results.filter((r) => r.ok).length;
      const members = await activeMembers(mid);
      const count = (await admin.query(`select member_count from public.mandalis where id = $1`, [mid])).rows[0].member_count;
      check("race", "two approvals for the last slot → exactly one membership", wins === 1 && members === 2 && count === 2,
        `wins=${wins} active=${members} member_count=${count} errors=${results.filter((r) => !r.ok).map((r) => r.error.slice(0, 40))}`);
    }
    {
      const owner = await person();
      const mid = await makeMandali(owner);
      const [a, b] = [await person(), await person()];
      await join(admin, mid, a);
      await join(admin, mid, b);
      const [c1, c2] = [await open(), await open()];
      const results = await Promise.all([
        attempt(c1, `select public.transfer_mandali_ownership($1, $2, $3)`, [mid, owner, a]),
        attempt(c2, `select public.transfer_mandali_ownership($1, $2, $3)`, [mid, owner, b]),
      ]);
      await c1.end();
      await c2.end();
      const owners = Number((await admin.query(
        `select count(*)::int as n from public.mandali_memberships where mandali_id = $1 and state = 'ACTIVE' and role = 'OWNER'`, [mid],
      )).rows[0].n);
      check("race", "two concurrent ownership transfers → exactly one owner", owners === 1 && results.filter((r) => r.ok).length === 1,
        `owners=${owners} wins=${results.filter((r) => r.ok).length}`);
    }

    // ── 3. Chat permissions ─────────────────────────────────────────────
    console.log("\n3. Chat permissions");
    {
      const owner = await person();
      const member = await person();
      const mid = await makeMandali(owner);
      await join(admin, mid, member);
      const channel = `${mid}_lounge-chat`;
      const mine = uid("msg");
      const theirs = uid("msg");
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'hi', null, null)`, [mine, mid, channel, member]);
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'yo', null, null)`, [theirs, mid, channel, owner]);
      const pin = await attempt(admin, `select public.set_message_pin($1, $2, true)`, [mine, member]);
      check("chat", "a plain member cannot pin", !pin.ok && /FORBIDDEN/.test(pin.error), pin.error);
      const pinOk = await attempt(admin, `select public.set_message_pin($1, $2, true)`, [mine, owner]);
      check("chat", "the owner can pin", pinOk.ok, pinOk.error);
      const delOther = await attempt(admin, `select public.delete_mandali_message($1, $2)`, [theirs, member]);
      check("chat", "a member cannot delete someone else's message", !delOther.ok && /FORBIDDEN/.test(delOther.error), delOther.error);
      const delOwn = await attempt(admin, `select public.delete_mandali_message($1, $2)`, [mine, member]);
      const tomb = (await admin.query(`select deleted_at from public.mandali_messages where message_id = $1`, [mine])).rows[0];
      check("chat", "deleting your own message tombstones it", delOwn.ok && tomb.deleted_at !== null, delOwn.error);
    }

    // ── 4. Coin requests: cooldown ──────────────────────────────────────
    console.log("\n4. Coin requests — 4-hour cooldown");
    {
      const owner = await person();
      const requester = await person();
      const payer = await person();
      const mid = await makeMandali(owner);
      await join(admin, mid, requester);
      await join(admin, mid, payer);

      const first = await requestCoins(admin, mid, requester, payer);
      const cards = (await admin.query(
        `select count(*)::int as n from public.mandali_messages where mandali_id = $1 and kind = 'COIN_REQUEST'`, [mid],
      )).rows[0].n;
      check("cooldown", "first request succeeds and posts a COIN_REQUEST card", first.ok && cards === 1, first.error);

      const second = await requestCoins(admin, mid, requester, payer);
      const retry = Number((second.error?.match(/retry_after_seconds=(\d+)/) ?? [])[1]);
      check("cooldown", "second request inside the window is refused with a retry time",
        !second.ok && /COOLDOWN/.test(second.error) && retry > COOLDOWN_SECONDS - 60 && retry <= COOLDOWN_SECONDS,
        `retry_after_seconds=${retry}`);

      const otherRequester = await person();
      await join(admin, mid, otherRequester);
      const other = await requestCoins(admin, mid, otherRequester, payer);
      check("cooldown", "the limit is per person — someone else can still ask", other.ok, other.error);

      const owner2 = await person();
      const mid2 = await makeMandali(owner2);
      await join(admin, mid2, requester);
      await join(admin, mid2, payer);
      const cross = await requestCoins(admin, mid2, requester, payer);
      check("cooldown", "the limit is global — a different Mandali does not reset it", !cross.ok && /COOLDOWN/.test(cross.error), cross.error);

      const shortWindow = await person();
      await join(admin, mid, shortWindow);
      const s1 = await requestCoins(admin, mid, shortWindow, payer, 1);
      await new Promise((r) => setTimeout(r, 1300));
      const s2 = await requestCoins(admin, mid, shortWindow, payer, 1);
      check("cooldown", "once the window has elapsed the next request is allowed", s1.ok && s2.ok, s1.error ?? s2.error);

      const racer = await person();
      await join(admin, mid, racer);
      const [c1, c2, c3] = [await open(), await open(), await open()];
      const burst = await Promise.all([c1, c2, c3].map((c) => requestCoins(c, mid, racer, payer)));
      await Promise.all([c1.end(), c2.end(), c3.end()]);
      const stored = Number((await admin.query(
        `select count(*)::int as n from public.mandali_coin_requests where requester_identity_id = $1`, [racer],
      )).rows[0].n);
      check("cooldown", "3 simultaneous requests from one person → exactly one is stored",
        burst.filter((r) => r.ok).length === 1 && stored === 1, `ok=${burst.filter((r) => r.ok).length} stored=${stored}`);
    }

    // ── 5. Coin requests: funding ───────────────────────────────────────
    console.log("\n5. Coin requests — funding");
    {
      const owner = await person();
      const requester = await person();
      const payer = await person();
      const bystander = await person();
      const mid = await makeMandali(owner);
      for (const p of [requester, payer, bystander]) await join(admin, mid, p);
      const created = await requestCoins(admin, mid, requester, payer);
      const reqId = created.requestId;

      const before = { r: await balance(requester), p: await balance(payer) };
      const wrong = await attempt(admin, `select public.fund_coin_request($1, $2, $3)`, [reqId, bystander, "k-wrong"]);
      check("fund", "only the designated payer can fund", !wrong.ok && /FORBIDDEN/.test(wrong.error), wrong.error);

      const [c1, c2] = [await open(), await open()];
      const key = `mnd_coin_req:${reqId}`;
      const both = await Promise.all([
        attempt(c1, `select public.fund_coin_request($1, $2, $3)`, [reqId, payer, key]),
        attempt(c2, `select public.fund_coin_request($1, $2, $3)`, [reqId, payer, key]),
      ]);
      await c1.end();
      await c2.end();
      const after = { r: await balance(requester), p: await balance(payer) };
      check("fund", "two simultaneous 'Pay' taps → the payer is debited exactly once",
        after.p === before.p - BigInt(COIN_AMOUNT) && after.r === before.r + BigInt(COIN_AMOUNT),
        `payer ${before.p}→${after.p}, requester ${before.r}→${after.r}, results=${both.map((b) => (b.ok ? "ok" : b.error.slice(0, 30)))}`);
      check("fund", "no coins minted or destroyed", after.p + after.r === before.p + before.r);
      const status = (await admin.query(`select status from public.mandali_coin_requests where id = $1`, [reqId])).rows[0].status;
      check("fund", "request ends FUNDED", status === "FUNDED", status);
      const again = await attempt(admin, `select public.fund_coin_request($1, $2, $3)`, [reqId, payer, key]);
      check("fund", "paying a funded request again is a harmless no-op", again.ok && (await balance(payer)) === after.p, again.error);
    }
  } finally {
    await admin.end();
    await pg.stop();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log(failures === 0 ? "\n✓ PASSED\n" : `\n✗ FAILED — ${failures} check(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(2);
});
