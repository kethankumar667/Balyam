import { describe, it, expect, beforeEach } from "vitest";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";

const SENDER = "p_rajesh_ludo";
const RECIPIENT = "p_sai_kittu";

describe("Mandali Coin Transfers & Clan Economy", () => {
  let repository: MandaliRepository;
  let economyRepo: InMemoryEconomyRepository;
  let economyService: EconomyService;
  let service: MandaliService;

  beforeEach(async () => {
    repository = new MandaliRepository();
    economyRepo = new InMemoryEconomyRepository();
    economyService = new EconomyService(economyRepo);
    // Both members exist in default seed mandali_ludo_kings (ownerId: p_rajesh_ludo, member: p_sai_kittu)
    economyRepo.testFixture.seedIdentity(SENDER, "member");
    economyRepo.testFixture.seedIdentity(RECIPIENT, "member");
    await economyRepo.ensureWallet(SENDER); // starter grant: 5000 coins
    await economyRepo.ensureWallet(RECIPIENT); // starter grant: 5000 coins
    service = new MandaliService(repository, undefined, undefined, economyService);
  });

  it("moves coins from sender to recipient — debits one wallet, credits the other, conserves total supply", async () => {
    const before = {
      sender: BigInt((await economyService.getWallet(SENDER)).balance),
      recipient: BigInt((await economyService.getWallet(RECIPIENT)).balance),
    };
    const totalBefore = before.sender + before.recipient;

    const result = await service.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: RECIPIENT,
      amount: 100,
      type: "SEND",
      note: "Prize for Ludo victory!",
    });

    expect(result.success).toBe(true);
    expect(result.transfer).toBeDefined();
    expect(result.transfer?.amount).toBe(100);
    expect(result.transfer?.type).toBe("SEND");
    expect(result.transfer?.status).toBe("COMPLETED");
    expect(result.transfer?.fromPlayerName).toBe("Rajesh Maharajah");

    const after = {
      sender: BigInt((await economyService.getWallet(SENDER)).balance),
      recipient: BigInt((await economyService.getWallet(RECIPIENT)).balance),
    };

    // The bug this regression-tests: a naive fix that calls a credit-only
    // primitive on both "sides" leaves the sender's balance UNCHANGED (or
    // increased) instead of decreased. Assert the actual debit happened.
    expect(after.sender).toBe(before.sender - 100n);
    expect(after.recipient).toBe(before.recipient + 100n);
    expect(after.sender + after.recipient).toBe(totalBefore); // no coins minted or destroyed

    // History check
    const transfers = service.getCoinTransfers("mandali_ludo_kings");
    expect(transfers.length).toBeGreaterThanOrEqual(1);
    expect(transfers[0].amount).toBe(100);
  });

  it("rejects a send that exceeds the sender's real wallet balance, without moving any coins", async () => {
    // Fixed 100-coin sends can no longer overspend by asking for a huge
    // number, so drain the sender down to 50 and try to send 100.
    const drained = BigInt((await economyService.getWallet(SENDER)).balance) - 50n;
    await economyService.transferWalletCoins({
      fromIdentityId: SENDER,
      toIdentityId: RECIPIENT,
      amountCoins: String(drained),
      reason: "test: drain sender",
      idempotencyKey: "test-drain-sender",
    });

    const before = {
      sender: BigInt((await economyService.getWallet(SENDER)).balance),
      recipient: BigInt((await economyService.getWallet(RECIPIENT)).balance),
    };

    const result = await service.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: RECIPIENT,
      amount: 100,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/insufficient/i);

    const after = {
      sender: BigInt((await economyService.getWallet(SENDER)).balance),
      recipient: BigInt((await economyService.getWallet(RECIPIENT)).balance),
    };
    expect(after.sender).toBe(before.sender);
    expect(after.recipient).toBe(before.recipient);
  });

  it("fails honestly (no fake success, no transfer recorded) when no economy layer is wired in", async () => {
    const noEconomyService = new MandaliService(repository); // economyService omitted, as production could in principle do

    const result = await noEconomyService.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: RECIPIENT,
      amount: 100,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.transfer).toBeUndefined();
  });

  it("refuses the legacy REQUEST type — asking for coins goes through the rate-limited request flow", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", RECIPIENT, {
      toPlayerId: SENDER,
      amount: 100,
      type: "REQUEST",
      note: "Need entry fee for squad match",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/request coins/i);
    expect(service.getCoinTransfers("mandali_ludo_kings")).toHaveLength(0);
  });

  it.each([1, 50, 99, 101, 150, 5000])("refuses a send of %i coins — the amount is always 100", async (amount) => {
    const before = BigInt((await economyService.getWallet(SENDER)).balance);

    const result = await service.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: RECIPIENT,
      amount,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("100-coin");
    expect(BigInt((await economyService.getWallet(SENDER)).balance)).toBe(before);
  });

  it("refuses coin transfers to oneself", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: SENDER,
      amount: 100,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transfer coins to yourself");
  });

  it("refuses transfers from non-members or non-active members", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", "stranger_1", {
      toPlayerId: SENDER,
      amount: 50,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be an active member");
  });

  it("refuses invalid transfer amounts", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", SENDER, {
      toPlayerId: RECIPIENT,
      amount: -25,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("100-coin");
  });
});
