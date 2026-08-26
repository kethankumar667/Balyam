# Economy V1 — Implementation Roadmap

> **Status:** PLANNING ONLY — no code written, no SQL written, no migration modified. This
> document sequences the work already designed in `docs/economy/economy-v1-implementation-blueprint.md`
> into 14 small, independently gate-able phases. It assumes that blueprint's interfaces, error
> classes, and RoomManager sequence diagrams as given — this document does not redesign them, it
> schedules them.
> **Grounded against current source** for the two phases where file-path accuracy matters most:
> router mounting (`server/src/index.ts:198`, `app.use("/api/admin/dashboard",
> createDashboardRouter())`) and the client's actual `room:startGame` call sites — confirmed via
> this session's own search to be **four**, not one: `client/src/pages/Room.tsx:582,748` and
> `client/src/components/bhalyam/GameRoomSheet.tsx:515,615`. That count directly changes Phase
> 11's risk rating below; the earlier blueprint didn't have this number.

---

## Phase 1 — `EconomyRepository`

1. **Objective:** Define the repository interface, record types, and named error classes
   (`docs/economy/economy-v1-implementation-blueprint.md` §1.1–1.2) — pure types, zero behavior.
2. **Files touched:** `server/src/persistence/EconomyRepository.ts` (new).
3. **Dependencies:** None. Can start immediately.
4. **Risks:** **Very low.** The only real risk is a shape that doesn't actually match the
   database's `{applied, operation, idempotencyKey, result}` envelope or the migration's real
   `entry_type`/`payout_status` enums — mitigated by copying those literal string unions from
   `docs/economy/economy-v1.md` §4 rather than re-deriving them.
5. **Test strategy:** None yet — no implementation exists to test. `tsc --noEmit` passing is the
   only gate (the interface must compile standalone).
6. **Rollback strategy:** Trivial — delete one file. Nothing depends on it yet.
7. **Verification gates:** `npm run typecheck` clean; a manual diff of every method's argument
   order against the migration's actual RPC signatures (§ blueprint 1.1) — a transposed argument
   here is invisible to the type system if two adjacent params share a type (e.g.
   `humanSeatCount`/`botSeatCount`, both `number`).
8. **GO/NO-GO:** GO if typecheck passes and the manual signature diff finds zero mismatches. This
   phase cannot meaningfully fail otherwise — it has no runtime behavior.

---

## Phase 2 — `InMemoryEconomyRepository`

1. **Objective:** Implement Phase 1's interface entirely in memory, re-deriving the migration's
   `CHECK` constraints as JS assertions (blueprint §1.4) so a violation throws the SAME error
   class a real Postgres violation would surface through Phase 3.
2. **Files touched:** `server/src/persistence/InMemoryEconomyRepository.ts` (new).
3. **Dependencies:** Phase 1.
4. **Risks:** **Medium.** The real risk isn't "does it work" — it's "does it silently drift from
   the database's actual invariants over time." A wallet-balance-reconciliation bug here would let
   every unit test above it pass while the real database would reject the same sequence. Mitigated
   entirely by Phase 4, not by this phase in isolation.
5. **Test strategy:** Direct unit tests against this class alone first (basic CRUD, one test per
   error class), THEN folded into Phase 4's shared contract suite once that exists — do not
   consider this phase's own tests sufficient long-term, they're a scaffold.
6. **Rollback strategy:** Delete the file; nothing outside the persistence layer imports it yet.
7. **Verification gates:** Every error class from Phase 1 has at least one test proving it's
   actually thrown (not just declared); idempotency-key replay returns `applied:false` with the
   original result for every mutating method.
8. **GO/NO-GO:** GO if the standalone unit suite is green. Do NOT treat this as proof the
   implementation is correct relative to Postgres — that claim can only be made after Phase 4.

---

## Phase 3 — `SupabaseEconomyRepository`

1. **Objective:** Implement Phase 1's interface against the real database, via the **existing**
   `PostgrestClient.rpc<T>()` (`server/src/persistence/postgrest.ts` — no new HTTP client). Maps
   PL/pgSQL `raise exception` message prefixes to Phase 1's named error classes.
2. **Files touched:** `server/src/persistence/SupabaseEconomyRepository.ts` (new);
   `server/src/persistence/index.ts` (extend the existing `progressionRepository()`-style factory
   with an `economyRepository()` / `isEconomyDurable()` pair, mirroring the established pattern).
