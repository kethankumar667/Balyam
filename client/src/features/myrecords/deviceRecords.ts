import type { DeviceBestEntry, PlayerScorecardArchive } from "@shared/profile/Scorecard";
import { apiFetch } from "../../lib/playerIdentity";
import { buildRecords, isBetterScore } from "./records";

/**
 * The bests this device holds that the account does not: a score only on this device, or one that beats what
 * the account recorded. Read from the same place My Records reads them, so the list and the page agree.
 */
export function listDeviceBests(archive: PlayerScorecardArchive | null): DeviceBestEntry[] {
  return buildRecords(archive, true).flatMap((game) =>
    game.modes.flatMap((mode) => {
      const { deviceBest } = mode;
      if (deviceBest === null) return [];
      const worthSending = mode.deviceOnly || (mode.best !== null && isBetterScore(deviceBest, mode.best, mode.scoringDirection));
      return worthSending ? [{ game: game.id, modeId: mode.modeId, score: deviceBest }] : [];
    }),
  );
}

/**
 * Add this device's bests to the signed-in player's own account. The server shows them in My Records and
 * never ranks them, because a browser's saved data can be edited. Throws a message fit to show a player.
 */
export async function importDeviceBests(
  playerId: string,
  entries: readonly DeviceBestEntry[],
): Promise<{ accepted: number; skipped: number }> {
  if (entries.length === 0) return { accepted: 0, skipped: 0 };

  let res: Response;
  try {
    res = await apiFetch(`/api/profile/${playerId}/scorecards/import-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  } catch {
    throw new Error("We could not reach the server. Check your connection and try again.");
  }

  const body = (await res.json().catch(() => null)) as { accepted?: unknown[]; skipped?: unknown[]; error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? "Your device records could not be added to your account. Please try again.");
  return { accepted: body?.accepted?.length ?? 0, skipped: body?.skipped?.length ?? 0 };
}
