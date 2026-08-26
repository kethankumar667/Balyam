import { InMemoryEconomyRepository } from "../InMemoryEconomyRepository.js";
import { EconomyRepositoryError, type ParticipantIdentityKind } from "../EconomyRepository.js";

/**
 * A realistic PostgREST-shaped HTTP simulator, backed by the already-proven
 * `InMemoryEconomyRepository` as its "database".
 *
 * ── What this IS ─────────────────────────────────────────────────────────
 * A `fetch` replacement that `SupabaseEconomyRepository` cannot distinguish,
 * request-shape-wise, from a real PostgREST server: it parses the same
 * query-filter syntax, dispatches the same RPC function names with the same
 * snake_case argument names, and encodes responses matching the migration's
 * POST-bigint-remediation reality (§11a): every bigint-typed field is
 * encoded as `text`, via the `bigText()` identity function below, exactly
 * as the real `*_safe` views and `*_to_safe_jsonb()` helpers now guarantee.
 * (An earlier version of this simulator deliberately reproduced the
 * PRE-remediation bare-JSON-number quirk, to prove that quirk was real
 * before it was fixed — see
 * `docs/economy/economy-v1-bigint-transport-remediation-proposal.md`. Now
 * that the migration is fixed, this simulator's job is to reflect the FIXED
 * transport, not the historical bug.) This lets the shared contract suite
 * exercise `SupabaseEconomyRepository`'s OWN responsibilities — request
 * construction, response parsing, error-token normalization, strict
 * bigint-string validation — against realistic, INTERNALLY CONSISTENT,
 * stateful data, without needing Docker or a real database.
 *
 * ── What this is NOT ─────────────────────────────────────────────────────
 * Not proof of anything PostgreSQL itself guarantees: no real row locks, no
 * real advisory locks, no real unique-index enforcement (the one exception —
 * voucher `code_hash` collisions — is specifically emulated below, see that
 * section, because `InMemoryEconomyRepository` already throws the same
 * class for the same reason and the wire-format translation matters), no
 * real RLS, no real network latency or partial failure modes. Every business
 * rule this simulator appears to enforce is actually `InMemoryEconomyRepository`
 * enforcing it — this file only translates HTTP <-> repository calls.
 * Concurrency tests specifically MUST NOT run against this simulator as
 * proof of PostgreSQL-level locking — see `economyRealPostgrestRequired.todo.test.ts`.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Encodes a thrown `EconomyRepositoryError` as a realistic PostgREST error
 * body. For every ordinary business error, the real migration's own
 * `raise exception 'TOKEN: detail'` format is reproduced using the error's
 * own `.code` — sufficient for `SupabaseEconomyRepository.mapError`'s
 * `TOKEN:`-anchored matching, without needing the exact human-readable
 * wording the real migration happens to use.
 *
 * `VoucherCodeCollisionError` is special-cased: the real database never
 * raises a custom token for this — it is a genuine Postgres unique-violation
 * on `reward_vouchers_code_hash_key`, and `SupabaseEconomyRepository` matches
 * on that constraint name specifically, not a token. Encoding this one
 * error generically (as `"VOUCHER_CODE_COLLISION: ..."`) would silently
 * fail to exercise the real matching path — this is exactly the kind of
 * gap an isolated unit test would not have caught.
 */
function errorToResponse(err: unknown): Response {
  if (err instanceof EconomyRepositoryError) {
    if (err.name === "VoucherCodeCollisionError") {
      return jsonResponse(409, {
        code: "23505",
        message: 'duplicate key value violates unique constraint "reward_vouchers_code_hash_key"',
        details: "Key (code_hash)=(...) already exists.",
        hint: null,
      });
    }
    return jsonResponse(400, {
      code: "P0001",
      message: `${err.code}: ${err.message}`,
      details: null,
      hint: null,
    });
  }
  return jsonResponse(500, { code: "XX000", message: String(err), details: null, hint: null });
}

/* ═══════════════════════════ DTO → raw row encoders (the inverse of SupabaseEconomyRepository's mappers) ═══ */

