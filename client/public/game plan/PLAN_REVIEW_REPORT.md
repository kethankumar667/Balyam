# PLAN_REVIEW_REPORT.md

**Formal Design Review — UNO Implementation Planning Documents**
**Reviewer posture:** Principal-level cross-functional design review (PM / Solution Architect / React Architect / Staff Engineer / Game Designer / TPM / QA Architect)
**Documents under review:**
- **Plan A** — `client/public/game plan/uno-plan-of-action.md` (444 lines) — a 12-phase (A–L) execution roadmap
- **Plan B** — `client/public/game plan/UNO_GAME_PLAN.md` (~700 lines) — a code-grounded product/design/engineering specification
**Verdict format:** every decision below is justified with evidence (file/line citations where applicable), not preference.

---

## 0. Framing note (read this before the matrix)

A rigorous review has to state its premise honestly: **Plan A and Plan B are not two competing architectural proposals for the same decision** (e.g., "Context API vs. a dedicated store"). They operate at different altitudes:

- **Plan A is a roadmap.** It sequences work into phases, defines exit criteria, maps dependencies, and lists risk categories. It makes almost no concrete technical decisions — no data models, no component names, no file paths, no state machines. Its unit of content is "Implement Wild Draw Four legality check" (one line).
- **Plan B is a specification.** It makes the concrete decisions Plan A defers — the exact state machine for UNO declaration, the exact TypeScript interfaces, the exact component table, the exact rule-by-rule verdict against the actual `UnoEngine.ts` source. Its unit of content is a fully-specified feature.

Forcing a false "Plan A vs Plan B, pick a winner" contest on every axis would produce a weaker review than the evidence supports. Where the two documents genuinely make overlapping claims (scope of "done", phase sequencing, risk identification, success metrics), this report picks a winner with justification, as instructed. Where one document simply has no content to compare (e.g., neither has a component table except Plan B), the report says so plainly instead of manufacturing a contest. This is itself a finding: **the two documents are complementary artifacts, and the biggest failure mode going forward is treating either one alone as sufficient.** The Final Master Plan in §6 fixes that by fusing them into one document with no seams.

---

## 1. EXECUTIVE SUMMARY

**Overall winner:** No single document wins outright — **the master plan (§6) supersedes both.** If forced to rank the two as they stand today, **Plan B is the stronger standalone artifact** (9 of 12 comparison-matrix areas), because it is falsifiable against real code, while Plan A is not falsifiable against anything — it is a sequencing document whose individual line items ("Implement house-rule toggles") cannot be checked for correctness without a specification like Plan B.

**Key findings:**
1. Plan A's biggest structural risk is **scope conflation** — it sequences Phase A–F (buildable today) and Phase G–L (ranked ladder, XP/coin economy, moderation infrastructure, analytics pipeline) as if they differ only in *order*, not in *kind*. Phase G–L require accounts, persistence, and matchmaking that **do not exist anywhere in the Bhalyam codebase for any game** — this is a platform-level dependency Plan A never states as a blocking precondition. A team reading only Plan A could reasonably plan a sprint for Phase H without realizing it's blocked on unbuilt platform infrastructure.
2. Plan B's biggest structural risk is **scope narrowness by design** — it explicitly defers all phase sequencing to Plan A ("This plan does not re-derive a new phase sequence") and confines itself to UNO's own files, so it inherits Plan A's dependency graph without auditing it, and it doesn't address server-side scalability, security trust boundaries, or ops/observability at all.
3. Both documents independently converge on the same rules-completeness gaps (Wild Draw Four legality/challenge, UNO declaration/penalty, scoring) — this convergence is a strong signal the *problem identification* is correct even though the two documents describe it at different resolutions.
4. **Neither document addresses production operability**: no feature-flag/rollout strategy, no telemetry event schema, no server-restart state-loss risk, no client-authority/trust-boundary audit, and no horizontal-scaling story. These are covered in §4 and folded into the master plan.

**Biggest strengths:**
- Plan A: phase dependency graph (§ "Dependency Order (Critical Path)") and the "Workstreams by Technical Layer" breakdown — a genuinely useful ownership/layering lens Plan B doesn't provide in the same shape.
- Plan B: everything is falsifiable against the actual `UnoEngine.ts`, `useUnoBoard.ts`, `uno-shared.tsx`, and `shared/types.ts` — exact line citations, a rule-by-rule verdict table, and complete TypeScript interface diffs for every proposed change.

**Biggest weaknesses:**
- Plan A: no concrete specification for any Phase B/C/D feature; the ranked/progression/moderation phases are not gated on the platform-level accounts/persistence work they silently require.
- Plan B: no server-scalability, security-boundary, or ops/observability content at all; explicitly outsources sequencing rather than owning it.

**Final recommendation:** Adopt the **Final Master Plan (§6)** as the single source of truth going forward. Retire neither source document — keep Plan A's dependency graph and layer-ownership framing, keep Plan B's rules matrix and component/state specs, but stop treating them as two separate references a developer has to reconcile mid-implementation. Add the four gap categories in §4 (feature flags, telemetry, trust-boundary audit, server-restart/scaling risk) before Phase B code review, not after.

---

## 2. DOCUMENT COMPARISON MATRIX

| Area | Plan A | Plan B | Winner | Reason |
|---|---|---|---|---|
| **Product Design** | Not present (references Volumes indirectly, no scoped vision) | §2 scopes Volume 1's pillars down to what's buildable without accounts | **B** | A has zero product-design content to evaluate; B correctly filters aspirational vision against real platform constraints |
| **UX** | Directional bullets only ("strengthen playable-card affordances", Phase E) | §7 full screen-by-screen (10 screens), §8 UX planning tied to real components | **B** | A's UX content is not actionable without a spec; B's is buildable as written |
| **Architecture** | "Workstreams by Technical Layer" — 7-layer ownership view, real and useful | §11 concrete folder structure (current + proposed), §10 component tree | **Split — merge both** | A's layering is a good organizing lens for team ownership; B's tree is what a developer actually opens a PR against. Master plan uses both. |
| **Components** | None | §12 full table: 13 existing + 7 new, each with responsibility and props | **B** | No contest — A has no component-level content |
| **State Management** | Names the fields needed at a sentence level ("Add options, challenge state, penalties, round history, cumulative scoring fields") | §13 full TS interface diffs for `InternalUnoState`, `UnoPublicState`, new move types | **B**, but credit A | B is the only one with a compilable spec; A's one good, distinct point — "keep backward compatibility strategy for phased deployment" — is **not addressed by B** and is pulled into the gap analysis (§4) |
| **Folder Structure** | None | §11 exact current tree + additive-only proposed files | **B** | No contest |
| **Scalability** | Addresses rollout scalability (alpha→beta→GA, "harden concurrency/race handling") but not infrastructure scalability | §18 addresses **client-side** render performance only; explicitly does not cover server horizontal scaling | **Neither — shared critical gap** | Both discuss different, narrower slices of "scalability" and both miss server-side horizontal scaling / in-memory-state limits entirely. Flagged as the single lowest-scoring axis in §7. |
| **Performance** | None | §18 concrete: memoized `Set` lookups, capped 56-card deal animation, inline SVG over image assets | **B** | A has no performance content |
| **Testing** | "Quality and Verification Plan" — good categorization (rule correctness / engine-integration / UI / accessibility / competitive integrity / retention-analytics) but no concrete test list | §20 concrete test list per engine method and edge case | **B, credit A's categories** | B is actionable; A's competitive-integrity and analytics-validation test categories are real and are folded into the master plan's testing section. **Correction:** an earlier draft of both documents claimed zero UNO server tests exist; `server/src/games/uno/__tests__/engine.test.ts` was missed during research (only `server/src/rooms/__tests__` was checked). It covers init/deal/draw/pass/removal/bot-automove but has no coverage of `play`, action-card effects, win detection, or deck composition — the actual rules-correctness gap stands, just narrower than originally stated. |
| **Edge Cases** | Implies an "edge-case policy table" as a Phase A deliverable but does not enumerate cases | §4.12 enumerates concrete edge cases with resolution notes, citing exact code | **B** | A defers the work B already did |
| **Documentation** | Itself a roadmap document; no other documentation strategy | Itself a spec document; no onboarding/API-reference strategy either | **Tie — both partial** | Neither proposes a living API/contract reference or developer onboarding doc; gap noted in §4 |
| **Maintainability** | States a strong, explicit principle: *"Extend current UNO implementation incrementally rather than rewriting"* (Final Execution Notes) | Implicitly follows the same principle throughout (§11, §13 both framed as "additive only") but never states it as a governing rule | **A states it better; B practices it better** | Master plan promotes A's sentence to a first-class governing constraint (§6.3) |

