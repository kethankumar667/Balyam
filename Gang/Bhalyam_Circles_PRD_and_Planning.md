# Bhalyam Circles Product Requirements Document

## Product Requirements and Delivery Plan

**Version:** 1.0  
**Status:** Draft for product and engineering planning  
**Feature:** Bhalyam Circles  
**Product:** Bhalyam  
**Primary architecture constraint:** No Redis in the initial release  
**Target clients:** Responsive web application and PWA across major Android and iOS devices used in India

---

## 1. Purpose

This PRD defines the complete product, functional, technical, privacy, moderation, analytics, testing, release, and operational requirements for Bhalyam Circles.

Bhalyam Circles is a private social gaming system through which approved players can communicate, invite trusted members, organize games, open secure game invitations in the same browser tab, participate in shared activities, and build persistent group identity.

---

## 2. Vision

Bhalyam Circles will become the private social operating system for multiplayer gaming inside Bhalyam.

```text
Trusted players
→ Private Circle
→ Availability and coordination
→ Game proposal
→ Seat reservation
→ Authoritative room creation
→ Same-tab join
→ Completed game
→ Shared memory and progression
→ Repeat engagement
```

---

## 3. Problem Statement

Players currently experience friction when recurring groups must repeatedly copy ordinary game links and share them through external messaging applications. Existing room links are not designed as persistent social coordination objects and may not provide Circle-scoped authorization, participation tracking, expiration, member privacy, structured status, or same-tab pre-lobby navigation.

Bhalyam needs a private in-application system that makes trusted groups easier to form and retain while preserving game integrity, privacy, moderation, and economy safety.

---

## 4. Goals

### 4.1 Product Goals

- Allow any eligible player to create a private Circle.
- Support direct username invitations and secure invite-link join requests.
- Allow owners to appoint moderators.
- Provide durable Circle chat and structured social content.
- Allow members to propose, fill, and join games without external messaging.
- Use a Circle-specific game token and same-tab navigation.
- Support privacy-safe presence and Circle Pulse.
- Establish a platform for group events, challenges, progression, recognition, memories, and carefully controlled resource requests.
- Operate without Redis during the initial release.

### 4.2 Engineering Goals

- Keep PostgreSQL authoritative.
- Make sensitive commands transactional and idempotent.
- Recover missed real-time events through canonical REST synchronization.
- Prevent duplicate rooms, seats, memberships, approvals, and transactions.
- Support one WebSocket-serving NestJS instance as an explicit initial boundary.
- Keep ephemeral state reconstructable.
- Preserve infrastructure interfaces for future scaling.

### 4.3 Safety Goals

- Keep every Circle private.
- Require server-side permission enforcement.
- Prevent invitation abuse and unauthorized content access.
- Provide member reporting, blocking, muting, and appeal paths.
- Exclude unrestricted main-wallet and cash-equivalent transfers from the initial release.

---

## 5. Non-Goals for Initial Release

- Public Circle discovery.
- Public Circle profiles or member lists.
- Automatic membership through a link.
- Voice rooms.
- Circle-versus-Circle competition.
- Reward-bearing seasons.
- Unrestricted coin or wallet transfers.
- User-created arbitrary channels.
- Horizontal scaling of the WebSocket gateway.
- Redis-based cache, queue, presence, rate limiting, locking, or Socket.IO adapter.
- Public downvotes or public trust scores.

---

## 6. Personas

### Circle Creator

Wants to establish a recurring private group and control its identity, membership, and rules.

### Circle Moderator

Helps review requests, manage members, organize games, and keep conversations healthy.

### Circle Member

Wants to communicate, find available players, join games quickly, and participate in shared activity.

### Guest Player

Wants to join one invited game without gaining access to private Circle content.

### Platform Moderator

Needs evidence, reports, audit history, enforcement controls, and an appeal workflow.

### Bhalyam Operations User

Needs reliable operational metrics, failed-workflow visibility, abuse signals, and safe recovery controls.

---

## 7. Product Terminology

- **Circle:** Private persistent player group.
- **Owner:** Single highest-authority Circle member.
- **Moderator:** Delegated Circle administrator.
- **Member:** Standard approved participant.
- **Probationary member:** Newly approved member with temporary restrictions.
- **Guest:** Player with access to one game proposal only.
- **Game proposal:** Intent and participant collection object before room creation.
- **Circle Game Card:** Structured interactive representation of a proposal or room.
- **Circle Pulse:** Coordination surface for availability, games, events, and challenges.
- **Social Match Memory:** Private record of shared milestones.

