import type { BrickRacerSaveData, Achievement } from "../types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "FIRST_DODGE",
    title: "First Overtake",
    desc: "Successfully dodge your first enemy car",
    badge: "🏎️",
    unlocked: false,
  },
  {
    id: "CENTURY_RACER",
    title: "Century Racer",
    desc: "Score 100 points in a single race",
    badge: "💯",
    unlocked: false,
  },
  {
    id: "NITRO_MASTER",
    title: "Nitro Master",
    desc: "Dodge 10 cars while holding Speed Boost",
    badge: "🔥",
    unlocked: false,
  },
  {
    id: "HIGHWAY_LEGEND",
    title: "Highway Legend",
    desc: "Dodge 50 enemy cars in a single run",
    badge: "👑",
    unlocked: false,
  },
  {
    id: "SPEED_DEMON",
    title: "Speed Demon",
    desc: "Survive and reach Level 5 or higher",
    badge: "⚡",
    unlocked: false,
  },
  {
    id: "GRAND_PRIX_CHAMP",
    title: "Grand Prix Champ",
    desc: "Score 500+ points in a single match",
    badge: "🏆",
    unlocked: false,
  },
];

const STORAGE_KEY = "bhalyam_brick_racer_v1";

let memoryStore: BrickRacerSaveData | null = null;

export const StorageService = {
  getDefaults(): BrickRacerSaveData {
    return {
      highScore: 0,
      matchesPlayed: 0,
      totalCarsDodged: 0,
      bestLevel: 1,
      longestDistance: 0,
      achievements: [],
    };
  },

  load(): BrickRacerSaveData {
    if (memoryStore) return memoryStore;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = this.getDefaults();
        memoryStore = defaults;
        return defaults;
      }
      const parsed = JSON.parse(raw);
      const loaded: BrickRacerSaveData = { ...this.getDefaults(), ...parsed };
      memoryStore = loaded;
      return loaded;
    } catch {
      const defaults = this.getDefaults();
      memoryStore = defaults;
      return defaults;
    }
  },

  save(data: Partial<BrickRacerSaveData>): BrickRacerSaveData {
    const current = this.load();
    const next: BrickRacerSaveData = { ...current, ...data };
    memoryStore = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota exceptions
    }
    return next;
  },

  checkAchievements(
    score: number,
    carsDodged: number,
    level: number,
    distance: number
  ): { nextData: BrickRacerSaveData; newAchievements: Achievement[] } {
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

    testUnlock("FIRST_DODGE", carsDodged >= 1);
    testUnlock("CENTURY_RACER", score >= 100);
    testUnlock("NITRO_MASTER", score >= 200 && level >= 3);
    testUnlock("HIGHWAY_LEGEND", carsDodged >= 50);
    testUnlock("SPEED_DEMON", level >= 5);
    testUnlock("GRAND_PRIX_CHAMP", score >= 500);

    const nextData = this.save({
      achievements: Array.from(currentUnlocked),
    });

    return { nextData, newAchievements: newUnlocked };
  },
};
