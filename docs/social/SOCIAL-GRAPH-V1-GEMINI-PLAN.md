# Social Graph v1 — Implementation Plan (for Gemini)

> **Audience:** the Gemini coding agent implementing this, and Claude, which audits each work package afterwards.
> **Status:** approved scope as of 2026-09-24. Anything not listed under "In scope" is **out of scope** — do not build it, even partially, even as a stub or a "coming soon" tile.
> **Required reading first:** `AGENTS.md` (all of it, especially §7, §9, §11, §16, §18, §19), `docs/ai/security-standards.md`, `docs/ai/testing-standards.md`. (`docs/ai/new-game-checklist.md` does not apply — no game is added.)

---

## ROLE

You are a Staff Full-Stack Engineer on BHALYAM (React 18 + Vite client, Node 22 + Express + Socket.IO server, Supabase Postgres for durable data, shared types under `shared/`). You extend existing systems instead of creating parallel ones, and you treat India's DPDP Act 2023 as a hard requirement for any data about people.

## INTENT

Turn the existing, partly broken friends feature into a solid **social graph foundation**: correct friend lifecycle, blocking, friend categories and private nicknames, real server-derived presence, 1:1 direct messages between friends, and a durable **shared history / friendship timeline** between two players. The long-term product idea is "BHALYAM = the digital home for lifelong gaming friendships"; this plan is the part that can be built safely **today** and becomes the data foundation for later memory/AI features.

## CONTEXT — what already exists (verified 2026-09-24)

| Area | Where | State |
|---|---|---|
| Friends graph | `server/src/social/FriendsService.ts` (in-memory `Map`, hydrated from `public.friends` at boot via `persistence/hydrate.ts`) | Works for add/list. **Defects below.** |
| Friend requests | `server/src/social/FriendRequestsService.ts`, table `public.friend_requests` | Send / accept / decline. No cancel. Status check is `PENDING/ACCEPTED/DECLINED` only. |
| **Second** friends graph | `server/src/ranking/RecentPlayersService.ts` (`friends` map + `removeFriend`) | Duplicate implementation — see D2. |
| Presence | `server/src/social/PresenceService.ts`, `shared/social/Presence.ts` | In-memory, **client-asserted** via `POST /api/social/presence/:playerId`, polled, 3-min timeout, statuses `ONLINE/OFFLINE/IN_GAME/IN_PARTY/IN_TOURNAMENT`. |
| Shared history | `FriendsService.recordMatchTogether` / `getSharedHistory`, route `GET /api/social/shared-history/:p1/:p2`, client `features/social/SharedHistoryModal.tsx` | **Never written** — see D3. |
| Match records | `public.match_summaries`, `public.match_participants`, written via `profileService.recordMatchFinished` from `RoomManager.ts` (~L3654) | Durable. This is the source of truth for "played together". |
| Parties | `server/src/party/*`, tables `parties`, `party_members`, `party_invitations` | Create / invite / ready / target / leave / disband. Leave alone unless a WP says otherwise. |
| Group chat, roles, invites, coin transfer | **Mandali** (`server/src/mandali/*`, `client/src/pages/mandali/*`, migrations `20261001…`–`20261004…`) | Mature. **Group chat = Mandali.** Do not build a second group-chat system. |
| Gnapakalu (memories) | `MandaliService.recordMemory` / `getMemories` (~L1198), event `mandali:memory:created` | Exists, **scoped to a Mandali**, not to a friendship. WP5's friendship timeline is per-pair and separate; do not create a third memory store, and do not change Gnapakalu in this plan. |
| Identity / auth | `server/src/auth/identity.ts` (`requireIdentity`, `requireSelfParam`, `requireParticipantParams`, `callerId`) | Every new route MUST use these. Actor comes from `callerId(req)`, never from the body. |
| Rate limiting | `server/src/lib/rateLimiter.ts` | Use it on every new write route and socket event. |
| Privacy registry | `client/src/lib/privacy/dataInventory.ts` | Every new localStorage key MUST be declared here. |
| Profiles, XP, achievements, streaks, cosmetics, economy | `server/src/profile`, `ranking`, `streak`, `cosmetics`, `economy` | Read-only for this plan. **Do not touch the economy/ledger.** |

### Known defects to fix first (WP0)

- **D1 — Unfriend is not durable.** `POST /api/social/friends/:playerId/remove` calls `FriendsService.removeFriend`, which never calls `progressionSync.friendRemoved`. After a server restart, `hydrate.ts` restores the removed friend.
- **D2 — Two friend graphs.** `RecentPlayersService` keeps its own `friends` map with its own add/remove. They can disagree. Make `FriendsService` the single owner; `RecentPlayersService` must delegate to it.
- **D3 — Shared history is always zero.** `recordMatchTogether` has no production caller, and `sharedHistoryMap` is not persisted.
- **D4 — No way to cancel an outgoing request**, and the DB status check has no `CANCELLED`.
- **D5 — Mutual requests.** If A→B is pending and B sends B→A, it should resolve to accepting A→B, not create a second pending row.

---

