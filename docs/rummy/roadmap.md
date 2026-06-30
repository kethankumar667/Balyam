# Bhalyam Rummy — Nostalgia Roadmap

Phased, prioritised plan for layering nostalgia and engagement over the existing Rummy. Each item names the pillar it serves (see [nostalgia-brief.md](nostalgia-brief.md)) and the file(s) it touches.

Pillar legend: **R**=Ritual, **B**=Belonging, **M**=Memory, **S**=Storytelling, **St**=Stakes.

Effort legend: **S**=≤1 day, **M**=2-4 days, **L**=1-2 weeks.

Layout legend: **📱**=mobile shell, **🖥**=desktop shell, **🤝**=both. Per AGENTS.md Section 6, every visible task must land in both shells.

---

## Phase 0 — Foundations (do first, unblocks the rest)

These are not user-visible. They make every later task cheaper.

| # | Task | Pillar | Effort | Files |
|---|---|---|---|---|
| 0.1 | Extract a `nostalgia/` design-token sub-module from `tailwind.config.js`: handwriting score-sheet colour, lamp-light warm gradient, paper-grain background, brass tray gold. Keeps the BHALYAM palette untouched. | foundation | S | `tailwind.config.js`, `client/src/index.css` |
| 0.2 | Add a single shared `<NotebookSheet>` primitive (paper background + ruled lines + Caveat font). Used by score sheet, history card, declaration moment. **One** component, two layouts via props. | foundation 🤝 | S | `client/src/components/nostalgia/NotebookSheet.tsx` |
| 0.3 | Add a tiny `<KettleSound>` / `<DealSound>` / `<RummyCall>` audio cluster as a single `useRummyAmbient` hook layered on the existing `AudioManager`. No new dep. | foundation | S | `client/src/games/rummy/useRummyAmbient.ts` |

Acceptance: 0.1–0.3 land with zero visible change. Every later task imports them.

---

## Phase A — Quick wins (≤ 1 sprint)

High-impact, low-risk. Each is a single PR.

| # | Task | Pillar | Effort | Layout | Where |
|---|---|---|---|---|---|
| A.1 | **Notebook-style end-of-round scorecard.** Replace the current results modal body with a `<NotebookSheet>` that "draws" the round's scores in Caveat handwriting, one row at a time. Winner's name circled. Existing math + close behaviour stays. | R, S | S | 🤝 | `RummyBoardMobile.tsx`, `RummyBoardDesktop.tsx` (the `DesktopRummyScorecard` we just built) |
| A.2 | **Microcopy pass on every empty state and transition.** Loading → "Shuffling…", Between-rounds → "Round N — top up your chai?", Idle warning → "Taking a sip?". One PR, one diff. Strings live in `client/src/games/rummy/copy.ts`. | S | S | 🤝 | new `copy.ts` |
| A.3 | **Soft sound layer (off by default, one toggle).** Shuffle on deal, slap on discard, "rummy!" call on declare, distant kettle between rounds. Wire via the new `useRummyAmbient` hook. Respect existing `AudioManager` mute. | R | S | 🤝 | hook + 3 wav files in `client/src/assets/audio/rummy/` |
| A.4 | **Room name persistence.** Host names the room once ("Friday Rummy Nights") — server stores it on the `Room`, client renders it on the lobby header and lobby share card. Existing 6-char code stays. | B, M | S | 🤝 | `shared/types.ts` (`Room.name`), `RoomManager.ts`, `Room.tsx`, `RoomCodeShare.tsx` |
| A.5 | **"Last gang" memory.** Client-side `localStorage` of the last 3 distinct rosters the player joined. Surface as a one-tap chip on the home screen: "Re-invite Friday Rummy Nights → WhatsApp". No new server work. | B, M | S | 🤝 | `client/src/store/`, `BhalyamHome.tsx` |
| A.6 | **Bot one-liner tells.** Each bot gets a single static "tell" string surfaced in the in-game chat once per match ("Anand always hoards jokers. Old habits."). Pure cosmetic — no engine change. | B, S | S | 🤝 | `RoomManager.ts` (one emit on game start), `RummyBoard*.tsx` (chat surfaces it) |
| A.7 | **"Rummy!" call sound bank.** 3-4 short voice clips (familial voices, not announcer) randomised on a valid declare. Replaces the current generic win tone for Rummy only. | R, S | S | 🤝 | assets + `RpsBoard*.tsx` wiring |

**Phase A acceptance**: a non-technical playtester opens the app, plays one round on mobile and one round on desktop, and says some version of *"this feels different — like home."* If they say *"this feels polished"*, we haven't shipped the brief. Iterate.

---

## Phase B — The room remembers (1-2 sprints)

Memory pillar in earnest. Requires light server work (in-memory only — no DB).

