# Mandali — acceptance, verification and release

Date: 2026-09-16. This is a future execution checklist, not a claim that implementation tests have run. Read with the [implementation plan](MANDALI_IMPLEMENTATION_PLAN.md) and [architecture](MANDALI_ARCHITECTURE.md).

## 1. Requirement coverage

R1 is the first production release; R2/R3 are planned expansions. Source identifiers refer to `Bhalyam_Circles_PRD_and_Planning.md`.

| Source | Delivery | Proof of completion |
|---|---|---|
| FR-001 Create | M2/R1 | Group, sole owner, audit and outbox commit together; retry makes one group |
| FR-002 Edit | M2/R1 | Authorized versioned edit, validation/cooldown, stable IDs/history and system notice |
| FR-003 Transfer | M2/R1 | Two simultaneous transfers leave exactly one eligible owner |
| FR-004 Archive/delete | M2/R1 | New writes denied; restore/request/purge/hold policy tested without destroying protected evidence |
| FR-005 Username invites | M1/M3/R1 | Unique handle lookup is privacy-safe, opt-in, block-aware and rate-limited |
| FR-006 Secure links | M3/R1 | Hash-only storage, limited preview, no automatic membership, expiry/revoke/rotate/use rules |
| FR-007 Approval | M3/R1 | Duplicate approval and final-slot races create at most one valid membership |
| FR-008 Lifecycle | M3/R1 | Immediate future-access denial; leave/ban/suspension/restore/rejoin do not restore stale powers |
| FR-009 Permissions | M1–M3/R1 | Table-driven actor/target checks server-side; probation/mute do not corrupt roles |
| FR-010 Info/members | M3/R1 | Scoped pagination; outsiders and guest-pass recipients cannot list members |
| FR-011 Durable chat | M4/M5/R1 | Text/reply/thread/reaction/mention/edit/tombstone/read cursor and pagination recover canonically |
| FR-012 Structured cards | M4/M6/R1, extensions R2/R3 | Only server-issued proposals/system/moderation/results render trusted cards; other kinds arrive with their features |
| FR-013 Presence | M8/R1 | Opt-in, expiry, multi-tab reconstruction and block filtering; never authorization |
| FR-014 Pulse | M8/R1, extra cards R2/R3 | Available members/certified suggestions/open seats/permitted approvals; no phantom event/challenge/resource features |
| FR-015 Proposal | M6/R1 | Server catalog/options/config/cost validation and current actor permission |
| FR-016 Seats | M6/R1 | Last-seat race cannot overbook; duplicate identity/active participation rejected |
| FR-017 Waitlist | M6/R1 | FIFO offer rechecks eligibility; timeout/release promotes next once |
| FR-018 Room creation | M6/R1 | One binding per proposal; retry and lost response do not duplicate a live room |
| FR-019 Game link | M6/R1 | Scoped locator plus current identity/access; same-tab route and all stale-state fallbacks |
| FR-020 Game card | M6/R1 | Accurate counts/state/cost/guest/bot labels and permission-aware actions |
| FR-021 Guest pass | M6/R1 | One recipient/proposal; no private group data; initial verified non-member scope requires plan acceptance |
| FR-022 Smart fill | M6/R1 | Wait/guest/bot/waitlist/cancel obey game bounds, blocks and minimum member rule |
| FR-023 Events/polls | M10/R2 | UTC/IANA scheduling, DST/cancellation/reminder idempotency, RSVP/waitlist and frozen poll rules |
| FR-024 Progression | M10/R2 | Cosmetic only; finalized outcomes; no message-volume XP; anti-farming and dedup |
| FR-025 Challenges | M10/R2 | Unique source-result contributions; duplicate event cannot double progress |
| FR-026 Seasons | M10/R2 | Only seasonal state resets; ownership/membership/permanent achievements survive |
| FR-027 Recognition | M10/R2 | Positive behavior categories; no public downvotes/inactivity shaming |
| FR-028 Memories | M7/R1 basic history; M10/R2 richer memories | Stable-identity result survives restart; later external cards require consent |
| FR-029 Recap | M10/R2 | Private preference-aware summary; no member shaming; retry does not duplicate |
| FR-030 Resources | M11/R3 | Isolated approved resource, balanced ledger, caps/reversal/idempotency/collusion and independent audit |
| FR-031 Moderation | M3/M4/M9/R1 | Member controls plus real review/escalation/appeal/evidence retention and moderator hierarchy |
| FR-032 Notifications | M5/R1 in-app; later channels separate | Durable deduped inbox, category preferences, revoked-link reauthorization; no assumed push/email provider |
| FR-033 Analytics | M8/M9/R1 basics; R2 expanded | Completion/conversion/reliability metrics; only authorized aggregates; internal risk stays internal |

