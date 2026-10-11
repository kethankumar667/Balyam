# ADR-008 — One match per room, a finished table that stays open, and an audience

**Status:** Accepted — 2026-10-11
**Supersedes:** the rematch flow (`rematch:request` / `rematch:respond` / `rematch:state`, `RematchState`,
`RoomManager.requestRematch` / `respondRematch` / `requestRematchStart`) and the 2026-09-09 rule that closed a
finished room the moment its host left or too few players remained.

## Context

A finished room used to be negotiated back into a second match: the host asked, everyone accepted, a countdown ran,
and the same room started again. That path was also a second place a match's economy entry was committed, a second
set of timers, and a second set of states a room could be stuck in.

Two things made it a poor fit:

1. **A finished room cannot take new players.** `joinRoom` requires the lobby. So the idea of re-sharing the finished
   room to bring friends who had left back in could never work, and reopening it would have changed the join rule and
   touched match entry, stakes and settlement.
2. **Friends already know how to play again**: someone makes a room and sends the link, in a Mandali or on WhatsApp.
   That is the flow the product is built around.

## Decision

1. **A room hosts exactly one match.** Rematch is removed from the server, the shared types, the client and the docs.
   Engines are created once per room. `bhalyam.auto_start` (the old auto-accept switch) is retired in
   `lib/retiredStorage.ts` and removed from the privacy inventory.
2. **The finished table stays open for as long as any human is at it.** Closing a scorecard returns to the finished
   table, which says the match is over, offers **Create a new room** (same game, one tap: it leaves the room and opens
   the create sheet for that game) and **Leave**. The settlement banners and the host's *Retry Settlement Sync* live
   there, so closing results must never mean leaving. A departing host is replaced like any other; the room is torn
   down through the normal path when the last human goes.
3. **`room:closed` is now sent from the two real teardown points** (`closeConcludedRoom`, `announceAbandonment`), so
   an audience member watching a table that has just emptied is told, instead of watching a dead board.
4. **A friend's live match can be watched.** Presence carries a `watchCode` for a person who is mid-match in a room
   that takes an audience (never a sealed one), only to people in the same Mandali. The Mandali "who's around" strip
   offers *Watch*, which opens `/watch/:code`: the existing spectator arena in `audience` mode.
5. **An audience can see the whole live game and cheer, and nothing else.** No seat, no moves, no chat. A spectator
   socket may send only the `QUICK_REACTIONS` cheering set, never aimed at a player, three per four seconds. Throwables
   and nudges stay seated-player only. Seated players are told in the room chat when someone starts watching a live
   match. Watching needs a member account (`capabilitiesFor(kind).spectate`).

## Consequences

- One commit path for a match's entry, one for its settlement. The `requestRematchStart` re-validation, reentrancy and
  orphaned-commit tests are gone with the code they covered.
- Old stored room snapshots may still carry a `rematch` field; it is ignored on restore.
- Historical audit and report documents in the repository root and `docs/` still mention rematch. They are dated
  snapshots of what was true when written and are intentionally not rewritten; the living documents (`AGENTS.md`,
  `docs/ai/*`, this directory) are current.
- Open: the audience can still *receive* the table's chat (spectators share the socket room); the audience UI shows
  none of it. Narrowing the server fan-out is a possible follow-up.