3. **Dependencies:** Phase 1. A locally-migrated Postgres instance to develop against — already
   available via `scripts/economy/verifyEconomySchema.mjs`'s embedded-postgres harness, no new
   infrastructure needed for dev.
4. **Risks:** **Medium-High.** The error-mapping-by-message-string approach (blueprint §1.2) is
   brittle by construction: if a future migration edit changes a `raise exception` message's
   wording without a corresponding update here, that error silently degrades to
   `EconomyInfrastructureError` — a business-rule failure being misclassified as an outage. This
   is the single most important thing Phase 4 must catch before this ships.
5. **Test strategy:** Cannot be meaningfully unit-tested in isolation (it's a thin wrapper over a
   real RPC call) — its correctness claim is entirely deferred to Phase 4's shared contract suite,
   run against a real local Postgres (reusing the embedded-postgres harness, not a new one).
6. **Rollback strategy:** Delete the file and the factory addition; `InMemoryEconomyRepository`
   remains the only implementation, so nothing regresses for anything not yet wired to
   `economyRepository()`.
7. **Verification gates:** Every named error class in Phase 1 has a corresponding real-database
   test proving the actual Postgres exception message is correctly mapped — not assumed from
   reading the SQL, actually triggered and caught.
8. **GO/NO-GO:** GO only once every error-mapping test in Phase 4 passes against a real database,
   not just against the in-memory implementation. This is the phase most likely to reveal a real
   bug (a missed or misworded error mapping) — treat a first-attempt failure here as expected, not
   alarming.

---

## Phase 4 — Repository Contract Tests

1. **Objective:** One shared test suite, run against BOTH Phase 2 and Phase 3, proving they are
   behaviorally identical from a caller's perspective — mirrors
   `server/src/persistence/__tests__/repositoryContract.test.ts`'s existing role for
   `ProgressionRepository`.
2. **Files touched:** `server/src/persistence/__tests__/economyRepositoryContract.test.ts` (new).
3. **Dependencies:** Phases 1, 2, 3 all complete.
4. **Risks:** **Low for the phase itself, high-value for everything downstream.** The risk isn't
   in writing this phase — it's the cost of NOT having it: every subsequent phase (5 onward)
   implicitly trusts that the repository behaves identically regardless of which implementation is
   active. Skipping or under-scoping this phase would let that trust be unfounded.
5. **Test strategy:** IS the test strategy for Phases 2–3. Required coverage, each traceable to an
   already-proven database-layer fact (blueprint §1.5 table): idempotent replay for every mutating
   method: exactly-one-applied under concurrency for the five scenarios already proven at the SQL
   layer (starter grant, commit, settlement, refund, redemption); `INVALID_IDENTITY_KIND` leaves
   zero trace; every named error class is reachable through both implementations.
6. **Rollback strategy:** Delete the test file — has no production code of its own to roll back.
7. **Verification gates:** 100% of the suite passes against BOTH implementations, run in the same
   CI job (not two separately-passing jobs that could drift apart over time without anyone
   noticing) — matches how the progression contract suite is already wired.
8. **GO/NO-GO:** **This is a hard gate for the entire rest of the roadmap.** NO-GO on any phase
   from 5 onward if this suite has a single known failure, skip, or a real-database run that
   hasn't been executed in the current CI run (a suite that only ever runs against the in-memory
   implementation has silently stopped gating Phase 3 at all).

---

## Phase 5 — `EconomyService`

1. **Objective:** Validation-before-the-database, error-to-outcome mapping, and retry policy
   (blueprint §2) — the one layer with real new business logic in the whole backend build.
2. **Files touched:** `server/src/economy/EconomyService.ts` (new),
   `server/src/economy/__tests__/EconomyService.test.ts` (new).
3. **Dependencies:** Phase 4 passing (the repository must be trusted before a service is built on
   top of it — building this in parallel with Phase 4 risks discovering a repository bug through a
   confusing service-layer test failure instead of a direct contract-test failure).
4. **Risks:** **Medium.** The retry policy (infra-errors-only, one retry, 250ms backoff) is new,
   untested-elsewhere behavior — the specific risk is retrying something that LOOKS like an infra
   error but is actually a masked business-rule failure (the same message-mapping brittleness as
   Phase 3, one layer up).
