# P0-2 — Player-scoped API authorization

Status: **CLOSED** for authorization. Durability of what is now protected is
P0-3.
Baseline: `docs/remediation/P0-00-BASELINE.md` §4.

---

## 1. Original exploit

Six routers read a player id out of the URL path or the JSON body and used it
as the caller's identity. No credential was required anywhere. Recorded against
a live server:

```
PUT  /api/profile/victim_user                      -> 200  {"displayName":"PWNED"}
POST /api/ranking/friends/victim_user              -> 200  {"success":true}
POST /api/social/requests/send                     -> 200  friend request sent AS victim_user
POST /api/parties/create                           -> 200  party created with leaderId=victim_user
POST /api/parties/player/victim_user/leave         -> 200
GET  /api/profile/victim_user/matches              -> 200  another player's match history
GET  /api/seasons/player/victim_user               -> 200
POST /api/seasons/player/victim_user/claim/tier_1  -> 400  (failed on the TIER id, not on identity)
POST /api/tournaments/t1/start                     -> 400  (failed on the TOURNAMENT id, not on identity)
```

The two `400`s were the dangerous ones to misread: neither was an authorization
decision. With a real tier or tournament id they would have succeeded against
another account.

`PUT /api/profile/victim_user` returned the mutated record — confirmed again
under `NODE_ENV=production`.

Two more things the same finding covers:

- **`GET /api/profile/:playerId` was a write.** It called `getOrCreateProfile`,
  so an anonymous read of an unknown id created it. A loop over invented ids
  filled the profile table.
- **The client had no stable identity either.** Every page derived
  `userId || localStorage.getItem("mpg.playerId") || "guest_player_1"`. That
  last fallback meant every guest who had never joined a room shared **one**
  profile, friends list and reward ledger. `SocialHubPage` invented a second,
  undeclared scheme (`bhalyam.guest_player_id`) that the DPDP erase control
  could not reach.

---

## 2. Files changed

| File | Change |
|---|---|
| `server/src/auth/identity.ts` | **new** — one middleware, the guards, `callerId()` |
| `server/src/auth/guestToken.ts` | **new** — signed guest identities |
| `server/src/auth/AuthController.ts` | **new** — `POST /api/auth/guest`, `GET /api/auth/me` |
| `server/src/index.ts` | `attachPlayerIdentity` mounted globally before every router; auth router mounted; boot warning on guest-token durability |
| `server/src/profile/ProfileController.ts` | public/private split; guards; `callerId` |
| `server/src/ranking/RankingController.ts` | ditto |
| `server/src/tournaments/TournamentController.ts` | ditto, plus an admin tier |
| `server/src/social/SocialController.ts` | ditto, plus record-ownership lookups |
| `server/src/party/PartyController.ts` | ditto, plus party-membership checks |
| `server/src/profile/ProfileService.ts` | `getProfile()` — a read that does not create |
| `server/src/social/FriendRequestsService.ts` | `getRequest()` for the ownership check |
| `server/src/party/PartyService.ts` | `getInvitation()` for the ownership check |
| `client/src/lib/playerIdentity.ts` | **new** — credential acquisition, `apiFetch`, `usePlayerId` |
| `client/src/lib/privacy/dataInventory.ts` | three guest keys declared (DPDP) |
| `client/src/pages/{Profile,Leaderboard,Tournaments,SocialHub}Page.tsx` | every call via `apiFetch`; identity from the credential |
| `server/src/auth/__tests__/playerAuthorization.test.ts` | **new** — 37 tests |

---

## 3. Security boundary introduced

One chain, in one direction:

```
credential  →  verified server-side
            →  identity read from the VERIFIED claims
            →  ownership or role checked against that identity
            →  operation executed
```

A path or body `playerId` is now an **argument** — a thing being named — and
never evidence of who is naming it. Handlers read `req.player`, which no
request can set.

### Two identities

- **member** — Supabase session verified by `lib/supabaseAuth.ts` (signature,
  `exp`, `iss`, `aud`; forged `alg` rejected). Identity is the `sub` claim.
- **guest** — `POST /api/auth/guest` mints `guest_<128 bits>` **server-side**
  and returns an HMAC-signed token for it.

The server choosing the guest id is the whole mechanism. If the caller could
name the id it wanted a token for, an attacker would ask for `victim_user` and
every ownership check downstream would wave them through. The endpoint takes no
input at all — verified: posting `{"playerId":"bob-…"}` returns a different,
server-chosen id.

`guest_` is a namespace that cannot collide with a Supabase UUID, so no
ownership check can be satisfied across the two kinds by accident.

### Guest gameplay is preserved, and tested

