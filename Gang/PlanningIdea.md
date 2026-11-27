Bhalyam Circles: End-to-End Product and Engineering Blueprint

This blueprint defines Bhalyam Circles from initial product foundations through advanced social gaming, economy integration, moderation, observability, and production hardening. It is designed around Bhalyam’s multiplayer architecture, React frontend, NestJS backend, PostgreSQL, Redis, real-time communication, and mobile-first PWA requirements.

1. Product Vision

Bhalyam Circles is a private social gaming space where trusted players can communicate, organize games, invite new members, exchange permitted social resources, complete shared challenges, and preserve their gaming history.

It must not become only another group-chat implementation. Its primary value is removing coordination friction between players.

The complete experience should be:

Discover trusted players
Create or join a Circle
See who is available
Select a game
Reserve required players
Create an authoritative game room
Join in the same browser tab
Complete the game
Record the shared result
Progress together
Return for future activities

2. Product Positioning
Feature name

Bhalyam Circles

Singular name

Circle

Tagline

Your private place to chat, play, share, and progress together.

Core differentiators
Private membership only.
Intelligent real-time game coordination.
No dependence on WhatsApp for recurring room sharing.
Structured game invitations instead of raw links.
Guest participation without exposing Circle content.
Shared progression, achievements, challenges, and memories.
Strong moderation and economy protection.
Production-grade restart durability and concurrency protection.
Part 1: Product Foundation
3. Privacy Model

Every Circle is private.

There should be:

No public Circle directory.
No public Circle search.
No public member list.
No automatic membership through a forwarded link.
No access to Circle messages without active membership.
No access to old content after removal.
No exposure of member presence outside the Circle.
No globally discoverable Circle activity.

A player can join through one of these methods:

Direct username invitation.
Private Circle invite link followed by approval.
Post-match invitation.
Guest-pass conversion into a formal invitation.
Suggested-player invitation where the player has explicitly opted in.
4. Circle Identity

Every Circle should contain:

Immutable internal Circle ID.
Editable display name.
Unique public-facing Circle code.
Avatar.
Cover banner.
Description.
Motto.
Circle rules.
Primary language.
Preferred games.
Creation date.
Owner.
Moderator list.
Member count.
Member limit.
Circle level.
Circle experience.
Permanent achievements.
Current seasonal progress.
Privacy and notification configuration.

Renaming a Circle must never modify its internal ID, memberships, game history, invitation tokens, or ledger references.

5. Circle Roles

Implement roles as permission bundles. Do not scatter checks such as role === "OWNER" throughout controllers and UI components.

Role-based permissions are a proven community-management pattern. Discord Roles and Permissions describes hierarchical roles where members can affect roles below their own, and notes that administrator-level permissions require careful assignment.

Owner

Exactly one active owner must exist.

Permissions:

Edit Circle identity.
Configure Circle settings.
Invite players.
Create and revoke invite links.
Accept and reject join requests.
Assign and remove moderators.
Remove members.
Restrict members.
Transfer ownership.
Archive the Circle.
Request permanent deletion.
View administrative audit history.
Configure resource-request rules.
Configure event and challenge rules.
Moderator

Permissions:

Invite players.
Manage join requests.
Remove standard members.
Mute members.
Moderate messages.
Pin announcements.
Manage game proposals.
Create events and polls.
Revoke invitation links they created.
Review member reports.

Restrictions:

Cannot remove or restrict the owner.
Cannot transfer ownership.
Cannot delete or archive the Circle.
Cannot grant ownership.
Cannot modify financial or security-sensitive settings.
Cannot act against another moderator unless explicitly authorized.
Game Captain

Optional role.

Permissions:

Create game proposals.
Schedule game events.
Manage game participation.
Cancel unstarted proposals.
Configure saved game presets.
Event Organizer

Optional role.

Permissions:

Create polls.
Schedule events.
Publish event announcements.
Manage event waitlists.
Mentor

Optional non-administrative role.

Permissions:

Answer newcomer questions.
Publish approved game guides.
Conduct practice sessions.
Welcome probationary members.
Member

Permissions:

Read allowed channels.
Send messages.
React to messages.
Reply in threads.
Create game proposals where enabled.
Join games.
Participate in polls, events, and challenges.
Request permitted resources.
Report content.
Leave the Circle.
Probationary Member

Applied primarily to link-based joins.

Allowed:

Read recent approved messages.
Join approved games.
React to messages.
View Circle information.

Initially restricted from:

Creating invitation links.
Inviting additional users.
Requesting resources.
Sending arbitrary external links.
Viewing sensitive historical content.
Creating high-frequency game invitations.
Muted Member
Can read authorized Circle content.
Cannot send messages.
Cannot create polls, events, requests, or invitations.
May join existing games if the restriction does not include gameplay.
6. Permission Architecture

Recommended permission identifiers:

export const CirclePermission = {
  CircleUpdate: "circle:update",
  CircleArchive: "circle:archive",
  CircleTransferOwnership: "circle:transfer-ownership",
  MemberInvite: "member:invite",
  MemberApprove: "member:approve",
  MemberReject: "member:reject",
  MemberRemove: "member:remove",
  MemberMute: "member:mute",
  RoleAssign: "role:assign",
  MessageCreate: "message:create",
  MessageDelete: "message:delete",
  AnnouncementCreate: "announcement:create",
  GameProposalCreate: "game-proposal:create",
  GameProposalManage: "game-proposal:manage",
  EventCreate: "event:create",
  PollCreate: "poll:create",
  ResourceRequestCreate: "resource-request:create",
  ResourceRequestContribute: "resource-request:contribute",
  AuditLogRead: "audit-log:read",
} as const;

export type CirclePermission =
  (typeof CirclePermission)[keyof typeof CirclePermission];


Authorization must be enforced by the NestJS backend. Hiding a button in React is not authorization.

OWASP Authorization Cheat Sheet distinguishes authentication from authorization and explains that an authenticated user is not automatically authorized to perform every available action.

Part 2: Membership and Invitations
7. Direct Username Invitation
Flow
Owner or authorized moderator opens Invite Player.
They search by exact or partial username.
Backend returns privacy-safe matching profiles.
Inviter selects a player.
Backend verifies invite eligibility.
Invitation is created.
Player receives an in-app notification.
Player accepts or rejects.
Successful acceptance creates membership.
A system message is posted to the Circle.
Eligibility checks
Inviter has permission.
Circle has available capacity.
Target is not already a member.
Target does not already have a pending invitation.
Neither player has blocked the other.
Target permits invitations from this relationship level.
Target account is eligible.
Circle is active.
Invite-rate limits are not exceeded.
Privacy controls

Username search must not expose:

Email.
Phone number.
Exact location.
Device information.
Private Circle memberships.
Hidden online status.
Financial balance.
Moderation history.
8. Invite Link Flow

An invite link should create a join request. It must not grant immediate access.

Example:

/circles/invite/:token

Flow
Owner or moderator creates a link.
Backend creates a cryptographically random token.
Only the token hash is stored.
Link is shared externally.
Recipient opens the link.
Recipient authenticates if required.
Backend resolves the token.
A privacy-safe Circle preview appears.
Recipient requests access.
An owner or moderator approves or rejects the request.
Approval creates membership transactionally.
Invite link controls
Expiration.
Maximum uses.
Manual revocation.
Optional label describing campaign or source.
Per-link approval requirement.
Link rotation.
Abuse lockout.
Join-request limits.
Audit trail.
Important rule

Opening the link and submitting the request must not count as a completed membership use. A use is consumed only according to a clearly documented invitation policy, preferably after successful membership creation.

9. Join Request State Machine
export type JoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED"
  | "CANCELLED"
  | "BLOCKED";


Allowed transitions:

PENDING to APPROVED
PENDING to REJECTED
PENDING to WITHDRAWN
PENDING to EXPIRED
PENDING to CANCELLED
PENDING to BLOCKED


Terminal requests cannot be approved again.

Approval must use a database transaction that:

Locks the request.
Revalidates Circle capacity.
Revalidates account eligibility.
Creates membership.
Updates the request.
Records audit information.
creates an outbox event.
10. Membership Lifecycle
export type CircleMembershipStatus =
  | "ACTIVE"
  | "PROBATION"
  | "MUTED"
  | "SUSPENDED"
  | "LEFT"
  | "REMOVED"
  | "BANNED";


Rules:

A player cannot have two active memberships in the same Circle.
An owner cannot leave without transferring ownership.
Removal immediately invalidates Circle authorization.
Rejoining does not restore a previous administrative role.
Banned members cannot submit new requests.
Leaving does not delete historical match results.
Personal information displayed in old records should follow account-deletion policy.
Ownership transfer must be concurrency-safe.
Part 3: Circle User Experience
11. Primary Navigation

Add a Circles entry to the authenticated application navigation.

Recommended screens:

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

12. Circle Home Screen

The Circle home should contain:

Circle header and identity.
Current Circle level.
Active members.
Circle Pulse.
Active game proposals.
Upcoming event.
Current collaborative challenge.
Pending resource requests.
Recent announcement.
Recent achievement.
Unread-message count.
Pending approval count for authorized users.
13. Circle Pulse