5. **Test strategy:** Unit tests against `InMemoryEconomyRepository` only (no real database needed
   at this layer — that trust was already established in Phase 4). One test per validation rule
   and per failure-scenario mapping in blueprint §2.1–2.6; a specific test injecting a fake
   `EconomyInfrastructureError` to prove the one-retry-then-surface behavior, and a fake
   `WalletFrozenError` to prove it is NEVER retried.
6. **Rollback strategy:** Delete the file; nothing outside `server/src/economy/` depends on it
   yet.
7. **Verification gates:** Every validation rule in blueprint §2 has a test; the retry-vs-no-retry
   distinction is explicitly tested for at least one error of each kind, not just happy-path.
8. **GO/NO-GO:** GO if the unit suite is green AND a manual read-through confirms no method
   silently swallows an error class Phase 1 defined (every thrown error from the repository must
   surface as SOME defined outcome at this layer, not disappear into a generic catch).

---

## Phase 6 — Wallet APIs

1. **Objective:** `GET /api/economy/wallet`, `GET /api/economy/ledger` (blueprint §3), reusing the
   **existing** `requireIdentity` middleware verbatim.
2. **Files touched:** `server/src/economy/EconomyController.ts` (new — wallet routes only in this
   phase); `server/src/index.ts` (one new line, mirroring the existing
   `app.use("/api/admin/dashboard", createDashboardRouter())` pattern at line 198:
   `app.use("/api/economy", createEconomyRouter())`).
3. **Dependencies:** Phase 5.
4. **Risks:** **Low.** Thin, read-only, no new auth mechanism, follows an existing controller
   shape exactly.
5. **Test strategy:** Route-level tests (supertest-style, matching this codebase's existing
   controller test convention) for: 200 with a valid identity, 401 with none, pagination
   boundaries on `/ledger` (`limit`/`offset` defaults and the `max 100` clamp).
6. **Rollback strategy:** Remove the two route registrations and the one `app.use` line — the
   service and repository layers underneath are untouched and keep working for Phase 9's
   in-process caller.
7. **Verification gates:** Route tests green; a manual check that NO route in this file is
   reachable without `requireIdentity` (a missing middleware line on one route is the realistic
   failure mode here, not a logic bug).
8. **GO/NO-GO:** GO if route tests pass and the manual auth-coverage check finds zero
   unprotected routes.

---

## Phase 7 — Voucher APIs

1. **Objective:** `POST /api/economy/vouchers/redeem` (blueprint §3), plus the raw-code hashing
   helper that must exist before this endpoint can safely accept client input.
2. **Files touched:** `server/src/economy/EconomyController.ts` (add one route to the file Phase 6
   created); `server/src/economy/voucherCrypto.ts` (new — HMAC hashing only, no code
   *generation*, since Economy V1 never generates a raw code, per `economy-v1.md` §3.1).
3. **Dependencies:** Phase 6 (same file — sequencing after 6 avoids a file-creation conflict, not
   a functional dependency); Phase 5's `redeemVoucher` method.
4. **Risks:** **Medium-High — this is the phase with the sharpest security requirement in the
   entire backend build.** The raw code must never be logged, never appear in an error response
   body, never be persisted anywhere outside the immediate hash computation. A single misplaced
   `logger.info({ req.body })`-style line anywhere in this request's path is a real credential
   leak, not a cosmetic bug.
5. **Test strategy:** Route tests for the three failure payloads (blueprint §3's merged
   not-found/redeemed/cancelled message, the distinct `WalletFrozen` message, the `requireMember`
   403); a **dedicated log-audit test** that asserts no log line emitted during a redemption
   request contains the raw code string — not a standard test category elsewhere in this roadmap,
   deliberately called out here because of what this endpoint specifically handles.
6. **Rollback strategy:** Remove the one route from `EconomyController.ts`; `voucherCrypto.ts` has
   no other consumer yet and can be deleted too.
7. **Verification gates:** Route tests green; log-audit test green; a manual code-review checklist
   item (not automatable) confirming `voucherCrypto.ts`'s hash function is never called with
   anything that gets `console.log`'d or included in a thrown `Error`'s message anywhere in its
   call chain.