---

## 8. Functional Requirements

### FR-001: Create Circle

An eligible authenticated player can create a Circle with a name and optional description, avatar, motto, language, rules, and preferred games.

Acceptance requirements:

- The creator becomes the single owner.
- The Circle is private.
- Name validation is applied.
- Creation is idempotent.
- A Circle and owner membership are created in one transaction.
- An audit entry and outbox event are recorded.

### FR-002: Edit Circle

The owner can edit authorized Circle information. Protected security and economy fields require explicit permissions.

- Renaming does not change internal IDs or historical references.
- Rename cooldown and content validation are enforced.
- Members receive a system message for meaningful identity changes.

### FR-003: Transfer Ownership

The owner can transfer ownership to an eligible active member.

- Exactly one owner exists before and after the operation.
- Ownership transfer is transactionally locked.
- The current owner is demoted according to product policy.
- The action is auditable and idempotent.

### FR-004: Archive and Delete

The owner can archive a Circle. Permanent deletion follows a recoverable retention process.

- Archived Circles reject new messages, joins, proposals, and requests.
- Existing data remains available according to retention policy.
- Permanent deletion cannot remove required moderation, financial, or audit records.

### FR-005: Invite by Username

Authorized members can search privacy-safe user profiles and invite eligible players.

- Search does not reveal sensitive identity, financial, location, membership, or device data.
- Blocks and user invitation preferences are respected.
- Duplicate or spam invitations are prevented.

### FR-006: Invite by Secure Link

Authorized members can generate revocable, expiring invitation links.

- Store token hashes, not raw tokens.
- Link opening displays only a privacy-safe preview.
- Link use creates a join request rather than membership.
- Links support expiration, maximum uses, source labels, rotation, and revocation.

### FR-007: Join Request Review

Owners and moderators can approve or reject pending requests.

- Approval revalidates capacity, eligibility, blocks, Circle state, and request status.
- Duplicate approval cannot create duplicate membership.
- Rejection and approval are auditable.

### FR-008: Membership Lifecycle

Membership states:

```text
ACTIVE
PROBATION
MUTED
SUSPENDED
LEFT
REMOVED
BANNED
```

- Removed or banned users immediately lose Circle authorization.
- Rejoining does not restore prior administrative roles.
- Owners cannot leave without transfer.
- Historical game records remain subject to privacy and retention rules.

### FR-009: Roles and Permissions

Implement backend-enforced permission bundles.

Minimum roles:

- Owner.
- Moderator.
- Member.
- Probationary member.
- Muted member.

Optional later roles:

- Game Captain.
- Event Organizer.
- Mentor.

The UI may hide unauthorized actions, but the backend remains authoritative.

### FR-010: Circle Information and Member List

Approved members can view permitted Circle information and a paginated member list. Guests cannot access it.

### FR-011: Durable Chat

Members can exchange durable messages in authorized channels.

Initial capabilities:

- Text.
- Reactions.
- Replies.
- Threads.
- Mentions.
- Edits with history.
- Soft deletion.
- Unread cursor.
- Pagination.
- Announcements.
- Reporting.

Messages use server-generated IDs and sequence values. Client timestamps do not determine authoritative order.

### FR-012: Structured Cards

The system supports structured message types for games, events, polls, achievements, memories, resource requests, and moderation notices. Only backend-validated Bhalyam links become trusted interactive cards.

### FR-013: Presence

Members may choose a presence state:

```text
AVAILABLE
LOOKING_FOR_PLAYERS
PLAYING
BUSY
DO_NOT_DISTURB
OFFLINE
```

- Presence is optional and ephemeral.
- It is lost and reconstructed after restart.
- It is not used for authorization.
- No exact location, device, or unrelated activity is exposed.

### FR-014: Circle Pulse

Circle Pulse displays:

- Members explicitly available.
- Compatible game suggestions.
- Active proposals and open seats.
- Upcoming event.
- Current challenge.
- Open supported-resource request.
- Recent achievement.
- Pending approvals for authorized roles.

