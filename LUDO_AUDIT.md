# Ludo Implementation Audit — code vs. `LUDO_ENGAGEMENT_ROADMAP.md`

> Read-only audit. No code changed. Applies the **ponytail-audit** lens
> (over-engineering / duplication, tags `delete:` `stdlib:` `native:` `yagni:`
> `shrink:`) inside the broader structure requested: implemented / partial /
> missing features, architectural risks, reusable components, duplicate
> opportunities. Every claim cites the file (and line where it pins a fact).
> Audited 2026-06-26 against the Ludo client (`client/src/games/ludo/`,
> `client/src/components/LudoColorPicker.tsx`), server
> (`server/src/games/ludo/`, `server/src/rooms/RoomManager.ts`), and
> `shared/types.ts`.

---

## 0. Verdict (read this first)

- **The roadmap is honest.** Its "already shipped" table matches the code; its
  gaps are real. Nothing in the roadmap is secretly already done, and nothing it
  calls "missing" actually exists.
- **The mechanics are complete and competitive**; the gaps are identity (audio,
  themes, skins), modes, and retention — exactly as the roadmap states.
- **Two concrete drags on the roadmap exist *today*, before any feature lands:**
  1. a **dev-only second board engine** (`boards/` + `PreviewLudo.tsx`) that
     duplicates the live polygon board, and
  2. **client/server geometry duplication** (`board-layout.ts` ↔ `track.ts`,
     mirrored again in `predict.ts`/`animation.ts`) that the roadmap's mode work
     (P3) will silently break if not addressed.
- **One feature is half-built and orphaned:** token nicknames (server-complete,
  no client UI) — roadmap P0.2.

---

## 1. Already implemented (roadmap "done" + baseline)

Verified present and wired into the live game:

| Capability | Evidence |
|---|---|
| Cross board (≤4) + polygon board (5–8) | `polygon-board.ts`, `PolygonBoardSVG.tsx`, `ludo-board-composites.tsx:142-161` |
| Full rules: capture, home stretch, exact-roll finish, bonus-on-6, triple-six forfeit | `LudoEngine.ts:152-271` |
| **Mandatory Capture** variant (home locked until first capture) | `LudoEngine.simulateMove:328-334`, `InstructionsModal.tsx:44-54` |
| `noSafeSquares` option | `LudoEngine.ts:349-352`, `shared/types.ts:257` |
| Bot AI (danger/stacking/escape/yard-urgency) + humanised pacing | `LudoEngine.pickBestMovableToken:584-673`, `RoomManager` bot loop |
| Server turn timer (20s) → AI auto-skip | `RoomManager.ts:782-786`, `LudoEngine.pickAiMove:468-527`, `turnDeadline` in state |
| Step-by-step token walk animation (160ms/step) | `useLudoBoard.ts:466-538`, `animation.computeStepPath` |
| Capture sad-face 😵, per-home mini-burst, token celebrate-bob, mandatory-unlock burst | `useLudoBoard.ts:550-595, 420-443` |
| Win ceremony (crown + rays, 3s) → recap card w/ per-player stats, copy/download PNG, rematch | `WinnerCelebration.tsx`, `EndGameCard.tsx` |
| Event toasts, confetti, **lucky-moment** banner (6+capture), hover destination preview | `useLudoBoard.ts:182-217, 364-384, 340-362` |
| Chat + **WebRTC voice** + floating emoji reactions (16) + emoji rain + **live opponent cursors** | `InlineRoomRail`, `ReactionBar.tsx`, `CursorLayer.tsx`, `useLudoBoard.ts:219-309` |
| Color-blind glyphs, high-contrast, 3 themes, keyboard shortcuts (R, 1–4), per-player bg tint | `settings.ts`, `Token.tsx:9-18`, `useLudoBoard.ts:386-418` |
| Mobile + desktop shells via `useViewport` (AGENTS §6) | `LudoBoard.tsx`, `LudoBoardMobile.tsx`, `LudoBoardDesktop.tsx` |
| Pass & Play (Ludo is on the allow-list) | `RoomManager.ts:376-393`, `412` |
| Lobby color picker (4 cardinal) + turn haptics | `LudoColorPicker.tsx`, `useLudoBoard.ts:128` (`useTurnHaptics`) |

**Conclusion:** the roadmap correctly excludes all of the above from its task
list. No rework needed here.

---

