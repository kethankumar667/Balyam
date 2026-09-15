# Bhalyam Circles

## Team Discussion Document

**Document status:** Proposal for product, engineering, design, QA, security, moderation, and operations discussion  
**Feature name:** Bhalyam Circles  
**Short name:** Circles  
**Product:** Bhalyam  
**Architecture boundary:** No Redis in the initial implementation

---

## 1. Executive Summary

Bhalyam Circles is a private social gaming feature where approved players can chat, coordinate games, invite trusted players, share purpose-built game invitations, participate in group activities, and build a persistent shared identity.

The feature removes the recurring need to share ordinary game links through WhatsApp or other external applications. A player can create a Circle, invite another player by username, share a secure invitation link, approve join requests, appoint moderators, organize games, and open a Circle game invitation in the same browser tab.

Circles must not be implemented as only group chat. The long-term product direction is a private social operating system for multiplayer gaming:

```text
Discover trusted players
→ Create or join a private Circle
→ See who is available
→ Propose a game
→ Reserve players
→ Create one authoritative game room
→ Join in the same browser tab
→ Complete the game
→ Preserve the shared result
→ Progress together
→ Return for another activity
```

The initial architecture will use PostgreSQL, a single NestJS WebSocket-serving instance, Socket.IO rooms, process-memory presence, a PostgreSQL transactional outbox, optional PostgreSQL LISTEN/NOTIFY wake-up signals, and periodic outbox polling. Redis is explicitly excluded at this stage.

---

## 2. Why This Feature Matters

Current multiplayer coordination creates unnecessary friction when players repeatedly copy links and move to an external messaging application. Bhalyam Circles keeps trusted-player coordination inside Bhalyam and creates a persistent reason to return.

Expected product benefits:

- Easier formation of complete game groups.
- Less dependence on external messaging applications.
- More repeat play among known players.
- Better retention through persistent group identity.
- Safer game invitations with current server-side authorization.
- A foundation for events, challenges, recognition, shared memories, and optional social-resource support.
- Better observability of the complete social-to-game conversion funnel.

Message volume must not be the main success criterion. The feature should be evaluated by successful game formation, completed games, repeat group play, healthy participation, and low abuse.

---

## 3. Recommended Name

### Selected name: Bhalyam Circles

User-facing terminology:

- Feature: **Circles**
- Group: **Circle**
- Primary action: **Create a Circle**
- Invitation: **Join this Circle**
- Game action: **Start with Circle**

Proposed tagline:

> Your private place to chat, play, share, and progress together.

Why Circles fits:

- Communicates a private trusted group.
- Works for friends, families, casual players, and competitive players.
- Avoids directly copying another game's feature identity.
- Can expand into events, challenges, leaderboards, rewards, and group history.

Alternative names considered:

- Squads
- Crews
- Guilds
- Adda
- Mandali
- Tribes

Brand and trademark clearance remains a separate release dependency.

---

## 4. Product Principles

1. **Private by default:** No Circle is publicly discoverable.
2. **Server authoritative:** Membership, permissions, rooms, results, and economy decisions are validated by the backend.
3. **Structured interactions:** Game invitations, events, polls, and resource requests are structured cards, not arbitrary messages.
4. **Progressive delivery:** Ship a safe, useful core before advanced rewards, voice, or cross-Circle competition.
5. **Mobile first:** Support major Android and iOS devices used in India, including low-end devices and unstable networks.
6. **Recoverable:** Clients can recover from server restarts, disconnections, duplicate events, and missed real-time messages.
7. **Privacy preserving:** Presence, membership, and shared identity expose only what is necessary.
8. **Moderated:** Private does not mean ungoverned; reporting, blocking, muting, auditability, and platform enforcement are required.
9. **Economy isolated:** Main-wallet or cash-equivalent transfers remain outside the initial release.
10. **No Redis initially:** PostgreSQL is authoritative; process memory holds only reconstructable state.

---

## 5. User Roles

### 5.1 Owner

Exactly one active owner must exist per Circle.

The owner can:

- Edit the Circle name, avatar, banner, description, motto, rules, language, and preferred games.
- Invite players by username.
- Create, configure, rotate, and revoke invitation links.
- Approve or reject join requests.
- Assign and remove moderators and optional operational roles.
- Remove, mute, suspend, or ban members.
- Configure notification, game, event, and resource policies.
- Transfer ownership.
- Archive the Circle and request deletion.
- View administrative audit history.

The owner cannot leave until ownership is transferred.

### 5.2 Moderator

A moderator can:

- Invite players.
- Approve or reject join requests.
- Remove standard members.
- Temporarily mute or restrict members.
- Moderate messages.
- Pin announcements.
- Create and manage Circle game invitations.
- Create events and polls.
- Review member reports.
- Revoke invitation links they created.

A moderator cannot:

- Remove or restrict the owner.
- Transfer ownership.
- Delete or archive the Circle.
- Grant ownership.
- Modify protected financial or security settings.

### 5.3 Optional Operational Roles

These roles may be added after the core role system is stable:

- **Game Captain:** Organizes games and manages proposals.
- **Event Organizer:** Creates events, polls, and waitlists.
- **Mentor:** Helps new members and runs practice sessions.

They must be permission bundles, not decorative labels.

### 5.4 Member

A member can:

- Read authorized Circle content.
- Send messages and reactions.
- Use mentions, replies, and threads.
- Create or join game proposals where permitted.
- Participate in events, polls, and challenges.
- Request or contribute supported social resources where permitted.
- Report content and members.
- Leave the Circle.

### 5.5 Probationary Member

A newly approved link-based member may initially:

- Read recent permitted messages.
- React to messages.
- Join approved games.
- View Circle information.

They may initially be restricted from:

- Creating invitation links.
- Inviting players.
- Posting external links.
- Requesting resources.
- Creating repeated game invitations.
- Viewing sensitive historical content.

### 5.6 Muted Member

A muted member can read permitted content and may join games unless gameplay is separately restricted, but cannot post messages or create invitations, events, polls, or requests during the restriction.

---

## 6. Privacy and Membership Model

All Circles are private.

There will be:

- No public Circle directory.
- No public Circle search.
- No public member list.
- No automatic entry through a forwarded link.
- No message access without active membership.
- No access after removal or ban.
- No public Circle activity feed.

Supported joining paths:

1. Direct invitation by username.
2. Secure invite link followed by approval.
3. Post-match invitation.
4. Conversion from a one-game guest pass.
5. Suggested-player invitation when the player has explicitly opted in.

A player may belong to multiple Circles subject to a configurable limit.

---

## 7. Invitation Flows

### 7.1 Username Invitation

1. An authorized member searches by username.
2. The system displays a privacy-safe profile preview.
3. The inviter sends a Circle invitation.
4. The recipient receives an in-app notification.
5. The recipient accepts or rejects.
6. Acceptance creates membership and a Circle system message.

Required checks:

- Inviter permission.
- Circle capacity.
- Target account eligibility.
- Existing membership or pending invitation.
- Block relationships.
- Recipient invite preferences.
- Circle state.
- Rate limits.

Username search must not reveal email, phone number, exact location, device data, wallet balance, hidden presence, private Circle memberships, or moderation history.

### 7.2 Secure Invitation Link

1. Owner or moderator creates a link.
2. Backend creates a cryptographically random token and stores only its hash.
3. Recipient opens `/circles/invite/:token`.
4. Recipient authenticates if required.
5. A privacy-safe Circle preview is displayed.
6. Recipient submits a join request.
7. Owner or moderator approves or rejects it.
8. Approval creates membership transactionally.

Link controls:

- Expiration.
- Maximum successful uses.
- Manual revocation.
- Link rotation.
- Optional source label.
- Abuse lockout.
- Per-account and per-network request limits.
- Audit trail.

Opening a link never grants Circle access.

### 7.3 Join Request Lifecycle

```text
PENDING → APPROVED
PENDING → REJECTED
PENDING → WITHDRAWN
PENDING → EXPIRED
PENDING → CANCELLED
PENDING → BLOCKED
```

Terminal requests cannot be approved again. Approval revalidates capacity, eligibility, blocks, and Circle status inside a database transaction.

---

## 8. Circle Identity and Information

Each Circle contains:

- Immutable internal ID.
- Editable display name.
- Unique public-facing Circle code.
- Avatar and optional cover banner.
- Description and motto.
- Rules.
- Primary language.
- Preferred games.
- Creation date.
- Owner and moderators.
- Member count and limit.
- Circle level and experience when progression is enabled.
- Permanent achievements.
- Seasonal progress when seasons are enabled.
- Privacy and notification configuration.

Rename controls:

- Length and character restrictions.
- Reserved-word validation.
- Offensive-content validation.
- Rename cooldown.
- Audit history.
- System notification to members.

A rename must never change the internal Circle ID, game history, membership, token references, or ledger references.

---

## 9. Circle Experience

### 9.1 Main Screens

```text
/circles
/circles/create
/circles/invitations
/circles/:circleId
/circles/:circleId/chat
/circles/:circleId/pulse
/circles/:circleId/games
/circles/:circleId/events
/circles/:circleId/challenges
/circles/:circleId/members
/circles/:circleId/memories
/circles/:circleId/info
/circles/:circleId/settings
/circles/:circleId/moderation
/circles/:circleId/analytics
/circles/invite/:token
/circle-game/:token
```

### 9.2 Circle Home

The home screen should show:

- Circle identity.
- Current level when enabled.
- Circle Pulse.
- Members marked available.
- Active game proposals.
- Upcoming events.
- Current collaborative challenge.
- Open supported-resource requests.
- Recent announcement.
- Recent achievement or match memory.
- Unread count.
- Pending approvals for authorized roles.

### 9.3 Circle Pulse

Circle Pulse is the main differentiator. It combines:

- Members who have chosen to be available.
- Compatible game suggestions.
- Open game seats.
- Upcoming event.
- Current challenge.
- Pending requests.
- Recent achievement.
- One-action game proposal creation.

Example:

> Four members are available. Ludo supports this group size. Create a Circle game?

Pulse only suggests. It must not create a paid or competitive room without explicit participant action.

### 9.4 Presence

Supported user-selected states:

- Available.
- Looking for players.
- Playing.
- Busy.
- Do not disturb.
- Offline.

Presence is optional, temporary, reconstructed after restart, and never used as authorization. It must not expose exact location, device information, hidden activity, or unrelated application behaviour.

---

## 10. Chat and Structured Content

Supported message types:

```text
TEXT
SYSTEM
ANNOUNCEMENT
GAME_PROPOSAL
ACTIVE_GAME
RESOURCE_REQUEST
EVENT
POLL
ACHIEVEMENT
MATCH_MEMORY
MODERATION_NOTICE
```

Initial chat capabilities:

- Durable text messages.
- Replies and threads.
- Reactions.
- Mentions.
- Edit history.
- Soft deletion.
- Cursor pagination.
- Unread cursor.
- Pinned messages.
- Announcements.
- Message reporting.
- Blocking and muting.
- Search according to retention policy.

Potential later additions:

- Game-specific channels.
- Approved image attachments.
- Scheduled announcements.
- Voice notes after moderation readiness.
- Automated weekly summaries.

Arbitrary Bhalyam-looking URLs must not become trusted cards. Only backend-validated game invitations are rendered as interactive cards.

---

## 11. Game Proposal and Room Sharing

A Circle Game Proposal expresses intent to play. It is not initially a game room.

Proposal states:

```text
RECRUITING
READY
CREATING_ROOM
ROOM_CREATED
STARTED
COMPLETED
CANCELLED
EXPIRED
FAILED
```

A proposal includes:

- Game and mode.
- Creator.
- Minimum and maximum players.
- Entry requirement where applicable.
- Scheduled or immediate start.
- Expiration.
- Confirmed players.
- Reserved players.
- Waitlist.
- Guest allowance.
- Bot-fill preference.
- Final room reference.

### Seat Reservation

The server must atomically verify:

- Active membership or valid guest pass.
- Proposal state.
- Seat availability.
- Game eligibility.
- Entry requirements.
- No conflicting participation.
- No duplicate reservation.

### Authoritative Room Creation

1. The proposal reaches its ready condition.
2. Backend marks it as creating the room.
3. A durable workflow creates exactly one game room.
4. Participants and rules are attached.
5. Required financial reservations occur, where applicable.
6. The proposal stores the game room ID.
7. An active game card is published.
8. Participants navigate to the pre-lobby.

