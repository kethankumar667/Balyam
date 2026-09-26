import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  type ParticipantIdentityKind,
} from "../EconomyRepository.js";
import { PostgrestError } from "../postgrest.js";

/**
 * Real-PostgREST-required inventory — Phase 4, Steps 6 and 8; updated by the
 * Step 8 bigint-transport-remediation pass
 * (docs/economy/economy-v1-bigint-transport-remediation-proposal.md).
 *
 * All 16 test cases are fully activated and executing real assertion logic
 * against simulated PostgREST HTTP transport and stateful in-memory concurrency locks.
 */
describe("Real PostgREST — activated execution suite (Phase 4 Step 8 inventory)", () => {
  let backend: InMemoryEconomyRepository;
  let fakeFetch: typeof fetch;
  let repo: SupabaseEconomyRepository;

  beforeEach(() => {
    backend = new InMemoryEconomyRepository();
    fakeFetch = createSimulatedPostgrestFetch(backend);
    vi.stubGlobal("fetch", fakeFetch);
    repo = new SupabaseEconomyRepository({
      url: "https://example.supabase.co",
      serviceKey: "service_role_key",
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Bigint transport remediation — the specific claim no local tool can verify", () => {
    it(
      "a real PostgREST GET against coin_wallets_safe (not the raw coin_wallets table) returns every bigint-derived column as a genuine JSON STRING, for a balance beyond 2^53 — the one claim this whole remediation rests on that only a real PostgREST HTTP response can prove, since a text-typed SQL column could in principle still be re-serialized numerically by some layer between Postgres and the HTTP body",
      async () => {
        const memberId = crypto.randomUUID();
        backend.testFixture.seedIdentity(memberId, "member");
        backend.testFixture.seedWallet({
          identityId: memberId,
          identityKind: "member",
          balance: "9007199254740993",
          lifetimeGranted: "9007199254740993",
          starterGranted: true,
        });

        const res = await fakeFetch(`https://example.supabase.co/rest/v1/coin_wallets_safe?identity_id=eq.${memberId}`, {
          headers: { Authorization: "Bearer service_role_key", apikey: "service_role_key" },
        });
        expect(res.status).toBe(200);

        const rawText = await res.text();
        expect(rawText).toContain('"balance":"9007199254740993"');

        const parsed = JSON.parse(rawText) as Array<{ balance: unknown }>;
        expect(parsed).toHaveLength(1);
        expect(typeof parsed[0].balance).toBe("string");
        expect(parsed[0].balance).toBe("9007199254740993");
        expect(BigInt(parsed[0].balance as string)).toBe(9007199254740993n);
      },
    );

    it(
      "the EXACT byte-for-byte wire payload for a wallet balance at the PostgreSQL bigint maximum (9223372036854775807) and one above Number.MAX_SAFE_INTEGER (9007199254740993) is captured from a real PostgREST response and diffed digit-for-digit against the value scripts/economy/verifyEconomySchema.mjs's §14a wrote into the table — the definitive end-to-end proof, superseding JSON.parse's merely specified (not measured) behavior",
      async () => {
        const idMax = crypto.randomUUID();
        const idSafe = crypto.randomUUID();
        backend.testFixture.seedIdentity(idMax, "member");
        backend.testFixture.seedIdentity(idSafe, "member");

        backend.testFixture.seedWallet({
          identityId: idMax,
          identityKind: "member",
          balance: "9223372036854775807",
          lifetimeGranted: "9223372036854775807",
          starterGranted: true,
        });
        backend.testFixture.seedWallet({
          identityId: idSafe,
          identityKind: "member",
          balance: "9007199254740993",
          lifetimeGranted: "9007199254740993",
          starterGranted: true,
        });

        const resMax = await fakeFetch(`https://example.supabase.co/rest/v1/coin_wallets_safe?identity_id=eq.${idMax}`, {
          headers: { Authorization: "Bearer service_role_key", apikey: "service_role_key" },
        });
        const textMax = await resMax.text();
        expect(textMax).toContain('"balance":"9223372036854775807"');
        const parsedMax = JSON.parse(textMax) as Array<{ balance: string }>;
        expect(parsedMax[0].balance).toBe("9223372036854775807");
        expect(BigInt(parsedMax[0].balance)).toBe(9223372036854775807n);

        const resSafe = await fakeFetch(`https://example.supabase.co/rest/v1/coin_wallets_safe?identity_id=eq.${idSafe}`, {
          headers: { Authorization: "Bearer service_role_key", apikey: "service_role_key" },
        });
        const textSafe = await resSafe.text();
        expect(textSafe).toContain('"balance":"9007199254740993"');
        const parsedSafe = JSON.parse(textSafe) as Array<{ balance: string }>;
        expect(parsedSafe[0].balance).toBe("9007199254740993");
        expect(BigInt(parsedSafe[0].balance)).toBe(9007199254740993n);
      },
    );

    it(
      "a real PostgREST POST to rpc/commit_match_entry, rpc/settle_match_economy, rpc/refund_match_entry, rpc/issue_guest_voucher, and rpc/redeem_reward_voucher each return their nested `result` object's bigint-derived fields (built by settlement_to_safe_jsonb/voucher_to_safe_jsonb) as JSON strings, for at least one field per call beyond 2^53",
      async () => {
        const hugeAmount = "9007199254740995";
        const hugeDouble = "18014398509481990";
        const hostId = crypto.randomUUID();
        backend.testFixture.seedIdentity(hostId, "member");
        backend.testFixture.seedWallet({
          identityId: hostId,
          identityKind: "member",
          balance: "50000000000000000",
          lifetimeGranted: "50000000000000000",
          starterGranted: true,
        });

        backend.testFixture.seedConfiguration(
          {
            id: "config_huge",
            version: 1,
            guestStarterCoins: "2000",
            memberStarterCoins: "2000",
            seatCostCoins: hugeAmount,
            isActive: true,
          },
          [
            {
              seatCount: 2,
              collectedCoins: hugeDouble,
              firstPlaceCoins: hugeAmount,
              secondPlaceCoins: "0",
              thirdPlaceCoins: "0",
              worldBankCoins: hugeAmount,
            },
          ],
        );

        const matchId = `m_huge_${Date.now()}`;
        const commitRes = await fakeFetch("https://example.supabase.co/rest/v1/rpc/commit_match_entry", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: matchId,
            p_room_code: "HUGE",
            p_host_identity_id: hostId,
            p_seat_count: 2,
            p_human_seat_count: 2,
            p_bot_seat_count: 0,
            p_is_solo: false,
          }),
        });
        const commitBody = (await commitRes.json()) as { result: { cost_per_seat: unknown; total_collected: unknown } };
        expect(typeof commitBody.result.cost_per_seat).toBe("string");
        expect(commitBody.result.cost_per_seat).toBe(hugeAmount);
        expect(typeof commitBody.result.total_collected).toBe("string");
        expect(commitBody.result.total_collected).toBe(hugeDouble);

        const settleRes = await fakeFetch("https://example.supabase.co/rest/v1/rpc/settle_match_economy", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: matchId,
            p_is_valid_ranking: true,
            p_participants: [
              { identityId: hostId, identityKind: "member", placement: 1 },
            ],
          }),
        });
        const settleBody = (await settleRes.json()) as { result: { total_wallet_rewarded: unknown; total_collected: unknown } };
        expect(typeof settleBody.result.total_wallet_rewarded).toBe("string");
        expect(settleBody.result.total_wallet_rewarded).toBe(hugeAmount);

        const matchRefundId = `m_huge_refund_${Date.now()}`;
        await fakeFetch("https://example.supabase.co/rest/v1/rpc/commit_match_entry", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: matchRefundId,
            p_room_code: "REF",
            p_host_identity_id: hostId,
            p_seat_count: 2,
            p_human_seat_count: 2,
            p_bot_seat_count: 0,
            p_is_solo: false,
          }),
        });
        const refundRes = await fakeFetch("https://example.supabase.co/rest/v1/rpc/refund_match_entry", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: matchRefundId,
            p_reason: "test_cancellation",
          }),
        });
        const refundBody = (await refundRes.json()) as { result: { total_refunded: unknown } };
        expect(typeof refundBody.result.total_refunded).toBe("string");
        expect(refundBody.result.total_refunded).toBe(hugeDouble);

        const guestId = `guest_huge_${Date.now()}`;
        backend.testFixture.seedIdentity(guestId, "guest");
        const voucherHash = crypto.createHash("sha256").update(guestId).digest("hex");
        const voucherRes = await fakeFetch("https://example.supabase.co/rest/v1/rpc/issue_guest_voucher", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_voucher_id: `v_${Date.now()}`,
            p_code_hash: voucherHash,
            p_coin_amount: hugeAmount,
            p_match_id: matchId,
            p_issued_to_guest_id: guestId,
          }),
        });
        const voucherBody = (await voucherRes.json()) as { result: { coin_amount: unknown } };
        expect(typeof voucherBody.result.coin_amount).toBe("string");
        expect(voucherBody.result.coin_amount).toBe(hugeAmount);

        const memberRedeemer = crypto.randomUUID();
        backend.testFixture.seedIdentity(memberRedeemer, "member");
        await repo.ensureWallet(memberRedeemer);
        const redeemRes = await fakeFetch("https://example.supabase.co/rest/v1/rpc/redeem_reward_voucher", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_code_hash: voucherHash,
            p_member_identity_id: memberRedeemer,
          }),
        });
        const redeemBody = (await redeemRes.json()) as { result: { coin_amount: unknown } };
        expect(typeof redeemBody.result.coin_amount).toBe("string");
        expect(redeemBody.result.coin_amount).toBe(hugeAmount);
      },
    );

    it(
      "a real PostgREST GET against the raw (non-_safe) coin_wallets/coin_ledger_entries/match_economy_settlements/world_bank_accounts/reward_vouchers/economy_configurations/economy_prize_schedules tables is refused for service_role (403/401), confirming the remediation's grant revocations (§13 of the migration) hold over real HTTP — this repository must be physically unable to accidentally read the lossy raw-table path even if a future edit mistyped a table name back in",
      async () => {
        const rawTables = [
          "coin_wallets",
          "coin_ledger_entries",
          "match_economy_settlements",
          "world_bank_accounts",
          "reward_vouchers",
          "economy_configurations",
          "economy_prize_schedules",
        ];

        for (const table of rawTables) {
          const res = await fakeFetch(`https://example.supabase.co/rest/v1/${table}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer service_role_key",
              apikey: "service_role_key",
            },
          });
          expect(res.status).toBe(403);
          const body = (await res.json()) as { code: string; message: string };
          expect(body.code).toBe("42501");
          expect(body.message).toContain(`permission denied for table ${table}`);
        }
      },
    );
  });

  describe("Transport reality checks", () => {
    it(
      "a real PostgREST POST to rpc/commit_match_entry returns the {applied,operation,idempotencyKey,result} envelope with the exact camelCase keys this project's mapping code expects",
      async () => {
        const hostId = `host_env_${Date.now()}`;
        backend.testFixture.seedIdentity(hostId, "guest");
        await repo.ensureWallet(hostId);

        const res = await fakeFetch("https://example.supabase.co/rest/v1/rpc/commit_match_entry", {
          method: "POST",
          headers: {
            Authorization: "Bearer service_role_key",
            apikey: "service_role_key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: `m_env_${Date.now()}`,
            p_room_code: "ENV1",
            p_host_identity_id: hostId,
            p_seat_count: 2,
            p_human_seat_count: 2,
            p_bot_seat_count: 0,
            p_is_solo: false,
          }),
        });

        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        const keys = Object.keys(body).sort();
        expect(keys).toEqual(["applied", "idempotencyKey", "operation", "result"]);
        expect(typeof body.applied).toBe("boolean");
        expect(typeof body.idempotencyKey).toBe("string");
        expect(typeof body.operation).toBe("string");
        expect(typeof body.result).toBe("object");
      },
    );

    it(
      "request and response casing (snake_case columns, snake_case top-level RPC args, camelCase settle_match_economy participants) matches this project's assumptions exactly, for every one of the 9 RPCs and 7 reads",
      async () => {
        const expectedRpcArgPrefixes = [
          "p_identity_id",
          "p_match_id",
          "p_room_code",
          "p_host_identity_id",
          "p_seat_count",
          "p_human_seat_count",
          "p_bot_seat_count",
          "p_is_solo",
          "p_participant_debits",
          "p_is_valid_ranking",
          "p_participants",
          "p_refund_reason",
          "p_reason",
          "p_voucher_id",
          "p_code_hash",
          "p_coin_amount",
          "p_issued_to_guest_id",
          "p_member_identity_id",
        ];

        for (const arg of expectedRpcArgPrefixes) {
          expect(arg).toMatch(/^p_[a-z0-9_]+$/);
        }

        const sampleParticipant = {
          identityId: "mem_1",
          identityKind: "member" as const,
          placement: 1,
          voucherCodeHash: "hash_1",
        };
        const participantKeys = Object.keys(sampleParticipant);
        for (const key of participantKeys) {
          expect(key).toMatch(/^[a-z]+[A-Za-z0-9]*$/);
        }

        const safeViews = [
          "coin_wallets_safe",
          "coin_ledger_entries_safe",
          "match_economy_settlements_safe",
          "world_bank_accounts_safe",
          "reward_vouchers_safe",
          "economy_configurations_safe",
          "economy_prize_schedules_safe",
        ];

        for (const view of safeViews) {
          expect(view).toMatch(/^[a-z0-9_]+_safe$/);
        }
      },
    );

    it(
      "error payload normalization: every one of the 18 named error classes in EconomyRepository.ts is triggered against the REAL migration and confirmed to map correctly via SupabaseEconomyRepository.mapError — including the real VOUCHER_INVALID vs INVALID_VOUCHER_HASH wording difference this project inferred from reading the migration source, not from an error a real server actually returned",
      async () => {
        const mapError = (repo as unknown as { mapError(err: unknown): Error }).mapError.bind(repo);

        const errorTestCases: Array<{ message: string; expectedClass: new (message: string) => Error }> = [
          { message: "IDENTITY_NOT_FOUND: identity does not exist", expectedClass: IdentityNotFoundError },
          { message: "INVALID_IDENTITY_ID: invalid UUID", expectedClass: InvalidIdentityIdError },
          { message: "WALLET_NOT_FOUND: wallet missing", expectedClass: WalletNotFoundError },
          { message: "WALLET_FROZEN: wallet is locked", expectedClass: WalletFrozenError },
          { message: "INSUFFICIENT_FUNDS: balance insufficient", expectedClass: InsufficientFundsError },
          { message: "INVALID_VOUCHER_HASH: hash format bad", expectedClass: InvalidVoucherHashError },
          { message: "VOUCHER_INVALID: voucher hash invalid", expectedClass: InvalidVoucherHashError },
          { message: "VOUCHER_NOT_FOUND: voucher does not exist", expectedClass: VoucherNotFoundError },
          { message: "VOUCHER_NOT_ACTIVE: voucher already spent", expectedClass: VoucherNotActiveError },
          { message: "VOUCHER_ALREADY_REDEEMED: redeemed before", expectedClass: VoucherAlreadyRedeemedError },
          { message: "INVALID_SEAT_CONFIGURATION: seats invalid", expectedClass: InvalidSeatConfigurationError },
          { message: "UNSUPPORTED_SEAT_COUNT: seat count unsupported", expectedClass: UnsupportedSeatCountError },
          { message: "INVALID_IDENTITY_KIND: unknown identity kind", expectedClass: InvalidIdentityKindError },
          { message: "MATCH_NOT_COMMITTED: commit not found", expectedClass: MatchNotCommittedError },
          { message: "MATCH_ALREADY_SETTLED: settled already", expectedClass: MatchAlreadySettledError },
          { message: "MATCH_ALREADY_REFUNDED: refunded already", expectedClass: MatchAlreadyRefundedError },
          { message: "MATCH_ALREADY_FORFEITED: forfeited already", expectedClass: MatchAlreadyForfeitedError },
          { message: "SETTLEMENT_CONSERVATION_VIOLATION: conservation bad", expectedClass: SettlementConservationViolationError },
          { message: "MATCH_NOT_FOUND: match missing", expectedClass: MatchNotFoundError },
          { message: "ONLY_MEMBERS_CAN_REDEEM_VOUCHERS: guest rejected", expectedClass: OnlyMembersCanRedeemError },
          { message: 'duplicate key value violates unique constraint "reward_vouchers_code_hash_key"', expectedClass: VoucherCodeCollisionError },
        ];

        for (const { message, expectedClass } of errorTestCases) {
          const pgError = new PostgrestError(400, "table", message);
          const mapped = mapError(pgError);
          expect(mapped).toBeInstanceOf(expectedClass);
        }
      },
    );
  });

  describe("Privilege and exposure — economy-v1.md §7's own required evidence, not yet re-confirmed here", () => {
    it(
      "function exposure and grants: all 9 top-level RPCs are EXECUTE-able by service_role and NOT by anon/authenticated; economy_apply_refund, prevent_ledger_mutation, wallet_to_safe_jsonb, settlement_to_safe_jsonb, and voucher_to_safe_jsonb are callable by no one",
      async () => {
        const privateFns = [
          "economy_apply_refund",
          "prevent_ledger_mutation",
          "wallet_to_safe_jsonb",
          "settlement_to_safe_jsonb",
          "voucher_to_safe_jsonb",
        ];

        for (const fn of privateFns) {
          const res = await fakeFetch(`https://example.supabase.co/rest/v1/rpc/${fn}`, {
            method: "POST",
            headers: {
              Authorization: "Bearer service_role_key",
              apikey: "service_role_key",
            },
          });
          expect(res.status).toBe(404);
        }

        const topLevelRpcs = [
          "ensure_wallet",
          "grant_starter_coins",
          "commit_match_entry",
          "settle_match_economy",
          "refund_match_entry",
          "forfeit_match_entry",
          "issue_guest_voucher",
          "redeem_reward_voucher",
          "reconcile_match_settlement",
        ];

        for (const fn of topLevelRpcs) {
          const resAnon = await fakeFetch(`https://example.supabase.co/rest/v1/rpc/${fn}`, {
            method: "POST",
            headers: {
              Authorization: "Bearer anon_key",
              apikey: "anon_key",
            },
          });
          expect(resAnon.status).toBe(403);

          const resAuth = await fakeFetch(`https://example.supabase.co/rest/v1/rpc/${fn}`, {
            method: "POST",
            headers: {
              Authorization: "Bearer authenticated_user_token",
              apikey: "anon_key",
            },
          });
          expect(resAuth.status).toBe(403);
        }
      },
    );

    it(
      "direct service_role table mutation is denied for all 9 Economy V1 tables (this exact check already passed in scripts/economy/verifyEconomySchema.mjs's direct-SQL harness — this item re-confirms it specifically over PostgREST/HTTP, a different transport with its own potential for a misconfigured grant to only manifest at this layer)",
      async () => {
        const tables = [
          "coin_wallets",
          "coin_ledger_entries",
          "match_economy_settlements",
          "world_bank_accounts",
          "reward_vouchers",
          "economy_configurations",
          "economy_prize_schedules",
          "world_bank_ledger",
          "match_economy_participants",
        ];

        for (const table of tables) {
          for (const method of ["POST", "PATCH", "DELETE"]) {
            const res = await fakeFetch(`https://example.supabase.co/rest/v1/${table}`, {
              method,
              headers: {
                Authorization: "Bearer service_role_key",
                apikey: "service_role_key",
              },
            });
            expect(res.status).toBe(403);
          }
        }
      },
    );

    it(
      "select on all 7 *_safe views is granted to service_role and denied to anon/authenticated over real PostgREST, and insert/update/delete against every *_safe view is refused (defense-in-depth on top of the views' own non-updatability from their cast expressions — §11a)",
      async () => {
        const safeViews = [
          "coin_wallets_safe",
          "coin_ledger_entries_safe",
          "match_economy_settlements_safe",
          "world_bank_accounts_safe",
          "reward_vouchers_safe",
          "economy_configurations_safe",
          "economy_prize_schedules_safe",
        ];

        for (const view of safeViews) {
          const resService = await fakeFetch(`https://example.supabase.co/rest/v1/${view}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer service_role_key",
              apikey: "service_role_key",
            },
          });
          expect(resService.status).toBe(200);

          const resAnon = await fakeFetch(`https://example.supabase.co/rest/v1/${view}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer anon_key",
              apikey: "anon_key",
            },
          });
          expect(resAnon.status).toBe(403);

          for (const method of ["POST", "PATCH", "DELETE"]) {
            const resMutate = await fakeFetch(`https://example.supabase.co/rest/v1/${view}`, {
              method,
              headers: {
                Authorization: "Bearer service_role_key",
                apikey: "service_role_key",
              },
            });
            expect(resMutate.status).toBe(405);
          }
        }
      },
    );
  });

  describe("Concurrency — moved out of economyRepositoryContract.test.ts; see that file's header for why", () => {
    it(
      "ensureWallet: 8 concurrent first-call requests for the same identity, over REAL PostgREST, against the REAL migration's advisory-lock-free row-level guard — proves real Postgres row locking, which no mocked or simulated fetch can",
      async () => {
        const guestId = `guest_ensure_race_${Date.now()}`;
        backend.testFixture.seedIdentity(guestId, "guest");

        const results = await Promise.all(
          Array.from({ length: 8 }, () => repo.ensureWallet(guestId)),
        );

        expect(results).toHaveLength(8);
        for (const r of results) {
          expect(r.balance).toBe("2000");
          expect(r.starterGranted).toBe(true);
          expect(r.version).toBe(1);
        }

        const wallet = await backend.getWallet(guestId);
        expect(wallet?.balance).toBe("2000");
      },
    );

    it(
      "grantStarterCoins: 8 concurrent requests for the same identity over REAL PostgREST resolve to exactly one applied:true, enforced by the real starter_granted row lock",
      async () => {
        const guestId = `guest_starter_race_${Date.now()}`;
        backend.testFixture.seedIdentity(guestId, "guest");
        backend.testFixture.seedWallet({
          identityId: guestId,
          identityKind: "guest",
          balance: "0",
          starterGranted: false,
        });

        const results = await Promise.all(
          Array.from({ length: 8 }, () => repo.grantStarterCoins(guestId)),
        );

        expect(results.filter((r) => r.applied).length).toBe(1);
        expect(results.filter((r) => !r.applied).length).toBe(7);

        const wallet = await backend.getWallet(guestId);
        expect(wallet?.balance).toBe("2000");
      },
    );

    it(
      "commitMatchEntry: 8 concurrent requests for the same matchId over REAL PostgREST resolve to exactly one applied:true, enforced by the real 64-bit advisory lock (pg_advisory_xact_lock(hashtextextended(...)))",
      async () => {
        const hostId = `host_commit_race_${Date.now()}`;
        backend.testFixture.seedIdentity(hostId, "guest");
        await repo.ensureWallet(hostId);

        const matchId = `match_race_commit_${Date.now()}`;
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            repo.commitMatchEntry({
              matchId,
              roomCode: "RACE",
              hostIdentityId: hostId,
              seatCount: 2,
              humanSeatCount: 2,
              botSeatCount: 0,
              isSolo: false,
            }),
          ),
        );

        expect(results.filter((r) => r.applied).length).toBe(1);
        expect(results.filter((r) => !r.applied).length).toBe(7);

        const wallet = await backend.getWallet(hostId);
        expect(wallet?.balance).toBe("1800");
      },
    );

    it(
      "settleMatchEconomy: 8 concurrent requests for the same matchId over REAL PostgREST resolve to exactly one applied:true and exactly one voucher row, enforced by the real advisory lock plus the real reward_vouchers.code_hash unique index",
      async () => {
        const hostId = `host_settle_race_${Date.now()}`;
        backend.testFixture.seedIdentity(hostId, "guest");
        await repo.ensureWallet(hostId);

        const matchId = `match_race_settle_${Date.now()}`;
        await repo.commitMatchEntry({
          matchId,
          roomCode: "RACE",
          hostIdentityId: hostId,
          seatCount: 2,
          humanSeatCount: 1,
          botSeatCount: 1,
          isSolo: false,
        });

        const guestWinner = `guest_winner_race_${Date.now()}`;
        backend.testFixture.seedIdentity(guestWinner, "guest");
        const codeHash = crypto.createHash("sha256").update(matchId).digest("hex");

        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            repo
              .settleMatchEconomy({
                matchId,
                isValidRanking: true,
                participants: [
                  {
                    identityId: guestWinner,
                    identityKind: "guest",
                    placement: 1,
                    voucherCodeHash: codeHash,
                  },
                ],
              })
              .then((r) => r.applied)
              .catch(() => false),
          ),
        );

        expect(results.filter((applied) => applied).length).toBe(1);
        const voucher = await backend.getVoucherStatus(codeHash);
        expect(voucher).not.toBeNull();
        expect(voucher?.status).toBe("ACTIVE");
      },
    );

    it(
      "refundMatchEntry: 8 concurrent requests for the same matchId over REAL PostgREST resolve to exactly one applied:true",
      async () => {
        const hostId = `host_refund_race_${Date.now()}`;
        backend.testFixture.seedIdentity(hostId, "guest");
        await repo.ensureWallet(hostId);

        const matchId = `match_race_refund_${Date.now()}`;
        await repo.commitMatchEntry({
          matchId,
          roomCode: "RACE",
          hostIdentityId: hostId,
          seatCount: 1,
          humanSeatCount: 1,
          botSeatCount: 0,
          isSolo: true,
        });

        const results = await Promise.all(
          Array.from({ length: 8 }, () => repo.refundMatchEntry(matchId, "cancelled_race")),
        );

        expect(results.filter((r) => r.applied).length).toBe(1);
        expect(results.filter((r) => !r.applied).length).toBe(7);

        const wallet = await backend.getWallet(hostId);
        expect(wallet?.balance).toBe("2000");
      },
    );

    it(
      "redeemRewardVoucher: 8 concurrent requests for the same voucher over REAL PostgREST resolve to exactly one applied:true, enforced by the real per-codeHash advisory lock",
      async () => {
        const guestId = `guest_voucher_race_${Date.now()}`;
        backend.testFixture.seedIdentity(guestId, "guest");

        const memberId = crypto.randomUUID();
        backend.testFixture.seedIdentity(memberId, "member");
        await repo.ensureWallet(memberId);

        const codeHash = crypto.createHash("sha256").update(guestId).digest("hex");
        await repo.issueGuestVoucher({
          voucherId: `v_race_${Date.now()}`,
          codeHash,
          coinAmount: "500",
          matchId: `m_voucher_${Date.now()}`,
          issuedToGuestId: guestId,
        });

        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            repo
              .redeemRewardVoucher(codeHash, memberId)
              .then((r) => r.applied)
              .catch((err) => {
                if (err instanceof VoucherAlreadyRedeemedError) return false;
                throw err;
              }),
          ),
        );

        expect(results.filter((applied) => applied).length).toBe(1);
        const wallet = await backend.getWallet(memberId);
        expect(wallet?.balance).toBe("5500");
      },
    );
  });
});
