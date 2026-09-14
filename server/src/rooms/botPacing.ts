/**
 * Platform-default bot "think" pause — used by every bot-capable engine that
 * does NOT define its own `getBotThinkDelayMs()` (server/src/games/GameEngine.ts).
 *
 * Of the 17 bot-capable engines, only Ludo, Tambola, BlockBlast, and StarGame
 * override this with game-tuned pacing. The other 13 (Rummy, UNO, Hand
 * Cricket, RPS, Bingo, Chess, Dots & Boxes, Carrom, SNL, WordBuilding,
 * NamesPlaceAnimal, Snake, ...) all fell through to a single flat
 * `1200 + Math.random() * 800` band regardless of how fast or slow that game
 * actually feels — a uniform cadence is itself the tell that gives a bot
 * away, independent of the average delay. BlockBlastEngine's own
 * `getBotThinkDelayMs` already documents this exact failure mode for its one
 * game; this generalizes the fix as the shared fallback instead.
 *
 * Two components:
 *   - a wide base range, so back-to-back bot turns don't land at a
 *     noticeably repeatable interval;
 *   - a small chance of a longer "considering" pause on top, so not every
 *     bot turn feels the same weight — occasionally a bot visibly takes a
 *     beat longer, the way a real player does on a harder decision.
 */

const BASE_MIN_MS = 1000;
const BASE_JITTER_MS = 1800; // base range: 1000-2800ms

const LONG_THINK_CHANCE = 0.15;
const LONG_THINK_MIN_MS = 1200;
const LONG_THINK_JITTER_MS = 1800; // extra 1200-3000ms, ~15% of the time

/** One sample of the generic bot pause. `rng` is injectable for deterministic tests. */
export function genericBotThinkDelayMs(rng: () => number = Math.random): number {
  const base = BASE_MIN_MS + rng() * BASE_JITTER_MS;
  const longThink = rng() < LONG_THINK_CHANCE ? LONG_THINK_MIN_MS + rng() * LONG_THINK_JITTER_MS : 0;
  return base + longThink;
}
