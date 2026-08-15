import type { NokiaSnakeSaveData, Achievement } from "../types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "FIRST_BITE",
    title: "First Nibble",
    desc: "Eat your very first food pellet",
    badge: "🍏",
    unlocked: false,
  },
  {
    id: "CENTURION",
    title: "Centurion",
    desc: "Score 100 points in a single match",
    badge: "💯",
    unlocked: false,
  },
  {
    id: "SNAKE_MASTER",
    title: "Snake Master",
    desc: "Reach a score of 300 points",
    badge: "👑",
    unlocked: false,
  },
  {
    id: "ANACONDA",
    title: "Anaconda",
    desc: "Grow snake length to 25 segments",
    badge: "🐍",
    unlocked: false,
  },
  {
    id: "SPEED_DEMON",
    title: "Speed Demon",
    desc: "Reach and survive Level 5 or higher",
    badge: "⚡",
    unlocked: false,
  },
  {
    id: "INSECT_HUNTER",
    title: "Insect Hunter",
    desc: "Catch 3 bonus insects in a single match",
    badge: "🐞",
    unlocked: false,
  },
];

const STORAGE_KEY = "bhalyam_retro_snake_v1";

let memoryStore: NokiaSnakeSaveData | null = null;

export const StorageService = {
  getDefaults(): NokiaSnakeSaveData {
    return {
      highScore: 0,
      matchesPlayed: 0,
      totalFoodCollected: 0,
      bestLevel: 1,
      longestSnake: 4,
      achievements: [],
    };
  },

  load(): NokiaSnakeSaveData {
    if (memoryStore) return memoryStore;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = this.getDefaults();
        memoryStore = defaults;
        return defaults;
      }
      const parsed = JSON.parse(raw);
      const loaded: NokiaSnakeSaveData = { ...this.getDefaults(), ...parsed };
      memoryStore = loaded;
      return loaded;
    } catch {
      const defaults = this.getDefaults();
      memoryStore = defaults;
      return defaults;
    }
  },

  save(data: Partial<NokiaSnakeSaveData>): NokiaSnakeSaveData {
    const current = this.load();
    const next: NokiaSnakeSaveData = { ...current, ...data };
    memoryStore = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota exceptions in private mode
    }
    return next;
  },

  checkAchievements(
    score: number,
    length: number,
    level: number,
    bonusCount: number
  ): { nextData: NokiaSnakeSaveData; newAchievements: Achievement[] } {
    const data = this.load();
    const currentUnlocked = new Set(data.achievements);
    const newUnlocked: Achievement[] = [];

    const testUnlock = (id: string, condition: boolean) => {
      if (condition && !currentUnlocked.has(id)) {
        currentUnlocked.add(id);
        const ach = ACHIEVEMENTS.find((a) => a.id === id);
        if (ach) newUnlocked.push({ ...ach, unlocked: true, unlockedAt: Date.now() });
      }
    };

    testUnlock("FIRST_BITE", score >= 10);
    testUnlock("CENTURION", score >= 100);
    testUnlock("SNAKE_MASTER", score >= 300);
    testUnlock("ANACONDA", length >= 25);
    testUnlock("SPEED_DEMON", level >= 5);
    testUnlock("INSECT_HUNTER", bonusCount >= 3);

    const nextData = this.save({
      achievements: Array.from(currentUnlocked),
    });

    return { nextData, newAchievements: newUnlocked };
  },
};
