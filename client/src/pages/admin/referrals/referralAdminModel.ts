import {
  REFERRAL_ADMIN_LIMITS,
  REFERRAL_CAMPAIGN_FIELDS,
  type ReferralAdminCampaign,
  type ReferralAdminEvent,
  type ReferralAdminFunnel,
  type ReferralCampaignField,
  type ReferralCampaignPatch,
} from "@shared/referrals";

/** The campaign form's values, as the text in its fields (so a half-typed number is representable). */
export type CampaignForm = Record<ReferralCampaignField, string>;

export function formFromCampaign(campaign: ReferralAdminCampaign): CampaignForm {
  return Object.fromEntries(REFERRAL_CAMPAIGN_FIELDS.map(field => [field, String(campaign[field])])) as CampaignForm;
}

export type FormCheck =
  | { ok: true; changes: ReferralCampaignPatch }
  | { ok: false; message: string | null };

/**
 * What the form would change, or why it cannot be sent yet. `message: null` means there is simply nothing to send
 * (no change yet), which is not an error. A value outside its limits names the setting and the range, the same
 * words the server uses, so the form says what is allowed before anything is sent.
 */
export function checkCampaignForm(form: CampaignForm, current: ReferralAdminCampaign): FormCheck {
  const changes: ReferralCampaignPatch = {};
  for (const field of REFERRAL_CAMPAIGN_FIELDS) {
    const text = form[field].trim();
    const { min, max, label } = REFERRAL_ADMIN_LIMITS[field];
    const value = Number(text);
    if (text === "" || !Number.isInteger(value) || value < min || value > max) {
      return { ok: false, message: `${label} must be a whole number from ${min} to ${max}.` };
    }
    if (value !== current[field]) changes[field] = value;
  }
  return Object.keys(changes).length === 0 ? { ok: false, message: null } : { ok: true, changes };
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** Share of the stage before it that reached this one, as a whole percent, or null for the first stage. */
  percentOfPrevious: number | null;
}

export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** invited -> joined -> played a match -> bonus paid. Each stage is a subset of the one before, so the bars can only narrow. */
export function funnelStages(funnel: ReferralAdminFunnel): FunnelStage[] {
  const stages: Array<[string, string, number]> = [
    ["invites", "Members with a code", funnel.invitesCreated],
    ["joined", "Friends joined", funnel.joined],
    ["played", "Played with another person", funnel.qualified],
    ["paid", "Bonus issued", funnel.bonusIssued],
  ];
  return stages.map(([key, label, count], index) => ({
    key, label, count,
    percentOfPrevious: index === 0 ? null : percent(count, stages[index - 1]![2]),
  }));
}

const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  REFERRAL_CAMPAIGN_FIELDS.map(field => [field, REFERRAL_ADMIN_LIMITS[field].label]),
);

/** One line for the record: what changed and why, or which bonus was withdrawn. */
export function describeAdminEvent(event: ReferralAdminEvent): string {
  if (event.action === "REWARD_VOIDED") {
    const amount = typeof event.detail.amount === "number" ? `${event.detail.amount.toLocaleString("en-IN")} coins` : "a bonus";
    return `Withdrew ${amount}`;
  }
  const before = (event.detail.before ?? {}) as Record<string, unknown>;
  const after = (event.detail.after ?? {}) as Record<string, unknown>;
  const changed = REFERRAL_CAMPAIGN_FIELDS.filter(field => before[field] !== after[field]);
  if (changed.length === 0) return "Saved the campaign settings";
  return changed.map(field => `${FIELD_LABEL[field]}: ${String(before[field])} → ${String(after[field])}`).join("; ");
}

export function whoDidIt(actor: string): string {
  return actor === "ops-key" ? "Operations key" : actor.replace(/^admin:/, "Admin ");
}
