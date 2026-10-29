import type {
  ReferralAdminCampaign,
  ReferralAdminEvent,
  ReferralAdminOverview,
  ReferralAdminPendingReward,
  ReferralCampaignPatch,
} from "@shared/referrals";
import { operationalFetch, operationalPost, operationalPut, OperationalAuthError } from "../../../lib/operationalApi";

const BASE = "/api/admin/referrals";

export interface ReferralConsoleData {
  overview: ReferralAdminOverview;
  pending: ReferralAdminPendingReward[];
  events: ReferralAdminEvent[];
}

/** Everything the console shows, read together so the three parts always describe the same moment. */
export async function loadReferralConsole(): Promise<ReferralConsoleData> {
  const [overview, pending, events] = await Promise.all([
    operationalFetch<ReferralAdminOverview>(`${BASE}/overview`),
    operationalFetch<{ rewards: ReferralAdminPendingReward[] }>(`${BASE}/pending`),
    operationalFetch<{ events: ReferralAdminEvent[] }>(`${BASE}/events`),
  ]);
  return { overview, pending: pending.rewards, events: events.events };
}

export async function saveCampaign(changes: ReferralCampaignPatch, note: string): Promise<ReferralAdminCampaign> {
  return (await operationalPut<{ campaign: ReferralAdminCampaign }>(`${BASE}/campaign`, { changes, note })).campaign;
}

export function withdrawBonus(rewardId: string, reason: string): Promise<{ ok: true; logged: boolean }> {
  return operationalPost(`${BASE}/rewards/${encodeURIComponent(rewardId)}/void`, { reason });
}

/** The words to show for a failed call. A refusal from the server already reads as a sentence. */
export function consoleErrorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error && err.message) return err.message;
  return "That did not go through.";
}
