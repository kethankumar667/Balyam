/**
 * Ludo pacing — every number that decides how FAST the game feels, in one
 * place, on both sides of the wire.
 *
 * These were spread across four files: `DICE_ROLL_MS` in client Dice.tsx,
 * `STEP_MS` inline in useLudoBoard.ts, the roll cooldown inline in an effect,
 * and the bot think delay in the server engine. Answering "the game feels
 * slow" meant finding four unrelated numbers and reasoning about how they
 * compose — and they compose badly.
 *
 * The budget has been tuned in both directions now. It was first cut hard
 * (bots inherited a 1200-2000ms generic delay applied PER SUB-MOVE, so a 3-bot
 * table cost 7-12s a lap), and the cut overshot: bot turns went past faster
 * than their own animations, so a whole turn — roll, move, hand over — could
 * land inside a single frame. Playing against bots read as a flicker.
 *
 * The rule that fixes it, and the reason the delays are no longer flat:
 *
 *   A SEAT MAY NOT ACT UNTIL THE PREVIOUS SEAT'S ANIMATION HAS FINISHED.
 *
 * So a bot's pause is `animation still owed to the viewer` + `a beat`, not a
 * constant that happened to be shorter than the dice tumble. `travelMsFor` and
 * `DICE_ROLL_MS` are what the server uses to price that animation, which is
 * exactly why they live here rather than in the client.
 */

/** Dice tumble before the face is readable. The client holds the token walk
 *  until this elapses, so a roll and its move never animate on top of each
 *  other — you see the number, THEN the piece that number moved. */
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
 *
 * The floor matters more than the ceiling here: below roughly 120ms a hop
 * stops reading as a hop and the piece looks like it slid. A five must be
 * countable as five.
 */
export const STEP_MS = 190;

/** Floor for compressed travel, so a long move never becomes a blur. */
export const STEP_MS_MIN = 120;

/** How much each extra cell shortens the per-cell time. */
const STEP_COMPRESSION = 12;

/**
 * Per-cell delay for a hop of `steps` cells. One step keeps the full beat
 * because it has to be legible; six compress to ~130ms each.
 */
export function stepMsFor(steps: number): number {
  return Math.max(STEP_MS_MIN, STEP_MS - Math.max(0, steps - 1) * STEP_COMPRESSION);
}

/** Wall-clock cost of walking a token `steps` cells. This is the number the
 *  server needs in order to not let the next seat act mid-walk. */
export function travelMsFor(steps: number): number {
  if (steps <= 0) return 0;
  return steps * stepMsFor(steps);
}

/**
 * How much of a step's slot the piece spends MOVING, the rest being at rest on
 * the cell it just reached.
 *
 * This ratio is the whole fix for "the token jumped five squares in one shot".
 * The token's CSS transition used to be a fixed 380ms while steps arrived
 * every ~100ms, so each new cell re-aimed a transition that was barely a third
 * done — the piece never actually landed on any intermediate square and the
 * net motion was one straight glide to the destination, cutting the corner of
 * the track. Keeping the transition strictly SHORTER than the step interval is
 * what makes the individual squares visible.
 */
const HOP_MOVE_RATIO = 0.78;

/** CSS transition duration for one hop of a `steps`-cell walk. */
export function hopMsFor(steps: number): number {
  return Math.round(stepMsFor(steps) * HOP_MOVE_RATIO);
}

/**
 * The beat between one seat finishing and the next one starting.
 *
 * Purely for legibility: without it the handover happens on the same frame the
 * last token stops, and at a table of bots there is no moment where the board
 * is still and you can see whose turn it became.
 */
export const TURN_HANDOFF_MS = 320;

/**
 * Bot "thinking" pause, applied PER SUB-MOVE (a Ludo turn is roll + move, so a
 * bot turn costs twice this) ON TOP OF whatever animation is still owed.
 *
 * Deliberately small: it is no longer carrying the job of covering the dice
 * tumble — `botThinkMs` is handed the real animation cost now, so this is only
 * the human-ish hesitation on top of it.
 */
export const BOT_THINK_MIN_MS = 200;
export const BOT_THINK_JITTER_MS = 180;

/**
 * One sample of the bot pause.
 *
 * `animMs` is the animation the client still owes the viewer from the LAST
 * broadcast — the dice tumble, the token walk, the handover beat. Passing it
 * in is what stops a bot acting over the top of the previous bot. `rng` is
 * injectable so tests stay deterministic.
 */
export function botThinkMs(animMs = 0, rng: () => number = Math.random): number {
  return Math.max(0, animMs) + BOT_THINK_MIN_MS + rng() * BOT_THINK_JITTER_MS;
}

/**
 * Rough cost of one full lap, in ms — the number that actually answers "does
 * this feel slow?". Exposed so a test can assert the budget rather than let it
 * drift in either direction one constant at a time.
 */
export function estimatedLapMs(botCount: number, avgTravelSteps = 3): number {
  const think = BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS / 2;
  const own = ROLL_COOLDOWN_MS + DICE_ROLL_MS + travelMsFor(avgTravelSteps);
  // Each bot turn is two paced sub-moves: the roll (which must wait out the
  // previous seat's walk plus the handover) and the move (which must wait out
  // its own dice tumble).
  const beforeRoll = travelMsFor(avgTravelSteps) + TURN_HANDOFF_MS + think;
  const beforeMove = DICE_ROLL_MS + think;
  return own + botCount * (beforeRoll + beforeMove);
}