Recommendations remain non-authoritative and cannot create paid or competitive rooms without explicit action.

### FR-015: Create Game Proposal

An authorized member selects a game, mode, player bounds, timing, expiration, entry requirement, guest policy, and bot policy.

The backend validates creator permission and game configuration before persisting the proposal.

### FR-016: Reserve Proposal Seat

An eligible player can reserve one seat.

- Seat allocation is atomic.
- Capacity cannot be exceeded.
- A player cannot hold duplicate active seats.
- Current membership, guest access, eligibility, room conflict, and entry requirement are checked.

### FR-017: Waitlist

When enabled, eligible users can join an ordered waitlist. A released seat may be offered according to a defined and audited policy.

### FR-018: Authoritative Room Creation

When readiness conditions are satisfied, the backend creates exactly one game room.

- Proposal transitions are conditional.
- Room creation is idempotent.
- Retries resolve to the same room.
- Participant and financial readiness are revalidated.
- Failure produces a recoverable terminal or retry state.

### FR-019: Circle Game Link

A Circle uses a separate route:

```text
/circle-game/:token
```

Opening it requires authentication, token validation, current Circle or guest authorization, room eligibility, current room state, and seat availability. Successful access navigates to the pre-lobby in the same browser tab.

### FR-020: Circle Game Card

The game card displays game, creator, mode, required players, confirmed players, open seats, timing, entry requirement, guest and bot indicators, expiration, status, and eligible actions.

### FR-021: Guest Pass

Authorized users can issue a scoped guest pass for one proposal.

A guest has no access to chat, member lists, other proposals, Circle history, invitations, or resource requests. Access ends with the game lifecycle or earlier revocation.

### FR-022: Smart Fill

When seats are missing, offer waiting, guest invitation, bot fill where eligible, waitlist use, or cancellation. Private Circle information remains hidden.

### FR-023: Events and Polls

Later scope supports scheduled events, participant limits, waitlists, reminders, event threads, cancellation, results, and polls for game, schedule, player count, mode, or challenge.

### FR-024: Circle Progression

Later scope awards progress only from validated activities such as completed games, unique-member participation, events, challenges, fair play, and approved contributions.

No progress is awarded for raw message volume.

### FR-025: Challenges

Collaborative challenges use finalized server-side outcomes and anti-farming validation. Duplicate game events cannot duplicate progress.

### FR-026: Seasons

Seasons may reset seasonal progress only. Membership, ownership, permanent achievements, and Circle identity persist.

### FR-027: Recognition

Support positive, multidimensional recognition without member downvotes or public inactivity shaming.

### FR-028: Social Match Memory

Store privacy-controlled milestones and generate privacy-safe external cards when sharing is explicitly requested.

### FR-029: Weekly Recap

Generate configurable private summaries without publicly ranking inactive members.

### FR-030: Resource Requests

Later controlled scope supports structured requests for approved non-withdrawable resources.

- Main wallet, purchased currency, voucher-redeemable value, cash-equivalent value, and withdrawable value are excluded until separately approved.
- Contributions use a double-entry ledger, idempotency, transactional validation, limits, reversal handling, and abuse monitoring.

### FR-031: Moderation

Members can report, block, mute, hide content, control presence, control invites, and leave. Authorized moderators can mute, remove, ban, restrict, lock, slow, revoke, review, and escalate according to policy.

### FR-032: Notifications

Support invitations, approvals, mentions, replies, announcements, games, seat availability, game readiness, event reminders, requests, challenges, moderation, and recaps.

Users can choose all, mentions only, games only, announcements only, custom, or muted per Circle.

### FR-033: Analytics

Support member, owner, and platform operational analytics while keeping sensitive risk signals internal.

---

## 9. Domain State Machines

### 9.1 Join Request

```text
PENDING → APPROVED
PENDING → REJECTED
PENDING → WITHDRAWN
PENDING → EXPIRED
PENDING → CANCELLED
PENDING → BLOCKED
```

### 9.2 Membership

```text
PROBATION → ACTIVE
ACTIVE → MUTED
MUTED → ACTIVE
ACTIVE|PROBATION|MUTED → SUSPENDED
ACTIVE|PROBATION|MUTED|SUSPENDED → LEFT|REMOVED|BANNED
```

Exact restoration rules for suspended members must be defined before implementation.