Explicit source deviations: Mandali naming confirmed; Express replaces proposed NestJS; no Redis; live game restart restoration excluded by user; RPC transactions reuse PostgREST; one general channel; server-enforced feature flags; initial guest/game cohorts remain proposed. These are visible decisions, not silent omissions.

## 2. Behavioral acceptance scenarios

### A. Identity and tenant isolation

- A01: Missing/forged/expired credentials cannot create/read/subscribe to a Mandali. Auth-off mode does not invent `dev_member` access.
- A02: Supplying another account's identity in body/path/socket payload never changes actor identity.
- A03: Guessing group, channel, message, thread, report, proposal or result IDs cannot cross group boundaries.
- A04: Guest-pass recipient sees only their proposal/lobby/game/result; no members, chat, presence, group history or private moderation metadata.
- A05: Account switch/logout discards private cache and stale in-flight responses, subscriptions, drafts and notifications from the old identity.
- A06: An expired account token cannot indefinitely retain subscription rights. Refresh updates the existing socket's Mandali identity correctly.
- A07: Actual anon/authenticated PostgREST credentials cannot read tables or execute service-only RPCs. The server service-key path still rejects unauthorized actors.

### B. Membership and invitations

- B01: Repeated create key makes one group; reused key/different body conflicts. Concurrent account-limit requests cannot exceed quota.
- B02: Exactly one eligible owner exists before and after transfer, including concurrent transfers and owner account lifecycle actions.
- B03: Two approvals for the final member slot produce one success. Two approvals for the same request produce one membership/use/audit outcome.
- B04: Link opening never grants content access. Approval after revocation/expiry/exhaustion fails; successful use increments only on committed membership.
- B05: Direct invite accept rechecks current inviter rights, blocks, group state and capacity. A recipient cannot accept another person's invitation.
- B06: Lost token-create response does not require plaintext persistence; replay exposes a safe receipt and explicit rotate action.
- B07: Moderator cannot remove/alter owner or peer moderator; muted moderator cannot create invitations; role restrictions are enforced in RPC, not only UI.
- B08: Removed/banned account loses future reads/writes/search/subscriptions immediately; old seat token does not restore access. Unban alone does not rejoin.
- B09: Probation visibility starts at joining; reply/search/reaction paths cannot disclose older bodies. Rejoining does not restore former administrative role.
- B10: Archive races with send/approve/launch produce a valid serialized outcome. Restore is within the approved policy window; deletion holds protect evidence.

### C. Chat, notifications and moderation

- C01: Lost send response + same request retry results in one canonical message. Optimistic UI neither duplicates nor silently reports failure after commit.
- C02: Duplicate/out-of-order websocket hints and gaps converge to server sequence/version. Edit/delete/restriction changes recover too.
- C03: Subscribe/snapshot race does not lose events. Retention-expired cursor resets safely. Hidden/tombstoned records do not cause infinite gap recovery.
- C04: Read cursor advances only from viewed authorized messages, never backward or beyond server high-watermark.
- C05: Malformed structures, spoofed system/card kinds, oversized text, path-like avatar IDs and reaction values are rejected/sanitized. Unicode renders escaped; external URLs do not become trusted cards.
- C06: Report captures evidence; author deletion does not erase restricted report evidence; only authorized reviewer sees reporter identity/notes.
- C07: Mute, ban, slow mode, thread lock, block and personal hiding apply consistently to REST, realtime and notification targeting.
- C08: Committed message survives process restart; DB failure cannot show a successful send. Notification failure does not roll back the message.
- C09: Per-category mute/batching works; event replay creates one inbox item. Opening stale notification reauthorizes and reveals no removed-group content.
- C10: Report → assigned reviewer → action/escalation → appeal is usable end to end; report/rate-limit abuse cannot flood the queue unboundedly.

### D. Proposals and game admission