8. **GO/NO-GO:** NO-GO if the log-audit test is missing, not just if it fails — its absence is
   itself a finding for this specific phase, given what §3's design says about this exact risk.

---

## Phase 8 — Checkout APIs

1. **Objective:** `POST /api/economy/checkout/quote` (blueprint §3, §2.2) — the one endpoint whose
   result is explicitly, deliberately non-authoritative.
2. **Files touched:** `server/src/economy/EconomyController.ts` (add the third and final route).
3. **Dependencies:** Phase 6/7 (same file, sequencing only); Phase 5's `quoteMatchCheckout`.
4. **Risks:** **Low-Medium.** The main risk is copy-drift: if the seat-count validation here (422
   for out-of-range) doesn't match `commitMatchEntry`'s own validation exactly, a client could see
   a quote succeed and a subsequent commit fail for a reason the quote should have already caught.
5. **Test strategy:** Route tests for the 1–5 seat-count boundary (0, 1, 5, 6 specifically); a test
   proving the response shape omits zero-value placements per blueprint §6.2 (e.g. a 2-seat quote
   has no non-zero `secondPlace`).
6. **Rollback strategy:** Remove the one route; nothing else in the backend build depends on this
   specific endpoint (Phase 9's RoomManager integration calls `EconomyService` directly, not this
   HTTP route — see Phase 9's dependency note).
7. **Verification gates:** Route tests green; the seat-count boundary matches
   `commit_match_entry`'s own `1 and 5` check exactly (cross-checked against the migration text,
   not re-derived from memory).
8. **GO/NO-GO:** GO if boundary tests pass. **This completes the backend API layer** — Phases
   6–8 together are the natural point to pause and confirm the whole `EconomyController.ts` file
   has zero unauthenticated routes before proceeding to the highest-risk phase.

---

## Phase 9 — RoomManager Integration

1. **Objective:** Wire `EconomyService` into `startGame`/`finalizeMatch`/`abandonRoom` per the
   exact sequence diagrams in blueprint §4 — the `STARTING`-state pre-commit flow, fire-and-forget
   settlement/refund after the existing synchronous functions.
2. **Files touched:** `server/src/rooms/RoomManager.ts` (the Room interface additions from
   blueprint §4.6, the new async pre-commit entry point, the appended settlement/refund calls);
   `shared/lifecycle.ts` (the one additive transition identified in blueprint §4.1–4.2:
   `STARTING → READY_CHECK`); `server/src/sockets/index.ts` (repoint the `room:startGame` handler
   at the new async entry point instead of calling `startGame` directly, per blueprint §4.2).
3. **Dependencies:** Phase 5 (`EconomyService`) — **explicitly NOT Phases 6–8**, since RoomManager
   calls the service in-process, never over HTTP. This is worth stating plainly: Phase 9 can begin
   as soon as Phase 5 is done, in parallel with Phases 6–8 if desired, though this roadmap still
   recommends the API layer land first (§ Recommended Execution Order below) purely so Phase 9's
   engineer has a working, already-tested service to call rather than developing both at once.
4. **Risks:** **Highest in this entire roadmap, by a wide margin.** Concrete, sourced reasons, not
   generic caution:
   - `finalizeMatch` has **6 internal call sites** (verified this session: `RoomManager.ts` lines
     836, 1325, 1566, 1740, 2424, 2768) — every one needs re-confirmation that appending a
     fire-and-forget call at the end doesn't change existing synchronous behavior any of them rely
     on.
   - `startGame` has **exactly one production call site** (`server/src/sockets/index.ts:173-175`)
     but the new pre-commit wrapper this phase introduces changes what that handler calls — every
     test that currently calls `roomManager.startGame(...)` directly (11 test files found this
     session: `scaleValidation`, `chaosVerificationPipeline`, `chaosScenarios`, `stressLoops`,
     `observabilityEndpoints`, `roomLifecycle`, and others) will need to either keep working
     against the old synchronous method unchanged, or be updated to go through the new async path
     — this needs an explicit decision, not an assumption, before this phase starts.
   - The single hardest invariant to accidentally violate: a match must never reach
     `IN_PROGRESS` without a resolved, successful `commitMatchEntry`. A single dropped `await` here
     silently reintroduces audit finding B6 in a new form.
