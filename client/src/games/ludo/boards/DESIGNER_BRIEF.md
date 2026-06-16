# Polygon Ludo Boards — Designer Brief

## Goal

Hand-author 4 SVG board templates — one each for 5, 6, 7, and 8 player Ludo —
that match the visual style of the supplied reference images and drop straight
into a working multiplayer Ludo game. The game already supports arbitrary
player counts at the rules level; only the visual board is missing.

You will deliver 4 SVG files. The game's runtime parses your SVG and overlays
animated player tokens at the exact coordinates of the IDs you give cells.
**Position accuracy matters: tokens render at the centroid of each tagged
element. Visual style matters: the board is the centerpiece of the game.**

---

## Reference images

Three reference photos are supplied: 5-player pentagonal board, 6-player
hexagonal board, and 8-player octagonal board. Match these references as
closely as you can — yard triangle shape, cell proportions, central home
geometry, star placement, color choices.

For the **7-player** board (no reference image supplied), apply the same
visual language as the 6-player and 8-player references — heptagonal layout,
7 triangular yards, 7 home-stretch entries, 7 wedges of the central home.

---

## Technical requirements

### Canvas

- **viewBox**: `0 0 100 100`
- **No external assets** (fonts, embedded raster images). Pure SVG.
- File names: `board-5.svg`, `board-6.svg`, `board-7.svg`, `board-8.svg`

### Polygon centering

- Outer polygon centered at `(50, 50)`
- Outer polygon vertex/edge distance from center: ~46 (leave a 4-unit margin)
- Central home polygon at `(50, 50)`, radius ~10

### Orientation

For each N, orient the board so **wedge 0 is at the top**:

| N | Top-most feature |
|---|------------------|
| 5 | Vertex of pentagon pointing up — wedge 0 yard at top |
| 6 | Flat edge of hexagon at the top — wedge 0 yard above the top edge |
| 7 | Vertex of heptagon pointing up — wedge 0 yard at top |
| 8 | Flat edge of octagon at the top — wedge 0 yard above the top edge |

Wedge numbering proceeds **clockwise** from wedge 0 (so wedge 1 is to the
right of wedge 0).

### Player color mapping by wedge

Wedges always get colors in this order:

| Wedge index | Color    | Hex     |
|-------------|----------|---------|
| 0           | red      | #ef4444 |
| 1           | green    | #22c55e |
| 2           | yellow   | #facc15 |
| 3           | blue     | #3b82f6 |
| 4           | purple   | #a855f7 |
| 5           | cyan     | #06b6d4 |
| 6           | orange   | #f97316 |
| 7           | brown    | #92400e |

For N players, use only the first N colors. The 5-player board uses
red/green/yellow/blue/purple; the 6-player adds cyan; the 7-player adds
orange; the 8-player adds brown.

---

## Element types & ID schema

Every game element the runtime needs to position **must** be drawn as one of:

- `<circle cx cy r .../>` — runtime reads `(cx, cy)` as the centroid
- `<rect x y width height .../>` — runtime reads `(x + w/2, y + h/2)` as the
  centroid
- `<g transform="translate(X Y)">...</g>` — runtime reads `(X, Y)` as the
  centroid

**Every** element below must be tagged with its `id` attribute. IDs are case
sensitive and lowercase.

### Yard slots (where tokens park before they enter the game)

4 slots per color, arranged inside that color's triangular yard.

```
yard-red-0     yard-red-1     yard-red-2     yard-red-3
yard-green-0   yard-green-1   yard-green-2   yard-green-3
...
```

Draw these as `<circle>` elements (they appear as the parked-token spots in
the references — circles inside the triangle). They can be visible (rendered
as decorative ring/dot) or transparent — either works; the runtime overlays
the actual token sprite on top.

### Track cells (the main loop)

Total track cells per board = `13 × N`:

| N | Track cells total | IDs               |
|---|-------------------|-------------------|
| 5 | 65                | `track-0` to `track-64` |
| 6 | 78                | `track-0` to `track-77` |
| 7 | 91                | `track-0` to `track-90` |
| 8 | 104               | `track-0` to `track-103`|

**Numbering convention**: `track-0` is **the cell immediately outside the
yard exit of wedge 0 (red)**. Numbering grows **clockwise** around the
polygon. The track is a single continuous loop; after the last `track-{N*13-1}`
the next cell wraps back to `track-0`.

Per-wedge shape: each wedge contributes **13 cells** to the track, laid out
as a 3-wide path running parallel to that wedge's outer polygon edge, then
turning the corner into the next wedge. The classic per-wedge breakdown is:

- Cells 0–5: 6 cells running along the wedge's left side (the "approach")
- Cell 6: corner cell at the polygon vertex (or near it)
- Cells 7–12: 6 cells running along the wedge's right side (toward the next
  wedge's yard exit)

So for wedge `i`:
- Wedge `i`'s 13 cells are `track-(i*13)` through `track-(i*13 + 12)`
- Player at wedge `i` **starts** at `track-(i*13)` — the cell right outside
  their yard exit
- Player at wedge `i`'s **home-stretch entry** is `track-(i*13 + 12)` — the
  cell just before the next color's start cell

Draw each track cell as a `<rect>` (rounded corners OK) sized so all 13×N
cells across the board look uniform. The references show small white rounded
squares with thin black borders — match that style.

### Home-stretch cells (the colored runway into home)

6 cells per color, color-coded to match the yard color. These run from the
outer-polygon edge inward toward the central home.

```
stretch-red-0     ... stretch-red-5
stretch-green-0   ... stretch-green-5
...
```

`stretch-{color}-0` is the first cell of the home stretch (closest to the
outer track entry). `stretch-{color}-5` is the cell adjacent to the central
home (the final step before scoring).

