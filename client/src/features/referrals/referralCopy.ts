import type { ReferralBonusView, ReferralFriendStatus, ReferralOverview } from "@shared/referrals";
import { formatArrival } from "../../components/progression/formatArrival";

export type ChipTone = "success" | "info" | "muted" | "warn";

export interface BonusChip {
  tone: ChipTone;
  label: string;
}

const DAY_MS = 86_400_000;

export function formatCoins(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export function formatShortDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * When a held bonus reaches the wallet, with the time of day and how far off that is: "today at 9:42 PM (in 3 hr)".
 * A date alone ("Oct 29") left people unsure whether the coins would land that morning or that night. The coins are
 * paid by a sweep that runs every minute once the hold ends, so the time is when it becomes due, give or take a minute.
 */
export function formatArrivalMoment(target: number, now: number): string {
  if (target <= now) return "now";
  const when = new Date(target);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(today.getDate() + 1);
  const time = when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const day =
    when.toDateString() === today.toDateString() ? "today" : when.toDateString() === tomorrow.toDateString() ? "tomorrow" : formatShortDate(target);
  return `${day} at ${time} (${formatArrival(target, now)})`;
}

/** Whole days from `now` until `target`, never below zero. */
export function daysLeft(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / DAY_MS));
}

/**
 * One side's bonus as a short, honest line. A held or blocked bonus says why in plain words; it never
 * hints at a risk review, because a watch is not something a player is told about.
 */
export function describeBonus(view: ReferralBonusView, campaign: ReferralOverview["campaign"], now: number = Date.now()): BonusChip {
  const coins = `${formatCoins(view.amount)} coins`;
  switch (view.state) {
    case "CREDITED":
      return { tone: "success", label: view.creditedAt ? `${coins} received ${formatShortDate(view.creditedAt)}` : `${coins} received` };
    case "VESTING":
      return { tone: "info", label: view.vestingUntil ? `${coins} arriving ${formatArrivalMoment(view.vestingUntil, now)}` : `${coins} on the way` };
    case "PENDING":
      return { tone: "info", label: `${coins} being issued` };
    case "BLOCKED":
      return view.blockedReason === "CAP"
        ? { tone: "warn", label: `Not paid: ${campaign.rollingCap} friends already rewarded in ${campaign.capWindowDays} days` }
        : { tone: "warn", label: "On hold" };
    case "VOIDED":
      return { tone: "muted", label: "Withdrawn" };
    default:
      return { tone: "muted", label: `${coins} after a first match with another person` };
  }
}

export function describeFriendStatus(status: ReferralFriendStatus, expiresAt: number, now: number): string {
  if (status === "QUALIFIED") return "Played a match with another person";
  if (status === "EXPIRED") return "The window to play together has ended";
  const left = daysLeft(expiresAt, now);
  return left > 0 ? `Joined, waiting for a first match (${left} ${left === 1 ? "day" : "days"} left)` : "Joined, waiting for a first match";
}

export const FRIEND_STATUS_TONE: Record<ReferralFriendStatus, ChipTone> = {
  QUALIFIED: "success",
  JOINED: "info",
  EXPIRED: "muted",
};

/** The one-line promise shown above the code, built from the live campaign so it can never drift from what is paid. */
export function promiseLine(campaign: ReferralOverview["campaign"]): string {
  const same = campaign.inviterBonus === campaign.inviteeBonus;
  return same
    ? `You and your friend each get ${formatCoins(campaign.inviterBonus)} coins when they finish a match with another person.`
    : `You get ${formatCoins(campaign.inviterBonus)} coins and your friend gets ${formatCoins(campaign.inviteeBonus)} when they finish a match with another person.`;
}
