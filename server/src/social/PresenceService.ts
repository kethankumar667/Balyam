import type { PlayerPresence, PresenceStatus } from "@shared/social/Presence.js";

export class PresenceService {
  private static instance: PresenceService;
  private presenceMap = new Map<string, PlayerPresence>();

  private constructor() {}

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  public setPresence(
    playerId: string,
    status: PresenceStatus,
    activityDetail?: string
  ): PlayerPresence {
    const presence: PlayerPresence = {
      playerId,
      status,
      activityDetail,
      lastActiveAt: Date.now(),
    };
    this.presenceMap.set(playerId, presence);
    return presence;
  }

  public getPresence(playerId: string): PlayerPresence {
    const existing = this.presenceMap.get(playerId);
    if (!existing) {
      return {
        playerId,
        status: "OFFLINE",
        lastActiveAt: 0,
      };
    }

    // Auto-timeout after 3 minutes without update
    if (Date.now() - existing.lastActiveAt > 180_000 && existing.status !== "OFFLINE") {
      existing.status = "OFFLINE";
    }

    return existing;
  }

  public getPresences(playerIds: string[]): Record<string, PlayerPresence> {
    const result: Record<string, PlayerPresence> = {};
    for (const id of playerIds) {
      result[id] = this.getPresence(id);
    }
    return result;
  }

  public clear(): void {
    this.presenceMap.clear();
  }
}

export const presenceService = PresenceService.getInstance();
