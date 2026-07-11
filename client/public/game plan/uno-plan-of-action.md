# UNO Plan of Action (End to End)

## Document Purpose
This plan converts the vision and requirements from Volume 01 through Volume 08 into a practical, execution-ready roadmap for the existing UNO implementation in this application.

This is a single continuous plan from gameplay correctness to ranked systems, progression, social features, moderation, analytics, and staged launch.

---

## Source Inputs Reviewed
- volume1.md (Product Vision)
- volume2.md (GDD)
- volume3.md (UX and Player Journey)
- volume4.md (Official Rules and House Rules)
- volume5.md (Engagement and Retention)
- volume6.md (Competitive and Ranking)
- volume7.md (Community, Social, Moderation)
- volume8.md (Interaction, Animation, Game Feel)

---

## Current Baseline Summary (Existing UNO in Repo)
- Server-authoritative UNO engine exists.
- Mobile and desktop UNO boards exist.
- Core turn loop exists (play, draw, pass).
- Bot support exists.
- Deal animation and core board UX exist.
- Basic engine tests exist.

Primary gaps to close for full product alignment:
- Official-rule completeness (Wild Draw Four legality challenge flow, strict UNO declaration penalty flow).
- House rule framework and ranked rule-lock enforcement.
- Multi-round/cumulative scoring model and richer results loop.
- Deeper retention systems (missions, progression, seasonal layers).
- Competitive/ranked ecosystem end to end.
- Community moderation and anti-toxicity infrastructure.
- Full analytics and balancing pipeline.

---

## End-to-End Execution Roadmap

## Phase A - Rule Contract and Baseline Hardening
### Goal
Create a single source of truth mapping official UNO rules to implementation behavior.

### Actions
1. Create UNO rules contract doc inside repo docs.
2. Map each Volume 04 rule to engine behavior and expected outcomes.
3. Define deterministic priority order for overlapping effects.
4. Define known edge-case policy table.

### Deliverables
- Rule-to-behavior matrix.
- Gap list with implementation tickets.
- Test specification matrix.

### Exit Criteria
- Team-approved contract with no ambiguous rule outcomes.

---

## Phase B - Official Rules Completion in Engine
### Goal
Close all official gameplay rule gaps in server logic.

### Actions
1. Implement Wild Draw Four legality check.
2. Implement challenge flow with time window.
3. Implement challenge resolution outcomes and penalties.
4. Implement strict UNO declaration timing and missed-call penalties.
5. Handle timer expiry during color selection/challenge windows.
6. Validate opening card legality with fallback draws.
7. Strengthen race-safe event ordering for simultaneous intents.

### Deliverables
- Updated UNO engine behavior.
- Extended move/state contract fields.
- Comprehensive edge-case unit tests.

### Exit Criteria
- 100 percent pass on official rule scenarios from the matrix.

---

## Phase C - Game Options and Mode Framework
### Goal
Add configurable UNO options for private rooms while keeping ranked integrity.

### Actions
1. Introduce UnoGameOptions in shared contracts.
2. Add room creation and lobby plumbing for UNO options.
3. Implement house-rule toggles:
   - Stack draw cards
   - Jump-in
   - Seven swap
   - Zero rotate
   - Keep drawing
   - Force play drawn card
4. Enforce ranked lock: official rules only.
5. Add host UX for option controls and validation.

### Deliverables
- Option schema and defaults.
- Server validation and enforcement.
- Client lobby controls.

### Exit Criteria
- Private rooms can configure rules safely.
- Ranked cannot enable house rules.

---

## Phase D - Match Lifecycle and Scoring Expansion
### Goal
Upgrade from single-round winner flow to complete session lifecycle options.

### Actions
1. Add round scoring using opponents' unplayed cards.
2. Add cumulative match score tracking.
3. Add play-to-target mode configuration.
4. Add round history in results model.
5. Clarify rematch behavior for single-round and multi-round sessions.
6. Upgrade end-of-round and end-of-session result surfaces.

### Deliverables
- Scoring engine support.
- Results model and UI updates.
- Updated rematch lifecycle logic.

### Exit Criteria
- Stable and understandable score progression across rounds.

---

