import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import {
  type CoinWalletRecord,
  type CommitMatchEntryInput,
  type EconomyConfigurationRecord,
  type EconomyOperationResult,
  type EconomyPrizeScheduleRecord,
  type EconomyRepository,
  type IssueGuestVoucherInput,
  type MatchEconomySettlementRecord,
  type RewardVoucherRecord,
  type SettleMatchEconomyInput,
  type SettlementReconciliation,
  type VoucherStatusView,
  type WorldBankSnapshot,
  EconomyInfrastructureError,
  IdentityNotFoundError,
  InsufficientFundsError,
  InvalidSeatConfigurationError,
  MatchNotCommittedError,
  VoucherCodeCollisionError,
  WalletFrozenError,
} from "../../persistence/EconomyRepository.js";
import { logger } from "../../lib/logger.js";
import {
  DuplicateParticipantIdentityError,
  EconomyService,
  EconomyServiceInfrastructureError,
  EmptyParticipantListError,
  InvalidParticipantShapeError,
  InvalidRankingShapeError,
  InvalidRequestError,
} from "../EconomyService.js";
import { hashVoucherCode } from "../voucherCrypto.js";

/* ═══════════════════════ fixtures ═══════════════════════════════════════ */

function freshRepo(): InMemoryEconomyRepository {
  return new InMemoryEconomyRepository();
}

function freshService(repo: EconomyRepository, opts?: ConstructorParameters<typeof EconomyService>[1]): EconomyService {
  return new EconomyService(repo, { delay: async () => undefined, ...opts });
}

function seedHost(repo: InMemoryEconomyRepository, identityId: string, balance: string, kind: "member" | "guest" = "member"): void {
  // lifetimeGranted must match balance — coin_wallets_balance_reconciles
  // requires balance = lifetimeGranted + lifetimeEarned + lifetimeRefunded - lifetimeSpent.
  repo.testFixture.seedWallet({ identityId, identityKind: kind, balance, lifetimeGranted: balance, starterGranted: true });
}

async function commitTwoSeatMatch(
  service: EconomyService,
  repo: InMemoryEconomyRepository,
  opts: { matchId: string; hostIdentityId: string; hostBalance?: string },
): Promise<void> {
  seedHost(repo, opts.hostIdentityId, opts.hostBalance ?? "1000");
  await service.commitMatchEntry({
    matchId: opts.matchId,
    roomCode: "ROOM1",
    hostIdentityId: opts.hostIdentityId,
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    isSolo: false,
  });
}

/* ═══════════════════════ a focused failure-injection double ═════════════
 * Per Phase 9's instruction: InMemoryEconomyRepository provides real
 * behavioral state everywhere it's usable; this wraps it (or stands alone)
 * only where a specific method must fail on command, which no repository
 * implementation is meant to do.
 */
class ScriptedFailureRepository implements EconomyRepository {
  readonly kind = "memory" as const;
  readonly callCounts = new Map<string, number>();

  constructor(
    private readonly inner: EconomyRepository,
    private readonly scripts: Partial<Record<keyof EconomyRepository, (callIndex: number) => Error | null>> = {},
  ) {}

  private async invoke<T>(method: keyof EconomyRepository, run: () => Promise<T>): Promise<T> {
    const count = (this.callCounts.get(method) ?? 0) + 1;
    this.callCounts.set(method, count);
    const script = this.scripts[method];
    if (script) {
      const err = script(count);
      if (err) throw err;
    }
    return run();
  }