## SCOPE

### In scope (this plan)

| WP | Feature |
|---|---|
| WP0 | Fix D1–D5, one friend graph |
| WP1 | Block / unblock user, report user (queue only) |
| WP2 | Friend categories (fixed set) + private nicknames |
| WP3.0 | Socket identity foundation (verified identity on the main socket layer) |
| WP3 | Presence v2 (server-derived, pushed over socket, friends-only) |
| WP4 | 1:1 direct messages between friends (text + emoji reactions) |
| WP5 | Durable shared history + friendship timeline milestones + "played-together" streak (display only) |
| WP6 | Friends activity feed (auto-generated events only, reactions only) |

### Explicitly out of scope — do NOT build

Images, GIFs, stickers, voice notes, video, screenshots, user-written posts, comments, shares, polls · voice rooms · followers/following · location, nearby friends, lounge presence · presence for external games (BGMI, Valorant) · "streaming" status · any AI/LLM feature (suggestions, summaries, memory cards, matchmaking) · gifting, friend missions, squad rewards, **any coin/XP reward** tied to social actions · friendship levels that unlock rewards · custom (user-defined) categories · age gate / minors flow · 3D/VR/avatar generation. If you believe one of these is required to finish a WP, stop and ask instead of building it.

---

## ENGINEERING RULEBOOK (read before any WP — violations are sent back for rework)

This is a social feature: every endpoint handles one person's data about another person. Most of the rework in this repo so far has come from a small set of repeated mistakes, and those mistakes are listed here as rules. **R-numbers are cited in audits.** If a rule conflicts with something you believe is necessary, stop and ask; do not work around it.

### R1 — Process and honesty

- **R1.1** One WP at a time. Finish it, hand back, wait for the audit. Do not start the next WP "to save time".
- **R1.2** Build only what the WP says. No extra features, no "while I was here" refactors, no stubs, no "Coming soon" UI, no placeholder numbers.
- **R1.3** **Never fake live data.** No invented counts, XP, streaks, rewards, "3 friends online" or sample friends in production code. (A past audit had to remove fake "+50 XP" pop-ups and a fake coin rain.) If the data doesn't exist yet, show an honest empty state.
- **R1.4** Report only checks you actually ran, with the real output. Mark unverified items `[ ]` and give the reason. A false `[x]` fails the audit outright.
- **R1.5** Before changing any symbol, grep for every caller and list them in the hand-back.
- **R1.6** Don't touch files outside the WP. Don't reformat files you only read. Don't commit, push, or edit git config.
- **R1.7** When unsure, ask one precise question in the hand-back instead of guessing. Guessed product decisions are the most expensive kind of rework.
- **R1.8** No new npm packages, env vars, external services or storage buckets without asking. (The server has no `zod`; write type guards by hand, see R4.)

### R2 — Identity and authentication

- **R2.1** HTTP: every new route is behind `requireIdentity`, `requireSelfParam` or `requireParticipantParams` from `server/src/auth/identity.ts`, and the actor is **only** `callerId(req)`.
- **R2.2** **No actor fields in bodies or payloads.** `senderId`, `playerId`, `fromId`, `ownerId`, `blockerId` and the like must not appear in any request body or socket payload type. A past audit found a CRITICAL anonymous impersonation bug from exactly this (Mandali, 2026-09-23).
- **R2.3** Sockets: the main socket layer (`server/src/sockets/index.ts`) has **no verified identity today**. Only Mandali verifies, through `mandali:authenticate` + `resolvePlayerIdentity`. WP3.0 below builds a general version. Until then, **no social socket event may be added.**
- **R2.4** Never decode a JWT by hand, never trust `x-account-kind` or other headers, and never add a dev fallback identity outside `verificationMode() === "off"`.
- **R2.5** Guest vs member: read `shared/permissions.ts` (`capabilitiesFor(kind)`). If a new action needs gating, **add a capability there**; never test `isGuest` inline. Proposed defaults (confirm in the WP hand-back): DMs = members only; friend requests, blocking and reporting = unchanged, open to guests and members.

### R3 — Authorization (who may see or change what)

