/**
 * Which number a Hand Cricket bot shows on a ball.
 *
 * Both sides show a number 1-6 at once. The same number is a wicket; otherwise the batter scores the
 * batter's number. So a batter wants a high number the bowler will NOT show, and a bowler wants to match
 * the batter without conceding a big number when it misses.
 *
 * The old bot only counted the opponent's last six numbers and nudged weights up or down, which ignored what
 * each number is actually worth. This one:
 *
 *   1. learns the opponent's habits over the whole innings (their favourite numbers, what they show after
 *      their own last number, and what they show in answer to the bot's last number), scoring each habit on
 *      how well it has predicted them so far, and blends the guesses;
 *   2. values each number it may show by the expected result against that guess:
 *        batter  =  number x P(not matched)  -  wicket cost x P(matched)
 *        bowler  =  wicket cost x P(matched)  -  runs conceded when it misses
 *      where a wicket costs more the fewer wickets and the more balls remain, and less when the batter
 *      must take risks to win a chase;
 *   3. picks by those values with some randomness, so a player who works out its habit cannot farm it.
 *
 * It reads only completed balls. Pure: the same inputs and random source give the same number.
 */

export interface HandCricketPickInput {
  isBowler: boolean;
  /** Numbers it may show (a restricted powerplay ball or a yorker allows only 1-3). */
  allowed: readonly number[];
  /** The opponent's numbers this innings, oldest first. */
  opponentPicks: readonly number[];
  /** The bot's own numbers this innings, oldest first, aligned ball for ball with `opponentPicks`. */
  ownPicks: readonly number[];
  wicketsLeft: number;
  ballsLeft: number;
  /** Runs still needed when chasing, otherwise null. */
  runsNeeded: number | null;
  random?: () => number;
}

const NUMBERS = [1, 2, 3, 4, 5, 6] as const;
const RECENCY_DECAY = 0.92;
const TRUST_SHARPNESS = 3;
const PRIOR = 0.5;
/** How strongly values separate the choices: higher plays the best one more often. */
const SOFTMAX_SCALE = 0.9;
/** Chance of a plain uniform pick, so the bot is never fully predictable. */
const EXPLORE = 0.08;
const RUNS_PER_BALL_ESTIMATE = 3;
const MAX_WICKET_COST = 30;
const MIN_WICKET_COST = 2;
/** A chasing batter who must hurry values a wicket at this fraction of its usual cost. */
const DESPERATE_WICKET_FACTOR = 0.6;
const DESPERATE_REQUIRED_RATE = 1.5;
/** Reward for a number that wins the chase outright. */
const WINNING_NUMBER_BONUS = 50;

type Distribution = number[];

const uniform = (): Distribution => NUMBERS.map(() => 1 / NUMBERS.length);

function normalise(counts: number[]): Distribution {
  const total = counts.reduce((a, b) => a + b, 0);
  return total > 0 ? counts.map((c) => c / total) : uniform();
}

class Context {
  private table = new Map<string, number[]>();

  predict(key: string): Distribution {
    const seen = this.table.get(key);
    return seen ? normalise(seen.map((c) => c + PRIOR)) : uniform();
  }

  learn(key: string, outcome: number): void {
    const seen = this.table.get(key) ?? NUMBERS.map(() => 0);
    seen[outcome - 1] += 1;
    this.table.set(key, seen);
  }
}

const PREDICTORS = 4;

/** Each predictor's situation key before ball `t`. Index 0 is the plain frequency predictor, which needs none. */
function keysBefore(opp: readonly number[], own: readonly number[], t: number): (string | null)[] {
  const lastOpp = t >= 1 ? opp[t - 1] : undefined;
  const lastOwn = t >= 1 ? own[t - 1] : undefined;
  return [
    "all",
    lastOpp === undefined ? null : `o${lastOpp}`,
    lastOwn === undefined ? null : `m${lastOwn}`,
    lastOpp === undefined || lastOwn === undefined ? null : `o${lastOpp}m${lastOwn}`,
  ];
}

