/**
 * The advisor's judgement calls, in one place so they can be tuned against measured results rather than
 * guessed. Each is a trade-off between two things a player cares about; the comment says which.
 */
export interface AdvisorTuning {
  /**
   * How much points left in the hand matter next to speed. Speed wins rounds; points are what is paid when an
   * opponent wins first. Higher means "keep the hand cheap even if it is a little slower".
   */
  deadwoodWeight: number;
  /**
   * How much to avoid throwing a card an opponent was seen to pick up the neighbour of. Higher means "do not
   * feed them", at the cost of keeping a worse card.
   */
  feedWeight: number;
  /**
   * The lowest chance of improving that is counted when estimating turns to win, so a hand with no outs scores
   * as "far away" rather than "infinitely far".
   */
  chanceFloor: number;
  /**
   * The chance a draw finishes a hand that is one card from showing, assumed for the last step of a hand that
   * is further away. Every hand ends on one specific card, so a hand with many flexible outs now is not as fast
   * as "needed ÷ chance" suggests; this keeps a hand that is one card away from losing to one that is two away.
   */
  finalChance: number;
  /**
   * How much better the open card must make the hand, in estimated turns, before it is taken over an unknown
   * closed card. Taking the open card also shows opponents what you want, so it has to be clearly better.
   */
  openMargin: number;
  /**
   * The same, when the open card leaves the hand no closer to showing and only trims points or improves the
   * odds a little. Such a pickup rarely earns the information it gives away, so it must clear a higher bar.
   */
  openNoGainMargin: number;
  /**
   * How many turns a typical opponent takes to show. With the hand's own estimate it gives the chance of
   * winning the race, which is what separates "play on" from "drop now".
   */
  rivalTurns: number;
  /**
   * The share of the hand's current deadwood still expected to be on it when someone else shows: hands improve
   * as the round goes on, so the points paid on a loss are less than the points held today.
   */
  lossShare: number;
  /** How many points playing on must be expected to cost, beyond the drop penalty, before dropping is advised. */
  dropMargin: number;
  /**
   * The last own turn on which a drop is still advised; -1 never advises one. OFF by default: in self-play
   * (4 players, 80 deals) a threshold loose enough to fire lost points (12: dropped 55 of 80 deals, -40 a deal;
   * 20: five drops, 4 points a deal worse than never dropping) and a tighter one never fired. The opponents
   * finish more slowly than a first-turn read of the hand suggests, so playing on pays. Turn it on only with
   * a new measurement, e.g. against human play.
   */
  dropUntilTurn: number;
}

export const DEFAULT_TUNING: AdvisorTuning = {
  // deadwoodWeight and finalChance were set by self-play (2 players, 120 deals per setting): 0.35 won 50.0% and lost
  // 2.6 points a deal; 1.8 won 56.7%; 2.8 with finalChance 0.06 won 59.2% and gained 5.4 a deal. The curve is flat
  // beyond about 2, so the value is not finely tuned.
  deadwoodWeight: 2.8,
  feedWeight: 0.4,
  chanceFloor: 0.04,
  finalChance: 0.06,
  openMargin: 0.25,
  openNoGainMargin: 1,
  rivalTurns: 11,
  lossShare: 0.6,
  dropMargin: 20,
  dropUntilTurn: -1,
};
