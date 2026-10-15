/**
 * Games that have been removed from the application.
 *
 * Removing a game does not remove what already names it: a table saved to disk, a favourite or
 * "recently played" entry in someone's browser. Those arrive at code that no longer knows the game,
 * so each place that reads such saved data asks here and drops the entry instead of tripping on it.
 *
 * Add a game here when it is deleted. Never remove one while saved data could still name it.
 */
export const RETIRED_GAME_KINDS: ReadonlySet<string> = new Set(["carrom"]);

export function isRetiredGame(kind: string): boolean {
  return RETIRED_GAME_KINDS.has(kind);
}