- D01: Proposal game/options/bounds/entry requirements come from the authoritative catalog. Changing consent-relevant config invalidates confirmation.
- D02: Concurrent final-seat reservations cannot overbook; one identity cannot take two seats via two tabs or proposals.
- D03: Waitlist offers are FIFO, bounded, reauthorized and reclaimable after restart. Removed/blocked users cannot regain a slot through an old offer.
- D04: Repeated launch/lost acknowledgment yields one binding and one visible lobby. An offline organizer never produces a phantom host/socket.
- D05: Cancel versus room creation creates a cancelled proposal with no usable orphan room or a valid exposed lobby followed by controlled cancellation.
- D06: A leaked room code, direct route, TV route, spectator event, old seat token or ordinary `room:join` cannot bypass private admission.
- D07: Removal during admission/after async await stops private delivery and releases/removes the seat before removal is acknowledged.
- D08: Joining another room requires explicit leave; no orphaned old socket/seat. Reconnect retains correct identity and seat ownership.
- D09: Guest pass cannot be forwarded to another identity, outlive its proposal/round, or enter a rematch. Guest access grants no economy exemption.
- D10: Bot fill stays within catalog limits and never substitutes for the minimum real-member requirement. Unauthorized add-local/add-bot/spectate fails.
- D11: Successful Join navigates in the same tab into the existing lobby; existing ready/entry consent/start flow remains authoritative.
- D12: Full, started, completed, cancelled, expired, failed, membership-lost and interrupted states each have a clear safe fallback.
- D13: Rematch has new child proposal/round lineage, renewed eligibility/consent, independent result ID and no old-token admission.
- D14: Public/guest/solo/pass-and-play ordinary-room behavior remains unchanged; regression suites prove this rather than assuming it.

### E. Results, restart and worker correctness

- E01: Crash before/after message commit distinguishes retryable uncommitted work from durable success.
- E02: Crash before room exposure uses only safe fenced retry; crash after exposure marks unavailable and requires an explicit new proposal.
- E03: Old process authority cannot acknowledge a binding or admit players after replacement fencing; overlapping deploy test proves this.
- E04: Crash after result intent but before projection creates one history entry after restart, using stable identities including departed participants.
- E05: Outcome lost before durable intent is interrupted/unknown; no fabricated result, progress or refund.
- E06: Existing economy commit/consent/settlement/refund/voucher flows remain idempotent. A fresh proposal does not silently resolve an old uncertain settlement.
- E07: Replayed final results, draw/abandonment, bots, guest recipient and rematch rounds are represented accurately and cannot double-count.
- E08: Expired outbox claims are recovered; obsolete lease owner cannot complete/retry; one failed consumer does not duplicate another consumer's side effect.
- E09: Dead-letter replay is audited and idempotent. Database outage keeps durable commands fail-closed and terminal results visibly pending.
- E10: Backup restore reproduces memberships, messages, access controls, pending workflows and result history. Purge/export processes honor holds and anonymization policy.

## 3. Test layers and evidence

| Layer | What to prove | Where |
|---|---|---|
| Unit | Permissions, state transitions, validation, expiry/notification policy | Co-located `server/src/mandali/__tests__` and shared/client tests |
| Repository contracts | RPC error translation, bigint string boundaries, idempotency outcomes | Mandali repository tests; memory doubles only for fast contracts |
| Real Postgres | FK/owner trigger, unique/capacity checks, transactions, races, locks, lease fencing | Extend existing persistence harness with separate connections and deterministic barriers |
| Real PostgREST | Actual function grants, roles, RLS and transport; no mocks for this proof | Disposable local Supabase or isolated staging project; service/anon/authenticated credential matrix |
| HTTP + Socket.IO | Auth, subscriptions, version reconciliation, revoked admission and leaks | In-process/test-server integration with actual clients |
| Browser | Multi-account create → invite → chat → proposal → game → result loop | Extend existing Playwright setup; isolated contexts/accounts |
| Chaos/operations | Crash points, DB failure, retries, authority loss, restore, kill switches | Controlled test environment and reproducible runbook |

Race tests must run actual simultaneous transactions using separate connections and synchronization barriers. A single-threaded in-memory test is not evidence of database concurrency correctness. Browser acceptance uses real rendered pages, not arithmetic assertions about viewport constants.

### UI matrix