## 2. Partially implemented (roadmap counts these as gaps — accurately)

| Roadmap item | What exists | What's missing | Evidence |
|---|---|---|---|
| **P0.2 Token nicknames** | Full server path: `Player.tokenNicknames`, `RoomManager.setTokenNicknames`, `room:setTokenNicknames` socket | **No client UI** to set them; `Token.tsx` never renders a nickname | `RoomManager.ts:663-674`, `sockets/index.ts:70-72`, `shared/types.ts:23-24`; no client refs found |
| **P0.3 Louder capture** | Sad-face 😵 + 2-note capture SFX + toast + lucky banner | No token **fly-back arc** (captured token *snaps* to yard) nor bold "CUT!" callout | `animation.ts:36-38` (snap), `sound.ts:52-56` |
| **P1.3 Dice haptics + win cheer** | Turn-change haptics via `useTurnHaptics` | No haptic on the **roll action** itself; no win **crowd-cheer** audio | `useLudoBoard.roll():448-456` (no haptic call), `WinnerCelebration.tsx` (visual only) |
| **P2.1 Theme-driven palette** | 3 themes as CSS classes (`theme-classic/neon/paper`, `.hc`) | Board **SVG palette is hard-coded module constants**, not theme-driven; themes can't repaint the board fills | `ludo-board-composites.tsx:139`, hard-coded `YARD_FILL`/`STRETCH_FILL`/`PARCHMENT`/`GOLD` in `ludo-board-shared.tsx:168-183` |
| **P3.2 Master mode** | `noSafeSquares` flag in options | Not surfaced as a named one-tap preset; not in `InstructionsModal` | `shared/types.ts:257` |
| **P5.1 Postcard recap + share** | Recap card + copy-image + download-PNG | No WhatsApp/Web-Share, no postcard styling; `RoomCodeShare` share helpers not reused | `EndGameCard.tsx:212-237` |
| **P5.3 Targeted reactions** | Floating reactions anchored per player card | Can't aim at a *specific* opponent; `room:reaction` payload has no target field | `useLudoBoard.ts:240-248`, `ReactionBar.tsx:11-16` |

---

## 3. Missing (not present anywhere)

| Roadmap item | Confirmation |
|---|---|
| **P0.1 Turn-timer countdown UI** | `turnDeadline` is in `LudoState` and set server-side, but **no countdown renders**; shared `components/TurnTimeWarning.tsx` is **not imported** anywhere in `client/src/games/ludo` |
| **P0.4 Quick-chat phrase presets** | `ReactionBar.tsx` is emoji-only; no preset phrases |
| **P0.5 Reduced-motion support** | No `prefers-reduced-motion` handling in any Ludo file (also an open AGENTS §13 gap) |
| **P1.1 Real sampled SFX via AudioManager** | `sound.ts` is **synthesized Web Audio tones only**; the app's Howler `AudioManager` is never used by Ludo |
| **P1.2 Background ambience bed** | None |
| **P2.2 Desi/festival board themes** | None (only classic/neon/paper) |
| **P2.3 Dice skins** | `Dice.tsx` renders one dot-face style |
| **P2.4 Token skins** | `Token.tsx` renders one pawn (color-blind glyph aside) |
| **P3.1 Quick mode (2 tokens)** | `TOKENS_PER_PLAYER = 4` is a hard constant; no option | `LudoEngine.ts:44` |
| **P3.3 Team-up 2v2** | No team concept in state/engine/options |
| **P4.* retention loops** | No persistence layer at all → stats die on restart; correctly roadmap-gated on storage work |
| **P5.2 Replay / move-history strip** | Only the single most-recent `lastEvent` is kept; no move log |

---

## 4. Architectural risks

Ranked by likelihood × blast-radius on the roadmap.

