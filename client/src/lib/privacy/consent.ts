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
 */
export const NOTICE_VERSION = 3;

const CONSENT_KEY = "bhalyam.consent";

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
    };
  } catch {
    return null;
  }
}

/** True when we must ask — never asked, or the notice has changed since. */
export function needsConsent(): boolean {
  if (typeof window === "undefined") return false;
  const rec = readConsent();
  return rec === null || rec.noticeVersion < NOTICE_VERSION;
}

export function recordConsent(choice: ConsentChoice, now: Date = new Date()): ConsentRecord {
  const rec: ConsentRecord = {
    choice,
    at: now.toISOString(),
    noticeVersion: NOTICE_VERSION,
  };
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(rec));
    } catch {
      /* private browsing — the choice holds for this session only */
    }
    if (choice === "essential-only") purgeOptional();
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
