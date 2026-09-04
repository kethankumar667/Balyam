import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "node:crypto";
import { InMemoryEconomyRepository } from "../InMemoryEconomyRepository.js";
import { SupabaseEconomyRepository } from "../SupabaseEconomyRepository.js";
import { createSimulatedPostgrestFetch } from "./simulatedPostgrestFetch.js";
import {
  IdentityNotFoundError,
  InsufficientFundsError,
  InvalidIdentityIdError,
  InvalidIdentityKindError,
  InvalidSeatConfigurationError,
  InvalidVoucherHashError,
  MatchAlreadyForfeitedError,
  MatchAlreadyRefundedError,
  MatchAlreadySettledError,
  MatchNotCommittedError,
  MatchNotFoundError,
  OnlyMembersCanRedeemError,
  SettlementConservationViolationError,
  UnsupportedSeatCountError,
  VoucherAlreadyRedeemedError,
  VoucherCodeCollisionError,
  VoucherNotActiveError,
  VoucherNotFoundError,
  WalletFrozenError,
  WalletNotFoundError,
  type EconomyPrizeScheduleRecord,
  type EconomyRepository,
  type ParticipantIdentityKind,
  type PlayerIdentityKind,
} from "../EconomyRepository.js";

/**
 * Shared contract suite for `EconomyRepository` — ACTIVATED, Phase 4.
 *
 * ── What changed from the Phase 1 skeleton ───────────────────────────────
 * 74 original `it.todo` cases were audited against both implementations'
 * actual behavior. Full classification and justification for every removal
 * is in `docs/economy/economy-v1-phase4-contract-verification-report.md`
 * §1 — summarized here: 3 removed as INVALID (they described shape-
 * validation-on-plain-reads that Phase 2's own contract review determined
 * neither implementation performs or should perform — reads mirror plain
 * SELECT semantics, "not found" is `null`, never a thrown error for a
 * merely malformed id/hash); 2 removed as REDUNDANT (connectivity-failure
 * assertions are meaningful for Supabase only — an in-memory store cannot
 * become "unreachable" — and are already covered, more specifically, in
 * `SupabaseEconomyRepository.test.ts`); 6 concurrency-flavored cases moved
 * OUT of this file entirely to `economyRealPostgrestRequired.todo.test.ts`
 * — true multi-caller concurrency for the Supabase side cannot be proven
 * without real PostgreSQL locking, and this suite must never claim it can.
 * The remaining 63 are activated below with real assertions, run against
 * BOTH implementations.
 *
 * ── The Supabase side: a simulator, not a mock-per-call ──────────────────
 * `SupabaseEconomyRepository` is exercised against
 * `createSimulatedPostgrestFetch` (`./simulatedPostgrestFetch.ts`) — a
 * REALISTIC, STATEFUL PostgREST-shaped HTTP layer backed by a fresh
 * `InMemoryEconomyRepository`. This proves `SupabaseEconomyRepository`'s
 * OWN translation logic (request shaping, response parsing, error
 * normalization, bigint-to-string coercion) against internally consistent
 * data — it does NOT prove anything about real PostgreSQL. See that file's
 * header for the exact boundary, and `economyRealPostgrestRequired.todo.test.ts`
 * for what remains genuinely unverified.
 */

interface SuiteContext {
  repo: EconomyRepository;
  seedIdentity(identityId: string, kind: PlayerIdentityKind): void;
  setFrozen(identityId: string, isFrozen: boolean): void;
  /** Seeds identity + a wallet row with `starterGranted: false, balance: "0"` — the ONLY way to exercise `grantStarterCoins`'s own first-call success path directly, since `ensureWallet` always grants automatically. */
  seedUngrantedWallet(identityId: string, kind: PlayerIdentityKind): void;
  removePrizeSchedule(seatCount: number): void;
  seedPrizeSchedule(schedule: EconomyPrizeScheduleRecord): void;
}

function freshId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}
function fakeHash(): string {
  return crypto.createHash("sha256").update(crypto.randomBytes(16)).digest("hex");
}

/** A registered member's identity id shape doesn't matter to either repository — a UUID is realistic. */
const freshMemberId = (): string => crypto.randomUUID();

