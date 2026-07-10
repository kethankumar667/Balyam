# BHALYAM — Notebook Illustration Prompts (Production-Ready)

*Refined 2026-07-10. Grounded in the actual component code.*

---

## Grammar rules that apply to every prompt

Copy these into every generation session. They are invariants, not suggestions.

| Rule | Spec |
|---|---|
| **Canvas** | Cream ruled notebook paper — warm cream background (`#F5E9C4`), faint cobalt-blue horizontal rule lines, red vertical margin line on the left edge, spiral binding holes on the left side (unless otherwise noted). |
| **Ink** | Single color only: deep cobalt-blue ballpoint (`#1a2952`). No secondary hues. No flat color fills except an occasional solid-blue silhouette (helmet, filled star). |
| **Line quality** | Confident, slightly imperfect hand-drawn contours. Heavier weight for main silhouettes. Fine parallel/cross-hatching for shading — wood grain, ball seams, fabric folds. |
| **Cast** | One recurring boy character: spiky tousled hair, round friendly face, dot-and-curve eyes, plain or collared tee. Consistent proportions across all sheets. Never redesigned per game. |
| **Lettering** | Always rides a carrier object: torn-ribbon banner, nailed wooden sign, washi-taped index card, notebook cover. Never floats as bare type. |
| **Composition** | One dominant figure/group anchored center-to-lower-half. Small satellite doodles (stars, circles, motion lines) spread through the remaining margin so the ruled paper breathes through the art. |
| **Voice** | Captions are diary lines ("Every Legend starts with One Match!"), not UI labels. "Waiting for Players" belongs. "0 of 4 ready" does not. |

---

## Asset delivery format

| Slot type | Format | Background | Minimum size |
|---|---|---|---|
| Full scene / hero | PNG | Transparent OR cream `#F5E9C4` (see per-prompt) | As specified per prompt |
| Banner (wide, thin) | PNG | Transparent | 1600 × 200 px |
| Circular crop | PNG | Cream `#F5E9C4` (fills the circle) | 520 × 520 px (cropped circular by code) |
| Corner doodle | PNG | Transparent | 128 × 128 px |
| Inline micro-asset | PNG | Transparent | 160 × 80 px or as specified |
| Background vignette | PNG | Transparent | 828 × 1792 px (portrait) |

---

## 01 · Home Hero

**Component:** `BhalyamHome.tsx` → `Hero()` function
**IllustrationKey:** `home-hero`
**Placement:** Behind the hero headline — sits as `<img>` filling the current gradient-scrim area. The headline, Join Room pill, and game tile grid overlay it. Do NOT place elements in the center column.

### Layout constraints from code
- Desktop: illustration fills a wide banner roughly `100vw × 60vh`
- The left ~60% of the desktop frame currently shows a cream gradient scrim and the headline. The illustration must keep this zone visually calm.
- The right ~40% is where the hero artwork should concentrate density.
- Mobile: the image is cropped to roughly 4:3 portrait centered.

### Modifications from original review prompt
- Background **must be transparent** — the existing cream gradient and paper texture render behind it in code. The illustration draws only the ink linework and characters; the paper surface is provided by the page.
- Keep center column completely empty of detailed ink work — only faint margin lines and a very light binding shadow at the top edge.
- The boy character waving should be positioned at the right edge, roughly 60–80% from the left.
- The open notebook + checklist should be left-of-center, kept at low ink density so it reads as a background element behind the headline.
- The game prop still-life (six props) should be scattered in the right third — small, margin-doodle scale.
- The thin grass line at the bottom should sit below the tile grid overlay zone.

### Production prompt

Hand-drawn ballpoint-pen illustration, single deep cobalt-blue ink line (`#1a2952`) on a **transparent background** (no paper fill — just ink), confident slightly-imperfect contours with fine cross-hatch shading. Wide landscape composition, roughly 16:9.

Left-of-center zone (30–50% from left): an open spiral-bound exercise notebook lying flat, its visible page showing a handwritten checklist on a torn-ribbon carrier titled "GAME PLAN" with ticked boxes reading "Invite friends ✓", "Add bots ✓", "Practice ✓", "Have fun ✓". Drawn at half the ink density of the main character — this must read as a background/secondary element.

Right zone (60–95% from left): one cheerful hand-drawn boy character — toushed spiky hair, round friendly face, dot-and-curve eyes, simple collared t-shirt — standing and waving toward the viewer with his right hand raised. Surrounding him in a loose scatter: a cricket bat leaning against his leg, a small fan of three playing cards, a single die with two cone-shaped tokens beside it, a spinning coin with motion-trail arcs, a connect-the-dots corner scribble (4 dots, partial connection), a single alphabet tile with a letter on it. Each prop is small — margin-doodle scale, not hero scale.

Center column (45–60% from left): nearly empty. Only faint ruled horizontal lines crossing through. No characters, no props.

Top edge: a faint horizontal binding shadow line only. No content in the top 8% of the frame.

Bottom edge: a thin hand-drawn grass line with a few small tufts. No characters below the grass.

Scattered throughout remaining margin: 5–7 outline five-point stars, 2–3 small dots-and-circles doodles, faint curly squiggle accents.

Export as PNG with transparent background. No cream paper fill. No solid white background.

