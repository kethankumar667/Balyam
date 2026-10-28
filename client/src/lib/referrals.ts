import {
  normalizeReferralCode,
  type ReferralAttributionResult,
  type ReferralOverview,
  type ReferralProgress,
  type ReferralRefusal,
} from "@shared/referrals";
import { apiFetch } from "./playerIdentity";
import { getSupabase } from "./supabase/client";
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
  INVALID_CODE: "That code was not found. Check it and try again.",
  TOO_LATE: "Codes can be added in your first 7 days. You can still play together.",
  ALREADY_PLAYED: "Codes are for members who have not yet played with other people.",
  NOT_ATTACHED: "There is no code to remove.",
};

export const syncReferrals = () => referralRequest<ReferralProgress>("/sync", {});
export const attributeReferral = (token: string) => referralRequest<ReferralAttributionResult>("/attribute", { token });
export const fetchReferralOverview = () => referralRequest<ReferralOverview>("/overview");
export const redeemReferralCode = (code: string) => referralRequest<ReferralAttributionResult>("/redeem", { code });
export const detachReferralCode = () => referralRequest<ReferralAttributionResult>("/detach", {});
/** Public yes/no check of a typed code; it never says whose it is. */
export const checkReferralCode = (code: string) => referralRequest<{ valid: boolean }>(`/code/${encodeURIComponent(code)}`, undefined, true);

/** A code carried from a shared `/invite/BHALYAM-XXXXX` link to the sign-up field. */
export const REFERRAL_CODE_KEY = "bhalyam.referral.code";

export function pendingReferralCode(): string | null {
  try { return normalizeReferralCode(localStorage.getItem(REFERRAL_CODE_KEY)); }
  catch { return null; }
}

export function rememberReferralCode(code: string): void {
  try { localStorage.setItem(REFERRAL_CODE_KEY, code); }
  catch { /* Without storage the code can still be typed by hand. */ }
}

export function forgetReferralCode(): void {
  try { localStorage.removeItem(REFERRAL_CODE_KEY); }
  catch { /* Nothing was stored. */ }
}

/** The code the member typed at sign-up, read back from their account when they verify on another device. */
export async function metadataReferralCode(): Promise<string | null> {
  try {
    const session = await getSupabase()?.auth.getSession();
    return normalizeReferralCode(session?.data.session?.user.user_metadata.referral_code);
  } catch { return null; }
}

/** Best effort: a copy left behind is harmless, because redeeming a code twice is refused. */
export async function clearMetadataReferralCode(): Promise<void> {
  try { await getSupabase()?.auth.updateUser({ data: { referral_code: null } }); }
  catch { /* The next sign-in tries again. */ }
}