const iso = (epochMs: number | null): string | null => (epochMs === null ? null : new Date(epochMs).toISOString());
/** Deliberately `Number(str)`, not the string itself — reproducing the real transport-level finding from Phase 3. */
/**
 * Post-remediation, every bigint field crosses the (real or simulated)
 * PostgREST boundary as `text` — the migration's `*_safe` views and
 * `*_to_safe_jsonb()` helpers guarantee it (§11a). This is an identity
 * function, not a numeric conversion; it exists so every encode function
 * below reads uniformly and so a future reviewer sees explicitly, at each
 * call site, "this is a bigint field, deliberately kept as text."
 */
const bigText = (value: string): string => value;

function encodeWallet(w: Awaited<ReturnType<InMemoryEconomyRepository["getWallet"]>>): unknown {
  if (!w) return null;
  return {
    identity_id: w.identityId,
    identity_kind: w.identityKind,
    balance: bigText(w.balance),
    version: w.version,
    lifetime_granted: bigText(w.lifetimeGranted),
    lifetime_earned: bigText(w.lifetimeEarned),
    lifetime_spent: bigText(w.lifetimeSpent),
    lifetime_refunded: bigText(w.lifetimeRefunded),
    starter_granted: w.starterGranted,
    is_frozen: w.isFrozen,
    updated_at: iso(w.updatedAt),
  };
}

function encodeLedgerEntry(e: {
  id: number; walletId: string; amount: string; balanceBefore: string; balanceAfter: string;
  walletVersionBefore: number; walletVersionAfter: number; entryType: string; sourceKind: string;
  sourceId: string; idempotencyKey: string; description: string; createdAt: number;
}): unknown {
  return {
    id: e.id,
    wallet_id: e.walletId,
    amount: bigText(e.amount),
    balance_before: bigText(e.balanceBefore),
    balance_after: bigText(e.balanceAfter),
    wallet_version_before: e.walletVersionBefore,
    wallet_version_after: e.walletVersionAfter,
    entry_type: e.entryType,
    source_kind: e.sourceKind,
    source_id: e.sourceId,
    idempotency_key: e.idempotencyKey,
    description: e.description,
    created_at: iso(e.createdAt),
  };
}

function encodeVoucher(v: {
  id: string; codeHash: string; coinAmount: string; matchId: string; issuedToGuestId: string;
  status: string; redeemedByMemberId: string | null; redeemedAt: number | null; createdAt: number;
}): unknown {
  return {
    id: v.id,
    code_hash: v.codeHash,
    coin_amount: bigText(v.coinAmount),
    match_id: v.matchId,
    issued_to_guest_id: v.issuedToGuestId,
    status: v.status,
    redeemed_by_member_id: v.redeemedByMemberId,
    redeemed_at: iso(v.redeemedAt),
    created_at: iso(v.createdAt),
  };
}

function encodeSettlement(s: {
  matchId: string; roomCode: string; hostIdentityId: string; seatCount: number; humanSeatCount: number;
  botSeatCount: number; costPerSeat: string; totalCollected: string; totalWalletRewarded: string;
  totalGuestEscrow: string; totalBotCollection: string; totalWorldBankCut: string; totalRefunded: string;
  refundReason: string | null; status: string; settledAt: number | null; createdAt: number;
}): unknown {
  return {
    match_id: s.matchId,
    room_code: s.roomCode,
    host_identity_id: s.hostIdentityId,
    seat_count: s.seatCount,
    human_seat_count: s.humanSeatCount,
    bot_seat_count: s.botSeatCount,
    cost_per_seat: bigText(s.costPerSeat),
    total_collected: bigText(s.totalCollected),
    total_wallet_rewarded: bigText(s.totalWalletRewarded),
    total_guest_escrow: bigText(s.totalGuestEscrow),
    total_bot_collection: bigText(s.totalBotCollection),
    total_world_bank_cut: bigText(s.totalWorldBankCut),
    total_refunded: bigText(s.totalRefunded),
    refund_reason: s.refundReason,
    status: s.status,
    settled_at: iso(s.settledAt),
    created_at: iso(s.createdAt),
  };
}