---

## 02 · Games Catalog Shelf

**Component:** `GamesPage.tsx`
**IllustrationKey:** `games-shelf`
**Placement:** Full-width horizontal band directly under the page header, above the "Ready to play" tile grid. Approximately 180–200px tall on desktop.

### Layout constraints from code
- The page renders: header → shelf band → 10-tile "Ready to play" grid → 4-tile "Coming soon" section → "Join a room" footer link
- The shelf must read as a header ornament, not a hero — it should be thin, roughly the height of one tile row
- No characters — only objects, so it reads fast and doesn't compete with the tiles

### 10 playable games + 4 coming soon (actual app order)
Playable: Hand Cricket (bat), RPS (three-finger gesture), Rummy (playing cards), Ludo (cross-board + die), Snakes & Ladders (snake silhouette), UNO (action card), Word Building (alphabet tiles), Dots & Boxes (dot-grid corner), Memory Match (face-down card pair), Star Game (folded chit)

Coming soon: Tambola (lottery ticket strip), Name-Place-Animal (nameplate), Telugu Cinema (film reel), Samethalu (palm-leaf scroll)

### Modifications from original review prompt
- Background must be transparent — the page has its own paper background
- The shelf band should be very wide and very short — approximate ratio 8:1 or wider
- Order the objects left-to-right matching the game catalog order above (not the order in the original review)
- The "coming soon" objects should be drawn at slightly lower ink density or with a faint dotted outline around them — same objects, but visually suggesting "not yet open"

### Production prompt

Hand-drawn ballpoint-pen line illustration, single cobalt-blue ink (`#1a2952`), fine cross-hatch shading, **transparent background**. Wide, very low horizontal band — approximately 8:1 aspect ratio (e.g. 1600 × 200 px).

A simple hand-drawn wooden shelf with two visible cross-hatched wooden planks: a back board and a front lip. Cross-hatched wood grain throughout.

On the shelf, left to right, evenly spaced and at identical line weight/size: (1) cricket bat with a small ball beside it, (2) an open hand making a "scissors" two-finger gesture, (3) a fan of three playing cards face-toward-viewer with simplified pip symbols, (4) a cross-shaped Ludo board in slight perspective with one die beside it, (5) a coiled snake silhouette with a simple ladder, (6) a single large-face UNO-style action card with a diagonal symbol, (7) two alphabet tiles with letters on them, (8) a 4×4 dot grid with one closed box, (9) two small face-down cards side by side, (10) a small folded paper chit with a faint star drawn on it. Then — drawn at slightly lower ink density with very faint dotted border around each: (11) a long narrow lottery ticket with horizontal lines, (12) a rectangular nameplate tag, (13) a film reel with the tape unspooling slightly, (14) a rolled-up scroll.

Each object: silhouette-plus-hatching, simplified, at exactly the same ink weight. Like toys tidied onto a shelf after school. No characters. No text on objects. Outline stars scattered in the air above the shelf between objects.

Export as PNG with transparent background. No paper fill.

---

## 03 · Room Creation Corner Doodle

**Component:** `GameRoomSheet.tsx` (and `JoinRoomModal.tsx`)
**IllustrationKey:** `room-create-pencil`
**Placement:** Top-right corner of the sheet header strip, beside the close (×) button. The game glyph + title are to the left. This asset sits at the far right of the header, approximately 48–64px.

### Layout constraints from code
- The sheet is a bottom-sheet on mobile, centered modal on desktop
- Header strip is compact — approximately 56px tall
- The close button is top-right, this doodle would sit just to its left or as its decorative backdrop

### Modifications from original review prompt
- This is purely a tiny corner mark — **not a scene**
- Size: 64×64 px, transparent background
- Single pencil tilted diagonally (roughly 45°), gripped by a small cartoon hand (only the fingers visible, not the full hand)
- One small outline star beside the pencil tip
- No background, no paper texture — pure ink on transparent

### Production prompt

Hand-drawn ballpoint-pen miniature, single cobalt-blue ink (`#1a2952`), **transparent background**. Square composition, 64×64 px.

A short pencil drawn at a diagonal (roughly 45°, pointing upper-right to lower-left). The pencil has visible wood-grain hatching on the barrel, a small ferrule band, and a slightly-worn eraser end. At the lower-left end, three cartoon fingers loosely grip the pencil — only the top portion of fingers visible, no palm, as if someone just put down the pencil mid-signature. Just to the upper-right of the pencil tip: one small outline five-point star, roughly 8–10px.

That is the complete composition. No ruled lines, no paper background, no additional objects.

Export as PNG with transparent background.

---

## 04 · Connecting Screen Spinner (static reference frame)

**Component:** `Room.tsx` → `ConnectingScreen()`
**IllustrationKey:** `connecting-spinner`
**Placement:** Replaces the spinning gold ring (approximately 72×72px area, centered on screen). The room code in large tracked monospace remains exactly where it is below.

**Important:** This asset is a **static reference frame** for SVG conversion. The final implementation in code will animate the pencil drawing the circle as a looping Framer Motion SVG. You are generating the visual target, not the final animation asset.

### Layout constraints from code
- Current: `className="animate-spin"` gold ring, 72px diameter
- The pencil-circle replaces the ring 1:1 — same center position, same diameter
- The room code sits directly below and must not be obscured
- This state lasts 1–3 seconds per connection attempt