Draw as `<rect>` elements, same cell size as track cells, filled with the
color's hex (or a lighter tint of it, like in the references).

### Home spots (the central scoring area)

4 spots per color, arranged inside that color's wedge of the central home
polygon.

```
home-red-0   home-red-1   home-red-2   home-red-3
home-green-0 home-green-1 home-green-2 home-green-3
...
```

Each represents where one of that color's 4 tokens finally rests. The
references show the central home as a colored N-gon split into wedges with
"HOME" written in each wedge. You can label or omit the text; what the
runtime needs is the 4 `home-{color}-{slot}` positions per color.

If you'd rather not show 4 distinct spots per color (the references only
show one "home" area per wedge), draw 4 invisible `<circle>` elements
arranged 2×2 inside each wedge — they don't need to be visually distinct,
they're just position anchors for the runtime to slot tokens.

### Safe-square stars (decorative only)

Optional but recommended. Standard Ludo has 2 safe squares per player wedge:
- `track-(i*13)` — the color's start cell (right outside the yard exit)
- `track-(i*13 + 8)` — the star square mid-wedge

If you draw ★ glyphs on these cells, the runtime ignores them visually
(it's just decoration in your SVG). No ID needed on the stars themselves —
they're drawn on top of the existing `track-{i}` cells.

### Direction arrows (decorative only)

The references show curved arrows at each wedge's track entry pointing in
the direction of play (clockwise). Decorative only; no IDs needed.

---

## Visual style notes

Match these specific style elements from the references:

**Yards** (triangular sections):
- Filled with the color's hex
- Rounded outer corners (~3-unit radius)
- Inner area lighter than the border
- 4 yard slots arranged in a 2×2 or tetrahedron pattern inside, drawn as
  white circles with a thin colored ring

**Track cells**:
- White or very light gray fill
- Thin black/dark-gray border (~0.15 stroke width)
- Slight corner rounding (~0.5 radius)
- All track cells the same size

**Home stretches**:
- Filled with the color's hex (or a slightly lighter tint)
- Same size as track cells
- Thin black border

**Central home polygon**:
- N wedges, each filled with that color's hex
- Optional "HOME" text in each wedge
- Optional thin black borders between wedges

**Background**:
- Match the reference style. The 6-player and 8-player references have
  decorative gradient/pattern borders — those are nice but optional.

**Stars on safe squares**:
- Yellow ★ glyph, sized to fit inside a cell, centered

---

## Validation

Before delivering, the SVG must pass these checks:

1. **Open the SVG in a browser** — it should render without errors and look
   like the reference for that N.

2. **Run the extractor** — from the project's `client/` directory:
   ```
   node scripts/extractBoardPositions.mjs
   ```
   This emits `board-N.json` with all extracted positions. Confirm the
   console output shows the expected counts. For a 6-player board:
   ```
   OK board-6.svg → board-6.json  (track=78, stretch-red=6, stretch-green=6,
                                   stretch-yellow=6, stretch-blue=6,
                                   stretch-purple=6, stretch-cyan=6,
                                   yard-red=4, yard-green=4, yard-yellow=4,
                                   yard-blue=4, yard-purple=4, yard-cyan=4,
                                   home-red=4, home-green=4, home-yellow=4,
                                   home-blue=4, home-purple=4, home-cyan=4)
   ```
   Per-board expected counts:

   | N | track | stretch-* | yard-* | home-* |
   |---|-------|-----------|--------|--------|
   | 5 | 65    | 6 × 5     | 4 × 5  | 4 × 5  |
   | 6 | 78    | 6 × 6     | 4 × 6  | 4 × 6  |
   | 7 | 91    | 6 × 7     | 4 × 7  | 4 × 7  |
   | 8 | 104   | 6 × 8     | 4 × 8  | 4 × 8  |

   If the extractor logs `skipped (no centroid)` for any ID, that element
   was drawn with a shape the parser can't read (e.g. `<path>`). Convert it
   to a `<circle>`, `<rect>`, or `<g transform="translate(...)">` and re-run.

3. **Visual sanity check** — open the board SVG in a browser at full size
   (or zoom in). Check:
   - All N colors appear in the right wedges (red top, green next clockwise, etc.)
   - Track cells are all roughly the same size
   - Stars sit on cells `track-{i*13}` and `track-{i*13 + 8}` for each i
   - Yards have exactly 4 slot circles each
   - The board fills the viewBox cleanly with consistent margins

---

## Deliverables

1. `board-5.svg`
2. `board-6.svg`
3. `board-7.svg`
4. `board-8.svg`
5. (Generated by the extractor): `board-5.json`, `board-6.json`,
   `board-7.json`, `board-8.json`

All 8 files go in `client/src/games/ludo/boards/`.

---

## Quick reference: track index ↔ color mapping

For any N-player board:

| Color   | Wedge index | Start cell | Home-stretch entry | Safe stars at |
|---------|-------------|------------|--------------------|---------------|
| red     | 0           | track-0    | track-12           | track-0, track-8 |
| green   | 1           | track-13   | track-25           | track-13, track-21 |
| yellow  | 2           | track-26   | track-38           | track-26, track-34 |
| blue    | 3           | track-39   | track-51           | track-39, track-47 |
| purple  | 4           | track-52   | track-64           | track-52, track-60 |
| cyan    | 5           | track-65   | track-77           | track-65, track-73 |
| orange  | 6           | track-78   | track-90           | track-78, track-86 |
| brown   | 7           | track-91   | track-103          | track-91, track-99 |

(The formula: for wedge `i`, start = `13 × i`, home entry = `13 × i + 12`,
safe stars at `13 × i` and `13 × i + 8`.)
