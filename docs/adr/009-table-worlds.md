# ADR-009 — Table worlds: the look of a Ludo or Rummy table, chosen by the host and earned by winning

**Status:** Accepted — 2026-10-18 (plumbing built; the art for each world is built game by game)

## Context

Ludo had six board "themes" (Classic, Paper, Neon, Emerald, Midnight, Sunset) and the cosmetics shop had four table
"felts". Both were palettes: the same table in another colour. Brain Vita showed the better idea, a **world**: a
different place, with its own scene, its own material for the board or felt, its own props, its own way of scattering
a captured piece and its own sound. The owner asked for the same for Ludo and Rummy, earned by playing, and seen by
the whole table.

## Decision

1. **A world is the look of the whole table.** The host picks it in the lobby, and may change it during the match; every player, watcher and Party Mode
   screen sees the host's choice. It is room state, like the table's name.
2. **A closed list, six names**, shared by both games and by the Brain Vita family of worlds so a name means one
   place: `classic` (the default, the look the game always had), `neon`, `toy`, `zen`, `reef`, `palace`
   (`shared/worlds.ts`). Each game draws its own board in each world.
3. **Purely visual.** Engines never read it, it changes no rule, score or reward, and it never changes a seat's colour
   (Ludo's seat colours are who a player is). It must not switch the app between light and dark for the players
   either: a world carries its own backdrop.
4. **Earned by winning, not bought.** A world opens at 1, 3, 7, 15 and 30 won matches (`WORLD_WIN_LADDER`), counted per
   game. Only matches with two or more real people count (bots and Pass & Play seats are not people), and a room counts
   once. Match history is not stored on the server, so the count lives on the device (`bhalyam.worlds.wins`, declared in
   the privacy inventory). The honest limit: a modified client can name a world it has not earned. That only changes the
   look of its own table, so it is accepted; the server still refuses anything outside the list.
5. **Accounts that unlock everything** (`capabilities.unlockAllFeatures`: admins and super admins) see every world
   open, so they can test and review. This is shown, never saved: the real count is untouched.

## How it is wired

- `room:setWorld` (host only; lobby or live match, not a finished table) on the server, `RoomManager.setWorld`, `Room.world`, `RoomPublicState.world`.
  It is **not** a new parameter of `createRoom`, whose positional list is already about 24 long. The value is
  validated against the list (`isWorldOf`), never trusted, and stored in the room snapshot (read back through
  `sanitizeWorld`, so an old or damaged snapshot opens as the classic world).
- `world` is optional on the wire because the client and server are deployed separately: a state from an older server
  reads as the classic world.
- The client counts a win in `useCountWorldWin` (Room), reads progress in `useWorldProgress`, and shows the choice in
  `LobbyWorld` / `WorldPickerDialog`.
- Rummy's mobile/landscape header exposes the host's live-world picker as a labelled palette icon immediately before
  fullscreen (or before Menu when fullscreen is unsupported), rather than a duplicate row inside Menu. It retains the
  same host/unlock/server-confirmation rules. The desktop header keeps its existing World chip.

## Consequences

- Ludo's six colour themes are gone (built 2026-10-18 with the Toy box and Royal palace worlds): the per-player theme
  setting, the header theme button, the falling weather of the non-classic themes and the app-wide light/dark sync were
  removed, and a world is now `.theme-<id>` variables plus a lazy scene. Rummy got the same worlds (2026-10-18) as token blocks on the desktop room and two variables on the phone table. The Neon deck, Zen garden and Coral reef followed the same day, so both games now draw all six. Each world also has a burst material and a sound voice (2026-10-19), reusing Brain Vita's particle looks and voices; the classic table keeps its own bursts and cues. What is still missing: props beside the Rummy table (the desktop table has no free corner, unlike Ludo's).
  The four table felts in the cosmetics shop are untouched and are not read by either game's worlds. A game with no art for a world draws its classic table, and
  the picker offers only what a game can draw (`worldArt.ts`).
- Each world's art is loaded only when that world is shown, so the classic table's bundle does not grow.
- A player who has not earned a world still sees it when they sit at a host's table that uses it. That is a deliberate
  preview, and gives no advantage.
