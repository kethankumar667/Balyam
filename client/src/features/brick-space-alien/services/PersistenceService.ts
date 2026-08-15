import type { SpaceAlienSaveData } from "../types";
import { STORAGE_KEY_SPACE_ALIEN } from "../constants";

const DEFAULT_SAVE_DATA: SpaceAlienSaveData = {
  highScore: 0,
  totalAlienKills: 0,
  highestWave: 1,
  gamesPlayed: 0,
  soundEnabled: true,
};

export class SpaceAlienPersistenceService {
  public static load(): SpaceAlienSaveData {
    if (typeof window === "undefined") return DEFAULT_SAVE_DATA;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SPACE_ALIEN);
      if (!raw) return DEFAULT_SAVE_DATA;
      const parsed = JSON.parse(raw);
      return {
        highScore: Number(parsed.highScore) || 0,
        totalAlienKills: Number(parsed.totalAlienKills) || 0,
        highestWave: Math.max(1, Number(parsed.highestWave) || 1),
        gamesPlayed: Number(parsed.gamesPlayed) || 0,
        soundEnabled: parsed.soundEnabled !== false,
      };
    } catch {
      return DEFAULT_SAVE_DATA;
    }
  }

  public static save(data: Partial<SpaceAlienSaveData>): SpaceAlienSaveData {
    if (typeof window === "undefined") return DEFAULT_SAVE_DATA;
    try {
      const current = SpaceAlienPersistenceService.load();
      const merged: SpaceAlienSaveData = {
        ...current,
        ...data,
      };
      localStorage.setItem(STORAGE_KEY_SPACE_ALIEN, JSON.stringify(merged));
      return merged;
    } catch {
      return DEFAULT_SAVE_DATA;
    }
  }

  public static recordGame(
    score: number,
    wave: number,
    kills: number
  ): SpaceAlienSaveData {
    const current = SpaceAlienPersistenceService.load();
    const nextData: SpaceAlienSaveData = {
      ...current,
      highScore: Math.max(current.highScore, score),
      highestWave: Math.max(current.highestWave, wave),
      totalAlienKills: current.totalAlienKills + kills,
      gamesPlayed: current.gamesPlayed + 1,
    };
    SpaceAlienPersistenceService.save(nextData);
    return nextData;
  }
}
