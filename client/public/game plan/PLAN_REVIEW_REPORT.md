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

### Phase 4 — Polish — ✅ COMPLETE except art delivery (see §9 Implementation Log)
**Deliverables**
- ✅ `UnoResultModal` — replaces the generic 90s scorecard fallback (`"uno"` added to `GAMES_WITH_OWN_SCORECARD`, `onScorecardClose` wired through `useUnoBoard.ts` matching the exact `RummyResultModal` contract).
- ✅ Card play/draw travel animations — a card-land settle keyframe on the discard pile (keyed remount, not true FLIP-style hand-to-pile flight, which would need cross-component DOM position measurement — see §9 for the explicit scope note), plus Reverse/Skip flourishes on the new direction-arc indicator.
- ✅ Remaining audio cues — `UNO_SHUFFLE`/`UNO_DEAL`/`UNO_REVERSE`/`UNO_SKIP` keys added (`UNO_WIN` already existed), all wired at their trigger points. **Deliberately no "defeat" cue** — Volume 8 §25 argues against a punishing loss sound, so only the winner hears anything.
- ✅ Reduced-motion — turned out to be **already solved globally** (`index.css` has two overlapping `prefers-reduced-motion` blocks forcing near-zero animation/transition duration on every element app-wide, discovered while starting this task, not something either prior draft of this document knew about). The one real gap — `uno-deal.tsx`'s JS `setTimeout` stage lengths not being CSS, so unaffected by that rule — is fixed.
- 🔲 **Illustration art still not delivered.** Confirmed `gameover-trophy-win`/`gameover-trophy-loss` (the generic pair `UnoResultModal` could have used) are still `null` in `illustrations.ts`, same as `lobby-prop-uno`/`corner-uno`. Deliberately did **not** wire `IllustrationSlot` into the new modal for these — with the asset null, the wiring would render nothing in production and only a dev-only dashed placeholder locally, adding code with zero observable effect. Revisit once art exists.

**Risks**
- Low technical risk, moderate scheduling risk if gated on external art delivery — the modal shipped without it rather than waiting, matching the original mitigation plan.
- **New, honestly-stated risk:** like Phase 3's table redesign, none of this phase's audio/animation work has been heard or watched in a real browser — `browser-use` remained unavailable. `tsc --noEmit` and the 202-test suite passing confirm no regression, not that the audio actually fires audibly or the animations read well at real frame rates.

**Dependencies:** Phase 3 (✅ scoring already shipped — the results modal was fully unblocked on the data side); art delivery remains a soft, non-blocking, still-open dependency for the illustration item only.

---

### Phase 5 — Testing & Release — 🟡 PARTIALLY COMPLETE, re-scoped to what this environment can actually do (see §9; updated 2026-07-12 — a real browser-automation pass finally ran, found and fixed 4 real bugs, and substantially (not fully) executed `UNO_GAME_PLAN.md` §25 — see that section and the 2026-07-12 log entry below for exactly what is and isn't confirmed)
**Deliverables — as originally written, then reality-checked:**
- Full manual QA matrix at 375/768/1024/1440 on both shells. **Not run in this session — no browser-automation tool available.** ✅ Reframed as a concrete, checkable list a human (or a future session with real browser access) executes: `UNO_GAME_PLAN.md` §25.
- Accessibility sign-off against Plan B §19's checklist, gated by "the new axe-core CI check (§6.11)." **That axe-core CI check was never actually built** — §6.11 recommended it but no phase implemented it, and this document never flagged that gap until now. Building a first-of-its-kind client test framework (this repo's `client` package has **zero** test infrastructure — no vitest/jest/RTL, confirmed by checking `client/package.json`) is a bigger, precedent-setting decision than "finish UNO's Phase 5," so it wasn't bootstrapped unilaterally. ✅ Substituted a static code-level self-audit instead — genuinely found and fixed two real issues (see §9), which a live axe-core run might not even have caught (missing `aria-live` regions and undersized touch targets are exactly the kind of thing automated a11y scanners are inconsistent about). Live assistive-tech testing remains open — `UNO_GAME_PLAN.md` §25.4.
- ✅ Structured-logging verification (§6.13) — **done**, not just verified. `RoomManager.applyMove`'s rejection path and match-completion path now log via the existing `[tag] message` `console.log` convention (`server/src/index.ts`'s own established style — no new logging library introduced). "Confirm events are queryable in whatever log sink Bhalyam already uses" doesn't fully apply — no production log sink/aggregator was ever identified as existing; what's achievable and done is that the events are now *emitted* in a consistently greppable form.
- **Feature-toggle flip / staged rollout: does not apply to this session and is said so explicitly, not silently skipped.** Phase 2 already reasoned through and recorded why no feature-toggle wrapper was built (§9, Phase 2 entry) — every mechanic shipped is additive and behaviorally inert until a real client sends the new move types, which as of Phase 3 real clients now do. There is no production deployment pipeline in this working session to stage a rollout through; this is local source code being edited and tested directly by the user. If/when this codebase is actually deployed, §6.12's drain-before-restart discipline still applies — that recommendation stands, it just has no action to take *right now*.

