/**
 * Ludo pacing — every number that decides how FAST the game feels, in one
 * place, on both sides of the wire.
 *
 * These were spread across four files: `DICE_ROLL_MS` in client Dice.tsx,
 * `STEP_MS` inline in useLudoBoard.ts, the roll cooldown inline in an effect,
 * and the bot think delay in the server engine. Answering "the game feels
 * slow" meant finding four unrelated numbers and reasoning about how they
 * compose — and they compose badly: the bot delay applies PER SUB-MOVE, so a
 * value that looks reasonable on its own tripled in practice.
 *
 * Keeping them together means the budget is visible. A full lap of a table
 * with N bots costs roughly:
 *
 *   your turn:  ROLL_COOLDOWN_MS + DICE_ROLL_MS + (travel)
 *   each bot:   2 x BOT_THINK_MS  (roll, then move)
 *
 * so at 3 bots the bot delay dominates everything else combined. Tune here.
 */

/** Dice tumble before the face is readable. Also the floor for how long a bot
 *  should pause, since a bot that acts faster than this looks instant. */
export const DICE_ROLL_MS = 640;

/**
 * Dead time after the turn changes before you may roll.
 *
 * This exists ONLY to swallow a double-tap on the roll button. It was 1000ms,
 * which put a full second of nothing at the start of every one of your turns.
 */
export const ROLL_COOLDOWN_MS = 250;

/**
 * Per-cell token travel, for a single-step hop. Longer hops compress — see
 * `stepMsFor` — so a six does not take six times as long to watch as a one.
 */
export const STEP_MS = 160;

/** Floor for compressed travel, so a long move never becomes a blur. */
export const STEP_MS_MIN = 85;

/** How much each extra cell shortens the per-cell time. */
const STEP_COMPRESSION = 14;

/**
 * Per-cell delay for a hop of `steps` cells. One step keeps the full beat
 * because it has to be legible; six compress to ~90ms each.
 */
export function stepMsFor(steps: number): number {
  return Math.max(STEP_MS_MIN, STEP_MS - Math.max(0, steps - 1) * STEP_COMPRESSION);
}

/**
 * Bot "thinking" pause, applied PER SUB-MOVE (a Ludo turn is roll + move, so a
 * bot turn costs twice this).
 *
 * The generic RoomManager fallback is 1200-2000ms, which Ludo inherited by not
 * implementing the hook — 2.4-4s per bot turn, 7-12s of waiting at a 3-bot
 * table. A Ludo sub-move carries almost no information to absorb, so the pause
 * only needs to cover the client's dice animation and read as deliberate.
 */
export const BOT_THINK_MIN_MS = 420;
export const BOT_THINK_JITTER_MS = 260;

/** One sample of the bot pause. `rng` is injectable so tests stay deterministic. */
export function botThinkMs(rng: () => number = Math.random): number {
  return BOT_THINK_MIN_MS + rng() * BOT_THINK_JITTER_MS;
}

/**
 * Rough cost of one full lap, in ms — the number that actually answers "does
 * this feel slow?". Exposed so a test can assert the budget rather than let it
 * drift back up one constant at a time.
 */
export function estimatedLapMs(botCount: number, avgTravelSteps = 3): number {
  const own = ROLL_COOLDOWN_MS + DICE_ROLL_MS + avgTravelSteps * stepMsFor(avgTravelSteps);
  const perBot = 2 * (BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS / 2);
  return own + botCount * perBot;
}
