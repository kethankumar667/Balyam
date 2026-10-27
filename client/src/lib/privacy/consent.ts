import { DATA_INVENTORY } from "./dataInventory";

/**
 * The consent record — DPDP Sections 5, 6 and 6(4).
 *
 * Two things make this real rather than a cookie banner:
 *
 *   • Declining does something. "Essential only" is enforced on every load by
 *     purging the optional keys, so a player who said no does not quietly
 *     accumulate preferences anyway. A choice that changes nothing is not
 *     consent, it is a dialog.
 *   • Withdrawing is one tap in the same panel that offers export and
 *     erasure, which is what 6(4) means by "as easy as giving".
 *
 * What counts as essential is derived from the inventory's own `purpose`
 * field rather than a second hand-kept list: identity and credential data is
 * what holding a seat requires, and everything else is a convenience the
 * player can decline and still play.
 */

export type ConsentChoice = "granted" | "essential-only";

export interface ConsentRecord {
  choice: ConsentChoice;
  /** When they chose. The Act expects the record to be demonstrable. */
  at: string;
  /** Which version of the notice they saw, so a material change can re-ask. */
  noticeVersion: number;
  memberIds?: string[];
}

/**
 * Bump when the notice changes materially — new data, new purpose, new
 * recipient. Consent given against an older notice stops counting and the
 * modal returns. Cosmetic edits do not earn a bump.
 *
 * 3 — accounts moved to Supabase. A new recipient who receives an email
 *     address and a password, and two new stored keys for the session. Every
 *     one of the three triggers above, so anyone who consented to version 2
 *     is asked again rather than assumed to have agreed to this.
 * 4 — records the account ids that acknowledged the notice on this device,
 *     including across sign-out, so guest consent cannot bypass member onboarding.
 * 5 — declares deliberately accepted friend invitations and account referral qualification.
 * 6 — declares server-side Supabase room recovery for guests and members.
 */
export const NOTICE_VERSION = 6;

export const CONSENT_KEY = "bhalyam.consent";

/**
 * Keys a player cannot decline without giving up playing at all.
 *
 * `consent` is in here for a different reason from the rest: not because
 * playing needs it, but because the record of a refusal has to outlive the
 * refusal. Deleting it would re-ask someone who already said no.
 */
export function essentialKeys(): string[] {
  return DATA_INVENTORY.filter(
    (e) => e.purpose === "identity" || e.purpose === "credential" || e.purpose === "consent",
  ).map((e) => e.key);
}

/**
 * Everything a player can decline and still join a game.
 *
 * The consent record itself is excluded, and has to be: purging it would
 * delete the very "no" it records, so the modal would reappear on the next
 * load and keep asking someone who has already answered — the opposite of
 * respecting the choice.
 */
export function optionalKeys(): string[] {
  const essential = new Set(essentialKeys());
  return DATA_INVENTORY.filter(
    (e) => !essential.has(e.key) && e.key !== CONSENT_KEY,
  ).map((e) => e.key);
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed?.choice !== "granted" && parsed?.choice !== "essential-only") return null;
    if (typeof parsed.noticeVersion !== "number") return null;
    return {
      choice: parsed.choice,
      at: typeof parsed.at === "string" ? parsed.at : new Date().toISOString(),
      noticeVersion: parsed.noticeVersion,
      memberIds: Array.isArray(parsed.memberIds)
        ? parsed.memberIds.filter((memberId): memberId is string => typeof memberId === "string")
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Set when the browser refused to store an answer (private browsing). The choice then holds for this
 * session only, so "still unanswered" must not be reported from storage: nothing would ever clear it,
 * and everything waiting on the answer (the first-run profile and welcome steps) would wait forever.
 */
let storageRefusedAnswer: ConsentRecord | null = null;

/** True when we must ask — never asked, or the notice has changed since. */
export function needsConsent(memberId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const rec = storageRefusedAnswer ?? readConsent();
  return rec === null || rec.noticeVersion < NOTICE_VERSION
    || Boolean(memberId && !rec.memberIds?.includes(memberId));
}

/**
 * Fired on `window` the moment a choice is recorded, so anything that has to wait for the privacy
 * answer hears it without polling. The choice itself is not in the event: whoever needs it reads
 * `readConsent()`.
 */
export const CONSENT_CHANGED_EVENT = "bhalyam:consent-changed";

export function resetConsentSession(): void {
  storageRefusedAnswer = null;
  if (typeof window !== "undefined") window.dispatchEvent?.(new Event(CONSENT_CHANGED_EVENT));
}

export function forgetMemberConsent(memberId: string): void {
  const previous = storageRefusedAnswer ?? readConsent();
  if (!previous) return;
  const record = { ...previous, memberIds: previous.memberIds?.filter((id) => id !== memberId) ?? [] };
  storageRefusedAnswer = record;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    storageRefusedAnswer = null;
  } catch {}
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Subscribe to consent being answered or withdrawn, in this tab or another. Returns the unsubscribe. */
export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function recordConsent(choice: ConsentChoice, now: Date = new Date(), memberId?: string | null): ConsentRecord {
  const previous = storageRefusedAnswer ?? readConsent();
  const memberIds = previous?.noticeVersion === NOTICE_VERSION ? previous.memberIds ?? [] : [];
  const rec: ConsentRecord = {
    choice,
    at: now.toISOString(),
    noticeVersion: NOTICE_VERSION,
    memberIds: memberId && !memberIds.includes(memberId) ? [...memberIds, memberId] : memberIds,
  };
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(rec));
      storageRefusedAnswer = null;
    } catch {
      /* private browsing — the choice holds for this session only */
      storageRefusedAnswer = rec;
    }
    if (choice === "essential-only") purgeOptional();
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  }
  return rec;
}

/**
 * Withdraw, returning to essential-only. Deliberately does NOT clear the
 * record itself: forgetting the decision would re-show the modal and read as
 * the app not having listened.
 */
export function withdrawConsent(now: Date = new Date()): ConsentRecord {
  return recordConsent("essential-only", now);
}

/**
 * Enforce "essential only" by removing the optional keys.
 *
 * Called on every load, not just at the moment of choosing, because that is
 * the difference between a preference the player declined and one that
 * silently comes back the next time some component writes it.
 */
export function purgeOptional(): string[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
  const removed: string[] = [];
  for (const key of optionalKeys()) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removed.push(key);
      }
    } catch {
      /* one key failing must not abandon the rest */
    }
  }
  return removed;
}

/** Run at startup: honour a standing "essential only" before anything writes. */
export function enforceConsentOnLoad(): void {
  if (typeof window === "undefined") return;
  const rec = readConsent();
  if (rec?.choice === "essential-only") purgeOptional();
}