/* ═══════════════════════════ PostgREST query-string parsing (minimal, targeted) ═══ */

interface ParsedQuery {
  filters: Map<string, string>; // column -> value (after "eq.")
  limit?: number;
  offset?: number;
  select?: string[];
}

function parseQuery(search: string): ParsedQuery {
  const params = new URLSearchParams(search);
  const filters = new Map<string, string>();
  let limit: number | undefined;
  let offset: number | undefined;
  let select: string[] | undefined;
  for (const [key, value] of params.entries()) {
    if (key === "limit") limit = Number(value);
    else if (key === "offset") offset = Number(value);
    else if (key === "select") select = value.split(",");
    else if (key === "order") continue;
    else if (value.startsWith("eq.")) filters.set(key, decodeURIComponent(value.slice(3)));
  }
  return { filters, limit, offset, select };
}

/* ═══════════════════════════ The simulator ═══════════════════════════════ */

export function createSimulatedPostgrestFetch(backend: InMemoryEconomyRepository): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/rest\/v1\//, "");

    try {
      if (path.startsWith("rpc/")) {
        const fn = path.slice("rpc/".length);
        const args = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
        return jsonResponse(200, await dispatchRpc(backend, fn, args));
      }

      const table = path;
      const { filters, limit, offset, select } = parseQuery(url.search);
      return jsonResponse(200, await dispatchSelect(backend, table, filters, limit, offset, select));
    } catch (err) {
      return errorToResponse(err);
    }
  }) as typeof fetch;
}

async function dispatchRpc(
  backend: InMemoryEconomyRepository,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (fn) {
    case "ensure_wallet":
      return encodeWallet(await backend.ensureWallet(args.p_identity_id as string));

    case "grant_starter_coins": {
      const r = await backend.grantStarterCoins(args.p_identity_id as string);
      return { ...r, result: encodeWallet(r.result) };
    }

    case "commit_match_entry": {
      const r = await backend.commitMatchEntry({
        matchId: args.p_match_id as string,
        roomCode: (args.p_room_code as string | null) ?? null,
        hostIdentityId: args.p_host_identity_id as string,
        seatCount: args.p_seat_count as number,
        humanSeatCount: args.p_human_seat_count as number,
        botSeatCount: args.p_bot_seat_count as number,
        isSolo: args.p_is_solo as boolean,
      });
      return { ...r, result: encodeSettlement(r.result) };
    }

    case "settle_match_economy": {
      const r = await backend.settleMatchEconomy({
        matchId: args.p_match_id as string,
        isValidRanking: args.p_is_valid_ranking as boolean,
        participants: args.p_participants as Array<{
          identityId: string; identityKind: ParticipantIdentityKind; placement: number; voucherCodeHash?: string;
        }>,
        refundReason: (args.p_refund_reason as string | null) ?? undefined,
      });
      return { ...r, result: encodeSettlement(r.result) };
    }

    case "refund_match_entry": {
      const r = await backend.refundMatchEntry(args.p_match_id as string, args.p_reason as string);
      return { ...r, result: encodeSettlement(r.result) };
    }

    case "issue_guest_voucher": {
      const r = await backend.issueGuestVoucher({
        voucherId: args.p_voucher_id as string,
        codeHash: args.p_code_hash as string,
        coinAmount: String(args.p_coin_amount),
        matchId: args.p_match_id as string,
        issuedToGuestId: args.p_issued_to_guest_id as string,
      });
      return { ...r, result: encodeVoucher(r.result) };
    }

    case "redeem_reward_voucher": {
      const r = await backend.redeemRewardVoucher(args.p_code_hash as string, args.p_member_identity_id as string);
      return { ...r, result: encodeVoucher(r.result) };
    }

    case "reconcile_match_settlement": {
      const r = await backend.reconcileSettlement(args.p_match_id as string);
      return [
        {
          match_id: r.matchId,
          status: r.status,
          is_balanced: r.isBalanced,
          collected: bigText(r.collected),
          disbursed: bigText(r.disbursed),
          delta: bigText(r.delta),
          details: {
            wallet_rewarded: bigText(r.details.walletRewarded),
            guest_escrow: bigText(r.details.guestEscrow),
            bot_collection: bigText(r.details.botCollection),
            world_bank_cut: bigText(r.details.worldBankCut),
            refunded: bigText(r.details.refunded),
          },
        },
      ];
    }

    case "list_stale_committed_settlements": {
      const intervalText = String(args.p_older_than ?? "3600 seconds");
      const parsed = Number(intervalText.replace(/[^\d.]/g, ""));
      // `0` is a legitimate threshold ("older than right now") — `|| 3600`
      // would silently discard it, since 0 is falsy in JS. Only fall back
      // to the RPC's own default when parsing genuinely failed (NaN).
      const seconds = Number.isNaN(parsed) ? 3600 : parsed;
      const rows = await backend.listStaleCommittedSettlements(seconds * 1000);
      return rows.map(encodeSettlement);
    }

    default:
      throw new Error(`Simulated PostgREST fetch: unrecognized RPC "${fn}"`);
  }
}

