export interface PartyMember {
  playerId: string;
  displayName: string;
  avatar?: string;
  isLeader: boolean;
  isReady: boolean;
  joinedAt: number;
}
