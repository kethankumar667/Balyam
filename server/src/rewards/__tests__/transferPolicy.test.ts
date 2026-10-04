import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransferPolicy, type TransferLedgerSource } from "../TransferPolicy.js";
import { RiskService } from "../RiskService.js";
import { TrustService, TIER_REQUIREMENTS, type TrustProviders } from "../TrustService.js";
import { REASON } from "../types.js";
import { MandaliRepository } from "../../mandali/MandaliRepository.js";
import { MandaliService } from "../../mandali/MandaliService.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { TransferCapExceededError } from "../../persistence/EconomyRepository.js";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 8, 29, 12, 0, 0);
const DAY_START = Math.floor(T0 / DAY) * DAY;

type LedgerEntry = { entryType: string; amount: string; createdAt: number };

/** A ledger newest-first, paged the way the wallet's own is. */
function fakeLedger(entries: LedgerEntry[]): TransferLedgerSource & { reads: number } {
  const source = {
    reads: 0,
    async getLedger(_id: string, opts: { limit?: number; offset?: number } = {}) {
      source.reads += 1;
      const offset = opts.offset ?? 0;
      return entries.slice(offset, offset + (opts.limit ?? 20));
    },
  };
  return source;
}

const sent = (amount: number, at = T0 - 1_000): LedgerEntry => ({ entryType: "P2P_TRANSFER_SEND", amount: String(-amount), createdAt: at });

/** Providers that give a player exactly the tier's requirements. */
function providersForTier(tier: 1 | 2 | 3 | 4): TrustProviders {
  const need = (key: "age" | "matches" | "opponents" | "mandalis") =>
    tier === 1 ? 0 : (TIER_REQUIREMENTS[tier].find((c) => c.key === key)?.min ?? 0);
  return {
    accountAgeDays: () => need("age"),
    opponentStats: () => ({ realPeopleMatches: need("matches"), distinctOpponents: need("opponents") }),
    activeMandalis: async () => need("mandalis"),
  };
}

function policyFor(entries: LedgerEntry[], tier: 1 | 2 | 3 | 4 = 1, risk = new RiskService(), now = T0) {
  const trust = new TrustService();
  trust.setProviders(providersForTier(tier));
  return { policy: new TransferPolicy({ ledger: fakeLedger(entries), risk, trust, now: () => now }), risk };
}