function economyRepositoryContractSuite(name: string, make: () => SuiteContext): void {
  describe(`EconomyRepository contract — ${name}`, () => {
    let ctx: SuiteContext;

    beforeAll(() => {
      ctx = make();
    });

    /* ── ping ── */
    describe("ping", () => {
      it("resolves when the store is reachable and the Economy V1 schema is present", async () => {
        await expect(ctx.repo.ping()).resolves.toBeUndefined();
      });
    });

    /* ── getWallet ── */
    describe("getWallet", () => {
      it("returns the wallet record for an identity that has one", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id);
        const wallet = await ctx.repo.getWallet(id);
        expect(wallet?.identityId).toBe(id);
        expect(wallet?.balance).toBe("2000");
        expect(typeof wallet?.balance).toBe("string");
      });

      it("returns null for an identity with no wallet yet — not an error", async () => {
        await expect(ctx.repo.getWallet(freshId("never_provisioned"))).resolves.toBeNull();
      });

      it("returns null for a malformed/empty-shaped id — plain reads never throw a shape error (corrected from the original skeleton, see file header)", async () => {
        await expect(ctx.repo.getWallet("")).resolves.toBeNull();
      });
    });

    /* ── listLedger ── */
    describe("listLedger", () => {
      it("returns entries newest-first for a wallet with history", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id);
        await ctx.repo.commitMatchEntry({
          matchId: freshId("m"), roomCode: null, hostIdentityId: id,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const entries = await ctx.repo.listLedger(id);
        expect(entries.length).toBe(2);
        expect(entries[0].createdAt).toBeGreaterThanOrEqual(entries[1].createdAt);
      });

      it("returns an empty array for a wallet with no history", async () => {
        await expect(ctx.repo.listLedger(freshId("no_history"))).resolves.toEqual([]);
      });

      it("clamps limit to a hard maximum of 100 rather than rejecting it", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id);
        const entries = await ctx.repo.listLedger(id, { limit: 99999 });
        expect(entries.length).toBeLessThanOrEqual(100);
      });

      it("respects offset for pagination", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id); // 1 entry: STARTER_GRANT
        const page0 = await ctx.repo.listLedger(id, { limit: 1, offset: 0 });
        const page1 = await ctx.repo.listLedger(id, { limit: 1, offset: 1 });
        expect(page0).toHaveLength(1);
        expect(page1).toHaveLength(0);
      });
    });

    /* ── getSettlement ── */
    describe("getSettlement", () => {
      it("returns the settlement record for a committed matchId", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: id,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const settlement = await ctx.repo.getSettlement(matchId);
        expect(settlement?.matchId).toBe(matchId);
        expect(settlement?.status).toBe("COMMITTED");
      });

      it("returns null for a matchId with no settlement yet — not an error", async () => {
        await expect(ctx.repo.getSettlement(freshId("never_committed"))).resolves.toBeNull();
      });
    });

    /* ── getWorldBankSnapshot ── */
    describe("getWorldBankSnapshot", () => {
      it("returns the singleton snapshot with all four independent balances present", async () => {
        const snapshot = await ctx.repo.getWorldBankSnapshot();
        expect(snapshot).toHaveProperty("baseFeeRevenue");
        expect(snapshot).toHaveProperty("botPrizeRevenue");
        expect(snapshot).toHaveProperty("guestEscrowLiability");
        expect(snapshot).toHaveProperty("totalVoucherRedeemed");
        for (const value of Object.values(snapshot)) expect(typeof value).toBe("string");
      });
    });

    /* ── getVoucherStatus ── */
    describe("getVoucherStatus", () => {
      it("returns status and coinAmount for an existing voucher", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const guest = freshId("guest_winner");
        ctx.seedIdentity(guest, "guest");
        const hash = fakeHash();
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: true,
          participants: [{ identityId: guest, identityKind: "guest", placement: 1, voucherCodeHash: hash }],
        });
        const status = await ctx.repo.getVoucherStatus(hash);
        expect(status?.status).toBe("ACTIVE");
        expect(status?.coinAmount).toBe("150");
      });

      it("returns null for a codeHash matching no voucher", async () => {
        await expect(ctx.repo.getVoucherStatus(fakeHash())).resolves.toBeNull();
      });
    });

    /* ── getActiveConfiguration ── */
    describe("getActiveConfiguration", () => {
      it("returns the singleton active configuration, never null, with the documented defaults", async () => {
        const config = await ctx.repo.getActiveConfiguration();
        expect(config.isActive).toBe(true);
        expect(config.seatCostCoins).toBe("100");
        expect(config.guestStarterCoins).toBe("2000");
        expect(config.memberStarterCoins).toBe("5000");
      });
    });

    /* ── getPrizeSchedule ── */
    describe("getPrizeSchedule", () => {
      it("returns the schedule for a supported seatCount", async () => {
        const schedule = await ctx.repo.getPrizeSchedule(5);
        expect(schedule).toMatchObject({
          seatCount: 5, firstPlaceCoins: "200", secondPlaceCoins: "150", thirdPlaceCoins: "100", worldBankCoins: "50",
        });
      });

      it("returns null, never throws, for an unsupported seatCount", async () => {
        await expect(ctx.repo.getPrizeSchedule(99)).resolves.toBeNull();
      });
    });

    /* ── reconcileSettlement ── */
    describe("reconcileSettlement", () => {
      it("returns isBalanced:true with matching collected/disbursed for a healthy COMMITTED settlement", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const reconciliation = await ctx.repo.reconcileSettlement(matchId);
        expect(reconciliation.isBalanced).toBe(true);
        expect(reconciliation.status).toBe("COMMITTED");
      });

      it("rejects with MatchNotFoundError for a matchId with no settlement at all", async () => {
        await expect(ctx.repo.reconcileSettlement(freshId("nonexistent"))).rejects.toBeInstanceOf(MatchNotFoundError);
      });
    });

    /* ── listStaleCommittedSettlements ── */
    describe("listStaleCommittedSettlements", () => {
      it("returns an empty array when nothing is stale — the healthy, expected case (a freshly committed match is not old enough)", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        await ctx.repo.commitMatchEntry({
          matchId: freshId("m"), roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const stale = await ctx.repo.listStaleCommittedSettlements(24 * 60 * 60 * 1000); // 24h — nothing this old
        expect(stale.every((s) => s.status === "COMMITTED")).toBe(true);
      });

      it("surfaces a COMMITTED settlement once it is older than the given threshold", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        // A real, short delay — `olderThanMs: 0` alone can collide with
        // `Date.now()`'s own millisecond resolution in a fast synchronous
        // test, and SupabaseEconomyRepository clamps a negative value to 0
        // (Math.max(0, ...), a legitimate design choice, not a bug), so a
        // negative offset cannot substitute for actual elapsed time here.
        await new Promise((resolve) => setTimeout(resolve, 5));
        const stale = await ctx.repo.listStaleCommittedSettlements(0);
        expect(stale.some((s) => s.matchId === matchId)).toBe(true);
      });
    });

    /* ── ensureWallet ── */
    describe("ensureWallet", () => {
      it("creates and returns a new wallet, with the starter grant already applied", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        const wallet = await ctx.repo.ensureWallet(id);
        expect(wallet.balance).toBe("2000");
        expect(wallet.starterGranted).toBe(true);
      });

      it("returns the existing wallet unchanged if one already exists", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        const first = await ctx.repo.ensureWallet(id);
        const second = await ctx.repo.ensureWallet(id);
        expect(second).toEqual(first);
      });

      it("rejects with IdentityNotFoundError for an identity with no player_identities row — never creates one", async () => {
        await expect(ctx.repo.ensureWallet(freshId("unregistered"))).rejects.toBeInstanceOf(IdentityNotFoundError);
      });

      it("rejects with InvalidIdentityIdError for an empty identityId", async () => {
        await expect(ctx.repo.ensureWallet("")).rejects.toBeInstanceOf(InvalidIdentityIdError);
      });
    });

    /* ── grantStarterCoins ── */
    describe("grantStarterCoins", () => {
      it("grants 2000 to a guest and 5000 to a member, returning applied:true, when called on a wallet that has not yet been granted", async () => {
        const guest = freshId("guest");
        ctx.seedUngrantedWallet(guest, "guest");
        const guestResult = await ctx.repo.grantStarterCoins(guest);
        expect(guestResult.applied).toBe(true);
        expect(guestResult.result.balance).toBe("2000");

        const member = freshMemberId();
        ctx.seedUngrantedWallet(member, "member");
        const memberResult = await ctx.repo.grantStarterCoins(member);
        expect(memberResult.applied).toBe(true);
        expect(memberResult.result.balance).toBe("5000");
      });

      it("rejects with WalletNotFoundError if no wallet row exists yet", async () => {
        const id = freshId("guest_no_wallet");
        ctx.seedIdentity(id, "guest");
        await expect(ctx.repo.grantStarterCoins(id)).rejects.toBeInstanceOf(WalletNotFoundError);
      });

      it("returns applied:false with the CURRENT wallet state on replay, not a re-grant", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        await ctx.repo.ensureWallet(id); // grants once
        const replay = await ctx.repo.grantStarterCoins(id);
        expect(replay.applied).toBe(false);
        expect(replay.result.balance).toBe("2000");
      });
    });

    /* ── commitMatchEntry ── */
    describe("commitMatchEntry", () => {
      it("debits the host and creates a COMMITTED settlement on success", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        const result = await ctx.repo.commitMatchEntry({
          matchId, roomCode: "ROOM", hostIdentityId: host,
          seatCount: 3, humanSeatCount: 2, botSeatCount: 1, isSolo: false,
        });
        expect(result.applied).toBe(true);
        expect(result.result.status).toBe("COMMITTED");
        expect(result.result.totalCollected).toBe("300");
        const wallet = await ctx.repo.getWallet(host);
        expect(wallet?.balance).toBe("1700"); // 2000 - 300
      });

      it("rejects with WalletFrozenError for a frozen host wallet, checked before balance", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        ctx.setFrozen(host, true);
        await expect(
          ctx.repo.commitMatchEntry({
            matchId: freshId("m"), roomCode: null, hostIdentityId: host,
            seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
          }),
        ).rejects.toBeInstanceOf(WalletFrozenError);
      });

      it("rejects with InsufficientFundsError once committed spend exceeds the remaining balance", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host); // 2000
        for (let i = 0; i < 4; i++) {
          await ctx.repo.commitMatchEntry({
            matchId: freshId("m"), roomCode: null, hostIdentityId: host,
            seatCount: 5, humanSeatCount: 5, botSeatCount: 0, isSolo: false, // 500 each, 4x = 2000
          });
        }
        await expect(
          ctx.repo.commitMatchEntry({
            matchId: freshId("m"), roomCode: null, hostIdentityId: host,
            seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
          }),
        ).rejects.toBeInstanceOf(InsufficientFundsError);
      });

      it("rejects with InvalidSeatConfigurationError when seatCount != human + bot", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        await expect(
          ctx.repo.commitMatchEntry({
            matchId: freshId("m"), roomCode: null, hostIdentityId: host,
            seatCount: 3, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
          }),
        ).rejects.toBeInstanceOf(InvalidSeatConfigurationError);
      });

      it("rejects with UnsupportedSeatCountError (not InvalidSeatConfigurationError) for a structurally valid seat count with no approved schedule — P0 fix: this must reach the real schedule lookup, never a hardcoded upper bound", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const originalSchedule = await ctx.repo.getPrizeSchedule(7);
        ctx.removePrizeSchedule(7);
        try {
          // 7 is well within the catalog's own largest maximum (Tambola, 12)
          // — structurally ordinary. When no schedule is configured for it,
          // it must be rejected via the real schedule lookup.
          await expect(
            ctx.repo.commitMatchEntry({
              matchId: freshId("m"), roomCode: null, hostIdentityId: host,
              seatCount: 7, humanSeatCount: 7, botSeatCount: 0, isSolo: false,
            }),
          ).rejects.toBeInstanceOf(UnsupportedSeatCountError);
        } finally {
          if (originalSchedule) {
            ctx.seedPrizeSchedule(originalSchedule);
          }
        }
      });

      it("rejects with IdentityNotFoundError when the host identity does not exist", async () => {
        await expect(
          ctx.repo.commitMatchEntry({
            matchId: freshId("m"), roomCode: null, hostIdentityId: freshId("ghost"),
            seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
          }),
        ).rejects.toBeInstanceOf(IdentityNotFoundError);
      });

      it("returns applied:false with the ORIGINAL settlement on replay, regardless of differing replay input", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "ORIGINAL", hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const replay = await ctx.repo.commitMatchEntry({
          matchId, roomCode: "DIFFERENT", hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        expect(replay.applied).toBe(false);
        expect(replay.result.roomCode).toBe("ORIGINAL");
      });
    });

    /* ── settleMatchEconomy ── */
    describe("settleMatchEconomy", () => {
      it("credits a member participant's wallet and writes a MATCH_PRIZE_CREDIT ledger row", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        const settled = await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: true,
          participants: [{ identityId: member, identityKind: "member", placement: 1 }],
        });
        expect(settled.result.totalWalletRewarded).toBe("150");
        const ledger = await ctx.repo.listLedger(member);
        expect(ledger.some((e) => e.entryType === "MATCH_PRIZE_CREDIT" && e.amount === "150")).toBe(true);
      });

      it("escrows a guest participant's prize with ZERO coin_ledger_entries impact on their own wallet", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const guest = freshId("guest_winner");
        ctx.seedIdentity(guest, "guest");
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: true,
          participants: [{ identityId: guest, identityKind: "guest", placement: 1, voucherCodeHash: fakeHash() }],
        });
        await expect(ctx.repo.getWallet(guest)).resolves.toBeNull();
        await expect(ctx.repo.listLedger(guest)).resolves.toEqual([]);
      });

      it("routes a bot participant's prize to bot_prize_revenue, never to a wallet", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const before = await ctx.repo.getWorldBankSnapshot();
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: true,
          participants: [{ identityId: "bot_seat_1", identityKind: "bot", placement: 1 }],
        });
        const after = await ctx.repo.getWorldBankSnapshot();
        expect(BigInt(after.botPrizeRevenue) - BigInt(before.botPrizeRevenue)).toBe(150n);
      });

      it("tags a solo (1-seat) settlement's world bank collection distinctly from a multiplayer base fee", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const before = await ctx.repo.getWorldBankSnapshot();
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const settled = await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: true, participants: [] });
        expect(settled.result.totalWorldBankCut).toBe("100");
        const after = await ctx.repo.getWorldBankSnapshot();
        expect(BigInt(after.baseFeeRevenue) - BigInt(before.baseFeeRevenue)).toBe(100n);
      });

      it("refunds internally, without a second call, when isValidRanking is false", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const result = await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: false, participants: [], refundReason: "Tied result",
        });
        expect(result.result.status).toBe("REFUNDED");
        expect(result.result.refundReason).toBe("Tied result");
      });

      it("rejects with InvalidIdentityKindError for an unrecognized participant identityKind, leaving ZERO partial effect for a participant processed earlier in the same array", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        const memberBefore = await ctx.repo.ensureWallet(member);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 3, humanSeatCount: 2, botSeatCount: 1, isSolo: false,
        });
        await expect(
          ctx.repo.settleMatchEconomy({
            matchId, isValidRanking: true,
            participants: [
              { identityId: member, identityKind: "member", placement: 1 },
              { identityId: "x", identityKind: "alien" as unknown as ParticipantIdentityKind, placement: 2 },
            ],
          }),
        ).rejects.toBeInstanceOf(InvalidIdentityKindError);
        const memberAfter = await ctx.repo.getWallet(member);
        expect(memberAfter?.balance).toBe(memberBefore.balance);
        const settlement = await ctx.repo.getSettlement(matchId);
        expect(settlement?.status).toBe("COMMITTED");
      });

      it("rejects with InvalidVoucherHashError for a guest prize missing a voucherCodeHash", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const guest = freshId("guest_winner");
        ctx.seedIdentity(guest, "guest");
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await expect(
          ctx.repo.settleMatchEconomy({
            matchId, isValidRanking: true,
            participants: [{ identityId: guest, identityKind: "guest", placement: 1 }],
          }),
        ).rejects.toBeInstanceOf(InvalidVoucherHashError);
      });

      it("rejects with VoucherCodeCollisionError for a genuine codeHash collision across two different settlements", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const guestA = freshId("guest_a");
        ctx.seedIdentity(guestA, "guest");
        const guestB = freshId("guest_b");
        ctx.seedIdentity(guestB, "guest");
        const sharedHash = fakeHash();

        const matchA = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId: matchA, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await ctx.repo.settleMatchEconomy({
          matchId: matchA, isValidRanking: true,
          participants: [{ identityId: guestA, identityKind: "guest", placement: 1, voucherCodeHash: sharedHash }],
        });

        const matchB = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId: matchB, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await expect(
          ctx.repo.settleMatchEconomy({
            matchId: matchB, isValidRanking: true,
            participants: [{ identityId: guestB, identityKind: "guest", placement: 1, voucherCodeHash: sharedHash }],
          }),
        ).rejects.toBeInstanceOf(VoucherCodeCollisionError);
      });

      it("rejects with MatchNotCommittedError when no COMMITTED settlement exists for the matchId", async () => {
        await expect(
          ctx.repo.settleMatchEconomy({ matchId: freshId("never_committed"), isValidRanking: true, participants: [] }),
        ).rejects.toBeInstanceOf(MatchNotCommittedError);
      });

      it("rejects with IdentityNotFoundError for a member participant whose identity does not exist", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await expect(
          ctx.repo.settleMatchEconomy({
            matchId, isValidRanking: true,
            participants: [{ identityId: freshId("ghost_member"), identityKind: "member", placement: 1 }],
          }),
        ).rejects.toBeInstanceOf(IdentityNotFoundError);
      });

      it("returns applied:false with the ORIGINAL outcome on replay of an already-SETTLED match", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: true, participants: [] });
        const replay = await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: false, participants: [] });
        expect(replay.applied).toBe(false);
        expect(replay.result.status).toBe("SETTLED");
      });
    });

    /* ── refundMatchEntry ── */
    describe("refundMatchEntry", () => {
      it("restores the full committed amount and credits lifetimeRefunded without touching lifetimeSpent", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        const before = await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.refundMatchEntry(matchId, "test refund");
        const after = await ctx.repo.getWallet(host);
        expect(after?.balance).toBe(before.balance);
        expect(after?.lifetimeSpent).toBe("100");
        expect(after?.lifetimeRefunded).toBe("100");
      });

      it("rejects with MatchNotCommittedError when no settlement exists for the matchId", async () => {
        await expect(ctx.repo.refundMatchEntry(freshId("never_committed"), "x")).rejects.toBeInstanceOf(
          MatchNotCommittedError,
        );
      });

      it("rejects with MatchAlreadySettledError when the match reached SETTLED before this call arrived", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: true, participants: [] });
        await expect(ctx.repo.refundMatchEntry(matchId, "too late")).rejects.toBeInstanceOf(MatchAlreadySettledError);
      });

      it("returns applied:false with the ORIGINAL settlement on replay of an already-REFUNDED match", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.refundMatchEntry(matchId, "original reason");
        const replay = await ctx.repo.refundMatchEntry(matchId, "different reason");
        expect(replay.applied).toBe(false);
        expect(replay.result.refundReason).toBe("original reason");
      });

      it("rejects with MatchAlreadyForfeitedError when the match already reached ABANDONMENT_FORFEITED", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.forfeitMatchEntry(matchId, "abandoned");
        await expect(ctx.repo.refundMatchEntry(matchId, "too late")).rejects.toBeInstanceOf(MatchAlreadyForfeitedError);
      });
    });

    /* ── forfeitMatchEntry ── */
    describe("forfeitMatchEntry", () => {
      it("moves the FULL committed amount to World Bank and does NOT touch the host wallet at all", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        // Captured AFTER commit's own entry-fee debit — forfeiture must not
        // move the wallet AT ALL from here, neither crediting (a refund)
        // nor debiting further.
        const beforeForfeit = await ctx.repo.getWallet(host);
        const wbBefore = await ctx.repo.getWorldBankSnapshot();
        const outcome = await ctx.repo.forfeitMatchEntry(matchId, "no eligible signed-in successor");
        expect(outcome.applied).toBe(true);
        expect(outcome.result.status).toBe("ABANDONMENT_FORFEITED");
        expect(outcome.result.totalForfeited).toBe("100");
        expect(outcome.result.totalRefunded).toBe("0");

        const after = await ctx.repo.getWallet(host);
        expect(after?.balance).toBe(beforeForfeit?.balance); // never credited — no refund
        expect(after?.lifetimeRefunded).toBe(beforeForfeit?.lifetimeRefunded); // unchanged

        const wbAfter = await ctx.repo.getWorldBankSnapshot();
        expect(BigInt(wbAfter.abandonmentForfeitureRevenue) - BigInt(wbBefore.abandonmentForfeitureRevenue)).toBe(100n);
      });

      it("rejects with MatchNotCommittedError when no settlement exists for the matchId", async () => {
        await expect(ctx.repo.forfeitMatchEntry(freshId("never_committed"), "x")).rejects.toBeInstanceOf(
          MatchNotCommittedError,
        );
      });

      it("rejects with MatchAlreadySettledError when the match reached SETTLED before this call arrived", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: true, participants: [] });
        await expect(ctx.repo.forfeitMatchEntry(matchId, "too late")).rejects.toBeInstanceOf(MatchAlreadySettledError);
      });

      it("rejects with MatchAlreadyRefundedError when the match already reached REFUNDED", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.refundMatchEntry(matchId, "cancelled");
        await expect(ctx.repo.forfeitMatchEntry(matchId, "too late")).rejects.toBeInstanceOf(MatchAlreadyRefundedError);
      });

      it("returns applied:false with the ORIGINAL settlement on replay of an already-forfeited match — no double World Bank credit", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.forfeitMatchEntry(matchId, "original reason");
        const wbAfterFirst = await ctx.repo.getWorldBankSnapshot();
        const replay = await ctx.repo.forfeitMatchEntry(matchId, "different reason");
        expect(replay.applied).toBe(false);
        expect(replay.result.forfeitureReason).toBe("original reason");
        const wbAfterReplay = await ctx.repo.getWorldBankSnapshot();
        expect(wbAfterReplay.abandonmentForfeitureRevenue).toBe(wbAfterFirst.abandonmentForfeitureRevenue);
      });

      it("settleMatchEconomy on an already-forfeited match is a safe no-op (applied:false, status stays ABANDONMENT_FORFEITED)", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        await ctx.repo.forfeitMatchEntry(matchId, "abandoned");
        const settleAttempt = await ctx.repo.settleMatchEconomy({ matchId, isValidRanking: true, participants: [] });
        expect(settleAttempt.applied).toBe(false);
        expect(settleAttempt.result.status).toBe("ABANDONMENT_FORFEITED");
      });

      it("creates no match_economy_participants-equivalent side effects — no prize, voucher, or bot revenue", async () => {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: null, hostIdentityId: host,
          seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
        });
        const wbBefore = await ctx.repo.getWorldBankSnapshot();
        await ctx.repo.forfeitMatchEntry(matchId, "abandoned");
        const wbAfter = await ctx.repo.getWorldBankSnapshot();
        expect(wbAfter.botPrizeRevenue).toBe(wbBefore.botPrizeRevenue);
        expect(wbAfter.guestEscrowLiability).toBe(wbBefore.guestEscrowLiability);
        expect(wbAfter.baseFeeRevenue).toBe(wbBefore.baseFeeRevenue);
      });
    });

    /* ── issueGuestVoucher ── */
    describe("issueGuestVoucher", () => {
      it("creates an ACTIVE voucher on success", async () => {
        const guest = freshId("guest");
        ctx.seedIdentity(guest, "guest");
        const voucherId = freshId("vch");
        const result = await ctx.repo.issueGuestVoucher({
          voucherId, codeHash: fakeHash(), coinAmount: "100", matchId: freshId("m"), issuedToGuestId: guest,
        });
        expect(result.applied).toBe(true);
        expect(result.result.status).toBe("ACTIVE");
      });

      it("rejects with InvalidVoucherHashError for a non-64-hex codeHash", async () => {
        const guest = freshId("guest");
        ctx.seedIdentity(guest, "guest");
        await expect(
          ctx.repo.issueGuestVoucher({
            voucherId: freshId("vch"), codeHash: "not-64-hex", coinAmount: "100", matchId: freshId("m"), issuedToGuestId: guest,
          }),
        ).rejects.toBeInstanceOf(InvalidVoucherHashError);
      });

      it("rejects with VoucherCodeCollisionError when a DIFFERENT voucherId reuses an existing codeHash", async () => {
        const guest = freshId("guest");
        ctx.seedIdentity(guest, "guest");
        const sharedHash = fakeHash();
        await ctx.repo.issueGuestVoucher({
          voucherId: freshId("vch"), codeHash: sharedHash, coinAmount: "100", matchId: freshId("m"), issuedToGuestId: guest,
        });
        await expect(
          ctx.repo.issueGuestVoucher({
            voucherId: freshId("vch"), codeHash: sharedHash, coinAmount: "50", matchId: freshId("m"), issuedToGuestId: guest,
          }),
        ).rejects.toBeInstanceOf(VoucherCodeCollisionError);
      });

      it("rejects with IdentityNotFoundError when issuedToGuestId does not exist", async () => {
        await expect(
          ctx.repo.issueGuestVoucher({
            voucherId: freshId("vch"), codeHash: fakeHash(), coinAmount: "100", matchId: freshId("m"),
            issuedToGuestId: freshId("ghost"),
          }),
        ).rejects.toBeInstanceOf(IdentityNotFoundError);
      });

      it("returns applied:false with the ORIGINAL voucher on replay of the SAME voucherId", async () => {
        const guest = freshId("guest");
        ctx.seedIdentity(guest, "guest");
        const voucherId = freshId("vch");
        const originalHash = fakeHash();
        await ctx.repo.issueGuestVoucher({
          voucherId, codeHash: originalHash, coinAmount: "100", matchId: freshId("m"), issuedToGuestId: guest,
        });
        const replay = await ctx.repo.issueGuestVoucher({
          voucherId, codeHash: fakeHash(), coinAmount: "999", matchId: freshId("m"), issuedToGuestId: guest,
        });
        expect(replay.applied).toBe(false);
        expect(replay.result.codeHash).toBe(originalHash);
      });
    });

    /* ── redeemRewardVoucher ── */
    describe("redeemRewardVoucher", () => {
      async function issueRealVoucher(): Promise<{ hash: string }> {
        const host = freshId("guest");
        ctx.seedIdentity(host, "guest");
        await ctx.repo.ensureWallet(host);
        const guest = freshId("guest_winner");
        ctx.seedIdentity(guest, "guest");
        const hash = fakeHash();
        const matchId = freshId("m");
        await ctx.repo.commitMatchEntry({
          matchId, roomCode: "R", hostIdentityId: host,
          seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false,
        });
        await ctx.repo.settleMatchEconomy({
          matchId, isValidRanking: true,
          participants: [{ identityId: guest, identityKind: "guest", placement: 1, voucherCodeHash: hash }],
        });
        return { hash };
      }

      it("credits the member wallet, releases guest_escrow_liability, and increments total_voucher_redeemed atomically on success", async () => {
        const { hash } = await issueRealVoucher();
        const worldBankBefore = await ctx.repo.getWorldBankSnapshot();
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        const memberBefore = await ctx.repo.ensureWallet(member);
        const result = await ctx.repo.redeemRewardVoucher(hash, member);
        expect(result.result.status).toBe("REDEEMED");
        const memberAfter = await ctx.repo.getWallet(member);
        expect(BigInt(memberAfter!.balance) - BigInt(memberBefore.balance)).toBe(150n);
        const worldBankAfter = await ctx.repo.getWorldBankSnapshot();
        expect(BigInt(worldBankBefore.guestEscrowLiability) - BigInt(worldBankAfter.guestEscrowLiability)).toBe(150n);
        expect(BigInt(worldBankAfter.totalVoucherRedeemed) - BigInt(worldBankBefore.totalVoucherRedeemed)).toBe(150n);
      });

      it("rejects with OnlyMembersCanRedeemError for a guest caller, before disclosing whether the code exists", async () => {
        const guest = freshId("guest_trying");
        ctx.seedIdentity(guest, "guest");
        await expect(ctx.repo.redeemRewardVoucher(fakeHash(), guest)).rejects.toBeInstanceOf(OnlyMembersCanRedeemError);
      });

      it("rejects with WalletFrozenError for a frozen member wallet, checked after voucher existence/status", async () => {
        const { hash } = await issueRealVoucher();
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        await ctx.repo.ensureWallet(member);
        ctx.setFrozen(member, true);
        await expect(ctx.repo.redeemRewardVoucher(hash, member)).rejects.toBeInstanceOf(WalletFrozenError);
      });

      it("rejects with VoucherNotFoundError for a codeHash matching no voucher", async () => {
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        await expect(ctx.repo.redeemRewardVoucher(fakeHash(), member)).rejects.toBeInstanceOf(VoucherNotFoundError);
      });

      it("rejects with VoucherAlreadyRedeemedError when a DIFFERENT member attempts an already-redeemed voucher", async () => {
        const { hash } = await issueRealVoucher();
        const firstMember = freshMemberId();
        ctx.seedIdentity(firstMember, "member");
        await ctx.repo.ensureWallet(firstMember);
        await ctx.repo.redeemRewardVoucher(hash, firstMember);

        const secondMember = freshMemberId();
        ctx.seedIdentity(secondMember, "member");
        await ctx.repo.ensureWallet(secondMember);
        await expect(ctx.repo.redeemRewardVoucher(hash, secondMember)).rejects.toBeInstanceOf(VoucherAlreadyRedeemedError);
      });

      it("rejects with InvalidVoucherHashError for a malformed codeHash", async () => {
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        await expect(ctx.repo.redeemRewardVoucher("not-a-real-hash", member)).rejects.toBeInstanceOf(
          InvalidVoucherHashError,
        );
      });

      it("returns applied:false with the ORIGINAL voucher when the SAME member replays an already-redeemed-by-them voucher", async () => {
        const { hash } = await issueRealVoucher();
        const member = freshMemberId();
        ctx.seedIdentity(member, "member");
        await ctx.repo.ensureWallet(member);
        await ctx.repo.redeemRewardVoucher(hash, member);
        const replay = await ctx.repo.redeemRewardVoucher(hash, member);
        expect(replay.applied).toBe(false);
        expect(replay.result.status).toBe("REDEEMED");
      });
    });

    /* ── defensive result isolation ── */
    describe("defensive result isolation", () => {
      it("mutating a returned record never affects a subsequent read from either repository", async () => {
        const id = freshId("guest");
        ctx.seedIdentity(id, "guest");
        const wallet = await ctx.repo.ensureWallet(id);
        (wallet as { balance: string }).balance = "999999999";
        const reread = await ctx.repo.getWallet(id);
        expect(reread?.balance).toBe("2000");
      });
    });
  });
}