  ping(): Promise<void> {
    return this.invoke("ping", () => this.inner.ping());
  }
  getWallet(identityId: string): Promise<CoinWalletRecord | null> {
    return this.invoke("getWallet", () => this.inner.getWallet(identityId));
  }
  listLedger(walletId: string, opts?: { limit?: number; offset?: number }) {
    return this.invoke("listLedger", () => this.inner.listLedger(walletId, opts));
  }
  getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null> {
    return this.invoke("getSettlement", () => this.inner.getSettlement(matchId));
  }
  getWorldBankSnapshot(): Promise<WorldBankSnapshot> {
    return this.invoke("getWorldBankSnapshot", () => this.inner.getWorldBankSnapshot());
  }
  getVoucherStatus(codeHash: string): Promise<VoucherStatusView | null> {
    return this.invoke("getVoucherStatus", () => this.inner.getVoucherStatus(codeHash));
  }
  getActiveConfiguration(): Promise<EconomyConfigurationRecord> {
    return this.invoke("getActiveConfiguration", () => this.inner.getActiveConfiguration());
  }
  getPrizeSchedule(seatCount: number): Promise<EconomyPrizeScheduleRecord | null> {
    return this.invoke("getPrizeSchedule", () => this.inner.getPrizeSchedule(seatCount));
  }
  reconcileSettlement(matchId: string): Promise<SettlementReconciliation> {
    return this.invoke("reconcileSettlement", () => this.inner.reconcileSettlement(matchId));
  }
  listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]> {
    return this.invoke("listStaleCommittedSettlements", () => this.inner.listStaleCommittedSettlements(olderThanMs));
  }
  ensureWallet(identityId: string): Promise<CoinWalletRecord> {
    return this.invoke("ensureWallet", () => this.inner.ensureWallet(identityId));
  }
  grantStarterCoins(identityId: string): Promise<EconomyOperationResult<CoinWalletRecord>> {
    return this.invoke("grantStarterCoins", () => this.inner.grantStarterCoins(identityId));
  }
  commitMatchEntry(input: CommitMatchEntryInput): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.invoke("commitMatchEntry", () => this.inner.commitMatchEntry(input));
  }
  settleMatchEconomy(input: SettleMatchEconomyInput): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.invoke("settleMatchEconomy", () => this.inner.settleMatchEconomy(input));
  }
  refundMatchEntry(matchId: string, reason: string): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.invoke("refundMatchEntry", () => this.inner.refundMatchEntry(matchId, reason));
  }
  forfeitMatchEntry(matchId: string, reason: string): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.invoke("forfeitMatchEntry", () => this.inner.forfeitMatchEntry(matchId, reason));
  }
  issueGuestVoucher(input: IssueGuestVoucherInput): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    return this.invoke("issueGuestVoucher", () => this.inner.issueGuestVoucher(input));
  }
  redeemRewardVoucher(codeHash: string, memberIdentityId: string): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    return this.invoke("redeemRewardVoucher", () => this.inner.redeemRewardVoucher(codeHash, memberIdentityId));
  }
}

/* ═══════════════════════ wallet & ledger ═════════════════════════════════ */

describe("EconomyService — wallet & ledger", () => {
  it("getWallet provisions and returns a wallet for a registered identity", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_a", "guest");
    const service = freshService(repo);
    const wallet = await service.getWallet("guest_a");
    expect(wallet.identityId).toBe("guest_a");
    expect(wallet.balance).toBe("2000"); // starter grant, per DEFAULT_CONFIG
    expect(wallet.starterGranted).toBe(true);
  });

  it("getWallet rejects an identity nobody registered (IdentityNotFoundError, not a bare null)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await expect(service.getWallet("guest_never_registered")).rejects.toBeInstanceOf(IdentityNotFoundError);
  });

  it("getLedger returns newest-first entries for a provisioned wallet", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_b", "guest");
    const service = freshService(repo);
    await service.getWallet("guest_b"); // provisions + starter grant
    const entries = await service.getLedger("guest_b");
    expect(entries.length).toBe(1);
    expect(entries[0].entryType).toBe("STARTER_GRANT");
    expect(entries[0].amount).toBe("2000");
  });
});

/* ═══════════════════════ checkout quotation ═════════════════════════════ */