describe("serialised sends", () => {
  it("runs one sender's checks and sends one after another, so parallel sends cannot all read the same total", async () => {
    const entries: LedgerEntry[] = [];
    const ledger: TransferLedgerSource = { getLedger: async () => entries.slice() };
    const trust = new TrustService();
    trust.setProviders(providersForTier(1));
    const policy = new TransferPolicy({ ledger, risk: new RiskService(), trust, now: () => T0 });

    // Each send checks, then records itself after a tick — exactly the shape that raced.
    const send = () =>
      policy.serialised("p", async () => {
        const verdict = await policy.check("p", 100);
        if (!verdict.ok) return false;
        await new Promise((r) => setTimeout(r, 1));
        entries.unshift(sent(100));
        return true;
      });
    const results = await Promise.all(Array.from({ length: 30 }, send));

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(entries.reduce((n, e) => n + Math.abs(Number(e.amount)), 0)).toBe(500);
  });

  it("does not make different senders wait for each other, and a failed send does not block the next", async () => {
    const trust = new TrustService();
    trust.setProviders(providersForTier(1));
    const policy = new TransferPolicy({ ledger: fakeLedger([]), risk: new RiskService(), trust, now: () => T0 });

    await expect(policy.serialised("a", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(policy.serialised("a", async () => "next")).resolves.toBe("next");
    await expect(policy.serialised("b", async () => "other")).resolves.toBe("other");
  });
});

describe("daily transfer cap by trust tier", () => {
  it("lets a tier-1 account send up to 500 coins a day, and no more", async () => {
    expect((await policyFor([sent(400)]).policy.check("p", 100)).ok).toBe(true);
    const over = await policyFor([sent(450)]).policy.check("p", 100);

    expect(over).toMatchObject({ ok: false, code: REASON.TRANSFER_TIER_CAP });
    if (!over.ok) expect(over.message).toContain("500");
  });

  it.each([
    [1, 500],
    [2, 1_000],
    [3, 2_500],
    [4, 5_000],
  ] as const)("gives tier %i a cap of %i coins", async (tier, cap) => {
    expect((await policyFor([sent(cap - 100)], tier).policy.check("p", 100)).ok).toBe(true);
    expect((await policyFor([sent(cap - 99)], tier).policy.check("p", 100)).ok).toBe(false);
  });

  it("counts only coins SENT today: not receipts, not other entry types, not yesterday", async () => {
    const entries: LedgerEntry[] = [
      sent(300),
      { entryType: "P2P_TRANSFER_RECEIVE", amount: "900", createdAt: T0 - 500 },
      { entryType: "MATCH_PRIZE_CREDIT", amount: "5000", createdAt: T0 - 600 },
      { entryType: "ROOM_ENTRY_DEBIT", amount: "-200", createdAt: T0 - 700 },
      sent(400, DAY_START - 1),
    ];

    const { policy } = policyFor(entries);

    expect(await policy.sentToday("p")).toBe(300);
    expect((await policy.check("p", 200)).ok).toBe(true);
    expect((await policy.check("p", 201)).ok).toBe(false);
  });

  it("starts a fresh day at midnight UTC", async () => {
    const entries = [sent(500)];

    expect((await policyFor(entries, 1, new RiskService(), T0).policy.check("p", 100)).ok).toBe(false);
    expect((await policyFor(entries, 1, new RiskService(), DAY_START + DAY).policy.check("p", 100)).ok).toBe(true);
  });

  it("totals across ledger pages, not just the newest hundred entries", async () => {
    const filler = Array.from({ length: 150 }, (): LedgerEntry => ({ entryType: "ROOM_ENTRY_DEBIT", amount: "-10", createdAt: T0 - 10 }));
    const entries = [...filler, sent(500, T0 - 20)];

    expect((await policyFor(entries).policy.sentToday("p"))).toBe(500);
  });
});

describe("risk states and transfers", () => {
  it.each(["RESTRICTED", "UNDER_REVIEW"] as const)("blocks an account that is %s from sending", async (state) => {
    const risk = new RiskService();
    await risk.setState("p", state, { reasonCodes: ["x"], actor: "op" });

    const result = await policyFor([], 4, risk).policy.check("p", 100);

    expect(result).toMatchObject({ ok: false, code: REASON.TRANSFER_RISK_BLOCK });
  });

  it("does not block a WATCHLIST account, which is only paid less for its matches", async () => {
    const risk = new RiskService();
    await risk.setState("p", "WATCHLIST", { reasonCodes: ["x"], actor: "op" });

    expect((await policyFor([], 1, risk).policy.check("p", 100)).ok).toBe(true);
  });
});

describe("failing closed", () => {
  it("says transfers are unavailable when the wallet ledger cannot be read", async () => {
    const trust = new TrustService();
    const policy = new TransferPolicy({
      ledger: { getLedger: async () => { throw new Error("db down"); } },
      risk: new RiskService(),
      trust,
      now: () => T0,
    });

    expect(await policy.check("p", 100)).toMatchObject({ ok: false, code: REASON.TRANSFER_UNAVAILABLE });
  });

  it("does not wave a transfer through when today's ledger is too long to total", async () => {
    const endless = Array.from({ length: 1_100 }, (): LedgerEntry => ({ entryType: "ROOM_ENTRY_DEBIT", amount: "-1", createdAt: T0 - 5 }));

    expect(await policyFor(endless).policy.check("p", 100)).toMatchObject({ ok: false, code: REASON.TRANSFER_UNAVAILABLE });
  });
});

describe("Mandali sending, end to end", () => {
  const SENDER = "p_rajesh_ludo";
  const RECIPIENT = "p_sai_kittu";
  let economyRepo: InMemoryEconomyRepository;
  let economy: EconomyService;
  let repository: MandaliRepository;
  let service: MandaliService;
  let risk: RiskService;
  let trust: TrustService;

  it("holds the cap inside the transfer itself, so racing callers that skip the queue still cannot exceed it", async () => {
    await economy.adminAdjustWallet({ identityId: SENDER, amountCoins: "5000", reason: "test funds", idempotencyKey: "fund", adminPrincipalId: "ops" } as never);
    const cap = { maxCoins: "500", dayStartMs: Math.floor(Date.now() / DAY) * DAY };
    const attempt = (n: number) =>
      economy
        .transferWalletCoins({ fromIdentityId: SENDER, toIdentityId: RECIPIENT, amountCoins: "100", reason: "race", idempotencyKey: `race:${n}`, dailyCap: cap })
        .then(() => true, () => false);

    const results = await Promise.all(Array.from({ length: 30 }, (_, n) => attempt(n)));

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await balance(RECIPIENT)).toBeGreaterThanOrEqual(500n);
  });

  it("does not count a replay of a send that already landed as a new send", async () => {
    await economy.adminAdjustWallet({ identityId: SENDER, amountCoins: "5000", reason: "test funds", idempotencyKey: "fund", adminPrincipalId: "ops" } as never);
    const cap = { maxCoins: "100", dayStartMs: Math.floor(Date.now() / DAY) * DAY };
    const input = { fromIdentityId: SENDER, toIdentityId: RECIPIENT, amountCoins: "100", reason: "once", idempotencyKey: "same", dailyCap: cap };

    await economy.transferWalletCoins(input);

    await expect(economy.transferWalletCoins(input)).resolves.toMatchObject({ applied: false });
  });

  const balance = async (id: string) => BigInt((await economy.getWallet(id)).balance);
  const send = () =>
    service.transferCoins("mandali_ludo_kings", SENDER, { toPlayerId: RECIPIENT, amount: 100, type: "SEND" });
  const policyAt = (now: number) =>
    new TransferPolicy({ ledger: economy, risk, trust, now: () => now });

  beforeEach(async () => {
    repository = new MandaliRepository();
    economyRepo = new InMemoryEconomyRepository();
    economy = new EconomyService(economyRepo);
    economyRepo.testFixture.seedIdentity(SENDER, "member");
    economyRepo.testFixture.seedIdentity(RECIPIENT, "member");
    await economyRepo.ensureWallet(SENDER);
    await economyRepo.ensureWallet(RECIPIENT);
    risk = new RiskService();
    trust = new TrustService();
    trust.setProviders(providersForTier(1));
    service = new MandaliService(repository, undefined, undefined, economy);
    service.setTransferPolicy(policyAt(Date.now()));
  });

  it("lets five 100-coin sends through and refuses the sixth, moving exactly 500", async () => {
    const before = await balance(SENDER);

    const results = [];
    for (let i = 0; i < 6; i++) results.push(await send());

    expect(results.slice(0, 5).every((r) => r.success)).toBe(true);
    expect(results[5]).toMatchObject({ success: false, error: expect.stringContaining("500 coins a day") });
    expect(await balance(SENDER)).toBe(before - 500n);
  });

  it("holds the cap across a restart, because it is read from the wallet ledger", async () => {
    for (let i = 0; i < 5; i++) await send();

    // A new process: a brand-new policy with no memory of the earlier sends.
    service.setTransferPolicy(policyAt(Date.now()));

    expect(await send()).toMatchObject({ success: false });
  });

  it("raises the cap with trust: a tier-2 member can send ten", async () => {
    trust.setProviders(providersForTier(2));
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await send());

    expect(results.slice(0, 10).every((r) => r.success)).toBe(true);
    expect(results[10]!.success).toBe(false);
  });

  it("starts a new allowance at midnight UTC", async () => {
    for (let i = 0; i < 5; i++) await send();
    expect((await send()).success).toBe(false);

    service.setTransferPolicy(policyAt(Date.now() + 2 * DAY));

    expect((await send()).success).toBe(true);
  });

  it("refuses a restricted sender without moving any coins, but lets them be paid", async () => {
    await risk.setState(SENDER, "RESTRICTED", { reasonCodes: ["x"], actor: "op" });
    const senderBefore = await balance(SENDER);

    const blocked = await send();
    expect(blocked).toMatchObject({ success: false, error: expect.stringContaining("paused") });
    expect(await balance(SENDER)).toBe(senderBefore);

    // Receiving is never limited: the other member can still pay them.
    const paid = await service.transferCoins("mandali_ludo_kings", RECIPIENT, { toPlayerId: SENDER, amount: 100, type: "SEND" });
    expect(paid.success).toBe(true);
    expect(await balance(SENDER)).toBe(senderBefore + 100n);
  });
});