- **R1 — Client/server geometry is duplicated three ways → drift on P3.** Server
  truth lives in `server/.../track.ts`; the client re-declares the same
  constants/functions in `board-layout.ts:137-182`, and `predict.ts` +
  `animation.ts` re-implement `LudoEngine.simulateMove` (its own comment:
  *"Client-side mirror of the server's move simulator … Stays in sync with
  LudoEngine.ts#simulateMove"*, `predict.ts:9-12`). **P3.1 (2-token) and P3.3
  (teams) change server win/turn logic; the client mirrors won't follow
  automatically.** Today the blast radius is cosmetic (hover preview + walk
  animation), because the server stays authoritative — but the mirrors *will*
  silently mispredict. **Mitigation: hoist the pure geometry into
  `shared/` before P3** (precedent: `shared/hc-rosters.ts`).

- **R2 — No persistence → P4 is hard-blocked.** All Ludo stats
  (`LudoStats.rollCount/captureCount/sixCount/biggestStreak`) live in
  `LudoEngine` memory and vanish on restart (`RoomManager` is in-memory,
  per AGENTS §7). Profiles, badges, leaderboards (P4) cannot be built until the
  strategic storage layer (`ROADMAP.md` Phase B) lands. The roadmap says this;
  the audit confirms it's a true hard dependency, not a nicety.

- **R3 — `useLudoBoard.ts` is a 720-line god-hook.** It owns *every* piece of
  board UI state: roll cooldown, dice animation, instructions, settings, toasts,
  confetti, reactions, emoji-rain, cursors, celebration sequence, capture faces,
  home bursts, hover preview, lucky banner, keyboard, bg-tint, unlock burst,
  step animation, plus geometry helpers (`useLudoBoard.ts:104-721`). **P0–P2
  pile ~6 more concerns onto it** (timer, nicknames UI, ambience, theme data,
  dice/token skins). Without decomposition first, each feature raises merge
  risk and re-render cost. Medium.

- **R4 — Theming must cover *two* renderers.** P2.1/P2.2 must repaint **both**
  `BoardSVG` (cross) and `PolygonBoardSVG` (polygon). The palette currently lives
  as hard-coded constants in `ludo-board-shared.tsx` *and* implicitly in
  `PolygonBoardSVG.tsx`. A theme that only updates one renderer looks half-applied
  at 5–8 players. Plan the palette as shared data both consume.

- **R5 — Two audio engines if P1 is done carelessly.** Adding `AudioManager`
  (Howler) SFX without retiring `sound.ts` leaves two sound systems with two mute
  states. P1.1 must be a **cutover**, not a coexistence (AGENTS clean-cutover
  rule).

- **R6 — `LudoGameOptions` is a 3-field struct that P3 must thread through 5
  layers.** Adding `tokensPerPlayer` / `teams` / `mode` touches `shared/types.ts`
  → `LudoEngine` (win + turn order + token init) → `RoomManager` (`ludoOptions`,
  bot fill) → lobby options UI → `EndGameCard` ("/4"→"/2"). Each is additive and
  safe *if* engine `__tests__` are extended in lockstep (`__tests__/engine.test.ts`,
  `multiplayer.test.ts`).

- **R7 — Color choice is inconsistent for 5–8 players.** `LudoColorPicker` offers
  only the 4 cardinal colors (deliberately — `LudoColorPicker.tsx:6-16`), so
  5–8-player games **auto-assign** purple/cyan/orange/brown with no lobby choice
  (`RoomManager.chooseColor` rejects non-cardinal). Polygon themes (P2.2) will
  surface these colors prominently, re-raising "why can't I pick mine?". Low, but
  worth a decision before P2.

---

## 5. Reusable components

### Reused well (keep leveraging — don't re-invent)
- `InlineRoomRail` — chat/players/voice, mounted by both shells.
- Composite split `LudoStatusBar`/`LudoDiceTray`/`LudoBoardArea`/`LudoOverlays`
  (`ludo-board-composites.tsx`) — the mobile/desktop shells share one functional
  surface; **new UI should extend these composites, not the shells** (AGENTS §6).
- `useTurnHaptics` (`hooks/useHaptics`), `getSocket` singleton, `useViewport`
  (via `LudoBoard.tsx`), and the `Dice`/`Token`/`Avatar` primitives.

### Available but NOT yet reused (the roadmap should pull these in, not rebuild)
- **`components/TurnTimeWarning.tsx`** — shared 10s pulse, unused in Ludo →
  directly serves **P0.1**. Don't write a new one.
- **`components/RoomCodeShare.tsx`** — already implements copy + Web Share +
  WhatsApp `wa.me` fallback → its share helper serves **P5.1**. `EndGameCard`
  currently rolls its own copy/download only.
- **`services/AudioManager.ts`** (Howler, theme switching, `bhalyam.audio.settings`
  persistence) → serves **P1.1/P1.2**; replaces `sound.ts` rather than sitting
  beside it.
- **`services/HapticsManager.ts`** directly (beyond turn haptics) → **P1.3**
  dice-roll buzz.

---

## 6. Duplicate / over-engineering findings (ponytail format)

Ranked biggest cut first. `<tag> <what> — <replacement>. [path]`

- `delete:` **Dev-only second polygon board engine.** `boards/` (Board5/6/7/8.ts,
  BoardView.tsx, kit.tsx, types.ts, index.ts) + the `/preview/ludo` page are a
  full parallel 5–8-player geometry set used **only** by `PreviewLudo.tsx`; the
  live game renders via `polygon-board.ts` + `PolygonBoardSVG.tsx`. `index.ts`
  even states *"there is intentionally no shared generator."* Two hand-tuned
  board systems for the same player counts = the larger of the two is dead from
  production. **Replacement: delete `boards/` + `PreviewLudo.tsx` + its route
  (`App.tsx:74`), or fold the preview onto the live `PolygonBoardSVG`.**
  *Caveat: it's deliberately retained for QA — this is a judgment call, not an
  auto-cut. But it is a maintenance tax that grows with every board change.*
  [`client/src/games/ludo/boards/*`, `client/src/pages/PreviewLudo.tsx`]

- `yagni:` / `shrink:` **Client board geometry duplicates server `track.ts`.**
  `SAFE_SQUARES`, `TRACK_LENGTH`, `STRETCH_LENGTH`, `COLOR_START_POSITION`,
  `lastTrackPosFor`, `PLAYER_COLORS_ORDER` are declared in **both**
  `client/.../board-layout.ts:137-182` and `server/.../track.ts`. Pure
  constants/math, no runtime deps — and they *must* agree (R1). **Replacement:
  one `shared/ludo-geometry.ts`, imported by both sides** (`@shared` alias
  already exists). Removes the predict/animation drift class. [`board-layout.ts`,
  `track.ts`]

- `delete:` **Dead backwards-compat exports on the server.** `track.ts:50-63`
  exports `TRACK_LENGTH` / `COLOR_START_POSITION` / `SAFE_SQUARES` "for older
  code paths" — but **no file in `server/src` imports them** (the client has its
  own copies). **Replacement: nothing — delete the block.** (Folds into the
  shared-geometry move above.) [`server/src/games/ludo/track.ts:50-63`]

