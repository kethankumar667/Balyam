import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";
import { isTooShort } from "./SessionRules.js";

/**
 * Finds accounts that look like they are being fed wins, for an operator to look at.
 *
 * ── Why this is a report and not a penalty ────────────────────────────
 * BHALYAM is for friends who already know each other, so two accounts that play
 * each other all the time is the product working, not a fault. What is NOT normal
 * is one-sided traffic: an account whose games are almost all against one other
 * account, and who almost always loses to it. That is the shape of a feeder — a
 * throwaway that exists to hand XP to a main — and a table-repeat limit alone cannot
 * see it, because it only counts one table.
 *
 * So this only ever produces findings, with the numbers behind each one. It changes
 * no account's state. A person decides, and can set a watch or restrict with a note
 * through the risk admin API like any other case.
 *
 * ── The test, per (beneficiary B, feeder F) over a recent window ──────
 *   1. they played each other at least MIN_PAIR_MATCHES times (matches too short
 *      to have been played do not count);
 *   2. B won at least LOPSIDED_SHARE of those;
 *   3. at least FEEDER_CONCENTRATION of all F's games in the window were against B.
 * All three, because each alone is ordinary: friends play a lot, one is better, a
 * newcomer starts by playing the person who invited them.
 *
 * Pure: it takes the matches and the clock, so the rule can be read and tested alone.
 */

export const COLLUSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
export const MIN_PAIR_MATCHES = 12;
export const LOPSIDED_SHARE = 0.9;
export const FEEDER_CONCENTRATION = 0.8;

export interface CollusionFeeder {
  playerId: string;
  /** Games between this feeder and the beneficiary in the window. */
  matches: number;
  /** How many of those the beneficiary won. */
  beneficiaryWins: number;
  /** Share of ALL this feeder's windowed games that were against the beneficiary. */
  concentration: number;
}

export interface CollusionFinding {
  beneficiaryId: string;
  feeders: CollusionFeeder[];
  /** Total games between the beneficiary and its feeders. */
  matches: number;
  /** Plain words for the operator: what was seen and over what window. */
  summary: string;
}

interface RuntimeParticipant {
  playerId: string;
  isBot?: boolean;
  isLocal?: boolean;
  isMember?: boolean;
  isWinner?: boolean;
}

function isMemberSeat(p: RuntimeParticipant): boolean {
  if (p.isBot || p.isLocal) return false;
  return p.isMember === true || (p.isMember === undefined && !p.playerId.startsWith("guest_"));
}

interface PairTally {
  matches: number;
  wins: Record<string, number>;
}

export function findFeedingPatterns(
  matchesByPlayer: ReadonlyMap<string, readonly MatchHistoryItem[]>,
  now: number,
): CollusionFinding[] {
  const since = now - COLLUSION_WINDOW_MS;
  const pairs = new Map<string, PairTally>();
  const gamesOf = new Map<string, number>();
  const seenMatches = new Set<string>();

  for (const [, list] of matchesByPlayer) {
    for (const match of list) {
      // Each match is held once per player; count it once. Room code + start is the match's identity.
      const matchKey = `${match.roomCode}_${match.startedAt}`;
      if (seenMatches.has(matchKey)) continue;
      seenMatches.add(matchKey);
      if (match.finishedAt < since || isTooShort(match.game, match.durationMs)) continue;

      const seats = (match.participants as RuntimeParticipant[]).filter(isMemberSeat);
      if (seats.length < 2) continue;

      for (const seat of seats) gamesOf.set(seat.playerId, (gamesOf.get(seat.playerId) ?? 0) + 1);

      // Only a two-person table says who beat whom; a bigger table's win is not one-on-one evidence.
      if (seats.length !== 2) continue;
      const [a, b] = [...seats].sort((x, y) => (x.playerId < y.playerId ? -1 : 1)) as [RuntimeParticipant, RuntimeParticipant];
      const key = `${a.playerId}|${b.playerId}`;
      const tally = pairs.get(key) ?? { matches: 0, wins: { [a.playerId]: 0, [b.playerId]: 0 } };
      tally.matches += 1;
      if (a.isWinner) tally.wins[a.playerId] = (tally.wins[a.playerId] ?? 0) + 1;
      if (b.isWinner) tally.wins[b.playerId] = (tally.wins[b.playerId] ?? 0) + 1;
      pairs.set(key, tally);
    }
  }

  const byBeneficiary = new Map<string, CollusionFeeder[]>();
  for (const [key, tally] of pairs) {
    if (tally.matches < MIN_PAIR_MATCHES) continue;
    const [first, second] = key.split("|") as [string, string];
    for (const [beneficiary, feeder] of [[first, second], [second, first]] as const) {
      const wins = tally.wins[beneficiary] ?? 0;
      if (wins / tally.matches < LOPSIDED_SHARE) continue;
      const total = gamesOf.get(feeder) ?? tally.matches;
      const concentration = tally.matches / total;
      if (concentration < FEEDER_CONCENTRATION) continue;
      const list = byBeneficiary.get(beneficiary) ?? [];
      list.push({ playerId: feeder, matches: tally.matches, beneficiaryWins: wins, concentration: Math.round(concentration * 100) / 100 });
      byBeneficiary.set(beneficiary, list);
    }
  }

  const days = Math.round(COLLUSION_WINDOW_MS / 86_400_000);
  return [...byBeneficiary.entries()]
    .map(([beneficiaryId, feeders]) => {
      const matches = feeders.reduce((n, f) => n + f.matches, 0);
      return {
        beneficiaryId,
        feeders: feeders.sort((x, y) => y.matches - x.matches),
        matches,
        summary:
          `${feeders.length} account(s) played ${beneficiaryId} ${matches} times in ${days} days, ` +
          `losing at least ${Math.round(LOPSIDED_SHARE * 100)}% of them, and spent at least ` +
          `${Math.round(FEEDER_CONCENTRATION * 100)}% of all their games against it.`,
      };
    })
    .sort((x, y) => y.matches - x.matches);
}
