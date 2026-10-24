import { createHmac, timingSafeEqual } from "node:crypto";
import { isReferralCode, REFERRAL_WINDOW_MS, type ReferralIntent } from "@shared/referrals.js";

function signature(body: string, key: string): string {
  return createHmac("sha256", key).update(`referral-acceptance:v1:${body}`).digest("base64url");
}

export function mintReferralIntent(code: string, key: string, now = Date.now()): string {
  const intent: ReferralIntent = { code, acceptedAt: now, expiresAt: now + REFERRAL_WINDOW_MS };
  const body = Buffer.from(JSON.stringify(intent)).toString("base64url");
  return `${body}.${signature(body, key)}`;
}

export function readReferralIntent(token: unknown, key: string, now = Date.now()): ReferralIntent | null {
  if (typeof token !== "string" || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signed] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(signed)) return null;
  const expected = signature(body, key);
  if (signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { return null; }
  if (typeof parsed !== "object" || parsed === null) return null;
  if (!("code" in parsed) || !isReferralCode(parsed.code)
    || !("acceptedAt" in parsed) || typeof parsed.acceptedAt !== "number" || !Number.isSafeInteger(parsed.acceptedAt)
    || !("expiresAt" in parsed) || typeof parsed.expiresAt !== "number"
    || parsed.acceptedAt > now || parsed.expiresAt <= now
    || parsed.expiresAt !== parsed.acceptedAt + REFERRAL_WINDOW_MS) return null;
  return { code: parsed.code, acceptedAt: parsed.acceptedAt, expiresAt: parsed.expiresAt };
}
