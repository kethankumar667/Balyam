import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReferralAttributionResult, ReferralOverview, ReferralProgress } from "@shared/referrals.js";
import { normalizeReferralCode } from "@shared/referrals.js";

/**
 * The referral bonus SQL, run for real in embedded PostgreSQL: the shareable code, typed-code redeem and undo,
 * qualification that does not wait for the inviter, the cap, and the overview the referral page reads.
 * The coins themselves are paid by the reward gateway (ReferralBonusService), which has its own tests.
 */

let db: PGlite;
let directory: string;
const now = Date.now();
const hour = 3_600_000;
const day = 24 * hour;
const uid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const CODE_FORMAT = /^BHALYAM-[2-9BCDFGHJKLMNPRSTVWXZ]{5}$/;

async function value<T>(sql: string, args: (string | number | null)[] = []): Promise<T> {
  const { rows } = await db.query<{ result: T }>(`SELECT (${sql}) AS result`, args);
  return rows[0]!.result;
}
const sync = (id: number) => value<ReferralProgress>("SELECT referral_sync($1)", [uid(id)]);
const redeem = (id: number, code: string) => value<ReferralAttributionResult>("SELECT referral_redeem_code($1, $2)", [uid(id), code]);
const overview = (id: number) => value<ReferralOverview>("SELECT referral_overview($1)", [uid(id)]);
const codeOf = async (id: number) => (await sync(id)).shareCode!;

async function match(id: string, player: number, other: number, opts: { bot?: boolean; finished?: number; started?: number } = {}) {
  const finished = opts.finished ?? now + hour;
  const started = opts.started ?? finished - 60_000;
  await db.query("INSERT INTO match_summaries VALUES ($1, $2, $3, 60000)",
    [id, new Date(started).toISOString(), new Date(finished).toISOString()]);
  await db.query("INSERT INTO match_participants VALUES ($1, $2, false), ($1, $3, $4)",
    [id, uid(player), uid(other), opts.bot ?? false]);
}