- **R3.1** Each WP's hand-back must include an **authorization matrix**: one row per route/event, with columns for anonymous · self · friend · non-friend · blocked (either direction) · third party, and allow/deny in each cell. Each deny must have a test.
- **R3.2** Object-level checks, always: loading a record by id (request, thread, message) must check that the caller is a party to it **before** reading or mutating it. A path id is not permission. (IDOR is the #1 bug class in social features.)
- **R3.3** Private-to-owner data (nicknames, categories, favourites, blocks, DND/invisible choice, read receipts) is returned **only** to its owner. It never goes into another user's response, socket event, feed item or presence payload.
- **R3.4** Block is checked on the **server** at every entry point listed in WP1, in **both directions**. Client-side hiding is cosmetic only.
- **R3.5** **No enumeration or disclosure.** "Blocked", "doesn't exist", "not friends" and "has DMs off" all return the same generic error and status (use one helper). Responses and timing must not reveal whether someone blocked you.
- **R3.6** Invisible means invisible: no status, no `lastActiveAt`, no activity line, no "typing" indicator. For every friend, an invisible user is indistinguishable from an offline one.
- **R3.7** Presence, feed and DMs only go to **accepted, non-blocked friends**. Nothing social is ever broadcast to a whole room or to `io` globally.

### R4 — Input validation and output safety

- **R4.1** Validate at the boundary with hand-written type guards in `server/src/social/validation.ts` (new). Check `typeof`, reject unknown enum values, and enforce length **after** normalisation. Run socket payloads through `PayloadValidator.sanitizeObject` first (strips `__proto__` / `constructor`).
- **R4.2** Free text (nickname, DM body, report note if any): Unicode-normalise to NFC; trim; strip control characters, zero-width characters (U+200B–U+200D, U+2060, U+FEFF) and bidi overrides (U+202A–U+202E, U+2066–U+2069); collapse runs of more than 3 newlines; then enforce the length limit. Reject anything left empty.
- **R4.3** Enums (category, report reason, reaction emoji, presence preference, feed kind) are validated by **set membership** against a constant shared with the client. Never use regex allow-patterns for these.
- **R4.4** Render user text as React text children only. **No `dangerouslySetInnerHTML`, no markdown rendering, no auto-linkify** in v1.
- **R4.5** Server-built payloads only: feed items and presence lines are composed from ids, numbers and enums. The client supplies no display text for anything shown to other people, except a DM body that passes R4.2.
- **R4.6** Pagination: `limit` is clamped server-side (`≤ 50` DMs, `≤ 30` feed). Cursors are opaque, and ids are validated before use.
- **R4.7** IDs for new records come from `nanoid` / `node:crypto`. **Don't copy** the existing `Date.now() + Math.random()` id pattern.

### R5 — Abuse and rate limits

- **R5.1** HTTP writes use `rateLimitByCaller` (`server/src/lib/httpRateLimiter.ts`), keyed on `callerId(req)`. Socket events use `SocketRateLimiter` (`server/src/lib/rateLimiter.ts`), keyed on the verified player id (not the socket id, which resets on reconnect).
- **R5.2** Required limits. They are named constants in one file, `server/src/social/limits.ts`, and each has a test:

| Action | Limit |
|---|---|
| Friend requests sent | 20 / day, 5 / minute |
| Pending outgoing requests | max 100 |
| Re-request after decline | 7-day cooldown for the same pair (return the generic error) |
| Friends per player | max 1000 |
| Blocks per player | max 1000; block/unblock 30 / hour |
| Reports | 5 / hour, 20 / day |
| DM messages | 5 per 5 s, 200 / day, 1000 chars |
| DM reactions | 30 / minute |
| Nickname/category edits | 60 / hour |
| Feed reactions | 60 / minute |
| Presence updates emitted | ≤ 1 per player per 2 s (server-side coalescing) |

- **R5.3** On hitting a limit: HTTP returns 429 + `Retry-After` (the helper already does this); sockets ack `{ ok: false, error: "RATE_LIMITED" }`. Nothing is silently dropped when the client awaits an ack.

### R6 — Database and persistence

- **R6.1** One new migration per WP, timestamped after the latest file in `supabase/migrations/`. **Never edit an applied migration.**
- **R6.2** Every table: `enable row level security`; no policies for `anon`/`authenticated` unless a WP explicitly needs direct client reads (none do); writes via the service role through the server only.
- **R6.3** Every column holding a player id has an FK to `public.player_identities(player_id) ON DELETE CASCADE`. This is how account erasure reaches the new data; a missing cascade fails the audit.
- **R6.4** Every app-level validation rule is **also** a DB `check` constraint (lengths, enums, `a <> b`, ordered pairs `low < high`). The DB is the last line of defence.
- **R6.5** Unique constraints back every idempotency and "only one" rule (one pending request per pair, one reaction per user per message, one pair row). Treat a unique violation as idempotent success where that's the right meaning.
- **R6.6** Add an index for every query path you write, and name it in the migration comments.
- **R6.7** All DB access goes through the existing `server/src/persistence/postgrest.ts` helper and a repository interface with **both** an `InMemory*` and a `Supabase*` implementation. No string-built PostgREST filters from user input; values must be encoded by the helper.
- **R6.8** Server-side state is the in-memory service, hydrated at boot (`persistence/hydrate.ts`) and written through (`ProgressionSync` pattern). **Every mutation must reach the repository**, since D1 exists because one didn't. Test: mutate → rebuild from the repository → assert.
- **R6.9** Multi-step changes (block = unfriend + cancel requests + drop invites) must leave no half-state if a step fails: do them in one RPC/transaction, or order them so a retry converges. State which approach you chose in the hand-back.

### R7 — Privacy (DPDP Act 2023: strict, standing requirement)

- **R7.1** **Minimise.** Store only the fields in the WP. No IP addresses, device info, location, message metadata beyond what's needed, and no analytics events.
- **R7.2** Every new kind of server-held personal data is listed in the hand-back, with: purpose · who can see it · retention · how it's erased · whether it's in the user's data export. If the export can't reach it yet, say so as a gap; **don't invent an export pipeline unasked.**
- **R7.3** Client storage: **no DMs, nicknames, block lists or friend lists in `localStorage`/`sessionStorage`/IndexedDB.** Keep them in memory. Any new key you truly need goes in `client/src/lib/privacy/dataInventory.ts` in the same change, with `holdsOthersData: true` if it stores data about other people.
- **R7.4** If the privacy notice's content changes, bump `NOTICE_VERSION` in `client/src/lib/privacy/consent.ts` and say so. Don't write legal wording yourself: add plain factual text and flag it for legal review.
- **R7.5** Retention is enforced by code (prune job + test), not by comment: DMs 1 year (WP4), feed 180 days (WP6), reports 1 year, friend requests 30 days (on read).
- **R7.6** Don't build an age gate, minors flow, or anything else that infers age. That's an open product/legal decision. The friends-only DM rule is the child-safety boundary for now.
- **R7.7** Logs: use `logger` from `server/src/lib/logger.ts`, and log **ids only**. Never log message bodies, nicknames, report notes, tokens or emails. No `console.*`.

### R8 — Architecture and code quality

- **R8.1** One owner per concept: `FriendsService` owns friendship, `BlockService` owns blocks, and so on. No second copy of the same state anywhere (D2 is the cautionary example).
- **R8.2** Group chat is Mandali. Memories are Gnapakalu (Mandali). Don't create parallel systems; if you need a shared helper from Mandali, extract it with zero behaviour change and keep Mandali's tests green.
- **R8.3** Socket events: `area:action` names, declared in `ClientToServerEvents` / `ServerToClientEvents` in `shared/types.ts`, and registered **only** in `server/src/sockets/index.ts`. **No `as any` on `emit`** (the Mandali `mandali:memory:created` emit is a violation, not a pattern to copy).
- **R8.4** Strict TypeScript: zero `any`; `unknown` + narrowing at boundaries; explicit return types on exported functions; no non-null `!` on data from outside.
- **R8.5** New code returns new objects; don't mutate inputs or shared maps outside the owning service.
- **R8.6** Functions < 50 lines, files < 800 lines, nesting ≤ 4, named constants (no magic numbers), JSDoc for *why*, server imports with `.js`, shared via `@shared/*`.
- **R8.7** Errors: services return `{ ok: false, code }` for expected failures, and routes map codes to status via one helper. Nothing throws to the client; no stack traces or internal messages in responses.
- **R8.8** Remove what you replace: when WP3 replaces polling, delete the polling code and dead types in the same WP.

### R9 — Frontend

- **R9.1** Both layouts, every UI change: mobile 320–767 px (bottom sheets, full-screen threads, thumb reach) and desktop ≥ 1024 px (side panels). Branch with `useViewport`; share logic in hooks/components, so only the shell differs. **Don't duplicate hook logic between the Mobile and Desktop files** (a past audit flagged about 150 duplicated lines).
- **R9.2** Every data view has loading (skeleton), empty (honest copy + next action), error (retry) and rate-limited states.
- **R9.3** Optimistic updates roll back visibly on failure. Unread counts and presence come from the server, never computed client-side.
- **R9.4** Design tokens only. Dark mode flips **both** the panel and the ink on the same element (test both themes). No `Sparkles` icon, no emoji as chrome icons, touch targets ≥ 44 × 44 px.
- **R9.5** Accessibility: every icon button has an `aria-label`; modals use the existing `Modal` (focus trap, Esc); pass a **stable** `onClose` (hold it in a ref), since unstable callbacks caused focus-stealing bugs before. New incoming DMs are announced via a polite `aria-live` region, throttled. Keyboard: Enter sends, Shift+Enter adds a newline, Esc closes. Respect `prefers-reduced-motion`.
- **R9.6** Copy is honest and specific. No promises of features that don't exist. Block confirmation says exactly what happens (unfriends, hides DMs, they aren't told).
- **R9.7** Lazy-load new heavy panels (DM thread, timeline) so the initial bundle budget doesn't move; the `check:bundle` gate must stay green.

