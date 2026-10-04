import { describe, it, expect } from "vitest";
import { SupabaseRewardRepository } from "../SupabaseRewardRepository.js";

/** What PostgREST says for a table or function that is not in the schema. */
const missingTable = (table: string) =>
  new Error(`PostgREST 404 on ${table}: {"code":"PGRST205","message":"Could not find the table 'public.${table}' in the schema cache"}`);
const missingFunction = (fn: string) =>
  new Error(`PostgREST 404 on rpc/${fn}: {"code":"PGRST202","message":"Could not find the function public.${fn} in the schema cache"}`);

interface FakeDb {
  select: (table: string) => Promise<unknown[]>;
  rpc: (fn: string) => Promise<unknown>;
}

function repoOver(db: FakeDb): SupabaseRewardRepository {
  const repo = new SupabaseRewardRepository({ url: "http://db.invalid", serviceKey: "k" } as never);
  (repo as unknown as { db: FakeDb }).db = db;
  return repo;
}

const present: FakeDb = {
  select: async () => [],
  // A function that exists refuses the null probe with a business error, not "not found".
  rpc: async () => {
    throw new Error('PostgREST 400 on rpc: {"message":"INVALID_AMOUNT: daily cap must be zero or more"}');
  },
};

describe("the reward store refuses to boot on a database that has not been migrated", () => {
  it("passes when every table and function is there", async () => {
    await expect(repoOver(present).ping()).resolves.toBeUndefined();
  });

  it("names the migration to run when the reward tables are missing", async () => {
    const repo = repoOver({ ...present, select: async (table) => { throw missingTable(table); } });

    await expect(repo.ping()).rejects.toThrow(/20261012000000_reward_gateway\.sql/);
  });

  it("reports every gap at once, not just the first", async () => {
    const repo = repoOver({
      select: async (table) => { throw missingTable(table); },
      rpc: async (fn) => { throw missingFunction(fn); },
    });

    const message = await repo.ping().then(() => "", (e: Error) => e.message);

    expect(message).toContain("table reward_ledger");
    expect(message).toContain("table account_risk");
    expect(message).toContain("table risk_events");
    expect(message).toContain("function transfer_wallet_coins_capped (20261013000000_transfer_daily_cap.sql)");
    expect(message).toContain("function fund_coin_request_capped (20261014000000_fund_coin_request_daily_cap.sql)");
  });

  it("notices a missing cap function even when the reward tables are fine", async () => {
    const repo = repoOver({
      ...present,
      rpc: async (fn) => {
        if (fn === "fund_coin_request_capped") throw missingFunction(fn);
        throw new Error("INVALID_AMOUNT: daily cap must be zero or more");
      },
    });

    const message = await repo.ping().then(() => "", (e: Error) => e.message);

    expect(message).toContain("fund_coin_request_capped");
    expect(message).not.toContain("transfer_wallet_coins_capped");
    expect(message).not.toContain("reward_ledger");
  });

  it("does not hide a real outage as a missing migration", async () => {
    const repo = repoOver({ ...present, select: async () => { throw new Error("PostgREST 503: upstream unavailable"); } });

    await expect(repo.ping()).rejects.toThrow("503");
  });
});