/** Players 1-30 registered an hour ago, except 13 (ten days ago: too late for a code) and 14 (email unverified). */
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "bhalyam-referral-bonus-"));
  db = new PGlite(join(directory, "postgres"));
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz, email_confirmed_at timestamptz);
    CREATE TABLE player_identities(player_id text PRIMARY KEY, kind text, auth_user_id uuid, erased_at timestamptz);
    CREATE TABLE profiles(id uuid PRIMARY KEY, display_name text, avatar_id text, email text, dob date);
    CREATE TABLE cosmetic_catalog(id text PRIMARY KEY, category text, name text, description text,
      price_coins bigint, rarity text, unlock_method text, is_active boolean, display_order int);
    CREATE TABLE user_cosmetics(user_id text REFERENCES player_identities ON DELETE CASCADE,
      cosmetic_id text REFERENCES cosmetic_catalog, source_type text, source_reference text,
      UNIQUE(user_id, cosmetic_id));
    CREATE TABLE match_summaries(id text PRIMARY KEY, started_at timestamptz, finished_at timestamptz, duration_ms int);
    CREATE TABLE match_participants(match_id text REFERENCES match_summaries, player_id text,
      is_bot boolean, PRIMARY KEY(match_id, player_id));
    CREATE TABLE reward_ledger(player_id text, reward_type text, source_id text, amount int, status text,
      vesting_until timestamptz, released_at timestamptz, reward_id text, earned_at timestamptz DEFAULT now(),
      UNIQUE(player_id, reward_type, source_id));
  `);
  for (let i = 1; i <= 30; i++) {
    const created = i === 13 ? now - 10 * day : now - hour;
    await db.query("INSERT INTO auth.users VALUES ($1, $2, $3)", [
      uid(i), new Date(created).toISOString(), i === 14 ? null : new Date(created + 1000).toISOString(),
    ]);
    await db.query("INSERT INTO player_identities VALUES ($1, 'member', $2, null)", [uid(i), uid(i)]);
    await db.query("INSERT INTO profiles VALUES ($1, $2, $3, $4, '2001-08-06')", [uid(i), `Player ${i}`, `avatar-${i}`, `p${i}@example.com`]);
  }
  for (const file of ["20261108000000_referrals", "20261108000001_nostalgia_pack", "20261111000000_referral_bonus", "20261112000000_referral_event_context", "20261113000000_referral_admin"]) {
    await db.exec(await readFile(new URL(`../../../../supabase/migrations/${file}.sql`, import.meta.url), "utf8"));
  }
  // The migration's own campaign starts the bonus at "now"; these tests accept friends "an hour ago".
  await db.exec("UPDATE referral_campaign SET bonus_starts_at = '2000-01-01'");
}, 30000);

afterAll(async () => {
  await db?.close();
  if (directory) await rm(directory, { recursive: true });
});

describe("the shareable code", () => {
  it("is BHALYAM plus five characters with no vowels, stable per member and different between members", async () => {
    const a = await codeOf(1);
    const b = await codeOf(2);
    expect(a).toMatch(CODE_FORMAT);
    expect(b).toMatch(CODE_FORMAT);
    expect(a).not.toBe(b);
    expect(await codeOf(1)).toBe(a);
  });

  it("carries nothing about the member: no name, no birthday digits", async () => {
    const code = await codeOf(3);
    expect(code.toLowerCase()).not.toContain("player");
    expect(code).not.toContain("0806");
    expect(code.slice(8)).toMatch(/^[2-9BCDFGHJKLMNPRSTVWXZ]+$/);
  });

  it("normalises in SQL exactly as the shared helper does", async () => {
    const samples = ["bhalyam k7m2q", "BHALYAM-K7M2Q", "k7m2q", "  Bhalyam_k7m2q ", "BHALYAM-K7M2", "BHALYAM-A7M2Q", "hello", "BHALYAM-K7M2Q9"];
    for (const sample of samples) {
      expect(await value<string | null>("SELECT referral_normalize_code($1)", [sample]), sample).toBe(normalizeReferralCode(sample));
    }
  });

  it("is only a valid code for a verified member in an enabled campaign", async () => {
    const code = await codeOf(4);
    expect(await value<boolean>("SELECT referral_code_valid($1)", [code])).toBe(true);
    expect(await value<boolean>("SELECT referral_code_valid($1)", [code.toLowerCase().replace("-", " ")])).toBe(true);
    expect(await value<boolean>("SELECT referral_code_valid($1)", ["BHALYAM-22222"])).toBe(false);
    expect(await value<boolean>("SELECT referral_code_valid($1)", ["not a code"])).toBe(false);
  });
});

describe("redeeming a typed code", () => {
  it("attaches a new verified member, and says so again on a repeat", async () => {
    const code = await codeOf(5);
    expect(await redeem(6, code)).toEqual({ ok: true });
    expect(await redeem(6, code)).toEqual({ ok: true });
    expect(await value<string>("SELECT via FROM referral_attributions WHERE invitee_id = $1", [uid(6)])).toBe("code");
  });

  it("refuses an unknown code, your own, an unverified account, a second inviter and a late account", async () => {
    const code = await codeOf(5);
    expect(await redeem(7, "BHALYAM-22222")).toEqual({ ok: false, code: "INVALID_CODE" });
    expect(await redeem(7, "banana")).toEqual({ ok: false, code: "INVALID_CODE" });
    expect(await redeem(5, code)).toEqual({ ok: false, code: "SELF_REFERRAL" });
    expect(await redeem(14, code)).toEqual({ ok: false, code: "VERIFY_EMAIL" });
    expect(await redeem(6, await codeOf(8))).toEqual({ ok: false, code: "ALREADY_ATTRIBUTED" });
    expect(await redeem(13, code)).toEqual({ ok: false, code: "TOO_LATE" });
  });

  it("refuses someone who has already played a human match", async () => {
    await match("played-before", 9, 25, { finished: now - 30 * 60_000 });
    expect(await redeem(9, await codeOf(5))).toEqual({ ok: false, code: "ALREADY_PLAYED" });
  });

  it("lets a mistyped code be taken back until the first qualifying match, and not after", async () => {
    const code = await codeOf(10);
    expect(await redeem(11, code)).toEqual({ ok: true });
    expect(await value("SELECT referral_detach($1)", [uid(11)])).toEqual({ ok: true });
    expect(await value("SELECT referral_detach($1)", [uid(11)])).toEqual({ ok: false, code: "NOT_ATTACHED" });
    expect(await redeem(11, code)).toEqual({ ok: true });
    await match("detach-lock", 11, 25);
    await db.query("SELECT referral_qualify_open()");
    expect(await value("SELECT referral_detach($1)", [uid(11)])).toEqual({ ok: false, code: "NOT_ATTACHED" });
  });
});

describe("qualification without the inviter opening a page", () => {
  it("qualifies on a human match and ignores a bot-only match", async () => {
    const code = await codeOf(15);
    await redeem(16, code);
    await redeem(17, code);
    await match("bot-only-q", 16, 25, { bot: true });
    await match("human-q", 17, 25);
    const result = await value<{ qualified: number; referrers: string[] }>("SELECT referral_qualify_open(200)");
    expect(result.qualified).toBe(1);
    expect(result.referrers).toEqual([uid(15)]);
    expect(await value<boolean>("SELECT qualified_at IS NOT NULL FROM referral_attributions WHERE invitee_id = $1", [uid(17)])).toBe(true);
    expect(await value<boolean>("SELECT qualified_at IS NULL FROM referral_attributions WHERE invitee_id = $1", [uid(16)])).toBe(true);
  });

  it("does not count a match that started before the code was entered", async () => {
    const code = await codeOf(15);
    await redeem(18, code);
    await match("too-early-q", 18, 25, { started: now - 5 * hour, finished: now - 4 * hour });
    await db.query("SELECT referral_qualify_open()");
    expect(await value<boolean>("SELECT qualified_at IS NULL FROM referral_attributions WHERE invitee_id = $1", [uid(18)])).toBe(true);
  });
});

describe("the bonus reservation", () => {
  it("lists only qualified, unissued attributions accepted after the bonus began", async () => {
    const due = await value<Array<{ inviteeId: string; referrerId: string; inviterBonus: number; inviteeBonus: number }>>("SELECT referral_bonus_due(50)");
    const entry = due.find((d) => d.inviteeId === uid(17));
    expect(entry).toEqual({ inviteeId: uid(17), referrerId: uid(15), inviterBonus: 2000, inviteeBonus: 2000 });
    expect(due.find((d) => d.inviteeId === uid(16))).toBeUndefined();
    await db.exec("UPDATE referral_campaign SET bonus_starts_at = now() + interval '1 day'");
    expect(await value<unknown[]>("SELECT referral_bonus_due(50)")).toEqual([]);
    await db.exec("UPDATE referral_campaign SET bonus_starts_at = '2000-01-01'");
  });

  it("reserves once, answers the same on a retry, and is closed by complete", async () => {
    const first = await value<{ state: string; inviterBonus: number }>("SELECT referral_bonus_reserve($1)", [uid(17)]);
    expect(first).toMatchObject({ state: "RESERVED", referrerId: uid(15), inviterBonus: 2000, inviteeBonus: 2000 });
    expect(await value<{ state: string }>("SELECT referral_bonus_reserve($1)", [uid(17)])).toMatchObject({ state: "RESERVED" });
    await db.query("SELECT referral_bonus_complete($1)", [uid(17)]);
    expect(await value("SELECT referral_bonus_reserve($1)", [uid(17)])).toEqual({ state: "ISSUED" });
    const due = await value<Array<{ inviteeId: string }>>("SELECT referral_bonus_due(50)");
    expect(due.find((d) => d.inviteeId === uid(17))).toBeUndefined();
  });

  it("refuses a bonus for someone who has not qualified", async () => {
    expect(await value("SELECT referral_bonus_reserve($1)", [uid(16)])).toEqual({ state: "NOT_QUALIFIED" });
    expect(await value("SELECT referral_bonus_reserve($1)", [uid(30)])).toEqual({ state: "NOT_QUALIFIED" });
  });

  it("blocks friends past the rolling cap, and only blocks, never pays them", async () => {
    await db.exec("UPDATE referral_campaign SET rolling_cap = 2");
    const code = await codeOf(20);
    for (const friend of [21, 22, 23]) {
      await redeem(friend, code);
      await match(`cap-${friend}`, friend, 25);
    }
    await db.query("SELECT referral_qualify_open()");
    const states: string[] = [];
    for (const friend of [21, 22, 23]) {
      states.push((await value<{ state: string }>("SELECT referral_bonus_reserve($1)", [uid(friend)])).state);
    }
    expect(states).toEqual(["RESERVED", "RESERVED", "BLOCKED"]);
    expect(await value("SELECT referral_bonus_reserve($1)", [uid(23)])).toEqual({ state: "BLOCKED", reason: "CAP" });
    await db.exec("UPDATE referral_campaign SET rolling_cap = 10");
  });

  it("never lets a reserved bonus be taken back", async () => {
    expect(await value("SELECT referral_detach($1)", [uid(21)])).toEqual({ ok: false, code: "NOT_ATTACHED" });
  });
});

describe("the overview the page reads", () => {
  it("lists friends with names and bonus states, uncapped totals, and nothing private", async () => {
    await db.query("INSERT INTO reward_ledger VALUES ($1, 'REFERRAL', $2, 2000, 'RELEASED', now(), now())", [uid(20), `referral:${uid(21)}:inviter`]);
    await db.query("INSERT INTO reward_ledger VALUES ($1, 'REFERRAL', $2, 2000, 'PENDING', now() + interval '1 day', null)", [uid(20), `referral:${uid(22)}:inviter`]);
    const view = await overview(20);
    expect(view.shareCode).toMatch(CODE_FORMAT);
    expect(view.campaign).toMatchObject({ inviterBonus: 2000, inviteeBonus: 2000, rollingCap: 10, codeWindowDays: 7, target: 3 });
    expect(view.totals).toMatchObject({ joined: 3, qualified: 3, waiting: 0, expired: 0, bonusCredited: 2000, bonusPending: 2000 });
    expect(view.friends.map((f) => f.ordinal)).toEqual([1, 2, 3]);
    const byName = Object.fromEntries(view.friends.map((f) => [f.displayName, f]));
    expect(byName["Player 21"]!.yourBonus.state).toBe("CREDITED");
    expect(byName["Player 22"]!.yourBonus).toMatchObject({ state: "VESTING", amount: 2000 });
    expect(byName["Player 22"]!.yourBonus.vestingUntil).toBeGreaterThan(Date.now());
    expect(byName["Player 23"]!.yourBonus).toMatchObject({ state: "BLOCKED", blockedReason: "CAP" });
    expect(byName["Player 21"]!.theirBonus.state).toBe("PENDING");
    expect(view.pack).toEqual({ granted: true, qualifiedFriends: 3, target: 3 });
    for (const friend of view.friends) {
      expect(Object.keys(friend).sort()).toEqual(
        ["avatarId", "displayName", "expiresAt", "joinedAt", "ordinal", "qualifiedAt", "status", "theirBonus", "via", "yourBonus"],
      );
    }
    expect(JSON.stringify(view)).not.toMatch(/example\.com|2001-08-06|dob|email/i);
  });

  it("shows the invitee who referred them, and whether a wrong code can still be removed", async () => {
    const view = await overview(6);
    expect(view.referredBy).toMatchObject({ displayName: "Player 5", status: "JOINED", via: "code", canDetach: true });
    expect(view.referredBy!.yourBonus.state).toBe("NONE");
    expect(view.canEnterCode).toBe(false);
  });

  it("lets a brand-new member with no inviter and no human match enter a code", async () => {
    const view = await overview(24);
    expect(view.referredBy).toBeNull();
    expect(view.canEnterCode).toBe(true);
    expect(view.friends).toEqual([]);
    expect(view.totals).toMatchObject({ joined: 0, bonusCredited: 0, bonusPending: 0 });
    expect(await overview(13)).toMatchObject({ canEnterCode: false });
  });

  it("stops offering the code field to a member who has already played with other people", async () => {
    expect(await overview(25)).toMatchObject({ canEnterCode: false });
  });

  it("is refused for an unverified account", async () => {
    await expect(overview(14)).rejects.toThrow("REFERRAL_VERIFIED_MEMBER_REQUIRED");
  });
});

describe("the nostalgia pack milestone is unchanged", () => {
  it("is granted when the third friend qualifies, with no page open, and sync agrees", async () => {
    expect(await value<number>("SELECT count(*)::int FROM user_cosmetics WHERE user_id = $1", [uid(20)])).toBe(3);
    expect(await sync(20)).toMatchObject({ qualifiedFriends: 3, rewardGranted: true });
  });
});

describe("who a live notice is about", () => {
  type Context = { referrerId: string; inviteeName: string; referrerName: string } | null;
  const context = (invitee: number) => value<Context>("SELECT referral_event_context($1)", [uid(invitee)]);

  it("names both sides and the inviter for one invitee", async () => {
    // Player 5 invited Player 6 earlier in this file.
    expect(await context(6)).toEqual({ referrerId: uid(5), inviteeName: "Player 6", referrerName: "Player 5" });
  });

  it("knows nothing about someone who joined with no code", async () => {
    expect(await context(29)).toBeNull();
  });

  it("returns only ids and display names: never an email, a birthday or an avatar", async () => {
    const result = await context(6);
    expect(Object.keys(result!).sort()).toEqual(["inviteeName", "referrerId", "referrerName"]);
    expect(JSON.stringify(result)).not.toMatch(/example\.com|2001-08-06|avatar/i);
  });

  it("falls back to a neutral name for a member with no display name", async () => {
    await db.query("UPDATE profiles SET display_name = '   ' WHERE id = $1", [uid(6)]);
    try {
      expect((await context(6))!.inviteeName).toBe("A new member");
    } finally {
      await db.query("UPDATE profiles SET display_name = 'Player 6' WHERE id = $1", [uid(6)]);
    }
  });

  it("cannot be called from the browser", async () => {
    await db.exec("SET ROLE authenticated");
    try {
      await expect(db.query("SELECT referral_event_context($1)", [uid(6)])).rejects.toThrow("permission denied");
    } finally {
      await db.exec("RESET ROLE");
    }
  });
});

describe("the operator console", () => {
  interface AdminOverview {
    campaign: { enabled: boolean; inviterBonus: number; inviteeBonus: number; rollingCap: number; capWindowDays: number; codeWindowDays: number };
    funnel: Record<string, number>;
    liability: Record<string, number>;
    topReferrers: Array<{ playerId: string; displayName: string; joined: number; qualified: number }>;
    serverNow: number;
  }
  interface PendingReward { rewardId: string; playerId: string; displayName: string; side: string; inviteeId: string; amount: number; status: string; vestingUntil: number }
  interface AdminEvent { actor: string; action: string; note: string; detail: { before?: Record<string, number>; after?: Record<string, number> } }

  const adminOverview = () => value<AdminOverview>("SELECT referral_admin_overview()");
  const pending = (limit = 50) => value<PendingReward[]>("SELECT referral_admin_pending_rewards($1)", [limit]);
  const setCampaign = (patch: object, note = "Test change", actor = "admin:test") =>
    value<AdminOverview["campaign"]>("SELECT referral_admin_set_campaign($1, $2, $3::jsonb)", [actor, note, JSON.stringify(patch)]);
  const events = (limit = 30) => value<AdminEvent[]>("SELECT referral_admin_events_list($1)", [limit]);
  const campaignRow = () => value<unknown>("SELECT to_jsonb(c) FROM referral_campaign c WHERE id = 'nostalgia-v1'");
  const insertReward = (id: string, player: number, source: string, amount: number, status: string, vesting: string) =>
    db.query("INSERT INTO reward_ledger(player_id, reward_type, source_id, amount, status, vesting_until, reward_id) VALUES ($1, 'REFERRAL', $2, $3, $4, $5::timestamptz, $6)",
      [uid(player), source, amount, status, vesting, id]);

  it("reports a funnel that adds up and matches the tables", async () => {
    const view = await adminOverview();
    const [direct] = (await db.query<{ joined: string; qualified: string; invites: string }>(
      "SELECT (SELECT count(*) FROM referral_attributions) AS joined, (SELECT count(*) FROM referral_attributions WHERE qualified_at IS NOT NULL) AS qualified, (SELECT count(*) FROM referral_invites) AS invites",
    )).rows;
    expect(view.funnel.joined).toBe(Number(direct!.joined));
    expect(view.funnel.qualified).toBe(Number(direct!.qualified));
    expect(view.funnel.invitesCreated).toBe(Number(direct!.invites));
    expect(view.funnel.viaCode + view.funnel.viaLink).toBe(view.funnel.joined);
    expect(view.funnel.qualified + view.funnel.waiting + view.funnel.expired).toBe(view.funnel.joined);
    expect(view.serverNow).toBeGreaterThan(0);
  });

  it("shows the live campaign settings", async () => {
    expect((await adminOverview()).campaign).toMatchObject({ enabled: true, inviterBonus: 2000, inviteeBonus: 2000, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7 });
  });

  it("lists the accounts with the most invitees, with names and counts, never an email or birthday", async () => {
    const view = await adminOverview();
    expect(view.topReferrers.length).toBeGreaterThan(0);
    expect(view.topReferrers.length).toBeLessThanOrEqual(5);
    const joined = view.topReferrers.map(r => r.joined);
    expect([...joined].sort((a, b) => b - a)).toEqual(joined);
    for (const row of view.topReferrers) expect(Object.keys(row).sort()).toEqual(["displayName", "joined", "playerId", "qualified"]);
    expect(JSON.stringify(view)).not.toMatch(/example\.com|2001-08-06|dob|email/i);
  });

  it("totals the coins by where they are: waiting, paid, withdrawn", async () => {
    const before = (await adminOverview()).liability;
    await insertReward("adm-r1", 4, `referral:${uid(40)}:inviter`, 2000, "PENDING", "2030-01-02T00:00:00Z");
    await insertReward("adm-r2", 5, `referral:${uid(41)}:inviter`, 2000, "RELEASING", "2030-01-03T00:00:00Z");
    await insertReward("adm-r3", 6, `referral:${uid(42)}:inviter`, 1500, "RELEASED", "2030-01-01T00:00:00Z");
    await insertReward("adm-r4", 7, `referral:${uid(43)}:inviter`, 500, "VOIDED", "2030-01-01T00:00:00Z");
    const after = (await adminOverview()).liability;
    expect(after.pendingCoins - before.pendingCoins).toBe(4000);
    expect(after.pendingCount - before.pendingCount).toBe(2);
    expect(after.releasedCoins - before.releasedCoins).toBe(1500);
    expect(after.voidedCoins - before.voidedCoins).toBe(500);
  });

  it("lists only bonuses still in their hold, soonest first, by name and side", async () => {
    const rows = await pending();
    const ids = rows.map(r => r.rewardId);
    expect(ids).toContain("adm-r1");
    expect(ids).toContain("adm-r2");
    expect(ids).not.toContain("adm-r3");
    expect(ids).not.toContain("adm-r4");
    expect(ids.indexOf("adm-r1")).toBeLessThan(ids.indexOf("adm-r2"));
    expect(rows.find(r => r.rewardId === "adm-r1")).toMatchObject({
      playerId: uid(4), displayName: "Player 4", side: "inviter", inviteeId: uid(40), amount: 2000, status: "PENDING",
    });
    expect(rows.every(r => r.status === "PENDING" || r.status === "RELEASING")).toBe(true);
  });

  it("caps how many bonuses one request returns", async () => {
    expect(await pending(1)).toHaveLength(1);
    expect((await pending(100000)).length).toBeLessThanOrEqual(200);
  });

  describe("changing the campaign", () => {
    afterAll(async () => { await setCampaign({ inviterBonus: 2000, inviteeBonus: 2000, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7 }, "Restore test defaults"); });

    it("updates only the fields sent, returns the new settings, and records before and after with who and why", async () => {
      const result = await setCampaign({ inviterBonus: 2500, rollingCap: 8 }, "Weekend boost for the launch", "admin:asha");
      expect(result).toMatchObject({ inviterBonus: 2500, inviteeBonus: 2000, rollingCap: 8, capWindowDays: 30, codeWindowDays: 7 });
      const [latest] = await events(1);
      expect(latest).toMatchObject({ actor: "admin:asha", action: "CAMPAIGN_UPDATED", note: "Weekend boost for the launch" });
      expect(latest!.detail.before).toMatchObject({ inviterBonus: 2000, rollingCap: 10 });
      expect(latest!.detail.after).toMatchObject({ inviterBonus: 2500, rollingCap: 8 });
    });

    it("refuses a change with no note, and changes nothing", async () => {
      const before = await campaignRow();
      for (const note of ["", "   "]) {
        await expect(setCampaign({ inviterBonus: 100 }, note)).rejects.toThrow("NOTE_REQUIRED");
      }
      await expect(setCampaign({ inviterBonus: 100 }, "x".repeat(201))).rejects.toThrow("NOTE_REQUIRED");
      expect(await campaignRow()).toEqual(before);
    });

    it("refuses a missing actor, an empty change, and a field that is not editable", async () => {
      await expect(setCampaign({ inviterBonus: 100 }, "ok", "  ")).rejects.toThrow("ACTOR_REQUIRED");
      await expect(setCampaign({}, "ok")).rejects.toThrow("EMPTY_CHANGE");
      await expect(setCampaign({ enabled: false }, "ok")).rejects.toThrow("INVALID_CAMPAIGN_FIELD:enabled");
      await expect(setCampaign({ bonusStartsAt: 0 }, "ok")).rejects.toThrow("INVALID_CAMPAIGN_FIELD");
    });

    it("refuses a typo that would pay far too much, a negative, a fraction and a non-number", async () => {
      const before = await campaignRow();
      await expect(setCampaign({ inviterBonus: 20000 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:inviterBonus");
      await expect(setCampaign({ inviteeBonus: -1 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:inviteeBonus");
      await expect(setCampaign({ rollingCap: 101 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:rollingCap");
      await expect(setCampaign({ capWindowDays: 0 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:capWindowDays");
      await expect(setCampaign({ codeWindowDays: 61 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:codeWindowDays");
      await expect(setCampaign({ inviterBonus: 1.5 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE");
      await expect(setCampaign({ inviterBonus: "2000" })).rejects.toThrow("INVALID_CAMPAIGN_VALUE");
      expect(await campaignRow()).toEqual(before);
    });

    it("applies none of a change when one of its fields is bad", async () => {
      const before = await campaignRow();
      await expect(setCampaign({ inviterBonus: 1234, rollingCap: 5000 })).rejects.toThrow("INVALID_CAMPAIGN_VALUE:rollingCap");
      expect(await campaignRow()).toEqual(before);
    });

    it("lets the bonuses be set to zero, which is how they are stopped", async () => {
      expect(await setCampaign({ inviterBonus: 0, inviteeBonus: 0 }, "Pause the coin bonus")).toMatchObject({ inviterBonus: 0, inviteeBonus: 0 });
    });
  });

  describe("the record", () => {
    it("logs a withdrawn bonus, newest first, and refuses any other kind of entry", async () => {
      await db.query("SELECT referral_admin_log($1, 'REWARD_VOIDED', $2::jsonb, $3)", ["admin:asha", JSON.stringify({ rewardId: "adm-r1", amount: 2000 }), "Duplicate accounts"]);
      const [latest] = await events(1);
      expect(latest).toMatchObject({ actor: "admin:asha", action: "REWARD_VOIDED", note: "Duplicate accounts" });
      await expect(db.query("SELECT referral_admin_log($1, 'CAMPAIGN_UPDATED', '{}'::jsonb, 'x')", ["admin:asha"])).rejects.toThrow("INVALID_ACTION");
      await expect(db.query("SELECT referral_admin_log($1, 'REWARD_VOIDED', '{}'::jsonb, '')", ["admin:asha"])).rejects.toThrow();
    });

    it("cannot be edited or deleted through any function", async () => {
      const { rows } = await db.query<{ proname: string }>(
        "SELECT proname FROM pg_proc WHERE proname LIKE 'referral_admin_%' AND (proname LIKE '%delete%' OR proname LIKE '%update%' OR proname LIKE '%edit%')");
      expect(rows).toEqual([]);
    });
  });

  it("is closed to the browser: every function and the log table refuse an ordinary signed-in role", async () => {
    await db.exec("SET ROLE authenticated");
    try {
      await expect(db.query("SELECT referral_admin_overview()")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT referral_admin_pending_rewards(5)")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT referral_admin_set_campaign('a', 'b', '{\"inviterBonus\": 1}'::jsonb)")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT referral_admin_events_list(5)")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT * FROM referral_admin_events")).rejects.toThrow("permission denied");
    } finally {
      await db.exec("RESET ROLE");
    }
  });
});