### R10 — Testing

- **R10.1** TDD: the failing test is written first; say which tests were red before implementation.
- **R10.2** **Security test matrix, for every new route/event:** unauthenticated → 401 · other user's id → 403 · forged actor field in payload → ignored/rejected · blocked pair (both directions) → generic deny · invalid input (wrong type, too long, bad enum, bidi/zero-width only) → 400 · over limit → 429 · happy path · repeated call → idempotent · persistence round-trip (mutate → rehydrate → assert).
- **R10.3** Tests go through the **production wiring**: construct services with their real collaborators (in-memory repositories), not with a dependency left out. A past CRITICAL bug hid because a test built the service without its wallet dependency, so the real branch never ran.
- **R10.4** Deterministic: inject clocks (`now`) and id generators; no real timers or network. Test IST day boundaries explicitly for streaks.
- **R10.5** No `.skip`, `.only` or deleted/weakened assertions. The existing suite stays green.
- **R10.6** Client tests: `@testing-library/react` + `fireEvent` (`user-event` is **not** installed); import `@testing-library/jest-dom/vitest` per file; `waitFor` across framer-motion transitions.
- **R10.7** ≥ 80 % line coverage on new server files; include the coverage numbers in the hand-back.

### R11 — Auto-reject list (the audit fails immediately on any of these)