Room creation must be idempotent.

### Dedicated Circle Game Link

Use:

```text
/circle-game/:token
```

When opened, the backend must:

1. Authenticate the player.
2. Resolve and validate the token.
3. Verify current membership or guest access.
4. Verify current room state and eligibility.
5. Verify seat availability.
6. Navigate in the same browser tab to the pre-lobby.
7. Show a clear state when full, started, completed, cancelled, or expired.

The token is not sufficient authorization by itself.

### Circle Game Card

Display:

- Game identity.
- Host or proposal creator.
- Player requirement.
- Confirmed players.
- Seats remaining.
- Entry requirement.
- Mode.
- Scheduled start.
- Expiration.
- Join, leave, and waitlist actions.
- Guest and bot indicators.
- Current state.

### Guest Pass

A guest pass grants access to one proposal and its game only.

A guest may:

- View the specific proposal.
- Join its pre-lobby.
- Play the associated game.
- View that result.
- Receive a membership invitation afterward.

A guest cannot read Circle chat, see the member list, access other proposals, request resources, invite others, or browse Circle history.

### Smart Fill

When players are missing, provide:

- Wait for Circle members.
- Invite a friend with a guest pass.
- Add eligible bots.
- Use the waitlist.
- Cancel the proposal.

Private Circle content must remain hidden throughout this flow.

---

## 12. Engagement Features

### 12.1 Post-Match Circle Formation

After a healthy completed match, players can:

- Create a new Circle with the participants.
- Invite them to an existing Circle.
- Send friend requests.
- Play again.
- Save a temporary party.

Do not show this to players who intentionally abandoned, were removed, or were penalized.

### 12.2 Events and Polls

Events may contain game, schedule, participant limit, waitlist, reminders, event thread, cancellation, and final result.

Polls may select the game, schedule, player count, mode, or next challenge.

### 12.3 Collaborative Challenges

Examples:

- Complete a defined number of valid games.
- Play multiple game types.
- Play with different Circle members.
- Complete sessions without abandonment.
- Participate on distinct days.
- Fill open proposals.

Rewards must derive from finalized server-side results and include anti-farming checks.

### 12.4 Circle Progression

Progress may come from completed games, unique-member participation, events, collaborative challenges, fair play, and useful contributions.

Do not reward raw message volume.

Initial progression rewards should be cosmetic:

- Avatars.
- Frames.
- Banners.
- Chat themes.
- Invitation-card skins.
- Celebration effects.
- Titles and badges.

### 12.5 Seasons

A season may include missions, progression, internal standings, cosmetic rewards, and a final recap. Seasonal progress may reset, but memberships, ownership, identity, and permanent achievements must remain.

### 12.6 Recognition

Recognize healthy behaviour through categories such as:

- Reliable Player.
- Helpful Member.
- Fair-Play Champion.
- Game Organizer.
- Challenge Contributor.
- Most Improved.
- Team Player.
- Consistent Participant.

Do not add member downvotes.

### 12.7 Social Match Memory

Create a private history of significant events such as first game, first full room, close result, challenge completion, member milestone, season highlight, and Circle level achievement.

External sharing must use a privacy-safe generated card and exclude private chat and usernames without consent.

### 12.8 Weekly Recap

A weekly Circle recap may include games completed, unique participants, popular games, challenge progress, new members, upcoming events, achievements, and open proposals. It must not shame inactive members.

### 12.9 Circle-versus-Circle Events

Treat this as advanced scope. Both Circles must explicitly accept. Cross-Circle chat, member visibility, results, blocking, reporting, and privacy require separate controls.

### 12.10 Voice

Voice should not launch initially. Recommended sequence:

1. Text chat.
2. Predefined quick messages.
3. Optional in-game push-to-talk.
4. Mute, block, report, and disclosures.
5. Circle voice only after moderation and network-readiness validation.

---

## 13. Resource Requests

Resource requests must be structured cards, not plain chat messages.

Initial recommendation:

- Use a limited Circle Support Token, social energy, or another non-withdrawable resource.
- Do not allow unrestricted transfer of the main wallet balance.
- Exclude purchased, cash-equivalent, voucher-redeemable, or withdrawable value until a separate economy and legal review is complete.