**Risks**
- The core risk this deliverable was guarding against — Phase 2's mechanics meeting real network conditions for the first time — is **still open**, not closed by anything in this phase. Nothing in this session exercised `declareUno`/`catchUno`/`challenge`/`acceptDraw` over an actual network with real latency between two real clients.
- **New risk, stated plainly:** four consecutive turns of code (table redesign, Phase 4 polish, this phase's accessibility fixes) have shipped with only one partial human visual check (the desktop screenshot) in between. The accessibility fixes in particular are unverified by anyone other than static code reading — confident they're *correct* additions (real `aria-live`, real larger touch target), not confident they're *sufficient* until a screen reader or real touch device confirms it.

**Dependencies:** Phases 1–4 complete (✅); the Phase 1 security audit is closed (✅, confirmed safe, no fix needed). The QA checklist (`UNO_GAME_PLAN.md` §25) is the actual remaining dependency before this phase — and by extension the whole roadmap — can be marked done.

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
| **Technical confidence** | **9 / 10** *(updated post-Phase 5, see §9)* | Same split-by-layer reasoning as before, updated with real evidence instead of pure inference. **Engine/logic:** unchanged, 9.5+. **Presentation layer:** partially de-risked — the user's real screenshot confirmed the desktop table layout renders correctly, and the accessibility self-audit *found and fixed two real bugs* (a missing mobile `aria-live` region, an undersized touch target), which is a stronger signal than "typechecks" alone: it proves the review process catches real issues, not just that nothing crashed. Held at 9, not raised further, because the confirmation covers desktop-static-layout only — mobile, all dynamic interactions, and all audio remain unconfirmed in a real browser. |
| **Production readiness (of the documentation, to guide a team to ship)** | **7.5 / 10** *(unchanged from post-Phase-4)* | The positive screenshot and the real accessibility fixes are genuine progress, balanced by two new honest findings this phase surfaced: the axe-core CI check §6.11 called for was never built by any phase (a documentation gap now closed by admitting it rather than quietly never mentioning it again), and the entire UNO audio manifest is empty (discovered Phase 4, confirmed still true). The manual QA checklist (`UNO_GAME_PLAN.md` §25) is now concrete and ready to execute, which is real progress over "no plan for QA at all" — but it is a plan for verification, not verification itself, so the score doesn't move until it's actually run. |
| **Maintainability** | **9 / 10** | Unchanged. Both documents converge on and reinforce the same additive, non-breaking, pattern-following discipline; five phases of real implementation work (Foundation through Testing) never once needed to violate that principle, which is itself evidence for the score rather than just an assertion. Not a 10 only because the `uno-rail.tsx`/`InlineRoomRail.tsx` duplication remains untracked debt rather than a resolved decision. |
| **Scalability** | **5 / 10** | Unchanged, deliberately. Five phases of UNO-specific feature work are now complete and none of them touched server horizontal scaling, in-memory state persistence, or bundle growth — because none of them were supposed to; those remain correctly out-of-scope platform concerns (§4.1, §4.3), not solved ones. Repeating this score unchanged is itself the point: it should not silently drift upward just because unrelated work shipped. |

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

### 2026-07-11 — Out-of-band: circular-table visual redesign (user-directed, not a roadmap phase)

**Context:** the user reported their live app didn't match the panel-based board this review's code (and screenshots) assumed — diagnosed as a stale browser tab with a dead HMR socket, not a code defect (confirmed by curling the dev server directly: the served bundle contained every Phase 1–3 addition). While resolving that, the user shared a reference image (the mobile UNO! app's illustrated table view) and asked for the board to look like it. Scoped via `AskUserQuestion`: full redesign now, best-effort, using only assets that already exist in Bhalyam (no custom illustration/commissioning capability) — approved.

**Shipped:** `uno-table.tsx` (new) — `UnoTableMat` (oval mat, CSS gradient, no painted texture asset exists), `computeSeatPosition` (percentage-based ellipse placement across the upper arc, adapted from `uno-deal.tsx`'s existing radius-based seat math), `UnoDirectionArc` (SVG curved arrows, flips on `state.direction` — correct end-to-end since the Phase 1 `stepIndex` fix), `UnoTableCenter` (draw/discard on the mat directly), `UnoPlayerChip` (avatar + name/count pill + directional card-back fan + catch affordance), `UnoHandFan` (tilted, overlapping own-hand cards replacing the flex-wrap grid), `UnoTimerBadge` (always-visible countdown, distinct from the existing ≤10s-only `TurnTimeWarning`, which is layered on top unchanged for that moment). `uno-declare.tsx`'s `UnoCallButton` restyled from a full-width bottom pill to a circular button positioned by the caller; added `UnoDeclareBubble` (a transient "UNO!" speech bubble on successful declaration). Both `UnoBoardDesktop.tsx` and `UnoBoardMobile.tsx` rewritten around these pieces — presentation-only, zero changes to `useUnoBoard.ts`, the engine, or any test.

**Explicit scope boundary (not achievable without new assets):** custom character illustrations (the reference's Aarav/Diya/Kabir portraits) and a painted wood-grain mat texture. Approximated with the existing initials-on-gradient `Avatar` and CSS gradients in Bhalyam's own palette instead.

**Verification gap, stated plainly:** this was built and typechecked but **never rendered in a browser** — no CDP/browser-automation tool was available in this environment (`browser-use` CLI not found on `PATH`). `tsc --noEmit` passing and the full 202-test suite passing confirm nothing broke structurally; neither confirms the layout actually looks right. `DeckPanel`/`HandInfoPanel`/`HandPanel`/`UnoOpponentSeat` were deliberately left in `uno-shared.tsx`, unused but intact, as a same-session rollback path — see the comment at the top of that file. **The user's own visual confirmation in a real browser is the next required step before treating this as done.**

### 2026-07-11 — Phase 4 (Polish) executed

Run immediately after the table redesign, on the user's explicit go-ahead, without waiting for the redesign's visual confirmation (the same unverified-in-a-real-browser caveat above therefore also applies to everything below).

**Closed:**
- **`UnoResultModal`** (`UnoResultModal.tsx`, new): winner banner, real per-player scores (Phase 3's `awardRoundPoints` finally has a UI that shows them off), `RematchPanel` reuse, Continue/Leave actions. Wired via the exact `onScorecardClose` contract `RummyResultModal`/RPS/Hand Cricket already use — `"uno"` added to `Room.tsx`'s `GAMES_WITH_OWN_SCORECARD`, a new `scorecardDismissed`/`dismissScorecard` pair added to `useUnoBoard.ts` (resets on the `phase` → `"playing"` rematch transition, same pattern Rummy's board uses).
- **Card-land + Reverse/Skip flourish**: a `uno-card-land` CSS keyframe on the discard pile, retriggered via `key={topCard.id}` remounting rather than true FLIP-style hand-to-pile flight (that would need DOM position measurement across components that don't currently share layout coordinates — scoped out explicitly, not forgotten). A new `useUnoEventFlourish(lastAction)` hook (`uno-table.tsx`) text-matches the engine's existing `lastAction` strings for "Reverse!"/"Skip!" and pulses `UnoDirectionArc` for ~650ms — the same "watch lastAction for a new value" pattern `UnoActionToast` already established, reused rather than inventing a fourth version of it.
- **Audio**: added `UNO_SHUFFLE`/`UNO_DEAL`/`UNO_REVERSE`/`UNO_SKIP` to `constants/audio.ts` (`UNO_WIN` already existed from Foundation-phase scaffolding but had never been called from anywhere until now). Wired at: `uno-deal.tsx`'s shuffle/deal stage transitions, `useUnoEventFlourish`'s Reverse/Skip detection, and a new branch in `useUnoBoard.ts`'s existing game-over effect that plays `UNO_WIN` only for the actual winner — no defeat sound, per Volume 8 §25's "keep defeat respectful" guidance. **Important caveat surfaced while doing this:** `client/src/assets/audio/themes/manifests.ts` has **zero** `uno_*` entries in any theme, unlike Rummy/Ludo/SnL/Hand Cricket, which all have real mapped `.mp3` files. Every `AUDIO.UNO_*` call — including the ones from Phase 1-3, not just this phase's new ones — has been silently no-op-ing since it was written. This is a pre-existing gap this session didn't create, structurally identical to the illustration-art gap (`lobby-prop-uno`/`corner-uno` reserved-but-null): the code plumbing is now complete and correct, but real audio will not be heard until someone supplies files into the manifest.
- **Reduced-motion — turned out to already be solved.** `index.css` has two overlapping global `@media (prefers-reduced-motion: reduce)` blocks (lines ~125 and ~527) forcing `animation-duration`/`transition-duration` to near-zero on every element app-wide. Neither this report nor `UNO_GAME_PLAN.md` knew this when they listed "reduced-motion pass" as an open Phase 4 item — both assumed it needed new per-component guards. It doesn't, for anything CSS-keyframe-based (which is everything added this session: `animate-pulse`, `animate-bounce`, `uno-card-land`, `uno-flourish-pulse`, all of `uno-deal.tsx`'s existing keyframes). The one real residual gap — `uno-deal.tsx`'s shuffle/deal stage lengths are plain JS `setTimeout` values, not CSS, so the global rule can't touch them — is fixed with an explicit `matchMedia("(prefers-reduced-motion: reduce)")` check that collapses both stages to 80ms.

**Not done, and correctly left that way:** `gameover-trophy-win`/`gameover-trophy-loss` illustration art — confirmed still `null`. Chose not to wire `IllustrationSlot` into `UnoResultModal` for a null asset, since that would add code with zero observable production effect; better to wire it once real art exists than to carry dead integration code now.

**Verification:** 202/202 tests passing (unchanged — this phase was entirely client-side), `tsc --noEmit` clean on both packages. As with the table redesign, **nothing in this phase has been seen or heard in a real browser.**

### 2026-07-11 — Interlude: user visually confirmed the table redesign

Between Phase 4 and Phase 5, the user shared a real screenshot of the desktop shell rendering live. Assessed against the reference image and the original design intent: oval mat, opponents arranged across the top arc with card-back fans and name/count pills, direction-arc indicator, self-seat gold turn-highlight with "▸ YOUR TURN", tilted overlapping hand fan, header (Leave/room-code/tutorial), Play/Draw buttons, and the floating room-rail trigger all rendered correctly and matched intent closely. `UnoCallButton` correctly did not appear (hand had 7 cards, not 1) — confirmed as expected behavior, not investigated as a bug. One open question raised and not yet resolved: the always-visible `UnoTimerBadge` wasn't visible in the screenshot; unclear whether that room genuinely had no timer or the badge has a real bug — flagged for the QA pass (`UNO_GAME_PLAN.md` §25.2) rather than guessed at.

This is the first and only real-browser confirmation any of this session's UI work has received. It covers the desktop shell's static layout only — not mobile, not any dynamic interaction (playing a card, declaring, a challenge), not audio, not the Phase 5 accessibility fixes (which shipped after this screenshot).

### 2026-07-11 — Phase 5 (Testing & Release) executed, re-scoped

**Closed:**
- **Structured logging** (§6.13): `RoomManager.applyMove` now logs every rejected move (`[move] rejected room=... game=... type=... player=... error=...`) and every match completion (`[match] finished room=... game=... players=...`), following the exact `[tag] message` convention already established in `server/src/index.ts` — no new logging library. Generic across every game (the shared `applyMove`/completion path isn't UNO-specific), not just UNO. Verified working in the existing test output (visible for Rummy's tests in the suite run, confirming the wiring functions correctly, not just typechecks).
- **Accessibility — static self-audit, not a live scan** (§6.11's originally-planned axe-core CI check was never built by any phase, including this one — see the Phase 5 roadmap entry above for why not). Manually reviewed every Phase 1-4 UNO component against `UNO_GAME_PLAN.md` §19's checklist and found two real, fixed issues:
  1. The `aria-live="polite"` turn-announcement region added to `UnoBoardDesktop.tsx` during the table redesign was never added to `UnoBoardMobile.tsx` — a real regression the redesign introduced and this audit caught, not a pre-existing gap.
  2. The "Catch! +2" button (`uno-table.tsx`) was sized at roughly 13-15px tall (`text-[9px]`, `py-0.5`) — well under WCAG 2.5.8's 24×24px minimum target size, let alone a comfortable touch target, for what's a real, meaningful tap action. Fixed with `min-h-[28px]` and slightly larger padding/text.
  Everything else audited (every `onClick` is on a real `<button>`, not a `<div>`; card-art color-blind safety already correct via pairing color with symbol/number; contrast combinations all dark-on-light or light-on-dark following the established palette) checked out clean.
- **Manual QA checklist written** (`UNO_GAME_PLAN.md` §25) — every scenario Phase 5's deliverable list named, plus items this session's own work specifically calls for verifying (seat-ring math at player-count extremes, hand-fan overflow at large hand sizes, the audio-silent-until-manifest-populated caveat, the timer-badge question the user's screenshot raised). This is the actual, checkable remaining work — not executed in this session, since no browser-automation tool was available.
- **Feature-toggle/staged-rollout: explicitly documented as not applicable to this working context**, rather than silently dropped or performed as theater. See the roadmap entry above.

**Deliberately not done:** bootstrapping a client-side test framework (vitest+RTL+axe-core) from zero. This repo's `client` package has never had automated component/accessibility tests — adding the first one is a real infrastructure decision (test runner choice, CI wiring, ongoing maintenance) that belongs to a deliberate call, not something to smuggle in as a side effect of finishing UNO's Phase 5. Flagged here as a genuine open question for whoever owns this codebase's testing strategy, not silently avoided.

**Still open — this is now the actual state of the roadmap:** the entire manual QA checklist (`UNO_GAME_PLAN.md` §25) is unexecuted. Every phase's automated verification (typecheck, 202 tests) has passed throughout, but **no one has played a full match, heard a sound, or used a screen reader against this code yet.** That is the honest, current bottom line — not "Phase 5 is done," but "everything that could be done without driving a real browser or having real audio assets is done."

---

### 2026-07-12 — Phase 5 (Testing & Release) resumed: first real browser-automation pass

**Context:** every prior session recorded the same honest gap — no browser-automation tool was available (`browser-use` CLI not found), so Phase 5's manual QA checklist (`UNO_GAME_PLAN.md` §25) was written but never executed. This session built a small CDP driver (headless Chrome + the `ws` package already present in `client/node_modules`, since neither `browser-use` nor `chromium-cli` were available in this environment either) and used it to actually drive the app end-to-end for the first time. See `UNO_GAME_PLAN.md` §25 for the itemised checklist state; this entry records what that session found and changed.

**Four real bugs found and fixed, all through genuinely exercising the app, not code review:**

1. **Timer/header pill collision (both shells).** `TurnTimeWarning`'s countdown chip is `position: fixed` at the exact top-center slot UNO's own room-code pill also centres itself in — confirmed via screenshot at a Fast (10s) timer: the two visually overlapped, and on the mobile shell the warning chip nearly fully hid the room pill. This is UNO-specific: Rummy (which the component was extracted from) never collides because its own branding pill sits left-aligned in a flex header row, not centred in the same fixed slot. Fixed additively — `TurnTimeWarning` gained an optional `topOffsetRem` prop (default `0.75`, so Rummy/Word Building/Dots & Boxes are byte-for-byte unaffected), and both UNO shells now pass an offset that clears their own header. Verified fixed by screenshotting the ≤10s critical/red state again on both shells post-fix.
2. **`room:join` had no error handling — a thrown error hung the client forever.** `room:create`'s socket handler wraps `RoomManager.createRoom` in try/catch; `room:join` did not wrap `joinRoom`. Reproduced live: after a rematch attempt failed with a genuine `"UNO requires 2-8 players"` engine error (root cause not fully pinned down — likely an artifact of this session's own rapid-reload stress-testing, not a normal user path), the *next* reconnect to that same room hung on "Connecting to room…" indefinitely — no error, no redirect, no timeout on the client side. `Room.tsx`'s own join-ack handler already has correct, thoughtful error UI (a 4-second explanatory toast then redirect home) for the case where `joinRoom` returns `{ ok: false }` cleanly; the bug was that a *thrown* error inside `joinRoom` never called `ack` at all, so that good error path never engaged. Fixed by wrapping `room:join` in try/catch exactly like `room:create` already does (`server/src/sockets/index.ts`). This is a defensive fix independent of whatever specifically threw — any future exception in `joinRoom` now degrades to a clean error message instead of an infinite spinner.
3. **Opponent-chip overlap at high player counts on the mobile shell.** Confirmed at 8 players / ≤768px: `UnoPlayerChip`'s full name+count pill has a fixed footprint regardless of viewport width or player density, and `computeSeatPosition`'s percentage-based ellipse gives seats proportionally less pixel gap on a narrow viewport — the pills visually collided into an illegible mess. Desktop at the same 8-player count was and remains clean (more horizontal room). Fixed with an opt-in `compact` prop (smaller avatar, name dropped — the avatar's initials+colour already carry identity, the count is what actually matters at a glance) passed from `UnoBoardMobile.tsx` once `opponents.length > 4`; desktop untouched. Verified fixed at 768px and re-confirmed the true desktop cutover is 1280px, not 1024 (see below), so this compact mode is live across the entire mobile-shell width range including up to 1279px.
4. **Every `lastAction` string except the action-card ones leaked a raw internal player id.** Confirmed live: the Wild Draw Four challenge toast read a real name correctly (`useUnoBoard`/`uno-challenge.tsx` resolve names client-side), but `UnoActionToast` — which just renders `state.lastAction` verbatim — showed things like `"Dealt 7 cards. p_1783829720297_wvkx9d to play."` The engine had never stored player *names*, only ids, for these 7 message sites (deal, declare, catch, Wild+4-pending/accept/challenge-win/challenge-lose, draw, pass); only the action-card descriptions (Skip/Reverse/+2) were already id-free by design. Fixed by adding a `private names: Record<string,string>` map (populated in `init()` from the `Player[]` list already passed in) and a small `nameOf()` helper, threaded through all 7 sites in `UnoEngine.ts`. 202/202 server tests still pass; `tsc --noEmit` clean on both packages.

**Also found and fixed, adjacent to the above:** `should return valid moves for current player` (`server/src/games/uno/__tests__/engine.test.ts`) flaked in a full-suite run — `AssertionError: expected 0 to be greater than 0`. It asserted an unseeded, real-shuffle deal always gives player 1 at least one legal opening move, which the rules don't actually guarantee (only Wild is unconditionally legal, and an unlucky 7-card hand can hold none). Fixed using the file's own established pattern (`stateOf(engine).hands["p1"] = [...]` to rig an exact hand) instead of asserting on randomness. Reproduced the flake, then confirmed the fix is deterministic across repeated runs.

**Confirmed working, not just typechecked, for the first time this session (see `UNO_GAME_PLAN.md` §25 for the itemised state):**
- The circular-table redesign renders correctly on **both** shells (only desktop had a user screenshot before this) — hand fan (Motion), discard-pile 3D flip (React Spring), direction arc, seat ring at 2/3/8 players.
- `UnoResultModal` firing live with real, correctly-computed non-zero scores, on both shells, and a rematch correctly dealing a fresh round.
- The full turn-timer chain: `UnoTimerBadge` counting down, `TurnTimeWarning`'s pulse at ≤10s and critical/red state at ≤5s, and a lapsed timer genuinely forcing a move via `getTimeoutActor` — all previously reasoned about, none previously watched happen.
- `WildDrawFourChallengePrompt` rendering with a real opponent name for the first time this engine mechanic has ever been driven through a live UI.
- The actual desktop/mobile shell boundary is **1280px width** (`UnoBoard.tsx`'s own documented gate, plus `hover:hover`/`pointer:fine`), confirmed precisely (1279px stays mobile, 1280px flips live on resize, no reload needed) — not 1024px, which AGENTS.md's generic four-breakpoint convention might imply is the switch point. Not a bug, just a precise confirmation of where the real boundary is for future testers.
- `prefers-reduced-motion` genuinely engages Motion's `useReducedMotion()` path (confirmed via CDP media emulation — Motion's own library logged its internal reduced-motion notice), and every card remains identifiable by number alone under full achromatopsia (greyscale) emulation.
- A real Tab-key trace reaches every meaningful control in a sane order (Leave → tutorial → hand cards → Draw Card once legally enabled → room reactions), with disabled buttons correctly excluded.

**Still open, stated plainly:** a colour picker was never actually seen rendering live (a Wild in hand was auto-played by the turn timer first); no Wild Draw Four decision was confirmed to resolve via a *manual* Accept/Challenge click rather than its own timeout; declare/catch UNO was not exercised through real 1-card-hand play this session (only via a direct function call in the prior session, for the confetti work); Reverse/Skip weren't isolated as their own live scenarios; draw-pile reshuffle wasn't exercised; audio remains untestable (no manifest entries, and this session additionally observed *other* games' audio failing to decode in this specific headless environment — plausibly a headless-only codec limitation, not confirmed either way); and no real screen reader was available. The root cause of the one-off `"UNO requires 2-8 players"` rematch failure that triggered bug #2's discovery was not fully pinned down — plausibly an artifact of this session's own unusually rapid repeated-reload stress pattern rather than a path a real user would hit, but the defensive fix (item #2) closes the resulting hang regardless of root cause.

### 2026-07-12 (continued) — deliberate, no-timer play closes out most of the prior entry's open items

**Context:** the same-day entry above closed four real bugs but left several gameplay scenarios unconfirmed because the turn timer kept forcing moves before a deliberate action (selecting a Wild, clicking a challenge decision) could be captured. This session created a **No-timer** room specifically to remove that race and played through it deliberately, scripting the mechanical parts (drawing until a needed card appeared, playing whatever was legal) while manually driving the scenarios that mattered.

**Closed, live, for the first time:**
- **The Wild colour picker.** Selected a Wild card, the "Choose Color" swatch panel rendered, picked Green, played it, and the discard pile correctly showed the Wild card labelled "→ GREEN" with the next turn's valid moves gated on Green.
- **UNO declared correctly, end to end.** Played a real hand down to 1 card in a 2-player game, `UnoCallButton` appeared, tapping it popped `UnoDeclareBubble` *and* fired the declare confetti burst together — the confetti work from the earlier session, now confirmed through genuine gameplay rather than a direct function call. Played the final card to win; `UnoResultModal` showed "You win! +14 points" with the win-confetti burst too, correctly gated to the self-winner (the round before this one, I lost 0-14 and correctly saw no confetti at all).
- **Skip, in a real 2-player game.** Played two different Skip cards; both correctly gave the same player another turn rather than passing to the only opponent, matching "Skip skips the only other player."
- **The Wild Draw Four state machine, both directions.** Played `Wild Draw Four` myself twice (making the bot the decider) and confirmed the bot's own `challenge`/`acceptDraw` decision resolves turn order correctly either way — the exact `handleChallengeDecision` code path a human's click would exercise, just decided by the bot's `applyAutoMove` instead of mine. Genuinely could not get my own click to land first in either live sighting of the prompt (session 1's timeout; this session's bot-as-decider setup) — recorded honestly as still open below.

**A new finding, not a bug — a structural test-coverage gap:** "UNO missed and caught" (`UNO_GAME_PLAN.md` §25.1) is likely **untestable against bot opponents at all**. The bot auto-move path always self-declares the instant a bot's hand reaches 1 card (confirmed in code and never once observed missing it across several full matches this session) — so a bot never sits in the undeclared, catchable state `catchUno` targets. Closing this checklist item for real needs a second human player who deliberately withholds their declaration, not more bot-room testing.

**Still open, honestly:** a human manually clicking "Accept"/"Challenge!" before either a timeout or a bot's own turn resolves it first; Reverse in isolation (no Reverse card came up this session; the underlying `stepIndex` logic is unit-tested, just not re-watched live); draw-pile exhaustion/reshuffle; the catch mechanic (see above — needs a second human); audio; a real screen reader.

---

*This report supersedes neither `uno-plan-of-action.md` nor `UNO_GAME_PLAN.md` as historical artifacts, but §6–§7 of this document is the canonical implementation reference going forward, and §9 is the record of what has actually shipped against it. Do not implement Phase 2+ work directly from either source document without cross-checking against §6's governing principle and §7's phase gates.*
