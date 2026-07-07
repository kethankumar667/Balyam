# Multiplayer Games Hub — 10-Year Roadmap (2026-2036)

> A living document. Update when phases ship or priorities shift.
> Last revised: 2026-05-29.

## Vision

A long-running, friend-and-family-first multiplayer game hub that grows with its
users. Optimised for trust (people you actually know) and for low operational
overhead. Designed so that a one-person team can keep it alive indefinitely,
while leaving room to scale or even open it up to strangers later if desired.

**Always-true principles:**
1. **Have fun, ship often.** Friends > strangers. Working game > polished UI.
2. **Server is the source of truth.** Anti-cheat by default; no client trust.
3. **Each game is a plugin.** New game = new folder, not a rewrite.
4. **Boring tech.** Pick stable, well-documented tools. Avoid hype-driven choices.
5. **Document the why.** Decisions, not implementations, are the long-lived
   artefact. Write ADRs (Architecture Decision Records) for anything non-obvious.
6. **One escape hatch per dependency.** No hard lock-in to a single vendor.

---

## Architecture principles (stable for the life of the project)

### Code structure
```
MultiplayerGames/
├── client/                  # React UI (stays in JS/TS)
├── server/                  # Node + WebSocket runtime
│   └── src/games/<game>/    # Each game = self-contained engine + tests
├── shared/                  # Cross-runtime types (never imports from client/server)
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   ├── runbooks/            # Operational procedures
│   └── ROADMAP.md           # This file
└── infra/                   # Deployment configs, monitoring, scripts
```

### Game-engine contract
Every game implements the same `GameEngine` interface:
- `init(players)`, `applyMove(move)`, `getStateFor(playerId)`, `isOver()`, `removePlayer(id)`.

This contract **must not break** without a versioned migration. Add new optional
fields; deprecate slowly. The contract is the single most important interface
in the project.

### Storage abstraction (add early — Year 1)
Introduce a `Repository<T>` pattern over the database so MongoDB can be swapped
for Postgres (or whatever) later without rewriting feature code. Every persisted
type (`User`, `GameHistory`, `Room`, `FriendLink`) gets its own repo with
`find`, `save`, `delete`, `query` methods only.

### API versioning (add by Phase B)
- REST endpoints under `/api/v1/...`, WebSocket events namespaced
  (`v1:room:join`, etc.).
- Old versions stay alive for at least 12 months after a new one ships.
- Clients send a version header; server returns clear "upgrade required"
  responses on mismatch.

### Multi-region / sharding readiness (design for, don't build yet)
- Game state lives in Redis (not in Node process) by Year 3-4.
- Rooms are keyed by short code — codes are partitionable.
- Voice (WebRTC mesh) caps at ~6 peers; switch to an SFU (mediasoup) only when
  rooms regularly exceed that.

---

## Phase roadmap

### Phase A — Foundation **(now → Q4 2026)**
**Goal: friends can play 5 games online, sounds + animation are polished.**

- [x] Server + client scaffold, room codes, text chat
- [x] WebRTC voice (mesh, peer-to-peer)
- [x] RPS, Rummy (points), Ludo (with Mandatory Capture)
- [x] Color picker, dice + token animation
- [ ] Snakes & Ladders engine + UI
- [ ] Hand Cricket engine + UI
- [ ] Deploy: Vercel (client) + Render (server) + free MongoDB Atlas
- [ ] Custom domain + HTTPS
- [ ] Basic Sentry error reporting

**Exit criteria:** Family/friends use it weekly without me babysitting it.

### Phase B — Stability **(Q1-Q2 2027)**
**Goal: the app survives my absence. Reliable enough to recommend to non-friends.**

- Persistent rooms (rooms survive server restart — store in Redis or DB)
- Optional accounts: email or Google sign-in, JWT
- Guest mode preserved as default
- Game history per user (last 50 games)
- Reconnect / resume mid-game across server restarts
- Structured logging (pino or similar) + log aggregation
- CI: GitHub Actions running typecheck + tests on every PR
- E2E tests (Playwright) for full join → play → win flow on every game
- Runbook: how to restart, restore from backup, escalate alerts
- Automated nightly database backups
- Rate limiting on all socket events (per IP + per account)
- First ADRs written: `001-storage-choice.md`, `002-auth-choice.md`,
  `003-state-store.md`