## Phase E - UX and Game Feel Upgrade
### Goal
Align UNO interactions with Volume 08 animation and feel requirements.

### Actions
1. Strengthen playable-card affordances.
2. Improve card play sequence clarity (lift, move, land, state handoff).
3. Improve draw sequence clarity (deck to hand, sequential multi-draw).
4. Add strong but controlled UNO alert drama.
5. Add low-time urgency cues (visual and optional sound/haptics).
6. Improve game-over visibility and information hierarchy.
7. Add reduced-motion support and keyboard/screen-reader improvements.

### Deliverables
- Motion spec implementation.
- Accessibility pass for UNO-specific interactions.
- UX hierarchy compliance updates.

### Exit Criteria
- Smooth gameplay readability across mobile and desktop at 375, 768, 1024, 1440.

---

## Phase F - FTUE and Onboarding Funnel
### Goal
Ensure first-time players can complete a first match in under five minutes.

### Actions
1. Refresh UNO tutorial content with official and challenge mechanics.
2. Add contextual guidance for first match steps.
3. Improve guest quick path to match start.
4. Add first-session clarity cues for turn flow and actions.

### Deliverables
- Updated tutorial deck and gate logic.
- First-session UX improvements.

### Exit Criteria
- First-match completion and comprehension metrics hit targets.

---

## Phase G - Social and Community Loops
### Goal
Increase replay and retention via social momentum.

### Actions
1. Improve rematch prompts and post-match social nudges.
2. Add stronger recent-opponent actions.
3. Improve friend invite flow from room context.
4. Refine quick reactions for positive communication.
5. Apply ranked chat restrictions and safer defaults.

### Deliverables
- Social UX integrations.
- Safety-aware communication settings.

### Exit Criteria
- Increased rematch rate and social retention signals.

---

## Phase H - Progression and Retention Systems
### Goal
Make every session feel meaningful regardless of win/loss.

### Actions
1. Implement XP event model.
2. Implement coins economy model (non-pay-to-win).
3. Implement daily login rewards.
4. Implement daily missions.
5. Implement weekly challenges.
6. Implement level milestones and cosmetic unlock hooks.
7. Add seasonal token support.

### Deliverables
- Progression services and UI surfaces.
- Reward pipelines and schedule config.

### Exit Criteria
- Players consistently receive meaningful progress events.

---

## Phase I - Ranked and Competitive Stack
### Goal
Ship fair, transparent ranked play with seasonal progression.

### Actions
1. Implement ranked eligibility checks.
2. Implement placements.
3. Implement RP gain/loss model.
4. Implement promotion/demotion and tier protection logic.
5. Implement season lifecycle and soft resets.
6. Implement ranked leaderboards (global, regional, friends, season).
7. Add clear RP explanation UX post-match.

### Deliverables
- Ranked matchmaking and rating pipeline.
- Competitive UX and leaderboard surfaces.

### Exit Criteria
- Ranked behaves predictably and is trusted by players.

---

## Phase J - Moderation and Trust Infrastructure
### Goal
Ensure healthy community behavior and safe participation.

### Actions
1. Add report/block flows in match and profile contexts.
2. Add moderation event logging and review tooling.
3. Implement escalating penalties for abuse patterns.
4. Add chat safety filtering and enforcement.
5. Add transparency UX for sanctions where appropriate.

### Deliverables
- Moderation workflows.
- Safety policy enforcement hooks.

### Exit Criteria
- Measurable reduction in toxic interactions and fast response loop.

---

## Phase K - Telemetry, Analytics, and Balancing
### Goal
Run product decisions using observable player behavior and outcomes.

### Actions
1. Track funnel metrics:
   - Landing to match start
   - First-match completion
   - D1, D7, D30 retention
2. Track gameplay metrics:
   - Turn times
   - Draw rates
   - UNO call success/failure
   - Challenge usage and outcomes
3. Track social metrics:
   - Rematch rate
   - Friend-invite conversion
4. Track progression metrics:
   - Mission completion
   - XP/coin earn pacing
5. Track ranked metrics:
   - Queue times
   - RP volatility
   - Match quality
6. Establish weekly balancing review and patch process.

### Deliverables
- Instrumentation plan.
- Dashboards and alerting.
- Balance review cadence.

