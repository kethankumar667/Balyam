import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReferralAttributionResult, ReferralProgress } from "@shared/referrals.js";

let db: PGlite;
let directory: string;
const now = Date.now();
const accepted = now - 3_600_000;
const expiry = accepted + 30 * 86400_000;
const uid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

async function value<T>(sql: string, args: (string | number)[] = []): Promise<T> {
  const { rows } = await db.query<{ result: T }>(`SELECT (${sql}) AS result`, args);
  return rows[0]!.result;
}
const sync = (id: number) => value<ReferralProgress>("SELECT referral_sync($1)", [uid(id)]);
const attribute = (id: number, code: string, at = accepted, until = expiry) =>
  value<ReferralAttributionResult>("SELECT referral_attribute($1, $2::uuid, $3, $4)",
    [uid(id), code, at, until]);

async function match(id: string, player: number, other: number, bot = false, finished = now) {
  await db.query("INSERT INTO match_summaries VALUES ($1, $2, $3, 60000)",
    [id, new Date(finished - 60000).toISOString(), new Date(finished).toISOString()]);
  await db.query("INSERT INTO match_participants VALUES ($1, $2, false), ($1, $3, $4)",
    [id, uid(player), uid(other), bot]);
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "bhalyam-referrals-"));
  db = new PGlite(join(directory, "postgres"));
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz, email_confirmed_at timestamptz);
    CREATE TABLE player_identities(player_id text PRIMARY KEY, kind text, auth_user_id uuid, erased_at timestamptz);
    CREATE TABLE cosmetic_catalog(id text PRIMARY KEY, category text, name text, description text,
      price_coins bigint, rarity text, unlock_method text, is_active boolean, display_order int);
    CREATE TABLE user_cosmetics(user_id text REFERENCES player_identities ON DELETE CASCADE,
      cosmetic_id text REFERENCES cosmetic_catalog, source_type text, source_reference text,
      UNIQUE(user_id, cosmetic_id));
    CREATE TABLE match_summaries(id text PRIMARY KEY, started_at timestamptz, finished_at timestamptz, duration_ms int);
    CREATE TABLE match_participants(match_id text REFERENCES match_summaries, player_id text,
      is_bot boolean, PRIMARY KEY(match_id, player_id));
  `);
  for (let i = 1; i <= 20; i++) {
    await db.query("INSERT INTO auth.users VALUES ($1, $2, $3)", [
      uid(i), new Date(i === 9 ? accepted - 1000 : accepted + 1000).toISOString(),
      i === 10 ? null : new Date(accepted + 2000).toISOString(),
    ]);
    await db.query("INSERT INTO player_identities VALUES ($1, 'member', $2, null)", [uid(i), uid(i)]);
  }
  await db.exec(await readFile(new URL("../../../../supabase/migrations/20261108000000_referrals.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../../../supabase/migrations/20261108000001_nostalgia_pack.sql", import.meta.url), "utf8"));
}, 30000);

afterAll(async () => {
  await db?.close();
  if (directory) await rm(directory, { recursive: true });
});

describe("real referral SQL", () => {
  it("rejects purchase-sourced entitlements even outside the referral HTTP layer", async () => {
    await expect(db.query("INSERT INTO user_cosmetics VALUES ($1, 'aura_nostalgia_gold', 'COIN_PURCHASE', 'attempted-purchase')", [uid(20)]))
      .rejects.toThrow("INVALID_COSMETIC");
    expect(await value<number>("SELECT count(*)::int FROM user_cosmetics WHERE user_id = $1", [uid(20)])).toBe(0);
  });

  it("creates one persistent invite and reports zero, not invented friends", async () => {
    const first = await sync(1);
    expect(first).toMatchObject({ qualifiedFriends: 0, pendingFriends: 0, target: 3, rewardGranted: false });
    expect((await sync(1)).inviteCode).toBe(first.inviteCode);
  });

  it("attributes only new verified accounts, never self, existing, expired or invalid invites", async () => {
    const { inviteCode } = await sync(1);
    expect(await attribute(1, inviteCode)).toEqual({ ok: false, code: "SELF_REFERRAL" });
    expect(await attribute(9, inviteCode)).toEqual({ ok: false, code: "EXISTING_ACCOUNT" });
    expect(await attribute(10, inviteCode)).toEqual({ ok: false, code: "VERIFY_EMAIL" });
    expect(await attribute(2, inviteCode, accepted, now - 1)).toEqual({ ok: false, code: "EXPIRED_INVITE" });
    expect(await attribute(2, uid(999))).toEqual({ ok: false, code: "INVALID_INVITE" });
    expect(await attribute(2, inviteCode)).toEqual({ ok: true });
    expect(await attribute(2, inviteCode)).toEqual({ ok: true });
    expect(await attribute(2, (await sync(8)).inviteCode)).toEqual({ ok: false, code: "ALREADY_ATTRIBUTED" });
  });

  it("does not count signups, bot-only matches or pre-invite matches", async () => {
    const { inviteCode } = await sync(1);
    await attribute(3, inviteCode);
    await attribute(4, inviteCode);
    await match("bot-only", 2, 20, true);
    await match("too-early", 3, 20, false, accepted - 1000);
    expect(await sync(1)).toMatchObject({ qualifiedFriends: 0, pendingFriends: 3, rewardGranted: false });
  });

  it("counts distinct people once and atomically grants the whole pack at three", async () => {
    await match("human-a", 2, 20);
    await match("human-a-again", 2, 20);
    expect(await sync(1)).toMatchObject({ qualifiedFriends: 1, pendingFriends: 2, rewardGranted: false });
    await match("human-b", 3, 20);
    await match("human-c", 4, 20);
    const reads = await Promise.all([sync(1), sync(1), sync(1)]);
    expect(reads.every(p => p.qualifiedFriends === 3 && p.rewardGranted)).toBe(true);
    expect(await value<number>("SELECT count(*)::int FROM user_cosmetics WHERE user_id = $1", [uid(1)])).toBe(3);
    expect(await value<number>("SELECT count(DISTINCT source_reference)::int FROM user_cosmetics WHERE user_id = $1", [uid(1)])).toBe(1);
  });

  it("qualifies an in-window match even if progress is refreshed after expiry", async () => {
    const { inviteCode } = await sync(5);
    await attribute(6, inviteCode);
    await match("finished-in-time", 6, 20);
    await db.query("UPDATE referral_attributions SET expires_at = $1 WHERE invitee_id = $2",
      [new Date(now + 1).toISOString(), uid(6)]);
    expect(await value<boolean>("SELECT expires_at < clock_timestamp() FROM referral_attributions WHERE invitee_id = $1", [uid(6)])).toBe(true);
    expect((await sync(5)).qualifiedFriends).toBe(1);
  });

  it("uses exactly 720 elapsed hours even across daylight-saving changes", async () => {
    await sync(17);
    await db.exec("SET TIME ZONE 'America/New_York'");
    try {
      await db.query(`INSERT INTO referral_attributions(invitee_id, referrer_id, accepted_at, expires_at)
        VALUES ($1, $2, '2026-03-01T12:00:00Z', '2026-03-01T12:00:00Z'::timestamptz + interval '720 hours')`, [uid(18), uid(17)]);
    } finally { await db.exec("SET TIME ZONE 'UTC'"); }
  });

  it("refuses browser access and service-only RPCs", async () => {
    await db.exec("SET ROLE authenticated");
    try {
      await expect(db.query("SELECT * FROM referral_attributions")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT referral_sync($1)", [uid(1)])).rejects.toThrow("permission denied");
      await expect(db.query("SELECT referral_attribute($1, $2::uuid, $3, $4)", [uid(2), uid(3), accepted, expiry]))
        .rejects.toThrow("permission denied");
    } finally { await db.exec("RESET ROLE"); }
  });

  it("rolls qualification and grants back together when a pack item is unavailable", async () => {
    const { inviteCode } = await sync(11);
    for (const id of [12, 13, 14]) {
      await attribute(id, inviteCode);
      await match(`atomic-${id}`, id, 20);
    }
    await db.exec("UPDATE cosmetic_catalog SET unlock_method = 'COIN_PURCHASE' WHERE id = 'title_gang_leader'");
    try {
      await expect(sync(11)).rejects.toThrow("REFERRAL_PACK_UNAVAILABLE");
      expect(await value<number>("SELECT count(*)::int FROM user_cosmetics WHERE user_id = $1", [uid(11)])).toBe(0);
      expect(await value<number>("SELECT count(*)::int FROM referral_attributions WHERE referrer_id = $1 AND qualified_at IS NOT NULL", [uid(11)])).toBe(0);
    } finally {
      await db.exec("UPDATE cosmetic_catalog SET unlock_method = 'REFERRAL_MILESTONE' WHERE id = 'title_gang_leader'");
    }
    expect(await sync(11)).toMatchObject({ qualifiedFriends: 3, rewardGranted: true });
  });

  it("does not qualify a match completed after the acceptance window", async () => {
    const { inviteCode } = await sync(15);
    await attribute(16, inviteCode);
    await db.query("UPDATE referral_attributions SET expires_at = $1 WHERE invitee_id = $2",
      [new Date(now - 120000).toISOString(), uid(16)]);
    await match("late-match", 16, 20);
    expect(await sync(15)).toMatchObject({ qualifiedFriends: 0, pendingFriends: 0, rewardGranted: false });
  });

  it("honours the operational campaign switch and requires verified members", async () => {
    await expect(sync(10)).rejects.toThrow("REFERRAL_VERIFIED_MEMBER_REQUIRED");
    const { inviteCode } = await sync(1);
    await db.exec("UPDATE referral_campaign SET enabled = false");
    try {
      expect(await value<boolean>("SELECT referral_invite_valid($1::uuid)", [inviteCode])).toBe(false);
      await expect(sync(1)).rejects.toThrow("REFERRAL_UNAVAILABLE");
    } finally { await db.exec("UPDATE referral_campaign SET enabled = true"); }
  });

  it("persists progress and entitlements across database restart", async () => {
    await db.close();
    db = new PGlite(join(directory, "postgres"));
    expect(await sync(1)).toMatchObject({ qualifiedFriends: 3, rewardGranted: true });
    expect(await value<number>("SELECT count(*)::int FROM user_cosmetics WHERE user_id = $1", [uid(1)])).toBe(3);
  }, 30000);

  it("cascades account deletion to attribution and owned referral rows", async () => {
    await db.query("DELETE FROM player_identities WHERE player_id = $1", [uid(5)]);
    expect(await value<number>("SELECT count(*)::int FROM referral_attributions WHERE referrer_id = $1", [uid(5)])).toBe(0);
    await db.query("DELETE FROM player_identities WHERE player_id = $1", [uid(2)]);
    expect(await sync(1)).toMatchObject({ qualifiedFriends: 3, rewardGranted: true });
  });
});