**Matrix score tally:** Plan B wins or is credited in 9/12 areas outright, 1/12 is a stated tie, 2/12 are shared gaps or split credit. This is not "Plan B is better" as a vague preference — it is the direct consequence of Plan B being falsifiable against code and Plan A not being.

---

## 3. SECTION-BY-SECTION ANALYSIS

### 3.1 Rules Completeness / Official Rule Gaps

**Plan A analysis**
- Strengths: Correctly identifies the same four gap categories (Wild Draw Four legality/challenge, UNO declaration/penalty, house-rule framework, multi-round scoring) in its "Current Baseline Summary" and Phase B action list.
- Weaknesses: No rule-by-rule verdict; "Implement Wild Draw Four legality check" is a task title, not a design. Doesn't cite the actual `isValidPlay()` code, so a developer reading only Plan A cannot tell that Wild Draw Four *currently returns true unconditionally* versus, say, "mostly works but misses one case."
- Risks: A developer could underestimate Phase B's size — the task list reads as ~7 bullets, but two of those bullets (challenge flow, declaration state machine) are each a full state-machine design.

**Plan B analysis**
- Strengths: §4.11's matrix gives a rule-by-rule verdict (🟢/🟡/🔴) with exact file/line citations (`UnoEngine.ts:226`, `:102`, scores never mutated, `turnDeadline` dead code). Catches things Plan A never mentions at all: the Wild-start-card default-to-Red deviation (§4.2), the untested 2-player Reverse-as-Skip coincidence (§4.4), and that the client-side `TurnTimeWarning` component is already wired to a field the server never sets.
- Weaknesses: None material — this is the section where Plan B is strongest.
- Risks: The proposed `unoDeclareDeadline`-as-advisory-not-enforcing design (§14.4) is a legitimate rules-fidelity interpretation, but it's a judgment call stated without an alternative considered (a hard-cutoff timer is simpler to implement and arguably still "fun" even if less official-rules-pure) — worth a one-line note that this was a deliberate tradeoff, not the only valid design.

**Final Decision:** **Plan B wins outright.** Retain B's entire rules matrix and state-machine designs verbatim in the master plan. Discard nothing from A here — A's gap *list* was directionally correct and is superseded by B's *precision*, not contradicted by it.

---

### 3.2 Phasing, Sequencing & Roadmap

**Plan A analysis**
- Strengths: The "Dependency Order (Critical Path)" section is genuinely good systems thinking — Phase B gates C/D/E/F, D+G+H gate I, I+G gate J, K depends on D+H, L depends on everything. This is exactly the kind of explicit dependency graph a multi-team rollout needs and neither document repeats it elsewhere.
- Weaknesses: The graph never marks **which phases are blocked on unbuilt platform infrastructure** (accounts, persistence, matchmaking) versus which are blocked purely on other UNO work. Phase H (Progression) and Phase I (Ranked) are drawn as if they're just "more UNO work down the dependency chain" — they are actually blocked on work that doesn't exist for *any* Bhalyam game yet. This is a real planning hazard: it invites someone to schedule Phase H the way they'd schedule Phase D, when Phase H first requires a platform-wide accounts/persistence initiative that isn't tracked anywhere in either document.
- Risks: Sprint planning derived directly from this graph without the platform-dependency caveat could commit a team to unstartable work.

**Plan B analysis**
- Strengths: Explicitly and repeatedly flags the accounts/persistence/matchmaking gap (§0.3, §3, §5) and tags every claim 🟢/🟡/🔴 by buildability, which is a stronger scoping discipline than Plan A's phase labels alone provide.
- Weaknesses: Because it defers to Plan A's phase graph wholesale ("use uno-plan-of-action.md's Phase A–L roadmap as-is", §22), it **inherits the ungated Phase H/I/J placement without correcting it.** B correctly diagnoses the platform-dependency problem in prose but doesn't go back and fix Plan A's dependency graph to encode that diagnosis structurally.
- Risks: A reader who only skims B's §22 table (mapping its own sections to A's phases) could still miss the platform-gating caveat that's stated elsewhere in the document.

**Final Decision:** **Neither plan fully wins.** Retain A's dependency-graph *mechanism* (it's the right tool) but require the master plan to redraw it with an explicit **platform-dependency gate** between Phase F and Phase G (see §6, §7). This is a new synthesis, not a pick-one decision — flagged accordingly.

---

### 3.3 State Management & Wire Contracts

**Plan A analysis**
- Strengths: Correctly identifies the categories of new state needed (options, challenge state, penalties, round history, cumulative scoring) and — uniquely — raises **backward compatibility for phased deployment** as an explicit concern ("Shared Types and Contracts" workstream). Plan B never addresses this.
- Weaknesses: Zero implementation detail. "Add ... fields" is not a contract.
- Risks: Without a concrete shape, two developers implementing Phase B and Phase C in parallel could each invent incompatible versions of "challenge state."

**Plan B analysis**
- Strengths: §13.4 gives compilable interface diffs for `InternalUnoState`, `UnoPublicState`, and the extended `UnoMoveType` union — a developer can start from this today.
- Weaknesses: Doesn't address what happens to an in-flight match if the server deploys a new contract mid-session (Plan A's point, unaddressed here). Given Bhalyam's rooms are in-memory and ephemeral (confirmed during research — no persistence layer exists), this is lower-stakes than it would be for a persistent-account game, but it's still a real deploy-time risk: a mid-match server restart during a Phase B rollout drops every active room's state regardless of contract versioning, which is actually a **bigger, unaddressed risk than the versioning question itself** (see §4).

**Final Decision:** **Plan B wins on substance** (its interfaces are what ships), but **Plan A's concern is legitimate and reframed, not discarded** — the master plan's Deployment section (§6.11) resolves it correctly: because state is already ephemeral and non-persistent, the real mitigation is *deploy between matches / drain in-flight rooms before restart*, not contract versioning. This is a better answer than either document proposed alone.

---

### 3.4 Game Modes & Product Scope

