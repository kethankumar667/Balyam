import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import {
  NotAGuestError,
  WalletNotFoundError,
  WelcomeNeedsGameError,
  type EconomyConfigurationRecord,
} from "../../persistence/EconomyRepository.js";
import { EconomyService } from "../EconomyService.js";

/**
 * The guest "first game on us" rule at the service level: a new guest wallet holds only the first-game
 * amount, and the real welcome is added once, after a match has actually been paid for. The SQL that
 * does the same in production is proven on a real PostgreSQL by `npm run verify:guestfirstgame`.
 */
const FIRST_GAME_CONFIG: EconomyConfigurationRecord = {
  id: "active",
  version: 1,
  guestStarterCoins: "2000",
  guestFirstGameCoins: "100",
  memberStarterCoins: "5000",
  seatCostCoins: "100",
  isActive: true,
};

describe("guest first game and welcome", () => {
  let repo: InMemoryEconomyRepository;
  let service: EconomyService;

  const firstGameGuest = async (id: string) => {
    repo.testFixture.seedIdentity(id, "guest");
    return service.getWallet(id);
  };

  const playAMatch = (id: string) =>
    repo.commitMatchEntry({
      matchId: `match-${id}`,
      roomCode: "ROOM01",
      hostIdentityId: id,
      seatCount: 1,
      humanSeatCount: 1,
      botSeatCount: 0,
      isSolo: true,
    });

  beforeEach(() => {
    repo = new InMemoryEconomyRepository();
    service = new EconomyService(repo, { delay: async () => undefined });
    const schedules = repo.testFixture.snapshot().prizeSchedules;
    repo.testFixture.seedConfiguration(FIRST_GAME_CONFIG, schedules);
  });

  it("makes a new guest wallet with only the first-game amount", async () => {
    const wallet = await firstGameGuest("guest_new");
    expect(wallet.balance).toBe("100");
    expect(wallet.lifetimeGranted).toBe("100");
  });

  it("still gives a member the full member grant", async () => {
    repo.testFixture.seedIdentity("member_new", "member");
    const wallet = await service.getWallet("member_new");
    expect(wallet.balance).toBe("5000");
  });

  it("leaves a guest on the old full grant when the rule is switched off", async () => {
    repo.testFixture.seedConfiguration(
      { ...FIRST_GAME_CONFIG, guestFirstGameCoins: null },
      repo.testFixture.snapshot().prizeSchedules,
    );
    const wallet = await firstGameGuest("guest_legacy");
    expect(wallet.balance).toBe("2000");
    await playAMatch("guest_legacy");
    expect((await service.claimGuestWelcome("guest_legacy")).applied).toBe(false);
  });

  it("refuses the welcome before any coin has been spent", async () => {
    await firstGameGuest("guest_idle");
    await expect(service.claimGuestWelcome("guest_idle")).rejects.toBeInstanceOf(WelcomeNeedsGameError);
    expect((await service.getGuestWelcomeStatus("guest_idle")).pending).toBe(false);
  });

  it("offers the welcome after the first game and adds it exactly once", async () => {
    await firstGameGuest("guest_played");
    await playAMatch("guest_played");

    expect(await service.getGuestWelcomeStatus("guest_played")).toEqual({ pending: true, amount: "2000" });

    const first = await service.claimGuestWelcome("guest_played");
    expect(first.applied).toBe(true);
    expect(first.wallet.balance).toBe("2000");

    const again = await service.claimGuestWelcome("guest_played");
    expect(again.applied).toBe(false);
    expect(again.wallet.balance).toBe("2000");
    expect((await service.getGuestWelcomeStatus("guest_played")).pending).toBe(false);
  });

  it("pays the welcome once when asked eight times at the same moment", async () => {
    await firstGameGuest("guest_race");
    await playAMatch("guest_race");

    const results = await Promise.all(Array.from({ length: 8 }, () => service.claimGuestWelcome("guest_race")));
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect((await service.getWallet("guest_race")).balance).toBe("2000");
  });

  it("is only for guests and only for a wallet that exists", async () => {
    repo.testFixture.seedIdentity("member_x", "member");
    await service.getWallet("member_x");
    await expect(service.claimGuestWelcome("member_x")).rejects.toBeInstanceOf(NotAGuestError);
    await expect(service.claimGuestWelcome("nobody")).rejects.toBeInstanceOf(WalletNotFoundError);
  });

  it("reports nothing pending for someone with no wallet, without creating one", async () => {
    expect(await service.getGuestWelcomeStatus("never_seen")).toEqual({ pending: false, amount: "2000" });
    expect(await repo.getWallet("never_seen")).toBeNull();
  });
});
