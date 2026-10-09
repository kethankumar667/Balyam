import { describe, it, expect, beforeEach } from "vitest";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS } from "@shared/faucet.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { HourlyFaucetService } from "../HourlyFaucetService.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway } from "../RewardGateway.js";
import { REASON } from "../types.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

const ME = "player_faucet_me";
const START = 1_800_000_000_000;

describe("hourly coin faucet", () => {
  let economy: EconomyService;
  let risk: RiskService;
  let faucet: HourlyFaucetService;
  let gateway: RewardGateway;
  const clock = { now: START };

  const balanceOf = async (id: string): Promise<bigint> => BigInt((await economy.getWallet(id)).balance);

  /** A member's wallet is provisioned (with its starter grant) on first sight, so measure from after that. */
  const balanceBeforeClaim = async (id: string): Promise<bigint> => {
    await economy.ensureIdentityRegistered(id, "member");
    return balanceOf(id);
  };

  beforeEach(() => {
    clock.now = START;
    economy = new EconomyService(new InMemoryEconomyRepository());
    risk = new RiskService();
    gateway = new RewardGateway({
      economy,
      repository: new InMemoryRewardRepository(),
      risk,
      trust: new TrustService(),
      now: () => clock.now,
    });
    faucet = new HourlyFaucetService({ gateway, now: () => clock.now });
  });

  it("refuses a guest and pays nothing", async () => {
    const result = await faucet.claim("guest_one", "guest");

    expect(result).toMatchObject({ ok: false, code: "NOT_MEMBER" });
  });

  it("reports a guest as not eligible", async () => {
    const status = await faucet.status("guest_one", "guest");

    expect(status).toMatchObject({ eligible: false, canClaim: false, amount: FAUCET_AMOUNT_COINS });
  });

  it("pays a signed-in player at once on the first claim", async () => {
    const before = await balanceBeforeClaim(ME);

    const result = await faucet.claim(ME, "member");

    expect(result).toMatchObject({ ok: true, amount: FAUCET_AMOUNT_COINS, paidNow: true });
    expect((await balanceOf(ME)) - before).toBe(BigInt(FAUCET_AMOUNT_COINS));
  });

  it("starts the wait at the claim and says when the next claim opens", async () => {
    const result = await faucet.claim(ME, "member");

    expect(result.ok && result.nextClaimAt).toBe(START + FAUCET_COOLDOWN_MS);
  });

  it("refuses a second claim inside the wait, with the time it opens", async () => {
    await faucet.claim(ME, "member");
    const afterFirst = await balanceOf(ME);
    clock.now += FAUCET_COOLDOWN_MS - 1;

    const result = await faucet.claim(ME, "member");

    expect(result).toMatchObject({ ok: false, code: "COOLDOWN", nextClaimAt: START + FAUCET_COOLDOWN_MS });
    expect(await balanceOf(ME)).toBe(afterFirst);
  });

  it("allows the next claim exactly when the wait ends and restarts the wait from it", async () => {
    await faucet.claim(ME, "member");
    clock.now += FAUCET_COOLDOWN_MS;

    const second = await faucet.claim(ME, "member");

    expect(second).toMatchObject({ ok: true, nextClaimAt: clock.now + FAUCET_COOLDOWN_MS });
    clock.now += FAUCET_COOLDOWN_MS - 1;
    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: false, code: "COOLDOWN" });
  });

  it("pays only once when two claims arrive at the same moment", async () => {
    const before = await balanceBeforeClaim(ME);

    const results = await Promise.all([faucet.claim(ME, "member"), faucet.claim(ME, "member")]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await balanceOf(ME)) - before).toBe(BigInt(FAUCET_AMOUNT_COINS));
  });

  it("counts a claim from a different player separately", async () => {
    await faucet.claim(ME, "member");

    expect(await faucet.claim("player_faucet_other", "member")).toMatchObject({ ok: true });
  });

  it("shows a claim available, then a countdown after claiming", async () => {
    expect(await faucet.status(ME, "member")).toMatchObject({ eligible: true, canClaim: true, nextClaimAt: null });

    await faucet.claim(ME, "member");
    clock.now += 60_000;

    expect(await faucet.status(ME, "member")).toMatchObject({
      eligible: true,
      canClaim: false,
      nextClaimAt: START + FAUCET_COOLDOWN_MS,
      serverNow: clock.now,
    });
  });

  it("refuses while the account is under review", async () => {
    await risk.setState(ME, "UNDER_REVIEW", { reasonCodes: ["TEST"], actor: "test", note: "test" });

    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: false, code: "UNDER_REVIEW" });
  });

  it("holds a watched account's coins for a day but still starts the wait", async () => {
    await risk.setState(ME, "WATCHLIST", { reasonCodes: ["TEST"], actor: "test", note: "test" });
    const before = await balanceBeforeClaim(ME);

    const result = await faucet.claim(ME, "member");

    expect(result).toMatchObject({ ok: true, paidNow: false });
    expect(result.ok && result.vestingUntil).toBeGreaterThan(clock.now);
    expect(await balanceOf(ME)).toBe(before);
    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: false, code: "COOLDOWN" });
  });

  describe("when a lot of other rewards pile up", () => {
    const pileUp = async (count: number): Promise<void> => {
      for (let i = 0; i < count; i++) {
        clock.now += 1_000;
        await gateway.grantCoins({
          playerId: ME,
          identityKind: "member",
          rewardType: "LEVEL_MILESTONE",
          reasonCode: REASON.MILESTONE_LEVEL,
          amount: 10,
          sourceId: `level:${i}`,
          description: "filler",
        });
      }
    };

    it("still remembers the last claim after more than 20 newer rewards of other kinds", async () => {
      await faucet.claim(ME, "member");
      await pileUp(25);

      expect(await faucet.claim(ME, "member")).toMatchObject({ ok: false, code: "COOLDOWN", nextClaimAt: START + FAUCET_COOLDOWN_MS });
      expect(await faucet.status(ME, "member")).toMatchObject({ canClaim: false, nextClaimAt: START + FAUCET_COOLDOWN_MS });
    });

    it("lets the player claim again once the wait is over, however many rewards came between", async () => {
      await faucet.claim(ME, "member");
      await pileUp(25);
      clock.now = START + FAUCET_COOLDOWN_MS;

      expect(await faucet.claim(ME, "member")).toMatchObject({ ok: true, paidNow: true });
    });
  });
});