A guest can read and write their own profile, challenges, friends, season
stats, parties and presence — everything a member can do for themselves. What a
guest cannot do is **be someone else**, which was never a guest feature.

### Every endpoint, audited individually

**PUBLIC** (no guard, and each says so at its definition):
`GET /api/ranking/leaderboard`, `GET /api/ranking/rank/:playerId`,
`GET /api/profile/:playerId`, `GET /api/profile/:playerId/stats`,
`GET /api/tournaments`, `GET /api/tournaments/:id`,
`GET /api/tournaments/:id/bracket`, `GET /api/seasons/current`,
`GET /api/seasons/leaderboard`.

Gating these would be a product change wearing a fix's clothes: a leaderboard
that needs a credential per row is not a leaderboard.

**SELF-ONLY** (`requireSelfParam()`): profile write, match history, match
detail, achievements, challenges, challenge claim, recent players, ranking
friends (read/add/remove), tournament history, season stats, season claim,
social friends (read/remove), friend requests list, presence write, party read,
party ready/target/leave/disband.

**IDENTITY, ID FROM THE SESSION** (`requireIdentity`, body id ignored):
tournament register, tournament check-in, friend request send, party create,
presence query.

**RECORD OWNERSHIP** (look the record up, then compare): friend request
accept/decline — caller must be the recipient; party invitation accept/decline
— caller must be the invitee; party invite — caller must be a member of that
party.

**PARTICIPANT** (`requireParticipantParams`): `GET /api/social/shared-history/:p1/:p2`
— a head-to-head history belongs to both players and to nobody else.

**ADMIN** (`requireTournamentAdmin`): `POST /api/tournaments/:id/start`,
`POST /api/tournaments/:id/match`. Both decide who advances and who is
eliminated, and both were open to anyone with the URL. There is no organiser
role in the model — every seeded tournament carries `createdBy: "system"` — so
these reuse the deployment's existing operational admin boundary rather than
inventing a second one that could disagree with it.

**Read-that-writes closed**: `GET /api/profile/:playerId` now creates a row only
when the caller *is* the named player.

---

## 4. Automated tests added

`server/src/auth/__tests__/playerAuthorization.test.ts` — **37 tests, all real
HTTP against the real routers with the real middleware.**

| Required negative case | Covered by |
|---|---|
| Missing token | 22 private routes each asserted 401; 5 body-identity routes asserted 401 |
| Invalid token | wrong signing key; `alg: none`; 7 shapes of garbage (none produce a 500) |
| Expired token | `exp` two hours in the past |
| User A modifying User B | all 22 private routes asserted 403 as Alice against Bob; profile rename asserted **unchanged afterwards** |
| Tournament action without permission | anonymous start 403; ordinary player start 403; ordinary player match-report 403; ops key admitted; allowlisted admin admitted |
| Friend/party action with a forged id | request `senderId` overridden to the caller; accept/decline by a non-recipient 403; party `leaderId` overridden; invite from a non-member 403; invitation accept by a non-invitee 403; stranger cannot eject someone from their party |
| Reward claim for another account | season claim 403; challenge claim 403; both 401 anonymously |

Plus: public reads still 200 anonymously; no profile created for an unowned id;
guest id is server-chosen; two guests differ; a guest can do everything for
themselves; guest-vs-guest 403; guest-vs-member 403; tampered payload 401;
re-signed with a different key 401; `/api/auth/me` for both kinds and 401
without.

```
Test Files  1 passed (1)     Tests  37 passed (37)
```

Full suites after the change: server **94 files / 769 tests**, client
**57 files / 460 tests** — both green.

---

## 5. Manual HTTP verification

Real server, `NODE_ENV=production`. Full transcript:
`scratchpad/verify/p2-http-verification.txt`.

**The baseline exploits, replayed anonymously:**

```
PUT  /api/profile/<victim>              (was 200 PWNED) -> 401
POST /api/ranking/friends/<victim>      (was 200)       -> 401
POST /api/social/requests/send          (was 200)       -> 401
POST /api/parties/create                (was 200)       -> 401
POST /api/parties/player/<victim>/leave (was 200)       -> 401
GET  /api/profile/<victim>/matches      (was 200)       -> 401
POST /api/seasons/player/<v>/claim/t1   (was 400)       -> 401
POST /api/tournaments/t1/start          (was 400)       -> 403
```

**Alice, signed in, acting on Bob:**

```
PUT  /api/profile/<bob>                 -> 403  {"error":"Forbidden","message":"That is not your record."}
GET  /api/profile/<bob>/matches         -> 403
POST /api/seasons/player/<bob>/claim/t1 -> 403
POST /api/parties/player/<bob>/leave    -> 403
```