**Plan A analysis**
- Strengths: Phase C ("Game Options and Mode Framework") correctly scopes house rules to private rooms with a ranked lock.
- Weaknesses: Never states that Casual/Ranked/Party "modes" from the source volumes don't map onto any existing Bhalyam mode-selection UI — Bhalyam has one structural mode (a room code), not a menu of match types. A/L's later phases (matchmaking-adjacent language, e.g. "Match quality and queue times" in Phase K) implicitly assume a matchmaking system that isn't scoped as new work anywhere in the document.
- Risks: Overclaiming "modes" as if they're a UI feature to build, when they're actually zero new UI (room creation options) or a platform-level matchmaking system (doesn't exist).

**Plan B analysis**
- Strengths: §5 explicitly maps all six Volume-2 modes onto Bhalyam's actual single room-code structure and correctly concludes "don't build a UNO-only queue" — this is a scope-protecting decision that prevents wasted engineering.
- Weaknesses: None material.

**Final Decision:** **Plan B wins outright** and its conclusion (house rules as a room option, not a "mode") should be treated as binding product guidance, not just an opinion — it directly prevents the over-scoping risk visible in Plan A's Phase K language.

---

### 3.5 AI / Bot Opponents

**Plan A analysis**
- Strengths: Phase E/Workstream 5 states "Add difficulty tiers and strategy weighting… preserve fairness and human-like pacing" — correctly identifies the need.
- Weaknesses: Zero design. No tiers named, no hidden-information constraint stated.
- Risks: "Strategy weighting" without a hidden-information constraint stated explicitly could be implemented by a developer who has the bot read other players' actual hands (since the engine has that data in scope) — a real, uncaught fairness bug risk.

**Plan B analysis**
- Strengths: §15 defines three concrete tiers (Easy/Medium/Hard) with per-tier card-selection and color-choice logic, and explicitly states the hard constraint that bots may only reason over public information (`hand`, `handSizes`, `topCard`/`currentColor`) — directly closing the risk Plan A's vagueness leaves open.
- Weaknesses: Doesn't verify whether bot-move pacing/delay is handled by shared `RoomManager` infrastructure or needs UNO-specific work — flagged honestly as "verify, don't assume" rather than guessed.

**Final Decision:** **Plan B wins outright**, and its explicit hidden-information constraint should be called out in code review as a hard requirement, not a suggestion — this is exactly the kind of fairness bug a Bar Raiser-style review exists to catch before it ships.

---

### 3.6 Animation, Audio & Game Feel

**Plan A analysis**
- Strengths: Phase E correctly sequences "game feel" work after rules completeness, and cites Volume 8 requirements (motion spec, accessibility pass) as the target.
- Weaknesses: No inventory of what already exists vs. what's missing — a developer can't tell from Plan A that shuffle/deal/hover/turn-glow animations are **already built**, while card-travel, UNO-moment, and Wild+4-drama animations are **not**.
- Risks: Re-building already-complete work, or under-scoping the truly missing pieces, due to no current-state inventory.

**Plan B analysis**
- Strengths: §16 and §17 are literal inventories — every animation and every sound cue is marked built/partial/missing with a citation to the actual CSS keyframe or `AUDIO.*` constant, plus an explicit priority order for what to build next.
- Weaknesses: None material.

**Final Decision:** **Plan B wins outright.**

---

### 3.7 Success Metrics & Analytics

**Plan A analysis**
- Strengths: Categorizes metrics well (Core Experience / Retention / Competitive / Community Health / Progression) and Phase K explicitly calls for an "Instrumentation plan" and "Dashboards and alerting" as deliverables.
- Weaknesses: Every retention metric listed (D1/D7/D30, DAU/WAU/MAU) is **unmeasurable in the current architecture** because there are no accounts — Plan A never flags this, so the metrics section reads as achievable when roughly half of it is blocked on unbuilt platform infrastructure.
- Risks: A PM could report these as near-term OKRs without realizing they're structurally impossible until accounts ship.

**Plan B analysis**
- Strengths: §3 explicitly partitions metrics into "measurable now" (session/room-scoped, server-log derived) vs. "deferred" (needs accounts), and gives concrete near-term metrics tied to real events the engine already produces or will produce in Phase B.
- Weaknesses: Doesn't specify *how* these get instrumented (no event schema, no logging call sites) — states *what* to measure, not *how* to emit it.

**Final Decision:** **Plan B wins on scoping discipline**; **neither plan specifies an actual telemetry implementation** — this is a shared gap resolved in §4 and §6.11.

---

## 4. GAP ANALYSIS

### 4.1 Missing in Both Plans

| Gap | Why it matters |
|---|---|
| **Feature flags / staged rollout / kill switch** | Phase B changes core rule behavior (Wild+4 legality, UNO penalties) in a live, no-downtime-tolerant product. Neither plan proposes a way to ship this safely to a subset of rooms or roll it back without a full redeploy. No feature-flag system was found anywhere in the codebase during research — this is a genuine platform gap, not just a documentation gap. |
| **Telemetry/event-schema implementation** | Both plans *name* metrics to track; neither specifies the event payload shape, emission call sites, or a logging/analytics sink. |
| **Observability / error monitoring** | No logging conventions, error-tracking service (e.g., Sentry-equivalent), or structured-log format were identified or proposed by either document. A production rules bug (e.g., a malformed challenge-resolution state) would currently be invisible until a player reports it. |
| **Server-restart / in-memory state loss** | `RoomManager` holds all match state in memory with no persistence. Neither plan states this as a risk, even though Phase B adds *more* transient state (challenge windows, declare deadlines) that becomes more valuable to lose gracefully. Deploying the Phase B change mid-match currently means every active room silently dies. |
| **Client-authority / trust-boundary audit** | ✅ **Audited and confirmed safe (Foundation phase).** `RoomManager.applyMove(socketId, type, data, onBehalfOf?)` (`RoomManager.ts:632-655`) resolves the acting player from `this.lookup(socketId)` — the authenticated socket, never the client-supplied `playerId`. The payload's `playerId` (named `onBehalfOf` server-side) is honored only for the explicit pass-and-play proxy feature, and only when the calling socket's own player **is the room host** *and* the target seat is `isLocal === true`; any other proxy attempt is rejected with a `"Not allowed to play for that seat"` error and the move is dropped. No move-spoofing vector exists. Safe to proceed with Phase B's `declareUno`/`challenge` moves without further hardening here. |
| **Rate limiting on `game:move`** | Neither plan considers whether a malicious or buggy client can flood move submissions. Low severity today, but Phase B's timed windows (declare/challenge deadlines) make spam more attractive (e.g., spamming `catchUno`). |
| **Horizontal scaling / multi-instance Socket.IO** | Single-process, in-memory `RoomManager` — fine at current scale, unaddressed as a future constraint by either document. |
| **Bundle size / code-splitting per game** | Ten games now share one SPA; neither plan checks whether `UnoBoard` and friends are lazy-loaded per-route or bundled into the main chunk. As more games are added this compounds. |
| **API/contract reference & onboarding doc** | Neither plan proposes a living, generated reference for `shared/types.ts` — new contributors have to read the source directly. |
| **Internationalization** | Not addressed by either; should be an explicit, deliberate non-goal statement rather than a silent omission, since the product visibly targets an English-speaking audience today. |
| **Accessibility automated testing tooling** | Plan B's §19 lists accessibility *requirements*; neither plan names a tool (axe-core, Lighthouse CI) or a CI gate to enforce them continuously. |

### 4.2 Hidden Risks Neither Discussed

1. **Duplicate-seat / multi-tab exploitation** — can a player open two tabs and effectively see two players' state, or reconnect mid-match under a fresh identity to escape a losing position? Neither plan investigates Bhalyam's seat-identity model deeply enough to rule this out for UNO specifically.
2. **Clock-skew on the new deadline fields** — `turnDeadline` and the proposed `unoDeclareDeadline` are server-set epoch timestamps rendered client-side as countdowns. Reasonable assumption of synced clocks, but neither plan states it as an assumption or specifies a resync/drift-tolerance strategy.
3. **`uno-rail.tsx` vs. `InlineRoomRail.tsx` duplication** — Plan B notes this in passing (§7.7) as a "future consolidation candidate" but neither plan treats it as tracked technical debt with an owner or a decision to intentionally not consolidate. Silent duplication is how two components quietly diverge over months.
4. **Silent AI-fairness regression risk** — flagged in §3.5: without Plan B's explicit hidden-information constraint being enforced in code review (not just documentation), a future contributor implementing "Hard" tier could accidentally read opponents' real hands, since the engine object has that data in scope. This is a review-process gap, not just a design gap.
5. **Reduced-motion coverage is asserted, not verified** — both plans reference `prefers-reduced-motion` support as a requirement; neither confirms it's actually wired into `uno-deal.tsx`'s CSS-keyframe-driven animations today (Plan B flags this as a known gap in §19, correctly, but it's worth restating here as a *risk* — CSS keyframes don't automatically respect the media query unless explicitly gated).

### 4.3 Future Scaling Concerns

| Concern | Assessment |
|---|---|
| **Multiplayer support** | Already shipped (2–8 players). The real future scaling axis is *concurrent rooms*, not players-per-room — unaddressed by both plans (§4.1). |
| **Mobile support** | Already shipped as a dedicated shell. Native app wrapping is not pursued anywhere in the codebase; should be a stated non-goal, not a silent gap. |
| **New game modes (house rules)** | Well-served by Plan B's "room option, not a mode" pattern (§3.4) — this generalizes cleanly to future games and should become the platform convention, not a UNO-only decision. |
| **Technical debt carried forward** | `uno-rail.tsx` duplication (§4.2.3), thin server-side test coverage — `play`/action-cards/win/deck-composition are untested even though `init`/`draw`/`pass`/removal/bot-automove are (§3.1 corrected finding — neither plan treats closing this gap as launch-blocking for Phase 2, and it should), and the dead `turnDeadline`/`lastAction` fields (already-shipped code paying for data nobody reads yet). |

---

## 5. IMPROVEMENT OPPORTUNITIES

| Area | Current State | Weakness | Recommended Improvement | Expected Benefit |
|---|---|---|---|---|
| Rules engine | `UnoEngine.ts` plays a simplified subset of official UNO | Wild+4 has no legality/challenge, no UNO declaration exists, scoring is dead code | Ship §3.1's state machines behind a feature flag (new, §4.1), gated by the test suite in Plan B §20 | Official-rules-correct product; testable, reversible rollout |
| Deployment process | No feature flags, no drain-before-restart discipline found | A rule-behavior deploy mid-match currently kills live rooms silently | Add a `unoOptions`/contract-version gate and a "drain in-flight rooms before restart" deploy script | Zero silent match-loss during Phase B rollout |
| Bot fairness | Single fixed heuristic, no explicit hidden-info guard enforced in code | Future "Hard" tier could accidentally cheat by reading real opponent hands | Add a lint rule or code-review checklist item asserting bot logic only touches `hand`/`handSizes`/`topCard` | Prevents an entire class of fairness bug before it ships |
| Observability | No structured logging/error tracking identified for game-engine exceptions | A malformed challenge/declare state is currently invisible until a player reports it | Add structured server logs around `applyMove` failures + a lightweight error-tracking sink | Faster incident detection, real production confidence |
| Security/trust boundary | ✅ Audited (Foundation phase) — `RoomManager.applyMove` derives the acting player from the socket, not the payload; the payload `playerId` is only honored for host-controlled local (pass-and-play) seats, with an explicit authorization check | None — closed | N/A, no fix required | Confirmed safe to build Phase B's `declareUno`/`challenge` on the existing trust model |
| Testing | `server/src/games/uno/__tests__/engine.test.ts` covers init/deal/draw/pass/removal/bot-automove, but zero tests play a card | Rules-correctness — the product's own stated top priority (Volume 4) — is currently unverified for `isValidPlay`, every action-card effect, win detection, and deck composition | Extend the existing `engine.test.ts` with Plan B §20.1's play/action-card/win/deck coverage **before** any Phase 2 code change, not after | Prevents the single highest-probability regression class for this feature |
| Results screen | UNO falls through to a generic 90s scorecard modal | Weakest remaining UX moment relative to Rummy/Hand Cricket's bespoke results | Build `UnoResultModal` once scoring (Phase D) lands; can ship with placeholder art via the existing `IllustrationSlot` dev-fallback | Closes the single largest "feels premium" gap without blocking on art delivery |
| Documentation | Two separate, non-cross-referenced planning docs | Developers must reconcile A and B manually mid-implementation | Adopt this report's Final Master Plan (§6) as the canonical document; keep A and B as historical/appendix references only | One source of truth, no reconciliation tax on future contributors |

---

## 6. FINAL MASTER PLAN

*This is a new synthesis — not a copy of either source document. It fuses Plan A's phase-dependency discipline and layer ownership with Plan B's code-grounded specifications, and closes every gap identified in §4.*

### 6.1 Product Vision
UNO in Bhalyam is a fast, no-signup, room-code card game for 2–8 people that plays like *real* UNO — official-rules-correct, visually authentic (real card colors and symbols, not notebook-sketch abstractions), and wrapped in Bhalyam's existing cream/gold notebook identity. It is not a live-service product; there is no ranked ladder, no economy, and no persistence today, and this plan does not pretend otherwise. Success is a complete, correct, delightful *single-session* experience — depth beyond that (progression, ranking, community) is explicitly a platform-level initiative gated behind accounts/persistence work that is out of this plan's scope (§6.3).

### 6.2 User Flow
```
Home → Games catalog → Create/Join room (code) → Lobby (ready-up, [NEW] house-rule
toggles) → Shuffle+deal → Gameplay (play/draw/pass, [NEW] declare/catch/challenge)
→ Round end → [NEW] UnoResultModal → Rematch or Leave
```
No new routes. Every addition is a new state slice or component inside the existing `Room.tsx → UnoBoard` tree.

### 6.3 Governing Architectural Principle
*(Promoted from Plan A's Final Execution Notes, stated as a hard constraint, not a suggestion.)*
**Extend the current UNO implementation additively. Never restructure the existing wrapper-shell/single-hook/pure-helpers architecture to add a feature.** Every task in this plan must be expressible as: a new field on an existing interface, a new move type in the existing dispatch, a new component consumed by the existing shells, or a new pure helper file. If a proposed change doesn't fit that shape, stop and re-scope it — that is itself a signal the feature is bigger than currently understood.

**Platform-dependency gate (new — resolves §3.2's finding):** Phases mapped to Plan A's G–L (progression, ranked, moderation, analytics pipeline) are **not orderable sprint work today.** They are blocked on a platform-level accounts/persistence/matchmaking initiative that does not exist for any Bhalyam game. Do not schedule Phase G+ work until that initiative has its own design doc and is underway — track it as an explicit blocking dependency, not an implicit one.

### 6.4 Architecture
**Layer ownership (retained from Plan A, corrected for accuracy):**
1. Server engine & rule processing — `server/src/games/uno/UnoEngine.ts`
2. Shared contracts — `shared/types.ts` (`UnoCard`, `UnoPublicState`, `UnoPlayerState`, `UnoGameOptions` [new])
3. Room/socket orchestration — `server/src/rooms/RoomManager.ts`, `server/src/sockets/index.ts` (generic, cross-game — **trust-boundary audit required here, §4.1**)
4. Client boards & shared UI — `client/src/games/uno/**`
5. Bots — `applyAutoMove`/`pendingActors` in `UnoEngine.ts`, tiered per §6.6
6. Persistence — 🔴 does not exist; not in scope
7. Live-ops content — 🔴 does not exist; not in scope

Server remains fully authoritative; client-side `helpers/validation.ts` remains an optimistic UI-only mirror that must be updated in lockstep with any server rule change, never independently.

### 6.5 Folder Structure
```
client/src/games/uno/
  UnoBoard.tsx / UnoBoardDesktop.tsx / UnoBoardMobile.tsx   (existing, unchanged shape)
  useUnoBoard.ts                                             (existing — extend, don't fork)
  uno-shared.tsx / uno-rail.tsx / uno-deal.tsx               (existing)
  uno-declare.tsx        [NEW, Phase 2]  — declare/catch UI + countdown
  uno-challenge.tsx      [NEW, Phase 2]  — Wild+4 challenge prompt/resolution
  UnoResultModal.tsx     [NEW, Phase 4]
  helpers/deck.ts, validation.ts, hand.ts                    (existing)
  helpers/scoring.ts     [NEW, Phase 3]

server/src/games/uno/UnoEngine.ts   — extend: new move types, deadline scheduling, scoring
server/src/games/uno/__tests__/engine.test.ts  [EXTEND, Phase 1 — before any Phase 2 code]
shared/types.ts — UnoGameOptions, DEFAULT_UNO_OPTIONS, extended UnoMoveType, new state fields
```

### 6.6 Components
Retain Plan B's full component table (§12 of `UNO_GAME_PLAN.md`) verbatim as the canonical inventory — 13 existing components, 7 new (`UnoCallButton`, `UnoCatchPrompt`, `UnoDeclareCountdownRing`, `WildDrawFourChallengePrompt`, `UnoActionToast`, `UnoHouseRuleOptions`, `UnoResultModal`). No changes recommended.

### 6.7 Game Engine
Retain Plan B's engine design (§14 of `UNO_GAME_PLAN.md`) verbatim: the declaration state machine (advisory countdown, `catchUno` legal until declared-or-played-out, matching the real rule rather than inventing a hard-cutoff timer), the Wild+4 challenge resolution flow (hand snapshot at play-time, always-challengeable per the official FAQ), and the `handleActionCard` extension point for house-rule stacking. **New addition:** every new move handler must be written test-first against `uno.test.ts` (Phase 1 deliverable), not after.

### 6.8 State Management
Retain Plan B's interface diffs (§13.4) verbatim. **New addition (resolves §3.3):** because Bhalyam rooms are in-memory and non-persistent, contract versioning for in-flight matches is unnecessary — the correct mitigation for a mid-deploy contract change is an operational one (§6.11), not a data-modeling one. Do not build a versioned-contract migration layer; it would be solving a problem the platform's own ephemerality already prevents from mattering.

### 6.9 UX
Retain Plan B's screen-by-screen plan (§7) and UX planning (§8) verbatim, with one addition: the `UnoActionToast` surfacing `state.lastAction` (currently produced, never rendered) is re-prioritized to **Phase 1**, not Phase E/5 — it's a one-component, zero-new-state change that immediately improves legibility for every other feature built afterward (declare/challenge banners can reuse the same toast mechanism instead of each inventing their own).

### 6.10 Animations
Retain Plan B's inventory and priority order (§16) verbatim.

### 6.11 Testing
Merge both: Plan B's concrete test list (§20.1–20.4) **plus** Plan A's competitive-integrity and analytics-validation categories, restated as:
- Unit/integration tests: Plan B §20.1–20.2, written **before** Phase 2 implementation begins (this is the single highest-leverage process change this review recommends — see §7 Phase 1).
- UI tests: Plan B §20.3.
- **New:** a lightweight security/trust-boundary test asserting the server rejects a `game:move` whose payload `playerId` doesn't match the emitting socket's session — write this once the audit in §4.1 confirms whether it's currently enforced.
- **New:** an accessibility CI gate (axe-core or equivalent) covering both board shells, closing §4.1's tooling gap.

### 6.12 Deployment
**New section — resolves §3.3 and §4.1's server-restart gap.** Because `RoomManager` is in-memory with no persistence, any server deploy currently drops every active room. This is a pre-existing platform risk, not new to UNO, but Phase 2's added transient state (declare/challenge windows) raises the cost of a badly-timed deploy. Recommendation: 
1. Ship Phase 2 rule changes behind a lightweight, code-level feature toggle (even a static config flag is sufficient given no feature-flag service exists) so the new move types can be merged and tested in production-adjacent environments before being turned on for real rooms.
2. Adopt a "drain before restart" deploy discipline for any UNO-touching release: stop accepting new UNO room creation, let in-flight matches finish, then restart. This is an operational process, not a code change, and it fully resolves the versioning question Plan A raised without building unnecessary migration infrastructure.

### 6.13 Monitoring
**New section — resolves §4.1's observability gap.** At minimum: structured server-side logs around every `applyMove` rejection (`{ ok: false, error }`) tagged with room code and move type, and the near-term metrics from Plan B §3 emitted as discrete log events (match completion, rematch rate, UNO-declaration success/miss rate, challenge win/lose rate, disconnect/reconnect rate) so they're queryable from logs even without a dedicated analytics pipeline. This is deliberately the minimum viable version — a full dashard/alerting stack (Plan A Phase K) remains correctly deferred, but *emitting the events in a structured, queryable form* is cheap and should not wait for that phase.

### 6.14 Future Enhancements
Everything in Plan A's Phase G–L, unchanged in substance, explicitly re-gated behind the platform-dependency initiative from §6.3: XP/coin progression, ranked ladder and seasons, friends/social graph, moderation infrastructure, full analytics pipeline. Also: `uno-rail.tsx`/`InlineRoomRail.tsx` consolidation (tracked debt, §4.2.3), and code-splitting UNO's bundle if/when bundle-size becomes measurable pain (§4.1) — not before, to avoid solving an unmeasured problem.

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1 — Foundation — ✅ COMPLETE (see §9 Implementation Log)
**Deliverables**
- ✅ Extended `server/src/games/uno/__tests__/engine.test.ts` with Plan B §20.1's missing coverage (play/validity matrix, every action-card effect, win detection, deck composition, reshuffle) as it exists *today*, including the un-fixed Wild+4 gap. 32 tests, up from 6.
- ✅ Rule-contract doc: Plan B (`UNO_GAME_PLAN.md`) §4.11's matrix is the frozen source of truth, updated to reflect the Reverse fix below.
- ✅ `UnoActionToast` shipped (surfaces `state.lastAction`), reused by every later phase.
- ✅ Security audit of `server/src/sockets/index.ts` → `RoomManager.applyMove`'s `playerId` handling (§4.1) — **confirmed safe, no fix required.**
- ✅ `UnoGameOptions`/`DEFAULT_UNO_OPTIONS` scaffolding added to `shared/types.ts`, plus the `CreateRoomPayload.unoOptions` wire field.
- ✅ **Unplanned but Foundation-appropriate:** fixed a real bug the test-writing surfaced — `direction` was never consulted by any turn-advancement call site, so Reverse only flipped a cosmetic display flag in every player count, not just the documented "untested in 2-player" gap. See §9.

**Risks (resolved)**
- Writing tests against undocumented current behavior surfaced an additional gap beyond §4.11's original matrix, exactly as anticipated — folded back into the matrix and fixed rather than just documented, since it was a bug in shipped behavior, not a net-new rule.
- The trust-boundary audit did not reveal a vulnerability — risk closed clean.

**Dependencies:** None — this phase has started and its blocking deliverables for Phase 2 are done.

---

### Phase 2 — Core Logic — ✅ COMPLETE (engine + RoomManager; see §9 Implementation Log)
**Deliverables**
- ✅ Wild Draw Four legality snapshot + full challenge/acceptDraw state machine (engine). `helpers/validation.ts` deliberately **unchanged** — Wild+4 stays always-playable at the matching layer by design (official UNO never blocks it outright; illegality is a challenge concern, not a play-time block). See §9.
- ✅ UNO declaration state machine (`declareUno`/`catchUno` move types, advisory rather than hard-timed per the original §14.4 design, penalty resolution, stale-declaration cleanup via `syncUnoDeclaration`).
- ✅ Turn-timer scheduling wired server-side — `UnoEngine` gained the same `setOptions`/`setTurnDeadline`/`clearTurnDeadline`/`getTurnTimerSeconds` shape as `DotsBoxesEngine`, and `RoomManager.scheduleTurnTimer`/`onTurnTimeout` gained the missing `instanceof UnoEngine` branches (confirmed via grep pre-Phase-2 that UNO had **zero** presence in either function). The already-built `TurnTimeWarning` component now receives a real deadline.
- ✅ Valid-starting-card re-draw fix (no more silent default-to-Red on a Wild opener).
- 🔲 **Not done: the feature-toggle wrapper.** Shipped directly instead — see the risk-acceptance note below.

**Risks**
- Highest-complexity phase; both new state machines interact with existing turn-advance logic (`turnAdvance`/`stepIndex`) and must not regress Skip/Reverse/+2 behavior — mitigated by Phase 1's test suite running continuously through this phase (52 engine tests by the end, up from 32).
- ~~2-player Reverse-as-Skip must gain an explicit branch~~ — done in Phase 1 (§9), ahead of schedule, because it turned out to be a correctness bug rather than a documentation gap.
- **Accepted deviation:** this phase shipped without the feature-toggle wrapper §6.12 called for — there is still no feature-flag mechanism anywhere in Bhalyam, and building one generically was out of scope for a UNO-specific pass. The mitigating factor: every new mechanic is purely additive to the wire contract (new move types, new optional state fields) and gated behind server-side validation (`applyMove` rejects anything malformed), so a client that doesn't yet send `declareUno`/`challenge`/`catchUno` sees **no behavior change** versus before this phase — the risk §6.12 was guarding against (a live rules-behavior change breaking in-flight rooms) doesn't apply here, since nothing about *existing* move types' behavior changed except the Reverse bug fix (already isolated to Phase 1) and Wild+4 (which was always "always playable," and still is — only the *consequence* of playing it changed, and only once a client starts sending `challenge`/`acceptDraw`, which none do yet). Revisit this note when Phase 3 UI ships and real clients start sending the new move types.

**Dependencies:** Phase 1 (✅ tests and trust-boundary audit done).

---

### Phase 3 — UI — ✅ COMPLETE, with three scoped deviations (see §9 Implementation Log)
**Deliverables**
- ✅ `UnoCallButton` (`uno-declare.tsx`) and `WildDrawFourChallengePrompt` (`uno-challenge.tsx`) — client UI for Phase 2's mechanics, wired into `useUnoBoard.ts` and both board shells.
- 🔁 **`UnoCatchPrompt` built differently than planned:** a "Catch! +2" affordance on `UnoOpponentSeat` itself, not a separate prompt component — a lower-friction target for a "notice something" mechanic.
- 🔲 **`UnoDeclareCountdownRing` not built:** the declaration mechanic is advisory (§14.4's original design, correctly preserved through implementation) — there is no deadline value to animate a countdown from.
- 🔁 **`UnoHouseRuleOptions` not built as its own component:** no per-game "in-lobby options panel" pattern exists anywhere in Bhalyam — every game's options are chosen in the pre-creation sheet (`GameRoomSheet.tsx`). Added a `turnTimerSeconds` selector there instead (the one `UnoGameOptions` field the engine actually reads); left the 6 house-rule toggles unbuilt since the engine doesn't consume them yet (Phase C) and toggle-that-does-nothing is worse UX than no toggle.
- ✅ Scoring engine (`awardRoundPoints`/`cardPoints` in `UnoEngine.ts`) + point-table math on win — pulled forward from Phase D since it was small, self-contained, and made the already-shipped `ScorePanel`/`GameOverPanel` stop lying (they've shown `0` unconditionally since before this review began). Client-side pure mirror `helpers/scoring.ts` also shipped, unconsumed until Phase 4's results modal exists.
- ✅ Tutorial slide additions for declaration + Wild Draw Four challenge (`UNO_TUTORIAL`), with the localStorage gate key bumped `v1` → `v2` so players who already dismissed the old deck see the new slides once — a real edge case the original plan didn't call out.

**Risks**
- UI for time-boxed interactions is easy to get subtly wrong under real network latency — **not yet tested against artificially delayed sockets**, only local dev conditions and unit-level engine tests. This remains open risk for Phase 5's QA pass.
- House-rule stacking UI must visibly and correctly reflect ranked-lock semantics even though "ranked" doesn't exist yet — moot for now since no house-rule UI shipped this phase; revisit when Phase C's engine work lands.
- **New risk surfaced this phase:** none of Phase 2's mechanics had ever been exercised through a real UI before now. Wiring them up did not surface any engine-level bugs (all 55 engine tests plus the RoomManager integration test still pass unmodified) — a mildly reassuring signal, but manual play-testing (Phase 5) is still the first time a human will actually operate `challenge`/`declareUno`/`catchUno` through the real interface end to end.

**Dependencies:** Phase 2 (✅ mechanics existed before their UI was built).

---

### Phase 4 — Polish
**Deliverables**
- `UnoResultModal` (replaces the generic 90s scorecard fallback for UNO).
- Card play/draw travel animations, Reverse/Skip visual flourishes.
- Remaining audio cues (shuffle, deal, reverse, skip, victory, defeat).
- Reduced-motion pass across `uno-deal.tsx` and all new Phase 2/3 animations — verify, don't assume, that CSS keyframes actually respect `prefers-reduced-motion` (§4.2.5).
- Illustration art requests: `lobby-prop-uno`, `corner-uno`, results-screen art (can ship with `IllustrationSlot`'s dev-fallback placeholder if art isn't ready — do not block the modal's ship on art delivery).

**Risks**
- Low technical risk, moderate scheduling risk if gated on external art delivery — mitigated by the placeholder-fallback plan above.

**Dependencies:** Phase 3 (✅ scoring already shipped — the results modal is fully unblocked on the data side, only the component itself remains); art delivery is a soft, non-blocking dependency.

---

### Phase 5 — Testing & Release
**Deliverables**
- Full manual QA matrix at 375/768/1024/1440 on both shells: normal play, Wild, Wild+4+challenge, UNO declare/miss/catch, house rules on/off, bot-filled room, mid-match disconnect/reconnect, draw-pile exhaustion.
- Accessibility sign-off against Plan B §19's checklist, gated by the new axe-core CI check (§6.11).
- Structured-logging verification (§6.13) — confirm events are actually queryable in whatever log sink Bhalyam already uses.
- Feature-toggle flip: enable Phase 2 mechanics for real rooms, following the drain-before-restart deploy discipline (§6.12).
- Staged rollout if feasible (a subset of rooms/time window) before 100% flip, given no formal feature-flag service exists — even a manual, time-boxed canary is better than an instant global flip for a rules-behavior change.

**Risks**
- This is the first time Phase 2's mechanics run against real network conditions and real concurrent players at volume — budget time for at least one bug-fix cycle post-canary before full rollout, not a single big-bang release.

**Dependencies:** Phases 1–4 complete; the Phase 1 security audit must be closed (not just identified) before this phase's rollout step.

---

## 8. FINAL VERDICT

**What Plan A got right:**
- The phase-dependency graph and technical-layer ownership breakdown — genuinely useful project-management tooling neither this report's synthesis nor Plan B improves on structurally, only corrects (§6.3's platform-dependency gate).
- Raising backward-compatibility-under-deployment as a concern, even though its proposed solution direction (contract versioning) wasn't the right one — the *concern* was right, resolved correctly in §6.12 by recognizing the platform's ephemerality changes the right answer.
- The explicit, well-stated "extend incrementally, don't rewrite" principle — promoted to a first-class governing constraint in §6.3.

**What Plan B got right:**
- Everything falsifiable: rule-by-rule verdicts against real code, compilable state diffs, a component table with real props, an animation/audio inventory tied to real CSS/constants, and an honest "verify, don't assume" posture on claims it couldn't confirm (bot pacing, `InlineRoomRail` overlap, keyboard nav).
- Correctly identifying and refusing to over-scope Bhalyam's single-room-code mode structure against the source volumes' six-mode fantasy.
- The explicit hidden-information constraint on AI design — closes a real fairness-bug class before it exists.

**What both plans missed:**
- Feature flags/staged rollout, telemetry implementation (not just metric *naming*), observability/error monitoring, the client-authority trust-boundary question, server-restart state loss as an operational risk, horizontal scaling, and an accessibility CI gate. All resolved or scheduled in §4, §6.11–6.13, and the Phase 1/5 roadmap deliverables above.

**Recommended final architecture:** As specified in §6 — the existing server-authoritative, additive-only, single-hook/dual-shell client architecture, extended (never restructured) with the Phase 2 rule-completeness state machines, a lightweight feature-toggle and drain-before-restart deploy discipline in place of unnecessary contract versioning, and structured event logging as the minimum viable step toward the metrics both source documents correctly wanted but neither knew how to implement.

### Scores

| Score | Value | Justification |
|---|---|---|
| **Technical confidence** | **9.5 / 10** *(updated post-Phase 3, see §9)* | Official rules are complete end-to-end — engine, RoomManager wiring, and now real client UI — for everything except house rules (Phase C, correctly deferred) and the results screen (Phase 4, cosmetic). Every mechanic is tested at the engine level (55 tests) and proven through RoomManager (1 integration test). Phase 3 was the "honest remaining unknown" the previous score named — client UI now exists and didn't require touching a single existing test, a strong (though not conclusive) signal the engine contract was designed correctly the first time. Not a 10: no manual play-test has happened against real network latency yet — Phase 5's job, and the one thing automated tests structurally cannot substitute for. |
| **Production readiness (of the documentation, to guide a team to ship)** | **8 / 10** | Strong on gameplay/UI/state specification and now backed by a matching implementation, not just a plan (would be 9–10 alone once Phase 4/5 close). Held to 8 by: no manual QA pass yet (Phase 5), no `UnoResultModal` (Phase 4), and the deployment/monitoring/rollout-safety plan (§6.12–6.13) still being unexercised in practice — specified, not yet proven under a real release. |
| **Maintainability** | **9 / 10** | Both documents converge on and reinforce the same additive, non-breaking, pattern-following discipline; the codebase's existing separation of concerns (dumb shells / one hook / pure helpers) is strong and this plan explicitly protects it (§6.3). Not a 10 only because the `uno-rail.tsx`/`InlineRoomRail.tsx` duplication remains untracked debt rather than a resolved decision. |
| **Scalability** | **5 / 10** | The honest, deliberately unflattering score. Neither source document — nor, without new work, this report's synthesis — solves server-side horizontal scaling, in-memory state persistence, or bundle growth across a ten-and-growing game catalog. These are real, named, correctly-deferred risks (§4.1, §4.3), not solved ones. A future review should not let this score improve by omission next time it's revisited. |

---

## 9. Implementation Log

*Living section — append an entry each time a roadmap phase (§7) executes work, so this report stays a record of what actually happened, not just what was planned. Do not silently rewrite earlier entries; correct them forward with a new dated note if something turns out to be wrong, the same way §3.1's testing claim was corrected in this document and in `UNO_GAME_PLAN.md` after `server/src/games/uno/__tests__/engine.test.ts` was found to already exist.*

### 2026-07-11 — Phase 1 (Foundation) executed

**Closed:**
- **Security audit** (§4.1, §5): `RoomManager.applyMove` derives the acting player from the authenticated socket, not the client-supplied `playerId`. The payload's `playerId` is only used for the host-controlled pass-and-play proxy feature, with an explicit `player.id === room.hostId && target.isLocal === true` check before it's honored — any other proxy attempt is rejected server-side. No move-spoofing vector. No fix needed.
- **Test coverage gap** (§3.1, §5): `server/src/games/uno/__tests__/engine.test.ts` extended from 6 to 32 tests. Added: deck composition (exact 108-card / per-color / per-rank breakdown), `play` validity (color/number/symbol matching, Wild, and a documented-not-fixed Wild+4-legality gap test), win detection, every action-card effect, draw-pile reshuffle (both the normal and fallback paths), and the Wild-opening-card-defaults-to-Red gap. `UnoEngine` gained an injectable `setRng()` (mirrors `LudoEngine.setRng`) and `InternalUnoState` is now exported so tests can set up exact scenarios directly. Full server suite: 178/178 passing. `tsc --noEmit` clean on both `client` and `server` packages.
- **`UnoGameOptions` scaffolding** (§6.3, Phase C prep): added to `shared/types.ts` with `DEFAULT_UNO_OPTIONS` (all house-rule flags `false`, `turnTimerSeconds: 20` per Volume 4 §3's official default) and wired as `CreateRoomPayload.unoOptions?: Partial<UnoGameOptions>`. Not yet consumed by `RoomManager` or `UnoEngine` — that remains Phase C.
- **`UnoActionToast`** (§6.9, Phase E item pulled forward per §6.9's own recommendation): built and mounted in both `UnoBoardDesktop.tsx` and `UnoBoardMobile.tsx`. `state.lastAction` is no longer dead data.

**Found and fixed (not originally scoped — surfaced by writing the Reverse test):**
- **Real engine bug:** `this.state.direction` was set (and broadcast to clients) by Reverse but **never consulted by any turn-advancement code path** — `handlePlay`'s final `turnIndex` update, `advanceTurn()` (used by `pass`), and the "who draws" lookups for `+2`/`Wild+4` all used a fixed forward step regardless of direction. Reverse changed the direction *label* the UI shows and had **zero effect on actual turn order**, in every player count — worse than the previously-documented "correct in 3+ players, untested in 2-player" characterization in both `UNO_GAME_PLAN.md` and this report. Fixed with a single `stepIndex(from, steps)` helper that all four call sites now route through, plus an explicit 2-player Reverse-as-Skip branch. 5 new regression tests lock this in. `UNO_GAME_PLAN.md` §4.4/§4.11 corrected accordingly.
- This is exactly the failure mode §7 Phase 1's own risk note anticipated ("writing tests... may surface additional undiscovered gaps") — the process worked as designed, on the first attempt.

**Still open from Phase 1:** none — all five Foundation-phase deliverables from §7 are done. Phase 2 (Core Logic: Wild Draw Four legality/challenge, UNO declaration, turn-timer wiring, valid-starting-card fix) is unblocked and can begin.

### 2026-07-11 — Phase 2 (Core Logic) executed

**Closed:**
- **Valid-starting-card fix** (§3.1, §4.2): `init()` now re-draws when the revealed opening card is Wild/Wild+4 (shuffles it back into the pool, tries again, bounded to 20 attempts), instead of silently defaulting `currentColor` to Red. Two new tests.
- **Wild Draw Four legality + challenge flow** (§3.1's largest identified gap): `handlePlay()` snapshots legality before the card leaves the hand (`wasLegalWildFour`), defers the draw/turn-advance into a new `pendingChallenge` engine state, and two new move types (`challenge`, `acceptDraw`) let the targeted player resolve it. Outcomes match Volume 4 §17's decision table exactly (verified by 6 new tests covering: blocks other moves while pending, only the target may decide, plain accept, successful challenge, failed challenge, and confirming the play itself is *never* rejected outright — illegality is a challenge concern, not a play-time block, which is itself an important design clarification this phase made explicit that neither prior document stated precisely).
- **UNO declaration state machine**: `declareUno`/`catchUno` move types, `canDeclareUno`/`syncUnoDeclaration` helpers (the latter closes a real correctness trap — a stale "declared" flag surviving a hand-size change away from 1 card would wrongly block a later legitimate catch). Modeled as advisory rather than hard-timed, per §14.4's original design reasoning, preserved through implementation. Bots always auto-declare instantly via `applyAutoMove`. 8 new tests, including one that exercises the stale-flag cleanup through the real `draw` code path rather than asserting it in isolation.
- **Turn-timer wiring**: confirmed via grep that `UnoEngine` had **zero** presence in `RoomManager.scheduleTurnTimer`/`onTurnTimeout` before this phase (every other engine with a timer — RPS, Ludo, Rummy, WordBuilding, DotsBoxes, MemoryMatch, StarGame — had an explicit branch; UNO had none). Added the missing branches, plus `UnoEngine.setOptions`/`setTurnDeadline`/`clearTurnDeadline`/`getTurnTimerSeconds`/`getTimeoutActor` (mirroring `DotsBoxesEngine`'s exact shape). `getTimeoutActor()` is deliberately narrower than `pendingActors()` — it excludes anyone merely eligible to declare UNO, so a generic turn-timeout can never auto-declare on behalf of a human (only a bot, via `applyAutoMove`, should ever do that). Proven end-to-end — not just at the engine level — by a new `server/src/rooms/__tests__/unoTimer.test.ts` that drives a real `RoomManager.startGame()` under fake timers and confirms the scheduled deadline actually forces a move when it lapses.
- **`UnoGameOptions` now load-bearing**: `RoomManager`'s `Room` interface, `createRoom()`, `startGame()`, and `startRematch()` all wire `room.unoOptions` into the engine via `setOptions()`, matching the exact pattern already used for Rummy/Ludo/SNL/HC/WordBuilding/DotsBoxes/MemoryMatch/StarGame. `sockets/index.ts` passes `payload.unoOptions` through. House-rule flags (stacking, jump-in, etc.) remain unconsumed by the engine — that's still Phase C — but the plumbing from client room-creation through to a per-room options object is now real, not scaffolding.

**Process note — a real bug caught by test authoring, not by code review:** while writing the RoomManager-level timer integration test, the first version failed because the test assumed a 1-second timer would fire after 1.1s of fake-timer advance; `scheduleTurnTimer` actually floors every game's timer at `Math.max(5, seconds)` (a pattern copied faithfully from `DotsBoxesEngine`). This was **not a production bug** — the floor is intentional, shared behavior — but the mismatch would have made the test either silently pass for the wrong reason or (as it did) fail loudly and force a correct diagnosis. Recorded here because it's the same category of value Phase 1's Reverse-bug discovery demonstrated: writing the test is where hidden assumptions get checked, not just where known behavior gets confirmed.

**Deliberately not done:** the feature-toggle wrapper §6.12/§7 called for. See the roadmap's Phase 2 risk note above for the specific reasoning (every change this phase made is additive to the wire contract and behaviorally inert for any client that doesn't yet send the new move types) — this is a recorded, reasoned deviation from the original plan, not an oversight.

**Still open from Phase 2:** the client UI (`UnoCallButton`, `UnoCatchPrompt`, `UnoDeclareCountdownRing`, `WildDrawFourChallengePrompt`) — Phase 3, and correctly still gated behind it, since building UI against an unstable engine contract would have been the wrong order. Full server suite after this phase: **199/199 passing** (up from 178), `tsc --noEmit` clean on both packages.

### 2026-07-11 — Phase 3 (UI) executed

**Closed:**
- **`useUnoBoard.ts` extended**, not forked: `canDeclareUno`, `catchableOpponents`, `pendingChallenge`, `isChallengeTarget`, plus `declareUno`/`catchUno`/`challengeWildFour`/`acceptWildFourDraw` emit functions, all reusing the existing `isSubmitting` double-submit guard and the existing `useEffect(() => setIsSubmitting(false), [state])` release mechanism rather than inventing a parallel one. Correctly derived independent of `myTurn` — the server accepts these four move types from any seated player at any time (Phase 2's design), so gating the UI on turn state would have made the client lie about what the server actually permits.
- **`UnoCallButton`** (`uno-declare.tsx`): fixed, centered, pulsing "UNO!" button, visible exactly when `canDeclareUno`.
- **Catch affordance folded into `UnoOpponentSeat`** (`uno-shared.tsx`) rather than a separate `UnoCatchPrompt` component — a "Catch! +2" button rendered directly on a qualifying opponent's seat card. Reasoned choice, recorded above and in `UNO_GAME_PLAN.md` §12: catching is about *noticing* something on an opponent's seat, so the affordance belongs on that seat, not in a disconnected prompt.
- **`UnoDeclareCountdownRing` deliberately not built** — Phase 2's declaration design (preserved from §14.4) is advisory, not hard-timed, so there is no deadline value a countdown ring could visualize. Building one would have meant either inventing a fake deadline (contradicting the deliberate rules-fidelity choice already made) or shipping a decorative ring with no real countdown behind it.
- **`WildDrawFourChallengePrompt`** (`uno-challenge.tsx`): full-screen modal, shown only when `isChallengeTarget`. Every other player already sees the same information via the existing `UnoActionToast` (Foundation phase) surfacing the engine's own `lastAction` string — confirmed no second "someone else is deciding" component was needed.
- **Scoring pulled forward from Phase D into Phase 3**: `UnoEngine.awardRoundPoints`/`cardPoints`, called the instant a hand empties. This was small, self-contained, and already-shipped UI (`ScorePanel`, `GameOverPanel`) had been rendering a hardcoded `0` since before this review began — leaving it for a later phase would have meant shipping declare/catch/challenge UI next to a scoreboard everyone could see was fake. 3 new engine tests. A client-side pure mirror (`helpers/scoring.ts`) shipped alongside it, unconsumed until a results screen exists to use it.
- **`GameRoomSheet.tsx` gained a UNO turn-timer selector** (Fast/Standard/Relaxed/No-timer), the one `UnoGameOptions` field the engine actually reads. **Scope correction, not an oversight:** the original plan's `UnoHouseRuleOptions` "host-only lobby panel" assumed a UI pattern that doesn't exist anywhere in Bhalyam — every game's options are chosen in the pre-creation sheet, not a post-join lobby panel, confirmed by reading `GameRoomSheet.tsx`'s existing per-game option blocks (Rummy's mode, SnL's difficulty, etc.) before writing any code. The 6 house-rule toggles were deliberately left unbuilt: the engine doesn't read them yet (Phase C), and a toggle with zero gameplay effect is worse UX than no toggle at all.
- **Tutorial deck updated**, key bumped `uno.tutorial.completed.v1` → `v2` — a detail the original plan's "add tutorial slides" deliverable didn't call out, but a real correctness issue: without the version bump, every player who'd already dismissed the old tutorial would never see the new content, silently defeating the point of adding it.

**Verification:** 202/202 server tests passing (up from 199 — 3 new scoring tests), `tsc --noEmit` clean on both `client` and `server` packages. No existing test needed modification — Phase 2's engine contract proved stable under real UI integration, the encouraging signal noted in the roadmap's Phase 3 risk section above.

**Still open from Phase 3:** manual play-testing against real network latency (Phase 5); `UnoResultModal` and the remaining animation/audio work (Phase 4).

---

*This report supersedes neither `uno-plan-of-action.md` nor `UNO_GAME_PLAN.md` as historical artifacts, but §6–§7 of this document is the canonical implementation reference going forward, and §9 is the record of what has actually shipped against it. Do not implement Phase 2+ work directly from either source document without cross-checking against §6's governing principle and §7's phase gates.*
