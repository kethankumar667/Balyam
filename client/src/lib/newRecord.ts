import type { RecordScoreResult } from "@shared/profile/Scorecard";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Checks the `scorecard:newBest` payload before the popup trusts it. It arrives over the socket, so it is treated as
 * unknown data: anything missing the few fields the popup reads is dropped rather than shown half-filled.
 */
export function parseNewRecord(payload: unknown): RecordScoreResult | null {
  if (!isRecord(payload) || !isRecord(payload.scorecard)) return null;
  const { scorecard } = payload;
  if (typeof payload.game !== "string" || payload.isNewPersonalBest !== true) return null;
  if (typeof scorecard.modeId !== "string" || typeof scorecard.modeDisplayName !== "string") return null;
  if (!isFiniteNumber(scorecard.bestScore) || typeof scorecard.bestScoreMatchId !== "string") return null;
  if (scorecard.scoringDirection !== "HIGHER_IS_BETTER" && scorecard.scoringDirection !== "LOWER_IS_BETTER") return null;
  if (!isFiniteNumber(payload.previousBest) || !isFiniteNumber(payload.deltaFromPrevious)) return null;
  return payload as unknown as RecordScoreResult;
}
