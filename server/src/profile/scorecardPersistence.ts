import type {
  DeviceImportResult,
  PlayerScorecardArchive,
  RecordScorePayload,
  RecordScoreResult,
} from "@shared/profile/Scorecard.js";
import { progressionRepository } from "../persistence/index.js";
import { applyDeviceImports } from "./deviceImport.js";
import { ScorecardService } from "./ScorecardService.js";
import { preserveLegacyRummyModes } from "@shared/profile/recordCompatibility.js";

export async function readPersistedScorecards(playerId: string): Promise<PlayerScorecardArchive> {
  const { archive } = await progressionRepository().getScorecardSnapshot(playerId);
  if (archive?.games.rummy) archive.games.rummy.modes = preserveLegacyRummyModes(archive.games.rummy.modes);
  return archive ?? { playerId, games: {}, totalPersonalBestsBeaten: 0, updatedAt: 0 };
}

/** Compare-and-swap retries re-evaluate against the winning write, never a stale device snapshot. */
export async function persistScorecard(
  playerId: string, payload: RecordScorePayload, recordedAt = Date.now(),
): Promise<RecordScoreResult> {
  const repo = progressionRepository();
  const eventKey = JSON.stringify([payload.game, payload.modeId, payload.matchId]);
  for (let attempt = 0; attempt < 8; attempt++) {
    const snapshot = await repo.getScorecardSnapshot(playerId);
    const service = new ScorecardService(false);
    if (snapshot.archive) service.restoreArchive(snapshot.archive);
    const result = service.recordScore(playerId, payload, recordedAt);
    const committed = await repo.commitScorecard(
      playerId, snapshot.revision, eventKey, service.getScorecards(playerId), result,
    );
    if (committed.committed) {
      if (!committed.result || !("scorecard" in committed.result)) throw new Error("Scorecard store returned no committed result");
      return committed.result;
    }
  }
  throw new Error("Record changed concurrently too many times; please retry");
}

/**
 * Bring a device's bests into the account's private record (see `applyDeviceImports`).
 *
 * Same compare-and-swap as a score, so an import racing a live result is re-evaluated against whichever won.
 * Nothing is written when no entry improves on the account, and repeating the same import is a no-op.
 */
export async function persistDeviceImports(playerId: string, entries: readonly unknown[], now = Date.now()) {
  const repo = progressionRepository();
  for (let attempt = 0; attempt < 8; attempt++) {
    const snapshot = await repo.getScorecardSnapshot(playerId);
    const base = snapshot.archive ?? { playerId, games: {}, totalPersonalBestsBeaten: 0, updatedAt: 0 };
    const { archive, accepted, skipped } = applyDeviceImports(base, entries, now);
    if (accepted.length === 0) return { accepted, skipped };

    const eventKey = JSON.stringify(["device_import", accepted.map((best) => [best.game, best.modeId, best.score])]);
    const receipt: DeviceImportResult = { kind: "device_import", accepted };
    const committed = await repo.commitScorecard(playerId, snapshot.revision, eventKey, archive, receipt);
    if (committed.committed) return { accepted, skipped };
  }
  throw new Error("Record changed concurrently too many times; please retry");
}
