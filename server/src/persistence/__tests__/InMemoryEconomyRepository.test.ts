import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { InMemoryEconomyRepository, type EconomyRepositoryTestFixture } from "../InMemoryEconomyRepository.js";
import {
  IdentityNotFoundError,
  InsufficientFundsError,
  InvalidIdentityKindError,
  WalletFrozenError,
  type ParticipantIdentityKind,
} from "../EconomyRepository.js";

/**
 * Focused Phase 2 tests for `InMemoryEconomyRepository`. These are NOT the
 * shared contract suite (`economyRepositoryContract.test.ts`, still 74
 * `it.todo`, untouched by this file) — that suite activates in Phase 4, once
 * `SupabaseEconomyRepository` exists to run it against too. These tests
 * exist to prove THIS implementation's own internal correctness: cloning,
 * rollback, locking, and the invariants unique to a plain-JS store with no
 * ambient transaction.
 */
function fakeHash(): string {
  return crypto.createHash("sha256").update(crypto.randomBytes(16)).digest("hex");
}

describe("InMemoryEconomyRepository", () => {
  let repo: InMemoryEconomyRepository;
  let fixture: EconomyRepositoryTestFixture;

  beforeEach(() => {
    repo = new InMemoryEconomyRepository();
    fixture = repo.testFixture;
  });

  describe("state isolation", () => {
    it("keeps two separate instances' state fully independent", async () => {
      const other = new InMemoryEconomyRepository();
      const otherFixture = other.testFixture;
      fixture.seedIdentity("guest_iso", "guest");
      await repo.ensureWallet("guest_iso");

      expect(await repo.getWallet("guest_iso")).not.toBeNull();
      expect(await other.getWallet("guest_iso")).toBeNull();
      expect(otherFixture.snapshot().wallets).toHaveLength(0);
    });
  });

  describe("defensive cloning", () => {
    it("never lets a caller mutate stored state via a returned read", async () => {
      fixture.seedIdentity("guest_clone_read", "guest");
      const wallet = await repo.ensureWallet("guest_clone_read");
      wallet.balance = "999999999";
      wallet.isFrozen = true;

      const reread = await repo.getWallet("guest_clone_read");
      expect(reread?.balance).toBe("3000");
      expect(reread?.isFrozen).toBe(false);
    });

    it("never stores a caller-supplied input object by reference", async () => {
      fixture.seedIdentity("host_clone_write", "guest");
      await repo.ensureWallet("host_clone_write");
      const input = {
        matchId: "m_clone_write",
        roomCode: "R",
        hostIdentityId: "host_clone_write",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      };
      await repo.commitMatchEntry(input);
      input.seatCount = 5; // mutate the caller's own object after the call resolves

      const settlement = await repo.getSettlement("m_clone_write");
      expect(settlement?.seatCount).toBe(1);
    });

    it("snapshot() returns a deep copy — mutating it never affects the live store", () => {
      fixture.seedIdentity("guest_snap", "guest");
      const snap = fixture.snapshot();
      snap.identities.push({ identityId: "injected", kind: "member" });
      expect(fixture.snapshot().identities.some((i) => i.identityId === "injected")).toBe(false);
    });
  });

  describe("error mapping", () => {
    it("throws the exact named domain error for a known business failure, never a bare Error", async () => {
      await expect(repo.ensureWallet("nobody_registered")).rejects.toBeInstanceOf(IdentityNotFoundError);

      fixture.seedIdentity("frozen_spender", "guest");
      await repo.ensureWallet("frozen_spender");
      fixture.setFrozen("frozen_spender", true);
      await expect(
        repo.commitMatchEntry({
          matchId: "m_frozen_commit",
          roomCode: null,
          hostIdentityId: "frozen_spender",
          seatCount: 1,
          humanSeatCount: 1,
          botSeatCount: 0,
          isSolo: true,
        }),
      ).rejects.toBeInstanceOf(WalletFrozenError);
    });

    it("rejects an unrecognized participant identityKind with InvalidIdentityKindError specifically", async () => {
      fixture.seedIdentity("host_bad_kind", "guest");
      await repo.ensureWallet("host_bad_kind");
      await repo.commitMatchEntry({
        matchId: "m_bad_kind",
        roomCode: "R",
        hostIdentityId: "host_bad_kind",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });
      await expect(
        repo.settleMatchEconomy({
          matchId: "m_bad_kind",
          isValidRanking: true,
          participants: [{ identityId: "x", identityKind: "alien" as unknown as ParticipantIdentityKind, placement: 1 }],
        }),
      ).rejects.toBeInstanceOf(InvalidIdentityKindError);
    });

  });

  describe("atomic rollback", () => {
    it("leaves zero partial state when settleMatchEconomy fails partway through a multi-participant array", async () => {
      fixture.seedIdentity("host_partial", "guest");
      await repo.ensureWallet("host_partial");
      const validMember = crypto.randomUUID();
      fixture.seedIdentity(validMember, "member");
      const memberWalletBefore = await repo.ensureWallet(validMember);

      // 3-seat match: 1st=150, 2nd=100, 3rd=0, world bank=50 — the valid
      // member would be credited BEFORE the loop reaches the bad participant.
      await repo.commitMatchEntry({
        matchId: "m_partial",
        roomCode: "R",
        hostIdentityId: "host_partial",
        seatCount: 3,
        humanSeatCount: 2,
        botSeatCount: 1,
        isSolo: false,
      });

      await expect(
        repo.settleMatchEconomy({
          matchId: "m_partial",
          isValidRanking: true,
          participants: [
            { identityId: validMember, identityKind: "member", placement: 1 },
            { identityId: "irrelevant", identityKind: "alien" as unknown as ParticipantIdentityKind, placement: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(InvalidIdentityKindError);

      const memberWalletAfter = await repo.getWallet(validMember);
      expect(memberWalletAfter?.balance).toBe(memberWalletBefore.balance);
      expect(await repo.listLedger(validMember)).toHaveLength(1); // only the starter grant

      const settlement = await repo.getSettlement("m_partial");
      expect(settlement?.status).toBe("COMMITTED");
      expect(settlement?.totalWalletRewarded).toBe("0");

      expect(fixture.snapshot().participants.filter((p) => p.matchId === "m_partial")).toHaveLength(0);
    });
  });

  describe("idempotent replay", () => {
    it("commitMatchEntry replay returns applied:false with the ORIGINAL settlement, no second debit", async () => {
      fixture.seedIdentity("host_replay", "guest");
      await repo.ensureWallet("host_replay");
      const first = await repo.commitMatchEntry({
        matchId: "m_replay",
        roomCode: "R",
        hostIdentityId: "host_replay",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });
      expect(first.applied).toBe(true);

      const second = await repo.commitMatchEntry({
        matchId: "m_replay",
        roomCode: "DIFFERENT_ROOM_CODE",
        hostIdentityId: "host_replay",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });
      expect(second.applied).toBe(false);
      expect(second.result.roomCode).toBe("R"); // the ORIGINAL value, not the replay's differing input

      const wallet = await repo.getWallet("host_replay");
      expect(wallet?.balance).toBe("2900"); // debited exactly once (3000 - 100)
    });
  });

  describe("concurrent starter grant", () => {
    it("produces exactly one applied:true across 8 concurrent callers for the same identity", async () => {
      fixture.seedIdentity("guest_race_grant", "guest");
      fixture.seedWallet({ identityId: "guest_race_grant", identityKind: "guest", balance: "0", starterGranted: false });

      const results = await Promise.all(
        Array.from({ length: 8 }, () => repo.grantStarterCoins("guest_race_grant")),
      );
      expect(results.filter((r) => r.applied).length).toBe(1);

      const wallet = await repo.getWallet("guest_race_grant");
      expect(wallet?.balance).toBe("3000");
    });
  });

  describe("concurrent match commitment", () => {
    it("produces exactly one applied:true, debited once, across 8 concurrent callers for the same matchId", async () => {
      fixture.seedIdentity("host_race_commit", "guest");
      await repo.ensureWallet("host_race_commit");

      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          repo.commitMatchEntry({
            matchId: "m_race_commit",
            roomCode: "RACE",
            hostIdentityId: "host_race_commit",
            seatCount: 2,
            humanSeatCount: 2,
            botSeatCount: 0,
            isSolo: false,
          }),
        ),
      );
      expect(results.filter((r) => r.applied).length).toBe(1);

      const wallet = await repo.getWallet("host_race_commit");
      expect(wallet?.balance).toBe("2800"); // 3000 - 200, once
    });
  });

  describe("concurrent settlement", () => {
    it("produces exactly one applied:true and exactly one prize credit across 8 concurrent callers for the same matchId", async () => {
      fixture.seedIdentity("host_race_settle", "guest");
      await repo.ensureWallet("host_race_settle");
      const raceGuest = crypto.randomUUID();
      fixture.seedIdentity(raceGuest, "guest");

      // 2 seats: 1st=150, world bank=50 — a single 1st-place participant
      // fully conserves the 200 total.
      await repo.commitMatchEntry({
        matchId: "m_race_settle",
        roomCode: "RACE",
        hostIdentityId: "host_race_settle",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });

      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          repo
            .settleMatchEconomy({
              matchId: "m_race_settle",
              isValidRanking: true,
              participants: [{ identityId: raceGuest, identityKind: "guest", placement: 1 }],
            })
            .then((r) => r.applied)
            .catch(() => "error" as const),
        ),
      );
      expect(results.filter((r) => r === true).length).toBe(1);

      // Paid once, into the guest's wallet: the 3,000 welcome grant plus the 160 prize.
      expect((await repo.getWallet(raceGuest))?.balance).toBe("3160");
      const credits = (await repo.listLedger(raceGuest)).filter((e) => e.entryType === "MATCH_PRIZE_CREDIT");
      expect(credits).toHaveLength(1);
    });
  });

  describe("concurrent refund", () => {
    it("produces exactly one applied:true, credited once, across 8 concurrent callers for the same matchId", async () => {
      fixture.seedIdentity("host_race_refund", "guest");
      await repo.ensureWallet("host_race_refund");
      await repo.commitMatchEntry({
        matchId: "m_race_refund",
        roomCode: "RACE",
        hostIdentityId: "host_race_refund",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });

      const results = await Promise.all(
        Array.from({ length: 8 }, () => repo.refundMatchEntry("m_race_refund", "race test")),
      );
      expect(results.filter((r) => r.applied).length).toBe(1);

      const wallet = await repo.getWallet("host_race_refund");
      expect(wallet?.balance).toBe("3000"); // fully restored, once
    });
  });

  describe("frozen-wallet behavior", () => {
    it("blocks spend (commit) and redemption while frozen, but never blocks receiving a reward or a refund", async () => {
      fixture.seedIdentity("frozen_host", "guest");
      await repo.ensureWallet("frozen_host");
      fixture.setFrozen("frozen_host", true);
      await expect(
        repo.commitMatchEntry({
          matchId: "m_frozen_2",
          roomCode: null,
          hostIdentityId: "frozen_host",
          seatCount: 1,
          humanSeatCount: 1,
          botSeatCount: 0,
          isSolo: true,
        }),
      ).rejects.toBeInstanceOf(WalletFrozenError);

      const frozenMember = crypto.randomUUID();
      fixture.seedIdentity(frozenMember, "member");
      await repo.ensureWallet(frozenMember);
      fixture.setFrozen(frozenMember, true);

      fixture.seedIdentity("frozen_test_host2", "guest");
      await repo.ensureWallet("frozen_test_host2");
      await repo.commitMatchEntry({
        matchId: "m_frozen_reward",
        roomCode: "R",
        hostIdentityId: "frozen_test_host2",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });
      const settled = await repo.settleMatchEconomy({
        matchId: "m_frozen_reward",
        isValidRanking: true,
        participants: [{ identityId: frozenMember, identityKind: "member", placement: 1 }],
      });
      expect(settled.applied).toBe(true); // frozen member MAY still receive a reward

      fixture.seedIdentity("frozen_refund_host", "guest");
      await repo.ensureWallet("frozen_refund_host");
      await repo.commitMatchEntry({
        matchId: "m_frozen_refund",
        roomCode: null,
        hostIdentityId: "frozen_refund_host",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });
      fixture.setFrozen("frozen_refund_host", true);
      const refunded = await repo.refundMatchEntry("m_frozen_refund", "test");
      expect(refunded.applied).toBe(true); // frozen host MAY still receive a refund
    });
  });

  describe("World Bank balance separation", () => {
    it("keeps base fee revenue and bot prize revenue correct, and escrows nothing, after a mixed member, guest and bot settlement", async () => {
      fixture.seedIdentity("wb_host", "guest");
      await repo.ensureWallet("wb_host");
      const wbMember = crypto.randomUUID();
      fixture.seedIdentity(wbMember, "member");
      const wbGuest = crypto.randomUUID();
      fixture.seedIdentity(wbGuest, "guest");

      // 5 seats: 1st=200, 2nd=150, 3rd=100, world bank=50 (total 500).
      await repo.commitMatchEntry({
        matchId: "m_wb",
        roomCode: "R",
        hostIdentityId: "wb_host",
        seatCount: 5,
        humanSeatCount: 4,
        botSeatCount: 1,
        isSolo: false,
      });
      const settled = await repo.settleMatchEconomy({
        matchId: "m_wb",
        isValidRanking: true,
        participants: [
          { identityId: wbMember, identityKind: "member", placement: 1 },
          { identityId: wbGuest, identityKind: "guest", placement: 2 },
          { identityId: "bot_seat_3", identityKind: "bot", placement: 3 },
        ],
      });
      expect(settled.result.totalWalletRewarded).toBe("320"); // the member's 200 and the guest's 120
      expect(settled.result.totalGuestEscrow).toBe("0");
      expect(settled.result.totalBotCollection).toBe("80");
      expect(settled.result.totalWorldBankCut).toBe("100");

      const snapshot = await repo.getWorldBankSnapshot();
      expect(snapshot.baseFeeRevenue).toBe("100");
      expect(snapshot.botPrizeRevenue).toBe("80");
      expect(snapshot.guestEscrowLiability).toBe("0");
      expect(snapshot.totalVoucherRedeemed).toBe("0");

      // The guest is paid into their own wallet: the 3,000 welcome grant plus the 120 prize.
      const guestWallet = await repo.getWallet(wbGuest);
      expect(guestWallet?.balance).toBe("3120");
    });
  });

  describe("ledger transition correctness", () => {
    it("every ledger entry satisfies balanceAfter = balanceBefore + amount and versionAfter = versionBefore + 1", async () => {
      fixture.seedIdentity("ledger_check", "guest");
      await repo.ensureWallet("ledger_check");
      await repo.commitMatchEntry({
        matchId: "m_ledger",
        roomCode: null,
        hostIdentityId: "ledger_check",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });

      const entries = await repo.listLedger("ledger_check");
      expect(entries.length).toBe(2); // starter grant + the debit
      for (const entry of entries) {
        expect(BigInt(entry.balanceAfter)).toBe(BigInt(entry.balanceBefore) + BigInt(entry.amount));
        expect(entry.walletVersionAfter).toBe(entry.walletVersionBefore + 1);
      }
      // Newest-first ordering.
      expect(entries[0].entryType).toBe("SOLO_ENTRY_DEBIT");
      expect(entries[1].entryType).toBe("STARTER_GRANT");
    });

    it("gameKind flows onto the debit at commit time, is null when omitted, and carries through to a later prize credit and to a refund", async () => {
      // Match A: gameKind supplied — the debit AND the eventual prize credit both carry it.
      // Both seats are members; a guest winner is paid the same way, into their wallet.
      fixture.seedIdentity("game_kind_p1", "member");
      fixture.seedIdentity("game_kind_p2", "member");
      await repo.ensureWallet("game_kind_p1");
      await repo.ensureWallet("game_kind_p2");
      await repo.commitMatchEntry({
        matchId: "m_game_kind_a",
        roomCode: "ROOMGK",
        hostIdentityId: "game_kind_p1",
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
        gameKind: "handcricket",
      });
      const debitEntries = await repo.listLedger("game_kind_p1");
      expect(debitEntries[0].entryType).toBe("ROOM_ENTRY_DEBIT");
      expect(debitEntries[0].gameKind).toBe("handcricket");

      await repo.settleMatchEconomy({
        matchId: "m_game_kind_a",
        isValidRanking: true,
        participants: [
          { identityId: "game_kind_p1", identityKind: "member", placement: 1 },
          { identityId: "game_kind_p2", identityKind: "member", placement: 2 },
        ],
      });
      const creditEntries = await repo.listLedger("game_kind_p1");
      const creditEntry = creditEntries.find((e) => e.entryType === "MATCH_PRIZE_CREDIT")!;
      expect(creditEntry.gameKind).toBe("handcricket");

      // Match B: gameKind omitted (legacy/solo caller) — every entry it produces is null, never a guess.
      fixture.seedIdentity("game_kind_p3", "member");
      await repo.ensureWallet("game_kind_p3");
      await repo.commitMatchEntry({
        matchId: "m_game_kind_b",
        roomCode: null,
        hostIdentityId: "game_kind_p3",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });
      const noGameEntries = await repo.listLedger("game_kind_p3");
      expect(noGameEntries[0].entryType).toBe("SOLO_ENTRY_DEBIT");
      expect(noGameEntries[0].gameKind).toBeNull();

      await repo.refundMatchEntry("m_game_kind_b", "test refund");
      const refundedEntries = await repo.listLedger("game_kind_p3");
      const refundEntry = refundedEntries.find((e) => e.entryType === "MATCH_REFUND")!;
      expect(refundEntry.gameKind).toBeNull();
    });
  });

  describe("reset behavior", () => {
    it("restores a clean baseline — no leftover wallets or settlements, default configuration intact", async () => {
      fixture.seedIdentity("to_be_reset", "guest");
      await repo.ensureWallet("to_be_reset");
      await repo.commitMatchEntry({
        matchId: "m_reset",
        roomCode: null,
        hostIdentityId: "to_be_reset",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });
      expect(fixture.snapshot().wallets.length).toBeGreaterThan(0);

      fixture.reset();

      const snap = fixture.snapshot();
      expect(snap.wallets).toHaveLength(0);
      expect(snap.settlements).toHaveLength(0);
      expect(snap.identities).toHaveLength(0);
      expect(snap.configuration.seatCostCoins).toBe("100");
      expect(await repo.getPrizeSchedule(5)).toMatchObject({ firstPlaceCoins: "200" });
      await expect(repo.getWallet("to_be_reset")).resolves.toBeNull();
    });
  });

  describe("adminAdjustWallet", () => {
    it("credits player balance and maintains strict reconciliation invariant", async () => {
      fixture.seedIdentity("player_topup", "member");
      const res = await repo.adminAdjustWallet({
        identityId: "player_topup",
        amountCoins: "1500",
        adminPrincipalId: "admin_1",
        reason: "VIP top-up",
        idempotencyKey: "topup-1",
      });
      expect(res.applied).toBe(true);
      expect(res.operation).toBe("admin_adjust_wallet");
      // Member starter grant 5000 + 1500 = 6500
      expect(res.result.balance).toBe("6500");
      expect(res.result.lifetimeGranted).toBe("6500");

      const ledger = await repo.listLedger("player_topup");
      expect(ledger[0].entryType).toBe("ADMIN_ADJUSTMENT");
      expect(ledger[0].amount).toBe("1500");
      expect(ledger[0].description).toBe("VIP top-up");

      // Idempotency replay
      const replay = await repo.adminAdjustWallet({
        identityId: "player_topup",
        amountCoins: "1500",
        adminPrincipalId: "admin_1",
        reason: "VIP top-up",
        idempotencyKey: "topup-1",
      });
      expect(replay.applied).toBe(false);
      expect(replay.result.balance).toBe("6500");
    });

    it("rejects adjustment if wallet is frozen", async () => {
      fixture.seedIdentity("frozen_player", "member");
      await repo.ensureWallet("frozen_player");
      fixture.setFrozen("frozen_player", true);

      await expect(
        repo.adminAdjustWallet({
          identityId: "frozen_player",
          amountCoins: "500",
          adminPrincipalId: "admin_1",
          reason: "top-up",
          idempotencyKey: "frozen-1",
        }),
      ).rejects.toThrow(WalletFrozenError);
    });
  });

  describe("transferWalletCoins", () => {
    it("debits the sender and credits the recipient by the exact same amount — never mints or destroys coins", async () => {
      fixture.seedIdentity("p2p_sender", "member");
      fixture.seedIdentity("p2p_recipient", "member");
      await repo.ensureWallet("p2p_sender"); // 5000
      await repo.ensureWallet("p2p_recipient"); // 5000

      const res = await repo.transferWalletCoins({
        fromIdentityId: "p2p_sender",
        toIdentityId: "p2p_recipient",
        amountCoins: "200",
        reason: "test transfer",
        idempotencyKey: "xfer-1",
      });

      expect(res.applied).toBe(true);
      expect(res.result.identityId).toBe("p2p_sender");
      expect(res.result.balance).toBe("4800");

      const recipientWallet = await repo.getWallet("p2p_recipient");
      expect(recipientWallet?.balance).toBe("5200");

      const senderLedger = await repo.listLedger("p2p_sender");
      expect(senderLedger[0].entryType).toBe("P2P_TRANSFER_SEND");
      expect(senderLedger[0].amount).toBe("-200");

      const recipientLedger = await repo.listLedger("p2p_recipient");
      expect(recipientLedger[0].entryType).toBe("P2P_TRANSFER_RECEIVE");
      expect(recipientLedger[0].amount).toBe("200");
    });

    it("is idempotent — replaying the same key does not double-move coins", async () => {
      fixture.seedIdentity("p2p_sender_replay", "member");
      fixture.seedIdentity("p2p_recipient_replay", "member");
      await repo.ensureWallet("p2p_sender_replay");
      await repo.ensureWallet("p2p_recipient_replay");

      const input = {
        fromIdentityId: "p2p_sender_replay",
        toIdentityId: "p2p_recipient_replay",
        amountCoins: "300",
        reason: "replay test",
        idempotencyKey: "xfer-replay-1",
      };

      const first = await repo.transferWalletCoins(input);
      expect(first.applied).toBe(true);

      const replay = await repo.transferWalletCoins(input);
      expect(replay.applied).toBe(false);

      const senderWallet = await repo.getWallet("p2p_sender_replay");
      const recipientWallet = await repo.getWallet("p2p_recipient_replay");
      expect(senderWallet?.balance).toBe("4700"); // 5000 - 300, only once
      expect(recipientWallet?.balance).toBe("5300"); // 5000 + 300, only once
    });

    it("rejects a transfer that exceeds the sender's balance without touching either wallet", async () => {
      fixture.seedIdentity("p2p_poor_sender", "member");
      fixture.seedIdentity("p2p_recipient_2", "member");
      await repo.ensureWallet("p2p_poor_sender");
      await repo.ensureWallet("p2p_recipient_2");

      await expect(
        repo.transferWalletCoins({
          fromIdentityId: "p2p_poor_sender",
          toIdentityId: "p2p_recipient_2",
          amountCoins: "999999",
          reason: "too much",
          idempotencyKey: "xfer-fail-1",
        }),
      ).rejects.toThrow(InsufficientFundsError);

      const senderWallet = await repo.getWallet("p2p_poor_sender");
      const recipientWallet = await repo.getWallet("p2p_recipient_2");
      expect(senderWallet?.balance).toBe("5000");
      expect(recipientWallet?.balance).toBe("5000");
    });

    it("rejects a transfer when either wallet is frozen", async () => {
      fixture.seedIdentity("p2p_frozen_sender", "member");
      fixture.seedIdentity("p2p_recipient_3", "member");
      await repo.ensureWallet("p2p_frozen_sender");
      await repo.ensureWallet("p2p_recipient_3");
      fixture.setFrozen("p2p_frozen_sender", true);

      await expect(
        repo.transferWalletCoins({
          fromIdentityId: "p2p_frozen_sender",
          toIdentityId: "p2p_recipient_3",
          amountCoins: "100",
          reason: "frozen check",
          idempotencyKey: "xfer-frozen-1",
        }),
      ).rejects.toThrow(WalletFrozenError);
    });

    it("rejects transferring coins to oneself", async () => {
      fixture.seedIdentity("p2p_self", "member");
      await repo.ensureWallet("p2p_self");

      await expect(
        repo.transferWalletCoins({
          fromIdentityId: "p2p_self",
          toIdentityId: "p2p_self",
          amountCoins: "50",
          reason: "self",
          idempotencyKey: "xfer-self-1",
        }),
      ).rejects.toThrow(/INVALID_TRANSFER/);
    });
  });
});
