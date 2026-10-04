import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { SupabaseRewardRepository } from "../SupabaseRewardRepository.js";
import type { RewardRepository } from "../RewardRepository.js";
import { REASON, type RewardRecord } from "../types.js";

const T0 = 1_800_000_000_000;
const LEASE = 5 * 60_000;

function reward(over: Partial<RewardRecord> = {}): RewardRecord {
  return {
    rewardId: "rwd_1",
    playerId: "p1",
    rewardType: "LEVEL_MILESTONE",
    reasonCode: REASON.MILESTONE_LEVEL,
    amount: 500,
    sourceId: "level:5",
    earnedAt: T0,
    vestingUntil: T0 + 1_000,
    status: "PENDING",
    riskState: "NORMAL",
    ledgerEntryId: null,
    releaseStartedAt: null,
    releasedAt: null,
    voidedReason: null,
    description: "Level 5",
    ...over,
  };
}

/** The behaviour every store must have, written once so a second implementation can be held to it. */
function contract(name: string, make: () => RewardRepository): void {
  describe(`${name} — reward ledger`, () => {
    let repo: RewardRepository;
    beforeEach(() => {
      repo = make();
    });

    it("inserts a reward once and returns the original for a replay, without overwriting it", async () => {
      const first = await repo.insertReward(reward());
      const replay = await repo.insertReward(reward({ rewardId: "rwd_2", amount: 9_999 }));

      expect(first.inserted).toBe(true);
      expect(replay.inserted).toBe(false);
      expect(replay.record).toMatchObject({ rewardId: "rwd_1", amount: 500 });
    });

    it("keeps different sources, types and players separate", async () => {
      await repo.insertReward(reward());
      const other = [
        reward({ rewardId: "a", sourceId: "level:6" }),
        reward({ rewardId: "b", rewardType: "DAILY_STREAK" }),
        reward({ rewardId: "c", playerId: "p2" }),
      ];

      for (const r of other) expect((await repo.insertReward(r)).inserted).toBe(true);
    });

    it("cannot be claimed for release before it has vested", async () => {
      await repo.insertReward(reward());

      expect(await repo.claimForRelease("rwd_1", T0 + 999, T0 - LEASE)).toBe(false);
      expect(await repo.claimForRelease("rwd_1", T0 + 1_000, T0 + 1_000 - LEASE)).toBe(true);
    });

    it("can be claimed by only one caller", async () => {
      await repo.insertReward(reward());
      const now = T0 + 2_000;

      const results = await Promise.all([1, 2, 3].map(() => repo.claimForRelease("rwd_1", now, now - LEASE)));

      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("moves PENDING -> RELEASING -> RELEASED and refuses out-of-order moves", async () => {
      await repo.insertReward(reward());
      const now = T0 + 2_000;

      expect(await repo.completeRelease("rwd_1", 7, now)).toBe(false);
      await repo.claimForRelease("rwd_1", now, now - LEASE);
      expect(await repo.completeRelease("rwd_1", 7, now + 1)).toBe(true);
      expect(await repo.completeRelease("rwd_1", 8, now + 2)).toBe(false);

      expect(await repo.getReward("rwd_1")).toMatchObject({ status: "RELEASED", ledgerEntryId: 7, releasedAt: now + 1 });
    });

    it("redrives a stale RELEASING claim but not a fresh one", async () => {
      await repo.insertReward(reward());
      const claimedAt = T0 + 2_000;
      await repo.claimForRelease("rwd_1", claimedAt, claimedAt - LEASE);

      expect(await repo.claimForRelease("rwd_1", claimedAt + LEASE - 1, claimedAt - 1)).toBe(false);
      expect(await repo.claimForRelease("rwd_1", claimedAt + LEASE + 1, claimedAt + 1)).toBe(true);
    });

    it("voids only a reward that is still PENDING", async () => {
      await repo.insertReward(reward());
      await repo.insertReward(reward({ rewardId: "rwd_paid", sourceId: "level:6" }));
      const now = T0 + 2_000;
      await repo.claimForRelease("rwd_paid", now, now - LEASE);

      expect(await repo.voidPending("rwd_paid", "too late", now)).toBe(false);
      expect(await repo.voidPending("rwd_1", "ring", now)).toBe(true);
      expect(await repo.voidPending("rwd_1", "again", now)).toBe(false);
      expect(await repo.getReward("rwd_1")).toMatchObject({ status: "VOIDED", voidedReason: "ring" });
      expect(await repo.claimForRelease("rwd_1", now, now - LEASE)).toBe(false);
    });

    it("lists what is due: vested PENDING plus stale RELEASING, oldest first, and nothing else", async () => {
      await repo.insertReward(reward({ rewardId: "future", sourceId: "s1", vestingUntil: T0 + 10_000 }));
      await repo.insertReward(reward({ rewardId: "due_late", sourceId: "s2", vestingUntil: T0 + 2_000 }));
      await repo.insertReward(reward({ rewardId: "due_early", sourceId: "s3", vestingUntil: T0 + 1_000 }));
      await repo.insertReward(reward({ rewardId: "stale", sourceId: "s4", vestingUntil: T0 }));
      const claimedAt = T0 + 500;
      await repo.claimForRelease("stale", claimedAt, claimedAt - LEASE);

      const now = T0 + 5_000;
      // The claim was taken at T0+500; anything claimed before T0+1000 counts as stale.
      const due = await repo.listDueForRelease(now, T0 + 1_000, 10);

      expect(due.map((r) => r.rewardId)).toEqual(["stale", "due_early", "due_late"]);
    });

    it("lists a player's rewards newest first and a type's rewards oldest first", async () => {
      await repo.insertReward(reward({ rewardId: "old", sourceId: "s1", earnedAt: T0 }));
      await repo.insertReward(reward({ rewardId: "new", sourceId: "s2", earnedAt: T0 + 5 }));
      await repo.insertReward(reward({ rewardId: "other", sourceId: "s3", playerId: "p2", earnedAt: T0 + 9 }));

      expect((await repo.listRewardsForPlayer("p1")).map((r) => r.rewardId)).toEqual(["new", "old"]);
      expect((await repo.listRewardsByType("LEVEL_MILESTONE")).map((r) => r.rewardId)).toEqual(["old", "new", "other"]);
      expect((await repo.listRewardsByType("LEVEL_MILESTONE", { limit: 1, offset: 1 })).map((r) => r.rewardId)).toEqual(["new"]);
    });
  });

  describe(`${name} — risk`, () => {
    let repo: RewardRepository;
    beforeEach(() => {
      repo = make();
    });

    it("keeps the latest state per account", async () => {
      await repo.upsertRiskState({ playerId: "p1", state: "WATCHLIST", reasonCodes: ["a"], updatedAt: 1, updatedBy: "system" });
      await repo.upsertRiskState({ playerId: "p1", state: "RESTRICTED", reasonCodes: ["b"], updatedAt: 2, updatedBy: "op" });

      expect(await repo.listRiskStates()).toEqual([
        { playerId: "p1", state: "RESTRICTED", reasonCodes: ["b"], updatedAt: 2, updatedBy: "op" },
      ]);
    });

    it("keeps every event, filtered by time and kind, newest first per player", async () => {
      await repo.appendRiskEvent({ playerId: "p1", kind: "ABNORMAL_SESSION", reasonCode: "TOO_SHORT", detail: {}, createdAt: 10 });
      await repo.appendRiskEvent({ playerId: "p1", kind: "STATE_CHANGED", reasonCode: "X", detail: { to: "WATCHLIST" }, createdAt: 20 });
      await repo.appendRiskEvent({ playerId: "p2", kind: "ABNORMAL_SESSION", reasonCode: "TOO_SHORT", detail: {}, createdAt: 30 });

      expect((await repo.listRiskEventsSince(15)).map((e) => e.createdAt)).toEqual([20, 30]);
      expect((await repo.listRiskEventsSince(0, "ABNORMAL_SESSION")).map((e) => e.playerId)).toEqual(["p1", "p2"]);
      expect((await repo.listRiskEventsForPlayer("p1")).map((e) => e.createdAt)).toEqual([20, 10]);
    });
  });
}

contract("InMemoryRewardRepository", () => new InMemoryRewardRepository());

describe("SupabaseRewardRepository — every transition is a guarded request", () => {
  interface Call {
    method: string;
    url: URL;
    body: unknown;
    prefer: string | null;
  }
  let calls: Call[];
  let respond: (call: Call) => unknown;
  const repo = () => new SupabaseRewardRepository({ url: "https://db.test", serviceKey: "eyJ.test", timeoutMs: 2_000 });
  const row = (over: Record<string, unknown> = {}) => ({
    reward_id: "rwd_1",
    player_id: "p1",
    reward_type: "LEVEL_MILESTONE",
    reason_code: "MILESTONE_LEVEL",
    amount: 500,
    source_id: "level:5",
    earned_at: new Date(T0).toISOString(),
    vesting_until: new Date(T0 + 1_000).toISOString(),
    status: "PENDING",
    risk_state: "NORMAL",
    ledger_entry_id: null,
    release_started_at: null,
    released_at: null,
    voided_reason: null,
    description: "Level 5",
    ...over,
  });

  beforeEach(() => {
    calls = [];
    respond = () => [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        const call: Call = {
          method: init.method ?? "GET",
          url: new URL(input),
          body: init.body ? JSON.parse(String(init.body)) : null,
          prefer: (init.headers as Record<string, string>)?.Prefer ?? null,
        };
        calls.push(call);
        return new Response(JSON.stringify(respond(call)), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("claims for release only from PENDING and only once vested", async () => {
    respond = () => [row({ status: "RELEASING" })];

    expect(await repo().claimForRelease("rwd_1", T0 + 1_000, T0)).toBe(true);

    const filter = calls[0]!.url.searchParams;
    expect(calls[0]!.method).toBe("PATCH");
    expect(filter.get("status")).toBe("eq.PENDING");
    expect(filter.get("reward_id")).toBe("eq.rwd_1");
    expect(filter.get("vesting_until")).toBe(`lte.${new Date(T0 + 1_000).toISOString()}`);
    expect(calls[0]!.body).toMatchObject({ status: "RELEASING" });
  });

  it("falls back to redriving a stale RELEASING claim, and reports false when neither transition applied", async () => {
    respond = () => [];

    expect(await repo().claimForRelease("rwd_1", T0 + 9_000, T0)).toBe(false);

    expect(calls).toHaveLength(2);
    expect(calls[1]!.url.searchParams.get("status")).toBe("eq.RELEASING");
    expect(calls[1]!.url.searchParams.get("release_started_at")).toBe(`lt.${new Date(T0).toISOString()}`);
  });

  it("completes a release only from RELEASING", async () => {
    respond = () => [row({ status: "RELEASED" })];

    expect(await repo().completeRelease("rwd_1", 42, T0)).toBe(true);

    expect(calls[0]!.url.searchParams.get("status")).toBe("eq.RELEASING");
    expect(calls[0]!.body).toMatchObject({ status: "RELEASED", ledger_entry_id: 42 });
  });

  it("voids only from PENDING, so a payment in progress cannot be voided", async () => {
    respond = () => [];

    expect(await repo().voidPending("rwd_1", "ring", T0)).toBe(false);

    expect(calls[0]!.url.searchParams.get("status")).toBe("eq.PENDING");
    expect(calls[0]!.body).toMatchObject({ status: "VOIDED", voided_reason: "ring" });
  });

  it("inserts ignoring duplicates on the source key, and returns the original row for a replay", async () => {
    respond = (call) => (call.method === "POST" ? [] : [row()]);

    const result = await repo().insertReward({
      rewardId: "rwd_2",
      playerId: "p1",
      rewardType: "LEVEL_MILESTONE",
      reasonCode: REASON.MILESTONE_LEVEL,
      amount: 9_999,
      sourceId: "level:5",
      earnedAt: T0,
      vestingUntil: T0 + 1_000,
      status: "PENDING",
      riskState: "NORMAL",
      ledgerEntryId: null,
      releaseStartedAt: null,
      releasedAt: null,
      voidedReason: null,
      description: "again",
    });

    expect(calls[0]!.url.searchParams.get("on_conflict")).toBe("player_id,reward_type,source_id");
    expect(calls[0]!.prefer).toContain("resolution=ignore-duplicates");
    expect(result).toMatchObject({ inserted: false, record: { rewardId: "rwd_1", amount: 500 } });
  });

  it("maps a stored row back to the domain record, timestamps as epoch milliseconds", async () => {
    respond = () => [row({ status: "RELEASED", ledger_entry_id: 9, released_at: new Date(T0 + 5).toISOString() })];

    const record = await repo().getReward("rwd_1");

    expect(record).toMatchObject({
      rewardId: "rwd_1",
      earnedAt: T0,
      vestingUntil: T0 + 1_000,
      status: "RELEASED",
      ledgerEntryId: 9,
      releasedAt: T0 + 5,
    });
  });

  it("pings all three tables and both capped transfer functions, so a missing migration stops the boot", async () => {
    await repo().ping();

    expect(calls.map((c) => c.url.pathname)).toEqual([
      "/rest/v1/reward_ledger",
      "/rest/v1/account_risk",
      "/rest/v1/risk_events",
      "/rest/v1/rpc/transfer_wallet_coins_capped",
      "/rest/v1/rpc/fund_coin_request_capped",
    ]);
  });
});