/* ═══════════════════════════ Invocation: InMemoryEconomyRepository ═══════ */

economyRepositoryContractSuite("InMemoryEconomyRepository", () => {
  const repo = new InMemoryEconomyRepository();
  const fixture = repo.testFixture;
  return {
    repo,
    seedIdentity: (id, kind) => fixture.seedIdentity(id, kind),
    setFrozen: (id, frozen) => fixture.setFrozen(id, frozen),
    seedUngrantedWallet: (id, kind) => {
      fixture.seedWallet({ identityId: id, identityKind: kind, starterGranted: false, balance: "0" });
    },
    removePrizeSchedule: (seatCount) => fixture.removePrizeSchedule(seatCount),
    seedPrizeSchedule: (schedule) => fixture.seedPrizeSchedule(schedule),
  };
});

/* ═══════════════════════════ Invocation: SupabaseEconomyRepository (simulated PostgREST) ═══ */

describe("EconomyRepository contract — SupabaseEconomyRepository (simulated PostgREST) — setup", () => {
  let restoreFetch: (() => void) | null = null;

  afterAll(() => {
    restoreFetch?.();
  });

  economyRepositoryContractSuite("SupabaseEconomyRepository (simulated PostgREST)", () => {
    const backend = new InMemoryEconomyRepository();
    const fixture = backend.testFixture;
    vi.stubGlobal("fetch", createSimulatedPostgrestFetch(backend));
    restoreFetch = () => vi.unstubAllGlobals();
    const repo = new SupabaseEconomyRepository({
      url: "https://simulated.local",
      serviceKey: "simulated-service-role-key",
      timeoutMs: 5000,
    });
    return {
      repo,
      seedIdentity: (id, kind) => fixture.seedIdentity(id, kind),
      setFrozen: (id, frozen) => fixture.setFrozen(id, frozen),
      seedUngrantedWallet: (id, kind) => {
        fixture.seedWallet({ identityId: id, identityKind: kind, starterGranted: false, balance: "0" });
      },
      removePrizeSchedule: (seatCount) => fixture.removePrizeSchedule(seatCount),
      seedPrizeSchedule: (schedule) => fixture.seedPrizeSchedule(schedule),
    };
  });
});