Circle Pulse should be Bhalyam’s primary differentiating feature.

It answers:

Who wants to play?
Which games fit the currently ready members?
How many players are still needed?
Which event starts next?
What challenge is close to completion?
Are there pending join requests?
Is a resource request about to expire?

Example recommendation:

Four Circle members are ready.
Ludo supports this group size.
Create a game proposal.


Recommendations must remain suggestions. The backend must not create paid or competitive rooms without explicit participant action.

14. Presence

Supported states:

export type CirclePresence =
  | "AVAILABLE"
  | "LOOKING_FOR_PLAYERS"
  | "PLAYING"
  | "BUSY"
  | "DO_NOT_DISTURB"
  | "OFFLINE";


Privacy requirements:

Allow presence to be disabled.
Do not expose exact last activity by default.
Do not expose device type.
Do not expose precise location.
Do not infer availability from unrelated activity.
Do not allow presence to bypass blocks.
Part 4: Chat System
15. Message Types

Do not model every activity as plain text.

export type CircleMessageType =
  | "TEXT"
  | "SYSTEM"
  | "ANNOUNCEMENT"
  | "GAME_PROPOSAL"
  | "ACTIVE_GAME"
  | "RESOURCE_REQUEST"
  | "EVENT"
  | "POLL"
  | "ACHIEVEMENT"
  | "MATCH_MEMORY"
  | "MODERATION_NOTICE";

16. Chat Features

Foundation:

Text messages.
Reactions.
Mentions.
Replies.
Threads.
Edit history.
Soft deletion.
Pagination.
Unread cursor.
Delivery status.
Pinned messages.
Announcements.
Search within permitted retention.
Report message.
Block player.
Mute Circle notifications.

Advanced:

Game-specific channels.
Event threads.
Structured polls.
Scheduled announcements.
Approved image attachments.
Voice notes only after moderation readiness.
Automatic weekly summaries.
17. Message Ordering

Each Circle channel should maintain a server-generated ordered sequence.

interface CircleMessageEnvelope {
  messageId: string;
  circleId: string;
  channelId: string;
  sequenceNumber: string;
  clientRequestId: string;
  messageType: CircleMessageType;
  createdAt: string;
}


The client must:

Deduplicate by messageId.
Reconcile optimistic messages using clientRequestId.
Sort by server sequence.
Request missing ranges after reconnection.
Never use client timestamps as authoritative order.
18. Real-Time Transport

Use authenticated secure WebSockets for active Circle updates and HTTP APIs for durable commands and history retrieval.

OWASP WebSocket Security Cheat Sheet states that WebSockets do not provide built-in authentication and identifies origin validation, authorization, injection, denial-of-service, and monitoring as important WebSocket concerns. It also recommends secure wss transport for production.

Required controls:

Secure wss connections.
Origin allowlist.
Authentication during connection establishment.
Short-lived connection credentials.
Authorization on every event.
Payload schema validation.
Message-size limits.
Connection limits.
Event-rate limits.
Heartbeats.
Explicit token-expiration handling.
Immediate room unsubscribe after membership removal.
Server-side event logging.
Reconnection with missed-event recovery.

REST remains authoritative for:

Creating a Circle.
Updating settings.
Approving requests.
Creating game proposals.
Joining a proposal.
Transferring ownership.
Resource transactions.
Moderation actions.

WebSocket events communicate committed results.

Part 5: Game Coordination
19. Game Proposal

A game proposal represents intent to play. It is not necessarily a created game room.

export type GameProposalStatus =
  | "RECRUITING"
  | "READY"
  | "CREATING_ROOM"
  | "ROOM_CREATED"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";


A proposal contains:

Circle.
Creator.
Game.
Game mode.
Minimum players.
Maximum players.
Entry requirement.
Bot-fill preference.
Scheduled or immediate start.
Expiration.
Confirmed participants.
Reserved participants.
Waitlist.
Guest allowance.
Final game-room reference.
20. Seat Reservation
export type ProposalParticipantStatus =
  | "RESERVED"
  | "CONFIRMED"
  | "WAITLISTED"
  | "LEFT"
  | "REMOVED"
  | "EXPIRED";


Joining a proposal must:

Lock or atomically update seat availability.
Verify Circle membership or valid guest pass.
Verify game eligibility.
Verify sufficient permitted balance where required.
Verify no conflicting active participation.
Add the participant once.
Publish the committed state.
21. Room Creation

The room must be created only by the authoritative backend.