### Modifications from original review prompt
- The circle should be **incomplete** — approximately 85% drawn, with an ink-wet open end at the top (about 11 o'clock position)
- The pencil should be positioned at the open end of the arc, as if mid-stroke
- The circle wraps the room code's text zone — the room code is not in the illustration, it's rendered by code below
- Size: 80×80 px square, transparent background

### Production prompt

Hand-drawn ballpoint-pen static illustration, single cobalt-blue ink (`#1a2952`), **transparent background**. Square composition, 80×80 px.

A hand-drawn circle, approximately 70px diameter, centered in the frame. The circle is approximately 85% complete — it begins at the 12 o'clock position, runs clockwise, and ends at roughly the 11 o'clock position with the arc trailing off naturally (ink-stroke style, not a clean cut). The line weight is slightly variable as a ballpoint would produce.

At the 11 o'clock position (the open tip of the arc), a small pencil stub: just the sharpened tip and the lower 1/3 of the barrel, angled tangentially to the circle as if actively drawing the stroke. No hand, no ferrule — just the tip and 12–15px of barrel.

Nothing else in the frame. No text. No stars. No background.

Export as PNG with transparent background. This will be traced to SVG and animated.

---

## 05 · Name Entry Background Vignette

**Component:** `Room.tsx` → `NameEntryForRoom()`
**IllustrationKey:** `name-entry-bg`
**Placement:** Full-screen background, `position: absolute; inset: 0; pointer-events: none; opacity: 0.15–0.20`. The centered card (max-w-sm ≈ 384px, contains: "Joining room" label, room code, name input, Join button) overlays this completely.

### Layout constraints from code
- The card is approximately 384px wide and 240px tall, centered
- On mobile (375px wide) the card is nearly full width — illustration must not compete
- On desktop (1280px+) the card floats in a large cream background — corners are visible
- The illustration lives only in the bottom-left and bottom-right corners, fully outside the card's footprint

### Modifications from original review prompt
- Portrait orientation, 9:16 aspect ratio (828×1792px reference size)
- The kids must face **inward** (toward the center) — they're watching the door for the newcomer
- Bottom-left: 2 kids, bottom-right: 1 kid — asymmetric to avoid visual twins
- Kids should be at low ink density to read at 15–20% opacity without being distracting
- Add 2–3 small outline stars scattered near the kids
- The upper 60% of the frame must be completely empty

### Production prompt

Hand-drawn ballpoint-pen vignette, single cobalt-blue ink (`#1a2952`), very light line weight, fine cross-hatch shading, **transparent background**. Portrait composition, 9:16 (828 × 1792 px reference).

The upper 65% of the frame: completely empty. No marks.

Bottom-left corner (0–35% from left, 75–100% from top): two small hand-drawn kid characters seated or crouching, rendered at 60% of normal line weight (lighter, more delicate strokes). Both face right (inward). One is sitting cross-legged with elbows on knees, glancing right. The other stands behind, also facing right. Near them: one small outline five-point star, one small circle doodle.

Bottom-right corner (65–100% from left, 80–100% from top): one kid standing, facing left (inward), arms loosely at sides, head turned toward center. Near them: two small outline stars.

Center (40–60% from left, anywhere): completely clear. No marks, no characters, no doodles.

All elements drawn at half the ink density of the reference sheets — these must read as faint atmosphere at 15–20% CSS opacity without becoming distracting.

Export as PNG with transparent background.

---

## 06 · Lobby — Waiting for Players Scene

**Component:** `Room.tsx` — the lobby card (`roomState.phase === "lobby"`)
**IllustrationKey:** `lobby-base` (base scene) + 10 per-game prop variants
**Placement:** Inside the cream lobby card (`bg-[#F6EDDB] border border-[#E8D8BE] rounded-xl p-6`). Sits between the RoomCodeShare component (top) and the controls (BotControls / Ready / Start buttons) below. Replaces the current plain text "Waiting for players to ready up."

### Layout constraints from code
- The lobby card is approximately 600px wide on desktop (it occupies `md:col-span-2` of a 3-col grid)
- The illustration fills a banner area inside this card — approximately 580px × 200px
- On mobile (full-width card) it's approximately 340px × 140px
- The RoomCodeShare component sits above the illustration and must not be obscured

### Architecture: composable illustration system
The illustration system has two layers:
1. **Base scene** (`lobby-base`) — the full "Waiting for Players" setting without any game-specific prop. This includes the wooden sign, 2–3 kid characters, the GAME PLAN checklist, the stopwatch, the "You're invited!" card, and the empty prop zone.
2. **Per-game prop variants** (`lobby-prop-*`) — 10 small transparent-background prop images (the game-specific object) that composite into the prop zone of the base scene. One per game.

Generate the **base scene** first. The props are a separate set of 10 small assets.

### Modifications from original review prompt
- Aspect ratio: **3:1** (wide banner), approximately 1200 × 400 px reference
- Background: cream `#F6EDDB` (matches the card — no transparency needed here, the illustration fills the slot)
- The wooden "Waiting for Players" sign is at the TOP of the composition, acting as the section header (replaces the plain text)
- The kids sit/stand BELOW the sign, center-to-bottom
- The prop zone is a visually clear CENTRAL area between the kids — roughly 120×120px, drawn as a faint dotted circle or dashed zone so the prop image composites cleanly
- One seat must be shown EMPTY with a hand-drawn "You're invited!" sticky-note propped up in it (represents the unfilled seat waiting for another player)
- The GAME PLAN checklist book goes to the LEFT side margin (must not overlap where the player-list rail sits on desktop)
- The stopwatch + "Good things take time!" caption goes to the RIGHT margin
- Stars and margin doodles are scattered throughout but stay in outer margins

### Production prompt — base scene

Hand-drawn ballpoint-pen illustration, single cobalt-blue ink (`#1a2952`) on cream ruled notebook paper background (`#F6EDDB`), faint horizontal rule lines, red margin line on left edge, fine cross-hatch shading. Wide banner composition — 3:1 aspect ratio (1200 × 400 px).

TOP center: a hand-drawn wooden nailed signpost reading "Waiting for Players" in hand-set marker lettering on the sign face. The sign is the tallest element and acts as the visual header of the scene.

CENTER zone (middle 30% of width, lower half): a visually clear area approximately 120×120px drawn with a faint dashed circle border — this is the prop zone where per-game objects will be composited. Draw the dashed circle very lightly so it reads as a natural margin decoration, not a technical placeholder. Inside this zone: nothing (leave empty for compositing).

BELOW and flanking the prop zone: three kid characters — two seated on the ground (cross-legged, relaxed), one standing. Their arrangement forms a loose semicircle around the prop zone. One of the seated positions has a hand-drawn "You're invited!" sticky-note card propped up instead of a kid character (the empty seat).

LEFT margin: a small hand-drawn spiral notebook open to a page showing the "GAME PLAN" checklist (four ticked items). Kept small and compact, clear of where UI controls sit on the right side of desktop.

RIGHT margin: a small round stopwatch with "Good things take time!" written below it on a torn-ribbon carrier. One small speech bubble from the nearest kid reading "Let's play together!".

SCATTERED: 6–8 outline five-point stars in the empty margin areas, 2–3 small circle doodles, 2–3 motion-line squiggles.

Export as PNG with cream `#F6EDDB` background (opaque — matches the card).

---

### Per-game prop variants (10 assets)

Each prop is a **small standalone illustration** composited into the dashed circle zone of the base scene. Transparent background, approximately 240×240 px each.

Use this grammar for all 10: cobalt-blue ink, fine cross-hatching, same line weight as the reference sheets, transparent background, single dominant object or tight object group, margin-doodle scale.

---

#### `lobby-prop-handcricket`
Cricket bat leaning slightly left, ball resting against its base, a small set of three stumps with bails behind. The bat has visible wood-grain hatching on the face.

> Cobalt-blue ink, transparent background, 240×240 px. A cricket bat (heavier wood-grain hatching on the blade, thin handle), leaning diagonally at roughly 20° from vertical, with a cricket ball nestled at the base. Three stumps with two bails drawn behind in lighter ink. Cross-hatch shading on the bat blade. Scattered with two outline stars.

---

#### `lobby-prop-rps`
Three hand gestures drawn as a small triptych — fist (Rock), flat palm (Paper), two-finger V (Scissors) — arranged in a horizontal row or tight triangle.

> Cobalt-blue ink, transparent background, 240×240 px. Three cartoon hand gesture sketches in a horizontal row: (1) a closed fist — "Rock", (2) an open flat palm facing viewer — "Paper", (3) a two-finger V-shape — "Scissors". Same line weight and size. Beneath the trio, a small banner or torn-paper label reading "Ready?". Scattered outline stars.

---

#### `lobby-prop-rummy`
A wooden card-holder stand fanning out six playing cards face-toward-viewer, one joker card tilted at a jaunty angle sticking out from the fan.

> Cobalt-blue ink, transparent background, 240×240 px. A wooden card-holder stand (cross-hatched wood grain, two-pronged base) with six playing cards fanned out from it face-toward-viewer — simplified suit pips (spade, heart, diamond, club, simple numeral), no realistic card back pattern. One joker card tilted at a 30° angle sticking out from the fan with "JOKER" lettered on it. No snack bowl, no bunting — just the card stand.

---

#### `lobby-prop-ludo`
One large die mid-bounce with a dashed motion trail, two small cone-shaped tokens beside it.

> Cobalt-blue ink, transparent background, 240×240 px. A single large die (showing a 6 face, pips as circles) drawn mid-bounce at a slight angle with three curved dashed motion-trail lines arcing behind it. Two simple cone-shaped playing tokens (Ludo-style) standing upright beside the die. No board.

---

#### `lobby-prop-snl`
A single die with a small coiled snake silhouette beside it. The snake should look mildly menacing, with a visible fang on its head.

> Cobalt-blue ink, transparent background, 240×240 px. A rolling die (showing a 1 face, single pip) with a short motion-trail arc. Beside it, a compact coiled snake silhouette — exaggerated fanged head, heavy cross-hatch scale texture, coil visible. The snake is drawn at the same scale as the die. A tiny ladder silhouette leans in the background at reduced ink density.

---

#### `lobby-prop-uno`
A single oversized UNO-style action card face-up, with a bold diagonal symbol on it.

> Cobalt-blue ink, transparent background, 240×240 px. A single large playing card, rectangular with rounded corners, face-up. On the card face: a bold diagonal oval background (hatched, no solid fill) and a geometric action symbol — a two-headed arrow (Reverse) or a circle with a line through it (Skip) — drawn at heavy line weight. Corner indices (small number or symbol) in upper-left and lower-right. No color, just cobalt line and hatching.

---

#### `lobby-prop-wordbuilding`
A row of three alphabet tiles snapping into place, one tile shown with a teacher's tick above it.

> Cobalt-blue ink, transparent background, 240×240 px. Three square letter tiles in a horizontal row, each tile with a visible raised border (hatched shadow on one side to suggest depth). The center tile shows the letter "A" in bold marker lettering. A small hand-drawn teacher's red-tick check mark (in cobalt ink) floats above the row. Dashed motion lines on the right tile suggest it sliding into place. Two outline stars.

---

#### `lobby-prop-dotsboxes`
A 4×4 dot grid with one freshly-closed box in the center, a small star drawn inside the closed box.

> Cobalt-blue ink, transparent background, 240×240 px. A 4×4 grid of small hand-drawn circles (dots), connected by horizontal and vertical line segments — some segments drawn, most absent, forming an in-progress game grid. One box in the center-right of the grid is fully closed by four line segments. Inside that closed box: one small solid five-point star. A tiny triumphant exclamation squiggle beside the closed box.

---

#### `lobby-prop-memorymatch`
Two face-down cards side by side, one shown mid-flip revealing a matching pair symbol.

> Cobalt-blue ink, transparent background, 240×240 px. Two rectangular cards side by side. The left card is face-down — back visible, a simple hatch-pattern back design. The right card is shown mid-flip: rotated roughly 30° toward the viewer showing the face (a simple bold star or circle symbol on a plain field). A subtle curved motion-arc behind the flipping card. Implied symmetry — the revealed symbol matches a tiny symbol drawn above the face-down left card as if in a thought bubble.

---

#### `lobby-prop-stargame`
A single folded paper chit, partially unfolded, revealing a hand-drawn star inside it.

> Cobalt-blue ink, transparent background, 240×240 px. A small square piece of paper, partially unfolded — you can see the fold creases. The lower-left flap is lifted open, revealing the interior surface which shows a bold five-point star drawn on it. Visible fold crease lines on all four sides. The paper casts a very light shadow (suggested by a thin parallel line). Two small outline stars scattered nearby.

---

## 07 · Active Gameplay Corner Doodles

**Placement:** Static chrome zones only — board header bars, outer frame corners, side panel headers. Never inside the live play area, never behind draggable or tappable elements.

**IllustrationKeys:** `corner-rps`, `corner-rummy`, `corner-ludo`, `corner-snl`, `corner-uno`, `corner-wordbuilding`, `corner-dotsboxes`, `corner-memorymatch`, `corner-stargame`

**Size:** 128 × 128 px each (displayed at 64×64 CSS px on Retina screens). Transparent background.

**Key rule:** These must be **invisible during focused play**. If a playtester notices the corner doodle before they notice whose turn it is, it has failed. Maximum 2 simple objects. No characters. No text. Ultra-light ink density.

---

### Grammar for all corner doodles

Cobalt-blue ink, transparent background, 128×128 px. Single dominant object from the game's prop vocabulary, reduced to its simplest silhouette-plus-minimal-hatching form. Second object optional if it creates a pair (die + token, cards + fan). No text, no characters, no stars (stars are too similar to game state indicators). Maximum 3 distinct lines of hatching per element.

---

#### `corner-rps`

> 128×128 px, transparent. Three tiny hand-gesture silhouettes arranged in a loose triangle — fist (top-left), flat palm (top-right), two-finger V (bottom-center). All at identical small scale (~40px each). Minimal cross-hatch shading. No other elements.

#### `corner-rummy`

> 128×128 px, transparent. A compact fan of four playing cards — just the outlines and simplified pip at the top of each card face, fanning from a common base point. No card-holder, no joker. Cards drawn at roughly 30° spread.

#### `corner-ludo`

> 128×128 px, transparent. A single die (showing a 4 face, four pip circles), roughly centered, with one cone-shaped token beside it. A very short single-arc motion trail behind the die. Nothing else.

#### `corner-snl`

> 128×128 px, transparent. The coiled head and upper coil of a snake — exaggerated fanged head with visible tongue, two visible coil rings. No board, no ladder, no die. Drawn at the heaviest ink weight of any corner doodle (the snake is the emotional character of the game).

#### `corner-uno`

> 128×128 px, transparent. A single playing card viewed slightly tilted (10°), face up, with a bold diagonal oval (hatched) and a simple reverse-arrow symbol. Corner index in upper-left. No fan, no other cards.

#### `corner-wordbuilding`

> 128×128 px, transparent. Two alphabet tiles: one lying flat, one propped at a slight angle suggesting it just slid into place. Each tile with a clear letter on it. Very short dashed motion-line behind the angled tile.

#### `corner-dotsboxes`

> 128×128 px, transparent. A 3×3 dot grid (9 dots), with one box in the bottom-right fully closed. Inside the closed box: a tiny solid star (5-point, filled). All other possible lines absent — just the dots and the one closed box.

#### `corner-memorymatch`

> 128×128 px, transparent. Two small cards. Left: face-down with a cross-hatch back pattern. Right: face-up showing a bold star symbol. The face-up card tilted slightly as if just turned over. A very short curved motion arc behind it.

#### `corner-stargame`

> 128×128 px, transparent. A single folded paper chit viewed from slightly above. The top-right flap lifted open revealing a bold five-point star drawn on the inside. Visible fold creases. Nothing else.

---

## 08 · Game Over Screen — Trophy

**Component:** `GameOverScreen.tsx` → `TrophyIllustration()` (lines 300–428)
**IllustrationKeys:** `gameover-trophy-win` and `gameover-trophy-loss`
**Placement:** Replaces the SVG `<TrophyIllustration>` component rendered at line 82. Sits in the upper third of the full-viewport `GameOverScreen` which has a dark radial gradient background:
`radial-gradient(ellipse 100% 80% at 50% 0%, #FF8F00 0%, #6D2400 40%, #1a0800 100%)`

There is also a top-center glow halo (600px wide, 256px tall, orange-gold).

**Critical constraint:** The illustration renders on a DARK amber-to-maroon background, not on cream paper. The standard cobalt-on-cream system does not work here. See color specification below.

### Color specification for this screen only

Because the GameOverScreen background is dark (maroon → near-black at the bottom), the illustration must be either:
- **Option A (recommended):** Cream/gold line art on transparent background. Use `#FFF7C2` (existing cream text color) or `#E4B128` (bhalyam.gold) for the trophy and main elements. Reserve cobalt `#1a2952` only for the darkest shadow hatching. The paper texture is NOT drawn — only the linework.
- **Option B:** Black-line art on transparent — the dark background makes dark ink invisible. This only works if the lines are rendered in cream/gold, not cobalt.

Use **Option A**. The illustration is still hand-drawn ballpoint style but the "ink" color is gold/cream to remain visible on the dark background.

The cobalt-blue notebook system is paused for this one screen to preserve legibility. The hand-drawn style and line quality remain identical — only the ink color changes.

### Win state (`gameover-trophy-win`)

> Hand-drawn ballpoint-pen illustration, cream/gold line art (`#FFF7C2` primary, `#E4B128` secondary for fills), **transparent background**. Approximately 400 × 400 px square, drawn to sit as a visual centerpiece on a dark amber-maroon gradient.
>
> Centered: a double-handled trophy with a star medallion badge on the cup body, mounted on a two-tier wooden pedestal. The trophy is drawn at the heaviest line weight in the scene — this is the undisputed focal point. Fine gold-tinted cross-hatching on the cup body for dimensionality.
>
> Radiating outward from the trophy base: loose curly squiggle doodles (standing in for confetti), mixed with small outline and solid-filled five-point stars, distributed unevenly in an irregular starburst pattern — like a notebook page someone scribbled on in excitement. These decorative elements are drawn at progressively lighter line weight as they move farther from the trophy.
>
> Along the bottom edge (bottom 15% of the frame): a low horizontal line of two to three small kid silhouettes with arms raised in celebration. Drawn in lighter weight than the trophy so they read as secondary characters, not competing subjects. One of them holds a small pennant flag reading "YEAH!" on a carrier strip.
>
> No paper background. No ruled lines. No margin line. Only the linework.

### Loss state (`gameover-trophy-loss`)

> Same trophy composition but: the trophy is drawn at 50% ink weight (lighter, more fragile looking) and tipped over onto its side at roughly 40° from the pedestal. The star medallion badge shows a faint crack line. The two-tier pedestal remains upright but the trophy has toppled off it. One small kid silhouette in the lower portion shows a shrugging pose — shoulders raised, palms out, mouth in a small "oh well" expression. No confetti squiggles — instead, 3–4 small outline stars scattered as if floating away. Same cream/gold color scheme on transparent background, 400×400 px.

---

## 09 · 404 Not Found — Porthole Art

**Component:** `NotFound.tsx`
**IllustrationKey:** `404-porthole`
**Placement:** Inside the circular porthole (the middle "0" of "404"). The porthole code creates a circle of `clamp(150px, 26vw, 260px)` diameter with a navy border (`#0E2D66`, 12–16px) and a gold inner ring. The illustration fills the content area inside that border — approximately `clamp(122px, 22vw, 228px)` diameter.

The gold ring, drop shadow, and navy border are rendered in CODE and stay intact. Only the image content inside the circle changes.

The paper-plane SVG (`<PaperPlane>`) orbits OUTSIDE the circle as an absolutely positioned animation — it is NOT part of the illustration.

### Layout constraints from code
- The image renders as: `className="w-full h-full object-cover object-center"`
- Circular crop is applied by the parent: `className="absolute inset-[10px] sm:inset-[14px] rounded-full overflow-hidden"`
- The fill background inside the circle (before the image loads) is `#FFF6E2`

### Modifications from original review prompt
- Aspect ratio: **exactly 1:1 square** (will be cropped circular by the `rounded-full` parent)
- Background: cream `#FFF6E2` (matches the porthole's own background color)
- The composition must read correctly as a CIRCLE — elements near corners will be clipped. Keep all meaningful content within a centered circle of 85% the frame width.
- The schoolbag is the central focal point — it should fill roughly 50% of the visible circle
- No paper plane in the illustration (the code has one already)
- No ruled lines (the porthole is too small for them to be meaningful)

### Production prompt

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), cream background `#FFF6E2`, fine cross-hatch shading. Square format, 520 × 520 px (will be cropped to a circle by the code).
>
> Composition must read within a centered circle of approximately 440px diameter — keep meaningful elements inside that circle; corners will be cut off.
>
> Center: a schoolbag / backpack drawn mid-tumble at roughly 30° from vertical — straps loose, one side pocket flap open. The bag has visible stitching lines (parallel hatching), zipper details drawn as a dashed line, and a front pocket with a small buckle.
>
> Spilling from the open side: a cricket ball (circular with visible seam stitching), two playing cards tumbling face-up (simplified pip symbols visible), and one small alphabet tile.
>
> Upper-right area: two small outline five-point stars floating as if the bag knocked them loose.
>
> No paper plane. No ruled lines. No margin line. Cream `#FFF6E2` background (opaque).

---

## 10 · Supporting Empty and Transitional States

---

### `chat-empty` — Empty chat speech bubble

**Component:** `Chat.tsx` — empty state at line 42
**Current code:** `<div className="text-[#8A7865] text-sm">No messages yet. Say hi 👋</div>`
**Placement:** Inline beside or above the empty-state text, approximately 80 × 40 px

> Hand-drawn ballpoint-pen micro-illustration, cobalt-blue ink (`#1a2952`), transparent background. Approximately 160 × 80 px.
>
> A single hand-drawn speech bubble in the classic cartoon style: rounded rectangular body with a small triangular tail pointing lower-left (as if someone is about to speak). Inside the bubble: "psst..." written in hand-set marker lettering on a small carrier strip (washi-tape style). The bubble outline has a slightly wobbly, imperfect quality (hand-drawn, not geometric). No characters, no additional elements.

---

### `bots-empty` — Bot controls robot figure

**Component:** `Room.tsx` → `BotControls` — empty state at line 124
**Current code:** `<div className="text-xs text-[#8D7B66] italic">No bots yet. Add one to practice against AI.</div>`
**Placement:** Small inline figure beside the empty-state text, approximately 48 × 48 px

**Note:** The `🤖` emoji appears on each individual bot pill (line 134) — that is a separate element. This doodle replaces/accompanies the empty state text, not the bot pills.

> Hand-drawn ballpoint-pen micro-illustration, cobalt-blue ink (`#1a2952`), transparent background. Square, 128 × 128 px (displayed at 48 × 48 CSS px).
>
> A simple, endearing cartoon robot: square head with two circular eye ports (hatched to suggest glass lenses), an antenna stub on top with a small ball at the end, rectangular body with three small buttons or vents drawn as short horizontal lines, and two simple arm stubs at sides. No legs (or very small stub legs). The robot has a neutral or slightly quizzical expression. Drawn in the same hand-drawn line quality as the rest of the system — NOT a pixel-art or digital robot, but a doodled-in-notebook robot. No background.

---

### `pass-phone` — Pass the phone gate illustration

**Component:** `PassPhoneGate.tsx`
**Placement:** Inside the cream card overlay (`bg-bhalyam-cream-soft`), above the "Pass the phone" label and player name text. The card is approximately 400 × 280 px on mobile.

**Current code layout in card:**
1. "Pass the phone" — small uppercase label
2. "{Player name}'s turn" — large bold text (28–34px)
3. Instruction line
4. "Tap to play" pill button

The illustration sits ABOVE item 1, at the top of the card.

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), transparent background. Landscape composition, 400 × 180 px.
>
> Two sets of cartoon hands in the act of passing a smartphone between them. Left side: one hand holding a phone (rectangular device with a rounded corner, screen facing viewer — screen blank/plain). The hand is loosely gripping the lower edge of the phone. Right side: another hand reaching toward the phone from the right, fingers extended to receive it. Between the two hands: the phone is in mid-transfer, slightly tilted, with 2–3 short dashed motion-trail lines behind it suggesting movement from left to right.
>
> The hands are simple cartoon hands — four visible fingers and a thumb, no realistic anatomy, consistent with the notebook character style. Both pairs of hands are the same size. No arms beyond the wrists. No characters, no faces, no body — just the hands and the phone.
>
> No background, no text, no ruled lines.

