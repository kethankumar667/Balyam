---
target: client/src/games/handcricket
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-06T14-04-53Z
slug: client-src-games-handcricket
---
Method: dual-agent (A: af052a6e0652d939c · B: a51102541ca1f8ab1)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Excellent live state (RR, RRR, need/balls, partnership) — but `innings.endedReason` renders in nostalgia and nowhere in broadcast, so you never learn *why* an innings ended |
| 2 | Match System / Real World | 3 | Fluent cricket vocabulary, then `Opponent picked southafrica` leaks the raw slug (hc-broadcast.tsx:292) |
| 3 | User Control and Freedom | 1 | Celebration overlay blocks all input up to 4.8s with no dismiss; locked picks have no undo; Leave is one-tap destructive with no confirm |
| 4 | Consistency and Standards | 2 | Emoji/amber `HcCelebrationLayer` mounted over a palette whose kit says "No emoji anywhere" (pro-kit.tsx:18); four controls re-implement `ProButton` inline |
| 5 | Error Prevention | 3 | Strong squad guardrails (composition chips, disabled confirm, quota-disabled bowlers); no confirm on mid-match Leave |
| 6 | Recognition Rather Than Recall | 2 | Disabled pick tiles at `opacity: 0.3` defeat the component's own stated goal of legibility; header matchup is `hidden sm:flex` so phones can't see who they're playing |
| 7 | Flexibility and Efficiency | 2 | No keyboard 1–6 on a layout gated to `pointer: fine` desktops; no repeat-bowler; no skip-reveal |
| 8 | Aesthetic and Minimalist Design | 3 | Handsome and disciplined, but the ball ticker renders three times on desktop and fall-of-wickets twice on the result screen |
| 9 | Error Recovery | 1 | Two text-only dead ends with no recovery action: "Roster unavailable for this team" and "No bowlers or all-rounders in your XI" (the latter fires mid-match and blocks the innings) |
| 10 | Help and Documentation | 2 | 5-slide tutorial behind a 10px button; covers none of powerplay caps, captain/VC requirement, bowler quotas, or the toss convention |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment.** Split verdict, and the split is the problem.

The *shell* is generic. `pro-kit.tsx` — navy ramp, radial floodlight, hairline panels, gold `#F5C451` — is a portable "premium dark dashboard". Change the copy and it's a crypto exchange or an observability console. Nothing in the visual language is cricket, let alone *hand* cricket. The one broadcast-native device is `TeamPlate`, and in the default International category all 12 plates use the same blue (`PRO_SIDES[0].base`, hc-broadcast.tsx:273), so the identity device carries zero information most of the time.

The *content* is deeply specific to cricket. `hc-stats.ts` is written by someone who watches the sport: six balls prints `1.0` not `0.6`; the wicket ball belongs to the previous partnership; a maiden requires a completed over. This could not be lifted into another product.

But **the actual game is the least-designed thing on the screen.** Hand cricket is two humans simultaneously throwing 1–6 — a bluffing duel. That is rendered as a six-up grid of 19px numerals at the bottom of eight panels of derived statistics. No hand imagery, no simultaneity theatre, no opponent model. Meanwhile a fictional roster's economy rates get a 340px dedicated rail.

**Deterministic scan.** `detect.mjs` returned **0 findings** on `client/src/games/handcricket` (exit 0) and **0** on `client/src/games/pro/pro-kit.tsx`. This was verified as a real result, not a skipped scan: no `.impeccable/` config exists to suppress rules, `--no-config` reruns matched, and the same detector returns 34 findings (exit 2) across `client/src`.

The detector and the design review **disagree completely**, and the detector is not wrong — it is narrow. Its rules target bounce easing, gradient text, gray-on-color, broken images, side tabs. Hand Cricket commits none of those. A clean deterministic scan here means "no known anti-patterns", not "good design". Every issue below was found by review, not tooling.

Four flagged rules in `index.css` do reach this surface through `hc-shared.tsx`'s celebration classes: `.hc-celebrate-pop` (:1606), `.hc-six-launch` (:1637), `.hc-streak-wobble` (:1660), `.winner-pop` (:914).

**False positive:** `.hc-streak-wobble` was flagged as bounce easing but its declaration is `ease-out` — the detector matched the animation *name* containing "wobble", not an easing value. (The keyframes do overshoot, so the effect exists; the match path is wrong.)

**Visual overlays.** No user-visible overlay was produced — the detector was clean, so there was nothing to inject. Instead Assessment B drove a real match via CDP (create room → add bot → start → rejoin → play a delivery) and captured the live board at 1440×900 and 390×844 with **zero console errors**. That evidence is stronger than an overlay would have been, and it confirmed the mobile finding directly.

## Overall Impression

This is a well-built, genuinely handsome interface with excellent domain fluency, wrapped around an under-designed core interaction — and it has two input-blocking defects that a code review would not catch.

What works is real: the cricket arithmetic is correct in ways only a fan would notice, and the score bug's tension escalation is a legitimately good piece of design. What doesn't is that ~80% of the pixel budget goes to a scorecard while the one thing you do sixty times a match is the smallest, dimmest, lowest-placed element on the page.

