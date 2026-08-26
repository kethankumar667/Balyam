# Economy V1 — Approved UX Specification

> **Status:** GOVERNANCE-APPROVED DESIGN SPECIFICATION ONLY. No React, no CSS, no visual assets, no
> database/API/RoomManager changes. Nothing in this document has been implemented, committed, or
> pushed.
> **A note on sources #7–#8, stated plainly rather than glossed over:** Gemini's two source
> documents ("original UX proposal" and "UX refinement report") do not exist as files in this
> repository or anywhere accessible to this review — a repo-wide search for them
> (`Gemini`, `Ceremonial Seat Ring`, `Sovereign Table`, `Ashtha-Kona`) returned no matches outside
> unrelated skill-plugin files. This specification is therefore built from the DISTILLED content
> the user supplied directly in this task — the approved-concepts list, the mandatory-corrections
> list, the approved sequences, and the user's own interim governance commentary (including the
> explicit flag on the "10-Second Deterministic Timeout State" item) — cross-verified against the
> sources this review DOES have full, direct access to: the frozen migration, the implementation
> blueprint, the implementation roadmap, `economy-v1.md`, and the Phase 1 repository specification.
> Where the user's distillation is unambiguous, it is treated as final. Where it implies a UI
> capability this session's own authoritative documents do not confirm, that item is classified
> **REQUIRES API CONFIRMATION**, not silently approved.

---

## 1. Governance Sources

| Priority | Source | Status this session |
|---|---|---|
| 1 | `supabase/migrations/20260826000000_economy_v1.sql` (frozen, audited, locally validated) | Full direct access — authored and verified across this multi-session effort |
| 2 | `docs/economy/economy-v1-implementation-blueprint.md` | Full direct access |
| 3 | `docs/economy/economy-v1-implementation-roadmap.md` | Full direct access |
| 4 | `docs/economy/economy-v1.md` | Full direct access |
| 5 | Final voucher security rules (`economy-v1.md` §3, §3.1, Phase 1 spec §3.2 `redeemRewardVoucher`/`issueGuestVoucher`) | Full direct access |
| 6 | Existing BHALYAM design system (DLS tokens, `.ludo-chip` treatment, coin-formatting conventions referenced in project history) | Referenced qualitatively; no token VALUES invented here — see §4 |
| 7 | Gemini's original UX proposal | **Not available as a file** — represented only via the user's distillation |
| 8 | Gemini's UX refinement report | **Not available as a file** — represented only via the user's distillation, including the interim commentary on the Timeout State item |

**Conflict rule applied throughout this document:** a lower-priority source never overrides a
higher one. Every approval below was checked against sources 1–5 specifically; where the user's
distillation (effectively standing in for sources 7–8) proposed something sources 1–5 do not
support, the item is downgraded — never silently kept at face value because it "sounded approved."

---

## 2. Approved Creative Direction

