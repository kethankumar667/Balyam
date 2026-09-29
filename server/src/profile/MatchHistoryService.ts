import type { GameKind } from "@shared/types.js";
import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import { isTooShort } from "../rewards/SessionRules.js";

/** What the participant list carries at runtime beyond the wire type (present for matches recorded this process). */
interface RuntimeParticipant {
  playerId: string;
  isBot?: boolean;
  isLocal?: boolean;
  isMember?: boolean;
}

/** A signed-in opponent: not a bot, not a seat on the same device, not a throwaway guest. */
function isMemberOpponent(p: RuntimeParticipant, selfId: string): boolean {
  if (p.playerId === selfId || p.isBot || p.isLocal) return false;
  // `isMember` is only known for matches recorded this process; a match restored
  // from the database has no such flag, so the guest id prefix decides.
  return p.isMember === true || (p.isMember === undefined && !p.playerId.startsWith("guest_"));
}

export class MatchHistoryService {
  private playerMatches: Map<string, MatchHistoryItem[]> = new Map();

  /**
   * For trust tiers: how many finished matches had another signed-in person in
   * them, and how many distinct such opponents. A match too short to have been
   * played is not evidence of anything and is left out, so farming instant
   * matches cannot build a trustworthy-looking history.
   */
  public getOpponentStats(playerId: string): { realPeopleMatches: number; distinctOpponents: number } {
    let realPeopleMatches = 0;
    const distinct = new Set<string>();
    for (const match of this.playerMatches.get(playerId) ?? []) {
      if (isTooShort(match.game, match.durationMs)) continue;
      const opponents = (match.participants as RuntimeParticipant[]).filter((p) => isMemberOpponent(p, playerId));
      if (opponents.length === 0) continue;
      realPeopleMatches += 1;
      for (const o of opponents) distinct.add(o.playerId);
    }
    return { realPeopleMatches, distinctOpponents: distinct.size };
  }

  /** Returns false when this match was already recorded for the player (a replay). */
  public recordMatch(playerId: string, match: MatchHistoryItem): boolean {
    const list = this.playerMatches.get(playerId) ?? [];
    // A match id is now derived from (roomCode, startedAt, player), so a
    // replayed completion — a host failover, a retried ack — produces the SAME
    // id and is recognised rather than appended a second time. It used to
    // embed `Date.now()`, which made every replay a new match and every
    // duplicate an extra line in somebody's history.
    if (list.some((m) => m.matchId === match.matchId)) return false;
    list.unshift(match);
    this.playerMatches.set(playerId, list);
    return true;
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