Request states:

```text
OPEN
PARTIALLY_FULFILLED
FULFILLED
EXPIRED
CANCELLED
BLOCKED
```

Controls:

- No self-contribution.
- Daily request and contribution limits.
- Per-Circle limits.
- Transactional balance validation.
- Double-entry ledger.
- Idempotency keys.
- Immutable transaction references.
- Reversal handling.
- Anti-collusion checks.
- Multi-account abuse monitoring.
- Full audit history.

Before contribution, show resource type, amount, recipient, Circle, remaining balance, reversibility, and applicable limits.

---

## 14. Moderation and Trust

Member controls:

- Report message.
- Report member.
- Block member.
- Hide content.
- Leave Circle.
- Mute notifications.
- Control Circle invitations.
- Control presence and external identity sharing.

Moderator controls:

- Hide or delete content according to policy.
- Temporary mute.
- Member removal.
- Re-entry ban.
- Thread lock.
- Slow mode.
- Invitation-link revocation.
- Proposal restriction.
- Report review and escalation.

Platform controls:

- Text filtering.
- Payload sanitization.
- External-link restrictions.
- Spam detection.
- Invite flood protection.
- Rate limits.
- Evidence retention under policy.
- Human review and appeal path.

Internal Circle health signals may include confirmed violations, invitation spam, suspicious resource movement, repeated intentional abandonment, coordinated account abuse, and high enforcement rates. Do not expose a public trust score.

---

## 15. Notifications

Notification categories:

- Direct invitation.
- Join-request update.
- Pending approval.
- Mention or reply.
- Announcement.
- Game invitation.
- Seat available.
- Game ready or starting.
- Event reminder.
- Resource request.
- Challenge completion.
- Moderation action.
- Weekly recap.

Per-Circle modes:

- All.
- Mentions only.
- Games only.
- Announcements only.
- Custom.
- Muted.

High-frequency events must be batched. Targeting decisions must remain in the trusted backend.

---

## 16. Architecture Without Redis

### Initial topology

```text
React 18 PWA
        |
NestJS REST APIs + single WebSocket gateway
        |
PostgreSQL
        |
PostgreSQL outbox processor and scheduled jobs
```

### PostgreSQL stores authoritative durable state

- Circle identity and settings.
- Membership, roles, and permissions.
- Invitations and join requests.
- Messages and unread positions.
- Proposals and reservations.
- Room and guest-pass references.
- Events, polls, challenges, and progression.
- Resource requests and ledger references.
- Moderation, audit, idempotency, notifications, and outbox events.

### Process memory stores reconstructable state only

- Socket connections.
- User-selected temporary presence.
- Typing indicators.
- Short-lived noncritical throttles.
- Recent event deduplication.

### WebSocket boundary

The initial deployment supports one WebSocket-serving NestJS instance. Socket.IO rooms are local to that process. The client must reconnect and resynchronize canonical state through REST.

### Durable event delivery

A transactional outbox row is committed with each important domain change. A worker claims pending events using `FOR UPDATE SKIP LOCKED`, publishes committed results, retries failures, and moves exhausted events to an operational failure state.

Optional PostgreSQL LISTEN/NOTIFY can wake the worker, but the outbox table remains the durable event source and periodic polling recovers missed signals.

### Concurrency controls

Use:

- PostgreSQL row locks.
- Atomic conditional updates.
- Unique constraints.
- Transaction-level advisory locks where justified.
- Serializable transactions only for workflows that require them.
- Idempotency keys for all sensitive commands.

### Rate limiting

Use process-memory limits only for low-risk ephemeral events such as typing. Use PostgreSQL-backed controls or infrastructure-edge controls for invitations, joins, moderation, proposals, guest passes, resource actions, and other abuse-sensitive commands.

### Future-proofing

Define interfaces for event publication, presence, rate limiting, and real-time fan-out. Future scaling may replace infrastructure implementations without changing Circle domain logic.

---

## 17. Frontend Requirements

