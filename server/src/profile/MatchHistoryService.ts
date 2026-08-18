import type { GameKind } from "@shared/types.js";
import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory.js";
import { serverEventStore } from "../events/ServerEventStore.js";

export class MatchHistoryService {
  private playerMatches: Map<string, MatchHistoryItem[]> = new Map();

  public recordMatch(playerId: string, match: MatchHistoryItem): void {
    const list = this.playerMatches.get(playerId) ?? [];
    // A match id is now derived from (roomCode, startedAt, player), so a
    // replayed completion — a host failover, a retried ack — produces the SAME
    // id and is recognised rather than appended a second time. It used to
    // embed `Date.now()`, which made every replay a new match and every
    // duplicate an extra line in somebody's history.
    if (list.some((m) => m.matchId === match.matchId)) return;
    list.unshift(match);
    this.playerMatches.set(playerId, list);
  }


  public getMatches(
    playerId: string,
    options?: { limit?: number; offset?: number; game?: GameKind }
  ): { matches: MatchHistoryItem[]; total: number } {
    const all = this.playerMatches.get(playerId) || [];
    const filtered = options?.game ? all.filter((m) => m.game === options.game) : all;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    const matches = filtered.slice(offset, offset + limit);
    return { matches, total: filtered.length };
  }

  public getMatchDetail(playerId: string, matchId: string): MatchDetailRecord | null {
    const all = this.playerMatches.get(playerId) || [];
    const item = all.find((m) => m.matchId === matchId);
    if (!item) return null;

    // Extract summary metrics from server event store if available
    const timeline = serverEventStore.export(item.roomCode);
    const movesCount = timeline ? timeline.events.filter((e) => e.type === "MOVE_MADE").length : 0;
    const recoveryCount = timeline
      ? timeline.events.filter((e) => e.type === "RECOVERY_SUCCEEDED").length
      : 0;

    const winner = item.participants.find((p) => p.isWinner);

    return {
      ...item,
      movesCount,
      recoveryCount,
      winnerName: winner?.name,
      timelineEventsCount: timeline?.events.length ?? 0,
      timelineExportUrl: timeline ? `/api/operational/timeline/${item.roomCode}` : undefined,
    };
  }

  /** Refill from the durable store at boot. Newest last; `getMatches` sorts. */
  public hydrate(entries: Array<{ playerId: string; match: MatchHistoryItem }>): void {
    for (const { playerId, match } of entries) {
      const list = this.playerMatches.get(playerId) ?? [];
      if (!list.some((m) => m.matchId === match.matchId)) list.push(match);
      this.playerMatches.set(playerId, list);
    }
  }

  public reset(): void {
    this.playerMatches.clear();
  }
}

export const matchHistoryService = new MatchHistoryService();