1. An actor id read from a body, query or socket payload.
2. A social route or socket event without verified identity.
3. A private-to-owner field visible to another user.
4. Something that shows whether someone blocked you.
5. A new table without RLS, or a player-id column without `ON DELETE CASCADE`.
6. `any`, `as any`, `dangerouslySetInnerHTML`, `console.*` in new code.
7. Fake or hard-coded social data in production UI.
8. An edited applied migration, a skipped test, or a claimed check that wasn't run.
9. Changes to economy, wallet, cosmetics or Mandali coin code.
10. A new dependency or env var that wasn't asked for.

---

## WORK PACKAGES

**Order of work (dependencies, not preference):** WP0 → WP1 → WP5 → WP3.0 → WP3 → WP2 → WP4 → WP6. Blocking has to exist before anything that shows presence or allows messaging; WP3.0 has to exist before any socket event.

Rules that apply to every WP (in addition to the Rulebook):

- Branch: `feat/social-graph-v1` from an up-to-date `main`. **Do not commit** — the user commits. At the end of each WP, stop and produce the hand-back report (format at the bottom), then wait for the Claude audit before starting the next WP.
- **Migrations:** new file per WP under `supabase/migrations/` with a timestamp later than `20261004000000`. **Never edit an applied migration.** Every new table: RLS enabled, no anon grants, service-role writes only (match the pattern in `20261001000000_mandali_persistence_foundation.sql`). Add in-memory + Supabase repository implementations following the existing `InMemory*Repository` / `Supabase*Repository` pairs, and extend `hydrate.ts` if the data must survive restarts.
- **Shared types** go in `shared/social/*.ts`; import as `@shared/...` (server with `.js` extension).
- **TDD:** write the failing server test first under a `__tests__/` folder next to the code. Aim for ≥ 80 % line coverage on new server files.
- **No `any`**, no `console.log`, functions < 50 lines, files < 800 lines, JSDoc for the *why*.
- **Client UI**: extend `client/src/pages/SocialHubPage.tsx` and `client/src/features/social/*`. Mobile (320–767 px) and desktop (≥ 1024 px) must both work; use `useViewport`; 44 × 44 px touch targets; design tokens only; no `Sparkles` icon; no emoji as chrome icons; dark mode must flip panels AND text.
- **Privacy:** anything one user stores about another (nickname, category, block) is **private to the owner**, never broadcast, included in the owner's data export, and erased on account deletion. Update the privacy notice and export registry in the same WP.

### WP0 — Correct the friend lifecycle

1. `FriendsService.removeFriend` → persist both directions via `progressionSync.friendRemoved` (test: remove → rehydrate from repository → still removed).
2. Delete the duplicate graph in `RecentPlayersService`; route its add/remove/isFriend through `friendsService`. Grep every caller first; keep public method signatures so callers compile.
3. Add `POST /api/social/requests/:requestId/cancel` (caller must be the **sender**; 403 otherwise). Migration: extend the `friend_requests.status` check to include `CANCELLED`.
4. Mutual request: sending B→A while A→B is pending accepts A→B.
5. Requests expire after 30 days (constant `FRIEND_REQUEST_TTL_MS`), filtered on read, not by a new job.
6. Client: cancel button on outgoing requests in `FriendRequestPanel.tsx`; unfriend asks for confirmation (use the existing modal system).

**Acceptance:** tests for each of D1, D2, D4, D5 and the TTL; `SharedHistoryModal` untouched (WP5 fixes D3).

### WP1 — Block and report

- Migration: `public.player_blocks (blocker_id, blocked_id, created_at, primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id))`.
- `server/src/social/BlockService.ts` with `block`, `unblock`, `isBlockedEitherWay(a, b)`, `listBlocked(me)`.
- Blocking **atomically**: removes the friendship both ways, cancels pending requests both ways, removes pending party invitations between the two.
- `isBlockedEitherWay` is enforced **server-side** in: friend request send, party invite, DM send (WP4), presence visibility (WP3), feed visibility (WP6), and any room-invite path that targets a specific player. The blocked party gets a **generic** error ("Can't send to this player") — never reveal that they were blocked.
- Routes: `POST /api/social/blocks` `{ targetId }`, `DELETE /api/social/blocks/:targetId`, `GET /api/social/blocks/:playerId` (self only).
- Report: `POST /api/social/reports` `{ targetId, reason: closed enum, context?: messageId }` → table `public.player_reports`; no admin UI in this WP beyond the table. Rate-limit 5/hour per caller.
- Client: "Block" and "Report" in a friend's overflow menu and on the DM thread header; a "Blocked players" list in Settings → Privacy with unblock.

**Acceptance:** tests that every enforcement point above rejects a blocked pair in both directions; the export contains the caller's own block list only.