describe("Mandali paying a coin request goes through the same policy", () => {
  function durableService(policy: TransferPolicy | null) {
    const repository = new MandaliRepository();
    vi.spyOn(repository, "isDurable").mockReturnValue(true);
    const fund = vi.spyOn(repository, "fundCoinRequestDurable").mockResolvedValue({
      alreadyFunded: false,
      request: { id: "req_1", mandaliId: "m1" },
    } as never);
    const service = new MandaliService(repository);
    service.setTransferPolicy(policy);
    return { service, fund };
  }

  it("hands the database the payer's cap, so it is enforced under the wallet lock", async () => {
    const { policy } = policyFor([], 2);
    const { service, fund } = durableService(policy);

    await service.fundCoinRequest("req_1", "payer");

    expect(fund).toHaveBeenCalledWith("req_1", "payer", "mnd_coin_req:req_1", { maxCoins: "1000", dayStartMs: DAY_START });
  });

  it("tells the payer plainly when the database refuses for the day's limit", async () => {
    const { service, fund } = durableService(policyFor([]).policy);
    fund.mockRejectedValueOnce(new TransferCapExceededError("500 sent today, 100 requested, cap 500"));

    const result = await service.fundCoinRequest("req_1", "payer");

    expect(result).toMatchObject({ success: false, error: expect.stringContaining("today's limit") });
  });

  it("reports a request that already landed as paid, even when the payer is at their cap", async () => {
    // The database only checks an OPEN request, so a replay comes back alreadyFunded.
    const { service, fund } = durableService(policyFor([sent(500)]).policy);
    fund.mockResolvedValueOnce({ alreadyFunded: true, request: { id: "req_1", mandaliId: "m1", fundedByIdentityId: "payer" } } as never);

    const result = await service.fundCoinRequest("req_1", "payer");

    expect(result.success).toBe(true);
  });

  it("does not call the database function when the payer is restricted", async () => {
    const risk = new RiskService();
    await risk.setState("payer", "RESTRICTED", { reasonCodes: ["x"], actor: "op" });
    const { service, fund } = durableService(policyFor([], 1, risk).policy);

    expect((await service.fundCoinRequest("req_1", "payer")).success).toBe(false);
    expect(fund).not.toHaveBeenCalled();
  });

  it("pays the request when the payer is within their allowance", async () => {
    const { service, fund } = durableService(policyFor([sent(100)]).policy);

    const result = await service.fundCoinRequest("req_1", "payer");

    expect(result.success).toBe(true);
    expect(fund).toHaveBeenCalledTimes(1);
  });
});
