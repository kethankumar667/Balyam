export interface Season {
  id: string;
  name: string;
  seasonNumber: number;
  startsAt: number;
  endsAt: number;
  isActive: boolean;
}

export interface PlayerSeasonStats {
  playerId: string;
  seasonId: string;
  seasonXP: number;
  seasonLevel: number;
  seasonRankTier: string;
  seasonWins: number;
  seasonMatches: number;
  seasonWinRate: number;
  tournamentWins: number;
  rewardsClaimed: string[];
}

export interface SeasonSnapshot {
  seasonId: string;
  seasonNumber: number;
  seasonName: string;
  placement: number;
  seasonRank: string;
  seasonXP: number;
  seasonWins: number;
  rewardsEarned: string[];
  achievementsUnlocked: string[];
  completedAt: number;
}
