import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug } from "@shared/profile/Scorecard";

export function scorecardChallengePath(game: AllGameSlug, mode: string, score: number): string {
  return `/challenge?${new URLSearchParams({ game: getGameModeConfig(game).game, mode, score: String(score) })}`;
}

/** URL targets are display-only claims, never score submissions or game options. */
export function parseScorecardChallenge(search: string) {
  const params = new URLSearchParams(search);
  if (["game", "mode", "score"].some(key => params.getAll(key).length !== 1)) return null;
  const game = params.get("game")!;
  const modeId = params.get("mode")!;
  const rawScore = params.get("score")!;
  const config = Object.values(GAME_MODE_REGISTRY).find(item => item.game === game);
  if (!config || !/^[a-zA-Z0-9_-]{1,128}$/.test(modeId) || !/^\d{1,16}(?:\.\d{1,6})?$/.test(rawScore)) return null;
  const score = Number(rawScore);
  if (!Number.isFinite(score) || score > Number.MAX_SAFE_INTEGER) return null;
  return { config, modeId, mode: config.modes.find(item => item.modeId === modeId), score };
}
