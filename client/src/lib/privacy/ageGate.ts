/**
 * The first-run age question and what it switches on.
 *
 * ── What this is, and is not ──────────────────────────────────────────
 * It is a self-declared answer kept on this device. It makes the Privacy
 * Policy's promise ("under-18s play only with a parent or guardian's consent
 * and supervision") something the product actually asks about, and it turns on
 * a limited mode for under-18s. It is NOT verifiable parental consent in the
 * sense of the DPDP Rules 2025 (which start to bind in May 2027): nothing here
 * proves who a guardian is. The notice says so plainly, and a verified method
 * has to replace the guardian tick-box before those duties start.
 *
 * ── Limited mode (answer "under 18") ──────────────────────────────────
 *   • coin sending and requesting between players is not offered;
 *   • voice chat is off for everyone while it is switched off (voiceFeature.ts).
 * Gameplay, bots, friends-only rooms and the free daily rewards stay.
 *
 * NOT yet covered, and to be decided with a lawyer: blocking account sign-up
 * for under-18s, and anything enforced on the server.
 *
 * The record is only the answer and when it was given — no date of birth.
 */

export const AGE_GATE_KEY = "bhalyam.age.band";
export const AGE_GATE_CHANGED_EVENT = "bhalyam:age-gate-changed";

export type AgeBand = "adult" | "minor";

export interface AgeAnswer {
  band: AgeBand;
  /** For a minor: a parent or guardian said they are present and agree. Always false for an adult. */
  guardianConfirmed: boolean;
  /** ISO timestamp of when the answer was given. */
  answeredAt: string;
}

function isAnswer(value: unknown): value is AgeAnswer {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.band === "adult" || v.band === "minor") &&
    typeof v.guardianConfirmed === "boolean" &&
    typeof v.answeredAt === "string"
  );
}

export function getAgeAnswer(): AgeAnswer | null {
  try {
    const raw = localStorage.getItem(AGE_GATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAnswer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** True until the player has answered. A minor who has not got a guardian's OK counts as unanswered. */
export function needsAgeAnswer(): boolean {
  const a = getAgeAnswer();
  if (a === null) return true;
  return a.band === "minor" && !a.guardianConfirmed;
}

/** Limited mode applies to anyone who said they are under 18. */
export function isMinor(): boolean {
  return getAgeAnswer()?.band === "minor";
}

export function recordAgeAnswer(band: AgeBand, guardianConfirmed: boolean, now: Date = new Date()): void {
  const answer: AgeAnswer = {
    band,
    guardianConfirmed: band === "minor" ? guardianConfirmed : false,
    answeredAt: now.toISOString(),
  };
  try {
    localStorage.setItem(AGE_GATE_KEY, JSON.stringify(answer));
  } catch {
    // Storage blocked: the answer lasts only until the page is reloaded, which re-asks. That is the safe direction.
  }
  window.dispatchEvent(new Event(AGE_GATE_CHANGED_EVENT));
}

export function clearAgeAnswer(): void {
  try {
    localStorage.removeItem(AGE_GATE_KEY);
  } catch {
    // nothing to clear
  }
  window.dispatchEvent(new Event(AGE_GATE_CHANGED_EVENT));
}

export function subscribeAge(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === AGE_GATE_KEY) listener();
  };
  window.addEventListener(AGE_GATE_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AGE_GATE_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