### 9.3 Game Proposal

```text
RECRUITING → READY
RECRUITING|READY → CANCELLED|EXPIRED
READY → CREATING_ROOM
CREATING_ROOM → ROOM_CREATED|FAILED
ROOM_CREATED → STARTED|CANCELLED
STARTED → COMPLETED
FAILED → CREATING_ROOM|CANCELLED
```

### 9.4 Proposal Participant

```text
RESERVED
CONFIRMED
WAITLISTED
LEFT
REMOVED
EXPIRED
```

### 9.5 Resource Request

```text
OPEN → PARTIALLY_FULFILLED
OPEN|PARTIALLY_FULFILLED → FULFILLED|EXPIRED|CANCELLED|BLOCKED
```

---

## 10. Data Model

Core entities:

```text
Circle
CircleRole
CircleRolePermission
CircleMembership
CircleInvitation
CircleJoinRequest
CircleChannel
CircleMessage
CircleMessageReaction
CircleMessageReport
CircleGameProposal
CircleGameParticipant
CircleGuestPass
CircleEvent
CirclePoll
CircleChallenge
CircleChallengeContribution
CircleAchievement
CircleSeason
CircleResourceRequest
CircleResourceContribution
CircleModerationAction
CircleAuditLog
CircleNotificationPreference
CircleIdempotencyRecord
CircleOutboxEvent
```

Required database constraints include:

- Unique active membership per player and Circle.
- Exactly one active owner per Circle.
- Unique participant per proposal.
- Unique room reference per proposal.
- Unique idempotency key per command scope.
- Unique processed-event identity per consumer.
- Positive resource amounts.
- Valid enum states.
- Immutable financial references.
- Conditional capacity protection.

---

## 11. Technical Architecture

### 11.1 Initial Deployment

```text
React 18 PWA
        |
Reverse proxy / hosting router
        |
Single NestJS API and WebSocket instance
        |
PostgreSQL
```

The NestJS process may initially host REST controllers, Socket.IO gateway, outbox processor, scheduled cleanup, and notification dispatch. A separate worker may later be launched against the same PostgreSQL database without introducing Redis.

### 11.2 PostgreSQL Responsibilities

PostgreSQL is authoritative for every durable or security-sensitive state. It also supports transactional locking, idempotency, critical rate limits, durable outbox events, and scheduled cleanup coordination.

### 11.3 In-Memory Responsibilities

Process memory may hold only:

- Socket connection registry.
- Temporary selected presence.
- Typing indicators.
- Short-lived low-risk throttles.
- Reconstructable recent deduplication data.

No membership, ownership, room, result, wallet, resource settlement, or moderation decision may exist only in memory.

### 11.4 WebSocket Design

- Use secure WebSocket transport in production.
- Validate origin and authentication.
- Reauthorize every event.
- Validate schemas and payload sizes.
- Apply connection and event limits.
- Use heartbeats.
- Unsubscribe removed members immediately.
- Use server sequence values.
- Recover missed data through REST.
- Keep one WebSocket-serving instance during the initial release.

### 11.5 Transactional Outbox

Every important state-changing transaction writes an outbox event in the same transaction. Workers claim rows using `FOR UPDATE SKIP LOCKED`, increment attempts, process idempotently, retry failures, and expose exhausted events operationally.

PostgreSQL LISTEN/NOTIFY may be used only as a wake-up optimization. Periodic polling remains mandatory for recovery.

### 11.6 Locking and Concurrency

Use:

- Row-level `FOR UPDATE` locks.
- Atomic `UPDATE ... WHERE` predicates.
- Unique constraints.
- Transaction-level advisory locks for workflows such as ownership transfer.
- Serializable isolation only when justified.

Do not use application-memory locks for correctness.

### 11.7 Rate Limiting

- Process memory: typing, presence updates, read acknowledgements, and similar low-risk ephemeral events.
- PostgreSQL or hosting edge: Circle creation, invitations, join requests, approvals, proposals, guest passes, reports, and resource actions.

### 11.8 Client Caching

Use the existing data-fetching stack or React Query for client cache and invalidation. Cached permissions, balances, seats, and room state are never authoritative. Reconnect triggers canonical refetch and message-gap recovery.

### 11.9 Future Scale Boundary