5. **Test strategy:** The full existing RoomManager suite (103 test files project-wide, all
   currently green) must stay green throughout — treat any newly-broken existing test as a stop,
   not something to update to match new behavior, until it's confirmed the break is expected. NEW
   tests required for every branch in blueprint §4.2's sequence diagram: success path,
   `WalletFrozen` rejection (room returns to `READY_CHECK`, never touches `IN_PROGRESS`),
   `InsufficientFunds` rejection, an infra-error-then-retry-then-fail path, and a double-fire test
   (the `room:startGame` handler invoked twice in quick succession for the same room, proving
   `economyCommitPending` actually prevents a duplicate commit attempt).
6. **Rollback strategy:** **This phase needs an explicit feature flag**, not just a revertible
   commit — given the blast radius (every game start, for every game, goes through this code
   path), the recommendation is: gate the new pre-commit flow behind a boolean (e.g.
   `ECONOMY_ENTRY_ENFORCEMENT_ENABLED`), defaulting OFF, so a bad deploy can be disabled without a
   redeploy. This is the one phase in the roadmap where "revert the commit" is not considered a
   sufficient rollback strategy on its own.
7. **Verification gates:** All 103 existing server test files green; all new branch-coverage tests
   from §5 green; a manual load-test-adjacent check (reusing the existing `server/src/scale/` and
   `server/src/chaos/` suites, run once against the flag ON) proving no regression under the
   scenarios those suites already simulate.
8. **GO/NO-GO:** NO-GO if any existing test needs to change behavior it wasn't already testing
   (a test needing a NEW mock or setup line is fine; a test whose ASSERTION changes is a signal
   something about existing gameplay behavior shifted, and must be explained before proceeding, not
   just fixed). GO requires the feature flag mechanism to exist and be verified OFF-by-default
   before this phase is considered mergeable.

---

## Phase 10 — Wallet UI

1. **Objective:** Wallet Summary, Current Balance, Recent Transactions, Coin Animations (blueprint
   §5.1–5.3, §5.5 — voucher redemption is deliberately excluded here, see Phase 12).
2. **Files touched:** `client/src/store/economyStore.ts` (new); `client/src/components/economy/`
   (new directory — `WalletSummary.tsx`, `CurrentBalance.tsx`, `RecentTransactions.tsx`).
3. **Dependencies:** Phase 6 (Wallet APIs).
4. **Risks:** **Low.** Purely additive — a new screen/panel, not a modification to any existing
   gameplay surface. Worst case is a broken or empty-looking panel, not blocked gameplay.
5. **Test strategy:** Component tests for loading/populated/empty states; a manual browser QA pass
   per this project's standing convention (golden path + edge cases + adjacent-screen regression
   check) — this is explicitly required before this phase is called done, not optional.
6. **Rollback strategy:** Feature-flag or simply unmount the new component tree — no existing
   screen is modified, so removing these files removes the feature cleanly.
7. **Verification gates:** Component tests green; manual QA confirms the empty state (fresh wallet,
   starter grant pending) reads correctly rather than looking broken.
8. **GO/NO-GO:** GO if component tests pass and manual QA finds no regression on any screen this
   new UI is embedded into.

---

## Phase 11 — Checkout UI

1. **Objective:** Match Checkout Modal and its four content sections (blueprint §6).
2. **Files touched:** `client/src/components/economy/CheckoutModal.tsx` (new); **four existing
   call sites need to route through it instead of emitting directly** —
   `client/src/pages/Room.tsx:582` and `:748`, `client/src/components/bhalyam/GameRoomSheet.tsx:515`
   and `:615` (all four confirmed this session via direct search — this is new information not in
   the earlier blueprint, which only discussed the server-side handler, not the client's own
   fan-out).
3. **Dependencies:** Phase 8 (Checkout API, for the quote); Phase 9 (RoomManager integration must
   already be live and flagged ON, since this modal's confirm button triggers the real
   debit-gated start flow — testing this UI against the OLD ungated `startGame` would validate the
   wrong behavior entirely).