describe("EconomyService — quoteMatchCheckout", () => {
  it("quotes a 2-seat match: cost 100/seat, 1st place 150, world bank 50 (per DEFAULT_SCHEDULES)", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_2seat", "1000");
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({
      hostIdentityId: "host_2seat", seatCount: 2, humanSeatCount: 2, botSeatCount: 0,
    });
    expect(quote.costPerSeat).toBe("100");
    expect(quote.totalCommitment).toBe("200");
    expect(quote.prizeDistribution).toEqual({ firstPlace: "150", secondPlace: "0", thirdPlace: "0" });
    expect(quote.worldBankContribution).toBe("50");
    expect(quote.hostBalance).toBe("1000");
    expect(quote.projectedBalance).toBe("800");
    expect(quote.hasSufficientFunds).toBe(true);
    expect(quote.shortfall).toBeNull();
  });

  it("quotes a 5-seat match: cost 100/seat, full prize ladder, world bank 50", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_5seat", "1000");
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({
      hostIdentityId: "host_5seat", seatCount: 5, humanSeatCount: 3, botSeatCount: 2,
    });
    expect(quote.seatCount).toBe(5);
    expect(quote.humanSeatCount).toBe(3);
    expect(quote.botSeatCount).toBe(2);
    expect(quote.totalCommitment).toBe("500");
    expect(quote.prizeDistribution).toEqual({ firstPlace: "200", secondPlace: "150", thirdPlace: "100" });
  });

  it("rejects an unsupported seat count without ever reaching the repository's schedule lookup", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await expect(
      service.quoteMatchCheckout({ hostIdentityId: "host_x", seatCount: 7, humanSeatCount: 7, botSeatCount: 0 }),
    ).rejects.toBeInstanceOf(InvalidSeatConfigurationError);
    await expect(
      service.quoteMatchCheckout({ hostIdentityId: "host_x", seatCount: 0, humanSeatCount: 0, botSeatCount: 0 }),
    ).rejects.toBeInstanceOf(InvalidSeatConfigurationError);
  });

  it("an affordable checkout: hasSufficientFunds true, shortfall null", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_afford", "500");
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({ hostIdentityId: "host_afford", seatCount: 2, humanSeatCount: 2, botSeatCount: 0 });
    expect(quote.hasSufficientFunds).toBe(true);
    expect(quote.shortfall).toBeNull();
  });

  it("insufficient balance reports the EXACT shortfall, never a rounded or approximate figure", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_short", "37");
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({ hostIdentityId: "host_short", seatCount: 2, humanSeatCount: 2, botSeatCount: 0 });
    expect(quote.hasSufficientFunds).toBe(false);
    expect(quote.shortfall).toBe("163"); // 200 - 37
    expect(quote.projectedBalance).toBe("-163");
  });

  it("a host with no wallet yet quotes against a balance of 0, without provisioning one (read-only)", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_unprovisioned", "guest");
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({ hostIdentityId: "guest_unprovisioned", seatCount: 2, humanSeatCount: 2, botSeatCount: 0 });
    expect(quote.hostBalance).toBe("0");
    expect(quote.hasSufficientFunds).toBe(false);
    expect(await repo.getWallet("guest_unprovisioned")).toBeNull(); // still not provisioned
  });

  it("is bigint-safe above Number.MAX_SAFE_INTEGER: exact digits, no Number-precision rounding", async () => {
    const repo = freshRepo();
    const hugeSeatCost = "3000000000000000000"; // 3e18 — far beyond 2^53
    const config: EconomyConfigurationRecord = {
      id: "active", version: 9, guestStarterCoins: "2000", memberStarterCoins: "5000",
      seatCostCoins: hugeSeatCost, isActive: true,
    };
    const schedules: EconomyPrizeScheduleRecord[] = [
      { seatCount: 2, collectedCoins: "0", firstPlaceCoins: "0", secondPlaceCoins: "0", thirdPlaceCoins: "0", worldBankCoins: "0" },
    ];
    repo.testFixture.seedConfiguration(config, schedules);
    seedHost(repo, "host_huge", "9223372036854775807"); // Postgres bigint max
    const service = freshService(repo);
    const quote = await service.quoteMatchCheckout({ hostIdentityId: "host_huge", seatCount: 2, humanSeatCount: 2, botSeatCount: 0 });
    // 3e18 * 2 = 6e18 — Number(3e18) * 2 is representable, but the point is
    // this path never touches Number at all; assert against a BigInt-computed
    // expectation, not a hand-typed literal that could hide a silent bug.
    expect(quote.totalCommitment).toBe((3000000000000000000n * 2n).toString());
    expect(quote.hostBalance).toBe("9223372036854775807");
    expect(quote.projectedBalance).toBe((9223372036854775807n - 6000000000000000000n).toString());
    expect(quote.configurationVersion).toBe(9);
  });
});

/* ═══════════════════════ entry commitment ═══════════════════════════════ */

