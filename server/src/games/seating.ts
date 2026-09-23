import type { Player } from "@shared/types.js";

/**
 * Rematch seating for two-seat, first-mover-matters games: whoever sat second last game moves
 * first this game, so the host stops opening every rematch. Players who have left are dropped;
 * anyone new keeps their relative order at the end.
 */
export function orderForAlternatingFirstMove(previousOrder: readonly string[], players: Player[]): Player[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const swapped = [...previousOrder].reverse().flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const seated = new Set(swapped.map((p) => p.id));
  return [...swapped, ...players.filter((p) => !seated.has(p.id))];
}