**Exit criteria:** I can take a 2-week vacation and the app keeps running.

### Phase C — Polish & Mobile **(Q3 2027 → Q2 2028)**
**Goal: feels like a real app on phones, not just a web page.**

- Responsive layouts for phones (currently desktop-first)
- PWA: installable, offline lobby, push notifications for turn reminders
- AI bots for any game (basic heuristic for now — pick winning move if available)
- Animation speed setting + accessibility audit (color-blind safe, screen-reader)
- Internationalization framework (next-intl or similar) + English + Hindi
- Player profile page: avatar, stats, recent games
- Last-move history strip on each game
- Settings persistence (sound, animation speed, theme)

### Phase D — Social & Community **(Q3 2028 → Q4 2029)**
**Goal: people come back because of who's there, not just what's there.**

- Friends list (mutual add via username or invite link)
- Private rooms with reusable codes (no need to share a fresh code each time)
- Online presence ("Sri Krishna is in a Ludo lobby — join")
- Achievements / badges (per-game and cross-game)
- ELO-style ratings per game
- Daily / weekly challenges
- Spectator mode (read-only state stream)
- Game replay (record move log, play back)
- Quick-chat presets + emoji reactions
- Group voice rooms separate from game rooms

### Phase E — Scale & Robustness **(2030-2031)**
**Goal: handle thousands of concurrent users without rewriting.**

- Move game state from Node memory to Redis Cluster (planned for since Phase B)
- Sticky sessions or stateless WS workers behind a load balancer
- CDN for static assets (Cloudflare in front of Vercel)
- Self-hosted Coturn (TURN server) for voice — leave SaaS behind
- SFU (mediasoup) for voice rooms > 6 peers
- Async games (multi-day Rummy / chess-style turn-by-turn)
- Anti-abuse: shadow bans, IP+device fingerprint, captcha on signup
- Public read-only API + status page
- Multi-region deployment (US, EU, India)

### Phase F — Platform & Ecosystem **(2032-2036)**
**Goal: outlast the original code. Become a platform, not just an app.**

