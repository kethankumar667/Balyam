# Quiet Table

The hand is the center of gravity. Meticulously aligned card groups and generous card faces carry the visual weight; the surrounding chrome remains restrained. The composition brings drawing, arranging, and discarding into one readable field instead of separating them with empty bands.

Deep green felt preserves the existing game's identity. Ivory cards, red and black suits, and cool neutral interface text keep the palette functional. Gold is a deliberate action signal rather than a border applied to every container. Material depth comes from subtle texture and crisp edges, not decorative glow.

Typography separates identity from operation. A small Georgia wordmark retains the brand's personality; Bahnschrift provides readable player names, phase labels, and counts. Painstaking attention to label spacing and contrast makes game state legible without competing with the cards.

One horizontal player strip establishes the social table, with no duplicated roster. A quieter chat rail preserves conversation. Master-level execution here means removing friction and repetition while preserving the familiar game, not introducing a different visual world.

## Depicted State

- Desktop concept, 1600 x 1000 logical pixels, rendered at 2x.
- Six players; Kethan is active with 18 seconds left to draw.
- Thirteen cards in four groups, matching the reference hand.
- Draw is available; discard and declare are unavailable in this phase.
- Chat copy and table activity are illustrative, not live data.
- Static visual concept only; no gameplay or responsive behavior is implemented.

## Rendering

Run `powershell -File artifacts/rummy-design/render.ps1` from the repository root.
The render uses Windows System.Drawing and existing local avatar/card-back assets.