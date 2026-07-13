# UNO Board Complete Redesign Plan

## Overview

Full scratch rebuild of the UNO board UI to match the design image: red felt table with wood frame, real card faces, cartoon player avatars arranged around the table, bottom-right control cluster.

**Keep the engine:** `useUnoBoard.ts` hook, `helpers/`, `UnoResultModal.tsx`, `uno-confetti.ts`  
**Replace all:** presentation files — board shells, card components, table layout, HUD, controls

---

## Design Breakdown (from design image)

| Element | Details |
|---|---|
| Table | Red felt `#9B2335` with subtle radial gradient, dark wood-grain frame border |
| Decorations | 6–8 scattered gold stars on felt; bottom-left UNO box + pencils (SVG) |
| Card faces | Colored body + white oval + large center number/symbol + corner indices |
| Wild cards | Black body, 4-color diamond, rainbow oval |
| Card back | Dark with diagonal UNO stripe pattern |
| Players | Circular avatar (initials-colored), nameplate pill (color-coded), card fan, star-level + trophy-points chip |
| Center | Draw pile stack + discard pile top card + curved direction arrows |
| HUD (top) | Room code chip (wood bg), elapsed clock, ROUND n/n, emoji + gear buttons |
| Controls (bottom-right) | Pulsing "UNO!" red/gold button, "N CARD LEFT!" label, `00:12` countdown + orange bar, "TAP TO CHAT" pill |

---

## Files

### KEEP — Game Logic (no changes)

| File | Purpose |
|---|---|
| `useUnoBoard.ts` | Full game logic hook, all socket emits |
| `helpers/deck.ts` | Card display, emoji, labels, sorting |
| `helpers/validation.ts` | canPlayCard, getPlayableCards, requiresColorChoice |
| `helpers/hand.ts` | Hand utilities |
| `helpers/scoring.ts` | Card/hand point calculation |
| `UnoResultModal.tsx` | End-of-round scorecard modal |
| `uno-confetti.ts` | Confetti particle effects |
| `uno-challenge.tsx` | Wild Draw Four challenge/accept prompt |

### REPLACE — Presentation Layer (full rewrite)

| New File | Purpose |
|---|---|
| `uno-card.tsx` | Real card faces — colored body, oval, rank/symbol, corner indices |
| `uno-table.tsx` | Red felt canvas + wood frame + star decorations |
| `uno-center.tsx` | Draw pile + discard pile + animated direction arrows |
| `uno-seat.tsx` | Player seat — avatar, nameplate, card fan, score chips |
| `uno-hand.tsx` | Own playable hand — fanned cards, lift-on-select, glow-on-playable |
| `uno-controls.tsx` | Bottom-right cluster — UNO! btn, timer, chat button |
| `uno-hud.tsx` | Top HUD strip — room code, clock, round, settings |
| `uno-wild-picker.tsx` | Color choice overlay for Wild/Wild+4 |
| `UnoBoardMobile.tsx` | Portrait shell — small opponent chips top, hand bottom |
| `UnoBoardDesktop.tsx` | Landscape shell — players arranged around table (matches design) |
| `UnoBoard.tsx` | Responsive picker → ≥1024px = desktop, else mobile |

---

## Implementation Phases

### Phase 1 — Card Component `uno-card.tsx` *(independent)*

1. `UnoCardFace({ card, size?, selected?, playable?, dimmed?, onClick? })`
   - Rounded rect base with colored body
   - White oval in center with number/symbol in card color
   - Corner indices — rank top-left, rotated 180° bottom-right
   - Action symbols: Skip (`⊘`), Reverse (SVG circular arrows), `+2`
   - Wild: black body, 4-color diamond, white oval with rainbow segments
2. `UnoCardBack({ size? })`
   - Dark background, UNO oval logo, diagonal stripe pattern
3. **Size variants:** `xs` (opponent fan) → `sm` → `md` → `lg` (discard pile)
4. **States:**
   - `selected` — gold ring + lift (+8px)
   - `playable` — subtle white glow
   - `dimmed` — opacity-40

**Card Colors:**
```
R: #D22B27   G: #3AA03A   B: #1C6DD0   Y: #E8B100   Wild: #17181d
```

---

### Phase 2 — Table & Center *(independent, parallel with Phase 1)*

5. `UnoTableSurface`
   - Full-bleed red felt: `bg-[#9B2335]` with radial gradient darkening at edges
   - Wood frame: `bhalyam.wood` border (~16–20px) + layered `box-shadow` for grain
   - 6–8 scattered SVG gold stars (absolute positioned, varied sizes)
6. `UnoCenter({ topCard, deckCount, direction, currentColor })`
   - Draw pile: stacked `UnoCardBack` with 3D offset effect + count badge
   - Discard pile: `UnoCardFace` for topCard + currentColor ring (when wild played)
   - Direction arrows: SVG curved arrows, CSS `rotate` animation (clockwise/counter-clockwise)

---

### Phase 3 — Player Seat `uno-seat.tsx` *(needs Phase 1)*

7. `UnoSeat({ player, handSize, isActive, isSelf, position, score, declared? })`
   - Avatar: circular portrait — player initials on colored circle
   - Active player: animated golden glow ring
   - Nameplate: colored pill (YOU = blue, others = purple/gold/green/yellow per design)
   - Card fan: `handSize` × `UnoCardBack` fanned for opponents
   - Score chip: ⭐ level + 🏆 trophy points
   - "UNO" badge: shown when player is at 1 card and declared
8. **Player position mapping (N players):**
   - N=2: top + bottom
   - N=3: top, left, bottom
   - N=4: top, left, right, bottom
   - N=5: top, left, right, bottom-left, bottom
   - N=6–8: distribute remaining seats around oval

