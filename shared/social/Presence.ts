export type PresenceStatus =
  | "ONLINE"
  | "OFFLINE"
  | "IN_GAME"
  | "IN_PARTY"
  | "IN_TOURNAMENT";

export interface PlayerPresence {
  playerId: string;
  status: PresenceStatus;
  activityDetail?: string;
  lastActiveAt: number;
}
