import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes.js";
import {
  MAX_DEVICE_IMPORT_ENTRIES,
  type AllGameSlug,
  type DeviceBestEntry,
  type PlayerScorecardArchive,
  type ScoringDirection,
} from "@shared/profile/Scorecard.js";
import { validateRecordScorePayload } from "./scoreValidation.js";

export type DeviceImportSkipReason = "invalid" | "unknown_mode" | "server_scored" | "not_better";

export interface SkippedDeviceBest {
  game: string;
  modeId: string;
  reason: DeviceImportSkipReason;
}

export type DeviceImportBody = { ok: true; entries: unknown[] } | { ok: false; error: string };

export function parseDeviceImportBody(body: unknown): DeviceImportBody {
  const entries = body !== null && typeof body === "object" ? (body as { entries?: unknown }).entries : undefined;
  if (!Array.isArray(entries) || entries.length === 0) return { ok: false, error: "Send a list of bests to import" };
  if (entries.length > MAX_DEVICE_IMPORT_ENTRIES) return { ok: false, error: "Too many bests in one request" };
  return { ok: true, entries };
}

const isBetter = (candidate: number, current: number, direction: ScoringDirection): boolean =>
  direction === "LOWER_IS_BETTER" ? candidate < current : candidate > current;

/**
 * Add the bests a device holds to the account's PRIVATE record.
 *
 * They go into `deviceImports`, never into `games`: a browser's saved data can be edited, so nothing here may
 * feed a ranking, a leaderboard or a play count. An entry is taken only when it improves on what the account
 * already holds (read in each mode's own direction), so importing can add a record but never lower or replace
 * one. Each entry gets the same checks as a score posted live, and a mode the registry does not list is refused
 * outright, which a live post is not.
 */
export function applyDeviceImports(archive: PlayerScorecardArchive, entries: readonly unknown[], now: number) {
  const next = structuredClone(archive);
  const accepted: DeviceBestEntry[] = [];
  const skipped: SkippedDeviceBest[] = [];

  for (const raw of entries) {
    const item = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const game = typeof item.game === "string" ? item.game : "";
    const modeId = typeof item.modeId === "string" ? item.modeId : "";
    const skip = (reason: DeviceImportSkipReason) => skipped.push({ game, modeId, reason });

    const checked = validateRecordScorePayload({ game, modeId, score: item.score, context: "SOLO", matchId: "device_import" });
    if (!checked.ok) {
      skip(checked.error.includes("recorded by the server") ? "server_scored" : "invalid");
      continue;
    }

    const config = Object.hasOwn(GAME_MODE_REGISTRY, game) ? GAME_MODE_REGISTRY[game] : undefined;
    const mode = config?.modes.find((candidate) => candidate.modeId === modeId);
    if (!mode) {
      skip("unknown_mode");
      continue;
    }

    const score = item.score as number;
    const recorded = next.games[game as AllGameSlug]?.modes[modeId];
    const held = next.deviceImports?.[game as AllGameSlug]?.[modeId];
    const beatsRecord = !recorded || recorded.timesPlayed === 0 || isBetter(score, recorded.bestScore, mode.scoringDirection);
    const beatsImport = !held || isBetter(score, held.score, mode.scoringDirection);
    if (!beatsRecord || !beatsImport) {
      skip("not_better");
      continue;
    }

    next.deviceImports = {
      ...next.deviceImports,
      [game]: { ...next.deviceImports?.[game as AllGameSlug], [modeId]: { score, importedAt: now } },
    };
    accepted.push({ game: game as AllGameSlug, modeId, score });
  }

  return { archive: next, accepted, skipped };
}