- `native:` **Hand-rolled Web Audio synth vs. the Howler dep already shipped.**
  `sound.ts` synthesizes every SFX with raw oscillators while `AudioManager`
  (Howler) sits unused in Ludo. Not a bug today, but **P1.1 should retire
  `sound.ts` into `AudioManager`**, not add a second engine. [`sound.ts`]

- `shrink:` (minor) **Ludo-local `Toast.tsx`** overlaps the app's toast patterns
  (`Room.tsx` toast, `ChatMessageToast.tsx`). Low value to merge; note only.
  [`client/src/games/ludo/Toast.tsx`]

**net: ~ -900 lines possible** (≈ `boards/` ~700–800 + `PreviewLudo` ~130 +
`track.ts` compat ~14), **-0 deps** (Howler stays — used elsewhere). The
shared-geometry consolidation is net-neutral on line count but removes the
highest-risk duplication. *Caveat: the `boards/`/preview cut is a QA-tooling
decision for the owner, not pure dead code.*

---

## 7. Recommended sequencing tweaks (audit → roadmap)

1. **Insert a "P-minus-1: consolidate geometry into `shared/`" before P3.** R1
   turns from latent to active the moment 2-token / team modes ship. Cheapest now.
2. **Decide `boards/` fate before P2.2.** Festival themes mean touching board
   rendering; don't pay the two-engine tax twice. Either delete the preview set
   or repoint `PreviewLudo` at `PolygonBoardSVG`.
3. **Refactor `useLudoBoard.ts` seams before P1/P2 pile on** (split audio,
   reactions/cursors, celebration, and theme concerns into focused hooks).
4. P0.1 and P5.1 are "free" — they consume existing shared components
   (`TurnTimeWarning`, `RoomCodeShare`) the codebase already ships.

---

## 8. Scope notes
- This audit is **read-only**; nothing was modified.
- ponytail-audit's native scope is over-engineering only; correctness/security/
  performance were out of scope and not assessed here beyond the drift risk (R1)
  that the roadmap directly depends on.
- Ludo King feature comparison is inherited from the roadmap (public store
  sources), not re-verified here.