---

### Phase 4 — HUD + Controls *(independent, parallel with Phase 1–2)*

9. `UnoHUD({ roomCode, elapsed, round, totalRounds, onSettings, onEmoji })`
   - Top-left: wood-bg room code chip (copy button), elapsed clock `00:45`
   - Top-right: `ROUND n/n` plate, emoji reaction button, gear/settings button
10. `UnoControls({ canDeclare, onDeclare, onChat, turnDeadline, myTurn, onDraw, canDraw, onPass, canPass })`
    - `UNO!` button: large red/gold pill, `animate-glow-pulse` when `canDeclare`
    - `N CARD LEFT!` label below when own hand = 1 card
    - Countdown `00:12` + orange progress bar (based on `TurnTimeWarning`)
    - `TAP TO CHAT` pill: notebook icon, beige/cream background

---

### Phase 5 — Own Hand `uno-hand.tsx` *(needs Phase 1)*

11. Horizontal overlapping fan of `UnoCardFace` cards
12. Tap-to-select → card lifts (+8px), gold ring
13. Tap selected card again → confirm play
14. Non-playable cards dimmed, playable cards glow
15. Horizontal scroll container for large hands (8+ cards)

---

### Phase 6 — Mobile Shell `UnoBoardMobile.tsx` *(needs Phases 1–5)*

16. Portrait layout (320–1023px):
    - **Top strip**: HUD (room code, clock, round, buttons)
    - **Upper area**: Opponent seats in compact chip form (avatar + count badge)
    - **Center**: Draw + discard pile
    - **Lower area**: Scrollable own hand (face-up)
    - **Bottom-right fixed**: UNO! button + timer + chat button
17. Chat opens as full-screen bottom sheet via `TAP TO CHAT`

---

### Phase 7 — Desktop Shell `UnoBoardDesktop.tsx` *(needs Phases 1–5)*

18. Landscape layout matching design image (≥1024px):
    - 16:9 aspect-ratio canvas, centered in viewport
    - **Top-center**: Opponent 1 (card fan + avatar above)
    - **Left-center**: Opponent 2 (vertical card stack + avatar left)
    - **Right-center**: Opponent 3 (vertical card stack + avatar right)
    - **Bottom-left area**: Opponent 4 (if 5+ players)
    - **Bottom-center**: Self — avatar + name below, hand cards above
    - **Center**: Pile cluster + direction arrows
    - **Top overlay**: HUD strip
    - **Bottom-right cluster**: Controls
19. Chat opens as sliding bottom sheet

---

### Phase 8 — Wire-up `UnoBoard.tsx` *(needs Phases 6–7)*

20. New responsive picker:
    ```tsx
    const isDesktop = window.innerWidth >= 1024;
    return isDesktop ? <UnoBoardDesktop {...props} /> : <UnoBoardMobile {...props} />;
    ```
21. Old files retired: `uno-scene.tsx`, `uno-declare.tsx`, `uno-action-toast.tsx`, `uno-rail.tsx`, `uno-deal.tsx`, `uno-table.tsx` (old)

---

## Reusable Components (from `client/src/components/`)

| Component | How Used |
|---|---|
| `TurnTimeWarning` | 10-second urgent pulsing border overlay |
| `Chat` | Inside chat bottom sheet |
| `VoicePanel` | Inside chat sheet (voice tab) |
| `RematchPanel` | Inside `UnoResultModal` (existing) |
| `GameTutorial` | Tutorial modal, triggered from settings |

---

## Design Tokens Reference

### Tailwind Colors (from `tailwind.config.js`)
```
bhalyam.wood.DEFAULT  = #6D4323  (frame border)
bhalyam.wood.dark     = #4A2C16  (frame shadow)
bhalyam.gold.DEFAULT  = #E4B128  (stars, UNO! button accent)
bhalyam.cream.DEFAULT = #F7E8C4  (TAP TO CHAT background)
bhalyam.ludo.red      = #E53935  (UNO! button body)
player.1–6            = Six distinct player seat colors
```

### Fonts
```
font-display  = Righteous   (UNO! button, card ranks)
font-sans     = Poppins      (player names, labels)
font-mono     = JetBrains Mono (room code)
```

### Animations (already in Tailwind config)
```
animate-glow-pulse   → UNO! button when canDeclare
animate-card-flip    → card dealing animation
animate-shake        → penalty feedback
animate-win-burst    → win celebration
```

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Avatars | Initials-based colored circles | No external image assets needed |
| Card art | Pure CSS / inline SVG | Zero new image assets, full control |
| Breakpoint | 1024px | Matches AGENTS.md standard |
| Old files | Overwrite in place | Clean replacement, no new folder |
| Wood frame | CSS `border` + `box-shadow` | Uses existing bhalyam.wood token |
| Scope | Client presentation only | Server engine and socket events untouched |

---

## Verification Checklist

- [ ] `cd client && npm run typecheck` → clean
- [ ] `cd client && npm run build` → clean, 0 TS errors
- [ ] Browser at **375px** — mobile layout, hand scrollable from bottom, all controls tap-reachable, 0 console errors
- [ ] Browser at **768px** — still mobile layout
- [ ] Browser at **1024px** — desktop shell activates, players around table
- [ ] Browser at **1440px** — matches design image (centered canvas, 5-player arrangement)
- [ ] **2-player game**: only top + bottom seats visible
- [ ] **5-player game**: all 5 position slots filled
- [ ] Game flow: draw → play → UNO! button pulses → wild color picker → confirm
- [ ] Wild+4 played: challenge modal appears for target player
- [ ] Chat sheet opens via TAP TO CHAT, closes on backdrop tap
- [ ] Rematch flow works after round ends (via `UnoResultModal`)
