export interface PlayerProfile {
  playerId: string;
  displayName: string;
  avatar?: string;
  joinedAt: number;
  lastSeenAt: number;
  level: number;
  experiencePoints: number;
}

/**
 * Calculates level based on total XP (every 100 XP is 1 level).
 */
export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}
