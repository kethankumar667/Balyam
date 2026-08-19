# TUTORIAL-REMEDIATION-REPORT.md

> **Phase 2 (Sprint A) of the BHALYAM P0/P1 Design & Trust Remediation.**
> The documented, screenshotted defect: a first-play tutorial auto-opens over the board regardless of match
> state, and the turn timer underneath keeps running while it does — a new player can lose their first turn
> to a modal telling them how to take one. Fixed at the root: the deck now waits for a safe moment to
> auto-open, rather than the server's turn timer being touched.

---

## 1. Why this is a client-only fix

The turn timer is **server-authoritative** — `RoomManager.turnTimer` (`server/src/rooms/RoomManager.ts`) is
a real `setTimeout` that fires regardless of what the client is showing. Pausing a *client-side* countdown
display would have been purely cosmetic: the server would still time the player out at the same wall-clock
moment, so the bug would still occur, just with the countdown hidden instead of visible. The plan
deliberately ruled this out (also: a client-triggered pause on a server timer is an abuse vector — a player
could hold a modal open indefinitely to stall their own clock).

**The actual fix is the deck's auto-open condition**, not the timer: never let the tutorial cover the board
while a live deadline is running against this player. That is fully solvable client-side, and is what
`docs/ai/ui-ux-standards.md`'s tactile-feedback principle implicitly requires — an overlay should never sit
between a player and a clock that is actively costing them something.

## 2. The mechanism

`useTutorialGate(storageKey, canAutoOpen = true)` (`client/src/components/GameTutorial.tsx`) previously
computed its initial `open` state **synchronously at mount** from `localStorage` alone — no awareness of
match state was possible from a lazy `useState` initializer. It now:

1. Starts `open: false`.
2. Runs an effect that checks `canAutoOpen`. If `false`, it does nothing and **does not consume the
   "already seen" check** — so a first-time player who happens to load mid-turn still sees the tutorial,
   just once it becomes safe, not never.
3. Once `canAutoOpen` is `true` and the deck has not been auto-opened yet this mount, it checks
   `localStorage` and opens if genuinely unseen.
4. A `hasAutoOpenedRef` guard means it opens **at most once per mount** regardless of how many times
   `canAutoOpen` flips afterward — it does not re-interrupt a player who already saw it and closed it, even
   if their turn state changes again.

`canAutoOpen` defaults to `true`, so every call site that does not pass a second argument is **behaviourally
identical to before** — this is additive, not a breaking change to the 3 games that could not be safely
guarded (§4).

Ludo does not use the shared hook (it has its own bespoke `showInstructions` state in `useLudoBoard.ts`,
noted in the original audit) and was given the identical mechanism directly, since it is the one board with
a screenshotted reproduction.

## 3. Guarded — 13 of 15 shared call sites, plus Ludo's bespoke copy

Each guard reuses a boolean **already computed and already displayed elsewhere in that exact file** — the
same value driving that board's own `TurnTimeWarning` / `DeadlinePill` / turn-timer chip. Nothing new was
invented per game; the fix is applying an existing, proven "is a clock live against me right now" signal to
a second consumer.

| Game | Files | Guard condition | Existing signal it reuses |
|---|---|---|---|
| **Ludo** | `useLudoBoard.ts` (bespoke) | `!myTurn \|\| state.turnDeadline === null` | The header countdown chip reads the same `turnDeadline` |
| DotsBoxes | Mobile + Desktop | `!myTurn \|\| state.turnDeadline === null` | `<TurnTimeWarning active={myTurn && state.phase === "playing"}>` |
| UNO | Mobile + Desktop | `(!myTurn && !isChallengeTarget) \|\| state.turnDeadline == null` | `<StadiumTurnTimerPill>` / `<TurnTimeWarning>`'s own `active` condition |
| RPS | Board Mobile/Desktop + Broadcast Mobile/Desktop (4 files) | `!iNeedToChoose \|\| roundDeadline == null` | `<TurnTimeWarning>` / `<ProRoundClock>`'s own `active` condition |
| Star Game | Mobile + Desktop | `(!iNeedToSelect && !iNeedToPass) \|\| deadline == null` | `useStarBoard`'s own `iNeedToSelect` / `iNeedToPass` fields |
| SNL | Mobile + Desktop | `!myTurn` | `useSnlBoard`'s own `myTurn` field (no `turnDeadline` exists in `SnlState` to also check — see §4) |