---

## Game Catalog Full Scenes

These are the four flagship game scenes with full composition treatment. Used for game catalog pages, lobby headers, or marketing contexts.

---

### `catalog-rummy` — Sankranti card table

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), cream ruled notebook paper background, faint rule lines, red margin line, fine cross-hatch shading. Portrait composition, 4:3 (800 × 600 px).
>
> Center: a wooden card-holder stand (visible cross-hatch wood grain, two-pronged base) with seven playing cards fanned face-toward-viewer — simplified suit pips, clear numeral indices, no realistic back pattern. One card tilted at a jaunty outward angle with "JOKER" hand-lettered on a small interior banner. A small discard pile of three cards sits beside the stand, slightly spread.
>
> Top margin: a string of small triangular paper bunting flags strung across the top of the page, as if hung for a celebration.
>
> Bottom-left corner: a round bowl of festival snacks — simple mound shape with a few dot-like pieces (representing murukku or mixture), minimal hatching.
>
> Scattered: 6–8 outline stars and small circle doodles in remaining margin space. No characters. No paper airplane.

---

### `catalog-ludo` — Power-cut afternoon

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), cream ruled notebook paper background, faint rule lines, red margin line, fine cross-hatch shading. Portrait composition, 4:3 (800 × 600 px).
>
> Center: a cross-shaped Ludo board sketched in slight perspective as if sitting on a floor — the viewer sees it from a slight overhead angle. The four home quadrants are indicated by different hatching patterns (diagonal, horizontal, crosshatch, stipple — not color). The central star-shaped home is outlined. Four simple cone-shaped playing tokens stand on starting squares.
>
> Above the board: two large dice shown mid-bounce just above the board's surface, each tilted at different angles, with curved dashed motion-trail arcs behind them. Both dice show different faces (e.g. 6 and 3).
>
> Upper-right corner: a ceiling fan drawn at 35% ink density — visible blades, motor housing at center, pull-cord, but blades completely still (not blurred). The fan reads as "power is out" through its stillness.
>
> Scattered: 5–6 outline stars. No characters.