Recommended flow:

Proposal reaches the ready condition.
Backend marks it CREATING_ROOM.
A durable workflow creates the game room.
Participants and rules are attached.
Financial reservations occur if applicable.
Proposal receives the room ID.
Proposal transitions to ROOM_CREATED.
Circle receives a structured active-game card.
Participants navigate to the pre-lobby.

Creation must be idempotent. Repeated workers or retries must resolve to one game-room instance.

22. Dedicated Circle Game Link

Use a separate scoped token:

/circle-game/:token


The link resolves to:

interface CircleGameAccessToken {
  tokenId: string;
  circleId: string;
  proposalId: string;
  gameRoomId: string;
  issuedByUserId: string;
  expiresAt: string;
  revokedAt: string | null;
}


When opened:

Authenticate the player.
Resolve the token server-side.
Verify token validity.
Verify active Circle membership or valid guest access.
Verify room eligibility.
Check room state and seat availability.
Navigate in the same tab to the pre-lobby.
Display a clear fallback if the game is full, started, completed, cancelled, or expired.

The token is only a locator and access claim. Final authorization must always come from current server state.

23. Circle Game Card

Display:

Game identity.
Creator.
Required players.
Confirmed members.
Seats remaining.
Entry requirement.
Mode.
Scheduled start.
Expiration.
Join action.
Leave action.
Waitlist action.
Current state.
Guest-seat indicator.
Bot-seat indicator.

Do not expose a raw game-room URL inside chat.

24. Guest Pass

A guest pass allows one non-member to join one Circle game.

Guest permissions:

View the specific proposal.
Join its pre-lobby.
Play the associated game.
View that game’s result.
Receive a membership invitation afterward.

Guest restrictions:

Cannot read Circle chat.
Cannot view Circle member lists.
Cannot access other proposals.
Cannot request resources.
Cannot invite others.
Cannot view Circle history.

Guest access expires after the game lifecycle ends.

25. Smart Fill

If players are missing:

Wait for Circle members.
Invite a friend.
Use approved guest passes.
Add eligible bots.
Place eligible users on a waitlist.
Cancel the proposal.

Do not expose private Circle content while filling a game.

Part 6: Engagement and Retention
26. Circle Progression

Circle experience may come from:

Successfully completed games.
Unique-member participation.
Completing collaborative missions.
Running scheduled events.
Fair-play behaviour.
Helping fill game sessions.
Approved social-resource contributions.

Do not grant experience for raw message volume because that incentivizes spam.

Progression rewards should initially remain cosmetic:

Avatars.
Frames.
Banners.
Chat themes.
Invitation-card skins.
Celebration effects.
Profile badges.
Circle title options.
27. Collaborative Challenges

Examples:

Complete a defined set of games.
Play multiple game categories.
Complete matches with different Circle members.
Reach a match-completion objective.
Participate on distinct days.
Complete an event without abandonment.
Help fill game proposals.

Challenge contributions must come from finalized server-side game results.

28. Circle Seasons

Each season can contain:

Seasonal missions.
Circle progression track.
Internal standings.
Game-specific challenges.
Cosmetic rewards.
End-of-season recap.

At season completion:

Archive seasonal results.
Preserve permanent achievements.
Reset only seasonal progress.
Never reset memberships or ownership.
Generate a Social Match Memory summary.
29. Internal Recognition

Avoid only rewarding wins.

Recognition categories:

Reliable Player.
Helpful Member.
Fair-Play Champion.
Game Organizer.
Challenge Contributor.
Most Improved.
Team Player.
Consistent Participant.

Do not add public member downvotes.

30. Social Match Memory

Create a private history of meaningful Circle events:

First Circle game.
First complete room.
First challenge completion.
Close match.
Long participation streak.
Member milestone.
Seasonal highlight.
Circle-versus-Circle result.
Circle level achievement.

Privacy controls must determine whether usernames appear in externally shared achievement images.

31. Weekly Circle Recap

Include:

Games completed.
Unique participants.
Most-played games.
Challenge progress.
New members.
Upcoming events.
Recent achievements.
Open game proposals.
Pending administrative actions for authorized roles.

Do not publicly identify or shame inactive members.

32. Events and Polls

Events:

Game selection.
Date and time.
Participant limit.
Waitlist.
Reminders.
Event thread.
Cancellation state.
Event result.

Polls:

Game to play.
Preferred schedule.
Player count.
Mode.
Friendly or competitive.
Challenge selection.
Part 7: Resource and Coin Requests
33. Resource Request Boundary

Do not immediately permit unrestricted wallet coin transfers.

