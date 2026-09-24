export interface Friend {
  playerId: string;
  friendPlayerId: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
}

export interface SharedHistory {
  playerId: string;
  friendPlayerId: string;
  matchesPlayedTogether: number;
  winsTogether: number;
  tournamentsTogether: number;
  lastPlayedAt: number;
}
