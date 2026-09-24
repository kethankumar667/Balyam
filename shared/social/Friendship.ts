/**
 * The moments worth marking in a friendship, in the order a timeline shows them.
 *
 * A CLOSED list, defined once: the server records only these, the database's
 * check constraint mirrors them, and the client turns each into a line of text.
 * Every one is derived from something the server observed (a friendship
 * starting, a match finishing) — nothing here is user-supplied.
 */
export const FRIENDSHIP_MILESTONE_KINDS = [
  "FRIENDS_SINCE",
  "FIRST_MATCH",
  "FIRST_WIN",
  "MATCHES_10",
  "MATCHES_50",
  "MATCHES_100",
  "MATCHES_500",
  "MATCHES_1000",
  "FIRST_TOURNAMENT",
] as const;

export type FriendshipMilestoneKind = (typeof FRIENDSHIP_MILESTONE_KINDS)[number];

const KIND_SET: ReadonlySet<string> = new Set(FRIENDSHIP_MILESTONE_KINDS);

export function isFriendshipMilestoneKind(value: unknown): value is FriendshipMilestoneKind {
  return typeof value === "string" && KIND_SET.has(value);
}

export const FRIENDSHIP_MILESTONE_LABELS: Record<FriendshipMilestoneKind, string> = {
  FRIENDS_SINCE: "Became friends",
  FIRST_MATCH: "First match together",
  FIRST_WIN: "First win together",
  MATCHES_10: "10 matches together",
  MATCHES_50: "50 matches together",
  MATCHES_100: "100 matches together",
  MATCHES_500: "500 matches together",
  MATCHES_1000: "1,000 matches together",
  FIRST_TOURNAMENT: "First tournament together",
};

export interface FriendshipMilestone {
  kind: FriendshipMilestoneKind;
  /** When it happened: the match's time, or the moment they became friends. */
  reachedAt: number;
  /** The match that reached it. Absent for `FRIENDS_SINCE`. */
  matchId?: string;
}
