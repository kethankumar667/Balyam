import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEconomyRepository } from "../InMemoryEconomyRepository.js";
import {
  type SettleMatchEconomyInput,
  InsufficientFundsError,
  InvalidIdentityKindError,
  MatchAlreadyForfeitedError,
  MatchAlreadyRefundedError,
  MatchAlreadySettledError,
  MatchNotFoundError,
  WalletFrozenError,
} from "../EconomyRepository.js";

describe("Phase 6A: Durable Settlement Event Auditing", () => {
  let repo: InMemoryEconomyRepository;

  const HOST_ID = "usr_host_123";
  const GUEST_ID = "usr_guest_456";
  const MEMBER_WINNER_ID = "usr_member_winner";
  const VOUCHER_HASH = "a".repeat(64);

  beforeEach(async () => {
    repo = new InMemoryEconomyRepository();
    repo.testFixture.seedIdentity(HOST_ID, "member");
    repo.testFixture.seedWallet({
      identityId: HOST_ID,
      identityKind: "member",
      balance: "10000",
      lifetimeGranted: "10000",
      lifetimeEarned: "0",
      lifetimeSpent: "0",
      lifetimeRefunded: "0",
      starterGranted: true,
      isFrozen: false,
    });

    repo.testFixture.seedIdentity(GUEST_ID, "guest");
    repo.testFixture.seedIdentity(MEMBER_WINNER_ID, "member");
    repo.testFixture.seedWallet({
      identityId: MEMBER_WINNER_ID,
      identityKind: "member",
      balance: "5000",
      lifetimeGranted: "5000",
      lifetimeEarned: "0",
      lifetimeSpent: "0",
      lifetimeRefunded: "0",
      starterGranted: true,
      isFrozen: false,
    });
  });

  describe("1. Match Commitment Audit Events", () => {
    it("emits MATCH_COMMITTED with monotonic sequence 1 on initial commitment", async () => {
      const matchId = "match_commit_001";
      const result = await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM01",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      expect(result.applied).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.matchId).toBe(matchId);
      expect(event.sequenceNumber).toBe(1);
      expect(event.eventType).toBe("MATCH_COMMITTED");
      expect(event.previousStatus).toBeNull();
      expect(event.currentStatus).toBe("COMMITTED");
      expect(event.operation).toBe("commit_match_entry");
      expect(event.applied).toBe(true);
      expect(event.isReplay).toBe(false);
      expect(event.raceLost).toBe(false);
      expect(event.initiatorKind).toBe("system");
      expect(event.initiatorId).toBe(HOST_ID);
      expect(event.payload).toMatchObject({
        roomCode: "ROOM01",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        costPerSeat: "100",
        totalCollected: "200",
        isSolo: false,
      });
      expect(event.createdAt).toBeGreaterThan(0);
    });

    it("emits MATCH_COMMITMENT_REPLAYED with sequence 2 on duplicate commitment", async () => {
      const matchId = "match_commit_replay_001";
      const commitInput = {
        matchId,
        roomCode: "ROOM02",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      };

      const first = await repo.commitMatchEntry(commitInput);
      expect(first.applied).toBe(true);

      const replay = await repo.commitMatchEntry(commitInput);
      expect(replay.applied).toBe(false);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      expect(events[0].sequenceNumber).toBe(1);
      expect(events[0].eventType).toBe("MATCH_COMMITTED");
      expect(events[0].applied).toBe(true);

      const replayEvent = events[1];
      expect(replayEvent.matchId).toBe(matchId);
      expect(replayEvent.sequenceNumber).toBe(2);
      expect(replayEvent.eventType).toBe("MATCH_COMMITMENT_REPLAYED");
      expect(replayEvent.previousStatus).toBe("COMMITTED");
      expect(replayEvent.currentStatus).toBe("COMMITTED");
      expect(replayEvent.operation).toBe("commit_match_entry");
      expect(replayEvent.applied).toBe(false);
      expect(replayEvent.isReplay).toBe(true);
      expect(replayEvent.raceLost).toBe(false);
      expect(replayEvent.initiatorKind).toBe("system");
      expect(replayEvent.reason).toContain("Idempotent match commitment replay");
    });
  });

  describe("2. Match Settlement Audit Events", () => {
    it("emits MATCH_SETTLED with sequence 2 on successful settlement", async () => {
      const matchId = "match_settle_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM03",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const settleResult = await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_WINNER_ID, identityKind: "member", placement: 1 },
          { identityId: HOST_ID, identityKind: "member", placement: 2 },
        ],
      });

      expect(settleResult.applied).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      const settleEvent = events[1];
      expect(settleEvent.matchId).toBe(matchId);
      expect(settleEvent.sequenceNumber).toBe(2);
      expect(settleEvent.eventType).toBe("MATCH_SETTLED");
      expect(settleEvent.previousStatus).toBe("COMMITTED");
      expect(settleEvent.currentStatus).toBe("SETTLED");
      expect(settleEvent.operation).toBe("settle_match_economy");
      expect(settleEvent.applied).toBe(true);
      expect(settleEvent.isReplay).toBe(false);
      expect(settleEvent.raceLost).toBe(false);
      expect(settleEvent.payload).toMatchObject({
        totalWalletRewarded: "150",
        totalGuestEscrow: "0",
        totalBotCollection: "0",
        totalWorldBankCut: "50",
        totalCollected: "200",
      });
    });

    it("emits MATCH_SETTLEMENT_REPLAYED with sequence 3 on duplicate settlement", async () => {
      const matchId = "match_settle_replay_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM04",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const settleInput: SettleMatchEconomyInput = {
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_WINNER_ID, identityKind: "member", placement: 1 },
          { identityId: HOST_ID, identityKind: "member", placement: 2 },
        ],
      };

      const firstSettle = await repo.settleMatchEconomy(settleInput);
      expect(firstSettle.applied).toBe(true);

      const replaySettle = await repo.settleMatchEconomy(settleInput);
      expect(replaySettle.applied).toBe(false);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      expect(events[0].eventType).toBe("MATCH_COMMITTED");
      expect(events[1].eventType).toBe("MATCH_SETTLED");

      const replayEvent = events[2];
      expect(replayEvent.sequenceNumber).toBe(3);
      expect(replayEvent.eventType).toBe("MATCH_SETTLEMENT_REPLAYED");
      expect(replayEvent.previousStatus).toBe("SETTLED");
      expect(replayEvent.currentStatus).toBe("SETTLED");
      expect(replayEvent.applied).toBe(false);
      expect(replayEvent.isReplay).toBe(true);
      expect(replayEvent.raceLost).toBe(false);
      expect(replayEvent.reason).toContain("Idempotent match settlement replay");
    });
  });

  describe("3. Match Refund Audit Events", () => {
    it("emits MATCH_REFUNDED on explicit refund", async () => {
      const matchId = "match_refund_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM05",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const refundResult = await repo.refundMatchEntry(matchId, "Room host cancelled match");
      expect(refundResult.applied).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      const refundEvent = events[1];
      expect(refundEvent.sequenceNumber).toBe(2);
      expect(refundEvent.eventType).toBe("MATCH_REFUNDED");
      expect(refundEvent.previousStatus).toBe("COMMITTED");
      expect(refundEvent.currentStatus).toBe("REFUNDED");
      expect(refundEvent.operation).toBe("economy_apply_refund");
      expect(refundEvent.applied).toBe(true);
      expect(refundEvent.isReplay).toBe(false);
      expect(refundEvent.reason).toBe("Room host cancelled match");
      expect(refundEvent.payload).toMatchObject({
        totalRefunded: "200",
        hostIdentityId: HOST_ID,
      });
    });

    it("emits MATCH_REFUND_REPLAYED on duplicate refund call", async () => {
      const matchId = "match_refund_replay_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM06",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const firstRefund = await repo.refundMatchEntry(matchId, "First refund");
      expect(firstRefund.applied).toBe(true);

      const replayRefund = await repo.refundMatchEntry(matchId, "First refund");
      expect(replayRefund.applied).toBe(false);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      const replayEvent = events[2];
      expect(replayEvent.sequenceNumber).toBe(3);
      expect(replayEvent.eventType).toBe("MATCH_REFUND_REPLAYED");
      expect(replayEvent.previousStatus).toBe("REFUNDED");
      expect(replayEvent.currentStatus).toBe("REFUNDED");
      expect(replayEvent.applied).toBe(false);
      expect(replayEvent.isReplay).toBe(true);
    });

    it("emits MATCH_REFUNDED when settleMatchEconomy encounters invalid ranking", async () => {
      const matchId = "match_settle_invalid_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM07",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const settleResult = await repo.settleMatchEconomy({
        matchId,
        isValidRanking: false,
        participants: [],
        refundReason: "Authoritative draw in 2-player match",
      });

      expect(settleResult.applied).toBe(true);
      expect(settleResult.result.status).toBe("REFUNDED");

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      const refundEvent = events[1];
      expect(refundEvent.sequenceNumber).toBe(2);
      expect(refundEvent.eventType).toBe("MATCH_REFUNDED");
      expect(refundEvent.previousStatus).toBe("COMMITTED");
      expect(refundEvent.currentStatus).toBe("REFUNDED");
      expect(refundEvent.reason).toBe("Authoritative draw in 2-player match");
    });
  });

  describe("4. Match Forfeiture Audit Events", () => {
    it("emits MATCH_FORFEITED on abandonment forfeiture", async () => {
      const matchId = "match_forfeit_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM08",
        hostIdentityId: HOST_ID,
        seatCount: 3,
        humanSeatCount: 1,
        botSeatCount: 2,
        isSolo: false,
      });

      const forfeitResult = await repo.forfeitMatchEntry(matchId, "Host departed with no signed-in successor");
      expect(forfeitResult.applied).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      const forfeitEvent = events[1];
      expect(forfeitEvent.sequenceNumber).toBe(2);
      expect(forfeitEvent.eventType).toBe("MATCH_FORFEITED");
      expect(forfeitEvent.previousStatus).toBe("COMMITTED");
      expect(forfeitEvent.currentStatus).toBe("ABANDONMENT_FORFEITED");
      expect(forfeitEvent.operation).toBe("forfeit_match_entry");
      expect(forfeitEvent.applied).toBe(true);
      expect(forfeitEvent.isReplay).toBe(false);
      expect(forfeitEvent.reason).toBe("Host departed with no signed-in successor");
      expect(forfeitEvent.payload).toMatchObject({
        totalForfeited: "300",
        hostIdentityId: HOST_ID,
        forfeitureReason: "Host departed with no signed-in successor",
      });
    });

    it("emits MATCH_FORFEITURE_REPLAYED on duplicate forfeiture call", async () => {
      const matchId = "match_forfeit_replay_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM09",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });

      const firstForfeit = await repo.forfeitMatchEntry(matchId, "Host departed");
      expect(firstForfeit.applied).toBe(true);

      const replayForfeit = await repo.forfeitMatchEntry(matchId, "Host departed");
      expect(replayForfeit.applied).toBe(false);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      const replayEvent = events[2];
      expect(replayEvent.sequenceNumber).toBe(3);
      expect(replayEvent.eventType).toBe("MATCH_FORFEITURE_REPLAYED");
      expect(replayEvent.previousStatus).toBe("ABANDONMENT_FORFEITED");
      expect(replayEvent.currentStatus).toBe("ABANDONMENT_FORFEITED");
      expect(replayEvent.applied).toBe(false);
      expect(replayEvent.isReplay).toBe(true);
    });
  });

  describe("5. Conflicting Terminal Race Loss Events", () => {
    it("emits SETTLEMENT_RACE_LOST when settlement arrives for already REFUNDED match", async () => {
      const matchId = "match_race_refund_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM10",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      // Match is refunded first
      await repo.refundMatchEntry(matchId, "Compensating refund");

      // Settlement arrives late
      const lateSettle = await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_WINNER_ID, identityKind: "member", placement: 1 },
          { identityId: HOST_ID, identityKind: "member", placement: 2 },
        ],
      });

      expect(lateSettle.applied).toBe(false);
      expect(lateSettle.result.status).toBe("REFUNDED");

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      const raceEvent = events[2];
      expect(raceEvent.sequenceNumber).toBe(3);
      expect(raceEvent.eventType).toBe("SETTLEMENT_RACE_LOST");
      expect(raceEvent.previousStatus).toBe("REFUNDED");
      expect(raceEvent.currentStatus).toBe("REFUNDED");
      expect(raceEvent.applied).toBe(false);
      expect(raceEvent.isReplay).toBe(false);
      expect(raceEvent.raceLost).toBe(true);
      expect(raceEvent.reason).toContain("Settlement attempt arrived after match had already reached terminal state: REFUNDED");
    });

    it("emits SETTLEMENT_RACE_LOST when settlement arrives for already ABANDONMENT_FORFEITED match", async () => {
      const matchId = "match_race_forfeit_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM11",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });

      // Match is forfeited first
      await repo.forfeitMatchEntry(matchId, "Host disconnected past grace period");

      // Settlement arrives late
      const lateSettle = await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: HOST_ID, identityKind: "member", placement: 1 },
          { identityId: "bot_1", identityKind: "bot", placement: 2 },
        ],
      });

      expect(lateSettle.applied).toBe(false);
      expect(lateSettle.result.status).toBe("ABANDONMENT_FORFEITED");

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      const raceEvent = events[2];
      expect(raceEvent.sequenceNumber).toBe(3);
      expect(raceEvent.eventType).toBe("SETTLEMENT_RACE_LOST");
      expect(raceEvent.previousStatus).toBe("ABANDONMENT_FORFEITED");
      expect(raceEvent.currentStatus).toBe("ABANDONMENT_FORFEITED");
      expect(raceEvent.applied).toBe(false);
      expect(raceEvent.isReplay).toBe(false);
      expect(raceEvent.raceLost).toBe(true);
      expect(raceEvent.reason).toContain("Settlement attempt arrived after match had already reached terminal state: ABANDONMENT_FORFEITED");
    });
  });

  describe("6. Settlement Reconciliation Audit Events", () => {
    it("emits RECONCILIATION_AUDITED when reconcileSettlement is executed", async () => {
      const matchId = "match_recon_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM12",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_WINNER_ID, identityKind: "member", placement: 1 },
          { identityId: HOST_ID, identityKind: "member", placement: 2 },
        ],
      });

      const recon = await repo.reconcileSettlement(matchId);
      expect(recon.isBalanced).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(3);

      const reconEvent = events[2];
      expect(reconEvent.sequenceNumber).toBe(3);
      expect(reconEvent.eventType).toBe("RECONCILIATION_AUDITED");
      expect(reconEvent.previousStatus).toBe("SETTLED");
      expect(reconEvent.currentStatus).toBe("SETTLED");
      expect(reconEvent.initiatorKind).toBe("operator");
      expect(reconEvent.payload).toMatchObject({
        isBalanced: true,
        collected: "200",
        disbursed: "200",
        delta: "0",
      });
    });

    it("throws MatchNotFoundError and emits zero events when reconcileSettlement targets non-existent match", async () => {
      const nonExistentMatchId = "match_does_not_exist";
      await expect(repo.reconcileSettlement(nonExistentMatchId)).rejects.toThrow(MatchNotFoundError);

      const events = await repo.listSettlementEvents(nonExistentMatchId);
      expect(events).toHaveLength(0);
    });
  });

  describe("7. Multi-Match Isolation & Sequence Monotonicity", () => {
    it("maintains independent, strictly monotonic sequences across multiple matches", async () => {
      const matchA = "match_seq_A";
      const matchB = "match_seq_B";

      await repo.commitMatchEntry({
        matchId: matchA,
        roomCode: "ROOMA",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      await repo.commitMatchEntry({
        matchId: matchB,
        roomCode: "ROOMB",
        hostIdentityId: HOST_ID,
        seatCount: 3,
        humanSeatCount: 3,
        botSeatCount: 0,
        isSolo: false,
      });

      await repo.refundMatchEntry(matchA, "Refund A");
      await repo.forfeitMatchEntry(matchB, "Forfeit B");

      const eventsA = await repo.listSettlementEvents(matchA);
      const eventsB = await repo.listSettlementEvents(matchB);

      expect(eventsA.map((e) => e.sequenceNumber)).toEqual([1, 2]);
      expect(eventsA.map((e) => e.eventType)).toEqual(["MATCH_COMMITTED", "MATCH_REFUNDED"]);

      expect(eventsB.map((e) => e.sequenceNumber)).toEqual([1, 2]);
      expect(eventsB.map((e) => e.eventType)).toEqual(["MATCH_COMMITTED", "MATCH_FORFEITED"]);
    });
  });

  describe("8. Rollback Atomicity & Error Invariants", () => {
    it("rolls back all audit events if a settlement operation fails validation", async () => {
      const matchId = "match_rollback_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM13",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const eventsBefore = await repo.listSettlementEvents(matchId);
      expect(eventsBefore).toHaveLength(1);

      // Attempt settle with invalid participant kind
      await expect(
        repo.settleMatchEconomy({
          matchId,
          isValidRanking: true,
          participants: [
            { identityId: "invalid_user", identityKind: "alien" as any, placement: 1 },
          ],
        }),
      ).rejects.toThrow(InvalidIdentityKindError);

      const eventsAfter = await repo.listSettlementEvents(matchId);
      // Zero partial events survived the error
      expect(eventsAfter).toHaveLength(1);
      expect(eventsAfter[0].sequenceNumber).toBe(1);
      expect(eventsAfter[0].eventType).toBe("MATCH_COMMITTED");
    });

    it("emits zero audit events when commit fails due to insufficient funds", async () => {
      const matchId = "match_insufficient_funds_001";
      const poorHostId = "usr_poor_host";
      repo.testFixture.seedIdentity(poorHostId, "member");
      repo.testFixture.seedWallet({
        identityId: poorHostId,
        identityKind: "member",
        balance: "50", // Less than 200 required for 2 seats
        lifetimeGranted: "50",
        lifetimeEarned: "0",
        lifetimeSpent: "0",
        lifetimeRefunded: "0",
        starterGranted: true,
        isFrozen: false,
      });

      await expect(
        repo.commitMatchEntry({
          matchId,
          roomCode: "ROOM14",
          hostIdentityId: poorHostId,
          seatCount: 2,
          humanSeatCount: 2,
          botSeatCount: 0,
          isSolo: false,
        }),
      ).rejects.toThrow(InsufficientFundsError);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(0);
    });

    it("emits zero audit events when commit fails due to frozen wallet", async () => {
      const matchId = "match_frozen_wallet_001";
      const frozenHostId = "usr_frozen_host";
      repo.testFixture.seedIdentity(frozenHostId, "member");
      repo.testFixture.seedWallet({
        identityId: frozenHostId,
        identityKind: "member",
        balance: "5000",
        lifetimeGranted: "5000",
        lifetimeEarned: "0",
        lifetimeSpent: "0",
        lifetimeRefunded: "0",
        starterGranted: true,
        isFrozen: true,
      });

      await expect(
        repo.commitMatchEntry({
          matchId,
          roomCode: "ROOM15",
          hostIdentityId: frozenHostId,
          seatCount: 2,
          humanSeatCount: 2,
          botSeatCount: 0,
          isSolo: false,
        }),
      ).rejects.toThrow(WalletFrozenError);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(0);
    });

    it("prevents illegal cross-terminal transitions and rolls back", async () => {
      const matchId = "match_cross_terminal_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM16",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      // Settle the match
      await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_WINNER_ID, identityKind: "member", placement: 1 },
          { identityId: HOST_ID, identityKind: "member", placement: 2 },
        ],
      });

      // Refunding a settled match is illegal
      await expect(repo.refundMatchEntry(matchId, "Refund attempt")).rejects.toThrow(MatchAlreadySettledError);

      // Forfeiting a settled match is illegal
      await expect(repo.forfeitMatchEntry(matchId, "Forfeit attempt")).rejects.toThrow(MatchAlreadySettledError);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.eventType)).toEqual(["MATCH_COMMITTED", "MATCH_SETTLED"]);
    });
  });

  describe("9. Mixed Participant Settlements & Solo Sessions", () => {
    it("records guest escrow and bot collection accurately in MATCH_SETTLED event", async () => {
      const matchId = "match_mixed_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM17",
        hostIdentityId: HOST_ID,
        seatCount: 3,
        humanSeatCount: 2,
        botSeatCount: 1,
        isSolo: false,
      });

      const settleResult = await repo.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: GUEST_ID, identityKind: "guest", placement: 1, voucherCodeHash: VOUCHER_HASH },
          { identityId: "bot_1", identityKind: "bot", placement: 2 },
          { identityId: HOST_ID, identityKind: "member", placement: 3 },
        ],
      });

      expect(settleResult.applied).toBe(true);

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(2);

      const settleEvent = events[1];
      expect(settleEvent.eventType).toBe("MATCH_SETTLED");
      expect(settleEvent.payload).toMatchObject({
        totalWalletRewarded: "0",
        totalGuestEscrow: "150",
        totalBotCollection: "100",
        totalWorldBankCut: "50",
        totalCollected: "300",
      });
    });

    it("records solo match commitment accurately with isSolo: true", async () => {
      const matchId = "match_solo_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: null,
        hostIdentityId: HOST_ID,
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });

      const events = await repo.listSettlementEvents(matchId);
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({
        roomCode: "SOLO",
        seatCount: 1,
        totalCollected: "100",
        isSolo: true,
      });
    });

    it("includes settlementEvents in repository snapshot and clears on reset", async () => {
      const matchId = "match_snapshot_001";
      await repo.commitMatchEntry({
        matchId,
        roomCode: "ROOM18",
        hostIdentityId: HOST_ID,
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
      });

      const snap = repo.testFixture.snapshot();
      expect(snap.settlementEvents.length).toBeGreaterThan(0);
      expect(snap.settlementEvents[0].matchId).toBe(matchId);

      repo.testFixture.reset();
      const afterResetEvents = await repo.listSettlementEvents(matchId);
      expect(afterResetEvents).toHaveLength(0);
    });
  });
});
