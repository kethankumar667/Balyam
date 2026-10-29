import type { ReferralFriend, ReferralOverview } from "@shared/referrals";
import { daysLeft, formatCoins } from "../referralCopy";

/** done: finished. current: where this is now. upcoming: not reached yet. ended: it will not happen (window over, held, withdrawn). */
export type StepState = "done" | "current" | "upcoming" | "ended";

export type JourneyStageKey = "invited" | "joined" | "played" | "verified" | "rewarded";

export interface JourneyStage {
  key: JourneyStageKey;
  label: string;
  hint: string;
  state: StepState;
}

/**
 * The whole invitation lifecycle, read from the member's totals: code shared, a friend joined, a friend played with
 * another person, the server confirming that match (the hold), and the coins landing. Several friends can be at
 * different points, so each stage describes the furthest the member has reached: "Verify Match" is current while a
 * played match is still in its hold and nothing has been paid yet.
 */
export function journeyStages(totals: ReferralOverview["totals"], campaign: ReferralOverview["campaign"]): JourneyStage[] {
  const hasJoined = totals.joined > 0;
  const hasPlayed = totals.qualified > 0;
  const hasPaid = totals.bonusCredited > 0;
  const rewardHint = campaign.inviterBonus === campaign.inviteeBonus ? `${formatCoins(campaign.inviterBonus)} coins each` : "Coins for you both";
  return [
    { key: "invited", label: "Invite Sent", hint: "Share your code", state: "done" },
    { key: "joined", label: "Friend Joins", hint: "They create a profile", state: hasJoined ? "done" : "current" },
    { key: "played", label: "Play Together", hint: "Complete an eligible match", state: hasPlayed ? "done" : hasJoined ? "current" : "upcoming" },
    { key: "verified", label: "Verify Match", hint: "We confirm the match", state: hasPaid ? "done" : hasPlayed ? "current" : "upcoming" },
    { key: "rewarded", label: "Both Get Rewards", hint: rewardHint, state: hasPaid ? "done" : "upcoming" },
  ];
}

export type BadgeTone = "info" | "pending" | "success" | "warn" | "muted";

export interface FriendTrack {
  steps: Array<{ key: "joined" | "played" | "reward"; label: string; state: StepState }>;
  badge: { label: string; tone: BadgeTone };
  /** What happens next, in a sentence, or null when there is nothing to add. */
  note: string | null;
}

function rewardStep(friend: ReferralFriend): StepState {
  switch (friend.yourBonus.state) {
    case "CREDITED": return "done";
    case "VESTING":
    case "PENDING": return "current";
    case "BLOCKED":
    case "VOIDED": return "ended";
    default: return friend.status === "EXPIRED" ? "ended" : "upcoming";
  }
}

/** One invited friend's three-step track, the badge that names where they are, and what comes next. */
export function friendTrack(friend: ReferralFriend, campaign: ReferralOverview["campaign"], now: number): FriendTrack {
  const windowOpen = friend.status === "JOINED" && friend.expiresAt > now;
  const played: StepState = friend.status === "QUALIFIED" ? "done" : windowOpen ? "current" : "ended";
  const steps: FriendTrack["steps"] = [
    { key: "joined", label: "Joined", state: "done" },
    { key: "played", label: "Play Match", state: played },
    { key: "reward", label: "Reward", state: rewardStep(friend) },
  ];

  if (friend.status === "EXPIRED" || (friend.status === "JOINED" && !windowOpen)) {
    return { steps, badge: { label: "Window ended", tone: "muted" }, note: `No eligible match was played within ${campaign.windowDays} days.` };
  }
  if (friend.status === "JOINED") {
    const left = daysLeft(friend.expiresAt, now);
    return {
      steps,
      badge: { label: "Joined", tone: "info" },
      note: `Next: play one match with another person · ${left} ${left === 1 ? "day" : "days"} left`,
    };
  }
  switch (friend.yourBonus.state) {
    case "CREDITED": return { steps, badge: { label: "Rewarded", tone: "success" }, note: null };
    case "VESTING":
    case "PENDING": return { steps, badge: { label: "Verifying", tone: "pending" }, note: null };
    case "BLOCKED": return { steps, badge: { label: "On hold", tone: "warn" }, note: null };
    case "VOIDED": return { steps, badge: { label: "Withdrawn", tone: "muted" }, note: null };
    default: return { steps, badge: { label: "Played together", tone: "success" }, note: null };
  }
}

/** Nodes for the Nostalgia vault: how many of the target are filled. Never more than the target. */
export function packNodes(pack: ReferralOverview["pack"]): { filled: number; total: number; remaining: number } {
  const total = Math.max(0, pack.target);
  const filled = Math.min(pack.qualifiedFriends, total);
  return { filled, total, remaining: total - filled };
}