describe("EconomyService — commitMatchEntry", () => {
  it("commits successfully, debiting the host wallet", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_commit", "1000");
    const service = freshService(repo);
    const result = await service.commitMatchEntry({
      matchId: "m_commit_1", roomCode: "R1", hostIdentityId: "host_commit",
      seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
    });
    expect(result.applied).toBe(true);
    expect(result.settlement.status).toBe("COMMITTED");
    expect(result.settlement.totalCollected).toBe("200");
    const wallet = await repo.getWallet("host_commit");
    expect(wallet?.balance).toBe("800");
  });

  it("a replayed commit for the same matchId returns applied:false with the ORIGINAL settlement, not an error", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_replay", "1000");
    const service = freshService(repo);
    const first = await service.commitMatchEntry({
      matchId: "m_replay_1", roomCode: "R1", hostIdentityId: "host_replay",
      seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
    });
    const second = await service.commitMatchEntry({
      matchId: "m_replay_1", roomCode: "R1", hostIdentityId: "host_replay",
      seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
    });
    expect(second.applied).toBe(false);
    expect(second.settlement).toEqual(first.settlement);
    const wallet = await repo.getWallet("host_replay");
    expect(wallet?.balance).toBe("800"); // debited exactly once
  });

  it("frozen host wallet: WalletFrozenError, never a bare rejection", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_frozen", "1000");
    repo.testFixture.setFrozen("host_frozen", true);
    const service = freshService(repo);
    await expect(
      service.commitMatchEntry({
        matchId: "m_frozen_1", roomCode: "R1", hostIdentityId: "host_frozen",
        seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
      }),
    ).rejects.toBeInstanceOf(WalletFrozenError);
  });

  it("insufficient funds: InsufficientFundsError, typed and propagated unchanged", async () => {
    const repo = freshRepo();
    seedHost(repo, "host_poor", "50");
    const service = freshService(repo);
    await expect(
      service.commitMatchEntry({
        matchId: "m_poor_1", roomCode: "R1", hostIdentityId: "host_poor",
        seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("rejects an empty matchId before ever calling the repository", async () => {
    const repo = freshRepo();
    const scripted = new ScriptedFailureRepository(repo);
    const service = freshService(scripted);
    await expect(
      service.commitMatchEntry({
        matchId: "", roomCode: "R1", hostIdentityId: "host_x",
        seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestError);
    expect(scripted.callCounts.size).toBe(0);
  });

  it("rejects a malformed seat configuration (human+bot != seatCount) before calling the repository", async () => {
    const repo = freshRepo();
    const scripted = new ScriptedFailureRepository(repo);
    const service = freshService(scripted);
    await expect(
      service.commitMatchEntry({
        matchId: "m_bad_seats", roomCode: "R1", hostIdentityId: "host_x",
        seatCount: 3, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
      }),
    ).rejects.toBeInstanceOf(InvalidSeatConfigurationError);
    expect(scripted.callCounts.size).toBe(0);
  });
});

/* ═══════════════════════ settlement validation ═══════════════════════════ */

describe("EconomyService — settleMatchEconomy validation", () => {
  it("rejects an empty participant list for a valid ranking", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_empty", hostIdentityId: "host_empty" });
    await expect(
      service.settleMatchEconomy({ matchId: "m_empty", isValidRanking: true, participants: [] }),
    ).rejects.toBeInstanceOf(EmptyParticipantListError);
  });

  it("rejects a duplicate participant identity", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_dup", hostIdentityId: "host_dup" });
    await expect(
      service.settleMatchEconomy({
        matchId: "m_dup", isValidRanking: true,
        participants: [
          { identityId: "p1", identityKind: "member", placement: 1 },
          { identityId: "p1", identityKind: "member", placement: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(DuplicateParticipantIdentityError);
  });

  it("rejects placements that are not a full 1..seatCount permutation (duplicate placement)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_dup_place", hostIdentityId: "host_dp" });
    await expect(
      service.settleMatchEconomy({
        matchId: "m_dup_place", isValidRanking: true,
        participants: [
          { identityId: "p1", identityKind: "member", placement: 1 },
          { identityId: "p2", identityKind: "member", placement: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidRankingShapeError);
  });

  it("rejects a participant count that does not match the committed seat count", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_count", hostIdentityId: "host_count" });
    await expect(
      service.settleMatchEconomy({
        matchId: "m_count", isValidRanking: true,
        participants: [{ identityId: "p1", identityKind: "member", placement: 1 }], // 2 seats, 1 participant
      }),
    ).rejects.toBeInstanceOf(InvalidRankingShapeError);
  });

  it("rejects a malformed participant shape (empty identityId)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_shape", hostIdentityId: "host_shape" });
    await expect(
      service.settleMatchEconomy({
        matchId: "m_shape", isValidRanking: true,
        participants: [
          { identityId: "", identityKind: "member", placement: 1 },
          { identityId: "p2", identityKind: "member", placement: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidParticipantShapeError);
  });

  it("rejects a non-positive-integer placement", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_place_shape", hostIdentityId: "host_ps" });
    await expect(
      service.settleMatchEconomy({
        matchId: "m_place_shape", isValidRanking: true,
        participants: [
          { identityId: "p1", identityKind: "member", placement: 0 },
          { identityId: "p2", identityKind: "member", placement: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidParticipantShapeError);
  });

  it("requires a non-empty refundReason when isValidRanking is false", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_norefund", hostIdentityId: "host_nr" });
    await expect(
      service.settleMatchEconomy({ matchId: "m_norefund", isValidRanking: false, participants: [] }),
    ).rejects.toBeInstanceOf(InvalidRequestError);
  });

  it("an invalid-ranking settlement refunds the full commitment, ignoring any participants supplied", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_invalid_ranking", hostIdentityId: "host_ir", hostBalance: "1000" });
    const result = await service.settleMatchEconomy({
      matchId: "m_invalid_ranking", isValidRanking: false, refundReason: "tie",
      participants: [{ identityId: "irrelevant", identityKind: "member", placement: 1 }],
    });
    expect(result.applied).toBe(true);
    expect(result.settlement.status).toBe("REFUNDED");
    expect(result.issuedVouchers).toEqual([]);
    const wallet = await repo.getWallet("host_ir");
    expect(wallet?.balance).toBe("1000"); // fully refunded
  });

  it("settling against a matchId with no committed entry raises MatchNotCommittedError", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await expect(
      service.settleMatchEconomy({
        matchId: "m_never_committed", isValidRanking: true,
        participants: [
          { identityId: "p1", identityKind: "member", placement: 1 },
          { identityId: "p2", identityKind: "member", placement: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(MatchNotCommittedError);
  });
});

/* ═══════════════════════ settlement — success, replay, vouchers ═════════ */

describe("EconomyService — settleMatchEconomy outcomes", () => {
  it("settles successfully: member winner credited, loser gets nothing, world bank collects", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_settle_ok", hostIdentityId: "host_ok" });
    repo.testFixture.seedIdentity("member_winner", "member");
    repo.testFixture.seedIdentity("member_loser", "member");
    const result = await service.settleMatchEconomy({
      matchId: "m_settle_ok", isValidRanking: true,
      participants: [
        { identityId: "member_winner", identityKind: "member", placement: 1 },
        { identityId: "member_loser", identityKind: "member", placement: 2 },
      ],
    });
    expect(result.applied).toBe(true);
    expect(result.settlement.status).toBe("SETTLED");
    expect(result.settlement.totalWalletRewarded).toBe("150");
    expect(result.settlement.totalWorldBankCut).toBe("50");
    expect(result.issuedVouchers).toEqual([]);
    const winner = await repo.getWallet("member_winner");
    // ensureWallet's first-touch provisioning grants the member starter bonus
    // (5000, DEFAULT_CONFIG) before the 150 prize credit lands on top of it.
    expect(winner?.balance).toBe("5150");
  });

  it("a guest winner gets a server-generated voucher, never a wallet credit", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_settle_guest", hostIdentityId: "host_guest_settle" });
    repo.testFixture.seedIdentity("guest_winner", "guest");
    repo.testFixture.seedIdentity("member_second", "member");
    const result = await service.settleMatchEconomy({
      matchId: "m_settle_guest", isValidRanking: true,
      participants: [
        { identityId: "guest_winner", identityKind: "guest", placement: 1 },
        { identityId: "member_second", identityKind: "member", placement: 2 },
      ],
    });
    expect(result.issuedVouchers).toHaveLength(1);
    const ack = result.issuedVouchers[0]!;
    expect(ack.identityId).toBe("guest_winner");
    expect(ack.coinAmount).toBe("150");
    expect(typeof ack.rawCode).toBe("string");
    expect(ack.rawCode.length).toBeGreaterThan(0);

    const guestWallet = await repo.getWallet("guest_winner");
    expect(guestWallet).toBeNull(); // never credited — escrowed instead

    const status = await service.getVoucherStatus(ack.rawCode);
    expect(status).toEqual({ status: "ACTIVE", coinAmount: "150" });
  });

  it("a replayed settlement returns applied:false with the original settlement and issues NO new vouchers", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_settle_replay", hostIdentityId: "host_settle_replay" });
    repo.testFixture.seedIdentity("guest_replay", "guest");
    repo.testFixture.seedIdentity("member_replay", "member");
    const request = {
      matchId: "m_settle_replay", isValidRanking: true as const,
      participants: [
        { identityId: "guest_replay", identityKind: "guest" as const, placement: 1 },
        { identityId: "member_replay", identityKind: "member" as const, placement: 2 },
      ],
    };
    const first = await service.settleMatchEconomy(request);
    const second = await service.settleMatchEconomy(request);
    expect(second.applied).toBe(false);
    expect(second.settlement).toEqual(first.settlement);
    expect(second.issuedVouchers).toEqual([]);
  });

  it("retries with a freshly generated voucher hash on a code_hash collision, without changing the settlement idempotency key", async () => {
    const repo = freshRepo();
    await commitTwoSeatMatch(
      new EconomyService(repo, { delay: async () => undefined }),
      repo,
      { matchId: "m_collision", hostIdentityId: "host_collision" },
    );
    repo.testFixture.seedIdentity("guest_collision", "guest");
    repo.testFixture.seedIdentity("member_collision", "member");

    const scripted = new ScriptedFailureRepository(repo, {
      settleMatchEconomy: (count) => (count === 1 ? new VoucherCodeCollisionError("collided") : null),
    });
    const service = new EconomyService(scripted, { delay: async () => undefined });

    const result = await service.settleMatchEconomy({
      matchId: "m_collision", isValidRanking: true,
      participants: [
        { identityId: "guest_collision", identityKind: "guest", placement: 1 },
        { identityId: "member_collision", identityKind: "member", placement: 2 },
      ],
    });
    expect(result.applied).toBe(true);
    expect(scripted.callCounts.get("settleMatchEconomy")).toBe(2); // one collision, one success
    expect(result.issuedVouchers).toHaveLength(1);
  });
});

/* ═══════════════════════ refund ══════════════════════════════════════════ */

describe("EconomyService — refundMatchEntry", () => {
  it("refunds the full commitment back to the host wallet", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_refund_ok", hostIdentityId: "host_refund_ok", hostBalance: "1000" });
    const result = await service.refundMatchEntry("m_refund_ok", "player disconnected");
    expect(result.applied).toBe(true);
    expect(result.settlement.status).toBe("REFUNDED");
    const wallet = await repo.getWallet("host_refund_ok");
    expect(wallet?.balance).toBe("1000");
  });

  it("a replayed refund returns applied:false with the same settlement", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_refund_replay", hostIdentityId: "host_refund_replay" });
    const first = await service.refundMatchEntry("m_refund_replay", "reason");
    const second = await service.refundMatchEntry("m_refund_replay", "reason");
    expect(second.applied).toBe(false);
    expect(second.settlement).toEqual(first.settlement);
  });

  it("rejects an empty reason before calling the repository (audit gap prevention)", async () => {
    const repo = freshRepo();
    const scripted = new ScriptedFailureRepository(repo);
    const service = freshService(scripted);
    await expect(service.refundMatchEntry("m_x", "")).rejects.toBeInstanceOf(InvalidRequestError);
    expect(scripted.callCounts.size).toBe(0);
  });
});

/* ═══════════════════════ voucher redemption ══════════════════════════════ */

describe("EconomyService — voucher redemption", () => {
  async function settleWithGuestWinner(repo: InMemoryEconomyRepository, service: EconomyService, matchId: string) {
    await commitTwoSeatMatch(service, repo, { matchId, hostIdentityId: `host_${matchId}` });
    repo.testFixture.seedIdentity(`guest_${matchId}`, "guest");
    repo.testFixture.seedIdentity(`member_${matchId}`, "member");
    const result = await service.settleMatchEconomy({
      matchId, isValidRanking: true,
      participants: [
        { identityId: `guest_${matchId}`, identityKind: "guest", placement: 1 },
        { identityId: `member_${matchId}`, identityKind: "member", placement: 2 },
      ],
    });
    return result.issuedVouchers[0]!.rawCode;
  }

  it("redeems successfully: member wallet credited, voucher REDEEMED, no codeHash on the returned record", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const rawCode = await settleWithGuestWinner(repo, service, "m_redeem_ok");
    repo.testFixture.seedIdentity("redeemer", "member");
    const result = await service.redeemVoucher(rawCode, "redeemer");
    expect(result.applied).toBe(true);
    expect(result.voucher.status).toBe("REDEEMED");
    expect(result.voucher.coinAmount).toBe("150");
    expect("codeHash" in result.voucher).toBe(false);
    const wallet = await repo.getWallet("redeemer");
    // 5000 member starter grant (first-touch provisioning) + 150 redeemed.
    expect(wallet?.balance).toBe("5150");
  });

  it("a replayed redemption by the SAME member returns applied:false, credited only once", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const rawCode = await settleWithGuestWinner(repo, service, "m_redeem_replay");
    repo.testFixture.seedIdentity("redeemer2", "member");
    const first = await service.redeemVoucher(rawCode, "redeemer2");
    const second = await service.redeemVoucher(rawCode, "redeemer2");
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    const wallet = await repo.getWallet("redeemer2");
    expect(wallet?.balance).toBe("5150"); // 5000 starter grant + 150, credited exactly once
  });

  it("a frozen redeemer wallet is refused with WalletFrozenError", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const rawCode = await settleWithGuestWinner(repo, service, "m_redeem_frozen");
    repo.testFixture.seedWallet({ identityId: "frozen_redeemer", identityKind: "member", isFrozen: true });
    await expect(service.redeemVoucher(rawCode, "frozen_redeemer")).rejects.toBeInstanceOf(WalletFrozenError);
  });
});

/* ═══════════════════════ error & retry policy ════════════════════════════ */

describe("EconomyService — error and retry policy", () => {
  it("retries exactly once on an infrastructure error, then succeeds", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_retry", "guest");
    const scripted = new ScriptedFailureRepository(repo, {
      ensureWallet: (count) => (count === 1 ? new EconomyInfrastructureError("connection reset") : null),
    });
    const service = freshService(scripted);
    const wallet = await service.getWallet("guest_retry");
    expect(wallet.identityId).toBe("guest_retry");
    expect(scripted.callCounts.get("ensureWallet")).toBe(2);
  });

  it("wraps a persistently failing infrastructure error into EconomyServiceInfrastructureError with a GENERIC message (no raw detail)", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_fail", "guest");
    const rawDetail = "PostgREST 500 on coin_wallets_safe: relation coin_wallets_safe_secret_detail violates constraint xyz";
    const scripted = new ScriptedFailureRepository(repo, {
      ensureWallet: () => new EconomyInfrastructureError(rawDetail),
    });
    const service = freshService(scripted);
    await expect(service.getWallet("guest_fail")).rejects.toBeInstanceOf(EconomyServiceInfrastructureError);
    expect(scripted.callCounts.get("ensureWallet")).toBe(2); // exactly one retry attempted, then gave up
    try {
      await service.getWallet("guest_fail");
    } catch (err) {
      expect(err).toBeInstanceOf(EconomyServiceInfrastructureError);
      expect((err as Error).message).not.toContain(rawDetail);
      expect((err as Error).message).not.toContain("PostgREST");
      expect((err as Error).message).not.toContain("constraint");
    }
  });

  it("does NOT retry a business error — it propagates immediately, typed and unchanged", async () => {
    const repo = freshRepo();
    repo.testFixture.seedIdentity("guest_biz", "guest");
    const scripted = new ScriptedFailureRepository(repo, {
      ensureWallet: () => new WalletFrozenError("frozen"),
    });
    const service = freshService(scripted);
    await expect(service.getWallet("guest_biz")).rejects.toBeInstanceOf(WalletFrozenError);
    expect(scripted.callCounts.get("ensureWallet")).toBe(1); // never retried
  });

  it("propagates every typed repository error unchanged (not wrapped, not re-messaged)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    // Balance 250 covers the first 2-seat commit (200) with 50 left over —
    // not enough for a second commit against the same wallet.
    await commitTwoSeatMatch(service, repo, { matchId: "m_typed_err", hostIdentityId: "host_typed_err", hostBalance: "250" });
    let caught: unknown;
    try {
      await service.commitMatchEntry({
        matchId: "m_typed_err_2", roomCode: "R1", hostIdentityId: "host_typed_err",
        seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InsufficientFundsError);
    expect((caught as InsufficientFundsError).code).toBe("INSUFFICIENT_FUNDS");
  });

  it("redeemVoucher never retries, even on an infrastructure error", async () => {
    const repo = freshRepo();
    const service0 = freshService(repo);
    const rawCode = await (async () => {
      await commitTwoSeatMatch(service0, repo, { matchId: "m_no_retry_redeem", hostIdentityId: "host_nrr" });
      repo.testFixture.seedIdentity("guest_nrr", "guest");
      repo.testFixture.seedIdentity("member_nrr", "member");
      const result = await service0.settleMatchEconomy({
        matchId: "m_no_retry_redeem", isValidRanking: true,
        participants: [
          { identityId: "guest_nrr", identityKind: "guest", placement: 1 },
          { identityId: "member_nrr", identityKind: "member", placement: 2 },
        ],
      });
      return result.issuedVouchers[0]!.rawCode;
    })();

    repo.testFixture.seedIdentity("redeemer_nrr", "member");
    const scripted = new ScriptedFailureRepository(repo, {
      redeemRewardVoucher: () => new EconomyInfrastructureError("blip"),
    });
    const service = freshService(scripted);
    await expect(service.redeemVoucher(rawCode, "redeemer_nrr")).rejects.toBeInstanceOf(EconomyServiceInfrastructureError);
    expect(scripted.callCounts.get("redeemRewardVoucher")).toBe(1); // no retry attempted
  });
});

/* ═══════════════════════ logging & secret-safety ═════════════════════════ */

describe("EconomyService — logging never carries voucher secrets", () => {
  let logSpies: Array<{ mockRestore: () => void; mock: { calls: unknown[][] } }>;

  beforeEach(() => {
    logSpies = [
      vi.spyOn(logger, "info").mockImplementation(() => undefined),
      vi.spyOn(logger, "warn").mockImplementation(() => undefined),
      vi.spyOn(logger, "error").mockImplementation(() => undefined),
      vi.spyOn(logger, "debug").mockImplementation(() => undefined),
    ];
  });

  afterEach(() => {
    for (const spy of logSpies) spy.mockRestore();
  });

  it("no logger call anywhere in an issue-then-redeem flow contains the raw code or its hash", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    await commitTwoSeatMatch(service, repo, { matchId: "m_log_safety", hostIdentityId: "host_log_safety" });
    repo.testFixture.seedIdentity("guest_log_safety", "guest");
    repo.testFixture.seedIdentity("member_log_safety", "member");

    const settleResult = await service.settleMatchEconomy({
      matchId: "m_log_safety", isValidRanking: true,
      participants: [
        { identityId: "guest_log_safety", identityKind: "guest", placement: 1 },
        { identityId: "member_log_safety", identityKind: "member", placement: 2 },
      ],
    });
    const rawCode = settleResult.issuedVouchers[0]!.rawCode;
    const codeHash = hashVoucherCode(rawCode);

    repo.testFixture.seedIdentity("redeemer_log_safety", "member");
    await service.redeemVoucher(rawCode, "redeemer_log_safety");

    const allCalls = logSpies.flatMap((spy) => spy.mock.calls);
    expect(allCalls.length).toBeGreaterThan(0); // sanity: logging actually happened
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(rawCode);
    expect(serialized).not.toContain(codeHash);
  });
});

/* ═══════════════════════ dependency injection & arithmetic ═══════════════ */

describe("EconomyService — repository dependency injection", () => {
  it("accepts ANY EconomyRepository implementation via its constructor, never instantiates one itself", async () => {
    const repo = freshRepo();
    const scripted = new ScriptedFailureRepository(repo); // not InMemoryEconomyRepository, not SupabaseEconomyRepository
    const service = new EconomyService(scripted, { delay: async () => undefined });
    repo.testFixture.seedIdentity("di_check", "guest");
    const wallet = await service.getWallet("di_check");
    expect(wallet.identityId).toBe("di_check");
    expect(scripted.callCounts.get("ensureWallet")).toBe(1);
  });
});

describe("EconomyService — zero floating-point coin arithmetic", () => {
  it("a huge ledger amount round-trips through the service with exact digits (no Number involved)", async () => {
    const repo = freshRepo();
    repo.testFixture.seedWallet({
      identityId: "guest_bignum", identityKind: "guest",
      balance: "9223372036854775807", lifetimeGranted: "9223372036854775807",
    });
    const service = freshService(repo);
    const wallet = await service.getWallet("guest_bignum");
    expect(wallet.balance).toBe("9223372036854775807");
    // If this had ever been routed through Number, it would come back as
    // 9223372036854776000 (off by 193) — asserting the exact string is the
    // whole point, not merely that SOME string came back.
    expect(wallet.balance).not.toBe(String(Number("9223372036854775807")));
  });
});