4. **Risks:** **Medium-High, upgraded from the prior blueprint's "Medium" rating** specifically
   because of the four-call-site finding above. Two sub-risks: (a) missing one of the four call
   sites, leaving one path (likely the `GameRoomSheet.tsx` variants, which read like a
   different UI surface — perhaps a bottom-sheet/mobile presentation — from `Room.tsx`'s) able to
   start a match WITHOUT the new checkout confirmation at all; (b) the two components duplicating
   slightly different logic today (worth a brief audit of whether they're truly parallel or one is
   dead code, before deciding whether this phase touches two call sites or four).
5. **Test strategy:** The existing `roomJourney.test.tsx` (which already asserts `onStartGame` is
   called under specific conditions) must be extended, not replaced, to assert the modal appears
   BEFORE the emit rather than the emit firing directly; a dedicated test enumerating all four
   call sites and confirming each now routes through the shared modal trigger rather than calling
   `socket.emit("room:startGame")` inline.
6. **Rollback strategy:** Revert the four call sites to their direct-emit form; the modal component
   itself can remain unmounted/unused without harm. Recommend pairing this with Phase 9's feature
   flag — when the flag is OFF, this UI should not appear at all (skip straight to the legacy
   direct-emit behavior), so the two phases fail (or roll back) together, never independently.
7. **Verification gates:** All four call sites confirmed routed (not three, not "the main one");
   the extended `roomJourney.test.tsx` suite green; manual QA of every state in blueprint §6.5
   (sufficient funds, insufficient funds, and specifically the race where a quote succeeds but the
   subsequent real commit fails anyway — must be tested, since it's the one path most likely to be
   forgotten).
8. **GO/NO-GO:** NO-GO until the call-site audit in Risk (b) above is explicitly resolved — this
   phase must not proceed on an assumption about how many places need the change.

---

## Phase 12 — Voucher UI

1. **Objective:** Voucher Redemption form (blueprint §5.4), member-only.
2. **Files touched:** `client/src/components/economy/VoucherRedemptionForm.tsx` (new).
3. **Dependencies:** Phase 7 (Voucher API).
4. **Risks:** **Low-Medium.** Functionally low risk (additive, non-gameplay-blocking) but carries
   the same raw-code-handling sensitivity as Phase 7 one layer up — the input value must not be
   logged by any client-side analytics/error-reporting integration this codebase has wired
   (e.g. a generic "log all form submissions" telemetry hook, if one exists, must explicitly
   exclude this form — worth confirming during this phase, not assumed absent).
5. **Test strategy:** Component tests for the guest-vs-member conditional rendering (blueprint
   §5.4's "Create an account to redeem rewards" replacement state) and the generic
   not-redeemable failure message; a check (grep-based is sufficient) that no telemetry/analytics
   call in this component's file includes the raw code value.
6. **Rollback strategy:** Remove the component; no other file depends on it.
7. **Verification gates:** Component tests green; the telemetry-exclusion check passes.
8. **GO/NO-GO:** GO if both gates pass. This phase can run in parallel with Phase 10 or 11 — it has
   no dependency on either.

---

## Phase 13 — Admin Dashboard

1. **Objective:** The five read-only explorers from blueprint §7, backed by NEW admin-scoped
   aggregate read methods on `EconomyRepository` — mirroring `ProgressionRepository.ts`'s own
   "Admin-wide aggregates" section (its explicit comment: *"Unlike everything above, these are not
   scoped to one player"*), added here rather than in Phase 1 because they weren't needed until
   now.
2. **Files touched:** `server/src/persistence/EconomyRepository.ts` (extended — new methods, both
   implementations, both covered by Phase 4's suite retroactively extended);
   `server/src/admin/AdminEconomyController.ts` (new, `requireOperationalAuth`-gated, mirroring
   `DashboardController.ts` exactly); `client/src/pages/admin/economy/` (new directory, 5 explorer
   screens per blueprint §7.1–7.5).
3. **Dependencies:** Phase 4 (repository + contract tests — this phase's new aggregate methods
   need the SAME contract-suite discipline extended to cover them, not a separate, looser
   standard) rather than Phase 5, since these are cross-player reads the player-scoped
   `EconomyService` was never designed to serve.
4. **Risks:** **Low functionally, but this is the phase where the "strictly read-only, no
   adjustment actions" constraint is easiest to accidentally violate** — a well-meaning future
   addition of a "quick freeze" button during this phase's own build would be the most likely place
   for that constraint to erode, precisely because the surrounding UI makes it look like a natural
   next feature.
5. **Test strategy:** Route tests for the new `AdminEconomyController` endpoints (all `GET`,
   `requireOperationalAuth`-gated); an explicit test asserting the router registers **zero** `POST`,
   `PATCH`, `PUT`, or `DELETE` routes — an automated version of the code-review checklist item the
   earlier blueprint (Phase 7 note) only described as manual.
6. **Rollback strategy:** Remove the new repository methods (if unused elsewhere), the controller,
   and the admin routes/screens — fully isolated from player-facing functionality throughout.
7. **Verification gates:** Route tests green; the zero-mutation-route test green; manual QA
   confirming the Stale Settlements panel (blueprint §7.1) correctly surfaces a deliberately
   induced stale `COMMITTED` settlement in a test environment.
8. **GO/NO-GO:** NO-GO if the zero-mutation-route test is missing OR failing — same "absence is
   itself a finding" standard as Phase 7's log-audit test.

---

## Phase 14 — Production Readiness Testing

1. **Objective:** Not a new feature — a dedicated verification pass proving Phases 1–13 hold up
   under the same categories of stress this codebase already tests for everything else
   (`server/src/chaos/`, `server/src/scale/`, `server/src/reliability/` — all pre-existing,
   currently-passing suites), extended with economy-aware scenarios, plus the security review this
   roadmap has flagged gaps for along the way.
2. **Files touched:** `server/src/chaos/__tests__/economyChaosScenarios.test.ts`,
   `server/src/scale/__tests__/economyScaleValidation.test.ts`,
   `server/src/reliability/__tests__/economyStressLoops.test.ts` (all new, matching the naming and
   structure of their existing non-economy siblings) — no production application code changes
   expected from this phase; findings feed back into whichever earlier phase they implicate.
3. **Dependencies:** All of Phases 1–13 complete and individually GO'd.
4. **Risks:** **This phase's job IS to find risk — a phase that finds nothing is a signal to
   question the phase's own coverage, not a clean bill of health.** Specific things this roadmap
   has already flagged as unresolved and expects this phase to explicitly exercise: (a) the
   missing rate-limit on the voucher-redemption endpoint (blueprint §3, flagged not solved); (b)
   many concurrent `room:startGame` events across many rooms simultaneously, to prove Phase 9's
   per-match advisory locking behaves the same way under application-level concurrency as it
   already does under the direct-SQL concurrency tests; (c) a chaos scenario that kills the server
   process mid-settlement, to prove `list_stale_committed_settlements` (Phase 13's dashboard panel)
   actually catches the resulting `COMMITTED`-forever row in practice, not just in the SQL-level
   test that already proved the function itself works.
5. **Test strategy:** Extend, don't replace, the existing chaos/scale/reliability methodology —
   this codebase already has a proven pattern for this category of testing; economy scenarios
   should be new test files following that same pattern, not a new testing framework.
6. **Rollback strategy:** N/A — this phase produces findings and evidence, not shippable code. A
   finding here rolls back to whichever earlier phase it implicates, using THAT phase's own
   rollback strategy.
7. **Verification gates:** Every risk enumerated in item 4 has a corresponding test, and every one
   of those tests is green — not merely present. The rate-limit gap specifically must be either
   closed (a small addition to Phase 7's file) or explicitly and consciously accepted as a launch
   risk by whoever makes the eventual production-deployment decision — this roadmap does not make
   that call, it only ensures the gap can't be shipped unnoticed.
8. **GO/NO-GO:** This phase's own GO/NO-GO is the readiness assessment for the ENTIRE roadmap —
   see the Final Readiness Assessment below.

---

## Critical-Path Dependencies

```
Phase 1 ──▶ Phase 2 ──┐
        └─▶ Phase 3 ──┴──▶ Phase 4 (HARD GATE) ──▶ Phase 5 ──┬──▶ Phase 6 ──▶ Phase 7 ──▶ Phase 8
                                                              │                              │
                                                              └──▶ Phase 9 (flag-gated) ◀─────┘
                                                                        │
                                          Phase 10 ◀── Phase 6          │
                                          Phase 12 ◀── Phase 7          │
                                          Phase 11 ◀── Phase 8 + Phase 9 (BOTH required)
                                          Phase 13 ◀── Phase 4 (not 5 — admin reads bypass the service)
                                                                        │
                                                    Phase 14 ◀── ALL of the above
```

The one path worth naming explicitly: **Phase 4 is the sole hard gate for everything from Phase 5
onward** — every other dependency in this roadmap is "needs this phase's output," but Phase 4 is
"needs this phase's PROOF," which is a categorically stronger requirement and the reason it's
called out separately in its own GO/NO-GO above.

---

## Highest-Risk Work Items

1. **Phase 9 (RoomManager Integration)** — by a wide margin. Six `finalizeMatch` call sites, one
   `startGame` call site whose caller (the socket handler) must be repointed, 11+ existing test
   files calling `startGame` directly that need an explicit decision (not an assumption) about
   whether they still call the old synchronous method or the new async wrapper. The only phase in
   this roadmap requiring a feature flag as part of its rollback strategy rather than a plain
   revert.
2. **Phase 11 (Checkout UI)** — upgraded during this review from the earlier blueprint's plain
   "Medium" rating specifically because this session found **four** client-side
   `room:startGame` emit call sites, not one, across two components (`Room.tsx`,
   `GameRoomSheet.tsx`) that were not previously known to both exist. Missing one is a silent gap
   in the debit-gating guarantee Phase 9 exists to provide.
3. **Phase 3 (SupabaseEconomyRepository)** — the error-message-string mapping is inherently
   brittle; its risk is fully mitigated by Phase 4, but only if Phase 4 is actually run against a
   real database and not skipped in favor of the faster in-memory-only run.
4. **Phase 7 (Voucher APIs)** — narrow in scope but sharp in consequence: this is the one place in
   the entire backend where a logging mistake is a credential leak, not a bug ticket.

---

## Verification Checkpoints

- **After Phase 4:** the only point in the roadmap where "is the repository layer trustworthy" can
  be answered definitively — every later phase's own verification assumes this answer is yes.
- **After Phase 8:** the backend API surface is complete and independently testable end-to-end
  (wallet → voucher → checkout) with zero RoomManager risk yet introduced — a natural pause point
  to confirm the whole `EconomyController.ts` file has no unauthenticated route before the
  highest-risk phase begins.
- **After Phase 9 (with the flag OFF, then again with it ON in a controlled rollout):** the point
  at which this roadmap's single largest risk is either confirmed contained or not — recommend an
  actual staged/canary rollout here, not a single cutover, consistent with the earlier blueprint's
  own recommendation.
- **After Phase 13:** every constraint this whole multi-session effort has enforced from the very
  first hostile audit onward — no admin mutation capability — has a final, automated (not just
  documented) test proving it still holds.
- **After Phase 14:** the only point at which a genuine production-readiness claim (as opposed to
  a local-trial or design-readiness claim) could honestly be made — and even then, only for what
  Phase 14's scenarios actually covered, not as a blanket guarantee.

---

## Recommended Execution Order

1→2→3→4 (repository layer, Phase 4 is a hard gate)
5 (service layer)
6→7→8 (API layer, in this order purely to avoid file-creation conflicts in the shared controller
file)
9 (RoomManager, flag OFF at merge time, enabled in a later controlled rollout — not part of this
roadmap's own phase list, a deployment-time decision)
10 and 12 can run in parallel with each other and with 9, since neither depends on it
11 only after both 8 AND 9 are live (the one phase with a two-phase dependency, not one)
13 can start as early as immediately after Phase 4, in parallel with 5–9, since it depends on the
repository layer, not the service layer — the earlier blueprint's Phase 8 table did not surface
this parallelization opportunity
14 last, strictly after everything else, as the roadmap's own closing gate

---

## Final Readiness Assessment

**READY FOR IMPLEMENTATION PLANNING — roadmap complete, no open design questions remain.**

Every one of the 14 requested phases has a concrete objective, a real (not placeholder) file-path
plan grounded in this session's own source review, a specific risk assessment (three phases
carrying genuinely elevated risk for stated, sourced reasons — not a generic "be careful"), and a
GO/NO-GO standard specific enough to actually block a phase rather than rubber-stamp it. Two
findings surfaced during this roadmap's own construction that the prior blueprint did not have:
the `STARTING`-state correction (carried forward, unchanged) and the four-call-site
`room:startGame` finding (new — directly raises Phase 11's risk rating and adds an explicit
call-site-audit gate that didn't exist before). Nothing in this document authorizes writing code —
that decision, and the choice of which phase to start first, remains the user's.
