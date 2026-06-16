# Polygon Ludo board templates

This folder holds hand-authored SVG boards for 5–8 player Ludo. Each board is
designed once in a vector tool (Figma, Inkscape, Illustrator), saved as
`board-N.svg`, and consumed at runtime by [StaticPolygonBoard.tsx](../StaticPolygonBoard.tsx).

The runtime never generates polygon geometry — it just reads `(x, y)` positions
from the JSON beside each SVG and overlays tokens. All visual judgment lives in
the SVG; code only places dots on top.

## File layout

```
boards/
  board-5.svg     ← pentagon  (N=5 wedges)
  board-5.json    ← auto-generated positions
  board-6.svg     ← hexagon
  board-6.json
  board-7.svg     ← heptagon
  board-7.json
  board-8.svg     ← octagon
  board-8.json
```

Drop in any subset; missing boards just render a placeholder.

## Drawing conventions

- **viewBox** must be `0 0 100 100`. Center the polygon at `(50, 50)`.
- Orient one **vertex pointing up** (not a flat edge). Wedge 0 is the top wedge,
  wedges proceed clockwise.
- Each wedge is one player's "lane". Wedge `i` belongs to color
  `["red","green","yellow","blue","purple","cyan","orange","brown"][i]`.
- Use **rounded rectangles, circles, or `<g transform="translate(x y)">`
  groups** for any element that needs a centroid. The extractor reads `cx/cy`,
  `x/y/width/height`, or `transform="translate(...)"`.

## ID schema

Every cell or slot the runtime needs to find must have a stable `id`:

| Pattern | Count | Meaning |
| --- | --- | --- |
| `track-{i}` | `i = 0 .. N*13 - 1` | Main loop cells, sequential clockwise from wedge 0's first cell. |
| `stretch-{color}-{j}` | `j = 0 .. 5` | Six home-stretch cells per color, 0 = entry, 5 = adjacent to home. |
| `yard-{color}-{slot}` | `slot = 0 .. 3` | Four parking slots per color in that color's yard. |
| `home-{color}-{slot}` | `slot = 0 .. 3` | Optional. Four side-by-side home positions per color. If omitted, defaults to the stretch endpoint. |
| `safe-{i}` | optional | Star markers — purely visual; the runtime gets `safeSquares` from the server. |

All IDs are lowercase. Colors are full names (`red`, `green`, `yellow`, `blue`,
`purple`, `cyan`, `orange`, `brown`).

## Workflow

1. Open Figma/Inkscape, set the artboard to 100×100.
2. Draw the polygon, wedge dividers, yards, tracks, stretches, home circle —
   make it look like a board you'd want to play on.
3. Tag every cell/slot with the IDs above. In Figma: select the shape →
   right panel → rename to `track-0` (Figma exports the layer name as `id`).
4. Export as SVG. Save here as `board-N.svg`.
5. From the `client/` directory, run:
   ```
   node scripts/extractBoardPositions.mjs
   ```
6. Confirm the console output shows the expected counts, e.g. for hexagon (N=6):
   ```
   OK board-6.svg -> board-6.json  (track=78, stretch-red=6, stretch-green=6, ..., yard-red=4, ...)
   ```
7. Commit both `.svg` and `.json`.

## Activating polygon Ludo at runtime

Three flips, none of them in this folder:

1. `server/src/games/registry.ts` — change Ludo `max` back to 8.
2. `client/src/games/ludo/LudoBoard.tsx` — when `wedgeCount > 4`, render
   `<StaticPolygonBoard ... />` instead of the cross board.
3. (Optional) `client/src/pages/Lobby.tsx` — re-enable 5–8 player slots.

Until those are flipped, the scaffolding sits unused — no risk to the current
4-player Ludo or RPS.
