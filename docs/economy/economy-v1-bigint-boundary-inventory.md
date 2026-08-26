# Economy V1 — Bigint Boundary Inventory (Step 1)

> Companion to `docs/economy/economy-v1-bigint-transport-remediation-proposal.md` (now status:
> IMPLEMENTED) and `docs/economy/economy-v1.md` §6c. This is the complete, field-by-field
> inventory of every `bigint` column in the Economy V1 schema, classified against whether it
> crosses the PostgREST boundary, and if so, whether it is now lossless.
>
> **Classification legend:**
> - **REQUIRES TEXT CAST → FIXED** — the field is read by `SupabaseEconomyRepository` and now
>   crosses PostgREST as `text` via a `_safe` view or a `*_to_safe_jsonb()` helper.
> - **NOT EXPOSED** — the field exists in the schema but is never read by
>   `SupabaseEconomyRepository` (no view, RPC result, or select ever surfaces it). No transport
>   risk today because there is no transport.
> - **REQUIRES DESIGN DECISION** — the underlying column is `bigint`, but the frozen Phase 1
>   repository contract (`EconomyRepository.ts`) deliberately types the corresponding DTO field
>   as a JS `number`, not a bigint-safe string. Left as-is by this remediation; see the note below
>   the table.
> - **ALREADY LOSSLESS** — not applicable to any field in this schema; every exposed bigint field
>   fell into one of the three categories above.

## Inventory

| Table / RPC | Column | Bigint? | Exposed by repository? | Classification |
|---|---|---|---|---|
| `coin_wallets` | `balance` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES TEXT CAST → FIXED** |
| `coin_wallets` | `version` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES DESIGN DECISION** (see note) |
| `coin_wallets` | `lifetime_granted` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES TEXT CAST → FIXED** |
| `coin_wallets` | `lifetime_earned` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES TEXT CAST → FIXED** |
| `coin_wallets` | `lifetime_spent` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES TEXT CAST → FIXED** |
| `coin_wallets` | `lifetime_refunded` | Yes | `coin_wallets_safe`, `ensure_wallet` | **REQUIRES TEXT CAST → FIXED** |
| `coin_ledger_entries` | `id` (`bigserial`) | Yes | `coin_ledger_entries_safe` | **REQUIRES DESIGN DECISION** (see note) |
| `coin_ledger_entries` | `amount` | Yes | `coin_ledger_entries_safe` | **REQUIRES TEXT CAST → FIXED** |
| `coin_ledger_entries` | `balance_before` | Yes | `coin_ledger_entries_safe` | **REQUIRES TEXT CAST → FIXED** |
| `coin_ledger_entries` | `balance_after` | Yes | `coin_ledger_entries_safe` | **REQUIRES TEXT CAST → FIXED** |
| `coin_ledger_entries` | `wallet_version_before` | Yes | `coin_ledger_entries_safe` | **REQUIRES DESIGN DECISION** (see note) |
| `coin_ledger_entries` | `wallet_version_after` | Yes | `coin_ledger_entries_safe` | **REQUIRES DESIGN DECISION** (see note) |
| `world_bank_accounts` | `base_fee_revenue` | Yes | `world_bank_accounts_safe` | **REQUIRES TEXT CAST → FIXED** |
| `world_bank_accounts` | `bot_prize_revenue` | Yes | `world_bank_accounts_safe` | **REQUIRES TEXT CAST → FIXED** |
| `world_bank_accounts` | `guest_escrow_liability` | Yes | `world_bank_accounts_safe` | **REQUIRES TEXT CAST → FIXED** |
| `world_bank_accounts` | `total_voucher_redeemed` | Yes | `world_bank_accounts_safe` | **REQUIRES TEXT CAST → FIXED** |
| `world_bank_ledger` | `amount` | Yes | Never (no repository method reads this table) | **NOT EXPOSED** |
| `world_bank_ledger` | `balance_before` | Yes | Never | **NOT EXPOSED** |
| `world_bank_ledger` | `balance_after` | Yes | Never | **NOT EXPOSED** |
| `reward_vouchers` | `coin_amount` | Yes | `reward_vouchers_safe`, `voucher_to_safe_jsonb()` | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `cost_per_seat` | Yes | `match_economy_settlements_safe`, `settlement_to_safe_jsonb()` | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_collected` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_wallet_rewarded` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_guest_escrow` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_bot_collection` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_world_bank_cut` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `total_refunded` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `match_economy_settlements` | `config_snapshot` (`jsonb`, contains bigint sub-fields as JSON numbers) | Indirectly | Never read back by any repository method — write-only internal audit column | **NOT EXPOSED** |
| `match_economy_settlements` | `prize_schedule_snapshot` (`jsonb`, ditto) | Indirectly | Never read back | **NOT EXPOSED** |
| `match_economy_participants` | `prize_coins` | Yes | Never (no repository method reads this table) | **NOT EXPOSED** |
| `economy_prize_schedules` | `collected_coins` | Yes | `economy_prize_schedules_safe` | **REQUIRES TEXT CAST → FIXED** |
| `economy_prize_schedules` | `first_place_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `economy_prize_schedules` | `second_place_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `economy_prize_schedules` | `third_place_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `economy_prize_schedules` | `world_bank_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `economy_configurations` | `guest_starter_coins` | Yes | `economy_configurations_safe` | **REQUIRES TEXT CAST → FIXED** |
| `economy_configurations` | `member_starter_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `economy_configurations` | `seat_cost_coins` | Yes | same | **REQUIRES TEXT CAST → FIXED** |
| `reconcile_match_settlement(...)` (RPC output, not a column) | `collected`, `disbursed`, `delta` | Yes (computed from bigint columns) | Yes, this RPC's whole purpose is to expose them | **REQUIRES TEXT CAST → FIXED** |
| `reconcile_match_settlement(...)` | `details.wallet_rewarded`/`guest_escrow`/`bot_collection`/`world_bank_cut`/`refunded` (nested `jsonb`) | Yes | Yes | **REQUIRES TEXT CAST → FIXED** |

