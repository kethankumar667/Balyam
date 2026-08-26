import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { InMemoryEconomyRepository, type EconomyRepositoryTestFixture } from "../InMemoryEconomyRepository.js";
import {
  IdentityNotFoundError,
  InvalidIdentityKindError,
  OnlyMembersCanRedeemError,
  VoucherAlreadyRedeemedError,
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
      expect(reread?.balance).toBe("2000");
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

    it("rejects redemption by a guest identity with OnlyMembersCanRedeemError, before disclosing whether the code exists", async () => {
      fixture.seedIdentity("guest_trying_redeem", "guest");
      await expect(repo.redeemRewardVoucher(fakeHash(), "guest_trying_redeem")).rejects.toBeInstanceOf(
        OnlyMembersCanRedeemError,
      );
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
      expect(wallet?.balance).toBe("1900"); // debited exactly once (2000 - 100)
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
      expect(wallet?.balance).toBe("2000");
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
      expect(wallet?.balance).toBe("1800"); // 2000 - 200, once
    });
  });

  describe("concurrent settlement", () => {
    it("produces exactly one applied:true and exactly one voucher issued across 8 concurrent callers for the same matchId", async () => {
      fixture.seedIdentity("host_race_settle", "guest");
      await repo.ensureWallet("host_race_settle");
      const raceGuest = crypto.randomUUID();
      fixture.seedIdentity(raceGuest, "guest");
      const raceHash = fakeHash();

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
              participants: [{ identityId: raceGuest, identityKind: "guest", placement: 1, voucherCodeHash: raceHash }],
            })
            .then((r) => r.applied)
            .catch(() => "error" as const),
        ),
      );
      expect(results.filter((r) => r === true).length).toBe(1);

      const voucherStatus = await repo.getVoucherStatus(raceHash);
      expect(voucherStatus?.coinAmount).toBe("150");
      expect(fixture.snapshot().vouchers.filter((v) => v.codeHash === raceHash)).toHaveLength(1);
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
      expect(wallet?.balance).toBe("2000"); // fully restored, once
    });
  });

  describe("concurrent voucher redemption", () => {
    it("produces exactly one applied:true, credited once, across 8 concurrent callers for the same voucher", async () => {
      fixture.seedIdentity("host_race_redeem", "guest");
      await repo.ensureWallet("host_race_redeem");
      const winningGuest = crypto.randomUUID();
      fixture.seedIdentity(winningGuest, "guest");
      const redeemHash = fakeHash();

      await repo.commitMatchEntry({
        matchId: "m_race_redeem",
        roomCode: "RACE",
        hostIdentityId: "host_race_redeem",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });
      await repo.settleMatchEconomy({
        matchId: "m_race_redeem",
        isValidRanking: true,
        participants: [{ identityId: winningGuest, identityKind: "guest", placement: 1, voucherCodeHash: redeemHash }],
      });

      const redeemer = crypto.randomUUID();
      fixture.seedIdentity(redeemer, "member");
      await repo.ensureWallet(redeemer);

      const results = await Promise.all(
        Array.from({ length: 8 }, () => repo.redeemRewardVoucher(redeemHash, redeemer)),
      );
      expect(results.filter((r) => r.applied).length).toBe(1);

      const wallet = await repo.getWallet(redeemer);
      expect(wallet?.balance).toBe("5150"); // 5000 starter + 150 voucher, once

      // A DIFFERENT member attempting the same voucher after it's redeemed is a hard rejection, not a replay.
      const otherMember = crypto.randomUUID();
      fixture.seedIdentity(otherMember, "member");
      await expect(repo.redeemRewardVoucher(redeemHash, otherMember)).rejects.toBeInstanceOf(VoucherAlreadyRedeemedError);
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
    it("keeps base fee revenue, bot prize revenue, and guest escrow liability independently correct after a mixed settlement", async () => {
      fixture.seedIdentity("wb_host", "guest");
      await repo.ensureWallet("wb_host");
      const wbMember = crypto.randomUUID();
      fixture.seedIdentity(wbMember, "member");
      const wbGuest = crypto.randomUUID();
      fixture.seedIdentity(wbGuest, "guest");
      const wbHash = fakeHash();

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
          { identityId: wbGuest, identityKind: "guest", placement: 2, voucherCodeHash: wbHash },
          { identityId: "bot_seat_3", identityKind: "bot", placement: 3 },
        ],
      });
      expect(settled.result.totalWalletRewarded).toBe("200");
      expect(settled.result.totalGuestEscrow).toBe("150");
      expect(settled.result.totalBotCollection).toBe("100");
      expect(settled.result.totalWorldBankCut).toBe("50");

      const snapshot = await repo.getWorldBankSnapshot();
      expect(snapshot.baseFeeRevenue).toBe("50");
      expect(snapshot.botPrizeRevenue).toBe("100");
      expect(snapshot.guestEscrowLiability).toBe("150");
      expect(snapshot.totalVoucherRedeemed).toBe("0");

      // The guest's own wallet must never change — no ledger row for the escrow event.
      const guestWallet = await repo.getWallet(wbGuest);
      expect(guestWallet).toBeNull();
    });
  });

  describe("Guest escrow deposit and redemption", () => {
    it("moves the liability from deposit to redemption exactly, and credits the redeeming member", async () => {
      fixture.seedIdentity("escrow_host", "guest");
      await repo.ensureWallet("escrow_host");
      const escrowGuest = crypto.randomUUID();
      fixture.seedIdentity(escrowGuest, "guest");
      const escrowHash = fakeHash();

      await repo.commitMatchEntry({
        matchId: "m_escrow",
        roomCode: "R",
        hostIdentityId: "escrow_host",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });
      await repo.settleMatchEconomy({
        matchId: "m_escrow",
        isValidRanking: true,
        participants: [{ identityId: escrowGuest, identityKind: "guest", placement: 1, voucherCodeHash: escrowHash }],
      });

      const afterDeposit = await repo.getWorldBankSnapshot();
      expect(afterDeposit.guestEscrowLiability).toBe("150");

      const redeemer = crypto.randomUUID();
      fixture.seedIdentity(redeemer, "member");
      await repo.ensureWallet(redeemer);
      const redeemed = await repo.redeemRewardVoucher(escrowHash, redeemer);
      expect(redeemed.result.status).toBe("REDEEMED");

      const afterRedemption = await repo.getWorldBankSnapshot();
      expect(afterRedemption.guestEscrowLiability).toBe("0");
      expect(afterRedemption.totalVoucherRedeemed).toBe("150");

      const memberWallet = await repo.getWallet(redeemer);
      expect(memberWallet?.balance).toBe("5150");
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
  });

  describe("reset behavior", () => {
    it("restores a clean baseline — no leftover wallets/settlements/vouchers, default configuration intact", async () => {
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
});
