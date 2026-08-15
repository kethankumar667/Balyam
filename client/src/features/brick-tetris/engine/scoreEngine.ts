import {
  LINE_CLEAR_POINTS,
  BACK_TO_BACK_MULTIPLIER,
  COMBO_BONUS_PER_LEVEL,
  LINES_PER_LEVEL,
  MAX_LEVEL,
} from "../constants/scoringConstants";

export interface ScoreUpdateResult {
  newScore: number;
  newLevel: number;
  newLines: number;
  pointsEarned: number;
  isBackToBack: boolean;
  newCombo: number;
}

export function calculateScoreUpdate(
  currentScore: number,
  currentLevel: number,
  currentLines: number,
  clearedCount: number,
  currentCombo: number,
  prevBackToBack: boolean,
): ScoreUpdateResult {
  if (clearedCount === 0) {
    return {
      newScore: currentScore,
      newLevel: currentLevel,
      newLines: currentLines,
      pointsEarned: 0,
      isBackToBack: prevBackToBack,
      newCombo: -1,
    };
  }

  const basePoints = (LINE_CLEAR_POINTS[clearedCount] ?? (clearedCount * 250)) * currentLevel;
  const isDifficultClear = clearedCount >= 4;
  const isBackToBack = isDifficultClear && prevBackToBack;
  const b2bMultiplier = isBackToBack ? BACK_TO_BACK_MULTIPLIER : 1;

  const newCombo = currentCombo + 1;
  const comboBonus = newCombo > 0 ? COMBO_BONUS_PER_LEVEL * newCombo * currentLevel : 0;

  const pointsEarned = Math.floor(basePoints * b2bMultiplier + comboBonus);
  const newScore = currentScore + pointsEarned;
  const newLines = currentLines + clearedCount;
  const newLevel = Math.min(MAX_LEVEL, Math.floor(newLines / LINES_PER_LEVEL) + 1);

  return {
    newScore,
    newLevel,
    newLines,
    pointsEarned,
    isBackToBack: isDifficultClear,
    newCombo,
  };
}