Horizontal WebSocket scaling is not supported by the initial architecture. Before more WebSocket instances are added, introduce a deliberately designed cross-instance event and presence mechanism. Keep interfaces abstract so the Circle domain does not depend on Redis or another specific implementation.

---

## 12. API Surface

Indicative REST groups:

```text
POST   /circles
GET    /circles
GET    /circles/:circleId
PATCH  /circles/:circleId
POST   /circles/:circleId/archive
POST   /circles/:circleId/transfer-ownership

GET    /circles/:circleId/members
POST   /circles/:circleId/invitations/username
POST   /circles/:circleId/invitations/links
DELETE /circles/:circleId/invitations/:invitationId
GET    /circle-invitations
POST   /circle-invitations/:invitationId/accept
POST   /circle-invitations/:invitationId/reject
POST   /circle-join-requests/:requestId/approve
POST   /circle-join-requests/:requestId/reject
POST   /circles/:circleId/leave
PATCH  /circles/:circleId/members/:memberId/role
PATCH  /circles/:circleId/members/:memberId/restriction
DELETE /circles/:circleId/members/:memberId

GET    /circles/:circleId/channels/:channelId/messages
POST   /circles/:circleId/channels/:channelId/messages
PATCH  /circles/:circleId/messages/:messageId
DELETE /circles/:circleId/messages/:messageId
POST   /circles/:circleId/messages/:messageId/reactions
POST   /circles/:circleId/messages/:messageId/reports

GET    /circles/:circleId/pulse
POST   /circles/:circleId/game-proposals
GET    /circles/:circleId/game-proposals
POST   /circle-game-proposals/:proposalId/reserve
POST   /circle-game-proposals/:proposalId/leave
POST   /circle-game-proposals/:proposalId/cancel
POST   /circle-game-proposals/:proposalId/guest-passes
GET    /circle-game/:token

GET    /circles/:circleId/events
POST   /circles/:circleId/events
GET    /circles/:circleId/challenges
GET    /circles/:circleId/memories
GET    /circles/:circleId/analytics
GET    /circles/:circleId/audit-log
```

Exact naming must follow repository conventions and OpenAPI review.

---

## 13. WebSocket Events

Indicative client events:

```text
circle.subscribe
circle.unsubscribe
circle.presence.update
circle.typing.start
circle.typing.stop
circle.read.update
```

Indicative server events:

```text
circle.updated
circle.member.joined
circle.member.removed
circle.member.restricted
circle.message.created
circle.message.updated
circle.message.deleted
circle.presence.changed
circle.game-proposal.created
circle.game-proposal.updated
circle.game-room.created
circle.event.updated
circle.challenge.updated
circle.resource-request.updated
circle.moderation.applied
```

Every durable event includes an event ID, aggregate ID, server time, and sequence or version necessary for reconciliation.

---

## 14. Security Requirements

- Deny by default.
- Authenticate HTTP and WebSocket access.
- Enforce permission checks on every command.
- Verify current membership on subscription and sensitive events.
- Use secure random invitation and game tokens.
- Store token hashes.
- Apply expiration and revocation.
- Validate origin for WebSocket upgrades.
- Validate and sanitize every payload.
- Limit message, attachment, and event sizes.
- Protect against cross-Circle object access.
- Apply idempotency to sensitive mutations.
- Keep secrets and raw tokens out of logs.
- Provide administrative audit trails.
- Run independent authorization and token-leak testing before release.

---

## 15. Moderation Requirements

- Text filtering and spam controls.
- Message and member reporting.
- Blocking.
- User and Circle notification muting.
- Moderator mute, removal, ban, lock, slow mode, and link revocation.
- Platform escalation and appeal.
- Evidence preservation according to retention policy.
- No arbitrary trusted external links.
- No public trust score.
- Voice remains blocked until separate moderation readiness approval.

---

## 16. Economy Requirements

Resource features remain disabled in the initial release unless the approved resource is explicitly non-withdrawable and isolated from the main wallet.

Before any value-bearing launch:

- Define resource classification.
- Define request and contribution limits.
- Use double-entry ledger records.
- Use idempotency keys.
- Use transactional balance checks.
- Prevent self-contribution.
- Prevent fulfillment above the requested amount.
- Add anti-collusion monitoring.
- Add reversal and reconciliation procedures.
- Complete independent economy and abuse audits.