Start with one of these:

Circle Support Tokens.
Limited social energy.
Non-withdrawable participation resources.
Strictly capped promotional coins.

Exclude until audited:

Withdrawable value.
Cash-equivalent balance.
Purchased currency.
Voucher-redeemable value.
Resources transferable outside approved use cases.
34. Request State Machine
export type ResourceRequestStatus =
  | "OPEN"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "EXPIRED"
  | "CANCELLED"
  | "BLOCKED";


Request card:

Requesting member.
Resource type.
Requested amount.
Fulfilled amount.
Remaining amount.
Contributor count.
Expiration.
Contribution limit.
Current state.
35. Economy Rules
No self-contribution.
Daily request limit.
Daily contribution limit.
Per-Circle limit.
Minimum account-age requirement where appropriate.
No contribution from restricted accounts.
Transactional balance validation.
Double-entry ledger.
Idempotency key.
Immutable transaction reference.
Reversal support.
Audit record.
Anti-collusion checks.
No balance mutation from the client.

For sensitive transfers, users must see and acknowledge the significant transaction details. OWASP Transaction Authorization Cheat Sheet recommends that transaction authorization identify important transaction data so users understand what they are authorizing.

The confirmation should display:

Resource type.
Amount.
Recipient.
Circle.
Remaining balance.
Whether the contribution is reversible.
Applicable limits.
Part 8: Moderation and Safety
36. Member Safety Controls

Every member should have:

Report message.
Report member.
Block member.
Hide content.
Leave Circle.
Mute notifications.
Control invitation preferences.
Control presence.
Control external-share identity.
37. Moderator Controls
Delete or hide messages.
Temporary mute.
Remove member.
Ban re-entry.
Lock a thread.
Enable slow mode.
Disable invitation links.
Restrict game proposals.
Review reports.
Escalate to platform moderation.
38. Content Protection
Validate text length.
Sanitize rendered content.
Restrict arbitrary external URLs.
Convert only validated Bhalyam links into trusted cards.
Apply spam throttling.
Detect repeated invitation messages.
Restrict suspicious new accounts.
Preserve evidence for reported content according to retention policy.
Support appeal and administrative review.
39. Circle Health Monitoring

Maintain an internal risk model using:

Confirmed moderation incidents.
Invitation spam.
Repeated intentional abandonment.
Suspicious resource transfers.
Coordinated account patterns.
High member-removal frequency.
Repeated reports that result in enforcement.

Do not expose a single public trust score.

Possible internal responses:

Lower invite limits.
Disable resource requests.
Require additional approval.
Restrict link creation.
Trigger moderation review.
Apply temporary Circle suspension.
Provide an appeal process.
Part 9: Suggested Technical Architecture
40. Frontend

Recommended Bhalyam alignment:

React 18.
Strict TypeScript.
Tailwind CSS.
React Query or the repository’s existing data-fetching layer.
Existing global state solution only for authentication and cross-screen state.
WebSocket client with reconnection reconciliation.
PWA service worker for shell caching and push integration.
Zod validation for forms and incoming event payloads.
Accessible dialogs, drawers, menus, tabs, and focus management.

Mobile requirements:

Mobile-first layout.
Bottom-sheet interactions.
Virtualized message history.
Image compression before permitted uploads.
Conservative animation.
Reduced-motion support.
Low-bandwidth fallback.
Skeleton and error states.
Large touch targets.
Same-tab game navigation.
41. Backend Modules

Recommended NestJS module boundaries:

CirclesModule
CircleMembershipsModule
CircleInvitationsModule
CircleChatModule
CirclePresenceModule
CircleGameProposalsModule
CircleEventsModule
CircleChallengesModule
CircleProgressionModule
CircleResourcesModule
CircleModerationModule
CircleNotificationsModule
CircleAnalyticsModule
CircleAuditModule


Avoid a single oversized CirclesService.

42. Data Storage
PostgreSQL

Authoritative durable state:

Circles.
Memberships.
Roles.
Permissions.
Invitations.
Join requests.
Messages.
Channels.
Threads.
Game proposals.
Participants.
Events.
Polls.
Challenges.
Progression.
Achievements.
Resource requests.
Ledger references.
Moderation actions.
Audit logs.
Outbox events.
Redis

Ephemeral and coordination state:

Presence.
Typing indicators.
Socket membership.
Rate-limit counters.
Short-lived proposal locks.
Distributed lock support where justified.
Cached Circle summaries.
Event fan-out.
Temporary deduplication keys.

Do not store ownership, membership, financial settlements, or completed game results only in Redis.

