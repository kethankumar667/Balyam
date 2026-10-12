import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import {
  NotAMemberError,
  WalletFrozenError,
  WalletNotFoundError,
  type EconomyConfigurationRecord,
} from "../../persistence/EconomyRepository.js";
import { EconomyService } from "../EconomyService.js";

/**
 * A new member's welcome is held until they accept the welcome popup, and paid exactly once when they
 * do. The SQL that does the same in production is `20261030000000_member_welcome_on_claim.sql`.
 */
const DEFERRED_CONFIG: EconomyConfigurationRecord = {
  id: "active",
  version: 1,
  guestStarterCoins: "2000",
  memberStarterCoins: "5000",
  memberWelcomeOnClaim: true,
  seatCostCoins: "100",
  isActive: true,
};

describe("member welcome on claim", () => {
  let repo: InMemoryEconomyRepository;
  let service: EconomyService;

  const newMember = async (id: string) => {
    repo.testFixture.seedIdentity(id, "member");
    return service.getWallet(id);
  };

  beforeEach(() => {
    repo = new InMemoryEconomyRepository();
    service = new EconomyService(repo, { delay: async () => undefined });
    repo.testFixture.seedConfiguration(DEFERRED_CONFIG, repo.testFixture.snapshot().prizeSchedules);
  });

  it("makes a new member's wallet empty instead of paying the welcome blindly", async () => {
    const wallet = await newMember("member_new");

    expect(wallet.balance).toBe("0");
    expect(wallet.lifetimeGranted).toBe("0");
    expect(repo.testFixture.snapshot().walletLedger).toHaveLength(0);
  });

  it("reports the welcome as owed, with its amount", async () => {
    await newMember("member_owed");

    expect(await service.getMemberWelcomeStatus("member_owed")).toEqual({ pending: true, amount: "5000" });
  });

  it("makes the wallet itself when the popup asks before the header did", async () => {
    repo.testFixture.seedIdentity("member_early", "member");

    expect((await service.getMemberWelcomeStatus("member_early")).pending).toBe(true);
  });

  it("pays the welcome once, when it is claimed", async () => {
    await newMember("member_claims");

    const first = await service.claimMemberWelcome("member_claims");
    expect(first.applied).toBe(true);
    expect(first.wallet.balance).toBe("5000");
    expect(first.wallet.lifetimeGranted).toBe("5000");

    const ledger = repo.testFixture.snapshot().walletLedger;
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ entryType: "STARTER_GRANT", amount: "5000" });
  });

  it("never pays a second time, however often it is asked", async () => {
    await newMember("member_twice");
    await service.claimMemberWelcome("member_twice");

    const repeat = await service.claimMemberWelcome("member_twice");

    expect(repeat.applied).toBe(false);
    expect(repeat.wallet.balance).toBe("5000");
    expect(repo.testFixture.snapshot().walletLedger).toHaveLength(1);
  });

  it("stops reporting the welcome as owed once it is paid", async () => {
    await newMember("member_done");
    await service.claimMemberWelcome("member_done");

    expect((await service.getMemberWelcomeStatus("member_done")).pending).toBe(false);
  });

  it("pays a concurrent burst of claims once", async () => {
    await newMember("member_race");

    const results = await Promise.all(Array.from({ length: 6 }, () => service.claimMemberWelcome("member_race")));

    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect((await service.getWallet("member_race")).balance).toBe("5000");
  });

  it("refuses to pay a frozen wallet", async () => {
    await newMember("member_frozen");
    repo.testFixture.setFrozen("member_frozen", true);

    await expect(service.claimMemberWelcome("member_frozen")).rejects.toBeInstanceOf(WalletFrozenError);
    expect((await service.getWallet("member_frozen")).balance).toBe("0");
  });

  it("refuses a guest", async () => {
    repo.testFixture.seedIdentity("guest_one", "guest");
    await service.getWallet("guest_one");

    await expect(repo.grantMemberWelcome("guest_one")).rejects.toBeInstanceOf(NotAMemberError);
    expect((await service.getMemberWelcomeStatus("guest_one")).pending).toBe(false);
  });

  it("refuses a claim for a wallet that does not exist", async () => {
    await expect(repo.grantMemberWelcome("member_missing")).rejects.toBeInstanceOf(WalletNotFoundError);
  });

  it("leaves a member who was already paid alone, and never offers them the popup", async () => {
    repo.testFixture.seedWallet({
      identityId: "member_old",
      identityKind: "member",
      balance: "5000",
      lifetimeGranted: "5000",
      starterGranted: true,
    });

    expect((await service.getMemberWelcomeStatus("member_old")).pending).toBe(false);
    const claim = await service.claimMemberWelcome("member_old");
    expect(claim.applied).toBe(false);
    expect(claim.wallet.balance).toBe("5000");
  });

  it("pays the welcome at once when the rule is switched off", async () => {
    repo.testFixture.seedConfiguration(
      { ...DEFERRED_CONFIG, memberWelcomeOnClaim: false },
      repo.testFixture.snapshot().prizeSchedules,
    );

    const wallet = await newMember("member_legacy");

    expect(wallet.balance).toBe("5000");
    expect((await service.getMemberWelcomeStatus("member_legacy")).pending).toBe(false);
  });

  it("does not touch a guest's wallet creation", async () => {
    repo.testFixture.seedIdentity("guest_plain", "guest");

    expect((await service.getWallet("guest_plain")).balance).toBe("2000");
  });
});