---

## 17. Accessibility and Performance

Accessibility:

- Semantic navigation.
- Keyboard navigation.
- Visible focus.
- Accessible labels and announcements.
- Focus trapping and restoration.
- Non-colour status indicators.
- Contrast compliance.
- Reduced-motion support.
- Text scaling.
- Confirmation for destructive actions.

Performance:

- Cursor pagination.
- List virtualization where necessary.
- Lazy media loading.
- Compressed images.
- Batched presence events.
- Background-tab update reduction.
- Local unsent-message preservation.
- Reconnection and retry UI.
- Low-bandwidth fallbacks.
- No dependency on high-frequency animations.

---

## 18. Observability

Structured logs and traces should include applicable identifiers:

- Request ID.
- User ID.
- Circle ID.
- Membership ID.
- Invitation or join-request ID.
- Proposal ID.
- Room ID.
- Transaction ID.
- Outbox event ID.
- WebSocket connection ID.

Metrics:

- Circle creation and failure.
- Invitation and approval conversion.
- Active members and Circles.
- Proposal creation.
- Seat conflicts.
- Proposal-to-room conversion.
- Circle-originated completed games.
- Game token resolution failures.
- WebSocket connections and reconnects.
- Message recovery.
- Outbox age, backlog, attempts, and failures.
- Moderation reports and enforcement.
- Notification delivery outcomes.
- Resource anomalies when enabled.
- Database latency and lock contention.

Never log raw invite tokens, authentication secrets, private message bodies by default, or financial secrets.

---

## 19. Testing Strategy

### Unit Tests

- Permission resolution.
- State transitions.
- Invite eligibility.
- Membership invariants.
- Proposal readiness.
- Seat rules.
- Notification preference resolution.
- Challenge calculations.
- Resource limits when enabled.

### Integration Tests

- Circle and owner creation transaction.
- Ownership transfer.
- Invitation and approval.
- Removal and immediate authorization loss.
- Message and outbox transaction.
- Room creation.
- Moderation action.
- Resource settlement when enabled.

### Concurrency Tests

- Final Circle membership slot.
- Duplicate request approval.
- Final game seat.
- Concurrent ownership transfer.
- Proposal cancellation against room creation.
- Concurrent resource fulfillment.

### End-to-End Tests

- Create Circle.
- Invite by username.
- Request through secure link.
- Approve membership.
- Send and recover chat messages.
- Create and fill proposal.
- Create one room.
- Open same-tab route.
- Complete the game.
- Record the result or memory.
- Remove a member and verify access revocation.

### Recovery Tests

- Restart API and WebSocket process.
- Deliver outbox events twice.
- Delay or miss LISTEN/NOTIFY.
- Deliver events out of order.
- Fail push notification.
- Roll back a database transaction.
- Timeout after successful room creation.
- Reconnect clients and recover gaps.

### Nonfunctional Tests

- Load and soak tests.
- Authorization penetration tests.
- Token tests.
- Accessibility audit.
- Low-end Android and iOS browser testing.
- Unstable-network testing.
- Backup and restoration drill.

---

## 20. Delivery Plan

### Phase 0: Discovery and Governance

Deliverables:

- Circle PRD and acceptance criteria.
- Domain rules and state machines.
- Permission matrix.
- Security and moderation model.
- Notification and analytics specifications.
- Release boundaries.
- Existing Bhalyam identity, block, game-room, wallet, WebSocket, notification, PWA routing, and deployment analysis.

Exit gate:

- Cross-functional approval of terminology, scope, architecture boundary, and release order.

### Phase 1: Circle Foundation

Scope:

- Create, view, edit, archive, and leave.
- Owner and member roles.
- Ownership transfer.
- Permission guards.
- Member list.
- Audit trail.

Exit gate:

- One-owner invariant verified.
- Ownership race tested.
- No public discovery.
- Removed members lose access.

### Phase 2: Membership and Invitations

Scope:

- Privacy-safe username search.
- Direct invitation.
- Secure invite links.
- Join requests.
- Approval and rejection.
- Moderator and probation roles.
- Revocation, expiration, blocks, and rate limits.

Exit gate:

- Tokens are unguessable and hashed.
- Forwarded links cannot bypass approval.
- Duplicate approval is harmless.
- Capacity remains correct under concurrency.