43. Core Entities
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
CircleOutboxEvent

44. Database Constraints

Add database-level protection for:

Unique active membership per user and Circle.
One active owner per Circle.
Unique active invitation where applicable.
Unique participant per proposal.
Unique contribution idempotency key.
Unique room reference per proposal.
Unique event-processing key.
Valid state values.
Positive resource amounts.
Member-count protection through transactional logic.
Immutable financial reference IDs.

Application checks alone are insufficient under concurrent requests.

45. Durable Event Delivery

Use a transactional outbox pattern:

Commit the domain change.
Insert an outbox event in the same transaction.
Worker claims the outbox event.
Worker publishes WebSocket and notification events.
Worker marks the event delivered.
Duplicate delivery remains harmless through consumer deduplication.

Example topics:

circle.created
circle.updated
circle.member.joined
circle.member.removed
circle.message.created
circle.invitation.created
circle.join-request.approved
circle.game-proposal.created
circle.game-room.created
circle.resource.contributed
circle.challenge.completed
circle.moderation.applied

Part 10: Notifications
46. Notification Categories
Direct invitation.
Join-request update.
Pending approval.
Mention.
Reply.
Announcement.
Game invitation.
Seat available.
Game ready.
Game starting.
Event reminder.
Resource request.
Challenge completion.
Moderation action.
Weekly recap.
47. User Controls

Per Circle:

export type CircleNotificationMode =
  | "ALL"
  | "MENTIONS"
  | "GAMES_ONLY"
  | "ANNOUNCEMENTS_ONLY"
  | "CUSTOM"
  | "MUTED";


Custom toggles should cover:

Messages.
Mentions.
Games.
Events.
Requests.
Achievements.
Administrative actions.

Push notifications may use a cross-platform service. Firebase Cloud Messaging supports notification and data messages for Apple, Android, and web clients, with targeting for individual devices, groups, or subscribed topics.

Keep all targeting decisions in the trusted backend. Do not subscribe devices directly to predictable private Circle identifiers.

Part 11: Analytics and Observability
48. Member Analytics
Circle games completed.
Active members.
Most-played games.
Challenge progress.
Event participation.
Completion rate.
Circle achievements.
Participation distribution.
49. Owner Analytics
New members.
Pending requests.
Invitation acceptance.
Link usage.
Member participation.
Event attendance.
Open reports.
Expiring invitations.
Moderator activity.

Do not expose confidential platform risk signals.

50. Operations Dashboard

Track:

Circle creation success and failure.
Active Circles.
Membership growth.
Game proposals created.
Proposal-to-room conversion.
Seat-reservation conflicts.
Circle-originated game completion.
Join-link resolution failure.
WebSocket connections and reconnects.
Missing-message recovery.
Push-delivery outcomes.
Moderation reports.
Resource-transfer anomalies.
Outbox backlog.
Dead-letter events.
Database and Redis latency.
Room-creation failures.
51. Required Correlation IDs

Include:

Request ID.
User ID.
Circle ID.
Proposal ID.
Room ID.
Invitation ID.
Transaction ID.
Outbox event ID.
WebSocket connection ID.

Never log authentication tokens, raw invite tokens, private message contents by default, or financial secrets.

Part 12: Failure and Recovery Design
52. Critical Failure Scenarios

Design explicit recovery for:

Server restart during message creation.
Duplicate WebSocket event.
Out-of-order message.
Redis restart.
Owner account suspension.
Owner deletion.
Simultaneous ownership transfers.
Simultaneous last-seat reservations.
Join request approved twice.
Invite revoked during approval.
Member removed while joining a game.
Room filled during navigation.
Room creation succeeds but response fails.
Proposal cancelled while room creation is running.
Resource contribution retried.
Ledger succeeds but notification fails.
Circle renamed during an active game.
User blocks another member during a session.
Notification arrives after access was revoked.
53. Recovery Principles
PostgreSQL remains authoritative.
All critical commands use idempotency.
State transitions use conditional updates.
Financial changes use database transactions.
Notifications are retryable and non-authoritative.
WebSocket events reflect committed state.
Clients can refetch canonical state.
Every workflow has terminal failure handling.
Dead-letter events trigger operational alerts.
Administrative repair actions are audited.
Part 13: Accessibility and Performance
54. Accessibility Requirements
Keyboard-accessible dialogs and menus.
Visible focus indicators.
Screen-reader labels.
Semantic navigation.
Accessible unread-state announcements.
No colour-only status indicators.
Reduced-motion support.
Sufficient contrast.
Text scaling.
Logical focus restoration after drawers and modals.
Confirmation for destructive actions.
55. Low-End Device Support
Paginate messages.
Virtualize long lists.
Avoid loading the entire member list.
Lazy-load Circle media.
Use compressed thumbnails.
Avoid continuous presence animations.
Batch presence events.
Pause nonessential updates in background tabs.
Cache Circle summaries.
Provide retry UI for unstable networks.
Preserve unsent text locally.
Reconcile after reconnection.
Part 14: Phased Implementation Roadmap
Phase 0: Discovery and Governance