**The single biggest opportunity:** invert the hierarchy. Make the pick the hero.

## What's Working

1. **`hc-stats.ts` and the readouts it feeds.** Pure, unit-tested, and the entire reason this reads as cricket rather than number-guessing. Six balls prints `1.0`; the wicket ball belongs to the previous partnership; a maiden requires `balls.length === 6`. Every derived number a follower looks for is present and correct, so the interface never breaks the fiction with an off-by-one a fan would spot instantly.

2. **Tension escalation on the score bug.** `glow={need <= 12 && ballsLeft <= 12}`, RRR flipping to `PRO.loss` past 12, and the chase meter. The emotional temperature is derived from match state rather than fixed layout, and spent through one existing kit token. Escalation with no new components.

3. **Powerplay pips with role-split advice.** Shows *which* balls are capped before they're bowled, then tells each side what that means in their own terms — "you may only pick 1, 2 or 3" vs "4, 5 or 6 scores risk-free". Teaches strategy at the moment of decision instead of in a rules modal, and makes an asymmetric rule legible from both sides.

## Priority Issues

### [P0] The celebration overlay blocks every input for up to 4.8 seconds
`HcCelebrationOverlay` renders `fixed inset-0 z-[60]` and there is **no `pointer-events` declaration anywhere in `hc-shared.tsx`** — verified by grep, zero matches. It is mounted into the broadcast skin at `HcBroadcastShell.tsx:142` and dismisses only on a timer: 1800ms (four), 2000ms (wicket), 2200ms (six), 3200ms (streak), 4800ms (winner). No close button, no click-through, no Escape.

**Why it matters:** after every boundary and every wicket — the most frequent notable events — both players are locked out of the pick row, the next-batter picker, the bowler picker, Leave and chat. In a game whose appeal is rapid back-and-forth, this is an involuntary stall on exactly the beats that should feel fast.

**Fix:** add `pointer-events-none` to the overlay wrapper (`pointer-events-auto` on the card only if it gains a control); add click/Escape dismiss; cut four/six/wicket holds to ~1200ms.

**Suggested command:** `/impeccable harden`

### [P0] At 1280×720 the pick row can be clipped off-screen with no scrollbar
`HcBroadcastShell.tsx:134` sets the content region to `overflow-hidden` when live. `HcProInnings`'s left column (`hc-broadcast.tsx:1770`) has **no `overflow-y-auto`** — only the right rail (:1777) does. During a powerplay over in a chase the left column's intrinsic height exceeds the clip box, and the bottom of the pick row is simply gone.

**Why it matters:** the only control that advances the match becomes unreachable, with no scrollbar to reveal it, at the exact viewport the router treats as the desktop floor (`HandCricketBoard.tsx:13`). Silent and state-dependent, so it reads as "the game froze".

**Fix:** `overflow-y-auto` on the left column, and make the pick-row panel `sticky bottom-0` with a backdrop so it is always present regardless of column height.

**Suggested command:** `/impeccable adapt`

### [P1] Mobile: the primary action is below the fold, targets under 44px
Confirmed visually — the 390×844 capture of a live match ends at "MAKE YOUR PICK" with the 1–6 row not on screen. Tile arithmetic: 390 − 24 shell − 32 panel − 30 gaps = 304 ÷ 6 ≈ **51px wide**, `py-3` + `leading-none` ≈ **43px tall** — under the 44px minimum on the thumb axis. The "This innings" panel sits *below* the action.

**Why it matters:** on the platform where most party-game sessions happen, players scroll to find the thing they do sixty times a match, then hit it with a thumb on an undersized target.

**Fix:** `sticky bottom-0` pick row with `env(safe-area-inset-bottom)`; raise to `py-4`; move the ticker above the action or behind a disclosure.

**Suggested command:** `/impeccable adapt`

### [P1] The result screen omits the three facts that define a cricket result
`HcProSummary` shows "You win" and two totals. It never states the **margin**, never names a **Player of the Match**, never shows **`endedReason`**. All three already exist — `summarizeMatch()`, `computeManOfTheMatch()`, `innings.endedReason` — and nostalgia uses them. The margin is computed for the celebration overlay and discarded after 4.8 seconds.

**Why it matters:** peak-end. The final screen is what a player carries into the next match, and the default skin's version is strictly worse than the legacy skin's. "You win" with two numbers is a result, not a story.

**Fix:** render `summarizeMatch(state)` as the subtitle, add a Player-of-the-Match row, add an `endedReason` chip to each scorecard header.

**Suggested command:** `/impeccable clarify`

### [P1] `PRO.inkLo` fails AA, and `opacity: 0.3` defeats the pick row's stated purpose
`PRO.inkLo #6F829B` on `PRO.panel #101F35` is **≈4.2:1**, below AA's 4.5:1 — and it is the colour of every `ProLabel`, every stat sub-line, over counts, bowler figures, and every scorecard cell. Separately `HcProPickRow` applies `opacity: 0.3` *on top of* `inkLo`, putting restricted tiles near ~1.5:1 — directly contradicting the component's own comment that disabled options stay visible "so the restriction is legible rather than mysterious".