| # | Task | Pillar | Effort | Layout | Where |
|---|---|---|---|---|---|
| B.1 | **Per-room match log.** Server keeps the last N rounds' scorecards in memory on the `Room`. Survives reconnect; lost when the room collapses. Schema: `room.history: RoundRecap[]`. | M | M | 🤝 | `RoomManager.ts`, `shared/types.ts` |
| B.2 | **"Photo album" lobby panel.** Between rounds, a quiet card scrolls past previous round recaps in NotebookSheet style ("Round 2 — Lakshmi declared with a pure 7-8-9 of hearts"). Tap to expand on mobile; side panel on desktop. | M, S | M | 🤝 | new `<RummyRoomHistory>` |
| B.3 | **Session-wide pool champion title.** When a pool match ends, the winner is the room's "House Champion of {date}". Surfaced on the room header next session if the same gang reconvenes. | St, B | S | 🤝 | server stores `champion: { playerId, date }` per room name |
| B.4 | **Printable score sheet (download/share PDF or PNG).** End-of-match button: "Save the sheet". Uses `<NotebookSheet>` rendered to canvas → PNG. No new server route. | R, M | M | 🤝 | client-only |
| B.5 | **Festival skin window.** Around Diwali, Sankranti, Holi, Christmas, Pongal: the lobby + card backs gain a subtle festival accent (a diya glow, a kite motif). Time-windowed, never paywalled, never countdown-pressured. | R, S | M | 🤝 | one config table in `client/src/games/rummy/festivals.ts` |

---

## Phase C — Accessibility = Nostalgia (1 sprint, parallelisable)

Grandparents play this game. This phase is not optional polish — it's the brief.

| # | Task | Pillar | Effort | Layout | Where |
|---|---|---|---|---|---|
| C.1 | **Large-text mode toggle.** A global setting that bumps Rummy's card faces, score chips, and turn indicator by ~20%. Reads from `GlobalSettings`. | foundation 🤝 | S | 🤝 | `GlobalSettings/`, `RummyBoard*.tsx` |
| C.2 | **High-contrast card faces** option for low-vision players. Black-on-cream, no decorative engraving. Existing deck stays default. | foundation 🤝 | S | 🤝 | `Card.tsx` variants |
| C.3 | **Voice narration of "your hand" on tap-and-hold.** A long-press on the player's hand area triggers a SpeechSynthesis read-out: "Seven of hearts, eight of hearts, jack of clubs…". Native API only — no new dep. | B 🤝 | M | 🤝 | new helper in `client/src/lib/speak.ts` |
| C.4 | **Pure-keyboard rummy on desktop.** Number keys 1-13 select card, D = discard, S = sort, ENTER = declare. Already partly possible — formalise + document in the desktop layout. | foundation 🖥 | S | 🖥 | `RummyBoardDesktop.tsx` |
| C.5 | **`prefers-reduced-motion` honoured everywhere.** Notebook draw animation, dice/shuffle micro-animations, sound layer — all gated. | foundation 🤝 | S | 🤝 | sweep |

---

## Phase D — Bigger systemic moves (parked until A-C feel right)

Don't start these until Phase A–C have shipped *and* a real player session says the brief is landing. These are deliberately listed last so they don't pull focus from the cheap, high-signal wins above.

| # | Task | Pillar | Effort | Layout | Notes |
|---|---|---|---|---|---|
| D.1 | **Persistent accounts (optional).** Lightweight account linking so the "room name" and "last gang" memory survives device changes. Only consider when the in-memory version proves valuable. | M, B | L | 🤝 | requires the first DB in the codebase — the AGENTS.md "what this file does not know" caveat becomes real |
| D.2 | **Spectator mode — friends only, opt-in by host.** Lets the grandfather who can't play tonight still watch. Strictly closed-room. | B | L | 🤝 | engine signal already supports `getPublicState`; UI work is real |
| D.3 | **Voice-call layer for Rummy specifically.** The room *is* the family voice room. Auto-mute on declare so everyone hears the "rummy!" call. WebRTC mesh already exists; this is a UX wrapper. | B, R | M | 🤝 | reuses `VoicePanel`; new auto-mute rule |
| D.4 | **Family-tree avatars.** Players upload a photo once, choose a relationship label ("nani", "cousin Ravi"). Avatars appear with the label in the seat ring. Strictly per-room; never platform-wide. | B | L | 🤝 | hits storage — defer until D.1 lands |
| D.5 | **Smarter, kinder bots.** Each bot has 2–3 documented quirks (Lakshmi keeps too many jokers; Anand discards spades early). The "tell" from A.6 actually reflects play behaviour. | B, S | M | 🤝 | engine `botArrange.ts` evolves |

---

## What gets done first, in plain English

1. Land **Phase 0** (foundations). Nobody sees anything change. Code is now cheaper to extend.
2. Ship **Phase A** as a single themed release — call it "Rummy at Home". One playtest with a non-technical family member determines whether the brief landed.
3. If A landed: ship **Phase B** (the room remembers) and **Phase C** (accessibility) in parallel — different files, different reviewers, no merge conflicts.
4. Stop. Live with it for a month. Watch what real players do.
5. Only after step 4 do we touch **Phase D**. Every item in D adds infrastructure (DB, storage, voice-call orchestration). Don't pay that cost until the cheap wins have proven the direction.

## How to add a new task to this roadmap

- Tie it to at least one pillar from [nostalgia-brief.md](nostalgia-brief.md). If you can't, drop it.
- Check it against [anti-patterns.md](anti-patterns.md). If it's on that list, drop it.
- Pick the right phase. New ideas default to Phase D unless they're cheap *and* high-signal.
- Add the layout marker (📱 / 🖥 / 🤝). Per AGENTS.md Section 6, missing the marker means the task isn't ready.

## What this roadmap deliberately does not do

- No timelines in calendar weeks. We don't know how many people will work on this. Effort labels are relative.
- No story-point estimates. Same reason.
- No mention of monetisation milestones. See [anti-patterns.md](anti-patterns.md).
- No dependency-graph diagram. The phases are the dependency graph: 0 unblocks A; A's playtest gates B-C; B-C gate D.