Produce:

CIRCLES_PRD.md
CIRCLES_ACCEPTANCE_CRITERIA.md
CIRCLES_DOMAIN_RULES.md
CIRCLES_PERMISSION_MATRIX.md
CIRCLES_STATE_MACHINES.md
CIRCLES_SECURITY_MODEL.md
CIRCLES_MODERATION_POLICY.md
CIRCLES_NOTIFICATION_SPEC.md
CIRCLES_ANALYTICS_SPEC.md
CIRCLES_RELEASE_BOUNDARIES.md

Validate existing Bhalyam:

User identity model.
Friend and block systems.
Game-room lifecycle.
Wallet and ledger.
WebSocket architecture.
Notification infrastructure.
Moderation services.
Deployment topology.
PWA routing.
Existing room-share behaviour.
Phase 1: Circle Foundation

Implement:

Circle creation.
Private Circle identity.
Owner role.
Member role.
Circle information screen.
Rename and settings.
Member list.
Leave Circle.
Ownership transfer.
Archive lifecycle.
Permission guards.
Administrative audit logs.

Release gate:

One owner invariant proven.
Ownership-transfer concurrency tested.
Removed members immediately lose access.
No private Circle discovery.
Phase 2: Membership and Invitations

Implement:

Username search.
Direct invitation.
Invitation inbox.
Secure invite links.
Join requests.
Approval and rejection.
Link expiration and revocation.
Moderator role.
Probationary membership.
Rate limits.
Block integration.

Release gate:

Invite tokens cannot be guessed.
Forwarded links do not bypass approval.
Duplicate approvals are harmless.
Circle capacity remains consistent under concurrency.
Phase 3: Real-Time Chat

Implement:

Channels.
Durable messages.
Reactions.
Replies.
Threads.
Mentions.
Announcements.
Unread cursors.
WebSocket updates.
Reconnection recovery.
Message reports.
Blocking and muting.

Release gate:

No duplicate displayed messages.
Missing messages recover after reconnection.
Removed users cannot continue publishing.
All payloads are validated.
WebSocket authorization is independently audited.
Phase 4: Circle Game Coordination

Implement:

Game proposals.
Seat reservation.
Waitlist.
Structured game cards.
Authoritative room creation.
Circle game tokens.
Same-tab routing.
Ready, full, started, expired, and cancelled states.
Guest passes.
Bot-fill configuration.

Release gate:

One room per proposal.
No seat overbooking.
Removed members cannot enter.
Token access alone is insufficient.
Room-creation retries do not create duplicates.
Phase 5: Circle Pulse

Implement:

Presence.
Looking-for-player status.
Active-member view.
Recommended compatible games.
Open-seat overview.
Upcoming events.
Current challenge.
Quick proposal creation.

Release gate:

Presence privacy is respected.
Recommendations never bypass eligibility.
Paid rooms require explicit user action.
Low-bandwidth fallback works.
Phase 6: Events, Polls, and Recognition

Implement:

Scheduled events.
Waitlists.
Reminders.
Polls.
Operational roles.
Recognition categories.
Weekly Circle recap.
Match memories.

Release gate:

Time-zone handling is correct.
Cancelled events stop future reminders.
Private identity is excluded from external shares without consent.
Phase 7: Progression and Seasons

Implement:

Circle experience.
Cosmetic levels.
Collaborative challenges.
Permanent achievements.
Seasonal progression.
Archived season summaries.
Anti-farming validation.

Release gate:

Rewards derive from finalized outcomes.
Duplicate game events do not duplicate rewards.
Suspicious activity can be withheld for review.
Permanent identity is not lost at season reset.
Phase 8: Resource Requests

Implement initially with limited social resources:

Request cards.
Contribution flow.
Request limits.
Contribution limits.
Ledger integration.
Idempotency.
Reversals.
Abuse detection.
Economy dashboards.

Release gate:

Independent economy audit.
Double-entry balancing verified.
Concurrent contributions cannot exceed request amount.
Failed notification does not reverse a completed transaction.
Withdrawable or cash-equivalent balances remain excluded unless separately approved.
Phase 9: Advanced Social Gaming