- React 18 with strict TypeScript.
- Mobile-first responsive design.
- Tailwind CSS unless the repository already standardizes another system.
- Existing server-state library or React Query.
- Zod validation for forms and received event payloads.
- Accessible drawers, tabs, dialogs, menus, and focus management.
- Same-tab navigation for Circle game links.
- Virtualized or paginated chats and member lists.
- Reduced-motion support.
- Large touch targets.
- Low-bandwidth and reconnect states.
- Local preservation of unsent text.
- Canonical refetch after reconnect.
- No client authority for permissions, balances, seats, or room state.

---

## 18. Operational Analytics

Member-facing analytics:

- Valid games completed.
- Active participants.
- Most-played games.
- Challenge and event progress.
- Match-completion rate.
- Achievements.

Owner-facing analytics:

- New members.
- Pending requests.
- Invitation acceptance.
- Invite-link usage.
- Event attendance.
- Open reports.
- Expiring links.

Platform operations:

- Circle creation success and failure.
- Active Circles.
- Invitations and conversion.
- Proposal-to-room conversion.
- Seat conflicts.
- Circle-originated game completion.
- Game-link resolution failures.
- WebSocket connections and reconnects.
- Missing-message recovery.
- Outbox backlog and failed events.
- Notification outcomes.
- Moderation incidents.
- Resource anomalies.
- Database latency.

Sensitive risk signals remain internal.

---

## 19. Reliability Scenarios

Explicitly design and test:

- API or WebSocket restart during message delivery.
- Duplicate and out-of-order events.
- Lost PostgreSQL notification signals.
- Owner suspension or deletion.
- Concurrent ownership transfers.
- Concurrent final Circle slot claims.
- Concurrent final proposal seat claims.
- Duplicate join approval.
- Invite revocation during acceptance.
- Removal during game entry.
- Room filling during navigation.
- Room creation success followed by response failure.
- Proposal cancellation racing with room creation.
- Resource contribution retries.
- Ledger success followed by notification failure.
- Rename during an active session.
- Blocking during a game.
- Stale notifications after access revocation.

PostgreSQL remains authoritative. Real-time delivery is never persistence.

---

## 20. Release Scope Recommendation

### Initial production scope

- Private Circle creation and settings.
- Owner, moderator, member, probation, and muted states.
- Username invitations.
- Secure invite links and approval.
- Member list and Circle information.
- Durable real-time chat.
- Structured game proposals and cards.
- Atomic seat reservations.
- Authoritative room creation.
- Dedicated Circle game links.
- Same-tab navigation.
- Guest passes.
- Privacy-safe presence.
- Circle Pulse.
- Reporting, blocking, muting, moderation, and audit logs.
- Notification preferences.
- Operational metrics.

### Next expansion

- Polls and events.
- Weekly recap.
- Social Match Memory.
- Optional operational roles.
- Collaborative challenges.
- Cosmetic progression.
- Seasons.
- Saved game configurations.
- Post-match Circle formation.

### Advanced controlled expansion

Add only after targeted audits:

- Resource requests and transferable value.
- Reward-bearing progression.
- Smart recruitment.
- Circle-versus-Circle events.
- Voice.
- Advanced recommendation models.
- Multi-instance real-time scaling.

---

## 21. Team Decisions Required

The team should align on:

1. Feature and terminology approval for **Bhalyam Circles**.
2. Maximum Circles per player and members per Circle.
3. Exact permissions for moderators and optional roles.
4. Probation duration and restrictions.
5. Chat retention and edit/delete policy.
6. Circle game proposal defaults and expiration.
7. Guest-pass rules.
8. Supported Circle presence states.
9. Whether Circle Pulse is part of the first release.
10. Which resource, if any, is permitted for the first resource-request release.
11. Age, safety, moderation, and reporting policies.
12. Notification provider and supported channels.
13. Initial single-instance deployment boundary.
14. Feature-flag and rollback strategy.
15. Brand and trademark review.
16. Success metrics and launch cohort.

---

## 22. Recommended Final Direction

Build Circles around three differentiators:

1. **Circle Pulse:** intelligent private coordination based on members who explicitly mark themselves available.
2. **Guest Pass:** one-game access without revealing Circle chat or history.
3. **Social Match Memory:** a private record of the group's shared journey.

The first release succeeds when a trusted group can create a Circle, invite and approve members, communicate safely, form a valid game, open it in the same tab, complete it, recover from interruptions, and retain a durable shared result without using Redis.
