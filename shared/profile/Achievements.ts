export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "progression" | "skill" | "resilience" | "social";
  targetValue: number;
}

export interface Achievement extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: number;
  currentProgress: number;
  progressPercent: number; // 0..100 %
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: "first_match",
    title: "First Table",
    description: "Complete your very first multiplayer match in BHALYAM.",
    icon: "🎮",
    category: "progression",
    targetValue: 1,
  },
  {
    id: "first_win",
    title: "Taste of Victory",
    description: "Win your first match against human opponents or bots.",
    icon: "🏆",
    category: "skill",
    targetValue: 1,
  },
  {
    id: "three_streak",
    title: "On Fire",
    description: "Achieve a 3-game winning streak.",
    icon: "🔥",
    category: "skill",
    targetValue: 3,
  },
  {
    id: "five_streak",
    title: "Unstoppable",
    description: "Achieve a 5-game winning streak.",
    icon: "⚡",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "ten_wins",
    title: "Lounge Champion",
    description: "Accumulate 10 match victories across any game.",
    icon: "👑",
    category: "skill",
    targetValue: 10,
  },
  {
    id: "fifty_wins",
    title: "Seasoned Victor",
    description: "Accumulate 50 match victories.",
    icon: "🥇",
    category: "skill",
    targetValue: 50,
  },
  {
    id: "hundred_wins",
    title: "Lounge Legend",
    description: "Accumulate 100 match victories.",
    icon: "🌌",
    category: "skill",
    targetValue: 100,
  },
  {
    id: "fifty_matches",
    title: "Dedicated Gamer",
    description: "Play 50 matches in BHALYAM.",
    icon: "⭐",
    category: "progression",
    targetValue: 50,
  },
  {
    id: "hundred_matches",
    title: "BHALYAM Veteran",
    description: "Play 100 matches in BHALYAM.",
    icon: "🎖️",
    category: "progression",
    targetValue: 100,
  },
  {
    id: "recovery_master",
    title: "Unbreakable Connection",
    description: "Successfully recover and reclaim your seat during an active match.",
    icon: "🛡️",
    category: "resilience",
    targetValue: 1,
  },
  {
    id: "five_recoveries",
    title: "Resilience Master",
    description: "Successfully complete 5 seat recovery reconnects.",
    icon: "💎",
    category: "resilience",
    targetValue: 5,
  },
  {
    id: "ludo_master",
    title: "Ludo King",
    description: "Win 5 matches of Ludo.",
    icon: "🎲",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "rummy_champ",
    title: "Rummy Maestro",
    description: "Win 5 matches of Rummy.",
    icon: "🃏",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "uno_expert",
    title: "UNO Wizard",
    description: "Win 5 matches of UNO.",
    icon: "🌈",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "cricket_legend",
    title: "Pitch Master",
    description: "Win 5 matches of Hand Cricket.",
    icon: "🏏",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "chess_grandmaster",
    title: "Checkmate",
    description: "Win 5 matches of Chess.",
    icon: "♟️",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "carrom_striker",
    title: "Queen Striker",
    description: "Win 5 matches of Carrom.",
    icon: "🎯",
    category: "skill",
    targetValue: 5,
  },
  {
    id: "marathon_gamer",
    title: "Marathon Gamer",
    description: "Accumulate 60 minutes of multiplayer gaming.",
    icon: "⏱️",
    category: "progression",
    targetValue: 60,
  },
  {
    id: "variety_player",
    title: "Game Hopper",
    description: "Play at least 5 different games in BHALYAM.",
    icon: "🎪",
    category: "social",
    targetValue: 5,
  },
  {
    id: "tournament_ready",
    title: "High Roller",
    description: "Reach a 60%+ win rate with at least 20 matches played.",
    icon: "🚀",
    category: "skill",
    targetValue: 20,
  },
  {
    id: "first_tournament",
    title: "Tournament Contender",
    description: "Participate in your very first competitive tournament.",
    icon: "🏟️",
    category: "progression",
    targetValue: 1,
  },
  {
    id: "tournament_champion",
    title: "Tournament Champion",
    description: "Claim 1st place and win a tournament championship.",
    icon: "🏆",
    category: "skill",
    targetValue: 1,
  },
  {
    id: "triple_crown",
    title: "Triple Crown",
    description: "Win 3 competitive tournament championships.",
    icon: "👑",
    category: "skill",
    targetValue: 3,
  },
  {
    id: "ten_tournament_wins",
    title: "Lounge Emperor",
    description: "Win 10 competitive tournament championships.",
    icon: "🌌",
    category: "skill",
    targetValue: 10,
  },
  {
    id: "season_champion",
    title: "Season Sovereign",
    description: "Reach Sovereign Tier in seasonal competition.",
    icon: "⚡",
    category: "progression",
    targetValue: 2500,
  },
];
