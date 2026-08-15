import type { SavedBreakoutData } from "../types";
import { STORAGE_KEY_BREAKOUT } from "../constants/gameConstants";

const DEFAULT_STORAGE_DATA: SavedBreakoutData = {
  highScore: 0,
  maxLevel: 1,
  soundEnabled: true,
};

export function loadBreakoutData(): SavedBreakoutData {
  if (typeof window === "undefined") return DEFAULT_STORAGE_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BREAKOUT);
    if (!raw) return DEFAULT_STORAGE_DATA;
    const parsed = JSON.parse(raw);
    return {
      highScore: typeof parsed.highScore === "number" && !isNaN(parsed.highScore) ? Math.max(0, parsed.highScore) : 0,
      maxLevel: typeof parsed.maxLevel === "number" && !isNaN(parsed.maxLevel) ? Math.max(1, parsed.maxLevel) : 1,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
    };
  } catch {
    return DEFAULT_STORAGE_DATA;
  }
}

export function saveBreakoutData(data: Partial<SavedBreakoutData>) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadBreakoutData();
    const merged: SavedBreakoutData = {
      highScore: Math.max(existing.highScore, data.highScore ?? 0),
      maxLevel: Math.max(existing.maxLevel, data.maxLevel ?? 1),
      soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : existing.soundEnabled,
    };
    localStorage.setItem(STORAGE_KEY_BREAKOUT, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }
}
