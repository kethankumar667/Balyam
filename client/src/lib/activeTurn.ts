/**
 * Normalised "whose move is it" across every game's public state.
 *
 * Each engine names the active player differently (`turnPlayerId`,
 * `currentTurnPlayerId`, `shuffleTurnId`, chess's colour pair, Rummy's
 * per-player `isMyTurn`…). Anything that wants to react to "it is now MY
 * turn" — turn notifications, title flashing, screen-reader announcements —
 * should read it through here rather than re-implementing per-game
 * knowledge at each call site.
 *
 * Returns `null` for games with no single active player right now:
 *   - simultaneous-play games (RPS, Hand Cricket, Snake, Spacewar,
 *     Block Blast, Names-Place-Animal) — "your turn" there means "round
 *     started", which the boards already announce;
 *   - Tambola, where the server calls numbers on a timer;
 *   - finished/lobby phases of any game.
 *
 * MUST stay read-only and defensive: this runs on every game:state
 * broadcast, so a malformed state must return null, never throw.
 */
import type {
  BingoPlayerState,
  CarromPublicState,
  ChessPublicState,
  DotsBoxesPublicState,
  RummyPlayerState,
  LudoState,
  SnlState,
  StarPlayerView,
  UnoPlayerState,
  WordBuildingPublicState,
} from "@shared/types";

export function activeTurnPlayerId(state: unknown): string | null {
  if (state == null || typeof state !== "object") return null;
  const s = state as Record<string, unknown>;

  const kind = s.kind as string | undefined;
  if (!kind) return null;

  switch (kind) {
    case "rummy": {
      const r = s as unknown as RummyPlayerState;
      return r.phase === "playing" ? r.turnPlayerId : null;
    }
    case "ludo": {
      const l = s as unknown as LudoState;
      return l.phase === "playing" ? l.turnPlayerId : null;
    }
    case "snl": {
      const g = s as unknown as SnlState;
      return g.phase === "playing" ? g.turnPlayerId : null;
    }
    case "uno": {
      const u = s as unknown as UnoPlayerState;
      return u.phase === "playing" ? u.turnPlayerId : null;
    }
    case "wordbuilding": {
      const w = s as unknown as WordBuildingPublicState;
      return w.phase === "playing" ? w.turnPlayerId : null;
    }
    case "dotsboxes": {
      const d = s as unknown as DotsBoxesPublicState;
      return d.phase === "playing" ? d.turnPlayerId : null;
    }
    case "carrom": {
      const c = s as unknown as CarromPublicState;
      return c.phase === "aiming" ? c.turnPlayerId : null;
    }
    case "chess": {
      const c = s as unknown as ChessPublicState;
      if (c.phase !== "aiming") return null;
      return c.turn === "w" ? c.whitePlayerId : c.blackPlayerId;
    }
    case "bingo": {
      const b = s as unknown as BingoPlayerState;
      // `isMyTurn` is the server-computed "you may mark/claim now" flag —
      // the only correct source, since Bingo's caller rotation is internal.
      return b.isMyTurn ? "__bingo_self__" : null;
    }
    case "stargame": {
      const st = s as unknown as StarPlayerView;
      // Only the shuffle phase is a single-player action window; the pass
      // and stack phases are concurrent for everyone holding cards.
      return st.shuffleTurnId ?? null;
    }
    default:
      // rps, handcricket, snake, spacewar, blockblast, tambola,
      // namesplaceanimal, roadrash — simultaneous or server-driven.
      return null;
  }
}
