# Economy V1 — Bigint Transport Remediation Proposal

> **Status: IMPLEMENTED.** Option 1 (cast to `text` at the RPC/view boundary), as recommended
> below, has been built, verified against real local PostgreSQL, and exercised through
> `SupabaseEconomyRepository`. See **"Implementation record"** at the end of this document for
> exactly what changed, how it was verified, and what remains open (real PostgREST HTTP
> verification — Docker is still unavailable in this environment). The proposal body below is
> kept verbatim as the design record this implementation followed; it is no longer a live
> decision to be made.

## The proven fact

Every numeric column in Economy V1 (`supabase/migrations/20260826000000_economy_v1.sql`) is
`bigint`. PostgREST generates its JSON responses server-side via Postgres's own
`to_jsonb`/`row_to_json`, which — proven empirically and reproducibly in
`server/src/persistence/__tests__/bigintTransportBoundary.test.ts`, six passing assertions,
no network or database required — emits `bigint` as a bare JSON number. Standard `JSON.parse`
(used by `PostgrestClient`, `server/src/persistence/postgrest.ts`) turns that into an IEEE-754
double. Any value at or below `2^53` round-trips exactly. The very next integer, `2^53 + 1`
(`9007199254740993`), already rounds to `9007199254740992`. Postgres's actual `bigint` maximum
(`9223372036854775807`) rounds to `9223372036854776000` — off by 193, not a cosmetic rounding
nicety. This loss happens at the moment `JSON.parse` runs, inside `PostgrestClient`, before
`SupabaseEconomyRepository`'s own `bigStr()` conversion ever sees the value — no string
conversion applied afterward can recover a digit sequence that was never preserved.

For BHALYAM's actual coin economy today, every value in play is many orders of magnitude below
this boundary. The finding is not that today's balances are at risk — it is that nothing in the
current schema or transport makes that a **guarantee** rather than an **assumption**, and this
project's own standing discipline (bigint-as-string, "never trust a bigint past `number`",
established across every prior phase of this effort) is only as strong as this transport layer
actually allows. Per the explicit instruction this phase operated under, this gap is not
dismissed because current values are small.

## Why this cannot be closed at the repository layer

`SupabaseEconomyRepository` receives an already-parsed JS `number`. There is no point after
`JSON.parse` has run where the original digit string can be recovered. Closing this requires
acting at or before the boundary where the JSON text is produced or parsed — not after.

## Three remediation paths, per the task's own framing

### Option 1 — Cast bigint values to `text` in the RPC/view layer *(recommended primary fix)*

Every RPC's `to_jsonb(row)` call, and every plain `SELECT` PostgREST issues against these tables,
would need every bigint-typed column returned as `text` instead — either via an explicit cast in
each RPC body (`to_jsonb(row) || jsonb_build_object('balance', row.balance::text, ...)`) or, more
maintainably, by exposing bigint-bearing tables through views that cast on the way out and having
PostgREST/the RPCs read through those views. This is the only option that closes the gap for
**every** value, including ones nobody has reasoned about yet, and it matches exactly what this
project already does successfully at the `pg` driver layer (`scripts/economy/verifyEconomySchema.mjs`'s
direct-SQL harness already returns bigint as string for plain selects — this option would make
PostgREST behave the same way for the first time).

- **Cost:** touches every RPC's return construction and every exposed table/view — a real,
  non-trivial migration change, requiring its own review pass (not a Phase 4 concern, but the
  next one this finding hands off to).
- **Benefit:** total, permanent closure. No future value, however large, can silently lose
  precision again.

### Option 2 — A lossless JSON transport strategy

Replace `JSON.parse` in `postgrest.ts` with a parser that preserves large integers exactly (e.g.
one that produces `bigint` or a string for numbers outside the safe range). The task's own
constraint is explicit: **do not add a parsing dependency automatically** — this option is named
here because the task asked for it to be named, not because this phase is recommending it. A
hand-written, dependency-free big-number-aware JSON parse is a real, non-trivial undertaking (JSON
numbers can appear anywhere in an arbitrarily nested structure) and would need its own careful
design and review — likely more implementation risk than Option 1 for the same amount of
protection, since Option 1 fixes the problem at its source rather than working around it after
the fact.

### Option 3 — Explicit database constraints guaranteeing values never exceed `Number.MAX_SAFE_INTEGER`

A `CHECK` constraint on every bigint column (e.g. `check (balance <= 9007199254740991)`) would make
the "this will never realistically happen" assumption an enforced database fact rather than an
informal belief. Cheap to add, and a reasonable **defense-in-depth companion** to Option 1 — but
insufficient alone: a constraint caps the ceiling, it doesn't change how PostgREST encodes values
that ARE within that (still enormous) range, so nothing about the actual transport behavior
changes, and a future schema change that relaxes or misses one of these constraints on a new
column silently reopens the gap with no transport-level backstop.

## Recommendation

**Option 1 (cast to `text` at the RPC/view boundary) as the primary fix, with Option 3 (safe-range
CHECK constraints) as a cheap, complementary defense-in-depth measure.** Option 2 is not
recommended as the primary path, per the task's own caution against reflexively reaching for a new
dependency to solve what a schema-level fix already solves more directly and permanently.

This recommendation is not implemented here. It is a proposal for whoever next reviews the
Economy V1 schema, to be evaluated on its own, separate from this Phase 4 verification pass.