**13 files changed** (12 shared-hook call sites + Ludo's bespoke copy).

## 4. Not guarded — 3 call sites, and why

`HandCricketBoardMobile.tsx`, `HandCricketBoardDesktop.tsx`, `HcBroadcastShell.tsx` still call
`useTutorialGate(HANDCRICKET_TUTORIAL.key)` with no second argument — **unchanged from before this pass**,
which means unchanged behaviour, not a regression.

Checked directly: none of these three files reference `TurnTimeWarning`, `turnDeadline`, or any
`myTurn`-equivalent field at all —

```
$ grep -rln "TurnTimeWarning\|turnDeadline\|\.deadline\b" client/src/games/handcricket/*.tsx
(no matches)
```

Unlike the six games above, Hand Cricket has no existing "is a clock live against me" signal anywhere in
its board components to reuse. `HcState`'s `phase: HcPhase` is a multi-stage flow (toss → batting → bowling
→ …) that plausibly has its own timing model, but guessing at the correct condition without one already
proven in this codebase risks writing something *wrong* — a guard that fails to protect on the actual
unsafe moment, or one that blocks the tutorial from ever opening. Per the plan's "100% accuracy" standard,
an absent fix that is honestly reported is preferable to a fabricated one. **This is the one item in Sprint
A carried forward rather than closed** — see `UI-REMEDIATION-SUMMARY.md`.

## 5. Also considered and rejected

- **A generic `turnDeadline`-only guard applied blindly to all 15** — rejected because SNL has no
  `turnDeadline` field in its public state at all; a guard that reads a field that doesn't exist would
  either be a type error or silently always-true, and Star Game and UNO both need an *action-specific* flag
  (`iNeedToSelect`/`iNeedToPass`, `myTurn`/`isChallengeTarget`) rather than a bare turn-ownership check,
  because more than one condition can require the player's attention.
- **Pausing `RoomManager.turnTimer` while a tutorial is open** — ruled out per §1: wrong layer, and an
  abuse vector.

## 6. Verification

```
$ cd client && npm run typecheck   → clean
$ cd client && npm run build       → clean
$ cd client && npm test            → 64 files / 501 tests passing (0 regressions)
```

**End-to-end reproduction of the exact documented defect**, dev server, fresh room, mobile viewport:

1. Created a Ludo room, added a bot, readied up, started the match.
2. **Screenshot at match start**: Auditor's seat card shows a live **`18s`** countdown (their own first
   turn), "Tap to roll" is visible and interactive, **no tutorial overlay** — where the original audit's
   screenshot showed the identical moment fully covered by "How to play Ludo" with the countdown ticking
   invisibly behind it ("10s left" → "3s left").
3. Rolled the dice to end the turn, then polled every 2s for 30s. The tutorial stayed closed for the full
   18 seconds of the live countdown, then **opened automatically at t=20s**, in the toast-visible moment
   after "Pintu couldn't [move]" — i.e. once it was genuinely no longer costing Auditor a turn.

Both halves of the fix confirmed in one continuous run: the tutorial never covers a live turn, and it still
reaches every first-time player at the next safe moment rather than being silently disabled.

## 7. Files changed

- `client/src/components/GameTutorial.tsx` — `useTutorialGate` gains `canAutoOpen`
- `client/src/games/ludo/useLudoBoard.ts` — bespoke gate rebuilt on the same mechanism
- `client/src/games/dotsboxes/{DotsBoxesBoardMobile,DotsBoxesBoardDesktop}.tsx`
- `client/src/games/uno/{UnoBoardMobile,UnoBoardDesktop}.tsx`
- `client/src/games/rps/{RpsBoardMobile,RpsBoardDesktop,RpsBroadcastMobile,RpsBroadcastDesktop}.tsx`
- `client/src/games/stargame/{StarBoardMobile,StarBoardDesktop}.tsx`
- `client/src/games/snl/{SnlBoardMobile,SnlBoardDesktop}.tsx`
