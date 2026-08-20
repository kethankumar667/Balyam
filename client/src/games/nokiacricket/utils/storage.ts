import type { NokiaCricketSaveData, Achievement } from "../types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "FIRST_BOUNDARY",
    title: "Gully Legend",
    description: "Hit your first 4 or 6 in a match",
    badge: "🏏",
  },
  {
    id: "SIX_MACHINE",
    title: "Roof Breaker",
    description: "Hit 3 sixes in a single over",
    badge: "💥",
  },
  {
    id: "HALF_CENTURY",
    title: "Bhalyam Hero 50",
    description: "Score 50+ runs in a single innings",
    badge: "🏆",
  },
  {
    id: "PERFECT_TIMER",
    title: "Pure Sweet Spot",
    description: "Score with 3 consecutive PERFECT timing shots",
    badge: "⚡",
  },
  {
    id: "CHASE_MASTER",
    title: "Last Over Thriller",
    description: "Successfully chase down a target match",
    badge: "👑",
  },
];

const STORAGE_KEY = "bhalyam_nokia_cricket_data_v1";
let memoryStore: NokiaCricketSaveData | null = null;

export const StorageService = {
  getDefaults(): NokiaCricketSaveData {
    return {
      highScore: 0,
      bestWickets: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      chaseMatchesPlayed: 0,
      chaseMatchesWon: 0,
      totalRuns: 0,
      totalSixes: 0,
      totalFours: 0,
      bestStrikeRate: 0,
      unlockedAchievements: [],
    };
  },

  load(): NokiaCricketSaveData {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...this.getDefaults(), ...JSON.parse(raw) };
      }
      return memoryStore ? { ...memoryStore } : this.getDefaults();
    } catch {
      return memoryStore ? { ...memoryStore } : this.getDefaults();
    }
  },

  save(data: Partial<NokiaCricketSaveData>): NokiaCricketSaveData {
    const current = this.load();
    const next: NokiaCricketSaveData = { ...current, ...data };
    memoryStore = next;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Storage quota or headless fallback
    }
    return next;
  },

  recordMatch(
    runs: number,
    wickets: number,
    balls: number,
    sixes: number,
    fours: number,
    won: boolean,
    isChase: boolean = false
  ): { nextData: NokiaCricketSaveData; newAchievements: Achievement[] } {
    const data = this.load();
    const newAchievements: Achievement[] = [];

    data.matchesPlayed += 1;
    if (won) data.matchesWon += 1;
    if (isChase) {
      data.chaseMatchesPlayed = (data.chaseMatchesPlayed || 0) + 1;
      if (won) data.chaseMatchesWon = (data.chaseMatchesWon || 0) + 1;
    }
    data.totalRuns += runs;
    data.totalSixes += sixes;
    data.totalFours += fours;

    if (runs > data.highScore) {
      data.highScore = runs;
      data.bestWickets = wickets;
    }

    const sr = balls > 0 ? Math.round((runs / balls) * 100) : 0;
    if (sr > data.bestStrikeRate) {
      data.bestStrikeRate = sr;
    }

    // Check achievement conditions
    const unlock = (id: string) => {
      if (!data.unlockedAchievements.includes(id)) {
        data.unlockedAchievements.push(id);
        const ach = ACHIEVEMENTS.find((a) => a.id === id);
        if (ach) newAchievements.push(ach);
      }
    };

    if (sixes > 0 || fours > 0) unlock("FIRST_BOUNDARY");
    if (runs >= 50) unlock("HALF_CENTURY");
    if (won && isChase) unlock("CHASE_MASTER");

    const nextData = this.save(data);
    return { nextData, newAchievements };
  },
};