## What does NOT need to happen

`InMemoryEconomyRepository` is unaffected — it never serializes through JSON at all, so this
finding does not apply to it, and no design change is proposed there. `commitMatchEntry`'s existing
`InsufficientFundsError`/`WalletFrozenError`/etc. business logic is unaffected — this is purely a
transport-encoding concern, not a business-rule one.

## Implementation record

See `docs/economy/economy-v1-bigint-boundary-inventory.md` for the complete, field-by-field
inventory (Step 1) this implementation was scoped against — every bigint column in the schema,
classified as fixed, not exposed, or an explicit out-of-scope design decision.

Implemented in place, directly in `supabase/migrations/20260826000000_economy_v1.sql` (never
applied anywhere outside ephemeral local verification, so there was no live deployment history
requiring a follow-up migration instead — see the migration's own header comment for the full
reasoning).

**What was built (§11a of the migration):**

- Seven read-only views — `coin_wallets_safe`, `coin_ledger_entries_safe`,
  `match_economy_settlements_safe`, `world_bank_accounts_safe`, `reward_vouchers_safe`,
  `economy_configurations_safe`, `economy_prize_schedules_safe` — each casting every bigint
  column to `::text`. A view containing a cast expression is not auto-updatable, so no `INSTEAD
  OF` trigger was needed to block writes through them (Postgres refuses by construction); `select`
  is additionally granted only to `service_role`, and insert/update/delete/truncate are explicitly
  revoked from `service_role` too, as defense-in-depth.
- Three internal-only helper functions — `wallet_to_safe_jsonb`, `settlement_to_safe_jsonb`,
  `voucher_to_safe_jsonb` — pure `language sql immutable` functions that build a `jsonb_build_object`
  with every bigint field `::text`-cast, replacing all 12 `to_jsonb(row)` call sites inside the
  RPC functions' return payloads. `EXECUTE` on these three is revoked from everyone including
  `service_role` (mirroring the pre-existing `economy_apply_refund`/`prevent_ledger_mutation`
  pattern) — a function called from inside a `SECURITY DEFINER` RPC runs as that RPC's owner, so
  this does not block legitimate internal use.
- `ensure_wallet` and `list_stale_committed_settlements` now return `coin_wallets_safe` /
  `setof match_economy_settlements_safe` instead of the raw table types.
  `reconcile_match_settlement`'s `collected`/`disbursed`/`delta` output columns and its nested
  `wallet_rewarded` details are now `text`.
- `SupabaseEconomyRepository.ts`: every read method now selects from the `_safe` view instead of
  the raw table; `bigStr()` was rewritten from a lenient `string | number → String()` converter
  into a strict validator (`/^-?\d+$/`) that throws `EconomyInfrastructureError` on anything that
  isn't already a well-formed decimal string — a defensive backstop, since a value should never
  arrive as anything else post-remediation, but if it ever did, silent numeric coercion is exactly
  the failure mode this whole effort exists to prevent.

**What did NOT change:** table schemas remain `bigint`; all arithmetic, conservation constraints,
ledger immutability, RPC names, and RPC grants are unchanged; the two `to_jsonb(v_config)` /
`to_jsonb(v_schedule)` calls that write into `config_snapshot`/`prize_schedule_snapshot` (internal
storage only, never read back through any public interface) were deliberately left untouched.

**Verification performed:**

- `scripts/economy/verifyEconomySchema.mjs` — 90/90 checks pass against real local PostgreSQL,
  including a dedicated §14a exercising the bigint boundary values below, both via the raw
  `::text` cast expression and via real table rows read back through the `_safe` views, and
  confirming the migration still rolls back and re-applies cleanly afterward.
- `server/src/persistence/__tests__/SupabaseEconomyRepository.test.ts` — dedicated boundary tests
  prove exact digit preservation for `"0"`, `"1"`, `"-1"`, `Number.MAX_SAFE_INTEGER + 1`
  (`"9007199254740992"`), the PostgreSQL `bigint` maximum (`"9223372036854775807"`) across a
  wallet balance/version/lifetime counter simultaneously, and the PostgreSQL `bigint` minimum
  (`"-9223372036854775808"`) against the bare cast expression (the true minimum is not
  constructible as a ledger `amount` in a real row, since `balance_before`/`balance_after` must
  stay non-negative — see the script's §14a-iii comment); plus explicit tests proving a bigint
  field arriving as a JS `number` (a transport regression) and a malformed string (decimal point,
  scientific notation, comma, leading `+`, empty, `NaN`, `Infinity`) are both **rejected**, not
  silently coerced.
- Full server suite: 1023 passing, 16 todo (all in the real-PostgREST-required inventory below),
  1 skipped, 0 failed. `npx tsc --noEmit` clean.

**What remains open:** everything in
`server/src/persistence/__tests__/economyRealPostgrestRequired.todo.test.ts`'s "Bigint transport
remediation" block — specifically, that a *real* PostgREST HTTP server actually serializes a
`text`-typed column holding only digits as a JSON string, byte-for-byte, for values at and beyond
the boundaries above. Docker remains unavailable in this environment, so this claim rests on
Postgres's documented `to_jsonb`/view-cast semantics and this project's own local-`pg`-driver
verification, not a measured HTTP response — see that file for the exact pending test list.