### WP2 — Friend categories and private nicknames

- Migration: add to `public.friends` → `category text not null default 'GAMING' check (category in ('CLOSE','GAMING','SCHOOL','COLLEGE','WORK','FAMILY','OTHER'))`, `nickname text check (char_length(nickname) <= 32)`, `is_favourite boolean not null default false`.
- These live on the **owner's** row (`player_id = me`) only; the other person never sees them.
- Nickname validation: trim, 1–32 chars, strip control characters, reject `<`/`>`; render as text only (never `dangerouslySetInnerHTML`).
- Route: `PATCH /api/social/friends/:playerId/:friendPlayerId` `{ category?, nickname?, isFavourite? }` — `requireSelfParam`, validated against the closed set.
- Client: filter chips by category, nickname shown with the real name underneath ("School Cricket Captain · Sai Kumar"), favourites pinned to the top.

**Acceptance:** tests for validation, ownership (can't edit someone else's row), and that the other player's friend list never contains my nickname/category for them.

### WP3.0 — Socket identity foundation (prerequisite for WP3, WP4, WP6 live updates)

Today only Mandali's sockets know who is connected. Presence, DMs and live feed updates cannot be built safely until the main socket layer can.

- New event `session:authenticate` `{ token }` in `server/src/sockets/index.ts`, verified with `resolvePlayerIdentity` (the same function HTTP and Mandali use). Store the identity on `socket.data`, join `user:<playerId>`, ack `{ ok, playerId }`.
- Re-authenticating as a different player first leaves the old `user:` room (mirror the previous-identity handling in `MandaliSocketHandlers.ts`). Sign-out leaves it too.
- A helper `requireSocketIdentity(socket)` returns the verified player id or `null`. Every social event handler calls it first and acks `{ ok: false, error: "UNAUTHENTICATED" }` on `null`.
- Track connections per player (`playerId → Set<socketId>`) in one place; WP3 derives ONLINE/OFFLINE from it.
- Client: authenticate once on connect and again on reconnect/token refresh, through the existing `getSocket()` singleton; no second socket.
- Do **not** change `room:*` / `game:*` seat-token behaviour, and do not migrate Mandali to the new event in this WP.

**Acceptance:** tests for a valid guest token, a valid member token, a bad token, re-auth as someone else (old room left), and an event from an unauthenticated socket (rejected).

### WP3 — Presence v2

