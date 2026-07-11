# UNO Game Plan — Bhalyam

**Status:** Draft v1.0 · Master implementation plan · Single source of truth for UNO development
**Product:** Bhalyam — a notebook/nostalgia-themed, room-code, no-login multiplayer casual games platform
**Scope of this document:** Everything a developer needs to take UNO from its current state to a complete, polished, official-rules-complete game inside Bhalyam, without further planning.

---

## 0. Document Control

### 0.1 Source inputs analyzed
| Source | What it is |
|---|---|
| `volume1.md` – `volume8.md` | Product Vision, GDD, UX & Player Journey, Official Rulebook, Engagement & Retention, Competitive/Ranking, Community/Moderation, Interaction/Animation — an aspirational, AAA-live-service-style vision for "UNO Reimagined" |
| `uno-plan-of-action.md` | Existing phase roadmap (Phase A–L) mapping the volumes to execution phases against the current codebase |
| `server/src/games/uno/UnoEngine.ts` | The actual, running, server-authoritative UNO rule engine |
| `client/src/games/uno/**` | The actual, running client implementation (boards, shared UI, deal animation, room rail, deck/validation helpers) |
| `shared/types.ts` | Wire contracts (`UnoCard`, `UnoPublicState`, `UnoPlayerState`, `Player`, sibling games' `*GameOptions` pattern) |
| `client/src/pages/Room.tsx`, `server/src/games/registry.ts`, `server/src/games/GameEngine.ts` | App-wide routing/orchestration UNO plugs into |
| `client/src/index.css`, `client/src/assets/illustrations.ts` | The notebook design system and illustration token map |
| Rummy, Hand Cricket, Ludo implementations | Precedent for cross-game architecture conventions (options pattern, board-shell split, room rail, deal animation, reconnection) |

### 0.2 Relationship to `uno-plan-of-action.md`
That document is the **execution roadmap** (12 phases, dependency graph, workstreams, risks). This document is the **product + design + engineering reference** the roadmap's phases are built against — screens, components, state shapes, rules matrix, and task breakdowns. Read them together: this doc answers *"what exactly do I build"*, the roadmap answers *"in what order and why."* Phase labels (Phase A, B, C…) used below refer to that same roadmap so the two stay in lock-step.

### 0.3 The single most important scoping fact
Bhalyam has **no accounts, no login, no persistence layer, and no matchmaking queue anywhere in the codebase today.** `Player` (`shared/types.ts:3`) is a purely ephemeral, room-scoped record (`id`, `name`, `isHost`, `isReady`, `isConnected`, `awayUntil`, `isBot`, `isLocal`) — there is no XP, coins, rank, season, friends list, or leaderboard *for any game*, not just UNO. Every match is created by a host via a room code (`RoomManager` / `codeGenerator`) and every seat is either a real socket, a bot (`isBot`), or a pass-and-play local player (`isLocal`).

Volumes 1, 5, 6, and 7 describe a persistent-account, ranked, live-service product ("UNO Reimagined"). That vision is **valid long-term direction** but is **not buildable against the current platform** without first building accounts, persistence, and matchmaking — platform-level work that is out of scope for "the UNO game" and belongs to Bhalyam as a whole. This plan is explicit everywhere about what is:

- 🟢 **Buildable now** — fits the current room-code, ephemeral, server-authoritative architecture.
- 🟡 **Gap in the current UNO implementation** — real, working code exists but doesn't yet satisfy the rulebook/UX volumes.
- 🔴 **Deferred / platform-level** — requires infrastructure that doesn't exist for *any* game yet (accounts, persistence, matchmaking, moderation backend). Tracked in roadmap Phases G–L, not detailed here beyond scope notes.

---

## 1. Executive Summary

UNO is a shed-your-hand card game already **partially implemented and playable** inside Bhalyam: a real 108-card deck, a server-authoritative turn engine, desktop and mobile boards with hand-drawn-quality SVG card art, a shuffle-and-deal opening animation, a persistent chat/voice/players/score rail, bot opponents, and a tutorial. It sits alongside Rummy, Ludo, Snakes & Ladders, Hand Cricket, RPS, Word Building, Dots & Boxes, Memory Match, and Star Game as one of Bhalyam's room-code multiplayer titles.

It fits Bhalyam's core loop perfectly: fast to teach, fast to start, no reading required, 2–8 players, short sessions, high social energy — the same shape as the platform's other hits. The **gap is depth and completeness**, not concept: the current engine plays a simplified subset of official UNO (no Wild Draw Four legality/challenge, no UNO declaration/penalty, no turn timer, no scoring), and the UI has no dedicated results screen, no house-rule options, and no reserved illustration art yet delivered.

**Target audience:** the same as the rest of Bhalyam — groups of friends/family (13+) sharing a room code on phone or desktop for a quick, social, no-signup match.

**Gameplay experience goal:** every match should feel like real UNO — cards you can *feel* matching by color and number, a genuine "OH—" moment when someone forgets to say UNO, satisfying Wild Draw Four drama, and a table that looks like it belongs on the same notebook page as Bhalyam's other games.

---

## 2. Product Vision

Bhalyam's own product identity (script "Bhalyam" wordmark, cream/paper backgrounds, hand-inked notebook illustrations, roughjs sketch textures) already **is** the "premium, alive, not-just-software" feeling Volume 1 asks for — it just needs to be true for UNO's remaining surfaces (results screen, empty/loading states, illustration art) the same way it already is for Hand Cricket and Rummy.

**Adopted, scoped-down pillars** (from Volume 1 §9, filtered to what's achievable without accounts):

| Pillar | What it means for UNO in Bhalyam today |
|---|---|
| Accessibility | Mobile + desktop shells already split; needs color-blind-safe card glyphs (already present — icon + color, not color alone), reduced-motion support (deal overlay + animations), keyboard path |
| Fairness | Server-authoritative engine (already true) — finish the rules gaps so "fair" also means "official" |
| Polish | Card art, deal animation, and turn glow already at a high bar; results screen and UNO-moment are the two remaining polish gaps |
| Social Connection | Chat/voice/players rail already shipped; reactions already shipped; rematch is generic-room, not UNO-specific yet |
| Replayability | Within a session (rematch) is buildable now; cross-session (missions, seasons) is 🔴 deferred — no persistence exists |

**Nostalgia + fun + competitive framing:** UNO in Bhalyam should read as "the deck of cards everyone actually owns" — the notebook aesthetic already does the nostalgia work; the rules engine needs to do the competitive-fairness work; the results screen needs to do the fun/celebration work.

---

## 3. Success Metrics

Because there is no account system, metrics must be **session-scoped and client/server-log derived**, not cohort/retention-derived (no D1/D7/D30 is measurable without accounts — that entire category in Volume 1 §14 and Volume 5 §32 is 🔴 deferred).

**Measurable now (server-side event logging, no new infra):**
| Metric | Why it matters | Source |
|---|---|---|
| Match completion rate (finished vs abandoned) | Core engagement signal | `RoomManager` room lifecycle events |
| Median match duration | Session-length health | `UnoEngine.init()` → `isOver()` timestamps |
| Rematch rate per room | Social stickiness, matches Volume 5 §20 | Generic `RematchPanel` usage |
| UNO-declaration success vs missed-call rate | Only once Phase B ships the mechanic | New engine event |
| Wild Draw Four challenge win/lose rate | Only once Phase B ships challenges | New engine event |
| Bot-fill usage rate | How often rooms need AI seats to reach minPlayers | `isBot` seat count at match start |
| Disconnect/reconnect rate during a match | Reliability signal, reuses generic `awayUntil` grace period | `RoomManager` |

**Deferred (needs accounts/persistence):** DAU/WAU/MAU, D1/D7/D30 retention, ranked participation, mission completion — Phase H/I/K territory.

---

## 4. Complete Rules Specification

This section is the authoritative rules matrix: **official rule → current engine behavior → verdict.** Every row cites the exact code. This *is* Phase A/B's "rule-to-behavior matrix" deliverable from the roadmap, made concrete.

### 4.1 Deck composition — 🟢 correct
`UnoEngine.createDeck()` (`UnoEngine.ts:310-339`) builds the full official 108-card deck: 4 colors × (one 0 + two each of 1–9) = 76 number cards, 4 colors × 2 each of Skip/Reverse/+2 = 24 action cards, 4 Wild + 4 Wild+4 = 8. Matches Volume 2 §9 / Volume 4 §6 exactly.

### 4.2 Deal — 🟢 correct, starting-card gap fixed (Phase 2)
7 cards/player, remaining deck becomes draw pile. **Was:** if the revealed start card was Wild, the engine silently defaulted `currentColor` to Red instead of re-drawing (Volume 4 §7, Volume 2 §10). **Now:** `init()` shuffles the Wild back into the remaining pool and draws again (bounded to 20 attempts, defensively, against a pathological all-Wild remainder) until a colored card appears — matches the official rule exactly. Locked in by two tests in `engine.test.ts` (`starting card` describe block): one asserting the discard top is never Wild/Wild+4 across 200 fresh `init()` calls, one asserting the deck's total 108-card count survives the re-draw loop.

### 4.3 Valid play — 🟢 correct, including Wild Draw Four legality (Phase 2)
`isValidPlay()` correctly matches by color, number, or symbol, and correctly requires matching the *chosen* color when the top card is a Wild. Wild/Wild+4 remain **always playable** at the matching layer — that's deliberate, not a gap (see below).

**✅ Shipped (Phase 2) — Wild Draw Four legality + challenge flow.** Official rule (Volume 4 §16): a Wild Draw Four may only be *legally* played when the player holds no card matching the current color — but official UNO never blocks the play outright at the table, since opponents can't see the hand; illegality is only enforced if challenged. `handlePlay()` now snapshots legality (`wasLegalWildFour`) before the card leaves the hand, defers the draw/turn-advance into a new `pendingChallenge` state, and the targeted player resolves it via new `challenge`/`acceptDraw` move types (`handleChallengeDecision`). Outcomes match Volume 4 §17 exactly: challenge succeeds → the player who played it draws 4, challenger keeps their turn; challenge fails → challenger draws 6 (not 4+6, a single draw of 6) and still loses their turn; no challenge → resolves as a plain accept (draws 4, loses turn), same as the old un-challenged behavior. `wasLegal` is never sent to the client — putting it on the wire would defeat the challenge's entire purpose. Covered by 6 new tests (`Wild Draw Four challenge` describe block) plus a `getTimeoutActor`/bot-auto-accept path so a stalled decision can never freeze the match. See §14.5 for the full design.

### 4.4 Card behaviors — 🟢 Skip/+2/Wild correct; Reverse had a real bug, now fixed
- **Skip** (`turnAdvance: 2`) — correct, next player loses their turn.
- **Reverse — ✅ FIXED (Foundation phase).** This entry originally read "correct in 3+ player games, needs an explicit 2-player test" — that was wrong. Writing the test uncovered a real, more serious bug: `this.state.direction` was set and broadcast to clients, but **no turn-advancement call site ever consulted it** (`turnIndex = (turnIndex + turnAdvance) % length` was always a fixed forward step, in `handlePlay`, `handlePass`'s `advanceTurn()`, and the "who draws" lookups for +2/Wild+4). Reverse flipped a cosmetic label and had **zero effect on actual turn order in any player count**. Fixed by adding a direction-aware `stepIndex()` helper that every turn-advancement site now routes through, plus an explicit 2-player Reverse-as-Skip branch (`UnoEngine.ts`). Locked in by 5 new tests in `engine.test.ts` (`action cards — turn advancement`, `Reverse in a 2-player game acts as Skip`) — all passing, full 178-test server suite green, typecheck clean.
- **Draw Two** (`turnAdvance: 2`, next player draws 2 immediately) — correct per official (no stacking by default; stacking is properly deferred to the house-rule framework, Volume 4 §29). Now also direction-aware via the same `stepIndex()` fix.
- **Wild** — correct, color choice required and enforced (`handlePlay` rejects a Wild/Wild+4 play with no `chosenColor`).
- **Wild Draw Four** — mechanically correct (`turnAdvance: 2`, next player draws 4, now direction-aware) but see §4.3 for the missing legality/challenge layer.

### 4.5 Drawing — 🟢 correct
No valid card → draw one (`handleDraw`), `drewLastTurn` guard prevents double-draw, then either play the drawn card (turn doesn't auto-advance, `handlePlay` only checks whose turn it is) or `pass` (`handlePass`, only legal after a draw). Matches Volume 4 §10 "player **may** immediately play it" (optional-play variant, correctly not force-play).

### 4.6 Draw pile exhaustion — 🟢 correct
`drawCards()` (`UnoEngine.ts:284-308`) reshuffles the discard pile (keeping the top card) into a fresh draw pile when fewer than `DRAW_PILE_SHUFFLE_THRESHOLD = 2` cards remain. Matches Volume 4 §21 exactly.

### 4.7 UNO declaration — ✅ engine-complete (Phase 2), client UI still Phase 3
The engine now has `declareUno`/`catchUno` move types (`handleDeclareUno`/`handleCatchUno`), gated by `canDeclareUno()` (hand size exactly 1, not already declared for this hand) and kept accurate across hand-size changes by `syncUnoDeclaration()` (a stale declaration must not survive a Draw Two landing on an already-declared 1-card hand, or a later return to 1 card would be wrongly treated as pre-declared). `catchUno` applies the 2-card penalty and is available to any player against any other, matching Volume 4 §18's "if another player notices first." Deliberately modeled as **advisory, not a hard timer cutoff** (§14.4's original design decision, preserved): the official rule has no clock, just "before the next player's turn begins," so `catchUno` stays legal indefinitely until either declared or the hand is played out — closer to the real rule than an arcade countdown would be. `UnoPublicState.unoDeclaredBy: string[]` exposes who has correctly declared. Bots always auto-declare instantly via `applyAutoMove` (never realistically get caught, matching the "never miss it" baseline from §15). **✅ Client UI shipped (Phase 3):** `UnoCallButton` (`uno-declare.tsx`) and a catch affordance built directly into `UnoOpponentSeat` (`uno-shared.tsx`) rather than a separate `UnoCatchPrompt` component — a pulsing "Catch! +2" button appears right on a qualifying opponent's seat, which is a lower-friction target than a modal for a mechanic about *spotting* something. No `UnoDeclareCountdownRing` — deliberately skipped, since the advisory (non-timed) design above means there is no deadline value to visualize; the pulse animation on `UnoCallButton` carries the urgency instead. See §12.

### 4.8 Turn timer — ✅ fixed (Phase 2)
`UnoPublicState.turnDeadline` now gets set for real: `UnoEngine` gained `setOptions`/`setTurnDeadline`/`clearTurnDeadline`/`getTurnTimerSeconds` (mirroring the `DotsBoxesEngine`/`MemoryMatchEngine` pattern exactly), and `RoomManager.scheduleTurnTimer`/`onTurnTimeout` gained `instanceof UnoEngine` branches — UNO previously had **zero presence** in either function (confirmed by grep before this phase). On timeout, `getTimeoutActor()` (the real turn holder, or the Wild+4 challenger if a decision is pending — deliberately **not** the same set as `pendingActors()`, which also includes anyone merely declare-eligible; auto-declaring for a human on a generic timeout would strip all risk from that mechanic) drives `applyAutoMove`. The already-built `TurnTimeWarning` component now receives a real, non-null deadline. Proven end-to-end (not just at the engine level) by `server/src/rooms/__tests__/unoTimer.test.ts`, which drives a real `RoomManager` through `startGame` with fake timers and confirms the scheduled deadline actually forces a move when it lapses.

### 4.9 Scoring — ✅ implemented (Phase 3, pulled forward from Phase D)
`awardRoundPoints(winnerId)` now runs the instant a hand empties, before `phase` flips to `"finished"`. It sums every OTHER player's remaining hand via `cardPoints()` (number = face value including 0, Skip/Reverse/+2 = 20, Wild/Wild+4 = 50 — Volume 2 §18 / Volume 4 §20 exactly) and adds the total onto `scores[winnerId]` (accumulated, not overwritten, so it stays correct if a future multi-round mode calls `init()` again without resetting). `GameOverPanel` and the rail's `ScorePanel` now show real numbers. A client-side pure mirror (`cardPoints`/`handPoints` in `helpers/scoring.ts`) exists for future display-only uses (e.g. a "your hand is worth N points" preview) but nothing consumes it yet — the server remains the sole source of truth for the actual `scores` on the wire. Covered by 3 new tests (mixed hand types, 0/Wild+4/Reverse/+2 combination, accumulation across a simulated prior round).

### 4.10 Priority order for simultaneous effects — 🟢 implicitly correct, not yet documented
The engine's sequential move handling naturally applies Volume 4 §27's priority (win check → draw penalty → skip/reverse → color selection → turn transfer) since `handlePlay` checks win before resolving the action card. No code change needed; document it explicitly in the rule contract (Phase A deliverable).

### 4.11 Rule matrix summary

| # | Rule | Volume ref | Engine status | Fix phase |
|---|---|---|---|---|
| 1 | 108-card deck | V2§9 | 🟢 | — |
| 2 | 7-card deal | V2§10 | 🟢 | — |
| 3 | Valid starting card (re-draw on Wild) | V4§7 | 🟢 **fixed** — re-draws until non-Wild, see §4.2 | ~~A/B~~ done |
| 4 | Color/number/symbol match | V4§9 | 🟢 | — |
| 5 | Skip | V4§12 | 🟢 | — |
| 6 | Reverse (incl. 2-player = Skip) | V4§13 | 🟢 **fixed** — was silently cosmetic-only in all player counts, see §4.4 | ~~B~~ done |
| 7 | Draw Two | V4§14 | 🟢 | — |
| 8 | Wild | V4§15 | 🟢 | — |
| 9 | Wild Draw Four legality | V4§16 | 🟢 **fixed** — legality snapshotted, enforced only if challenged, see §4.3 | ~~B~~ done |
| 10 | Wild Draw Four challenge | V4§17 | 🟢 **fixed** — full challenge/accept state machine, see §4.3/§14.5 | ~~B~~ done |
| 11 | UNO declaration + penalty | V4§18 | 🟢 engine-complete, client UI pending (Phase 3), see §4.7 | ~~B~~ engine done |
| 12 | Draw-pile reshuffle | V4§21 | 🟢 | — |
| 13 | Turn timer + timeout auto-draw | V4§22 | 🟢 **fixed** — RoomManager wiring shipped, see §4.8 | ~~B~~ done |
| 14 | Disconnect grace period | V4§23 | 🟢 generic `awayUntil`, not UNO-specific | — |
| 15 | Scoring | V4§20 | 🟢 **fixed** — pulled forward into Phase 3, see §4.9 | ~~D~~ done |
| 16 | House rules (stack/jump-in/7-swap/0-rotate/keep-drawing/force-play) | V4§29-34 | 🟡 `UnoGameOptions`/`DEFAULT_UNO_OPTIONS` type + wire-contract field now exist (`shared/types.ts`); engine doesn't consume any flag yet, no lobby UI | C |
| 17 | Effect priority order | V4§27 | 🟢 implicit | A (document only) |

### 4.12 Edge cases requiring explicit, tested behavior
- Player disconnects mid-turn holding the turn timer → generic `awayUntil` grace period already covers this at the room level; verify UNO's `pendingActors()`/bot takeover doesn't fight it.
- Player leaves immediately after (would-have) declared UNO → depends on Phase B's declaration state design; must not leave a dangling "pending declaration" for a removed player (`removePlayer()` already deletes the hand — extend it to also clear declaration state).
- Draw pile *and* discard-minus-top both empty simultaneously (theoretical, only with a tiny player count and pathological play) — `drawCards()` already falls back to "take what we have" (`UnoEngine.ts:291-293`); add a test.
- Simultaneous UNO declarations from two players (multi-socket race) — needs server-side single-writer resolution once Phase B ships; the existing move-application model (server processes one `applyMove` at a time per room) already gives this for free — no new concurrency primitive needed, just correct handler logic.
- Wild Draw Four played as the winning (last) card — challenge window must still resolve before the win is finalized, per Volume 4 §17 read literally ("challenger keeps their turn" only makes sense if the hand isn't over yet) → explicit ordering rule needed in the Phase B design.
- Host leaves a private room mid-match — generic Bhalyam host-transfer behavior applies; not UNO-specific.

---

## 5. Game Modes

Bhalyam has **one structural mode: a private room via a shareable code**, optionally filled with bot seats. There is no public matchmaking queue anywhere in the codebase for any game. Map Volume 2 §5's six modes onto that reality:

| Volume 2 mode | Status in Bhalyam | Notes |
|---|---|---|
| Private Room | 🟢 **this is the only mode that exists**, and it's what UNO already uses | Host creates/shares a room code; 2–8 seats |
| AI Match | 🟢 buildable now via bot seats | `isBot` + `pendingActors()`/`applyAutoMove()` already wired in `UnoEngine`; needs difficulty tiers (§15) |
| Practice | 🟢 trivially: a private room with 1 human + bots, no ranking exists to skip anyway | No special mode needed — it's just a room with bots and no stakes, since nothing is "ranked" today |
| Casual Match (public matchmaking) | 🔴 no matchmaking queue exists for any game | Would require platform-level matchmaking infra — not UNO-specific, don't build a UNO-only queue |
| Ranked Match | 🔴 no accounts, no rating, no ladder anywhere | Phase I, platform-level |
| Party Mode | 🟡 already effectively available (private room, up to 8, chat + reactions already shipped) | Just messaging/positioning, not new engineering |

**Recommendation:** do not build "modes" as a UI concept for UNO beyond what the room-creation flow already offers (player count, optional bot fill). Layer **house rules as a room option** (Phase C) instead of a "mode" — that gives private-room hosts the "Party Mode" chaos and the "Practice" simplicity Volume 2 wants, without inventing new server infrastructure.

---

## 6. Complete User Flow

```
Home (BhalyamHome.tsx)
   ↓
Games catalog (GamesPage.tsx) — UNO tile (UNOTile.png)
   ↓
Create / Join room (room code flow — generic across all games)
   ↓
Lobby (generic Room.tsx lobby phase — player list, ready-up, bot-fill, [Phase C: house-rule toggles])
   ↓
Countdown → shuffle + deal (uno-deal.tsx overlay)
   ↓
Gameplay (UnoBoardDesktop.tsx / UnoBoardMobile.tsx via UnoBoard.tsx picker)
   ↓
Round end (win condition met server-side)
   ↓
Results — [🔴 GAP: no UNO-specific results screen today; falls through to the
            generic 90s scorecard modal, see §7.9]
   ↓
Rematch (generic RematchPanel) or Leave → Games catalog / Home
```

This already matches Volume 3 §4's player lifecycle shape and Volume 2 §3's core loop — the flow exists end-to-end today except for the Results step, which is the UX gap called out repeatedly below.

---

## 7. Screen-by-Screen Planning

### 7.1 Games catalog tile (`GamesPage.tsx`)
- **Current:** `client/public/UNOTile.png` used directly, outside the `illustrations.ts` token system that every other game's catalog presence goes through.
- **Recommendation:** fold it into the token map as a proper `games-shelf` tile asset for consistency, or explicitly document it as the deliberate exception (catalog tiles may be photographic/rendered rather than hand-inked). Low priority, cosmetic-consistency only.

### 7.2 Lobby (generic `Room.tsx`, `phase === "lobby"`)
- **Current:** shared lobby UI (player list, ready toggles, room code share, bot controls) — same as every other game.
- **UNO-specific additions needed (Phase C):** `UnoGameOptions` + `DEFAULT_UNO_OPTIONS` (matching the `RummyGameOptions`/`LudoGameOptions` precedent, `shared/types.ts:233,300`) and the `CreateRoomPayload.unoOptions?: Partial<UnoGameOptions>` field are 🟢 **already added**, and `turnTimerSeconds` is now fully load-bearing end-to-end (Phase 2 engine wiring + a Phase 3 room-creation UI, see §12). **Scope correction from the original Phase 3 plan:** no `UnoHouseRuleOptions` lobby panel was built. This app has no separate "in-lobby options panel" pattern for *any* game — every game (Rummy's mode, SnL's difficulty, etc.) chooses its options in the pre-creation sheet (`GameRoomSheet.tsx`), so UNO's timer option was added there instead, matching the actual codebase convention rather than the plan's original (untested) assumption. The house-rule toggles (stacking, jump-in, etc.) still have no UI — building toggles for flags the engine doesn't read yet (Phase C) would be a functionally dead, misleading UI, so that's correctly deferred until Phase C wires the engine side first.
- **Illustration opportunity:** `lobby-prop-uno` key already reserved in `illustrations.ts` (comment: "single oversized action card") but the asset is still `null` → renders as a dev-only placeholder today. **Art delivery, not new engineering.**

### 7.3 Shuffle + deal overlay (`uno-deal.tsx`)
- **Current:** fully built — `idle → shuffle (900ms) → deal (1000ms) → idle` state machine, triggered once per fresh round via a `sessionStorage` flag Room.tsx sets on the lobby→playing transition, radial dark background, two riffling card backs, then up to 56 cards (8 players × 7) fan out to seat positions using CSS custom properties consumed by `.uno-deal-fly`.
- **Verdict:** 🟢 already matches Volume 8 §16 ("dealing... should feel ceremonial") almost exactly. No work needed beyond the reduced-motion pass in §18.

### 7.4 Desktop board (`UnoBoardDesktop.tsx`)
- **Layout:** header (Leave, room-code tag, turn pill + timer, Tutorial button) → 2-column grid: board area (opponent seat row → table mat + hand-summary → hand fan → inline action bar → game-over panel) + persistent 340px rail.
- **States covered today:** playing, finished (via inline `GameOverPanel`), Wild color choice, drew-this-turn (Pass button appears).
- **States NOT covered:** UNO-declaration prompt/countdown (doesn't exist), Wild+4 challenge prompt (doesn't exist), turn-timeout auto-draw feedback (timer not wired), loading/connecting (falls back to generic Bhalyam behavior — fine).
- **Mobile considerations:** N/A, this is the ≥1280×720 + fine-pointer shell (`UnoBoard.tsx:9-14`).

### 7.5 Mobile board (`UnoBoardMobile.tsx`)
- **Layout:** fixed header → internally-scrolling body (opponent row horizontal-scroll → table mat → hand summary → wrapping hand fan → sticky-bottom action bar) → floating room-rail trigger + reaction button.
- **Verdict:** structurally solid, same gaps as desktop (declaration, challenge, timer) since both consume the same `useUnoBoard` model.
- **Mobile-specific:** touch targets already reasonably large (card buttons `w-16 h-24`); Volume 3 §26 calls for "large touch targets" — verify against a 44×44pt minimum during the accessibility pass (§19).

### 7.6 Wild color picker
- **Current:** inline `WildColorPicker` (`uno-shared.tsx:458-490`) appears beneath the hand once a Wild/Wild+4 is selected — 4 large color swatches, immediate visual confirmation via ring + scale. Matches Volume 3 §18 requirements ("large color buttons, high contrast, immediate confirmation") already.

### 7.7 Room rail (`uno-rail.tsx`)
- **Current:** 4-tab (Chat/Voice/Players/Points) sidebar on desktop, floating-trigger bottom sheet on mobile, plus a standalone quick-reaction emoji button (8 emoji, 400ms cooldown, `room:reaction` socket emit). Reuses generic `Chat`/`VoicePanel`/`PlayerList` components plus UNO's own `ScorePanel`.
- **Note:** Bhalyam already has a generic `InlineRoomRail.tsx` component that Rummy/others may use; UNO implemented its own `uno-rail.tsx` instead. This isn't wrong (UNO's rail needs its own `ScorePanel` tab), but flag as a **future consolidation candidate** if `InlineRoomRail` gains a slot API — not a blocking issue.

### 7.8 Tutorial (`UNO_TUTORIAL` via generic `GameTutorial`)
- **Current:** 5 slides (match the pile, action cards, wild cards, stuck→draw, empty hand→win), gated by a `localStorage`-style `uno.tutorial.completed.v1` key, opened via a header button on both shells.
- **Gap:** no slide mentions UNO declaration or the Wild Draw Four challenge — **must add slides once Phase B ships those mechanics**, otherwise the tutorial actively under-informs players about the game's most dramatic moments.

### 7.9 Results screen — 🔴 the biggest UX gap
- **Current:** UNO is **not** in `GAMES_WITH_OWN_SCORECARD` (`Room.tsx`) — Rummy/RPS/Hand Cricket have bespoke result modals, UNO falls through to the generic 90-second scorecard + the in-board `GameOverPanel` banner (`"🎉 You won! 🎉"` / `"{name} wins!"` + a score line that, per §4.9, always reads 0 today).
- **Required per Volume 3 §19 / Volume 8 §24:** winner highlight → card-clear flourish → confetti → statistics (turns played, cards played, Wild cards used, UNO calls) → rematch CTA. None of this is UNO-flavored today.
- **Recommendation:** once scoring (Phase D) lands, give UNO its own result modal (own file, e.g. `UnoResultModal.tsx`) following the Rummy precedent (`RummyResultModal.tsx`) rather than continuing to rely on the generic scorecard — this is the single highest-leverage "feels premium" investment left. → Phase D/E.

### 7.10 Reconnect / disconnect states
- Generic Bhalyam `awayUntil` grace-period banner applies uniformly; no UNO-specific work needed unless product wants UNO to visually differentiate (not recommended — consistency > novelty here, per Volume 3 §3.4).

---

## 8. UX Planning

### 8.1 Onboarding / FTUE
Already strong: tutorial gate + contextual Wild picker + valid-card highlighting (`validMoveIds` drives hover/dim state in `Card`). Volume 3 §5's "first match under 5 minutes, no registration" is **already true** — Bhalyam has no registration at all. Nothing to build here beyond keeping the tutorial in sync with new mechanics (§7.8).

### 8.2 UNO call warnings — 🔴 to design fresh
Needs, once Phase B ships the mechanic:
- A prominent "UNO!" button that appears the instant a player's hand drops to 1 card (own hand only — you can't declare for someone else, though other players should be able to *catch* a missed declaration, per Volume 4 §18: "if another player notices first").
- A visible countdown window (Volume 3 §17: "start a visible countdown") — the server needs an authoritative deadline (reuse the same `turnDeadline` plumbing already half-built for turn timers, §4.8).
- A "catch" action available to *other* players during that window (new move type, e.g. `catchUno`, targeting a player who has 1 card and hasn't declared).
- Failure state: automatic 2-card penalty applied server-side, broadcast as a distinct `lastAction` string so all clients can react.

### 8.3 Turn indicators — 🟢 already present
`UnoOpponentSeat`'s gold glow + "▸ Playing" pill, and the header turn pill with direction label, already satisfy Volume 3 §16/§17 ("is it my turn, what happens if I don't act").

### 8.4 Feedback messages
🟢 **Shipped (Foundation phase).** `lastAction` (a human-readable string, e.g. `"Skip! Next player skipped."`) is produced by the engine on every state-changing move. It is now surfaced via `uno-action-toast.tsx`'s `UnoActionToast` component (same watch-for-a-new-value-and-fade shape as `ChatMessageToast.tsx`), mounted in both `UnoBoardDesktop.tsx` and `UnoBoardMobile.tsx` just below the header.

---

## 9. Notebook Theme Adaptation

UNO already has its **own coherent palette variant** within the shared `.bhalyam-paper`/`.bhalyam-font` notebook shell — this is the established convention (each game gets a related-but-distinguishable palette, e.g. Rummy = wood/green felt, UNO = cream/gold):

| Token | Value | Used for |
|---|---|---|
| Paper cream | `#FFF9F0` | Panel backgrounds, table felt highlights |
| Header cream | `#F6EDDB` | Header bar, discard-mat background |
| Table mat | `#FBF3E3` | `DeckPanel` sunken-mat background |
| Border tan | `#E8D8BE` / `#E0CBA0` | Panel/mat borders |
| Ink brown | `#6E5E4D` / `#8B7355` | Body text, labels |
| Gold accent | `#E6A11E` | Turn glow, selection ring, active pill |
| Wood brown | `#6D4323` | Hand-fan border, draw-count badge |
| Bhalyam script red | `#B91C1C` | Wordmark |
| Card bodies | `#D22B27` R · `#3AA03A` G · `#1C6DD0` B · `#E8B100` Y | Authentic card-face colors (not muted to fit the paper palette — deliberately vivid, matching real UNO cards) |
| Wild/back body | `#17181d` near-black | Wild card face, draw-pile back |

**Card art is already deliberately "real playing card," not notebook-sketch** — a documented, intentional choice in the code (`uno-shared.tsx:16-26`): emoji-on-pastel felt like a placeholder, so the SVG cards render a solid body, the signature white diagonal oval, mirrored corner indices, and a patterned back. **Do not sketch-ify the cards** — this is correct as-is and should be the template other card-based games' faces follow, not the other way around.

**What's missing is illustration, not card art:**
- `lobby-prop-uno` ("single oversized action card") — reserved key, `null` today.
- `corner-uno` ("oversized action card" corner doodle for in-board static chrome) — reserved key, `null` today.
- No dedicated `client/public/illustrations/UNO/` subfolder (Hand Cricket has one with 12 assets; Rummy/RPS have standalone PNGs). UNO has neither yet — only the stray root-level `UNOTile.png`.
- A UNO results screen (§7.9) will want its own win/loss illustration pairing, following the `gameover-trophy-win` / `gameover-trophy-loss` pattern already established generically — likely UNO-flavored variants or reuse of the generic pair, a product call, not an engineering one.

**Empty-space illustration opportunities:** the draw pile counter, the tutorial's 5 slide icons (currently emoji, e.g. 🎴⏭️🌈🃏🏆 — could graduate to hand-inked doodles matching Hand Cricket's tutorial treatment if that game has one), and the (future) UNO-call countdown ring.

---

## 10. Information Architecture

```
Routes (react-router-dom, generic across all games — no UNO-specific routes)
  /                    → BhalyamHome.tsx
  /games               → GamesPage.tsx  (UNO tile → create/join)
  /room/:code           → Room.tsx      (lobby + in-game, game-keyed rendering)

Component tree inside Room.tsx when roomState.game === "uno":
  Room.tsx
    └─ UnoBoard.tsx                    (desktop/mobile picker, viewport-gated)
         ├─ UnoBoardDesktop.tsx  ─┐
         └─ UnoBoardMobile.tsx   ─┴─ both call useUnoBoard(props) → UnoBoardModel
              ├─ uno-deal.tsx           UnoDealOverlay / useUnoDealGate
              ├─ uno-shared.tsx         DeckPanel, HandPanel, Card, UnoCardFace/Back,
              │                         UnoOpponentSeat, ScorePanel, HandInfoPanel,
              │                         WildColorPicker, ActionBar, GameOverPanel
              ├─ uno-rail.tsx           UnoRoomRail (sidebar | sheet)
              ├─ helpers/deck.ts        getCardLabel, sortHand, CARD_DISPLAY
              ├─ helpers/validation.ts  canPlayCard, getPlayableCards, requiresColorChoice
              ├─ helpers/hand.ts        countRank/Color/Wilds, getMostCommonColor (bot support)
              ├─ GameTutorial (generic) UNO_TUTORIAL deck from tutorials.tsx
              └─ TurnTimeWarning (generic, currently dead — see §4.8)
```

No new routes are needed for anything in this plan — every addition (declaration, challenge, house rules, results) is a new component/state slice inside this existing tree, not a new page.

---

## 11. Frontend Architecture

Current structure (already matches the intended shape — extend, don't restructure):

```
client/src/games/uno/
  UnoBoard.tsx            — desktop/mobile shell picker
  UnoBoardDesktop.tsx      — desktop presentation shell
  UnoBoardMobile.tsx       — mobile presentation shell
  useUnoBoard.ts           — ALL state/effects/socket-emits (the one hook both shells consume)
  uno-shared.tsx           — dumb, presentation-only building blocks (cards, panels, action bar)
  uno-rail.tsx             — chat/voice/players/points tab rail
  uno-deal.tsx             — shuffle+deal opener
  helpers/
    deck.ts                — display/labeling/sorting (pure functions)
    validation.ts           — client-side optimistic legality checks (pure functions)
    hand.ts                 — hand-analysis helpers, used by bot color-choice today

client/src/store/unoStore.ts — Zustand, UI-only (selected card, wild color, hover) — NOT game state
client/src/games/tutorials.tsx → UNO_TUTORIAL export
client/src/constants/audio.ts → AUDIO.UNO_PLAY / UNO_DRAW / UNO_WILD

server/src/games/uno/UnoEngine.ts — the entire server-authoritative rule engine (one file, ~470 lines)
shared/types.ts (lines ~1027-1085) — UnoCard, UnoColor, UnoRank, UnoPublicState, UnoPlayerState,
                                       UnoPlayMove/DrawMove/PassMove, UnoMoveType
```

**Recommended additions (no restructuring, additive only):**

```
client/src/games/uno/
  uno-action-toast.tsx     — ✅ shipped (Foundation) — UnoActionToast, surfaces state.lastAction
  uno-declare.tsx          — ✅ shipped (Phase 3) — UnoCallButton (no countdown ring, see §12)
  uno-challenge.tsx        — ✅ shipped (Phase 3) — WildDrawFourChallengePrompt
  UnoResultModal.tsx       — [Phase 4] dedicated results screen (see §7.9)
  helpers/scoring.ts        — ✅ shipped (Phase 3) — cardPoints/handPoints, pure functions, mirrors deck.ts style

shared/types.ts
  UnoGameOptions            — ✅ shipped (Foundation) — mirrors RummyGameOptions/LudoGameOptions precedent
  DEFAULT_UNO_OPTIONS       — ✅ shipped (Foundation) — all house rules default false, turnTimerSeconds: 20
  CreateRoomPayload.unoOptions?: Partial<UnoGameOptions>  — ✅ shipped (Foundation), not yet consumed by RoomManager

server/src/games/uno/
  UnoEngine.ts               — ✅ Foundation + Phase 2 landed: exported InternalUnoState (test
                                seam), injectable setRng() (mirrors LudoEngine), direction-aware
                                stepIndex() turn advancement (fixed the Reverse bug, §4.4),
                                declareUno/catchUno/challenge/acceptDraw move types, Wild+4
                                legality snapshot + pendingChallenge state machine, starting-card
                                re-draw fix, setOptions/setTurnDeadline/clearTurnDeadline/
                                getTurnTimerSeconds/getTimeoutActor. Still to extend: scoring on
                                win (Phase D), house-rule branches (Phase C, options already
                                scaffolded).
```

This keeps the existing, already-correct "wrapper + dual-layout split, all logic centralized in one hook" architecture fully intact — every recommendation in this plan is an *extension* of that pattern, never a replacement.

---

## 12. Component Breakdown

Documenting what exists (accurate today) plus what Phase B/C/D need to add.

| Component | File | Responsibility | Key props |
|---|---|---|---|
| `UnoBoard` | `UnoBoard.tsx` | Desktop/mobile shell picker via viewport+pointer heuristic | `UnoBoardProps` (passthrough) |
| `useUnoBoard` | `useUnoBoard.ts` | **All** state, derived memos, socket emits (play/draw/pass) | props → `UnoBoardModel` |
| `UnoCardFace` / `UnoCardBack` | `uno-shared.tsx` | Pure SVG rendering of a card face/back | `card`, `className` |
| `Card` | `uno-shared.tsx` | One interactive hand card (selection ring, hover lift, disabled dim) | `card, isSelected, isValid, isDisabled, interactive, onClick, size` |
| `DeckPanel` | `uno-shared.tsx` | Draw pile + discard top, sunken "mat" styling | `topCard, currentColor, deckCount` |
| `UnoOpponentSeat` | `uno-shared.tsx` | One opponent's avatar + live hand-size + fanned card backs + turn glow | `name, handSize, isTurn, size` |
| `ScorePanel` | `uno-shared.tsx` | Per-player score list, active player highlighted | `playerOrder, turnPlayerId, selfId, scores, nameOf` |
| `HandInfoPanel` | `uno-shared.tsx` | "Your Hand" count + selected-card preview | `handCount, selectedCard` |
| `WildColorPicker` | `uno-shared.tsx` (internal) | 4-swatch color choice for Wild/Wild+4 | `selectedWildColor, onPick` |
| `HandPanel` | `uno-shared.tsx` | The interactive hand fan + inline color picker + win flourish | `sortedHand, validMoveIds, selectedCardId, myTurn, phase, onSelectCard, needsColorChoice, selectedWildColor, onPickColor, size` |
| `ActionBar` | `uno-shared.tsx` | Play / Draw / conditional Pass buttons | `playCard, drawCard, passTurn, canSubmitPlay, canDraw, canPassTurn, drewThisTurn` |
| `GameOverPanel` | `uno-shared.tsx` | In-board end banner | `winner, selfId, scores` |
| `UnoRoomRail` | `uno-rail.tsx` | Chat/Voice/Players/Points tabs, sidebar or sheet | `variant, players, selfId, messages, playerOrder, turnPlayerId, scores, nameOf` |
| `UnoDealOverlay` / `useUnoDealGate` | `uno-deal.tsx` | Shuffle+deal opening sequence | `stage, playerCount` / `roomCode` |

**New components to add:**

| Component | Phase | Responsibility |
|---|---|---|
| `UnoCallButton` | ✅ shipped | `uno-declare.tsx` — appears when own hand === 1 card and undeclared; pulsing, fixed bottom-center |
| ~~`UnoCatchPrompt`~~ (built as `UnoOpponentSeat.canCatch`/`onCatch` instead) | ✅ shipped | `uno-shared.tsx` — pulsing "Catch! +2" button rendered directly on a qualifying opponent's own seat, not a separate modal/prompt component |
| ~~`UnoDeclareCountdownRing`~~ (not built — no deadline exists) | dropped | The declaration mechanic is advisory, not hard-timed (§14.4) — there is no countdown value to render. `UnoCallButton`'s pulse carries the urgency instead |
| `WildDrawFourChallengePrompt` | ✅ shipped | `uno-challenge.tsx` — full-screen modal shown only to the targeted player; Accept/Challenge choice, never reveals legality |
| `UnoActionToast` | ✅ shipped | Surfaces `state.lastAction` as a transient banner — `client/src/games/uno/uno-action-toast.tsx`. Also now covers "waiting for X to decide" during a pending challenge, for every player who isn't the target — no separate banner needed |
| ~~`UnoHouseRuleOptions`~~ (not built — see §11's scope-correction note) | deferred to Phase C | No in-lobby options-panel pattern exists for any Bhalyam game; a `turnTimerSeconds` selector was added to `GameRoomSheet.tsx` instead (the actual, established per-game-options location), and the non-functional house-rule toggles are correctly withheld until Phase C's engine work exists to back them |
| `UnoResultModal` | D/E | Dedicated results screen replacing the generic scorecard for UNO — scoring itself (§4.9) now ships real numbers even without this component; the modal is the remaining "premium feel" gap |

---

## 13. State Management Design

### 13.1 Wire contracts (already defined, `shared/types.ts:1027-1085`)

```ts
type UnoColor = "R" | "G" | "B" | "Y";
type UnoRank = "0".."9" | "Skip" | "Reverse" | "+2" | "Wild" | "Wild+4";

interface UnoCard { id: string; color: UnoColor | null; rank: UnoRank }

interface UnoPublicState {
  kind: "uno";
  phase: "playing" | "finished";
  playerOrder: string[];
  turnPlayerId: string;
  direction: 1 | -1;
  topCard: UnoCard;
  currentColor: UnoColor | null;
  handSizes: Record<string, number>;
  deckCount: number;
  scores: Record<string, number>;
  turnDeadline: number | null;   // wired client-side, never set server-side today (§4.8)
  winnerId: string | null;
  lastAction: string | null;      // produced every move, never rendered today (§8.4)
}

interface UnoPlayerState extends UnoPublicState {
  myHand: UnoCard[];
  validMoves: UnoCard[];          // server-precomputed, UI convenience
}
```

### 13.2 Client-side model (`UnoBoardModel`, `useUnoBoard.ts:40-75`)
The hook derives everything the shells render — `myTurn`, `currentPlayer`, `winner`, `nameOf`, `validMoveIds` (a `Set` for O(1) lookup), `sortedHand`, `selectedCard`, `canSubmitPlay`/`canDraw`/`canPassTurn`, and exposes `playCard`/`drawCard`/`passTurn`. This is a clean, already-correct **server state → derived view model** boundary; new mechanics should extend `UnoBoardModel`, not create a parallel derivation path.

### 13.3 Local UI-only state (`unoStore.ts`, Zustand)
`selectedCardId`, `selectedWildColor`, `hoveredCardId`, `isPlayingCard`, `lastPlayedCardId` — explicitly documented in the file as "not game state." **Extend this store**, don't create a second one, for: `pendingDeclaration: boolean` (Phase B, purely a "have I tapped UNO yet" local flag until the server echoes back), and any future local-only UI toggles.

### 13.4 New state — ✅ shipped in Phase 2 (design retained below, actual shape matches closely)

Server-side additions to `InternalUnoState`:
```ts
interface InternalUnoState {
  // ...existing fields...
  unoDeclaredBy: Set<string>;          // playerIds who correctly declared this "at 1 card" window
  unoDeclareDeadline: number | null;   // server-authoritative window end, mirrors turnDeadline pattern
  pendingChallenge: {
    challengerId: string;
    playedById: string;
    cardId: string;
    deadline: number;
  } | null;
}
```

New move types (extend `UnoMoveType`):
```ts
type UnoMoveType = "play" | "draw" | "pass" | "declareUno" | "catchUno" | "challenge" | "acceptDraw";
```

`UnoPublicState` additions:
```ts
interface UnoPublicState {
  // ...existing...
  unoDeclareDeadline: number | null;   // non-null only while a player is at 1 card, undeclared
  pendingChallenge: { challengerId: string; playedById: string; deadline: number } | null; // cardId withheld (still hidden)
}
```

This is intentionally additive to the existing shape — no breaking changes to `UnoCard`, `topCard`, or the core turn fields.

---

## 14. Game Engine Design

### 14.1 Current game loop (accurate description of `UnoEngine.ts`)
```
init(players) → shuffle 108-card deck → deal 7 each → reveal discard top
     ↓
applyMove(move) — dispatch on move.type:
     "draw"  → handleDraw:  1 card, sets drewLastTurn guard
     "play"  → handlePlay:  validate → remove from hand → push to discard →
                              update currentColor → check win → handleActionCard →
                              advance turn (1 or 2 slots)
     "pass"  → handlePass:  only legal if drewLastTurn; advance turn
     ↓
getPublicState() / getStateFor(playerId) — read models for broadcast
     ↓
isOver() → phase === "finished"
```

### 14.2 Validation logic
`isValidPlay()` is the single source of truth server-side; `helpers/validation.ts` client-side is a **UI-only optimistic mirror** (explicitly commented "server performs authoritative validation, this is for UI only") — correct separation, keep it exactly this way when extending for Wild+4 legality (§4.3): update *both* copies in lockstep, server remains authoritative.

### 14.3 Victory logic
`hand.length === 0` after `handlePlay` → immediate `phase = "finished"`, `winnerId` set, `MoveResult.isOver = true`. Clean, correct, matches Volume 2 §17 ("round ends immediately").

### 14.4 UNO declaration state machine — ✅ shipped in Phase 2 (engine); UI still Phase 3

```
Player's hand drops to 1 card (after a "play" move resolves)
     ↓
Engine sets unoDeclareDeadline = now + DECLARE_WINDOW_MS (e.g. 3000ms)
     ↓
   ┌─────────────────────────┬──────────────────────────────┐
   │ Player sends             │ Another player sends          │
   │ "declareUno" before      │ "catchUno" targeting them      │
   │ deadline                  │ before they declare             │
   ↓                           ↓                                │
unoDeclaredBy.add(playerId)   Penalty: +2 cards drawn to the    │
No penalty. Deadline cleared. hand, unoDeclareDeadline cleared. │
                                                                  │
   If neither happens before deadline: no automatic penalty —   │
   official rule (V4§18) requires ANOTHER PLAYER to notice.     │
   Deadline simply expires; the "catch" window effectively      │
   never fully closes until the player plays their last card    │
   or is caught — model unoDeclareDeadline as advisory/UI-only  │
   urgency, NOT an auto-penalty trigger, so "catchUno" remains  │
   legal at any point while hand.length === 1 && undeclared,    │
   matching the real rule instead of an arcade-timer invention. │
   └──────────────────────────────────────────────────────────┘
```

This is a deliberate rules-fidelity choice: Volume 3 §17's "visible countdown" is a **UX urgency cue**, not a hard rule cutoff — the actual official rule (Volume 4 §18) has no timer at all, just "before the next player begins their turn" as the soft deadline and "if another player notices first" as the trigger. Model the countdown as advisory and let `catchUno` stay legal until either declared or the hand is played out, to stay rules-correct while still delivering the dramatic countdown UI Volume 8 wants.

### 14.5 Wild Draw Four challenge resolution — ✅ shipped in Phase 2 (engine); UI still Phase 3
```
Player plays Wild+4 → engine checks: does the player's PRE-PLAY hand (already removed
                        from state — snapshot needed at play-time) contain any card
                        matching the PREVIOUS currentColor?
     ↓
   Legal (no match existed) OR house rule "no legality checking" enabled:
        → resolves exactly as today (next player draws 4, loses turn)
        → BUT store `pendingChallenge` so the *targeted* player still gets a window
          to challenge even a legal play (official rule: challenge is always allowed,
          Volume 4 §17 FAQ — "can I challenge every Wild Draw Four? Yes.")
     ↓
   Targeted player sends "challenge" within the window:
        → engine reveals (server already knows) whether the play was legal
        → illegal → player who played it draws 4 instead, challenger keeps turn, no draw
        → legal   → challenger draws 6 instead of 4, turn proceeds as normal
     ↓
   Targeted player sends "acceptDraw" (or window expires):
        → resolves as today, no reveal needed, hidden information stays hidden
```

Requires the engine to retain a snapshot of the playing player's hand *at the moment of play* (before the card is removed) for challenge resolution — a small addition to the existing `pendingChallenge` state, not a structural change.

### 14.6 Rule engine / card resolution engine
Already exists as `handleActionCard()` — a clean single-responsibility dispatcher returning `{ turnAdvance, description }`. Extend it, don't replace it, for stacking (Phase C, house rule): the natural extension point is making `handleActionCard`'s `+2`/`Wild+4` branches check a `pendingDrawStack` counter instead of immediately calling `drawCards()`, only resolving the stack when a player can't/won't continue it. This is additive and matches the existing function's shape.

### 14.7 AI turn logic
See §15 — `applyAutoMove()` already exists but is a single fixed heuristic, not tiered.

---

## 15. AI Opponent Design

**Current (`UnoEngine.applyAutoMove()`, `UnoEngine.ts:425-468`):** one fixed heuristic for every bot — play the first valid card found in hand order; for Wild/Wild+4, choose the color most represented in the remaining hand (`getMostCommonColor` from `helpers/hand.ts`); if nothing playable, draw then pass. No delay logic lives in the engine itself (pacing is presumably handled by the shared bot-scheduling loop in `RoomManager` that calls `applyAutoMove` for every engine — verify this is true generically before assuming UNO needs its own delay timer).

**Recommended tiers** (Volume 2 §23's "believable, not mechanical, occasional imperfection at lower difficulty"):

| Tier | Card selection | Wild color choice | Deliberate imperfection |
|---|---|---|---|
| Easy | First valid card (current behavior) | Most common color in hand (current behavior) | None needed — this tier *is* naive by construction |
| Medium | Prefer playing action cards (Skip/Reverse/+2) when it's advantageous (opponent close to winning) over number cards; otherwise first-valid | Most common color, but occasionally (≈15%) picks a color that denies the *next* player based on their visible hand size (not their hand contents — bots must not see hidden info) | Occasionally holds a playable Wild when a non-Wild is also legal, to conserve it |
| Hard | Prioritize keeping own color flexibility (play the color it holds least of, to reduce future dead-hand risk); plays Draw Two/Wild Draw Four aggressively against the player closest to 1 card; always declares UNO instantly (once Phase B ships) and always catches missed declarations | Chooses color to maximize denial against the shortest-handed opponent | Never makes a "mistake" — this tier plays optimally within public information |

**Hard constraint for every tier:** bots must only ever reason over `hand`, `handSizes` (public), and `topCard`/`currentColor` — never peek at other players' actual hands. The existing `getMostCommonColor` helper already only touches `hand`, so this constraint is already respected; keep it that way when adding tiers.

**Fairness/pacing:** verify (don't assume) that bot moves are paced with a human-plausible delay by the shared `RoomManager` bot loop across all games; if UNO-specific pacing is needed (e.g. longer "thinking" pause before a Wild+4 for dramatic effect), add it as a small `setTimeout` wrapper at the call site, not inside the pure `applyAutoMove` function.

---

## 16. Animation Planning

| Moment | Current state | Notes |
|---|---|---|
| Shuffle | 🟢 built (`uno-deck-shuffle`/`-alt` keyframes, `index.css:1029-1053`) | Two card backs riffle opposite directions, 500ms loop |
| Deal | 🟢 built (`uno-deal-fly`, `index.css:1058-1068`) | Up to 56-card staggered fan-out, 380ms per card + stagger window |
| Card hover/select | 🟢 built (`Card` component: lift, ring, shadow via Tailwind transitions) | Matches Volume 8 §11-12 |
| Card play | 🟡 partial | Selection→submit exists; no explicit "card travels from hand to discard pile" flight animation — currently an instant state swap on the next server echo. Volume 8 §13 wants a travel sequence. |
| Draw | 🟡 partial | No "card leaves deck, travels to hand" animation — instant append on state update. Volume 8 §14. |
| Turn change | 🟢 built | Gold glow + "▸ Playing" pill transitions via CSS `transition-all duration-300` |
| UNO moment | 🔴 doesn't exist | Needs the full Phase B feature first (§14.4) before it can be animated per Volume 8 §19 |
| Wild card choice | 🟢 mostly built | Picker appears/confirms instantly; Volume 8 §20's "background dims, chosen color fills table" flourish not present — nice-to-have polish |
| Draw Four drama | 🔴 doesn't exist | Depends on Phase B challenge flow existing first |
| Reverse direction | 🟡 minimal | Direction label text updates (`"Clockwise"`/`"Counter-clockwise"`); no visual arrow-rotation per Volume 8 §22 |
| Skip | 🟡 minimal | `lastAction` text produced but unsurfaced (§8.4); no skipped-player visual highlight per Volume 8 §23 |
| Victory | 🟡 minimal | `GameOverPanel` banner only; no confetti/card-clear sequence — folds into the §7.9 results-screen gap |
| Defeat | 🟡 minimal | Same banner, respectful tone already correct (no negative effects), just visually flat |

**Priority order for animation work:** (1) surface `lastAction` as toasts — cheapest, highest information value; (2) UNO declaration sequence — can't be built before Phase B mechanics exist, but should be co-designed with them; (3) card play/draw travel animations — pure polish, do after mechanics are complete so the animation targets don't have to be redesigned; (4) Wild/Draw-Four dramatic flourishes — last, purely decorative.

All new animations must respect `prefers-reduced-motion` the same way `IllustrationSlot` already does (`useReducedMotion` from `framer-motion`) — that hook is already a dependency and used elsewhere, so this is a pattern to follow, not a new capability to add.

---

## 17. Audio Planning

**Current (`useAudio` + `AUDIO.*` constants, Howler-backed):** `UNO_PLAY`, `UNO_DRAW`, `UNO_WILD` already wired in `useUnoBoard.ts` (`playCard`/`drawCard`). That's 3 of Volume 8 §33's ~9 suggested distinct sounds.

**Missing, to add alongside their respective mechanics:**
| Sound | Trigger | Phase |
|---|---|---|
| Shuffle | `uno-deal.tsx` shuffle stage start | E (cosmetic, cheap) |
| Deal (per-card or single swoosh) | `uno-deal.tsx` deal stage | E |
| Reverse | Reverse card resolves | E |
| Skip | Skip card resolves | E |
| UNO declaration | Successful `declareUno` | B (co-ships with the feature) |
| UNO missed/caught | Successful `catchUno` | B |
| Victory | `phase === "finished"`, self is winner | D/E, pairs with results screen |
| Defeat (soft/respectful) | `phase === "finished"`, self is not winner | D/E |

No background music infra was found anywhere in the app during this review — Volume 8 §34's music recommendations are 🔴 platform-level (would apply to all games, not a UNO-specific decision) and out of scope here.

---

## 18. Performance Strategy

The existing hook already does the right things and should be the template:
- `validMoveIds` memoized as a `Set` (`useUnoBoard.ts:150`) — O(1) membership checks per card instead of a linear scan per render.
- `nameById` built once per roster change via `useMemo`, not per-lookup.
- `sortedHand` memoized off `state.myHand`.
- Double-submit guard (`isSubmitting`) prevents redundant socket emits during network latency.

**For new features, keep the same discipline:**
- The deal overlay already caps at 56 simultaneous animating elements (8×7) — don't let a future max-player increase silently regress this without re-profiling.
- `unoDeclareDeadline`/`turnDeadline` countdown UI should tick via `requestAnimationFrame` or a single shared interval (reuse whatever `TurnTimeWarning` already does internally — inspect before adding a second timer mechanism).
- Card SVGs are inline (not `<img>`), so there's no network waterfall for card art — keep any new card-adjacent visuals (challenge prompt, declare button) as inline SVG/CSS rather than image assets for the same reason, consistent with the existing "instant, crisp at any size" design goal.

---

## 19. Accessibility

| Area | Current | Gap |
|---|---|---|
| Color-blind safety | 🟢 every card already pairs color with a distinct symbol/number, never color alone | — |
| Screen reader labels | 🟢 `aria-label` via `getCardLabel()` on every card face and back | Extend the same helper to label new UI (declare button, challenge prompt) |
| Reduced motion | 🟡 pattern exists (`IllustrationSlot`) but not yet applied inside `uno-deal.tsx`'s CSS-keyframe animations | Add a reduced-motion short-circuit to `useUnoDealGate` (skip straight to `idle`, or cut animation durations) |
| Keyboard navigation | 🟡 unverified | Card buttons are real `<button>` elements (good baseline), but tab order across a wrapping hand-fan + action bar + rail needs an explicit pass; no keyboard shortcut exists for "declare UNO" urgency |
| High contrast | 🟡 unverified | Card art already high-contrast by nature (solid colors, white oval); verify text-on-cream contrast ratios in `ScorePanel`/`HandInfoPanel` meet WCAG AA |
| Touch targets | 🟡 unverified | `Card` buttons are `w-16 h-24` (mobile) / `w-20 h-28` (desktop) — verify against 44×44pt minimum, especially in a wrapping fan where cards can visually overlap |

---

## 20. Testing Strategy

**🟢 Closed (Foundation phase).** `server/src/games/uno/__tests__/engine.test.ts` originally covered only `init`, `draw`, `pass`, `removePlayer`, and `applyAutoMove` — zero coverage of `play`. It now has 32 passing tests (up from 6), adding: deck composition (exact 108-card, per-color, per-rank breakdown), `play` validity (color/number/symbol matching, Wild, the documented Wild+4-legality gap), win detection, every action-card effect including the Reverse fix (§4.4), draw-pile reshuffle (both the normal path and the "not enough to reshuffle" fallback), and the Wild-opening-card-defaults-to-Red gap (§4.2). `UnoEngine` also gained an injectable `setRng()` hook (mirrors `LudoEngine.setRng`) and `InternalUnoState` is now exported so future tests can set up exact scenarios directly instead of fighting the shuffle. Full server suite: 178/178 passing, `tsc --noEmit` clean on both packages.

### 20.1 Unit tests (engine, `UnoEngine.ts`)
- Deck composition: exactly 108 cards, correct per-rank/color counts.
- Deal: 7 cards/player, correct draw-pile remainder.
- `isValidPlay` matrix: every rank/color combination against every top-card type, including Wild-on-Wild and the not-yet-legal-checked Wild+4 (write the test *before* the fix, watch it fail, then fix — TDD the Phase B gap).
- Skip/Reverse/+2/Wild/Wild+4 turn-advance and side-effect correctness, including explicit 2-player and 3+player Reverse cases (§4.4).
- Draw-pile reshuffle when exhausted, including the "not enough to reshuffle" fallback branch.
- Win detection on the exact move that empties a hand.
- `removePlayer` mid-game: hand returns to deck, turn index adjusts correctly, single-player-remaining auto-finish.
- (Phase B) declaration/catch state machine: on-time declare, late declare, caught-before-declare, caught-after-declare-is-a-no-op.
- (Phase B) challenge resolution: illegal Wild+4 challenged (challenger wins), legal Wild+4 challenged (challenger draws 6), un-challenged window expiry.
- (Phase D) scoring: point table applied correctly across mixed hand compositions.

### 20.2 Integration tests
- Full socket round-trip: `game:move` → engine → `game:state` broadcast, for play/draw/pass and (once shipped) declare/catch/challenge.
- Reconnect mid-turn: verify `awayUntil` grace period doesn't desync `pendingActors()`.
- Bot fill: room reaches `minPlayers` via bots, `applyAutoMove` loop terminates (doesn't infinite-loop) every turn.

### 20.3 UI tests
- Both shells at 375/768/1024/1440 (matches the roadmap's own QA matrix).
- Wild picker reachable and operable via keyboard.
- `validMoveIds`-driven disabled state correctly blocks invalid taps client-side (defense in depth, not a substitute for server validation).

### 20.4 Gameplay/scenario tests
- Every edge case in §4.12 as an explicit scripted scenario.
- Full 2-player, 4-player, and 8-player matches played to completion via scripted bot-vs-bot runs, asserting no engine exception and a valid `winnerId` every time.

---

## 21. Risks and Edge Cases

| Risk | Mitigation |
|---|---|
| Shipping Phase B (declaration/challenge) without tests first regresses a currently-stable engine | Write the failing tests from §20.1 before touching `UnoEngine.ts` |
| `turnDeadline` wiring interacts badly with the existing `drewLastTurn`/pass flow if timeout auto-draw is added carelessly | Model timeout as calling the exact same `handleDraw` path a manual draw would, not a parallel code path |
| House-rule stacking (Phase C) complicates the already-correct `handleActionCard` dispatcher | Extend via an explicit `pendingDrawStack` field rather than branching logic inline; keep official-rules path untouched when the option is off |
| Results-screen work (§7.9) gets scoped as "just add scoring" but actually needs new illustration assets | Sequence: scoring logic (Phase D, pure engineering) can ship before the illustration art arrives — the modal can launch with placeholder/generic art via `IllustrationSlot`'s existing dev-fallback behavior, matching how every other reserved-but-undelivered illustration key already degrades gracefully |
| AI tiers (§15) accidentally leak hidden information (reading opponents' actual hands instead of public `handSizes`) | Code review checklist item; the existing `getMostCommonColor` helper is already hand-scoped correctly — audit any new bot logic against the same constraint |
| Volumes 5/6/7's ranked/progression/moderation content gets treated as near-term backlog by mistake | This document and the roadmap both explicitly gate that content behind Phase G-L / platform-level accounts work — don't let sprint planning pull it forward without that dependency being satisfied first |

---

## 22. Development Phases

This plan does not re-derive a new phase sequence — **use `uno-plan-of-action.md`'s Phase A–L roadmap as-is.** What this document adds is the concrete task-level detail behind the phases that are actually actionable against the current codebase (A through F); phases G–L remain correctly gated behind platform-level work not detailed further here.

| Roadmap phase | This doc's supporting sections |
|---|---|
| A — Rule Contract & Baseline Hardening | §4 (full rules matrix), §20.1 (test list to write first) |
| B — Official Rules Completion | §4.3, §4.7, §4.8, §14.4, §14.5 (declaration + challenge + timer design) |
| C — Game Options / House Rules | §11 (`UnoGameOptions` addition), §14.6 (stacking extension point), §7.2 |
| D — Match Lifecycle & Scoring | §4.9, §7.9, §12 (`UnoResultModal`) |
| E — UX and Game Feel Upgrade | §8.4, §16, §17 |
| F — FTUE / Onboarding | §7.8 (tutorial slide additions) |
| G–L | Platform-level; see roadmap directly, no UNO-specific detail added here |

---

## 23. Task Breakdown

```
Epic: UNO Official Rules Completeness (Phase A/B)
 ├─ [DONE] Test scaffolding: extended server/src/games/uno/__tests__/engine.test.ts with §20.1's
 │         missing coverage (32 tests, up from 6) — deck composition, play validity, action
 │         cards, win detection, reshuffle, Wild-start-color gap
 ├─ [DONE] Bug fix (found while writing the above): Reverse never actually reversed turn
 │         order in any player count — direction was cosmetic-only. Fixed via a direction-aware
 │         stepIndex() helper + explicit 2-player Reverse-as-Skip branch (§4.4)
 ├─ [DONE] Rule contract: §4.11's matrix is the frozen source of truth (this document)
 ├─ [DONE] Fix: valid-starting-card re-draw instead of default-to-Red (§4.2)
 ├─ [DONE] Feature: Wild Draw Four legality snapshot + challenge/acceptDraw state machine
 │         (§4.3, §14.5) — engine only; client-side helpers/validation.ts unchanged
 │         (Wild+4 legality was never enforced at the matching layer, by design)
 ├─ [DONE] Feature: UNO declaration state machine (§14.4, §4.7) — declareUno/catchUno move
 │         types, canDeclareUno/syncUnoDeclaration, bot auto-declare via applyAutoMove
 ├─ [DONE] Feature: turn timer scheduling — UnoEngine gained setOptions/setTurnDeadline/
 │         clearTurnDeadline/getTurnTimerSeconds/getTimeoutActor; RoomManager gained
 │         instanceof UnoEngine branches in scheduleTurnTimer/onTurnTimeout (§4.8) —
 │         proven end-to-end by server/src/rooms/__tests__/unoTimer.test.ts
 ├─ Tests: 52 engine tests (games/uno/__tests__/engine.test.ts) + 1 RoomManager
 │         integration test — full server suite 199/199, typecheck clean both packages
 └─ UI (Phase 3, not yet started): UnoCallButton, UnoCatchPrompt, UnoDeclareCountdownRing,
            WildDrawFourChallengePrompt, UnoActionToast already wired to show pendingChallenge/
            unoDeclaredBy transitions once built (§12)

Epic: House Rules & Room Options (Phase C)
 ├─ [DONE] shared/types.ts: UnoGameOptions + DEFAULT_UNO_OPTIONS (mirror RummyGameOptions)
 ├─ [DONE] CreateRoomPayload.unoOptions?: Partial<UnoGameOptions> wire-contract field
 ├─ [DONE] turnTimerSeconds: fully wired end-to-end — engine (Phase 2) + a Fast/Standard/
 │         Relaxed/No-timer selector in GameRoomSheet.tsx (Phase 3), matching the app's
 │         actual per-game-options convention rather than a bespoke "lobby panel"
 ├─ RoomManager/UnoEngine: read and enforce the 6 house-rule flags (still all inert)
 ├─ Engine: stacking via pendingDrawStack extension point (§14.6)
 ├─ Engine: jump-in, seven-swap, zero-rotate, keep-drawing, force-play branches
 └─ UI: house-rule toggles in GameRoomSheet.tsx once the engine actually reads them
         (no separate UnoHouseRuleOptions component — see §12's scope-correction note)

Epic: Scoring & Results (Phase 3/4)
 ├─ [DONE] Engine: point-table scoring on win (§4.9) — pulled forward from Phase D
 ├─ [DONE] Client mirror: helpers/scoring.ts (cardPoints/handPoints, unused until a
 │         results screen consumes it)
 ├─ UI: UnoResultModal, remove UNO from generic-scorecard fallback path (§7.9) — Phase 4
 └─ Illustration: request/commission gameover art or reuse generic pair — Phase 4

Epic: Game Feel Polish (Phase 3/4)
 ├─ [DONE] UnoActionToast surfacing state.lastAction (§8.4) — also now covers the
 │         "waiting for X to accept/challenge" moment during a pending Wild+4
 ├─ [DONE] UnoCallButton (uno-declare.tsx) + seat-level catch affordance (uno-shared.tsx)
 ├─ [DONE] WildDrawFourChallengePrompt (uno-challenge.tsx)
 ├─ [DONE] Tutorial slides for declaration + challenge, UNO_TUTORIAL bumped v1 → v2
 ├─ Card play/draw travel animations (§16) — Phase 4
 ├─ Reverse/Skip visual flourishes (§16) — Phase 4
 ├─ Remaining audio cues: shuffle, deal, reverse, skip, victory, defeat (§17) — Phase 4
 └─ Reduced-motion pass across uno-deal.tsx (§19) — Phase 4

Epic: Onboarding Refresh (Phase F)
 └─ Add tutorial slides for UNO declaration + Wild+4 challenge once B ships (§7.8)

Epic: Illustration & Theme Completion (cross-cutting, not gated to a phase)
 ├─ Deliver lobby-prop-uno art
 ├─ Deliver corner-uno art
 └─ Reconcile UNOTile.png into the illustrations.ts token system (or document exception)
```

---

## 24. Definition of Done

**Product:**
- Every row in §4.11's rule matrix reads 🟢.
- A player can complete a full match start-to-results without hitting a single 🔴-marked gap from this document.
- House rules are host-configurable in a private room and never available in any future ranked context (forward-compatible with Phase I, even though ranked doesn't exist yet).

**Technical:**
- `server/src/games/uno/__tests__/engine.test.ts` covers every item in §20.1/§20.2.
- No client-side optimistic validation (`helpers/validation.ts`) diverges from server-side `isValidPlay` — verified by a shared-fixture test if feasible, or a manual audit checklist otherwise.
- `state.turnDeadline` and `state.lastAction` are both actually consumed by the UI. `state.lastAction` ✅ done (§8.4, `UnoActionToast`). `state.turnDeadline` still not set server-side (§4.8) — the client-side `TurnTimeWarning` wiring remains dead code until Phase B.
- No new route was added — everything lives inside the existing `Room.tsx` → `UnoBoard` tree (§10).

**Design:**
- UNO has its own results screen, no longer falling through to the generic scorecard (§7.9).
- `lobby-prop-uno` and `corner-uno` illustration keys are non-null in `illustrations.ts`.
- Reduced-motion is respected across every UNO-specific animation, matching the platform-wide pattern already set by `IllustrationSlot`.

**QA:**
- Manual pass at 375 / 768 / 1024 / 1440 on both shells, covering: normal play, Wild, Wild+4 + challenge, UNO declare + missed-declare-caught, house rules on/off, bot-filled room, mid-match disconnect/reconnect, draw-pile exhaustion.
- Accessibility checklist from §19 signed off (color-blind safe, screen-reader labels, keyboard path, contrast, touch targets).

---

## Final Notes

The existing UNO implementation is a strong, correctly-architected foundation — server-authoritative, cleanly separated (dumb shells / one logic hook / pure helpers), already visually distinctive within Bhalyam's notebook identity. The work remaining is real but well-scoped: **finish the official rules** (declaration and Wild Draw Four are the two rule-completeness gaps that matter most), **give it a results screen worthy of the rest of the board**, and **layer house rules and AI depth** on top of extension points that already exist in the code rather than requiring a rewrite. Everything in Volumes 5–7 about seasons, ranks, and moderation is real product vision for Bhalyam as a platform — it is not UNO-specific work, and treating it as such would be the single biggest planning mistake this document is written to prevent.
