import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SupabaseEconomyRepository } from "../SupabaseEconomyRepository.js";
import {
  EconomyInfrastructureError,
  InvalidVoucherHashError,
  VoucherCodeCollisionError,
  WalletFrozenError,
  IdentityNotFoundError,
} from "../EconomyRepository.js";

/**
 * Focused Phase 3 tests, extended in Phase 4 with one transport-level
 * concurrency test (see the "concurrency classification" block below). NOT
 * the shared contract suite (`economyRepositoryContract.test.ts`, activated
 * in Phase 4 and run against both implementations). This environment has no
 * Docker/PostgREST available (confirmed during the local-migration-trial
 * phase of this project), so there is no real Supabase stack to test
 * against here. These tests stub the global `fetch` that `PostgrestClient`
 * (and therefore this repository) actually calls — exercising the REAL
 * request-construction and response-mapping code in
 * `SupabaseEconomyRepository.ts`, with only the network boundary replaced,
 * which is the correct place to stub given PostgREST itself is unavailable
 * rather than merely inconvenient here.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function pgrestError(message: string): Response {
  // The real shape PostgREST returns for a `raise exception` inside an RPC.
  return jsonResponse(400, { code: "P0001", details: null, hint: null, message });
}

const CONFIG = { url: "https://example.supabase.co", serviceKey: "test-service-role-key", timeoutMs: 5000 };

describe("SupabaseEconomyRepository", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("request construction", () => {
    it("getWallet issues a GET against coin_wallets_safe (the bigint-text view, not the raw table) filtered by identity_id", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
      const repo = new SupabaseEconomyRepository(CONFIG);
      await repo.getWallet("guest_abc");

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://example.supabase.co/rest/v1/coin_wallets_safe?identity_id=eq.guest_abc&limit=1",
      );
      expect(init.method).toBe("GET");
      expect((init.headers as Record<string, string>).apikey).toBe("test-service-role-key");
    });

    it("commitMatchEntry POSTs to rpc/commit_match_entry with snake_case parameter names", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m1",
          result: settlementRow({ match_id: "m1", status: "COMMITTED" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      await repo.commitMatchEntry({
        matchId: "m1",
        roomCode: "ROOM1",
        hostIdentityId: "guest_host",
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://example.supabase.co/rest/v1/rpc/commit_match_entry");
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        p_match_id: "m1",
        p_room_code: "ROOM1",
        p_host_identity_id: "guest_host",
        p_seat_count: 2,
        p_human_seat_count: 1,
        p_bot_seat_count: 1,
        p_is_solo: false,
      });
    });

    it("commitMatchEntry includes p_participant_debits when participantDebits is provided", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m2",
          result: settlementRow({ match_id: "m2" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const debits = [
        { identityId: "host_1", identityKind: "guest" as const, amountCoins: "100" },
        { identityId: "guest_2", identityKind: "guest" as const, amountCoins: "100" },
      ];
      await repo.commitMatchEntry({
        matchId: "m2",
        roomCode: "ROOM2",
        hostIdentityId: "host_1",
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
        participantDebits: debits,
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.p_participant_debits).toEqual(debits);
    });

    it("commitMatchEntry falls back to 7 parameters if database returns PGRST202", async () => {
      // First call fails with PGRST202 (function signature with p_participant_debits not found)
      fetchMock.mockResolvedValueOnce(
        jsonResponse(404, {
          code: "PGRST202",
          message: "Could not find the function public.commit_match_entry in schema cache",
        }),
      );
      // Fallback call succeeds
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m3",
          result: settlementRow({ match_id: "m3" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const debits = [
        { identityId: "host_1", identityKind: "guest" as const, amountCoins: "100" },
        { identityId: "guest_2", identityKind: "guest" as const, amountCoins: "100" },
      ];
      const res = await repo.commitMatchEntry({
        matchId: "m3",
        roomCode: "ROOM3",
        hostIdentityId: "host_1",
        seatCount: 2,
        humanSeatCount: 2,
        botSeatCount: 0,
        isSolo: false,
        participantDebits: debits,
      });

      expect(res.applied).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, initFallback] = fetchMock.mock.calls[1] as [string, RequestInit];
      const fallbackBody = JSON.parse(initFallback.body as string);
      expect(fallbackBody.p_participant_debits).toBeUndefined();
      expect(fallbackBody.p_seat_count).toBe(2);
    });

    it("settleMatchEconomy sends participants with camelCase keys UNCHANGED — the migration's jsonb_array_elements loop reads camelCase, not snake_case", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "settle_match_economy",
          idempotencyKey: "match-settlement:m1",
          result: settlementRow({ match_id: "m1", status: "SETTLED" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      await repo.settleMatchEconomy({
        matchId: "m1",
        isValidRanking: true,
        participants: [{ identityId: "p1", identityKind: "member", placement: 1 }],
      });

      const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.p_participants).toEqual([{ identityId: "p1", identityKind: "member", placement: 1 }]);
    });
  });

  describe("bigint transport handling — post-remediation (Phase 4 fix for the Phase 3 finding)", () => {
    it("accepts a proper bigint-safe decimal STRING from a table read and passes it through exactly", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            identity_id: "guest_x",
            identity_kind: "guest",
            balance: "1850", // the migration's coin_wallets_safe view casts every bigint column ::text
            version: 3,
            lifetime_granted: "2000",
            lifetime_earned: "150",
            lifetime_spent: "300",
            lifetime_refunded: "0",
            starter_granted: true,
            is_frozen: false,
            updated_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const wallet = await repo.getWallet("guest_x");

      expect(wallet?.balance).toBe("1850");
      expect(typeof wallet?.balance).toBe("string");
      expect(wallet?.lifetimeGranted).toBe("2000");
    });

    it("accepts a proper bigint-safe decimal STRING from a jsonb RPC result identically", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m2",
          result: settlementRow({ match_id: "m2", total_collected: "500", status: "COMMITTED" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const result = await repo.commitMatchEntry({
        matchId: "m2",
        roomCode: "R",
        hostIdentityId: "h",
        seatCount: 5,
        humanSeatCount: 5,
        botSeatCount: 0,
        isSolo: false,
      });

      expect(result.result.totalCollected).toBe("500");
      expect(typeof result.result.totalCollected).toBe("string");
    });

    it("REJECTS a bigint field arriving as a JS number — no longer silently converted, since precision may already be lost by the time it's a number", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            identity_id: "guest_regressed",
            identity_kind: "guest",
            balance: 1850, // simulates a transport regression: the pre-remediation raw table/bare to_jsonb path
            version: 3,
            lifetime_granted: "2000",
            lifetime_earned: "150",
            lifetime_spent: "300",
            lifetime_refunded: "0",
            starter_granted: true,
            is_frozen: false,
            updated_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      await expect(repo.getWallet("guest_regressed")).rejects.toBeInstanceOf(EconomyInfrastructureError);
    });

    it("REJECTS a malformed bigint string (decimal point, scientific notation, empty, non-digit garbage)", async () => {
      const repo = new SupabaseEconomyRepository(CONFIG);
      const malformedValues = ["1850.5", "1.85e3", "", "abc", "1,850", "+1850", "NaN", "Infinity"];
      for (const malformed of malformedValues) {
        fetchMock.mockResolvedValueOnce(
          jsonResponse(200, [
            {
              identity_id: "guest_malformed",
              identity_kind: "guest",
              balance: malformed,
              version: 1,
              lifetime_granted: "0",
              lifetime_earned: "0",
              lifetime_spent: "0",
              lifetime_refunded: "0",
              starter_granted: false,
              is_frozen: false,
              updated_at: "2026-08-26T10:00:00Z",
            },
          ]),
        );
        await expect(repo.getWallet("guest_malformed")).rejects.toBeInstanceOf(EconomyInfrastructureError);
      }
    });

    it("accepts a valid negative bigint string (a signed ledger amount) and a zero value exactly", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            id: 1,
            wallet_id: "guest_x",
            amount: "-500",
            balance_before: "2000",
            balance_after: "1500",
            wallet_version_before: 0,
            wallet_version_after: 1,
            entry_type: "SOLO_ENTRY_DEBIT",
            source_kind: "match",
            source_id: "m1",
            idempotency_key: "match-entry:m1",
            description: "test",
            created_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const [entry] = await repo.listLedger("guest_x");
      expect(entry.amount).toBe("-500");
      expect(BigInt(entry.balanceAfter) - BigInt(entry.balanceBefore)).toBe(-500n);
    });
  });

  describe("bigint boundary values — exact digit preservation (Step 6)", () => {
    // Raw JSON fixture bodies below use bigint values beyond 2^53
    // deliberately (Step 8) — if this repository (or a future refactor of
    // it) ever re-introduced `JSON.parse`-before-string-check behavior, a
    // value in this range is exactly what would silently corrupt, so a
    // digit-for-digit assertion here is a real regression guard, not a
    // formality.
    const BIGINT_MAX = "9223372036854775807";
    const BIGINT_MIN = "-9223372036854775808";
    const MAX_SAFE_PLUS_1 = "9007199254740992";

    it("preserves the exact PostgreSQL bigint maximum for a wallet balance, version, and lifetime counter simultaneously", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            identity_id: "guest_boundary",
            identity_kind: "guest",
            balance: BIGINT_MAX,
            version: BIGINT_MAX,
            lifetime_granted: BIGINT_MAX,
            lifetime_earned: "0",
            lifetime_spent: "0",
            lifetime_refunded: "0",
            starter_granted: true,
            is_frozen: false,
            updated_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const wallet = await repo.getWallet("guest_boundary");
      expect(wallet?.balance).toBe(BIGINT_MAX);
      expect(wallet?.version).toBe(BIGINT_MAX);
      expect(wallet?.lifetimeGranted).toBe(BIGINT_MAX);
    });

    it("preserves the exact PostgreSQL bigint minimum for a negative ledger amount", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            id: 1,
            wallet_id: "guest_boundary",
            amount: BIGINT_MIN,
            balance_before: BIGINT_MAX,
            balance_after: "-1", // arithmetic identity is not re-validated client-side; only exact-digit transport is under test here
            wallet_version_before: 0,
            wallet_version_after: 1,
            entry_type: "ADMIN_ADJUSTMENT",
            source_kind: "verify",
            source_id: "boundary",
            idempotency_key: "boundary-min",
            description: "boundary test",
            created_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const [entry] = await repo.listLedger("guest_boundary");
      expect(entry.amount).toBe(BIGINT_MIN);
    });

    it("preserves a value one above Number.MAX_SAFE_INTEGER exactly, through a jsonb RPC result", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: true,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m-boundary",
          result: settlementRow({ match_id: "m-boundary", total_collected: MAX_SAFE_PLUS_1, status: "COMMITTED" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const result = await repo.commitMatchEntry({
        matchId: "m-boundary",
        roomCode: "R",
        hostIdentityId: "h",
        seatCount: 5,
        humanSeatCount: 5,
        botSeatCount: 0,
        isSolo: false,
      });
      expect(result.result.totalCollected).toBe(MAX_SAFE_PLUS_1);
      expect(BigInt(result.result.totalCollected)).toBe(9007199254740992n);
    });

    it("preserves the exact bigint maximum for a World Bank treasury field", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, [
          {
            id: "primary",
            display_name: "BHALYAM World Bank Treasury",
            base_fee_revenue: BIGINT_MAX,
            bot_prize_revenue: "0",
            guest_escrow_liability: "0",
            total_voucher_redeemed: "0",
            abandonment_forfeiture_revenue: "0",
            created_at: "2026-08-26T10:00:00Z",
            updated_at: "2026-08-26T10:00:00Z",
          },
        ]),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const snapshot = await repo.getWorldBankSnapshot();
      expect(snapshot?.baseFeeRevenue).toBe(BIGINT_MAX);
    });
  });

  describe("applied:false pass-through", () => {
    it("returns a replay envelope verbatim — never thrown, never re-interpreted", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          applied: false,
          operation: "commit_match_entry",
          idempotencyKey: "match-entry:m3",
          result: settlementRow({ match_id: "m3", room_code: "ORIGINAL", status: "COMMITTED" }),
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      const result = await repo.commitMatchEntry({
        matchId: "m3",
        roomCode: "REPLAY_ATTEMPT_DIFFERENT_ROOM",
        hostIdentityId: "h",
        seatCount: 1,
        humanSeatCount: 1,
        botSeatCount: 0,
        isSolo: true,
      });

      expect(result.applied).toBe(false);
      expect(result.result.roomCode).toBe("ORIGINAL");
    });
  });

  describe("error normalization", () => {
    it("maps WALLET_FROZEN to WalletFrozenError, not a generic error", async () => {
      fetchMock.mockResolvedValueOnce(pgrestError("WALLET_FROZEN: host guest_x cannot commit a match entry while frozen"));
      const repo = new SupabaseEconomyRepository(CONFIG);
      await expect(
        repo.commitMatchEntry({
          matchId: "m4",
          roomCode: null,
          hostIdentityId: "guest_x",
          seatCount: 1,
          humanSeatCount: 1,
          botSeatCount: 0,
          isSolo: true,
        }),
      ).rejects.toBeInstanceOf(WalletFrozenError);
    });

    it("maps BOTH INVALID_VOUCHER_HASH and the redeem-specific VOUCHER_INVALID to the SAME InvalidVoucherHashError class", async () => {
      const repo = new SupabaseEconomyRepository(CONFIG);

      fetchMock.mockResolvedValueOnce(
        pgrestError("INVALID_VOUCHER_HASH: guest prize requires a 64-hex-character voucher code hash"),
      );
      await expect(
        repo.issueGuestVoucher({
          voucherId: "vch_1",
          codeHash: "not-a-real-hash",
          coinAmount: "100",
          matchId: "m5",
          issuedToGuestId: "guest_y",
        }),
      ).rejects.toBeInstanceOf(InvalidVoucherHashError);

      fetchMock.mockResolvedValueOnce(pgrestError("VOUCHER_INVALID: malformed code hash"));
      await expect(repo.redeemRewardVoucher("not-a-real-hash", "member_1")).rejects.toBeInstanceOf(
        InvalidVoucherHashError,
      );
    });

    it("maps a real unique-violation on the code_hash constraint to VoucherCodeCollisionError, never a raw Postgres string", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(409, {
          code: "23505",
          message: 'duplicate key value violates unique constraint "reward_vouchers_code_hash_key"',
          details: "Key (code_hash)=(aaaa...) already exists.",
          hint: null,
        }),
      );
      const repo = new SupabaseEconomyRepository(CONFIG);
      await expect(
        repo.issueGuestVoucher({
          voucherId: "vch_2",
          codeHash: "a".repeat(64),
          coinAmount: "100",
          matchId: "m6",
          issuedToGuestId: "guest_z",
        }),
      ).rejects.toBeInstanceOf(VoucherCodeCollisionError);
    });

    it("maps IDENTITY_NOT_FOUND to IdentityNotFoundError from ensureWallet", async () => {
      fetchMock.mockResolvedValueOnce(pgrestError("IDENTITY_NOT_FOUND: player identity ghost is not registered"));
      const repo = new SupabaseEconomyRepository(CONFIG);
      await expect(repo.ensureWallet("ghost")).rejects.toBeInstanceOf(IdentityNotFoundError);
    });

    it("wraps an unrecognized PostgREST failure as EconomyInfrastructureError, never a raw PostgrestError", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: "internal server error, connection reset" }));
      const repo = new SupabaseEconomyRepository(CONFIG);
      await expect(repo.getWorldBankSnapshot()).rejects.toBeInstanceOf(EconomyInfrastructureError);
    });
  });

  /**
   * Phase 4, Step 6 — "transport-level concurrent mocked requests where
   * meaningful." This is a DIFFERENT, LESSER claim than PostgreSQL lock
   * verification, and must never be read as the latter: it proves
   * `SupabaseEconomyRepository` has no CLIENT-SIDE shared mutable state that
   * could corrupt one concurrent call's request/response handling with
   * another's (e.g. a stray instance field caching the last request) — a
   * real, legitimate thing to verify about this class's OWN implementation.
   * It does NOT and CANNOT prove anything about real Postgres row locks,
   * advisory locks, or unique-index enforcement — see
   * `economyRealPostgrestRequired.todo.test.ts` for what remains genuinely
   * unverified.
   */
  describe("concurrency classification (Phase 4 Step 6 — transport-level only, not a database claim)", () => {
    it("8 concurrent commitMatchEntry calls each construct an independent, correctly-shaped request — no cross-call state corruption in the repository instance itself", async () => {
      const repo = new SupabaseEconomyRepository(CONFIG);
      const matchIds = Array.from({ length: 8 }, (_, i) => `m_concurrent_${i}`);
      fetchMock.mockImplementation(async () =>
        jsonResponse(200, { applied: true, operation: "commit_match_entry", idempotencyKey: "k", result: settlementRow({}) }),
      );

      await Promise.all(
        matchIds.map((matchId, i) =>
          repo.commitMatchEntry({
            matchId, roomCode: `ROOM_${i}`, hostIdentityId: `host_${i}`,
            seatCount: 1, humanSeatCount: 1, botSeatCount: 0, isSolo: true,
          }),
        ),
      );

      expect(fetchMock).toHaveBeenCalledTimes(8);
      const sentMatchIds = fetchMock.mock.calls.map((call) => {
        const init = call[1] as RequestInit;
        return (JSON.parse(init.body as string) as { p_match_id: string }).p_match_id;
      });
      // Every one of the 8 concurrent calls sent ITS OWN matchId, not a
      // stale or shared value from another concurrent call — the failure
      // mode this test exists to catch is a repository-level bug, not a
      // database one.
      expect(new Set(sentMatchIds)).toEqual(new Set(matchIds));
    });
  });
});

/**
 * Post-remediation fixture: every bigint field is a STRING, matching what
 * the migration's `settlement_to_safe_jsonb()` (§11a) now actually
 * produces. An earlier version of this fixture used JS numbers — that was
 * deliberately reproducing the PRE-remediation transport bug for Phase 3's
 * own finding; now that the bug is fixed, a passing fixture must reflect
 * the fixed contract, not the historical one.
 */
function settlementRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    match_id: "m_default",
    room_code: "R",
    host_identity_id: "host",
    seat_count: 1,
    human_seat_count: 1,
    bot_seat_count: 0,
    cost_per_seat: "100",
    total_collected: "100",
    total_wallet_rewarded: "0",
    total_guest_escrow: "0",
    total_bot_collection: "0",
    total_world_bank_cut: "0",
    total_refunded: "0",
    refund_reason: null,
    total_forfeited: "0",
    forfeiture_reason: null,
    status: "COMMITTED",
    settled_at: null,
    created_at: "2026-08-26T10:00:00Z",
    ...overrides,
  };
}