| Concept | Classification | Constraint (if any) |
|---|---|---|
| The Sovereign Table (framing match entry as hosting, not paying a fee) | **APPROVED FOR V1** | Framing/copy and layout concept only — no schema or flow change; the underlying operation is still exactly `commitMatchEntry` |
| Ceremonial Seat Ring (illuminated seats + central pot, replacing a bare "4 × 100 = 400" line item) | **APPROVED FOR V1** | Visual/layout concept for the Checkout screen (§7) — must still surface the literal numbers somewhere in the same view for screen-reader and audit clarity; ceremony is additive presentation, not a replacement for legible numbers |
| Struck Coin Resonance | **APPROVED WITH CONSTRAINTS** | Visual/motion metaphor only (a "struck" glow/impact animation on credit events). Re-scoped per the "No audio requirements in V1" correction: no sound is part of this concept in V1. Any audio interpretation is **DEFERRED** |
| Pot Dissolution Ceremony (visible wallet → prize-pool flow, not a bare balance decrement) | **APPROVED FOR V1** | Motion concept for Checkout confirmation (§7) and Victory (§9) — gated entirely behind server confirmation, per the approved checkout sequence; never plays speculatively |
| Placement-scaled victory presentation (1st gets more presence than 4th, but every finisher gets a moment) | **APPROVED FOR V1** | Directly satisfies the "Respectful Non-Winner Summary" principle from the user's own commentary — see §9 |
| Perforated voucher and refund receipt (a torn-ticket visual motif for the voucher card and refund confirmation) | **APPROVED FOR V1** | Visual motif only; the voucher card's actual content constraints are governed entirely by §10 and §19, which take precedence over any visual treatment |
| Tabular coin numerals (fixed-width digit alignment for all coin amounts) | **APPROVED FOR V1** | A typography/formatting requirement, not a visual asset — applies everywhere a coin amount renders |
| Sticky mobile checkout action (Confirm button pinned to viewport bottom on narrow screens) | **APPROVED FOR V1** | See §13 |
| 320px vertical layouts | **APPROVED FOR V1** | Baseline minimum-width target for every screen in §6–§12 |
| Credit / Debit / Escrow / Refund text labels | **APPROVED FOR V1** | Mandated, not optional — every ledger-derived UI element must carry one of these four words (or their established synonyms already in `economy-v1.md` §4's taxonomy) as legible text, never color-only |
| Reduced-motion border-pulse alternatives | **APPROVED FOR V1** | See §16 |
| Ashtha-Kona visual signature | **APPROVED FOR V1** | Brand-identity motif — no geometry/asset specified here (would be a visual-asset decision, out of scope); this document approves its USE as BHALYAM's economy-specific signature, not its concrete rendering |
| Antique-gold and midnight visual identity | **APPROVED FOR V1** | Same treatment as above — approved as the palette DIRECTION; exact token values are source #6's authority, not invented in §4 |

---

## 3. Rejected or Deferred Concepts

| Item | Classification | Reason |
|---|---|---|
| Voucher expiry (any TTL, countdown, or "expires in" language) | **REJECTED** | `reward_vouchers` has no expiry column and no expiry logic anywhere in the frozen migration — this is not a V1 gap to design around, it is a fact about the schema |
| Raw voucher code in a URL, query parameter, QR payload, log line, analytics event, or telemetry payload | **REJECTED** | Query strings persist in browser history, server logs, and intermediary proxies; the repository layer itself (Phase 1 spec §1, §7 invariant 11) guarantees the raw code never reaches this layer at all — the UI must not reintroduce the leak one layer up |
| Disclosure of which account redeemed a voucher, to ANY audience including admin ops | **REJECTED, and corrects an earlier draft** — `docs/economy/economy-admin-dashboard-plan.md`'s Voucher Explorer mockup previously showed a "Redeeming Member" column with a real name (e.g. "p_9841284 (John)"). That specific detail is superseded here: the admin Voucher Explorer (§12) shows redemption STATUS and TIMESTAMP only, never the redeeming identity | A future, separately-approved support/fraud tool MAY need this — not granted here; would be its own governance decision, not inherited from this spec |
| QR scanner for voucher redemption | **REJECTED** | Redemption is deliberate manual entry (paste/type) only — see §10 |
| Social sharing CTA for a bearer voucher | **REJECTED** | A bearer voucher is a spendable credential; a first-class "share" affordance is a security anti-pattern regardless of how convenient it would be |
| CSV/JSON export from any admin explorer | **REQUIRES API CONFIRMATION** | No export endpoint exists anywhere in the API design (blueprint §3, Phase 1 spec) — an export button with no backing capability is a UI lie; do not ship the button until an endpoint exists |
| Manual "retry settlement" action anywhere in the UI | **REJECTED for V1** | No such RPC or endpoint exists (`economy-v1.md` §9 is explicit: no automatic sweep, and no manual-trigger endpoint was designed either). The Stale Settlements panel (§12) is READ-ONLY, full stop |
| "10-Second Deterministic Timeout State" (a UI countdown treating 10 seconds as a meaningful, guaranteed threshold) | **REQUIRES API CONFIRMATION** — the user's own interim review already flagged this correctly. No endpoint contract (Phase 1 spec, blueprint §2.3) defines a 10-second guarantee; `EconomyService`'s own retry policy is "one retry, 250ms backoff, then surface failure" — a materially different number with no fixed total ceiling stated anywhere. A UI hardcoding "10 seconds" as authoritative would be inventing a backend contract that does not exist. See §7's Loading/Error states for the interim, honestly-scoped alternative |
| Haptic feedback as a required, always-on system (a `HapticsManager` treated as a verified dependency) | **APPROVED WITH CONSTRAINTS** | Permitted ONLY as a progressive enhancement using the standard `navigator.vibrate` Web API where present, never as a claimed or required capability, never gating any flow, and never a new dependency |
| Audio feedback/requirements | **DEFERRED** | No audio requirement exists in V1 anywhere in this spec — "Struck Coin Resonance" (§2) is explicitly visual-only for this version |
| Standalone `W` / `C` / global `Enter` keyboard shortcuts | **REJECTED** | See §17 — no single-character shortcut may be global; every shortcut must be scoped to a focused component and must be disableable/remappable |
| Unverified WCAG AAA claims | **REJECTED as a claim** | This document targets WCAG 2.1 AA as a DESIGN GOAL only — no compliance level is asserted as achieved without measurement, per the explicit constraint. See §19 |
| Self-assigned "world-class" or similarly self-graded quality scores | **REJECTED** | None appear in this document |
| Any World Bank UI field not literally one of `base_fee_revenue`, `bot_prize_revenue`, `guest_escrow_liability`, `total_voucher_redeemed` | **REJECTED** | See §8 and §20 |
| Any admin mutation control (adjust balance, freeze/unfreeze wallet, cancel settlement, edit voucher) | **REJECTED** | Consistent with every prior phase of this effort — `economy-admin-dashboard-plan.md`'s already-corrected read-only posture, restated here as final |
| Concealing the World Bank / house fee from the checkout view | **REJECTED** | See §7 — the fee is always shown, in the same view as the prize pool, never on a secondary/hidden screen |
| Any success animation, balance countdown, or prize-pool count-up that plays before the server has confirmed the operation | **REJECTED** | The single most load-bearing sequencing rule in this entire document — see §7's Approved Checkout Sequence and §15 |

---

## 4. Final Economy Design Tokens

Token NAMES and SEMANTIC ROLE only — no hex values, no asset files. Concrete values are source
#6's (the existing BHALYAM design system's) authority, not invented here, per the "do not create
visual assets" constraint.

| Token (semantic name) | Role | Governance note |
|---|---|---|
| `--economy-credit` | Any inbound wallet movement (starter grant, match prize, voucher redemption) | Must pair with the literal word "Credit" or a specific label from §4's mandated taxonomy — never color-only |
| `--economy-debit` | Any outbound wallet movement (match entry commitment) | Same pairing requirement |
| `--economy-escrow` | Guest prize pending in voucher form — visually distinct from both credit and debit, since it is neither yet | Must pair with "Escrow" or "Pending" text |
| `--economy-refund` | Match refund restitution | Must pair with "Refund" text — never rendered identically to `--economy-credit`, since a refund and a prize are different facts a player should be able to tell apart at a glance |
| `--economy-antique-gold-accent` | Prize pool, checkout confirm affordance, victory presentation | Direction only — exact value from the existing DLS |
| `--economy-midnight-base` | Base surface for economy screens (Wallet, Checkout, Admin) | Direction only |
| `--economy-ashtha-kona-motif` | The brand geometric signature applied to economy-specific chrome (checkout dialog frame, voucher card border) | Motif USE approved; concrete geometry is a visual-asset decision, out of scope here |
| `economy-numeral` (typographic token, not a color) | Tabular/fixed-width numeral rendering for every coin amount displayed anywhere | Applies uniformly — Wallet, Checkout, Prize-Pool, Victory, Voucher, Admin |

No new token is invented for anything not already covered by §2's approved concepts — this section
is a naming/role scaffold for the existing DLS to fill in, not a new palette.

---

## 5. Final Component Inventory

Maps directly to the file plan already established in the implementation roadmap (Phases 10–13),
restated here as the UX-approved component boundary — no new files beyond this list are implied by
this specification.

| Component | Screen(s) it serves | Status |
|---|---|---|
| `WalletSummary` | §6 | APPROVED FOR V1 |
| `CurrentBalance` | §6 | APPROVED FOR V1 |
| `RecentTransactions` | §6 | APPROVED FOR V1 |
| `CheckoutModal` (Sovereign Table framing, Ceremonial Seat Ring) | §7 | APPROVED FOR V1 |
| `PrizePoolPreview` | §7, §8 | APPROVED FOR V1 |
| `WorldBankFeeDisclosure` | §7 | APPROVED FOR V1 — never omitted, see §3 |
| `InsufficientFundsView` | §7 | APPROVED FOR V1 |
| `PotDissolutionSequence` (motion only) | §7, §9 | APPROVED WITH CONSTRAINTS — server-confirmation-gated, see §15 |
| `VictorySummary` (placement-scaled) | §9 | APPROVED FOR V1 |
| `NonWinnerRecognitionCard` (Valiant Match / Most Captures / Longest Turn Streak pattern) | §9 | APPROVED WITH CONSTRAINTS — see §9's data-contract note; the SPECIFIC recognition categories must be sourced from real per-game telemetry the engines already expose, not invented per game ad hoc in the UI layer |
| `VoucherRedemptionForm` | §10 | APPROVED FOR V1 |
| `VoucherRevealCard` (perforated receipt motif) | §10 | APPROVED WITH CONSTRAINTS — see §10 |
| `RefundReceiptCard` (perforated motif) | §11 | APPROVED FOR V1 |
| `SettlementPendingIndicator` | §11 | APPROVED FOR V1 |
| Admin: `WorldBankOverview` | §12 | APPROVED FOR V1 — read-only |
| Admin: `WalletExplorer` | §12 | APPROVED FOR V1 — read-only |
| Admin: `VoucherExplorer` | §12 | APPROVED WITH CONSTRAINTS — redeemer identity removed, see §3 |
| Admin: `SettlementExplorer` | §12 | APPROVED FOR V1 — read-only |
| Admin: `LedgerExplorer` | §12 | APPROVED FOR V1 — read-only |
| Admin: `StaleSettlementsPanel` | §12 | APPROVED FOR V1 — read-only, no retry action |

---

## 6. Wallet Experience

**Screen: Wallet Summary**

- **Purpose:** Show the player their own current balance and recent activity — never anyone else's.
- **Data contract:** `GET /api/economy/wallet` → `CoinWalletRecord` (all coin fields are `string`,
  per Phase 1 spec §4 — the UI must format, never arithmetic-coerce, these values); `GET
  /api/economy/ledger` → paginated `CoinLedgerEntryRecord[]`.
- **Component hierarchy:** `WalletSummary` → `CurrentBalance` + `RecentTransactions`.
- **Primary action:** none (a summary view, not an action view) — voucher redemption lives in §10,
  deliberately separate.
- **Secondary action:** "View full history" (paginates `RecentTransactions` further, same
  endpoint, larger `limit`).
- **Loading state:** skeleton for balance + transaction rows; the balance number is never shown as
  `0` or blank while loading — a loading skeleton, never a misleading zero.
- **Empty state:** a fresh wallet with only the starter grant pending — this IS a legitimate,
  correctly-labeled state ("Your welcome coins are on the way"), not a generic "nothing here."
- **Error state:** a safe, non-technical message ("Couldn't load your wallet right now") with a
  manual retry the USER controls — no auto-retry loop.
- **Focus behavior:** on mount, focus is NOT stolen from whatever the player was already doing
  (this is a persistent panel, not a modal) — no `autoFocus`.
- **Screen-reader behavior:** balance changes are announced via a polite live region ("Balance
  updated: 1,850 coins") — never assertive/interrupting, since this is ambient state, not an alert.
- **Reduced-motion behavior:** the count-up/count-down animation (§15) is replaced by an instant
  value change plus the border-pulse alternative (§2, §16).
- **320px behavior:** `CurrentBalance` and `RecentTransactions` stack vertically; transaction rows
  truncate the description, never the amount (the number is always fully visible).
- **Desktop behavior:** may render side-by-side with other room/lobby chrome; no layout change to
  the component's own internal structure.
- **Security constraints:** balance is fetched fresh on mount and after any credit/debit event —
  never held as a locally-cached value described anywhere in copy or code comments as
  authoritative; the server response is the only truth this component ever asserts.
- **Implementation status:** APPROVED FOR V1.

---

## 7. Checkout Experience

**Screen: Match Checkout Modal (The Sovereign Table)**

- **Purpose:** Confirm a host's intent to commit coins to a match, using the approved checkout
  sequence exactly, before the actual debit is attempted.
- **Data contract:** `POST /api/economy/checkout/quote` → `MatchCheckoutQuote` (non-authoritative,
  explicitly labeled as such in copy, per `economy-v1.md` §6b); the actual commit happens via
  RoomManager's server-side call to `commitMatchEntry` (out of scope for this UI spec —
  the modal's Confirm action triggers the EXISTING `room:startGame` socket event, unchanged
  transport, per the implementation blueprint §4.2).
- **Component hierarchy:** `CheckoutModal` → Ceremonial Seat Ring (seat visualization) +
  `PrizePoolPreview` + `WorldBankFeeDisclosure` + balance-after preview + Confirm/Cancel.
- **Primary action:** Confirm — locks all controls immediately on press (per the approved
  sequence), then waits for server confirmation before any visual success state.
- **Secondary action:** Cancel — available at any point BEFORE Confirm is pressed; not available
  mid-submission (controls are locked, per the approved sequence's step 4).
- **Loading state (post-Confirm, pre-server-response):** an honest, indeterminate "Starting…"
  state — explicitly NOT a countdown implying a guaranteed resolution time (see §3's rejection of
  the 10-second timeout concept). If the operation takes long enough that a human would reasonably
  wonder if it's stuck, the copy may say "This is taking longer than usual" after a duration
  **TBD by an actual backend contract** — not fixed at 10 seconds by this document.
- **Empty state:** n/a (this screen requires an active room/lobby context to open at all).
- **Error state (approved failure sequence, exactly):** server does not confirm → balance remains
  visually unchanged → no success animation of any kind occurs → the exact safe error message
  surfaces (`WalletFrozen`, `InsufficientFunds`, or a generic infrastructure message — never a raw
  database error string) → Retry or Cancel is offered **only if the underlying action is actually
  safe to retry** (a fresh `commitMatchEntry` call with the same `matchId` IS safe — it's
  idempotent — so Retry is legitimately offerable here, unlike the settlement-retry case rejected
  in §3).
- **Focus behavior:** on open, initial focus lands on the dialog heading/summary (per the approved
  sequence's step 2) — NOT on the Confirm button, so a player cannot accidentally confirm by
  reflexively pressing Enter the instant the modal opens; the player must intentionally navigate to
  Confirm (step 3).
- **Screen-reader behavior:** the modal is announced as a dialog with its heading read first; the
  fee (World Bank cut) and prize pool are both in the normal reading order, never visually-present
  but reading-order-hidden; the post-Confirm locked state is announced ("Processing your entry —
  please wait").
- **Reduced-motion behavior:** the Ceremonial Seat Ring's illumination and the Pot Dissolution
  sequence both reduce to the border-pulse alternative (§16) — the underlying state changes
  (seats shown, cost shown, balance-after shown) are never SOLELY conveyed by the animation, so
  reduced motion loses nothing informational, only the flourish.
- **320px behavior:** the sticky mobile checkout action (§2, §13) pins Confirm/Cancel to the
  viewport bottom; the seat ring and prize-pool preview scroll above it.
- **Desktop behavior:** Confirm/Cancel render inline within the dialog's own bounds, not pinned —
  the sticky-footer treatment is a narrow-viewport-specific accommodation, not a universal one.
- **Security constraints:** the quote fetched on open is NEVER treated as authoritative for the
  actual commit — the balance-after preview is explicitly labeled a projection; World Bank fee is
  always shown in the SAME view as the prize pool, never behind a secondary disclosure (§3).
- **Implementation status:** APPROVED FOR V1, with the Loading-state duration language above
  explicitly marked REQUIRES API CONFIRMATION until a real timeout/backoff contract is published.

---

## 8. Prize-Pool Experience

**Component: `PrizePoolPreview` (used inside Checkout §7 and Victory §9)**

- **Purpose:** Show what the current seat count's prize schedule actually pays, and where the rest
  of the money goes — never conceal the house cut.
- **Data contract:** `MatchCheckoutQuote.projectedPrizePool` (checkout context) or the settled
  `MatchEconomySettlementRecord`'s `totalWalletRewarded`/`totalGuestEscrow`/`totalBotCollection`/
  `totalWorldBankCut` fields (post-settlement context, §9/§11).
- **Component hierarchy:** a line-item list — 1st/2nd/3rd (only the placements the current seat
  count's schedule actually pays, per `economy-v1.md` §2.3's table) + World Bank cut, always
  present as its own line.
- **Primary action:** none (informational).
- **Secondary action:** none.
- **Loading state:** skeleton line items, count matching the seat schedule once known.
- **Empty state:** n/a — this component never renders with no schedule available (its parent
  screen wouldn't render it).
- **Error state:** if the quote fails to load, the parent Checkout screen's error state applies —
  this component itself doesn't have an independent error path.
- **Focus behavior:** not independently focusable — part of the parent dialog/screen's reading
  order.
- **Screen-reader behavior:** each line item reads as "First place: 200 coins," etc., with tabular
  numerals not affecting the announced text (numerals are a VISUAL alignment token, §4 — the
  accessibility tree gets the plain number).
- **Reduced-motion behavior:** n/a — this component has no motion of its own; count-up animation on
  the total, if any, is governed by the parent screen's motion rules (§15).
- **320px behavior:** line items stack full-width; amounts remain right-aligned via the tabular
  numeral token.
- **Desktop behavior:** may render as a compact card; same line items, no content change.
- **Security constraints:** the World Bank cut line is NEVER omitted, NEVER visually de-emphasized
  below a threshold that would functionally hide it (§3's "no concealed World Bank contribution").
- **Implementation status:** APPROVED FOR V1.

---

## 9. Victory Experience

**Screen: Match Completion / Placement-Scaled Victory Presentation**

- **Purpose:** Present the match outcome for every finisher, not only the winner — placement-scaled
  presence, with a genuine, non-generic acknowledgment for non-winning finishers.
- **Data contract:** the "match finished" broadcast (existing, unchanged transport) PLUS, once it
  resolves, the `economy:settled` broadcast the blueprint's Phase 9 design introduces (§4.3) — this
  screen must render the FIRST broadcast's information (placements, who finished where) BEFORE the
  second one arrives, since settlement is explicitly asynchronous and may take a moment. The reward
  amounts are NOT shown until `economy:settled` actually arrives.
- **Component hierarchy:** `VictorySummary` (placement-scaled, top finisher most prominent) +
  `NonWinnerRecognitionCard` per remaining finisher + `SettlementPendingIndicator` (shown between
  the two broadcasts) + `PrizePoolPreview` (post-settlement).
- **Primary action:** "Continue" / return to lobby (existing flow, unchanged).
- **Secondary action:** "Rematch," where already supported (existing flow, unchanged) — this
  document does not alter rematch behavior.
- **Loading state:** `SettlementPendingIndicator` — an honest, clearly-labeled "Rewards are being
  calculated" state, shown for the real gap between match-finished and `economy:settled` — never
  hidden, never implied to be instant.
- **Empty state:** n/a.
- **Error state:** if settlement never arrives within a session (the infra-retry-then-fail case,
  blueprint §4.3), the indicator changes to an honest "Rewards are still being confirmed — check
  your wallet shortly" message — NEVER a claim that the reward is guaranteed or will definitely
  arrive automatically (§3's rejection of guaranteed-auto-credit claims), and NEVER a retry button
  (no client-triggerable settlement retry exists, §3).
- **Focus behavior:** initial focus on the victory heading, not on any action button — mirrors the
  Checkout modal's own reasoning (§7) for the same class of accidental-activation risk.
- **Screen-reader behavior:** placements are announced in finishing order, not winner-then-silence;
  each `NonWinnerRecognitionCard`'s specific recognition (see below) is read as its own distinct
  statement, not lumped into a generic "you didn't win" announcement.
- **Reduced-motion behavior:** placement-scaled VISUAL presence (size/prominence) may remain
  (it's layout, not motion) — any entrance/count-up animation reduces per §15/§16.
- **320px behavior:** finishers stack vertically in placement order; the winner's card is visually
  first and largest, but every finisher's card is present and fully legible, none truncated to an
  icon-only summary.
- **Desktop behavior:** may render as a horizontal placement row; same content, no card omitted.
- **Security constraints:** guest winners' voucher information does NOT appear directly on this
  screen — the voucher reveal flow is a deliberate, separate action, §10 — this screen at most
  indicates "a reward voucher was created for you," never the code or its hash.
- **Implementation status:** APPROVED FOR V1, with one open item: `NonWinnerRecognitionCard`'s
  SPECIFIC categories ("Most Captures," "Longest Turn Streak," etc.) are **APPROVED WITH
  CONSTRAINTS** — each category must be backed by a real per-game statistic the relevant game
  engine already computes (verified per-engine, not invented uniformly across all 17 games); a
  category with no real backing data is **REQUIRES API CONFIRMATION** on a per-game basis, not
  approved wholesale.

---

## 10. Voucher Experience

**Screen: Voucher Redemption (member-only)**

- **Purpose:** Let a registered member redeem a bearer voucher code, per the approved voucher
  experience list exactly.
- **Data contract:** `POST /api/economy/vouchers/redeem` — request body field `code` (raw code,
  hashed server-side, per Phase 1 spec — never `codeHash` from the client); response is the merged,
  deliberately-non-disclosing outcome shape from the blueprint's §2.6/§3.
- **Component hierarchy:** `VoucherRedemptionForm` (member) OR a "Create an account to redeem
  rewards" replacement state (guest — mirrors `requireMember`'s 403 semantics as a UI affordance,
  per the blueprint).
- **Primary action:** Redeem (submit the entered code).
- **Secondary action:** none — no "scan," no "share," no "import" action of any kind (§3).
- **Loading state:** the submit button locks during the request; no premature success indication.
- **Empty state:** the form itself, with the input empty — no special empty-state treatment beyond
  a disabled submit until a value is entered.
- **Error state:** the single, deliberately-generic "This code isn't valid or has already been
  used" message for not-found/redeemed/cancelled — NEVER a more specific message that would
  disclose which of those three actually occurred (§3, restating the blueprint's own non-disclosure
  design); a DISTINCT message for `WalletFrozen` (the member's OWN account state, safe to disclose
  specifically).
- **Focus behavior:** initial focus on the code input field.
- **Screen-reader behavior:** the generic failure message is announced assertively (it's a direct
  response to a user action, unlike the Wallet's ambient balance updates); success is announced
  with the credited amount.
- **Reduced-motion behavior:** the credit event on successful redemption follows the Wallet's own
  reduced-motion rule (§6, §16) — instant value change plus border-pulse, no animated count-up.
- **320px behavior:** single-column form, full-width input and button.
- **Desktop behavior:** no structural change — same single-column form, optionally narrower/centered.
- **Security constraints:** this is the sharpest security surface in the whole specification,
  restated from §3 for completeness at the screen level: no raw code ever appears in a URL, a log,
  an analytics event, or a QR payload; no scanner exists; no share CTA exists.
- **Implementation status:** APPROVED FOR V1.

**Component: `VoucherRevealCard` — the downloadable voucher card itself (perforated receipt motif)**

- **Purpose:** Let a GUEST who just won a voucher (i.e., the ISSUING side, not the redeeming member)
  see and optionally save their own raw code — the one place in this entire specification a raw
  code is permitted to exist client-side at all, and only after deliberate action.
- **Data contract:** the raw code is present in the settlement acknowledgment ONLY at the moment of
  issuance (`economy-v1.md` §3 — "transient ack") — this card is the UI's one legitimate consumer
  of that transient value; it is never re-fetched from any endpoint afterward (there is no endpoint
  that returns a raw code, ever, by design).
- **Component hierarchy:** `VoucherRevealCard` — code hidden by default (masked), a deliberate
  "Reveal code" action, then Copy and "Download card" actions, both AFTER reveal.
- **Primary action:** Reveal (a genuinely separate click/tap from whatever screen led here — not
  auto-revealed).
- **Secondary action:** Copy code (post-reveal); Download card (post-reveal, local file only — no
  network upload of the rendered card).
- **Loading state:** n/a — the value is already in hand from the settlement ack, no fetch occurs.
- **Empty state:** n/a.
- **Error state:** n/a for this component specifically (it has no server round-trip of its own).
- **Focus behavior:** the Reveal action is a standard focusable button — no auto-reveal on mount,
  no reveal-on-hover (hover has no keyboard/touch equivalent).
- **Screen-reader behavior:** the masked state announces as "Voucher code hidden — activate Reveal
  to show it"; once revealed, the code is announced as a full, unambiguous character sequence
  (not abbreviated), immediately followed by the bearer warning below.
- **Reduced-motion behavior:** the reveal transition (if any) has no informational content in its
  motion — reduces to an instant show/hide with no loss.
- **320px behavior:** the card, code, and both post-reveal actions stack vertically, full width.
- **Desktop behavior:** no structural change.
- **Security constraints (the load-bearing ones for this component specifically):**
  - The bearer warning ("Anyone who has this code can redeem it — treat it like cash") is **always
    visible**, both before and after reveal, not just at the moment of reveal.
  - The downloaded card file contains the raw code ONLY because the user took the explicit
    "Download card" action AFTER already revealing it — there is no path to a download containing
    the code without that two-step deliberate sequence.
  - No sharing CTA exists on this card, anywhere (§3).
  - The rendered card/download is a client-side-only artifact — nothing about generating it
    involves a network request that could log the code.
- **Implementation status:** APPROVED FOR V1.

---

## 11. Refund and Settlement States

**Component: `RefundReceiptCard` (perforated motif) + `SettlementPendingIndicator`**

- **Purpose:** Communicate refund outcomes and in-flight/stale settlement states honestly — no
  claim of automatic reconciliation, no claim of a guarantee this spec's own backend doesn't make.
- **Data contract:** the settlement's `status`/`refundReason`/`totalRefunded` fields
  (`MatchEconomySettlementRecord`, Phase 1 spec).
- **Component hierarchy:** `RefundReceiptCard` (a completed refund) — distinct from
  `SettlementPendingIndicator` (§9's in-flight state) — these are two different states, never
  merged into one ambiguous "processing" visual.
- **Primary action:** none (informational receipt).
- **Secondary action:** none — critically, **no "retry" action anywhere on this card**, since no
  retry endpoint exists (§3).
- **Loading state:** n/a for a completed refund (by definition it already resolved); the PENDING
  case is `SettlementPendingIndicator`, covered in §9.
- **Empty state:** n/a.
- **Error state:** n/a — a `RefundReceiptCard` only ever renders for an already-successful refund;
  a failed refund attempt surfaces through the Checkout/RoomManager error path (§7), not this card.
- **Focus behavior:** not modal — appears inline in wallet history/match summary context, standard
  document reading order.
- **Screen-reader behavior:** reads as "Refund: 400 coins — [reason]" using the mandated "Refund"
  label (§2), never conflated with "Credit" text or styling.
- **Reduced-motion behavior:** no motion of its own beyond the shared credit-event treatment (§6,
  §16) if the refund just landed.
- **320px behavior:** full-width card, perforated motif as a border treatment only (no functional
  content depends on it rendering).
- **Desktop behavior:** no structural change.
- **Security constraints:** the refund reason text is server-supplied (from `refund_reason`) and
  rendered as plain text, never interpreted as markup — a standard XSS-safety requirement worth
  stating explicitly given this field's free-text nature at the database layer.
- **Implementation status:** APPROVED FOR V1.

---

## 12. Read-Only Admin Economy Experience

All five explorers share these constraints, stated once: **no mutation control of any kind, no
export unless/until an endpoint exists (§3), `requireOperationalAuth`-gated (existing mechanism,
unchanged).**

| Screen | Purpose | Data contract | Key constraint | Status |
|---|---|---|---|---|
| `WorldBankOverview` | The four real treasury balances, never merged | `WorldBankSnapshot` (`baseFeeRevenue`, `botPrizeRevenue`, `guestEscrowLiability`, `totalVoucherRedeemed`) | Exactly these four fields, four distinct cards — see §20 | APPROVED FOR V1 |
| `WalletExplorer` | Search/inspect a wallet, read-only | `CoinWalletRecord` + paginated ledger | `isFrozen` displayed, never toggleable | APPROVED FOR V1 |
| `VoucherExplorer` | Search/inspect vouchers by status | `RewardVoucherRecord` minus `redeemedByMemberId`'s identity resolved to a display name | **Redeemer identity never disclosed** (§3) — status/timestamp only | APPROVED WITH CONSTRAINTS |
| `SettlementExplorer` | Per-match financial breakdown | `MatchEconomySettlementRecord` + `reconcileSettlement` output | Conservation badge reuses the existing read-only RPC's own computation, never re-derived in the UI | APPROVED FOR V1 |
| `LedgerExplorer` | Cross-cutting ledger search | `coin_ledger_entries` + `world_bank_ledger` reads | Filter options limited to the REAL taxonomy (`economy-v1.md` §4) — no stale `GUEST_PRIZE_ESCROW`/`HOUSE_CUT` filter options | APPROVED FOR V1 |
| `StaleSettlementsPanel` | Surfaces `listStaleCommittedSettlements` output | `MatchEconomySettlementRecord[]` | **Read-only display, no retry/resolve action** (§3) | APPROVED FOR V1 |

Focus/screen-reader/reduced-motion/320px behavior for all five: standard data-table conventions —
sortable column headers are real buttons (keyboard-operable), no information conveyed by color
alone (status always has accompanying text), tables become horizontally scrollable (not
column-dropping) below their natural width, since dropping a financial column silently is worse
than requiring a scroll.

---

## 13. Mobile Specifications

- **320px is the hard minimum**, not a "looks okay down to ~360px" target — every screen in §6–§12
  must be reviewed at literally 320px before being called done.
- **Sticky checkout action (§2):** on the Checkout modal only, Confirm/Cancel pin to the viewport
  bottom; no other screen in this spec uses a sticky action bar — this is a Checkout-specific
  accommodation for its position in the critical "start a match" path, not a general pattern
  applied everywhere by default.
- **Tabular numerals apply identically on mobile** — no narrower, less-aligned numeral treatment on
  small screens.
- **No content is hidden behind a "see more" specifically to fit 320px** for anything security- or
  money-relevant (the World Bank fee, the bearer warning, the refund reason) — truncation is
  permitted for non-critical descriptive text only (§6's transaction-row truncation rule).

## 14. Desktop Specifications

- No screen in this spec requires a DIFFERENT information set on desktop versus mobile — desktop
  affordances (side-by-side layout, inline rather than sticky actions) are purely spatial, never a
  reason to show or withhold different data.
- Admin explorers (§12) may use desktop's extra width for additional visible table columns, never
  for a control that doesn't also conceptually exist (there is no "desktop-only mutation panel" —
  the read-only constraint is absolute across breakpoints).

---

## 15. Motion System

Motion is permitted ONLY for these specific, named events, and ONLY after the event it represents
has actually, authoritatively occurred server-side:

| Motion | Trigger (server-confirmed only) | Screens |
|---|---|---|
| Balance count-down | `commitMatchEntry` resolves successfully | §6, §7 |
| Prize-pool count-up | `commitMatchEntry` resolves successfully (checkout) OR `settleMatchEconomy`/`economy:settled` resolves (victory) | §7, §8, §9 |
| Coin-flight / Pot Dissolution animation | Same trigger as balance count-down — never plays speculatively while a request is in flight | §7 |
| Struck Coin Resonance (visual-only, §2) | Any confirmed credit event (starter grant, prize, refund, voucher redemption) | §6, §9, §10, §11 |
| Placement-reveal entrance | The match-finished broadcast (placements are known immediately; REWARD AMOUNTS are not — see §9's two-broadcast sequencing) | §9 |

**Hard rule, restated from §3 because it is the single most important one in this document:** no
motion in this table plays before its named server-side trigger has actually resolved. A network
delay means the motion is delayed — never played early on an optimistic assumption.

---

## 16. Reduced-Motion System

For every motion in §15, the `prefers-reduced-motion` alternative is a **border-pulse** (per the
already-approved concept, §2) — a single, brief emphasis treatment on the affected element's
border/outline, conveying "this changed" without conveying HOW it changed via movement. The
underlying value change itself (the new balance, the new prize-pool total) is never delayed or
altered by reduced-motion mode — only the transition's presentation changes, never the information
or its timing relative to the server confirmation.

---

## 17. Keyboard and Focus Model

- **No global, standalone single-character shortcuts** (`W`, `C`, a page-wide `Enter` hijack) exist
  anywhere in this specification (§3).
- **Every keyboard shortcut this spec DOES define is scoped to a focused component** and must be
  **disableable or remappable** — concretely, per screen: the Checkout modal's Confirm action is
  reachable via standard Tab-navigation-then-Enter/Space on the focused Confirm button, never via a
  shortcut active while focus is elsewhere in the document; the Voucher form's Redeem action is
  identical in this respect.
- **Initial focus placement, per screen** (already specified per-screen above, restated as a single
  cross-cutting rule): every modal/dialog-shaped screen in this spec (Checkout §7) places initial
  focus on the heading/summary, never on a submit-shaped control, specifically to prevent an
  accidental Enter-key confirmation the instant a screen opens.
- **Focus is never trapped without an escape** — every dialog-shaped screen supports a standard
  Escape-to-cancel path where Cancel itself is available (i.e., before submission locks controls,
  §7).

---

## 18. Screen-Reader Announcements

| Event | Announcement style |
|---|---|
| Ambient balance change (Wallet, not mid-checkout) | Polite live region — non-interrupting |
| Checkout locked/processing | Polite live region, explicit "please wait" framing |
| Checkout success | Assertive — a direct, user-initiated action's outcome |
| Checkout failure | Assertive, with the exact safe error message, never a generic "error occurred" |
| Voucher redemption failure | Assertive, using the deliberately-generic message (§10) |
| Voucher redemption success | Assertive, with the credited amount |
| Victory placements | Sequential, in finishing order, not winner-only |
| Non-winner recognition | Each category read as its own distinct statement (§9) |
| Admin explorer data load | Polite — background data population, not a direct response to a single discrete action |

No announcement in this table discloses anything §3 or §19 forbids disclosing (e.g., a voucher
redemption announcement never names WHO redeemed it, consistent with the admin surface's own
restriction).

---

## 19. Security and Privacy Requirements

Consolidating every security-relevant rule stated throughout this document into one place, as the
authoritative checklist for implementation review:

1. Raw voucher codes never appear in a URL, query parameter, QR payload, log line, analytics
   event, or telemetry payload, anywhere in this specification's scope.
2. The raw code is visible client-side in exactly ONE place (`VoucherRevealCard`, §10), only after
   deliberate reveal, sourced only from the transient settlement acknowledgment — never re-fetched.
3. The bearer warning on `VoucherRevealCard` is always visible, not conditional on reveal state.
4. No account identity is ever disclosed as "the redeemer" of a voucher, to any audience, anywhere
   in this specification, including the admin surface.
5. No client-cached balance, ledger entry, or settlement status is ever described in copy, a
   loading label, or a component name as authoritative — the server response is always the
   asserted source of truth, and staleness is acknowledged (loading/error states) rather than
   papered over.
6. No success motion or copy renders before the corresponding server confirmation, without
   exception (§15).
7. No admin screen in §12 exposes a mutation control of any kind.
8. No claim of automatic reconciliation, guaranteed auto-credit, or available manual settlement
   retry appears anywhere in this specification — the honest, bounded language in §9's error state
   and §12's `StaleSettlementsPanel` is the correct and only framing.
9. Refund reason text (server-supplied free text) renders as plain text only — never interpreted as
   markup or HTML.
10. This document targets WCAG 2.1 AA as a design GOAL. **No compliance claim, at any level, is
    made without actual measurement** — that measurement is explicitly out of scope for this
    specification and belongs to implementation-time verification (§21, §23).

---

## 20. API and Schema Alignment Matrix

Every UI data point in this document traced to its real source — no field invented that the Phase
1 repository specification / migration does not actually provide.

| UI element | Backing field/method | Source |
|---|---|---|
| Wallet balance | `CoinWalletRecord.balance` (`string`) | Phase 1 spec §2 |
| Ledger row label (Credit/Debit/Escrow/Refund) | `CoinLedgerEntryRecord.entryType` | Phase 1 spec §2, `economy-v1.md` §4 |
| Checkout quote | `EconomyService.quoteMatchCheckout` → `MatchCheckoutQuote` | Blueprint §2.2 |
| Checkout confirm | `commitMatchEntry` (via RoomManager, not directly by this UI) | Blueprint §4 |
| World Bank cards | `WorldBankSnapshot.{baseFeeRevenue, botPrizeRevenue, guestEscrowLiability, totalVoucherRedeemed}` | Phase 1 spec §2, §3.1 — exactly these four, no others |
| Voucher redemption | `POST /api/economy/vouchers/redeem` → `redeemRewardVoucher` | Blueprint §3, Phase 1 spec §3.2 |
| Voucher reveal (raw code) | Settlement acknowledgment's transient field — **not** a repository/API read method, by design (no such read exists) | `economy-v1.md` §3 |
| Settlement status | `MatchEconomySettlementRecord.status` | Phase 1 spec §2 |
| Stale settlements | `listStaleCommittedSettlements` | Phase 1 spec §3.1, `economy-v1.md` §9 |
| Frozen indicator | `CoinWalletRecord.isFrozen` (display only) | Phase 1 spec §2 |

No row in this table's UI column has a "requires new field" note — every element specified above
is already backed by an existing, approved method or field. Where an earlier section marked
something REQUIRES API CONFIRMATION (10-second timeout, CSV/JSON export, settlement retry), that
item is deliberately ABSENT from this matrix — it has no backing source to align to yet.

---

## 21. UX Acceptance Criteria

A screen from §6–§12 is considered UX-complete only when:

1. Every one of its 15 specified fields (Purpose through Implementation status) has been
   implemented as described, not partially.
2. No motion plays before its §15-mandated server trigger, verified by an actual network-delay
   test, not just visual inspection under fast local conditions.
3. The 320px layout has been checked at literally 320px, not approximated from a wider viewport.
4. Every coin amount renders with tabular numerals.
5. Every credit/debit/escrow/refund element carries its mandated text label, independent of color.
6. No security constraint listed in §19 is violated, checked via an explicit review pass for that
   screen specifically (a network-tab / log-output check for voucher-adjacent screens, per §7 of
   the Phase 1 spec's own testing standard).
7. Reduced-motion mode has been checked to convey the same information as full-motion mode.

---

## 22. Frontend Implementation Order

This section aligns with, and does not modify, the roadmap's Phases 10–13. Restated here only as
the UX-specific reading of that same order:

1. Wallet Experience (§6) — lowest risk, purely additive, unlocks visible testing of the
   credit/debit/escrow/refund labeling and tabular-numeral tokens early.
2. Voucher Experience (§10) — can proceed in parallel with the above; depends only on the Voucher
   API.
3. Checkout Experience (§7) — the highest-risk UI phase (per the roadmap's own risk rating,
   upgraded for the four real `room:startGame` call sites) — begins only once RoomManager
   integration is live and flagged on, exactly as the roadmap specifies; this document adds no new
   dependency beyond what the roadmap already established.
4. Victory Experience (§9) — depends on Checkout being live (a match must be startable through the
   new flow before its completion state is meaningfully testable end-to-end) and on confirming, per
   engine, which `NonWinnerRecognitionCard` categories are real (§9's REQUIRES API CONFIRMATION
   items).
5. Refund and Settlement States (§11) — can be built alongside Victory; shares the
   `SettlementPendingIndicator` component.
6. Admin Economy Experience (§12) — lowest risk, can start as early as the roadmap's own Phase 13
   window, independent of the player-facing phases above.

---

## 23. Verification Matrix

| Requirement | Verification method | Status |
|---|---|---|
| No raw voucher code in URL/QR/logs/analytics | Manual + automated log-audit test (already specified in the Phase 1/roadmap testing plan for the API layer; this UI spec inherits, not duplicates, that requirement) | PLANNED — not yet executed, no implementation exists |
| No success motion before server confirmation | Network-delay-simulated manual test per screen | PLANNED |
| WCAG 2.1 AA target | Automated + manual accessibility audit AFTER implementation — explicitly not claimed here | NOT YET MEASURED — no claim made |
| World Bank four-field accuracy | Cross-check against §20's matrix at implementation time | PLANNED |
| No admin mutation control present | The same "zero mutation-route" test standard already specified for the backend (roadmap Phase 13) extended to a UI-level assertion (no button/control renders that isn't backed by a `GET`) | PLANNED |
| 320px layout integrity | Manual device/viewport testing at implementation time | PLANNED |
| Redeemer-identity non-disclosure | Manual review of every admin screen's rendered fields against §3's rejection list | PLANNED |

No item in this matrix is marked verified — this document is a specification, produced before any
implementation exists, per the explicit constraint against claiming verification that hasn't
happened.

---

## FINAL VERDICT

**APPROVED FOR FRONTEND IMPLEMENTATION PLANNING**

Every approved creative concept from the governance input has a concrete, schema-aligned,
security-reviewed specification above, or an explicit constraint narrowing it to what V1 actually
supports. Every mandatory correction has been applied, including one correction to an EARLIER
document in this effort (`economy-admin-dashboard-plan.md`'s Voucher Explorer redeemer-identity
column, now removed) rather than merely avoided going forward. Two items — the 10-second timeout
state and per-engine non-winner recognition categories — are explicitly marked REQUIRES API
CONFIRMATION rather than approved on assumption, matching the standard this entire multi-session
effort has held itself to throughout. This specification does not itself begin implementation, and
authorizes none by its own authority — that remains the user's decision, informed by this
document's frontend implementation order (§22), which does not alter the already-approved backend
roadmap.