Implement selectively:

Circle-versus-Circle events.
Saved game configurations.
Smart recruitment.
Post-match Circle creation.
Advanced Match Memory.
External privacy-safe achievement sharing.
Optional restricted voice party.

Release gate:

Cross-Circle privacy testing.
Voice moderation readiness.
Abuse and blocking rules tested.
No unmanaged external links.
Phase 10: Production Hardening

Complete:

Load testing.
Concurrency testing.
Restart testing.
Redis-failure testing.
WebSocket soak testing.
Authorization penetration testing.
Token-leak testing.
Economy audit.
Moderation workflow testing.
Accessibility audit.
Low-end-device testing.
Backup and restoration drill.
Incident-response runbooks.
Feature flags.
Rollback plan.
Independent certification audit.
Part 15: Testing Strategy
56. Unit Tests

Test:

Permission resolution.
State transitions.
Invite eligibility.
Membership rules.
Proposal readiness.
Seat allocation.
Contribution limits.
Notification preference resolution.
Challenge calculations.
57. Integration Tests

Test:

Circle creation transaction.
Ownership transfer.
Join approval.
Membership removal.
Message outbox.
Game-room creation.
Resource settlement.
Moderation actions.
Push-notification selection.
58. Concurrency Tests

Test:

Two users claiming the final Circle capacity slot.
Two moderators approving one request.
Multiple players claiming the final game seat.
Concurrent ownership transfer.
Multiple contributions fulfilling one request.
Proposal cancellation racing with room creation.
Member removal racing with game entry.
59. End-to-End Tests

Cover:

Create Circle.
Invite by username.
Join through link.
Approve request.
Send message.
Create game proposal.
Reserve seats.
Create room.
Navigate in the same tab.
Complete game.
Record memory.
Remove member.
Verify immediate access revocation.
60. Chaos and Recovery Tests
Restart API instances.
Restart WebSocket instances.
Flush ephemeral Redis state in a controlled environment.
Delay outbox processing.
Deliver events twice.
Deliver events out of order.
Simulate push failure.
Simulate database transaction rollback.
Simulate room-service timeout after successful creation.
Part 16: Release Strategy
61. Feature Flags

Use separate flags:

circles.foundation
circles.invitations
circles.chat
circles.gameProposals
circles.guestPass
circles.pulse
circles.events
circles.challenges
circles.resources
circles.crossCircle
circles.voice

62. Rollout Order
Internal test accounts.
Controlled QA Circles.
Selected existing players.
Limited geographic or account cohort.
Wider release after metric and incident review.
Resource features only after economy certification.
Voice and cross-Circle features only after safety certification.
63. Rollback Rules

Every phase must support:

Disable creation while preserving existing data.
Disable new invitations.
Switch chat to read-only.
Disable new game proposals.
Disable resource contributions.
Stop notifications.
Preserve audit and ledger records.
Reconcile pending workflows after rollback.
Final Recommended Scope
Initial production version

Build these first:

Private Circles.
Owner, moderator, probationary member, member, and muted states.
Direct username invitations.
Secure invite links with approval.
Circle information and settings.
Real-time chat.
Structured game proposals.
Seat reservations.
Dedicated Circle game links.
Same-tab game navigation.
Guest passes.
Presence and Circle Pulse.
Reporting, blocking, muting, and audit logs.
Notification preferences.
Production observability.
Second-level expansion

Add:

Polls.
Events.
Weekly recap.
Social Match Memory.
Operational roles.
Collaborative challenges.
Cosmetic Circle progression.
Seasons.
Saved game configurations.
Advanced controlled expansion

Add only after independent audits:

Resource requests.
Reward-bearing progression.
Smart recruitment.
Circle-versus-Circle events.
Social transfer features.
Voice parties.
Advanced recommendation models.
Final Product Definition

Bhalyam Circles is a private social operating system for multiplayer gaming.

Its most important success metric should not be message volume. It should be whether Circles make it easier for players to:

Find trusted participants.
Create complete game groups.
Start games successfully.
Finish games without abandonment.
Return to play with the same community.
Build meaningful shared history.
Blueprint improvements
Defined the full product from identity and membership through advanced seasons and cross-Circle events.
Added complete role, permission, invitation, membership, chat, game, economy, and moderation models.
Separated game proposals from authoritative room creation.
Added concurrency, idempotency, restart recovery, and outbox requirements.
Organized implementation into independently releasable phases with clear production gates.
Prioritized Circle Pulse, Guest Pass, and Social Match Memory as Bhalyam’s primary differentiators.