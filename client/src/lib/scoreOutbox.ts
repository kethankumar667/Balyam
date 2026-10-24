import type { RecordScorePayload } from "@shared/profile/Scorecard";

/**
 * Scores waiting to reach the account.
 *
 * A solo game files its result with one request when the match ends. If that request failed (no signal, a
 * server waking up, a brief outage) the score used to be dropped: the game had already shown "new record" from
 * its own save, so nobody noticed, and the account never learned of it. A failed result now waits here and is
 * sent again until the server confirms it. The `matchId` rides along unchanged, and the server de-duplicates on
 * it, so a result sent twice counts once.
 *
 * One key holds every player's entries (each tagged with its owner) so the privacy inventory declares a single
 * name. Sign-out clears local storage, so the sign-out guard sends what is here BEFORE that happens.
 */
export const OUTBOX_KEY = "bhalyam.scorecards.outbox";

/** More than a player could finish offline, so reaching it means something else is wrong. */
const MAX_ENTRIES = 200;

export interface OutboxEntry {
  playerId: string;
  payload: RecordScorePayload;
  queuedAt: number;
}

const sameResult = (a: RecordScorePayload, b: RecordScorePayload): boolean =>
  a.game === b.game && a.modeId === b.modeId && a.matchId === b.matchId;

function isEntry(value: unknown): value is OutboxEntry {
  if (value === null || typeof value !== "object") return false;
  const entry = value as Partial<OutboxEntry>;
  const payload = entry.payload as Partial<RecordScorePayload> | undefined;
  return (
    typeof entry.playerId === "string" &&
    typeof entry.queuedAt === "number" &&
    payload !== null && typeof payload === "object" &&
    typeof payload.game === "string" && typeof payload.modeId === "string" &&
    typeof payload.matchId === "string" && typeof payload.score === "number"
  );
}

export function readOutbox(): OutboxEntry[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { entries?: unknown };
    return Array.isArray(parsed?.entries) ? parsed.entries.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]): void {
  try {
    if (entries.length === 0) window.localStorage.removeItem(OUTBOX_KEY);
    else window.localStorage.setItem(OUTBOX_KEY, JSON.stringify({ version: 1, entries }));
  } catch {
    /* storage full or blocked: the score is lost only if the page also closes before the next attempt */
  }
}

export function pendingScores(playerId: string): OutboxEntry[] {
  return readOutbox().filter((entry) => entry.playerId === playerId);
}

/** Queue a result; returns how many are now waiting for this player. A result already queued is not added twice. */
export function enqueueScore(playerId: string, payload: RecordScorePayload, now = Date.now()): number {
  const entries = readOutbox();
  if (!entries.some((entry) => entry.playerId === playerId && sameResult(entry.payload, payload))) {
    entries.push({ playerId, payload, queuedAt: now });
  }
  const kept = entries.slice(-MAX_ENTRIES);
  writeOutbox(kept);
  return kept.filter((entry) => entry.playerId === playerId).length;
}

export function removeScore(playerId: string, payload: RecordScorePayload): void {
  writeOutbox(readOutbox().filter((entry) => !(entry.playerId === playerId && sameResult(entry.payload, payload))));
}