/** The blended guess at the opponent's next number. */
export function predictNextNumber(opp: readonly number[], own: readonly number[]): Distribution {
  const contexts = Array.from({ length: PREDICTORS }, () => new Context());
  const frequency = NUMBERS.map(() => 0);
  const scores = new Array<number>(PREDICTORS).fill(0);
  const balls = opp.length;

  for (let t = 0; t <= balls; t++) {
    const keys = keysBefore(opp, own, t);
    const guesses = contexts.map((context, p) => {
      if (p === 0) return normalise(frequency.map((c) => c + PRIOR));
      const key = keys[p];
      return key === null ? uniform() : context.predict(key);
    });

    if (t === balls) {
      const best = Math.max(...scores);
      const weights = scores.map((s) => Math.exp(TRUST_SHARPNESS * (s - best)));
      const sum = weights.reduce((a, b) => a + b, 0);
      const blend = NUMBERS.map(() => 0);
      guesses.forEach((g, p) => g.forEach((value, i) => { blend[i] += (weights[p] / sum) * value; }));
      return blend;
    }

    const actual = opp[t];
    guesses.forEach((g, p) => {
      scores[p] = scores[p] * RECENCY_DECAY + Math.log(Math.max(1e-6, g[actual - 1]));
    });
    for (let i = 0; i < frequency.length; i++) frequency[i] *= RECENCY_DECAY;
    frequency[actual - 1] += 1;
    keys.forEach((key, p) => {
      if (p !== 0 && key !== null) contexts[p].learn(key, actual);
    });
  }
  return uniform();
}

/** What losing a wicket is worth to the side that loses it. */
function wicketCost(input: HandCricketPickInput): number {
  const wickets = Math.max(1, input.wicketsLeft);
  let cost = (RUNS_PER_BALL_ESTIMATE * Math.max(0, input.ballsLeft)) / wickets;
  if (!input.isBowler && input.runsNeeded !== null && input.ballsLeft > 0 && input.runsNeeded / input.ballsLeft >= DESPERATE_REQUIRED_RATE) {
    cost *= DESPERATE_WICKET_FACTOR;
  }
  return Math.max(MIN_WICKET_COST, Math.min(MAX_WICKET_COST, cost));
}

/** The number to show. */
export function chooseHandCricketPick(input: HandCricketPickInput): number {
  const random = input.random ?? Math.random;
  const allowed = input.allowed.length > 0 ? input.allowed : NUMBERS;
  if (allowed.length === 1) return allowed[0];
  if (input.opponentPicks.length === 0 && !input.isBowler) {
    // No information yet: the best a batter can do against an unknown bowler is to start high.
    return allowed.reduce((best, v) => (v > best ? v : best), allowed[0]);
  }

  const guess = predictNextNumber(input.opponentPicks, input.ownPicks);
  const cost = wicketCost(input);

  const values = allowed.map((mine) => {
    const matched = guess[mine - 1];
    if (input.isBowler) {
      // The opponent is the batter: matching their number is a wicket; missing concedes the number they show.
      let conceded = 0;
      NUMBERS.forEach((theirs, i) => {
        if (theirs !== mine) conceded += guess[i] * theirs;
      });
      return cost * matched - conceded;
    }
    let value = mine * (1 - matched) - cost * matched;
    if (input.runsNeeded !== null && mine >= input.runsNeeded) value += WINNING_NUMBER_BONUS * (1 - matched);
    return value;
  });

  if (random() < EXPLORE) return allowed[Math.floor(random() * allowed.length)];

  const best = Math.max(...values);
  const weights = values.map((v) => Math.exp(SOFTMAX_SCALE * (v - best)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < allowed.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return allowed[i];
  }
  return allowed[allowed.length - 1];
}