**Total exposed bigint fields requiring the text cast: 26** (6 wallet + 5 ledger‑amount‑class + 4
World Bank account + 1 voucher + 7 settlement + 5 prize schedule + 3 configuration = 31 raw
column instances across the 7 `_safe` views, minus the 5 counter/identifier fields held out per
the design-decision note below, plus the 8 `reconcile_match_settlement` output fields, which are
computed values rather than raw columns). Every one of these 26 is verified lossless end to end —
see the proposal doc's "Implementation record" section for the exact test evidence.

## The "REQUIRES DESIGN DECISION" fields, explained

Five fields are genuinely `bigint` in PostgreSQL, are genuinely read by
`SupabaseEconomyRepository`, and were deliberately **left uncast** (still bare JSON numbers over
PostgREST) rather than folded into this remediation:

- `coin_wallets.version` (audit/optimistic-concurrency counter)
- `coin_ledger_entries.id` (global `bigserial` primary key)
- `coin_ledger_entries.wallet_version_before` / `wallet_version_after`

This is not an oversight — it is a pre-existing, frozen Phase 1 design decision. The public
repository contract (`EconomyRepository.ts`, `CoinWalletRecord.version: number` and
`CoinLedgerEntryRecord.id/walletVersionBefore/walletVersionAfter: number`) has typed these fields
as plain JS `number` since before this remediation began, and both `InMemoryEconomyRepository`
and the shared contract-test suite (Phase 4, frozen) already depend on that shape. Widening these
four fields to bigint-safe strings would mean changing the interface itself, not just the
transport underneath it — a materially larger, differently-scoped change than "guarantee lossless
transmission of every Economy V1 bigint value crossing the PostgREST boundary" while leaving
`EconomyService`/API/RoomManager/UI untouched, and one this task's constraints do not authorize
(no instruction here touches `EconomyRepository.ts`'s DTO shapes, and Step 5's "preserve public
DTO output as strings" refers to the already-string-typed coin-amount fields, not these
counters).

Practically, this is also the lowest-risk place in the schema to make that call: `version` and
`wallet_version_before/after` increment by exactly 1 per wallet mutation, and `id` is a single
global sequence — reaching `Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991`) would require that
many ledger-writing mutations to occur, which is not a realistic operational concern at any
timescale this platform will hit. This is **not** offered as the justification for leaving them
unremediated (the task is explicit that "do not rely solely on safe-range constraints" governs
*coin amounts*, and this project does not extend that reasoning to these fields either) — it is
offered only to make clear that leaving this decision open carries negligible practical risk today,
should whoever revisits `EconomyRepository.ts`'s DTO shapes in the future want to fold these four
fields into the bigint-safe-string convention for uniformity's sake.
