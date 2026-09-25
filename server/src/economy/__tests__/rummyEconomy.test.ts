import { describe, it, expect } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService, computePrizePool } from "../EconomyService.js";
import { computePrizePoolFor } from "@shared/economy-prizes.js";
import {
  RUMMY_DEFAULT_STAKE_COINS,
  RUMMY_STAKE_TIERS,
  defaultEntryStakeFor,
  guestHostStakeFor,
  isValidEntryStakeFor,
  isValidRummyStakeCoins,
  rummyRateForStakeCoins,
  rummyStakeCoinsForRate,
} from "@shared/rummy-economy.js";

/**
 * Rummy is priced by point rate (1 point = 1/2/4/8/16 coins → 80…1280 per seat) and the pot is
 * winner-takes-all with NO platform cut, in single, pool 101 and pool 201 alike. Points decide
 * who wins; they never move coins on their own.
 */
describe("Rummy stake tiers", () => {
  it("are 80 × the point rate: 80, 160, 320, 640, 1280", () => {
    expect([...RUMMY_STAKE_TIERS]).toEqual([80, 160, 320, 640, 1280]);
    expect(rummyStakeCoinsForRate(1)).toBe(80);
    expect(rummyStakeCoinsForRate(16)).toBe(1280);
  });

  it("map back to their point rate, and only they do", () => {
    expect(rummyRateForStakeCoins(320)).toBe(4);
    expect(rummyRateForStakeCoins(100)).toBeNull();
    expect(isValidRummyStakeCoins(640)).toBe(true);
    expect(isValidRummyStakeCoins(100)).toBe(false);
    expect(isValidRummyStakeCoins(0)).toBe(false);
  });

  it("are the only legal stakes for Rummy, and the platform range stays legal for every other game", () => {
    expect(isValidEntryStakeFor("rummy", 160)).toBe(true);
    expect(isValidEntryStakeFor("rummy", 100)).toBe(false);
    expect(isValidEntryStakeFor("ludo", 100)).toBe(true);
    expect(isValidEntryStakeFor("ludo", 80)).toBe(false);
  });

  it("default and guest tables are the 1-point table for Rummy, the 100-coin table elsewhere", () => {
    expect(RUMMY_DEFAULT_STAKE_COINS).toBe(80);
    expect(defaultEntryStakeFor("rummy")).toBe(80);
    expect(guestHostStakeFor("rummy")).toBe(80);
    expect(defaultEntryStakeFor("ludo")).toBe(100);
    expect(guestHostStakeFor("ludo")).toBe(100);
  });
});

describe("computePrizePoolFor", () => {
  it("Rummy: the whole pot to first place and nothing to the platform", () => {
    expect(computePrizePoolFor("rummy", 480n, 6)).toEqual({ worldBankCut: 0n, winnerPrizes: [480n] });
    expect(computePrizePoolFor("rummy", 160n, 2)).toEqual({ worldBankCut: 0n, winnerPrizes: [160n] });
  });

  it("Rummy has no rounding at any tier or seat count — the pot is paid exactly", () => {
    for (const stake of RUMMY_STAKE_TIERS) {
      for (let seats = 2; seats <= 6; seats++) {
        const total = BigInt(stake) * BigInt(seats);
        const { worldBankCut, winnerPrizes } = computePrizePoolFor("rummy", total, seats);
        expect(worldBankCut + winnerPrizes.reduce((a, b) => a + b, 0n)).toBe(total);
      }
    }
  });

  it("a one-seat Rummy table is still entirely the platform's, like every other solo pool", () => {
    expect(computePrizePoolFor("rummy", 80n, 1)).toEqual({ worldBankCut: 80n, winnerPrizes: [] });
  });

  it("every other game — and an unknown or missing game — keeps the 20% cut", () => {
    for (const game of ["ludo", "handcricket", "uno", undefined, null]) {
      expect(computePrizePoolFor(game, 400n, 2)).toEqual(computePrizePool(400n, 2));
    }
    expect(computePrizePoolFor("ludo", 400n, 2).worldBankCut).toBe(80n);
  });

  it("the EconomyService wrapper keeps its own conservation check for Rummy", () => {
    expect(computePrizePool(480n, 6, "rummy")).toEqual({ worldBankCut: 0n, winnerPrizes: [480n] });
  });
});

/* ═══════════ the real path: commit debits → settle → wallets ═══════════ */