**Alice acting on Alice:**

```
PUT /api/profile/<alice>  -> 200  {"profile":{"playerId":"alice-…","displayName":"Alice", …}}
GET /api/profile/<alice>/matches -> 200
GET /api/auth/me          -> 200  {"player":{"kind":"member","playerId":"alice-…"}}
```

**Public reads unaffected:** leaderboard, tournaments, current season — all 200
anonymously.

**Guest identity:**

```
guest 1 id: guest_49ddb9133f0aeedaaa80293fdc68f431
guest 2 id: guest_8769ce3b6316ad977f1d953a272da056
server-chosen, and the two differ  -> YES
POST /api/auth/guest asking for a chosen id -> 201, and a DIFFERENT id came back
guest 1 edits their OWN profile      -> 200
guest 1 reads their OWN challenges   -> 200
guest 1 creates a party              -> 200
guest 1 edits GUEST 2's profile      -> 403
guest 1 edits a MEMBER's profile     -> 403
tampered guest token                 -> 401
GET /api/auth/me as guest 1          -> 200 {"player":{"kind":"guest","playerId":"guest_49dd…"}}
```

---

## 6. Restart / persistence verification

**Not claimed, because it is not true yet.** Every service behind these routes
is still a process-local `Map`. Authorization is now correct; what it protects
still evaporates on restart. That is P0-3, and no persistence claim is made
here.

One consequence worth naming: without `SESSION_SECRET`, guest tokens are signed
with a per-process key, so a restart signs every guest out. The server warns
about this at boot (`guestTokenDurability()`), and it becomes a genuine data
problem — rather than a cosmetic one — the moment progression is durable.

---

## 7. Regression risks

1. **Any HTTP client that did not send a credential now gets 401/403.** All
   in-repo callers were updated; a third-party integration would break.
2. **Guest progression is not carried across sign-in.** A guest who signs up
   starts fresh under their Supabase id. There is nowhere durable to carry it
   from (P0-3), and merging ids client-side would be worse than being explicit.
   Stated in `client/src/lib/playerIdentity.ts`.
3. **`GET /api/profile/:playerId` returns 404 for a stranger's unknown id**
   where it used to return a freshly-created empty profile.
4. **Tournament start/report now need an admin credential.** If the product
   intended players to self-report results, that is a design decision to make
   deliberately — the current answer is the conservative one.
5. **Room-path player ids and API identity remain separate**, and this change
   does not alter that. `RoomManager` mints an ephemeral `p_<epoch>_<random>`
   per room create/join; the API answers to the stable identity above. Their
   disconnection is **pre-existing** — it is why the profile screen showed so
   little — and joining them is persistence work, not authorization work.
   Realtime room behaviour is untouched, as required.

---

## 8. Rollback procedure

| To undo | Do |
|---|---|
| Everything, server side | remove `app.use(attachPlayerIdentity)` and the auth router from `server/src/index.ts`, then `git checkout -- server/src/{profile,ranking,tournaments,social,party}/*Controller.ts` |
| One router only | `git checkout -- server/src/<area>/<X>Controller.ts` — each is independent |
| Client only | `git checkout -- client/src/pages/{Profile,Leaderboard,Tournaments,SocialHub}Page.tsx`; delete `client/src/lib/playerIdentity.ts` |
| A stuck guest identity | `localStorage.removeItem("bhalyam.guest.id" / ".token" / ".expires")`, or the app's own erase-my-data control, which now covers them |

No schema, no migration, no data step.

---

## 9. Residual limitations

1. **Everything protected here is still in memory.** Authorization without
   durability means a restart resets the reward ledger, so "already claimed" is
   only true until the next deploy. P0-3.
2. **`POST /api/auth/guest` is unauthenticated and unthrottled.** It allocates
   nothing server-side (the token is derived, not stored), so it is cheap
   today. It stops being cheap when guest identities become rows — noted in the
   handler.
3. **Tournament administration is the operational credential.** Reusing one
   admin boundary is deliberate, but it means a tournament organiser needs a
   deployment secret. A real organiser role belongs on `Tournament.createdBy`.
4. **Match results are still self-declared inputs.** Restricting who may write
   them is not the same as observing them. The durable answer is room outcomes
   feeding tournaments directly.
5. **Display names remain caller-chosen.** `senderName`, `leaderName`,
   `displayName` are presentation, not identity; impersonation by display name
   is a moderation problem, not an authorization one.
6. **No CSRF token.** The API is bearer-token authenticated with no cookie
   credential, so a cross-site request cannot borrow ambient authority — but
   this must stay true if cookie auth is ever added.