- Replace client-asserted presence with **server-derived** presence:
  - `ONLINE` = has ≥ 1 connected socket; `IDLE` after 5 min with no socket activity; `OFFLINE` = no sockets (30 s debounce so a reconnect doesn't flicker).
  - `IN_MATCH` / `SPECTATING` / `IN_TOURNAMENT` / `IN_PARTY` derived from `RoomManager` / tournament / party state, not from the client.
  - User-selectable only: `AUTO` (default), `DND`, `INVISIBLE` (appears offline to everyone). Persist this preference on the profile.
- Rich line built on the server from **closed data only**: e.g. `{ kind: "IN_MATCH", game: "ludo", withFriends: 2 }` → the client renders "Playing Ludo with 2 friends". Remove the free-text `activityDetail` input from clients.
- Delivery: a new socket event `presence:update` (declare in `ClientToServerEvents` / `ServerToClientEvents`, register only in `server/src/sockets/index.ts`) sent **only to accepted, non-blocked friends**, throttled to ≤ 1 update per player per 2 s. Keep `POST /presence/query` for initial load; remove the client polling loop.
- Room codes are **never** included in presence (joining stays invite-based).

**Acceptance:** tests for the derivation table, INVISIBLE, DND, block filtering and the throttle; a two-browser manual check that a friend's status changes within ~3 s of them joining a room.

### WP4 — 1:1 direct messages (friends only)

- Only between **accepted friends who have not blocked each other**. Non-friends cannot DM — this is the child-safety boundary; do not relax it.
- Migration: `public.dm_threads (id, player_a, player_b, created_at, last_message_at)` with a unique index on the ordered pair, `public.dm_messages (id, thread_id, sender_id, body text check (char_length(body) between 1 and 1000), created_at, deleted_at)`, `public.dm_reactions (message_id, player_id, emoji, primary key (message_id, player_id))`, `public.dm_read_state (thread_id, player_id, last_read_message_id)`.
- **Reuse Mandali, don't copy it**: if Mandali's sanitisation / emoji allow-list helpers are needed, extract them into a shared module used by both. Reuse the retention approach of `MandaliRetentionJob.ts` (1-year retention, daily prune, deleted text actually erased).
- Reactions validated against the existing closed set in `shared/reactions.ts`.
- Transport: socket events `dm:send`, `dm:message`, `dm:read`, `dm:react`; sender = the socket's verified identity (never a payload field); rate-limit 5 msgs / 5 s and 200 / day per sender.
- History: `GET /api/social/dm/:threadId/messages?before=&limit=` (participants only, `limit ≤ 50`).
- After unfriend, history stays readable but read-only; blocking hides the thread for the blocker.
- Client: thread list + thread view; mobile = full-screen sheet, desktop = side panel in Social Hub; unread badge; "Report message".

**Acceptance:** tests for non-friend rejection, blocked rejection, forged sender, rate limits, length limits, retention prune, participant-only history.

### WP5 — Shared history and friendship timeline (the long-term foundation)

- Migration: `public.friendship_pairs (player_low, player_high, matches_together, wins_together, tournaments_together, first_match_at, last_match_at, current_daily_streak, best_daily_streak, streak_last_day date, primary key (player_low, player_high), check (player_low < player_high))` and `public.friendship_milestones (player_low, player_high, kind text check (kind in ('FIRST_MATCH','FIRST_WIN','MATCHES_10','MATCHES_50','MATCHES_100','MATCHES_500','MATCHES_1000','FIRST_TOURNAMENT','FRIENDS_SINCE')), reached_at, match_id, primary key (player_low, player_high, kind))`, plus a processed-match table or column so recording is idempotent.
- Write path: next to where `RoomManager` calls `profileService.recordMatchFinished`, call a new `friendshipHistoryService.recordMatch(...)` for every **pair of human, non-bot, non-pass-and-play-local** participants. It must be **idempotent on `matchId`** (same replay-safety reasoning as the matchId comment in `ProfileService.ts`). Record every pair, not only friends, so history exists if they become friends later — but only **expose** it to friends.
- `wonTogether` = both on the winning side in team games; in free-for-all games count matches together only.
- Streak: consecutive IST calendar days with ≥ 1 match together; **display only, no rewards**.
- Backfill script `scripts/social/backfillFriendshipPairs.mjs` from `match_summaries` + `match_participants`, idempotent, dry-run by default.
- Replace the in-memory `sharedHistoryMap`; `GET /api/social/shared-history/:p1/:p2` reads the new table and adds `milestones[]`, keeping the existing response fields.
- Client: upgrade `SharedHistoryModal.tsx` into a **Friendship Timeline** (vertical milestone list, "Friends since", "17-day streak") — mobile sheet, desktop panel.

**Acceptance:** idempotency (same match twice → counted once), bot/local exclusion, milestone thresholds, IST day boundaries, backfill dry-run output.

### WP6 — Friends activity feed (auto-generated only)

- Event kinds (closed enum): `LEVEL_UP`, `ACHIEVEMENT_UNLOCKED`, `TOURNAMENT_WON`, `BECAME_FRIENDS`, `FRIENDSHIP_MILESTONE`. Emitted from existing server services (XP engine, achievements engine, tournament service, WP5) — never from clients.
- Table `public.activity_events (id, actor_id, kind, payload jsonb, created_at)`; payload is **server-built from closed data** (ids, numbers, enum values), never user text.
- Feed = events from accepted, non-blocked friends, newest first, cursor-paginated, `limit ≤ 30`, last 90 days.
- Reactions only (closed emoji set). No comments, no shares.
- Per-kind opt-out in Settings → Privacy ("Share my level-ups with friends"), default ON, respected at write time.
- Retention: 180 days, pruned the same way as WP4.

**Acceptance:** tests for friend-only visibility, block filtering, opt-out, pagination, retention.

---

## FORMAT — hand-back report (end of every WP)

Stop after each WP and output exactly this:

```
## WP<n> hand-back
### Files changed
- path — one line why
### Migrations
- file — tables/columns, RLS statement
### Wire changes
- new routes / socket events + payload types
### Callers checked (R1.5)
- symbol → every caller found
### Authorization matrix (R3.1)
| route/event | anon | self | friend | non-friend | blocked | third party | test name |
### Security test matrix (R10.2)
- per route/event: which of the 9 cases are covered, by test name
### Rate limits added (R5.2)
- action → limit → test name
### Rulebook self-check
- R1–R11: pass / fail / N/A for each, with one line of evidence each (fail = explain; don't hand back with a known fail)
### Verification (only what you actually ran)
- [x] npm run typecheck        → result
- [x] npm run test:server      → N/N passing
- [x] npm run test:client      → N/N passing
- [x] npm --prefix client run build → result (and bundle gate)
- [x] Coverage for new server files → %
- [x] Browser: two accounts in two browsers; what you did at 375 px and 1440 px, light and dark theme, what you observed, console errors
- [ ] anything not verified + why
### Privacy
- new data stored, who can see it, where export/erasure handles it
### Known gaps / questions for audit
### Suggested commit message (one line, conventional commits)
```

Put `Requested by: Kethan Kumar <kethankumargontla@gmail.com>` in the suggested commit message body. **Never** add a `Co-Authored-By` line.

## CONSTRAINTS (hard — summary; the Rulebook above is the full, binding version)

1. Server-authoritative: the actor is always `callerId(req)` / the socket's verified identity. Any body or payload field naming the actor is a bug.
2. Validate every client-sent value against a closed set or strict length/charset; drop or 400, never echo raw.
3. No new third-party services, SDKs or storage buckets. No `@supabase/supabase-js` on the server.
4. No changes to the economy, wallet, ledger, cosmetics or Mandali coin flows.
5. Never edit an applied migration; never weaken existing RLS.
6. Do not touch unrelated files.
7. Existing tests stay green; no `.skip`, no deleted tests.
8. Do not commit or push.

---

## MASTER CHECKLIST

**Before starting**
- [ ] User has committed or stashed the current uncommitted Mandali / sign-out work on `main`
- [ ] `feat/social-graph-v1` created from up-to-date `main`
- [ ] Baseline recorded: `npm run typecheck`, `npm test` results before any change

**WP0 — lifecycle**
- [ ] Unfriend persists (survives rehydrate) — test
- [ ] One friend graph; `RecentPlayersService` delegates — test
- [ ] Cancel outgoing request + `CANCELLED` status migration — test
- [ ] Mutual request auto-accepts — test
- [ ] Request TTL 30 days — test
- [ ] Client: cancel button, unfriend confirmation
- [ ] Claude audit passed

**WP1 — block/report**
- [ ] `player_blocks`, `player_reports` migrations with RLS
- [ ] Block atomically removes friendship, requests, party invites — test
- [ ] Enforced at friend request, party invite, DM, presence, feed, targeted room invite — test each
- [ ] Generic error to the blocked party (no disclosure) — test
- [ ] Report route rate-limited
- [ ] Client: block/report menu, Blocked players list with unblock
- [ ] Export + erasure include the block list
- [ ] Claude audit passed

**WP2 — categories/nicknames**
- [ ] Migration on `friends` (category, nickname, is_favourite)
- [ ] Validation + ownership tests; nickname never leaks to the other user
- [ ] Client: category chips, nickname display, favourites pinned, both layouts
- [ ] Export + erasure + privacy notice updated
- [ ] Claude audit passed

**Every WP — gate before hand-back** (repeat for each package)
- [ ] Rulebook self-check R1–R11 filled in, no known fail
- [ ] Authorization matrix + security test matrix complete
- [ ] Rate limits from R5.2 that apply to this WP are in `limits.ts` with tests
- [ ] New tables: RLS on, player-id FKs `ON DELETE CASCADE`, check constraints, indexes
- [ ] Mutation → rehydrate round-trip test for every new durable write
- [ ] No private-to-owner data in any other user's response/event (test)
- [ ] No actor fields in any payload type (grep evidence in hand-back)
- [ ] Privacy line items (R7.2) listed; no new client storage of social data
- [ ] Both layouts, both themes, two-account browser check

**WP3.0 — socket identity**
- [ ] `session:authenticate` verified via `resolvePlayerIdentity`, identity on `socket.data`
- [ ] `user:<id>` room join/leave incl. identity switch and sign-out — tests
- [ ] `requireSocketIdentity` used by every social handler; unauthenticated rejected — test
- [ ] Client authenticates on connect/reconnect through `getSocket()`
- [ ] `room:*` / `game:*` and Mandali behaviour unchanged (existing tests green)
- [ ] Claude audit passed

**WP3 — presence v2**
- [ ] Derivation from sockets/rooms/tournaments/parties — test table
- [ ] AUTO / DND / INVISIBLE preference persisted
- [ ] `presence:update` typed + registered in `sockets/index.ts`, friends-only, block-filtered, throttled
- [ ] Free-text `activityDetail` removed; no room codes in presence
- [ ] Client polling removed; two-browser check done
- [ ] Claude audit passed

**WP4 — direct messages**
- [ ] DM tables + RLS
- [ ] Friends-only, not-blocked, verified sender — tests
- [ ] Rate + length limits — tests
- [ ] Retention prune + deleted-text erasure — test
- [ ] Reactions from the closed set
- [ ] Client: thread list, thread view, unread badge, report message, both layouts
- [ ] Claude audit passed

**WP5 — shared history/timeline**
- [ ] `friendship_pairs`, `friendship_milestones` migrations
- [ ] Recorded from the match-finish path, idempotent on `matchId` — test
- [ ] Bots and pass-and-play locals excluded — test
- [ ] Milestones + IST streak — tests
- [ ] Backfill script, dry-run default, dry-run output attached
- [ ] Shared-history route backward compatible + milestones
- [ ] Client: Friendship Timeline, both layouts
- [ ] Claude audit passed

**WP6 — activity feed**
- [ ] `activity_events` migration
- [ ] Emitted from server services only; payload is closed data — test
- [ ] Friends-only, block-filtered, paginated, 90-day window — tests
- [ ] Per-kind opt-out respected at write time — test
- [ ] Reactions only; 180-day retention prune
- [ ] Client feed in Social Hub, both layouts
- [ ] Claude audit passed

**Release**
- [ ] `npm run typecheck && npm test && npm run build` clean at repo root
- [ ] `npm run verify:persistence` against staging after migrations are applied
- [ ] Privacy notice + `dataInventory.ts` + export reviewed end to end
- [ ] AGENTS.md updated (§3 structure, §9 state, §11 new socket events, §18 rules for blocks/DMs/presence)
- [ ] Final full-branch Claude audit
