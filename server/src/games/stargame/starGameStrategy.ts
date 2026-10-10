import type { StarCard } from "@shared/types.js";

/**
 * Which chit a Star Game bot passes.
 *
 * The goal is four chits of ANY one value. Each pass, a player holds five chits (their four plus the one just
 * received) and must send one on. The old bot sent a random one, which breaks up a pair as readily as it drops
 * a stray, so its hand drifts instead of building.
 *
 * The right play is the obvious one for a set-collecting race: keep building the value you hold most of, and
 * send on a chit from the value you hold least of. Two details matter:
 *
 *   - Among values you hold equally (two pairs, say) it does not always favour the same one. A bot that always
 *     keeps its first pair makes the relay predictable; picking among the ties at random keeps the table moving.
 *   - Among equally poor chits it prefers not to send back the one it was just handed, so a single chit does
 *     not simply circle the whole table (the "same slip every round" failure the engine already guards against).
 *     A just-received chit that really is the poorest one is still the right one to send.
 *
 * Pure: the hand and the chit just received in, the chit to pass out.
 */

export interface StarPassInput {
  /** The chits it holds right now (four or five). */
  hand: readonly StarCard[];
  /** The chit it was just handed, if any. */
  justReceivedId: string | null;
  random: () => number;
}

/** The id of the chit to pass, or `null` for an empty hand. */
export function chooseStarPass(input: StarPassInput): string | null {
  const { hand, justReceivedId, random } = input;
  if (hand.length === 0) return null;

  const counts = new Map<string, number>();
  for (const card of hand) counts.set(card.value, (counts.get(card.value) ?? 0) + 1);

  // The value it is building: the biggest group, chosen at random among equal biggest groups.
  const most = Math.max(...counts.values());
  const biggest = [...counts.entries()].filter(([, n]) => n === most).map(([value]) => value);
  const keep = biggest[Math.floor(random() * biggest.length)];

  const sendable = hand.filter((card) => card.value !== keep);
  // A hand of one value is already four of a kind; nothing is worth sending, so give up the last chit.
  const pool = sendable.length > 0 ? sendable : hand;

  // Send from the thinnest value, and among equals not the chit just received.
  const thinnest = Math.min(...pool.map((card) => counts.get(card.value) ?? 0));
  const thin = pool.filter((card) => (counts.get(card.value) ?? 0) === thinnest);
  const fresh = thin.filter((card) => card.id !== justReceivedId);
  const finalists = fresh.length > 0 ? fresh : thin;
  return finalists[Math.floor(random() * finalists.length)].id;
}
