import { GAME_REACTIONS, pickReactionEmoji } from "@shared/reactions.js";

/**
 * Ambient fallback bot reaction, for the bot-capable engines that don't
 * implement `getBotReactionEmoji` themselves (see GameEngine.ts). A small
 * per-sub-move chance so bots occasionally react even in games without a
 * bespoke event hook wired up, without ever feeling chatty — most sub-moves
 * still produce nothing. `rng` is injectable for deterministic tests.
 */
const AMBIENT_REACTION_CHANCE = 0.07;

export function maybeAmbientBotReactionEmoji(
  gameKind: string,
  rng: () => number = Math.random,
): string | null {
  if (rng() >= AMBIENT_REACTION_CHANCE) return null;
  return pickReactionEmoji(GAME_REACTIONS[gameKind], rng);
}