async function playTable(opts: {
  seats: number;
  stakePerSeat: string;
  gameKind: string;
  winnerIndex: number;
  /** Simulates a database without the game-kind migration: the settlement row never learns its game. */
  rowKnowsGame?: boolean;
}) {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  const ids = Array.from({ length: opts.seats }, (_, i) => `member_${i}`);
  for (const identityId of ids) {
    repo.testFixture.seedWallet({ identityId, identityKind: "member", balance: "1000", lifetimeGranted: "1000", starterGranted: true });
  }
  await service.commitMatchEntry({
    matchId: "m_rummy",
    roomCode: "RUMMY1",
    hostIdentityId: ids[0]!,
    seatCount: opts.seats,
    humanSeatCount: opts.seats,
    botSeatCount: 0,
    isSolo: false,
    gameKind: opts.rowKnowsGame === false ? undefined : opts.gameKind,
    participantDebits: ids.map((identityId) => ({ identityId, identityKind: "member" as const, amountCoins: opts.stakePerSeat })),
  });
  // Winner first, the rest in seat order — exactly what economyPlacements builds for Rummy.
  const winner = ids[opts.winnerIndex]!;
  const order = [winner, ...ids.filter((id) => id !== winner)];
  const result = await service.settleMatchEconomy({
    matchId: "m_rummy",
    isValidRanking: true,
    participants: order.map((identityId, i) => ({ identityId, identityKind: "member" as const, placement: i + 1 })),
    // What RoomManager sends: the room's own game.
    gameKind: opts.gameKind,
  });
  const balances: Record<string, string> = {};
  for (const id of ids) balances[id] = (await service.getWallet(id)).balance;
  return { result, balances, ids, winner };
}

describe("Rummy settlement — through the real economy path", () => {
  it("1 point = 2 coins, 3 players: each pays 160, the winner takes all 480, the losers get nothing back", async () => {
    const { result, balances, ids } = await playTable({ seats: 3, stakePerSeat: "160", gameKind: "rummy", winnerIndex: 1 });
    expect(result.settlement.status).toBe("SETTLED");
    expect(result.settlement.totalCollected).toBe("480");
    expect(result.settlement.totalWorldBankCut).toBe("0");
    expect(result.settlement.totalWalletRewarded).toBe("480");
    expect(balances[ids[1]!]).toBe("1320"); // 1000 - 160 + 480
    expect(balances[ids[0]!]).toBe("840");
    expect(balances[ids[2]!]).toBe("840");
  });

  it("1 point = 1 coin, 6 players (a full table): 80 each, the winner takes all 480", async () => {
    const { result, balances, ids } = await playTable({ seats: 6, stakePerSeat: "80", gameKind: "rummy", winnerIndex: 4 });
    expect(result.settlement.totalWorldBankCut).toBe("0");
    expect(balances[ids[4]!]).toBe("1400"); // 1000 - 80 + 480
    for (const i of [0, 1, 2, 3, 5]) expect(balances[ids[i]!]).toBe("920");
  });

  it("no coin is created or lost: the wallets add up to what they started with", async () => {
    const { balances } = await playTable({ seats: 5, stakePerSeat: "320", gameKind: "rummy", winnerIndex: 0 });
    const total = Object.values(balances).reduce((sum, b) => sum + BigInt(b), 0n);
    expect(total).toBe(5000n);
  });

  it("pays the whole pot even when the settlement row never recorded its game (database without the game-kind migration)", async () => {
    const { result, balances, ids } = await playTable({
      seats: 2,
      stakePerSeat: "160",
      gameKind: "rummy",
      winnerIndex: 0,
      rowKnowsGame: false,
    });
    expect(result.settlement.gameKind ?? null).toBeNull(); // the row really is blind to the game
    expect(result.settlement.totalWorldBankCut).toBe("0");
    expect(balances[ids[0]!]).toBe("1160"); // 1000 - 160 + 320, NOT 1000 - 160 + 256
    expect(balances[ids[1]!]).toBe("840");
  });

  it("the same table for another game still pays the 20% cut — Rummy's rule is not global", async () => {
    const { result, balances, ids } = await playTable({ seats: 2, stakePerSeat: "100", gameKind: "ludo", winnerIndex: 0 });
    expect(result.settlement.totalWorldBankCut).toBe("40");
    expect(balances[ids[0]!]).toBe("1060"); // 1000 - 100 + 160
  });
});