### Phase 3: Chat and Moderation

Scope:

- Durable messages.
- Threads, replies, reactions, mentions.
- Announcements.
- Pagination and unread cursor.
- WebSocket gateway.
- Reconnect recovery.
- Reporting, blocking, muting, and moderator actions.
- Transactional outbox.

Exit gate:

- No duplicate displayed messages.
- Missing messages recover.
- Authorization is revalidated.
- Independent WebSocket and access-control audit passes.

### Phase 4: Circle Game Coordination

Scope:

- Proposals.
- Seat reservations.
- Waitlist.
- Structured game cards.
- Idempotent room creation.
- Dedicated Circle game token.
- Same-tab pre-lobby navigation.
- Full, started, completed, expired, failed, and cancelled states.
- Guest passes and bot policy.

Exit gate:

- One room per proposal.
- No seat overbooking.
- Removal blocks game access.
- Token alone does not authorize access.
- Retry does not duplicate the room.

### Phase 5: Circle Pulse

Scope:

- In-memory presence.
- Availability controls.
- Compatible-game suggestions.
- Open-seat and upcoming-event view.
- Current challenge and pending approvals.
- Quick proposal creation.

Exit gate:

- Presence privacy is respected.
- Restart reconstruction works.
- Suggestions cannot bypass eligibility.
- Low-bandwidth fallback passes.

### Phase 6: Events, Polls, Recognition, and Memory

Scope:

- Scheduled events.
- Waitlists and reminders.
- Polls.
- Optional operational roles.
- Positive recognition.
- Weekly recap.
- Social Match Memory.
- Post-match Circle formation.

Exit gate:

- Time-zone and cancellation behaviours pass.
- External shares are privacy safe.
- Inactive members are not publicly shamed.

### Phase 7: Progression and Seasons

Scope:

- Circle experience.
- Cosmetic levels.
- Challenges.
- Permanent achievements.
- Seasonal progression.
- Anti-farming controls.

Exit gate:

- Rewards use finalized outcomes.
- Duplicate events do not duplicate rewards.
- Suspicious progress can be held.
- Seasonal reset preserves permanent state.

### Phase 8: Resource Requests

Scope:

- Approved non-withdrawable resource.
- Request and contribution cards.
- Limits.
- Double-entry ledger.
- Idempotency.
- Reversals.
- Anti-collusion controls.
- Economy dashboards.

Exit gate:

- Independent economy audit passes.
- Concurrent contributions cannot over-fulfil.
- Ledger remains balanced.
- Notification failure does not reverse settlement.

### Phase 9: Advanced Social Gaming

Scope subject to separate approval:

- Circle-versus-Circle events.
- Saved room configurations.
- Smart recruitment.
- Advanced match memories.
- Voice party.
- Advanced recommendations.

Exit gate:

- Cross-Circle privacy audit.
- Voice moderation readiness.
- Blocking and abuse controls.
- No unmanaged external links.

### Phase 10: Production Hardening

Scope:

- Load, soak, concurrency, restart, and failure testing.
- Authorization, token, moderation, economy, and accessibility audits.
- Low-end device and unstable-network testing.
- Backup and restoration.
- Incident runbooks.
- Feature flags.
- Rollback rehearsal.
- Independent release certification.

---

## 21. Feature Flags

```text
circles.foundation
circles.invitations
circles.chat
circles.gameProposals
circles.guestPass
circles.pulse
circles.events
circles.challenges
circles.progression
circles.resources
circles.crossCircle
circles.voice
```

Each flag must support disabling new actions while preserving durable data and audit records.

---

## 22. Rollout Plan

1. Internal test accounts.
2. Controlled QA Circles.
3. Selected existing players.
4. Limited cohort rollout.
5. Wider release following reliability, safety, and engagement review.
6. Resource features only after economy certification.
7. Cross-Circle and voice only after privacy and moderation certification.

Initial deployment boundary:

```text
WebSocket-serving NestJS instances: 1
PostgreSQL: authoritative
Presence: in-memory and non-authoritative
Outbox: PostgreSQL-backed
Client recovery: REST resynchronization
Redis: not used
```

---

## 23. Rollback Requirements

The platform must be able to:

