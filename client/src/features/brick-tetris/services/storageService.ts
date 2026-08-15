import type { BrickTetrisSaveData, GameMode, HighScoreEntry } from "../types";

const STORAGE_KEY = "bhalyam_brick_tetris_save_v1";

const DEFAULT_SAVE_DATA: BrickTetrisSaveData = {
  highScores: [],
  totalMatches: 0,
  totalLinesCleared: 0,
  bestClassicScore: 0,
  bestPentixScore: 0,
  achievements: [],
};

export function loadTetrisData(): BrickTetrisSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAVE_DATA;
    const parsed = JSON.parse(raw);
    return {
      highScores: Array.isArray(parsed.highScores) ? parsed.highScores : [],
      totalMatches: typeof parsed.totalMatches === "number" ? parsed.totalMatches : 0,
      totalLinesCleared: typeof parsed.totalLinesCleared === "number" ? parsed.totalLinesCleared : 0,
      bestClassicScore: typeof parsed.bestClassicScore === "number" ? parsed.bestClassicScore : 0,
      bestPentixScore: typeof parsed.bestPentixScore === "number" ? parsed.bestPentixScore : 0,
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return DEFAULT_SAVE_DATA;
  }
}

export function saveTetrisMatchResult(
  score: number,
  lines: number,
  level: number,
  mode: GameMode,
): BrickTetrisSaveData {
  const current = loadTetrisData();

  const newEntry: HighScoreEntry = {
    score,
    lines,
    level,
    mode,
    date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };

  const updatedHighScores = [...current.highScores, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const bestClassic = mode === "CLASSIC" ? Math.max(current.bestClassicScore, score) : current.bestClassicScore;
  const bestPentix = mode === "PENTIX" ? Math.max(current.bestPentixScore, score) : current.bestPentixScore;

  const newAchievements = new Set(current.achievements);
  if (lines >= 1) newAchievements.add("First Line Clear");
  if (lines >= 20) newAchievements.add("Stack Master (20 Lines)");
  if (score >= 5000) newAchievements.add("High Scorer (5000 Pts)");
  if (score >= 20000) newAchievements.add("Tetris Grandmaster");
  if (mode === "PENTIX" && lines >= 10) newAchievements.add("Pentix Survivor");

  const updated: BrickTetrisSaveData = {
    highScores: updatedHighScores,
    totalMatches: current.totalMatches + 1,
    totalLinesCleared: current.totalLinesCleared + lines,
    bestClassicScore: bestClassic,
    bestPentixScore: bestPentix,
    achievements: Array.from(newAchievements),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }

  return updated;
}