async function dispatchSelect(
  backend: InMemoryEconomyRepository,
  table: string,
  filters: Map<string, string>,
  limit: number | undefined,
  offset: number | undefined,
  select: string[] | undefined,
): Promise<unknown[]> {
  switch (table) {
    case "coin_wallets_safe": {
      const wallet = await backend.getWallet(filters.get("identity_id")!);
      return wallet ? [encodeWallet(wallet)] : [];
    }

    case "coin_ledger_entries_safe": {
      const entries = await backend.listLedger(filters.get("wallet_id")!, { limit, offset });
      return entries.map(encodeLedgerEntry);
    }

    case "match_economy_settlements_safe": {
      const settlement = await backend.getSettlement(filters.get("match_id")!);
      return settlement ? [encodeSettlement(settlement)] : [];
    }

    case "world_bank_accounts_safe": {
      const snapshot = await backend.getWorldBankSnapshot();
      return [
        {
          base_fee_revenue: bigText(snapshot.baseFeeRevenue),
          bot_prize_revenue: bigText(snapshot.botPrizeRevenue),
          guest_escrow_liability: bigText(snapshot.guestEscrowLiability),
          total_voucher_redeemed: bigText(snapshot.totalVoucherRedeemed),
        },
      ];
    }

    case "reward_vouchers_safe": {
      const status = await backend.getVoucherStatus(filters.get("code_hash")!);
      if (!status) return [];
      if (select && select.length === 2 && select.includes("status") && select.includes("coin_amount")) {
        return [{ status: status.status, coin_amount: bigText(status.coinAmount) }];
      }
      return [{ status: status.status, coin_amount: bigText(status.coinAmount) }];
    }

    case "economy_configurations_safe": {
      const config = await backend.getActiveConfiguration();
      // Both `ping` (select=id&limit=1, no filter) and getActiveConfiguration
      // (is_active=eq.true&limit=1) route here — the simulator's one active
      // configuration always satisfies both.
      if (filters.get("is_active") !== undefined && filters.get("is_active") !== "true") return [];
      if (select && select.length === 1 && select[0] === "id") return [{ id: config.id }];
      return [
        {
          id: config.id,
          version: config.version,
          guest_starter_coins: bigText(config.guestStarterCoins),
          member_starter_coins: bigText(config.memberStarterCoins),
          seat_cost_coins: bigText(config.seatCostCoins),
          is_active: config.isActive,
        },
      ];
    }

    case "economy_prize_schedules_safe": {
      const seatCount = Number(filters.get("seat_count"));
      const schedule = await backend.getPrizeSchedule(seatCount);
      if (!schedule) return [];
      return [
        {
          seat_count: schedule.seatCount,
          collected_coins: bigText(schedule.collectedCoins),
          first_place_coins: bigText(schedule.firstPlaceCoins),
          second_place_coins: bigText(schedule.secondPlaceCoins),
          third_place_coins: bigText(schedule.thirdPlaceCoins),
          world_bank_coins: bigText(schedule.worldBankCoins),
        },
      ];
    }

    default:
      throw new Error(`Simulated PostgREST fetch: unrecognized table "${table}"`);
  }
}