- Disable Circle creation.
- Disable new invitations.
- Place chat in read-only mode.
- Disable proposals and guest passes.
- Disable resource requests and contributions.
- Stop new notifications.
- Preserve existing Circle, audit, moderation, game, and ledger data.
- Reconcile pending workflows after rollback.

---

## 24. Success Metrics

Metrics must be finalized with baseline and target values before rollout.

Recommended measurements:

- Circle creation completion.
- Invitation acceptance.
- Join-request processing.
- Active Circle members.
- Game proposals per active Circle.
- Proposal-to-room conversion.
- Room-to-completed-game conversion.
- Repeat play among Circle members.
- Abandonment rate for Circle-originated games.
- Guest-to-member conversion.
- Message-report and enforcement rates.
- Reconnection and missed-message recovery.
- Outbox processing reliability.
- Weekly returning Circles.

Avoid optimizing for raw message volume.

---

## 25. Key Risks and Mitigations

### Unauthorized access

Mitigation: server-side permission checks, current membership validation, scoped tokens, secure WebSocket authorization, and penetration tests.

### Invitation abuse

Mitigation: user preferences, blocks, token controls, rate limits, probation, revocation, and moderation.

### Duplicate rooms or seats

Mitigation: unique constraints, atomic updates, row locks, proposal state transitions, and idempotency.

### Lost real-time messages

Mitigation: durable messages, transactional outbox, server sequence values, REST gap recovery, and reconnect reconciliation.

### Single-instance WebSocket availability

Mitigation: explicit deployment boundary, process supervision, restart recovery, client resynchronization, and future adapter abstraction.

### Social-resource abuse

Mitigation: defer value transfer, use isolated approved resources, ledger controls, limits, anti-collusion analysis, and independent audit.

### Toxic behaviour

Mitigation: reporting, blocking, muting, role controls, filtering, rate limits, platform escalation, and appeals.

### Low-end device degradation

Mitigation: pagination, virtualization, conservative animation, compressed media, low-bandwidth mode, and device testing.

---

## 26. Open Product Decisions

- Maximum Circles per player.
- Default and maximum members per Circle.
- Exact moderator and optional-role permissions.
- Link defaults for expiry and maximum uses.
- Probation duration and promotion method.
- Chat retention, edit window, and deletion semantics.
- Default proposal and seat-reservation expiry.
- Guest-pass limits.
- Bot-fill eligibility.
- Circle Pulse launch scope.
- Supported first-release games.
- Supported resource type, if any.
- Circle level and cosmetic reward design.
- Age-appropriate moderation requirements.
- Notification provider and batching policy.
- Archive and deletion retention.
- Success targets and rollout cohort.
- Brand and trademark clearance.

---

## 27. Definition of Done for Initial Production Release

The initial release is complete only when:

- An eligible player can create a private Circle.
- Exactly one owner exists.
- Owners can appoint moderators.
- Players can be invited by username.
- Link recipients can request and receive approved access.
- Removed members immediately lose Circle authorization.
- Members can exchange durable moderated messages.
- Reconnection restores canonical chat state.
- Members can create and fill a structured game proposal.
- The backend creates no more than one room per proposal.
- A Circle-specific link opens the correct pre-lobby in the same tab.
- Guest access reveals no private Circle content.
- Presence is optional and reconstructable.
- Circle Pulse respects privacy and eligibility.
- Important domain events are recorded in the PostgreSQL outbox.
- Concurrency and restart tests pass.
- Feature flags and rollback controls are verified.
- Accessibility and low-end-device testing pass.
- Independent security, moderation, and production-readiness audits approve the release.

---

## 28. Final Release Boundary

Bhalyam Circles can launch without Redis if the following constraints remain explicit:

1. One WebSocket-serving NestJS instance.
2. PostgreSQL is authoritative for every durable and sensitive state.
3. Presence and typing are temporary and reconstructable.
4. WebSocket delivery is not persistence.
5. Clients recover missed state through REST.
6. Important events use a PostgreSQL transactional outbox.
7. LISTEN/NOTIFY is optional wake-up signalling, not the event store.
8. Sensitive commands are transactional and idempotent.
9. Economy features remain disabled until separately audited.
10. Horizontal real-time scaling requires a deliberate cross-instance design.

This boundary provides a controlled path to launch the complete Circle foundation without premature infrastructure complexity.