Widths: 320, 360, 375, 390, 412, 430, 768, 1024 and 1440 pixels. Explicitly inspect dedicated mobile/desktop shells at 375/768/1024/1440; verify the breakpoint switch. Include Android Chrome, iOS Safari and desktop Chromium; use a physical low-end Android device and iOS device for final touch/keyboard checks when available. Emulation-only evidence must be labeled as such.

Measure overflow/clipping, 44×44 touch targets, keyboard-open composer, safe-area behavior, thread/member navigation, 200% zoom, focus trap/restore, keyboard-only flow, resolved contrast, screen reader announcements and reduced motion. Test both themes and long localized/Unicode names without introducing an i18n framework as incidental scope.

### Existing commands to run during development

All commands below are verified as present in package scripts. Execute through the repository's RTK command convention:

```text
rtk npm run typecheck
rtk npm test
rtk npm run build
rtk npm run check:bundle
rtk npm run check:deps
rtk npm run check:admin-key-leak
rtk npm run check:persistence
rtk npm run verify:persistence
rtk npm run coverage
rtk npm run check:mobile-layout
rtk npm run check:a11y-rendered
rtk npm run check:multiplayer
rtk npm run check:soak
rtk npm run check:deployment
rtk npm run release:check
rtk npm run enterprise:check
rtk npm --prefix client run test:e2e:staging
```

Run focused tests per slice, then the complete required release set once the integrated change is ready. Existing runners may not include Mandali until extended; a pass without Mandali scenarios is insufficient. Persistence/staging checks need isolated configured services and fixtures; never point destructive concurrency/restore tests at production. Record baseline unrelated failures separately and do not claim a clean release while required checks fail.

The repository requires release/enterprise scores of 100/100, but those scores do not prove rendered accessibility, mobile layout, persistence durability or coverage. Keep their separate evidence. Bundle target: initial entry under 220kB gzip and existing vendor budget; Mandali route lazy-loaded. Coverage must at least preserve enforced floors and meaningfully cover new behavior, not simply mirror implementation.

## 4. Operational release criteria

Proposed initial reliability targets, to calibrate with M0 baseline and the intended cohort:

- Zero cross-group authorization leaks, duplicate logical rooms, overbooked seats, duplicate financial effects or accepted messages lost after commit.
- 95th-percentile ordinary Mandali API response under 500ms and 99th under 1.5s at target load, excluding external identity-provider latency reported separately.
- 95th-percentile commit-to-visible update under 2 seconds on a healthy connection; reconnect canonical recovery under 5 seconds for an ordinary bounded page.
- Alert when oldest pending outbox/result work exceeds 60 seconds, any dead-letter critical event appears, or report queue exceeds its assigned response target.
- Initial soak envelope: 200 simultaneous authenticated clients across 20 groups, 20 aggregate chat writes/second, realistic presence, 10 concurrent proposal launches, for 60 minutes. These are test goals, not claims of current capacity; adjust upward to match forecast before rollout.
- No unbounded memory growth from repeated joins/leaves/reconnects, timers, listeners, presence entries or cached messages. Capture before/after heap and connection counts.
- Human moderation coverage and support/appeal response ownership assigned before invitations are opened to external users.

Product metrics: proposal-to-room conversion, room-to-completed-game conversion, repeat group play, invitation acceptance, weekly returning Mandalis and interruption/abandonment rates. Establish baseline in internal/QA cohorts; propose numerical uplift targets before broader rollout. Do not optimize for raw chat volume.

## 5. Deployment and rollback

### Additive deployment order

1. Confirm backup/restore and isolated staging; inventory actual auth/persistence configuration without copying secrets.
2. Apply additive schema/RPC migrations with restricted grants and schema version; verify old application still runs.
3. Deploy backend routes/workers with Mandali action flags disabled. Validate health/readiness, schema, strict auth, authority lease and outbox recovery.
4. Deploy lazy frontend and private-route cache/referrer rules. Hidden/disabled routes remain coherent; direct URL cannot bypass server flags.
5. Run real-account full journey and required gates in staging, then internal production cohort.
6. Expand QA → invited users → small account cohort → wider availability after metrics/moderation review. Stage each game independently.

Do not infer safe single-instance operation from desired replica count: verify deployment behavior during replacement. Drain existing matches, block new launch, finish/persist terminal work within a bounded shutdown period, and test the authority-fencing behavior for forced termination.

