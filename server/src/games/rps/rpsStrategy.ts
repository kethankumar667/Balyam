import type { RpsChoice } from "@shared/types.js";

/**
 * What a Rock-Paper-Scissors bot throws.
 *
 * Against a perfectly random player nothing beats an even split, and the old bot threw at random. But people
 * are not random: they repeat, cycle, favour a throw, switch after losing, and answer what the bot just threw.
 * This bot learns which of those habits THIS opponent has and throws what beats their likely next move.
 *
 * It reads only COMPLETED rounds. The opponent's throw in the current round is never an input: the engine has
 * the bot wait until the human has locked in, and using that choice would be cheating. Everything here is a
 * function of the past.
 *
 * ── How it learns ────────────────────────────────────────────────────
 * Five small predictors each guess the opponent's next throw from a different habit:
 *   - their overall tendencies, recent rounds counting more,
 *   - what they threw after their last throw,
 *   - what they threw after their last two,
 *   - what they threw after the last round's pair (theirs and the bot's), which catches "win-stay, lose-shift",
 *   - what they threw after the bot's last throw, which catches "play what beats the bot".
 * Each is scored on how well it has predicted this opponent so far, and the guesses are blended in proportion.
 *
 * ── Staying unexploitable ────────────────────────────────────────────
 * When the blended guess has no real edge (a random opponent, or too little history) it throws uniformly at
 * random; and even with an edge it throws a random move one time in ten, so a player who works out the
 * bot's habit cannot simply farm it.
 */

export interface RpsRoundView {
  mine: RpsChoice;
  theirs: RpsChoice;
}

const CHOICES: readonly RpsChoice[] = ["rock", "paper", "scissors"];
const INDEX: Record<RpsChoice, number> = { rock: 0, paper: 1, scissors: 2 };
/** What beats each throw. */
const BEATEN_BY: Record<RpsChoice, RpsChoice> = { rock: "paper", paper: "scissors", scissors: "rock" };

/** Rounds of history before it trusts a pattern at all. */
const MIN_HISTORY = 3;
/** Older rounds count for less: each step back multiplies a round's weight by this. */
const RECENCY_DECAY = 0.9;
/** How sharply a predictor that has been right outweighs one that has been wrong. */
const TRUST_SHARPNESS = 3;
/** Smoothing so a pattern seen once is not treated as certain. */
const PRIOR = 0.6;
/** The edge the blend must show before the bot plays to it instead of at random. */
const MIN_EDGE = 0.1;
/** Chance of a deliberate random throw even when it has an edge. */
const EXPLORE = 0.1;

type Distribution = [number, number, number];

const uniform = (): Distribution => [1 / 3, 1 / 3, 1 / 3];

function normalise(counts: Distribution): Distribution {
  const total = counts[0] + counts[1] + counts[2];
  return total > 0 ? [counts[0] / total, counts[1] / total, counts[2] / total] : uniform();
}

/** A predictor that keeps counts of what followed each situation it has seen. */
class Context {
  private table = new Map<string, Distribution>();

  predict(key: string): Distribution {
    const seen = this.table.get(key);
    if (!seen) return uniform();
    return normalise([seen[0] + PRIOR, seen[1] + PRIOR, seen[2] + PRIOR]);
  }

  learn(key: string, outcome: RpsChoice): void {
    const seen = this.table.get(key) ?? [0, 0, 0];
    seen[INDEX[outcome]] += 1;
    this.table.set(key, seen);
  }
}

const PREDICTORS = 5;

/** Each predictor's situation key before round `t`, from the rounds already played. */
function keysBefore(history: readonly RpsRoundView[], t: number): (string | null)[] {
  const last = history[t - 1];
  const before = history[t - 2];
  return [
    "all",
    last ? last.theirs : null,
    last && before ? `${before.theirs}>${last.theirs}` : null,
    last ? `${last.theirs}|${last.mine}` : null,
    last ? last.mine : null,
  ];
}

/** The blended guess at the opponent's next throw, from completed rounds only. */
export function predictOpponent(history: readonly RpsRoundView[]): Distribution {
  const contexts = Array.from({ length: PREDICTORS }, () => new Context());
  const frequency: Distribution = [0, 0, 0];
  const scores = new Array<number>(PREDICTORS).fill(0);

  for (let t = 0; t <= history.length; t++) {
    const keys = keysBefore(history, t);
    const guesses: Distribution[] = contexts.map((context, p) => {
      if (p === 0) return normalise([frequency[0] + PRIOR, frequency[1] + PRIOR, frequency[2] + PRIOR]);
      const key = keys[p];
      return key === null ? uniform() : context.predict(key);
    });

    if (t === history.length) {
      // The prediction for the round about to be played: blend by how well each has done.
      const best = Math.max(...scores);
      const weights = scores.map((s) => Math.exp(TRUST_SHARPNESS * (s - best)));
      const sum = weights.reduce((a, b) => a + b, 0);
      const blend: Distribution = [0, 0, 0];
      guesses.forEach((g, p) => {
        for (let i = 0; i < 3; i++) blend[i] += (weights[p] / sum) * g[i];
      });
      return blend;
    }

    // Score each predictor on what actually happened, then learn from it.
    const actual = history[t].theirs;
    guesses.forEach((g, p) => {
      scores[p] = scores[p] * RECENCY_DECAY + Math.log(Math.max(1e-6, g[INDEX[actual]]));
    });
    for (let i = 0; i < 3; i++) frequency[i] *= RECENCY_DECAY;
    frequency[INDEX[actual]] += 1;
    keys.forEach((key, p) => {
      if (p !== 0 && key !== null) contexts[p].learn(key, actual);
    });
  }
  return uniform();
}

/** The throw to make this round. */
export function chooseRpsMove(history: readonly RpsRoundView[], random: () => number = Math.random): RpsChoice {
  const randomThrow = (): RpsChoice => CHOICES[Math.floor(random() * 3)];
  if (history.length < MIN_HISTORY) return randomThrow();

  const guess = predictOpponent(history);
  // Expected result of each of my throws: the chance it beats their throw minus the chance theirs beats it.
  let best: RpsChoice = "rock";
  let bestEdge = -Infinity;
  for (const mine of CHOICES) {
    const losesTo = guess[INDEX[BEATEN_BY[mine]]];
    const winsAgainst = guess[INDEX[CHOICES.find((c) => BEATEN_BY[c] === mine)!]];
    const edge = winsAgainst - losesTo;
    if (edge > bestEdge) {
      bestEdge = edge;
      best = mine;
    }
  }
  if (bestEdge < MIN_EDGE || random() < EXPLORE) return randomThrow();
  return best;
}
