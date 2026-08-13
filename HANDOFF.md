# Session handoff

**State:** all green — client 152/152, server 531/531, both typechecks clean.
Everything below is committed on `session/mobile-bug-batch`, not on `main`.

---

## Shipped and verified

| Area | What changed |
|---|---|
| **Category filter** | Scroll-driven edge fade on mobile — 6 segments, ~4 fit on a 375px phone, and nothing said the row continued. Measured from real scroll position, re-measures on font load / rotation / language switch. Also fixed: tapping a half-visible segment left it half-visible with the thumb off-screen. |
| **Hand Cricket — scorecard** | Order is now Batting → Bowling → Fall of Wickets, in the scorecard *and* the live side column (that one had the same inversion). |
| **Hand Cricket — innings break** | `endCurrentInnings` flipped innings1→innings2 in the same tick, so the scoreboard swapped mid-glance and the next ball was instantly legal. Now a 10s hold with an innings-1 scorecard overlay and a Continue button. Ends on **all players continuing OR the deadline**. Self-expiring on read — no timer to leak. |
| **Space Impact** | Steering existed but only as an invisible canvas gesture, so players found four labelled buttons and concluded firing was the whole game. Added an explicit pad off the play area. Also fixed: no `pointermove` (drag never re-aimed) and no `pointercancel` (**the ship flew on forever when the OS took the pointer**). |
| **Bingo** | Rebuilt. See below — it was the biggest one. |
| **Chess — move hints** | Flat translucent disc / scaled capture ring, sized in % so they track the square, coloured from each theme's `legalDot` (which was defined in all five themes and read by nothing). |
| **Snake — D-pad** | 48×64 → 64×80, `onClick` → `onPointerDown` (a click waits for finger-*lift*; that lag reads as "the snake missed my turn"), `touch-none` so fast taps aren't claimed as scroll/zoom, drawn SVG arrows instead of `▲◄▼►` block glyphs. |

### Bingo, in detail

The report was "auto-marking doesn't feel real". The cause was worse: `callNumber`
marked every board at once, and **both** `getStateFor` and win evaluation read the
shared `calledSet`, so the per-cell `marked` flag was decorative. No code path
existed where a player marking anything meant anything.

Now:

- Each player owns a `markedSet`; all six board-judging sites read it (the call
  *pool* stays global).
- Numbers go out unmarked. You tap yours on your own card.
- 8s window, then anyone who missed it is marked automatically — boards converge,
  a dropped connection never costs a number.
- **The open number gates the next call.** Load-bearing: the window is 8s but call
  intervals are 2.5–6s, so without the gate the caller races ahead and boards
  drift onto different numbers.
- Auto-mark is per-**player** (accessibility, not difficulty), defaults off.
- Bots and disconnected seats resolve instantly — neither can tap, and making
  eight humans wait on them would be a hostage situation.
- The number is **spoken aloud in the player's own language** via
  `speechSynthesis`, reading the locale from `LanguageManager`. 25 numbers × 7
  languages of voice-over, zero assets.
- Marked cells get a hand-drawn pen strike with the number still readable —
  you scan a bingo card for *lines*, and filled tiles hide them.

---

## Known-remaining work

1. **Chess piece sets** — `ChessPieceSet` (`neo | staunton | 3d_glass`) is written
   by the picker and **read by nothing**; all three render identically from one
   hardcoded Unicode map. Needs real SVG sets (Cburnett + Merida are the standard
   CC-licensed ones). ~36 drawings. Recommend dropping `3d_glass` unless art
   exists — a third named set with no distinct assets just recreates the bug.
2. ~~**Screenshot button**~~ — **DONE.** `svgToPngBlob` only handled SVG boards,
   so HTML/CSS boards fell through to `window.print()`. SVG boards (Ludo, Carrom,
   Chess) keep vector rasterisation; the rest capture the DOM via `html-to-image`.
   Not yet confirmed with a real tap — DOM capture is sensitive to cross-origin
   images and un-inlinable CSS, so one manual check is worth doing.

   **UNO is deliberately out of scope for board preview / screenshot.** It has no
   `BoardPreviewPill` and no `previewMode`, and that is intentional — do not
   "fix" it by adding them.
3. **Snake movement glitches** — the `onPointerDown` fix may have resolved this.
   **Re-test on a real phone before investigating further.** If it persists, we
   need to know which: stutter (rendering), lag (network), or the snake jumping
   cells (tick rate). Three different fixes.
4. **Space Impact levels** — "10 levels, 3 complexity tiers" needs the difficulty
   axes chosen: enemy speed, spawn density, new enemy types, boss frequency?
   Note the engine has **no horizontal movement** (`steer` carries `dy` only,
   the run has only `shipY`); desktop keyboard is up/down too. "Front/back" would
   be a new engine feature, not a missing button.

---

## Things worth knowing before touching this repo

- **The "declared but unwired" bug.** Four instances found: Ludo board themes,
  Bingo auto-mark, chess `legalDot`, chess `pieceSet`. A picker that writes state
  nothing reads — and every one arrived as a *feature request* ("we want board
  themes") for something that had already shipped and silently did nothing.
  I swept the rest: `SnakeTheme`, `StrikerSkin`, `BoardFeltSkin`,
  `ChessBoardTheme` and all six Ludo toggles are genuinely wired. **Only
  `ChessPieceSet` remains.** Not systemic beyond that.
- **The app has no real audio.** `public/audio/themes/**` shipped only `.gitkeep`
  files while 195 manifest URLs 404'd — silent in production, by design
  (`onloaderror` warns in dev only). `npm run audio:placeholders` synthesizes
  stand-ins; real `.mp3` files dropped at the manifest paths win automatically.
- **i18n exists but is barely applied.** `LanguageManager` + 7 locale catalogues
  are built and tested; only 2 of 192 `.tsx` files are migrated. Game *content*
  (Samethalu proverbs, Telugu Cinemalu, English word dictionaries) is not
  translatable — those need per-language corpora, not translation.
- **`client/public/illustrations/` is 33 MB**, five files still named
  `ChatGPT Image ....png` at 2–3 MB each. A WebP pass would likely cut ~90% with
  no visible difference. On the mobile connections these players are on, that is
  probably worth more than any feature listed above.
- **Persistence was built and discarded on 2026-08-05.** The blocker is real and
  unchanged: `GameEngine` has no serialize/restore contract across 19 engines,
  and `Room` holds a live engine instance plus six `NodeJS.Timeout` handles.
  Accounts + match history need none of that and are a normal week's work;
  live-room persistence is the hard one. Only 4 of 19 games record a result.
- **Voice has no TURN server.** `turnStatus()` returns `mode: "none"` without
  env vars, so symmetric-NAT players (mobile carrier data) cannot connect at all.