### Exit Criteria
- Product and balance decisions are metrics-backed.

---

## Phase L - Release Strategy and Rollout
### Goal
Launch safely with quality gates and rollback confidence.

### Actions
1. Internal alpha with scripted scenario checklist.
2. Closed beta with invited cohort.
3. Open beta with broader traffic and telemetry soak.
4. General availability launch with feature flags.
5. Run post-launch stabilization sprints.

### Deliverables
- Launch runbook.
- Rollback and incident playbook.
- Support and comms plan.

### Exit Criteria
- Stable GA and healthy leading indicators.

---

## Workstreams by Technical Layer

## 1) Server Engine and Rule Processing
- Extend UNO move model for declare/challenge windows and penalty resolution.
- Keep all gameplay truth on server.
- Harden concurrency/race handling.

## 2) Shared Types and Contracts
- Add options, challenge state, penalties, round history, cumulative scoring fields.
- Keep backward compatibility strategy for phased deployment.

## 3) Room and Socket Orchestration
- Add challenge and declaration events with clear ack/error behavior.
- Ensure reconnect and timer interactions are deterministic.

## 4) Client Boards and Shared UNO UI
- Keep wrapper + dual-layout split.
- Centralize logic in shared hook/state to avoid duplicated behavior.
- Expand rail/sheet information architecture for scores and social actions.

## 5) Bots
- Add difficulty tiers and strategy weighting.
- Preserve fairness and human-like pacing.

## 6) Persistence and Services
- Add durable storage for profile, rank, progression, match history, moderation events.

## 7) Live-Ops Content
- Data-driven missions, rewards, seasons, event calendars.

---

## Quality and Verification Plan

## Rule Correctness
- Full matrix tests for official rules and house-rule combinations.
- Deterministic edge-case assertions.

## Engine and Integration
- Unit tests for all move transitions and penalty states.
- Integration tests for socket event sequencing and reconnect windows.

## UI Verification
- Manual and automated checks across 375, 768, 1024, 1440.
- Validate both mobile and desktop shells.

## Accessibility
- Keyboard-only gameplay path.
- Screen-reader update announcements.
- Color and contrast checks.
- Reduced-motion compliance.

## Competitive Integrity
- Ranked official-rule lock checks.
- Matchmaking quality and RP explainability checks.

## Retention and Analytics
- Confirm event instrumentation completeness.
- Validate dashboards before wider rollout.

---

## Dependency Order (Critical Path)
1. Phase A -> Phase B
2. Phase B -> Phase C and Phase D
3. Phase B -> Phase E and Phase F
4. Phase D + Phase G + Phase H -> Phase I
5. Phase I + Phase G -> Phase J
6. Phase D + Phase H -> Phase K
7. Phase K + all core phases -> Phase L

---

## Risks and Mitigations

## Risk 1: Rule complexity creates regressions
Mitigation: Rule matrix + exhaustive tests before feature rollout.

## Risk 2: House rules conflict with competitive integrity
Mitigation: Strict ranked lock and server validation.

## Risk 3: UX polish introduces input ambiguity
Mitigation: Accessibility-first interaction contracts and user testing.

## Risk 4: Progression economy imbalance
Mitigation: Telemetry-backed tuning with guardrails.

## Risk 5: Social features increase moderation burden
Mitigation: Early moderation tooling and proactive safety defaults.

---

## Success Metrics (North-Star and Supporting)

## Core Experience
- Match start time
- Match completion rate
- Rematch rate

## Retention
- D1, D7, D30 retention
- Sessions per week

## Competitive
- Ranked participation
- Match quality and queue times
- RP volatility within expected bounds

## Community Health
- Report rate trends
- Actioned moderation turnaround
- Positive interaction rates

## Progression
- Daily mission completion
- Weekly challenge completion
- Level progression pacing satisfaction

---

## Final Execution Notes
- Keep the server-authoritative architecture unchanged in principle.
- Extend current UNO implementation incrementally rather than rewriting.
- Preserve non-pay-to-win philosophy across all progression and monetization decisions.
- Treat fairness, clarity, responsiveness, and social trust as equal priorities.

This plan is the implementation reference for bringing UNO from current baseline to full product-grade experience in this application.