- Open game-engine SDK so others can add games (3rd-party or community)
- Native mobile shell (likely React Native or just PWA — decide at the time
  based on what's still alive)
- Tournament framework: brackets, prizes, calendar integration
- Twitch / YouTube integration for streamers (overlay, chat-to-game bridge)
- Possible commercialisation paths (cosmetic themes, hosted private leagues,
  ad-free tier) — never pay-to-win
- Self-hosted "Family Server" option for groups who want full data control
- Migration plan if React / Node ever become non-viable

---

## Decision records to write up front (before Phase B)

Each ADR is 1-2 pages: context, decision, alternatives considered, consequences.

| # | Title | When |
|---|---|---|
| 001 | Storage choice (MongoDB vs Postgres) | Phase B start |
| 002 | Auth strategy (JWT + optional providers) | Phase B start |
| 003 | State store (in-process vs Redis) | Phase B start |
| 004 | Voice topology (mesh vs SFU vs SaaS) | Phase E start |
| 005 | Frontend rendering (CSR vs SSR vs RSC) | Phase C start |
| 006 | Mobile strategy (PWA vs React Native) | Phase F start |

---

## Top risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Burnout** (solo project) | High | Project dies | Hard cap of 2 nights/week. Don't promise dates to anyone. Take 1-month breaks guilt-free. Phase exits are natural pause points. |
| **In-memory state can't scale** | Certain by Phase E | App crashes under load | Plan for Redis from Phase B. Don't refactor until needed, but write code that can migrate. |
| **WebRTC mesh hits 6-peer limit** | Medium | Voice unusable for large groups | SFU migration path planned for Phase E. Cap room sizes meanwhile. |
| **MongoDB → Postgres regret** | Medium | Painful migration | Repository abstraction from Phase B keeps it survivable. |
| **Free tiers stop being free** | High (over 10 yr) | Hosting bill spikes | Track costs monthly. Always have a self-host fallback documented (Phase F). |
| **Browser API churn** (WebRTC, etc.) | Medium | Voice breaks unexpectedly | Browser-compat tests in CI by Phase B. Stick to widely-supported APIs. |
| **Dependency rot** (npm packages abandoned) | Certain | Security CVEs | Dependabot from Phase B. Prefer dependencies with > 1M weekly downloads. |
| **Friend group changes** | Certain | Motivation drops | Build for a wider audience by Phase C so the app has reason to live beyond the original group. |
| **Cheating / abuse** | High past Phase D | Trust collapses | Server-authoritative state from day 1 (already done). Rate limits, fingerprinting, shadow bans by Phase E. |

---

## Cost projection

Order-of-magnitude only. Numbers are USD/month.

| Phase | Hosting | DB | Voice infra | Total |
|---|---|---|---|---|
| A (now) | $0 (Render/Vercel free) | $0 (Atlas free) | $0 (Google STUN) | **~$0** |
| B | $7 (Render Starter) | $0-5 | $0 (Metered TURN free tier) | **~$10** |
| C | $20 (paid tiers) | $9 (Atlas M2) | $5 (TURN) | **~$35** |
| D | $50 | $20 | $25 | **~$95** |
| E | $300+ (multi-region, Redis Cluster) | $100+ | $50+ (self-host Coturn) | **~$500+** |
| F | depends on monetisation | | | varies |

**Rule:** if hosting cost exceeds project revenue (including emotional revenue),
re-evaluate. Self-host fallback is always available.

---

## What to NOT do

These are tempting and will eat months for little gain:

- **Custom framework / engine.** Use React, Node, Postgres, Redis. No bespoke
  reactivity. No homegrown ORM.
- **Microservices before Phase E.** A monolith is fine for years. Split only
  when a clear pain point demands it.
- **Crypto / web3 / blockchain.** Not in this project.
- **Heavy 3D engine.** 2D + clever CSS gets you 95% of the perceived polish
  for 5% of the work.
- **Real-money gambling.** Legal nightmare. Skill-only or play-money only.
- **Custom voice codec / DSP.** WebRTC handles this.
- **Building two big features in parallel.** Always finish one before starting
  another. Phase exits are the only multi-feature commit point.

---

## How to add a new game (operational handbook entry)

1. Create `server/src/games/<game>/`:
   - `<Game>Engine.ts` implementing `GameEngine`
   - `__tests__/engine.test.ts` with **at minimum** init, every move type,
     win condition, illegal-move rejection
2. Register in `server/src/games/registry.ts`.
3. Add types to `shared/types.ts` (state shape, move payloads).
4. Create `client/src/games/<game>/`:
   - `<Game>Board.tsx`
   - Sub-components as needed
5. Wire into `Lobby.tsx` (enable the option) and `Room.tsx` (route by game kind).
6. Update `README.md` Current Status section.
7. Add an entry to this roadmap if the game is non-trivial.

**Code review checklist for a new game:**
- [ ] Server-authoritative — no client computes win condition
- [ ] Engine handles disconnect (`removePlayer`)
- [ ] State is serialisable (no `Map`, `Set`, `Date` objects in transit)
- [ ] All moves validated with explicit error messages
- [ ] Unit tests for every public engine method
- [ ] Move payloads are versioned-friendly (additive fields only)

---

## How to make a breaking change (operational handbook entry)

1. Ship the new version of the API/contract under a new namespace
   (`v2:room:join`).
2. Keep the old version working.
3. Update the client to use the new version, feature-flagged.
4. Roll out to 100% of clients.
5. Wait at least 30 days.
6. Remove the old version, write an ADR documenting why.

This is slow. That's the point.

---

## Maintenance cadence

| Frequency | Activity |
|---|---|
| Per commit | Typecheck + unit tests in CI |
| Per release | Manual playthrough of every game (smoke test) |
| Weekly | Dependabot review + apply security patches |
| Monthly | Cost review, error rate review, write at least one ADR if any decision was made |
| Quarterly | Re-read this roadmap, update phases if drifting |
| Yearly | Read the README from a newcomer's perspective. Anything confusing → fix it. |

---

## Signals that we should pivot or pause

- Nobody has played in 30 days
- Hosting costs exceed budget for two months running
- Three consecutive quarters with no merged PRs
- A foundational dependency has a critical CVE with no upstream fix
- The original group of friends stops playing AND no replacement audience emerges

Any of these → step back, re-evaluate, possibly archive or open-source the
project rather than letting it rot in private.
