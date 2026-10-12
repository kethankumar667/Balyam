import { beforeEach, describe, expect, it } from "vitest";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS } from "@shared/faucet.js";
import { NEW_MEMBER_FAUCET_WAIT_MS } from "@shared/newMember.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { HourlyFaucetService } from "../HourlyFaucetService.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway } from "../RewardGateway.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

const ME = "player_new_member";
const NOW = 1_800_000_000_000;

/** A new member waits an hour after registering for their first free coins; after that the usual wait applies. */
describe("free coins for a new member", () => {
  const clock = { now: NOW };
  let registeredAt: number | null;
  let faucet: HourlyFaucetService;

  beforeEach(() => {
    clock.now = NOW;
    registeredAt = NOW;
    const economy = new EconomyService(new InMemoryEconomyRepository());
    const gateway = new RewardGateway({
      economy,
      repository: new InMemoryRewardRepository(),
      risk: new RiskService(),
      trust: new TrustService(),
      now: () => clock.now,
    });
    faucet = new HourlyFaucetService({ gateway, now: () => clock.now, registeredAt: async () => registeredAt });
  });

  it("is not claimable in the first hour, and says when it opens", async () => {
    clock.now = NOW + 10 * 60 * 1000;

    const status = await faucet.status(ME, "member");

    expect(status).toMatchObject({ eligible: true, canClaim: false, nextClaimAt: NOW + NEW_MEMBER_FAUCET_WAIT_MS });
  });

  it("refuses a claim in the first hour with the same time, and pays nothing", async () => {
    clock.now = NOW + NEW_MEMBER_FAUCET_WAIT_MS - 1;

    const result = await faucet.claim(ME, "member");

    expect(result).toMatchObject({ ok: false, code: "COOLDOWN", nextClaimAt: NOW + NEW_MEMBER_FAUCET_WAIT_MS });
  });

  it("opens exactly an hour after registration", async () => {
    clock.now = NOW + NEW_MEMBER_FAUCET_WAIT_MS;

    expect(await faucet.status(ME, "member")).toMatchObject({ canClaim: true, nextClaimAt: null });
    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: true, amount: FAUCET_AMOUNT_COINS });
  });

  it("applies the ordinary wait after that first claim", async () => {
    clock.now = NOW + NEW_MEMBER_FAUCET_WAIT_MS;
    await faucet.claim(ME, "member");

    const status = await faucet.status(ME, "member");

    expect(status.nextClaimAt).toBe(clock.now + FAUCET_COOLDOWN_MS);
  });

  it("never holds back a member who registered long ago", async () => {
    registeredAt = NOW - 30 * 24 * 60 * 60 * 1000;

    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: true });
  });

  it("does not hold a member back when the registration time is unknown", async () => {
    registeredAt = null;

    expect(await faucet.claim(ME, "member")).toMatchObject({ ok: true });
  });
});