### Server-owned controls

Implement foundation, invitations, chat writes, proposals, guest pass, Pulse, notifications and maintenance/read-only controls in server configuration. Future events/challenges/progression/resources/cross-group/voice flags remain disabled. Expose a safe capability snapshot to clients. URL/localStorage flags never authorize an action or cohort.

Disabling proposals stops new creation/launch but does not abandon active games. Disabling invitations blocks new issue/acceptance while preserving records. Chat read-only blocks mutations and keeps authorized history. Master kill switch denies new Mandali actions and lets existing game/economy terminal recovery complete. Per-recipient permission revocation remains effective even when notifications are disabled.

### Rollback procedure

1. Disable affected actions and pause new room launches.
2. Preserve authorized read access if safe; revoke access if the incident concerns leakage.
3. Keep required settlement/result recovery running; reconcile pending creations and outbox claims.
4. Roll back application code only to a version compatible with additive schema. Do not drop Mandali tables or truncate audit/evidence to roll back a UI release.
5. Audit manual repair/replay; restart creates unavailable states for lost games, not guessed winners/refunds.
6. Restore service only after a regression test covers the incident and cohort smoke tests pass.

Required runbook sections: auth/storage outage, stuck invitation/proposal, exposed room lost at restart, finalization failed, outbox backlog/dead letters, expired lease/fenced instance, reports/appeals, owner account lifecycle, privacy export/delete/hold, backup restore and kill-switch operation.

## 6. Risk register

| Risk | Mitigation and delivery owner |
|---|---|
| Legacy auth-off membership promotion leaks private data | Strict Mandali guard and auth-off regression; backend M1 |
| Ordinary room-code or seat-token path bypasses Mandali | Central private admission metadata and alternate-path tests; game integration M6 |
| Memory room creation and database state diverge | Unique binding, explicit workflow, epoch/fencing, interrupted boundary; M6/M9 |
| Post-match callbacks use room-local identities | Stable roster and durable result intent/projection; M7 |
| Service role bypasses RLS | Actor checks in RPC, limited grants and real PostgREST tests; M2/M9 |
| Persisted chat expands moderation/privacy obligations | Explicit retention/holds, evidence, staffed review/escalation and delete/export integration; M4/M9 |
| Display names mistaken for unique usernames | Handle registration/normalization and opt-in lookup; M1 |
| Existing party/presence UI mistaken for durable Mandali infrastructure | Separate domain/cache, scoped presence and genuine inbox records; M1/M5/M8 |
| Scope drifts to resources/voice before core works | FR traceability and separately gated R2/R3 packages; product M0/M10/M11 |
| Existing feature flags overridden in browser | Server enforcement and disabled-route tests; M2/M9 |
| Existing uncommitted work overwritten | Focused files/diffs and pre-edit inspection; every milestone |

## 7. Final R1 release sign-off

- [ ] D03–D08 and rollout/default policies accepted; confirmed naming/restart choices reflected in ADRs.
- [ ] All R1 FRs and A–E scenarios have implementation/test evidence with no critical unresolved failures.
- [ ] Complete real-account journey passes for every enabled game, including private admission, same-tab navigation and durable result.
- [ ] Concurrency, commit/retry/crash, restore and expired-lease tests pass against real storage.
- [ ] No broad social/privacy or economy regression; independent authorization/moderation review completed.
- [ ] Both layout shells and required device/accessibility matrix verified in rendered browsers.
- [ ] Quality scores and separate persistence/coverage/mobile/a11y gates pass with dated artifacts.
- [ ] Metrics, alerts, report operator, support/appeal path, runbooks, server flags and rollback rehearsal complete.
- [ ] No raw tokens/secrets/private message bodies in logs, bundles, outbox or notification payloads.
- [ ] Product owner approves rollout based on evidence, not solely a numerical quality score.

## 8. Verification performed for this planning task

- Read the three Mandali source files and required repository engineering documents.
- Inspected current manifests and relevant authentication, persistence, social, routing, Socket.IO, RoomManager and settlement code.
- Confirmed feature naming and restart behavior with the user.
- Mapped all FR-001–FR-033 to delivery stages and observable acceptance evidence.
- Created planning documentation only. No application tests, database migrations, runtime changes, or browser implementation checks were run; those belong to the future milestones above.
