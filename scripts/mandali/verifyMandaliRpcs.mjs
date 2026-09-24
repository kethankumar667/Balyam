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
    // ── 6. Chat retention ───────────────────────────────────────────────
    console.log("\n6. Chat retention — one year");
    {
      const owner = await person();
      const member = await person();
      const reactor = await person();
      const payer = await person();
      const mid = await makeMandali(owner);
      for (const p of [member, reactor, payer]) await join(admin, mid, p);
      const channel = `${mid}_lounge-chat`;

      const send = (id, who, text) =>
        admin.query(`select public.send_mandali_message($1, $2, $3, $4, $5, null, null)`, [id, mid, channel, who, text]);
      const age = (id, days) =>
        admin.query(`update public.mandali_messages set created_at = now() - make_interval(days => $2) where message_id = $1`, [id, days]);
      const exists = async (id) =>
        (await admin.query(`select count(*)::int as n from public.mandali_messages where message_id = $1`, [id])).rows[0].n === 1;

      const [oldA, oldB, oldC, oldPinned, fresh, justInside, reply] =
        ["oldA", "oldB", "oldC", "oldP", "new", "in", "rep"].map((t) => uid(t));
      for (const id of [oldA, oldB, oldC, oldPinned, fresh, justInside]) await send(id, member, `text ${id}`);
      await age(oldA, 400);
      await age(oldB, 500);
      await age(oldC, 366);
      await age(oldPinned, 700);
      await age(justInside, 364);
      await admin.query(`select public.set_message_pin($1, $2, true)`, [oldPinned, owner]);

      // A new message quoting an old one, and a reaction on an old one.
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'quoting', $5, null)`, [reply, mid, channel, member, oldA]);
      await admin.query(`insert into public.mandali_message_reactions (message_id, identity_id, emoji) values ($1, $2, 'x')`, [oldA, reactor]);

      // A coin request whose card message is over a year old.
      const cr = await requestCoins(admin, mid, member, payer);
      await age(`${cr.requestId}_card`, 400);

      const pruned = await attempt(admin, `select public.prune_expired_mandali_messages() as n`);
      check("retention", "prune reports how many messages it removed (5 old ones)", pruned.ok && pruned.rows[0].n === 5, pruned.error ?? `n=${pruned.rows?.[0]?.n}`);
      check("retention", "messages older than a year are gone — including a pinned one",
        !(await exists(oldA)) && !(await exists(oldB)) && !(await exists(oldC)) && !(await exists(oldPinned)));
      check("retention", "messages inside the year are kept (364 days and today)", (await exists(justInside)) && (await exists(fresh)));

      const quoting = (await admin.query(`select reply_to_id from public.mandali_messages where message_id = $1`, [reply])).rows[0];
      check("retention", "a newer message that quoted a deleted one survives, minus the quote", quoting && quoting.reply_to_id === null);
      const reactions = (await admin.query(`select count(*)::int as n from public.mandali_message_reactions where message_id = $1`, [oldA])).rows[0].n;
      check("retention", "reactions on deleted messages go with them", reactions === 0);
      const request = (await admin.query(`select status, message_id from public.mandali_coin_requests where id = $1`, [cr.requestId])).rows[0];
      check("retention", "the coin request record is kept; only its chat card is removed", request && request.message_id === null, JSON.stringify(request));

      const again = await attempt(admin, `select public.prune_expired_mandali_messages() as n`);
      check("retention", "running it again removes nothing", again.ok && again.rows[0].n === 0);

      // Batching: 5 old messages, batch size 2.
      const backlog = [];
      for (let i = 0; i < 5; i++) {
        const id = uid("bk");
        await send(id, member, `backlog ${i}`);
        await age(id, 800 + i);
        backlog.push(id);
      }
      const batched = await attempt(admin, `select public.prune_expired_mandali_messages(365, 2) as n`);
      const left = (await Promise.all(backlog.map(exists))).filter(Boolean).length;
      check("retention", "a backlog larger than one batch is fully cleared", batched.ok && batched.rows[0].n === 5 && left === 0, `n=${batched.rows?.[0]?.n} left=${left}`);

      // Two servers pruning at the same moment.
      const race = [];
      for (let i = 0; i < 6; i++) {
        const id = uid("rc");
        await send(id, member, `race ${i}`);
        await age(id, 900 + i);
        race.push(id);
      }
      const [c1, c2] = [await open(), await open()];
      const both = await Promise.all([
        attempt(c1, `select public.prune_expired_mandali_messages(365, 2) as n`),
        attempt(c2, `select public.prune_expired_mandali_messages(365, 2) as n`),
      ]);
      await c1.end();
      await c2.end();
      const raceLeft = (await Promise.all(race.map(exists))).filter(Boolean).length;
      const removed = both.reduce((sum, r) => sum + (r.ok ? r.rows[0].n : 0), 0);
      check("retention", "two simultaneous prunes never error and never double-count",
        both.every((r) => r.ok) && removed === 6 && raceLeft === 0, `removed=${removed} left=${raceLeft} errors=${both.filter((r) => !r.ok).map((r) => r.error.slice(0, 50))}`);

      const bad = await attempt(admin, `select public.prune_expired_mandali_messages(0)`);
      check("retention", "a zero-day retention is refused rather than wiping everything", !bad.ok && /INVALID_RETENTION/.test(bad.error), bad.error);

      // "Delete for everyone" must actually erase the text.
      const doomedText = uid("del");
      await send(doomedText, member, "this must not linger in the database");
      await admin.query(`select public.delete_mandali_message($1, $2)`, [doomedText, member]);
      const erased = (await admin.query(`select content, deleted_at from public.mandali_messages where message_id = $1`, [doomedText])).rows[0];
      check("retention", "deleting a message erases its text, not just hides it", erased.content === "" && erased.deleted_at !== null, JSON.stringify(erased));
    }
    // ── 7. Room invites ─────────────────────────────────────────────────
    console.log("\n7. Room invites shared into chat");
    {
      const owner = await person();
      const a = await person();
      const b = await person();
      const outsider = await person();
      const mid = await makeMandali(owner);
      for (const p of [a, b]) await join(admin, mid, p);
      const ch = `${mid}_lounge-chat`;
      const meta = { game: "ludo", gameName: "Ludo", maxPlayers: 4, roomName: "Friday" };
      const post = (client, who, code, channel = ch, metadata = meta) =>
        attempt(
          client,
          `select public.post_mandali_room_invite($1, $2, $3, $4, $5, $6::jsonb) as r`,
          [uid("inv"), mid, channel, who, code, JSON.stringify(metadata)],
        );

      const first = await post(admin, owner, "ABC234");
      const stored = (await admin.query(`select kind, room_code, metadata, content from public.mandali_messages where message_id = $1`,
        [first.rows?.[0]?.r?.message?.message_id ?? ""])).rows[0];
      check("invite", "posts a ROOM_INVITE card carrying the room code and its details",
        first.ok && stored?.kind === "ROOM_INVITE" && stored.room_code === "ABC234" && stored.metadata?.gameName === "Ludo",
        first.error ?? JSON.stringify(stored));
      check("invite", "the text fallback names the game and the code, for clients that do not know the card",
        /Ludo/.test(stored?.content ?? "") && /ABC234/.test(stored?.content ?? ""), stored?.content);

      const again = await post(admin, a, "ABC234");
      check("invite", "sharing the same room again inside 10 minutes reuses the first card",
        again.ok && again.rows[0].r.deduplicated === true &&
          again.rows[0].r.message.message_id === first.rows[0].r.message.message_id);

      const badCode = await post(admin, a, "abc-1");
      check("invite", "a malformed room code is refused", !badCode.ok && /INVALID_ROOM_CODE/.test(badCode.error), badCode.error);
      const stranger = await post(admin, outsider, "STR234");
      check("invite", "someone who is not a member cannot post one", !stranger.ok && /NOT_ACTIVE_MEMBER/.test(stranger.error), stranger.error);
      const announce = await post(admin, a, "ANN234", `${mid}_announcements`);
      check("invite", "a plain member cannot post into the announcements channel", !announce.ok && /FORBIDDEN/.test(announce.error), announce.error);

      const codes = ["RATE22", "RATE33", "RATE44", "RATE55", "RATE66", "RATE77"];
      const posted = [];
      for (const c of codes) posted.push(await post(admin, a, c));
      const capped = await post(admin, a, "RATE88");
      const retry = Number((capped.error?.match(/retry_after_seconds=(\d+)/) ?? [])[1]);
      check("invite", "at most 6 invites per person per hour, then a retry time",
        posted.every((p) => p.ok) && !capped.ok && /RATE_LIMITED/.test(capped.error) && retry > 0 && retry <= 3600,
        capped.error);

      const [c1, c2, c3] = [await open(), await open(), await open()];
      const burst = await Promise.all([c1, c2, c3].map((c) => post(c, b, "RACE22")));
      await Promise.all([c1.end(), c2.end(), c3.end()]);
      const rows = Number((await admin.query(
        `select count(*)::int as n from public.mandali_messages where mandali_id = $1 and room_code = 'RACE22'`, [mid],
      )).rows[0].n);
      check("invite", "three simultaneous shares of one room → exactly one card", burst.every((r) => r.ok) && rows === 1, `rows=${rows}`);
    }

    // ── 8. Read state and the digest ────────────────────────────────────
    console.log("\n8. Read state and the notification digest");
    {
      const owner = await person();
      const ann = await person();
      const bob = await person();
      const reader = await person();
      const mid = await makeMandali(owner);
      for (const p of [ann, bob, reader]) await join(admin, mid, p);
      await admin.query(`update public.mandali_memberships set display_name = 'Ann' where identity_id = $1`, [ann]);
      await admin.query(`update public.mandali_memberships set display_name = 'Bob' where identity_id = $1`, [bob]);
      const quiet = await makeMandali(owner);
      await join(admin, quiet, reader);

      const ch = `${mid}_lounge-chat`;
      // A member who joined two hours ago and last read an hour ago. (The read pointer can no longer
      // start before the join — see section 9 — so the join is back-dated as well.)
      await admin.query(
        `update public.mandali_memberships set last_read_at = now() - interval '1 hour', joined_at = now() - interval '2 hours' where identity_id = $1`,
        [reader],
      );
      const send = (who, text) =>
        admin.query(`select public.send_mandali_message($1, $2, $3, $4, $5, null, null)`, [uid("d"), mid, ch, who, text]);

      for (let i = 0; i < 3; i++) await send(bob, `bob ${i}`);
      await admin.query(
        `select public.post_mandali_room_invite($1, $2, $3, $4, 'ZED234', $5::jsonb)`,
        [uid("inv"), mid, ch, bob, JSON.stringify({ game: "ludo", gameName: "Ludo", maxPlayers: 4 })],
      );
      for (let i = 0; i < 2; i++) await send(ann, `ann ${i}`);
      await send(reader, "my own message");
      const gone = uid("gone");
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'deleted soon', null, null)`, [gone, mid, ch, ann]);
      await admin.query(`select public.delete_mandali_message($1, $2)`, [gone, ann]);
      const sys = uid("sys");
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'Ann joined', null, null)`, [sys, mid, ch, ann]);
      await admin.query(`update public.mandali_messages set kind = 'SYSTEM' where message_id = $1`, [sys]);
      await send(ann, "see you there");

      const digestOf = async () => (await admin.query(`select public.get_mandali_digests($1) as d`, [reader])).rows[0].d;
      const rows = await digestOf();
      const row = rows.find((r) => r.mandaliId === mid);
      check("digest", "one row per Mandali the person belongs to", rows.length === 2, `rows=${rows.length}`);
      check("digest", "counts only what others wrote and is worth reading: not my own, not deleted, not system chatter",
        row.unreadCount === 7, `unreadCount=${row.unreadCount} (expected 7: 3 Bob + 1 invite + 3 Ann)`);
      check("digest", "says how many different people wrote", row.senderCount === 2, `senderCount=${row.senderCount}`);
      check("digest", "names the top writers by volume", row.topSenders[0]?.name === "Bob" && row.topSenders[0]?.count === 4 && row.topSenders[1]?.name === "Ann",
        JSON.stringify(row.topSenders));
      check("digest", "includes the latest message for a preview", row.latest?.senderName === "Ann" && row.latest?.preview === "see you there", JSON.stringify(row.latest));
      check("digest", "lists the unread room invite so it can be shown on its own",
        row.invites.length === 1 && row.invites[0].roomCode === "ZED234" && row.invites[0].senderName === "Bob", JSON.stringify(row.invites));
      const quietRow = rows.find((r) => r.mandaliId === quiet);
      check("digest", "a quiet Mandali reports nothing unread", quietRow.unreadCount === 0 && quietRow.latest === null);
      check("digest", "the busy Mandali is listed first", rows[0].mandaliId === mid);

      const marked = await attempt(admin, `select public.mark_mandali_read($1, $2) as r`, [mid, reader]);
      const previous = new Date(marked.rows?.[0]?.r?.previous).getTime();
      check("read", "marking read returns where the pointer was, for the new-messages line",
        marked.ok && Math.abs(previous - (Date.now() - 3600_000)) < 120_000, marked.error);
      const afterRead = (await digestOf()).find((r) => r.mandaliId === mid);
      check("read", "after reading, nothing is unread", afterRead.unreadCount === 0 && afterRead.invites.length === 0);
      await send(bob, "one more");
      const later = (await digestOf()).find((r) => r.mandaliId === mid);
      check("read", "a message after that counts as unread again", later.unreadCount === 1);
      const backwards = await attempt(admin, `select public.mark_mandali_read($1, $2)`, [mid, await person()]);
      check("read", "a non-member cannot move a read pointer", !backwards.ok && /NOT_ACTIVE_MEMBER/.test(backwards.error), backwards.error);

      const muted = await attempt(admin, `select public.set_mandali_notification_level($1, $2, 'MUTED') as l`, [mid, reader]);
      const mutedRow = (await digestOf()).find((r) => r.mandaliId === mid);
      check("level", "a Mandali can be muted, and the digest reports it", muted.ok && mutedRow.level === "MUTED", muted.error);
      const badLevel = await attempt(admin, `select public.set_mandali_notification_level($1, $2, 'LOUD')`, [mid, reader]);
      check("level", "an unknown level is refused", !badLevel.ok && /INVALID_LEVEL/.test(badLevel.error), badLevel.error);

      await admin.query(`select public.transition_membership($1, $2, $2, 'LEAVE')`, [mid, reader]);
      const afterLeave = await digestOf();
      check("digest", "a Mandali the person left no longer appears", !afterLeave.some((r) => r.mandaliId === mid));
    }

    // ── 9. Join notice, and a newcomer's history starting at their join ──
    console.log("\n9. Join notice and history cut-off");
    {
      const owner = await person();
      const early = await person();
      const late = await person();
      const mid = await makeMandali(owner);
      await join(admin, mid, early);
      const ch = `${mid}_lounge-chat`;
      const sendAs = (who, text) =>
        admin.query(`select public.send_mandali_message($1, $2, $3, $4, $5, null, null)`, [uid("h"), mid, ch, who, text]);
      const digestFor = async (who) =>
        (await admin.query(`select public.get_mandali_digests($1) as d`, [who])).rows[0].d.find((r) => r.mandaliId === mid);
      const joinedAt = async (who) =>
        (await admin.query(`select joined_at from public.mandali_memberships where mandali_id = $1 and identity_id = $2`, [mid, who]))
          .rows[0].joined_at;

      await sendAs(early, "before the newcomer");
      await sendAs(owner, "the plan is a secret");
      await join(admin, mid, late);

      const noticeId = uid("sys");
      const notice = await attempt(admin, `select public.post_mandali_system_message($1, $2, $3, 'Late joined the Mandali') as r`, [noticeId, mid, late]);
      const line = notice.rows?.[0]?.r?.message;
      check("notice", "posts a SYSTEM line in the group's main chat, about the person who joined",
        notice.ok && line.kind === "SYSTEM" && line.channel_id === ch && line.sender_identity_id === late && line.content === "Late joined the Mandali",
        notice.error ?? JSON.stringify(line));

      const again = await attempt(admin, `select public.post_mandali_system_message($1, $2, $3, 'Late joined the Mandali') as r`, [noticeId, mid, late]);
      const lines = (await admin.query(`select count(*)::int as n from public.mandali_messages where message_id = $1`, [noticeId])).rows[0].n;
      check("notice", "posting the same notice twice stores one line", again.ok && again.rows[0].r.deduplicated === true && lines === 1, again.error);

      const stranger = await attempt(admin, `select public.post_mandali_system_message($1, $2, $3, 'Nobody joined') as r`, [uid("sys"), mid, await person()]);
      check("notice", "it cannot be posted about someone who is not a member", !stranger.ok && /NOT_ACTIVE_MEMBER/.test(stranger.error), stranger.error);

      const empty = await attempt(admin, `select public.post_mandali_system_message($1, $2, $3, '   ') as r`, [uid("sys"), mid, late]);
      check("notice", "an empty notice is refused", !empty.ok && /EMPTY_MESSAGE/.test(empty.error), empty.error);

      await sendAs(early, "welcome");
      const seqs = (await admin.query(`select sequence from public.mandali_messages where channel_id = $1 order by sequence`, [ch])).rows.map((r) => Number(r.sequence));
      check("notice", "the notice takes its place in the chat's numbering, with no gaps or repeats",
        seqs.every((s, i) => s === i + 1), `sequences=${seqs.join(",")}`);

      const fresh = await digestFor(late);
      check("cutoff", "what was said before joining is not 'new' to the newcomer — only what came after",
        fresh.unreadCount === 1 && fresh.latest?.preview === "welcome", JSON.stringify({ n: fresh.unreadCount, latest: fresh.latest }));
      check("cutoff", "the newcomer's own arrival line is not counted as a missed message", fresh.unreadCount === 1);
      const others = await digestFor(early);
      check("cutoff", "the others are not told the arrival line is a 'new message' either (only the owner's real message counts)",
        others.unreadCount === 1, `n=${others.unreadCount}`);
      check("cutoff", "the digest's read boundary is never earlier than the join",
        new Date(fresh.lastReadAt).getTime() >= new Date(await joinedAt(late)).getTime());

      // A pointer left over from a previous stay must not pull the past back in.
      await admin.query(`update public.mandali_memberships set last_read_at = now() - interval '1 day' where mandali_id = $1 and identity_id = $2`, [mid, late]);
      const stale = await digestFor(late);
      check("cutoff", "an old read pointer from a previous stay cannot make the past count as new", stale.unreadCount === 1, `n=${stale.unreadCount}`);
      const marked = await attempt(admin, `select public.mark_mandali_read($1, $2) as r`, [mid, late]);
      check("cutoff", "'where you had read up to' is never earlier than the join",
        marked.ok && new Date(marked.rows[0].r.previous).getTime() >= new Date(await joinedAt(late)).getTime(), marked.error);

      // Leave, miss some conversation, come back: the join time moves, so that gap is not theirs either.
      await admin.query(`select public.transition_membership($1, $2, $2, 'LEAVE')`, [mid, late]);
      await sendAs(owner, "said while you were away");
      const back = await join(admin, mid, late);
      // Compared inside Postgres, at microsecond precision: as JavaScript dates both would be
      // truncated to milliseconds, and a fast machine can put the message and the rejoin in the same one.
      const joinedAfter = (await admin.query(
        `select m.joined_at > x.created_at as after
           from public.mandali_memberships m, public.mandali_messages x
          where m.mandali_id = $1 and m.identity_id = $2
            and x.mandali_id = $1 and x.content = 'said while you were away'`,
        [mid, late],
      )).rows[0].after;
      check("cutoff", "rejoining stamps a new join time, after what was said while away", back.ok && joinedAfter === true, back.error);
      const rejoined = await digestFor(late);
      check("cutoff", "a rejoiner is not shown the time they were away as new", rejoined.unreadCount === 0, `n=${rejoined.unreadCount}`);
    }

    // ── 10. The owner deletes the Mandali ───────────────────────────────
    console.log("\n10. Owner deletes the Mandali");
    {
      const owner = await person();
      const admin1 = await person();
      const member = await person();
      const leaver = await person();
      const stranger = await person();
      const mid = await makeMandali(owner);
      const bystander = await makeMandali(await person());
      const ch = `${mid}_lounge-chat`;
      await join(admin, mid, admin1);
      await join(admin, mid, member);
      await join(admin, mid, leaver);
      await admin.query(`select public.transition_membership($1, $2, $3, 'PROMOTE')`, [mid, owner, admin1]);
      await admin.query(`select public.transition_membership($1, $2, $2, 'LEAVE')`, [mid, leaver]);
      await admin.query(`select public.send_mandali_message($1, $2, $3, $4, 'this will be gone', null, null)`, [uid("h"), mid, ch, member]);
      await admin.query(`select public.create_invitation($1, $2, $3, $4, now() + interval '1 day', 10)`, [uid("inv"), mid, owner, uid("hash")]);
      await requestCoins(admin, mid, member, owner);
      await admin.query(`insert into public.mandali_notifications (id, mandali_id, recipient_identity_id, kind) values ($1, $2, $3, 'test')`, [uid("ntf"), mid, member]);

      const childTables = ["mandali_memberships", "mandali_invitations", "mandali_channels", "mandali_messages",
        "mandali_coin_requests", "mandali_notifications", "mandali_audit_log"];
      const rowsIn = async (t, id = mid) =>
        Number((await admin.query(`select count(*)::int as n from public.${t} where mandali_id = $1`, [id])).rows[0].n);
      const populated = await Promise.all(childTables.map((t) => rowsIn(t)));
      check("delete", "the group has rows in every table that hangs off it", populated.every((n) => n > 0), populated.join(","));
      const bystanderMembers = await rowsIn("mandali_memberships", bystander);
      const balancesBefore = await Promise.all([owner, admin1, member, leaver].map(balance));

      for (const [who, label] of [[admin1, "an admin"], [member, "an ordinary member"], [leaver, "someone who left"], [stranger, "a stranger"]]) {
        const refused = await attempt(admin, `select public.delete_mandali($1, $2)`, [mid, who]);
        check("delete", `${label} cannot delete it`, !refused.ok && /FORBIDDEN/.test(refused.error), refused.error);
      }
      check("delete", "refused attempts remove nothing", (await rowsIn("mandali_memberships")) === populated[0]);

      const gone = await attempt(admin, `select public.delete_mandali($1, $2) as r`, ["m_never_existed", owner]);
      check("delete", "a Mandali that does not exist is reported as not found", !gone.ok && /MANDALI_NOT_FOUND/.test(gone.error), gone.error);

      const done = await attempt(admin, `select public.delete_mandali($1, $2) as r`, [mid, owner]);
      const told = [...(done.rows?.[0]?.r?.member_ids ?? [])].sort();
      check("delete", "the owner deletes it", done.ok, done.error);
      check("delete", "it reports exactly the ACTIVE members to tell (not the one who left)",
        JSON.stringify(told) === JSON.stringify([owner, admin1, member].sort()), JSON.stringify(told));
      check("delete", "the Mandali itself is gone",
        (await admin.query(`select 1 from public.mandalis where id = $1`, [mid])).rowCount === 0);
      const left = await Promise.all(childTables.map((t) => rowsIn(t)));
      check("delete", "every table that hung off it is emptied by the one delete", left.every((n) => n === 0), left.join(","));
      check("delete", "another Mandali is untouched", (await rowsIn("mandali_memberships", bystander)) === bystanderMembers);

      const balancesAfter = await Promise.all([owner, admin1, member, leaver].map(balance));
      check("delete", "no member's coin balance changes", balancesBefore.every((b, i) => b === balancesAfter[i]),
        `${balancesBefore} -> ${balancesAfter}`);

      const twice = await attempt(admin, `select public.delete_mandali($1, $2)`, [mid, owner]);
      check("delete", "deleting a second time finds nothing", !twice.ok && /MANDALI_NOT_FOUND/.test(twice.error), twice.error);

      const priv = (await admin.query(
        `select has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
                has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
                has_function_privilege('service_role', p.oid, 'EXECUTE') as svc
           from pg_proc p where p.proname = 'delete_mandali' and p.pronamespace = 'public'::regnamespace`,
      )).rows[0];
      check("delete", "only the service role may call it", priv.anon === false && priv.auth === false && priv.svc === true, JSON.stringify(priv));
    }

    // ── 11. Leaving, and the host handing over first ────────────────────
    console.log("\n11. Leaving and host handover");
    {
      const owner = await person();
      const member = await person();
      const heir = await person();
      const stranger = await person();
      const mid = await makeMandali(owner);
      await join(admin, mid, member);
      await join(admin, mid, heir);
      const roleOf = async (who) =>
        (await admin.query(`select role, state from public.mandali_memberships where mandali_id = $1 and identity_id = $2`, [mid, who])).rows[0];
      const leave = (who) => attempt(admin, `select public.transition_membership($1, $2, $2, 'LEAVE')`, [mid, who]);
      const count = async () => Number((await admin.query(`select member_count from public.mandalis where id = $1`, [mid])).rows[0].member_count);

      check("leave", "the group starts with three members", (await count()) === 3, String(await count()));

      const left = await leave(member);
      check("leave", "an ordinary member can leave", left.ok, left.error);
      check("leave", "they are marked as having left", (await roleOf(member)).state === "LEFT");
      check("leave", "the member count drops by one", (await count()) === 2, String(await count()));

      const twice = await leave(member);
      check("leave", "leaving twice is refused", !twice.ok && /TARGET_NOT_ACTIVE_MEMBER/.test(twice.error), twice.error);
      const outsider = await leave(stranger);
      check("leave", "someone who was never in the group cannot 'leave' it", !outsider.ok && /TARGET_NOT_ACTIVE_MEMBER/.test(outsider.error), outsider.error);

      const someoneElse = await attempt(admin, `select public.transition_membership($1, $2, $3, 'LEAVE')`, [mid, heir, owner]);
      check("leave", "nobody can make somebody else leave through LEAVE", !someoneElse.ok && /FORBIDDEN/.test(someoneElse.error), someoneElse.error);
      check("leave", "and the host is still in place after that attempt", (await roleOf(owner)).state === "ACTIVE");

      const hostLeaves = await leave(owner);
      check("leave", "the host cannot simply leave", !hostLeaves.ok && /OWNER_MUST_TRANSFER/.test(hostLeaves.error), hostLeaves.error);
      check("leave", "the refused host is still the owner, still active",
        (await roleOf(owner)).role === "OWNER" && (await roleOf(owner)).state === "ACTIVE");
      check("leave", "and the member count is unchanged", (await count()) === 2, String(await count()));

      const handOver = await attempt(admin, `select public.transfer_mandali_ownership($1, $2, $3)`, [mid, owner, heir]);
      check("leave", "the host hands the group to another active member", handOver.ok, handOver.error);
      check("leave", "the heir is now the owner", (await roleOf(heir)).role === "OWNER");
      check("leave", "the old host is now an admin", (await roleOf(owner)).role === "ADMIN");

      const nowLeaves = await leave(owner);
      check("leave", "the former host can now leave like anyone else", nowLeaves.ok, nowLeaves.error);
      check("leave", "they have left, and the heir still owns the group",
        (await roleOf(owner)).state === "LEFT" && (await roleOf(heir)).role === "OWNER" && (await count()) === 1, String(await count()));

      const other = await makeMandali(await person());
      const toOutsider = await attempt(admin, `select public.transfer_mandali_ownership($1, $2, $3)`, [other, (await admin.query(`select owner_identity_id from public.mandalis where id = $1`, [other])).rows[0].owner_identity_id, stranger]);
      check("leave", "ownership cannot be handed to someone who is not an active member of the group",
        !toOutsider.ok && /TARGET_NOT_ACTIVE_MEMBER/.test(toOutsider.error), toOutsider.error);
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
