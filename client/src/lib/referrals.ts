import type { ReferralAttributionResult, ReferralProgress, ReferralRefusal } from "@shared/referrals";
import { apiFetch } from "./playerIdentity";
import { getApiBaseUrl } from "./socket";

export const REFERRAL_INTENT_KEY = "bhalyam.referral.intent";
const REQUEST_ERROR = "Invitations could not be updated. Please try again.";

export function pendingReferralIntent(): string | null {
  try { return localStorage.getItem(REFERRAL_INTENT_KEY); }
  catch {
    console.warn("Referral storage is unavailable; no saved invitation can be attached to this signup.");
    return null;
  }
}

export function referralReturnPath(): string {
  const intent = pendingReferralIntent();
  return intent ? `/invite/complete?intent=${encodeURIComponent(intent)}` : "/";
}

export async function referralRequest<T>(path: string, body?: object, publicRequest = false): Promise<T> {
  const init: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const response = publicRequest
    ? await fetch(`${getApiBaseUrl()}/api/referrals${path}`, init)
    : await apiFetch(`/api/referrals${path}`, init);
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new Error(REQUEST_ERROR); }
  if (typeof result !== "object" || result === null || Array.isArray(result)) throw new Error(REQUEST_ERROR);
  if (!response.ok) throw new Error("message" in result && typeof result.message === "string" ? result.message : REQUEST_ERROR);
  return result as T;
}

export const REFERRAL_REFUSAL_COPY: Record<ReferralRefusal, string> = {
  INVALID_INVITE: "This invitation is no longer available.",
  EXPIRED_INVITE: "This invitation has expired. Ask your friend for a new invitation.",
  SELF_REFERRAL: "You cannot use your own invitation.",
  EXISTING_ACCOUNT: "This invitation is for new accounts. You can still play together.",
  ALREADY_ATTRIBUTED: "This account is already connected to another invitation.",
  VERIFY_EMAIL: "Verify your email before connecting this invitation.",
};

export const syncReferrals = () => referralRequest<ReferralProgress>("/sync", {});
export const attributeReferral = (token: string) => referralRequest<ReferralAttributionResult>("/attribute", { token });