**Why it matters:** this is the skin's entire secondary type ramp plus its most important disabled state, on a surface people stare at for a full match.

**Fix:** lift `inkLo` to ≈`#8B9CB5` (≈5.5:1), keep `#6F829B` only for ≥14px; raise disabled opacity to ~0.55 and carry "unavailable" with a lock mark or strikethrough rather than opacity alone; `ProLabel` minimum 11px.

**Suggested command:** `/impeccable audit`

## Persona Red Flags

**Casey (distracted, one-handed, mobile).** The pick row is not pinned — on a 375×667 phone it sits below the fold behind the score bug, powerplay strip and a three-row stacked crease bar. Tiles are ~51×43px with an irreversible consequence per tap and no undo. The matchup plates are `hidden sm:flex` and the score bug shows only the batting team's plate, so glancing back after a distraction there is no persistent answer to "which one am I?" except a 9px `YOU` tag. Every boundary and wicket takes the whole screen for ~2s, undismissable — precisely when a distracted player looks back down. The squad picker nests three scrollers (`46vh` / `26vh` / `20vh`) inside a scrolling page.

**Sam (screen reader + keyboard only).** The ball result is **completely silent** — no `aria-live` on the score bug, the reveal, or the pick outcome anywhere in `hc-broadcast.tsx`. The only live region in the game is the *nostalgia* celebration overlay, so a screen-reader user hears "Kohli sends it out of the park!" but never hears the score change, never hears "out", never hears the target. The pick row is six buttons named "1"–"6" with no group name, no `aria-label`, and no `aria-describedby` to the powerplay restriction. On-strike is a 5px span with `title` only — not exposed by most screen readers, unreachable by keyboard, and the sole indicator of who faces next. `ProMeter` has `role="progressbar"` with no accessible name. No focus management across phase transitions. Two dead `sr-only` divs announce a bare "2".

**Jordan (confused first-timer).** "Both picks are added together. Odd total, you call it." never says whose "you" or what "call it" means. Twelve identical blue plates with the subtitle "International" repeated twelve times — no difficulty, no recommendation, no default. "Opponent picked southafrica" — a database key as first impression. The squad picker is 48+ controls with nothing saying "the XI is already valid, just press Confirm". "Classic" is a bare 10px word that silently swaps the visual language of the entire app — including RPS — with no preview, confirmation, or indication it is global. The core rule ("same number = out") appears only in tutorial slide 4.

## Minor Observations

- `prettyName()` exists and is used only as a scorecard fallback, while the team-picker chip that most needs it doesn't call it.
- Desktop innings renders the ball ticker three times; the finished screen renders fall-of-wickets twice.
- `ROLE_TAG` encodes role by code *and* colour (good), but at 8px on `${tone}22` backgrounds it is below any readable contrast floor.
- `HcProBowlerPicker` has a stray `className="h-4.5 w-7"` with an inline `height: 18` override — `h-4.5` is not a Tailwind class.
- `maxWidth` jumps 560 → 1320 → 1500 across phases, so page width visibly snaps between team select, toss and innings.
- "Continue" states no destination; nostalgia at least says "Auto-continues in {n}s". Same game, different behaviour depending on a cosmetic preference.
- `InlineRoomRail` defaults to `variant="dark"` slate — close to, but not from, the `PRO` palette. A near-miss surface inside the broadcast header.
- The overs chip is hidden below `sm`, so on a phone the match format and length are invisible for the whole match.
- Tutorial slides are emoji-led, again contradicting the broadcast skin's stated no-emoji rule.
- On mobile, both striker and non-striker carry a `YOU` tag simultaneously — correct but visually noisy.

## Questions to Consider

1. **If you deleted the score bug, both tickers, fall-of-wickets and the bowling figures, could the match still be played?** It could. So why does ~80% of the pixel budget go to a scorecard for a game whose entire interaction is one tap among six — and why is that tap the smallest, dimmest, lowest-placed element on the page?

2. **Hand cricket is a game about reading one specific human — so where is the opponent model?** The interface tracks the economy rate of a fictional Mohammed Siraj but never shows your actual opponent's last six picks, whether they repeat, or how often they've matched you. The rail is full of stats about people who do not exist and empty of the one dataset that would change your next tap.

3. **Why does the default skin borrow the legacy skin's celebration layer for its emotional peaks?** Either the emoji/amber overlay *is* the payoff — in which case "No emoji anywhere" is a rule the product doesn't hold — or the broadcast skin has no peak of its own. What would a genuinely *broadcast* peak look like? A replay wipe? A lower-third stat sting?

4. **Two skins, ~5,500 lines, and neither is a superset.** Nostalgia has Player of the Match, `endedReason`, a summary sentence and batting-order reordering; broadcast has partnership, RRR, projection and fall-of-wickets. Is "nostalgia" a live product decision, or 3,600 lines nobody wants to be the one to delete? Why do the two disagree about *what information a cricket match produces*?

5. **The toss buttons are ~118×56px and used once. The pick buttons are ~51×43px and used sixty times.** If target size followed frequency and consequence rather than screen real estate, what would this screen look like — and would the score bug survive the reallocation?