---

### `catalog-snl` — Friendship-ending snake at square 99

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), cream ruled notebook paper background, faint rule lines, red margin line, fine cross-hatch shading. Portrait composition, 4:3 (800 × 600 px).
>
> THE dominant element: one long, dramatically coiled snake stretching diagonally from the upper portion of the board (representing square 99) down to a low square (representing square 12 or similar). This snake is the clear focal point with the HEAVIEST ink weight in the scene. Cross-hatch scale texture throughout the body. Exaggerated fanged head with narrow pupils, slightly open mouth revealing fangs — not cute, memorably menacing. The snake body has 2–3 visible coil rings along its length.
>
> Secondary: a numbered grid game board sketched at a slight downward angle in the background. Most squares are bare outlined boxes with small numbers. The board is drawn at lighter ink weight than the snake.
>
> Simple wooden ladder on the left side of the board — thin rungs, minimal hatching. Much smaller and simpler than the snake (this is their contrast).
>
> Lower-right corner: a small hand-drawn kid character with a shocked open-mouth expression, both hands raised palms-out, standing/sitting just off the board edge — reacting to having landed on the snake's head. Drawn small, clearly secondary to the snake.
>
> Near the board edge: a single rolling die with a motion-trail arc.
>
> Scattered: 4–5 outline stars.

