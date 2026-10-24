import type { ModeScorecard } from "./Scorecard.js";

/** Penalty-based Rummy bests are not comparable to positive winning-round points. */
export function preserveLegacyRummyModes(modes: Record<string, ModeScorecard>): Record<string, ModeScorecard> {
  const result = { ...modes };
  for (const id of ["single", "pool101", "pool201"]) {
    const saved = result[id];
    if (saved?.scoringDirection !== "LOWER_IS_BETTER") continue;
    const legacyId = `legacy_penalty_${id}`;
    result[legacyId] = { ...saved, modeId: legacyId, modeDisplayName: `Previous penalty record: ${saved.modeDisplayName}` };
    delete result[id];
  }
  return result;
}