---

### `catalog-stargame` — Terrace rooftop chit-slap

> Hand-drawn ballpoint-pen illustration, cobalt-blue ink (`#1a2952`), cream ruled notebook paper background, faint rule lines, red margin line, fine cross-hatch shading. Portrait composition, 9:16 or 4:3 — use 9:16 (750 × 1334 px) as this is mobile-first.
>
> CENTER: a ring of exactly six small folded paper chits arranged in a clockwise circle like a clock face. Each chit is drawn with visible fold-crease lines — they are folded squares of paper, not cards. One chit at the 3 o'clock position is shown partially unfolded, revealing the interior surface which shows a bold hand-drawn five-point star.
>
> RIGHT SIDE entering from the frame edge: a flat open hand (palm down, fingers spread) entering from the right at speed, aimed toward the unfolded star-chit. Short motion-trail lines (3–4 parallel lines) behind the hand indicating rapid movement.
>
> BOTTOM EDGE: a simple terrace parapet/railing — horizontal line with evenly-spaced short vertical balusters, light hatching suggesting concrete texture. This anchors the scene as "rooftop."
>
> UPPER-LEFT CORNER: a plain outlined crescent moon (no shading, no stars around it) at reduced ink density — suggesting evening sky without a color wash.
>
> Scattered: 4 outline stars in remaining margin space.
>
> No characters (face-only). No color. No photographic elements. Pure cobalt-blue ink.

---

## Handoff checklist

Before providing any asset for integration:

- [ ] Transparent background (or cream `#F5E9C4` / `#F6EDDB` / `#FFF6E2` where specified)
- [ ] Cobalt-blue ink (`#1a2952`) only — except `gameover-trophy-*` which uses cream/gold
- [ ] No secondary hues, no flat color fills beyond the ink itself
- [ ] Exported at the minimum size specified (larger is fine, smaller is not)
- [ ] PNG format, no JPEG compression artifacts on the ink lines
- [ ] Asset named exactly: `illustrations/<IllustrationKey>.png` (matching the `IllustrationKey` enum)
  - e.g. `illustrations/home-hero.png`, `illustrations/lobby-base.png`, `illustrations/gameover-trophy-win.png`
- [ ] Lobby prop variants named: `illustrations/lobby-prop-<game>.png`
- [ ] Corner doodles named: `illustrations/corner-<game>.png`

Drop the files into `client/public/illustrations/` and update `client/src/assets/illustrations.ts` `ILLUSTRATIONS` map with the path (e.g. `"/illustrations/home-hero.png"`).

---

*BHALYAM · Illustration Prompts · refined 2026-07-10*
