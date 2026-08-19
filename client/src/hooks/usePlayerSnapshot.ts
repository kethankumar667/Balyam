import { useEffect, useState } from "react";
import { apiJson, usePlayerId } from "../lib/playerIdentity";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory";
import type { Achievement } from "@shared/profile/Achievements";

/**
 * The real numbers behind the lounge's "welcome back" surfaces.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 * `WelcomePlayerStrip`, `PlayerJourneyDashboard` and (previously) a dead
 * `TrophyProgressionStrip` each want the same four records — profile, stats,
 * recent matches, achievements — and `ProfilePage.tsx` already fetches all
 * four with one `Promise.all`. Three separate fetch call sites on one page
 * load would be the exact bug `playerIdentity.ts`'s `mintGuest()` comment
 * warns about: not correctness, just waste and drift between them.
 *
 * Fetched once at the top of `BhalyamHome` and passed down as a prop.
 *
 * ── The contract ──────────────────────────────────────────────────────
 * `ready` is false only while the very first fetch is in flight. Any field
 * that comes back `null` (offline, 404, a brand-new player with no rows yet)
 * stays `null` — it is never backfilled with a placeholder, because a
 * placeholder here is exactly the fabricated-activity defect this hook
 * exists to remove. A consumer sees `ready` and three-or-four possibly-null
 * records; rendering the honest empty state for `null` is the consumer's job,
 * not this hook's.
 */
export interface PlayerSnapshot {
  ready: boolean;
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  /** Newest first — same order `MatchHistoryService.getMatches` returns. */
  matches: MatchHistoryItem[];
  achievements: Achievement[];
}

export function usePlayerSnapshot(enabled: boolean): PlayerSnapshot {
  const { playerId, ready: identityReady } = usePlayerId();
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    ready: false,
    profile: null,
    stats: null,
    matches: [],
    achievements: [],
  });

  useEffect(() => {
    if (!enabled || !identityReady || !playerId) return;
    let cancelled = false;

    void (async () => {
      const [profileRes, statsRes, matchesRes, achievementsRes] = await Promise.all([
        apiJson<{ profile: PlayerProfile }>(`/api/profile/${playerId}`),
        apiJson<{ stats: PlayerStats }>(`/api/profile/${playerId}/stats`),
        apiJson<{ matches: MatchHistoryItem[]; total: number }>(`/api/profile/${playerId}/matches?limit=1`),
        apiJson<{ achievements: Achievement[] }>(`/api/profile/${playerId}/achievements`),
      ]);
      if (cancelled) return;
      setSnapshot({
        ready: true,
        profile: profileRes?.profile ?? null,
        stats: statsRes?.stats ?? null,
        matches: matchesRes?.matches ?? [],
        achievements: achievementsRes?.achievements ?? [],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, identityReady, playerId]);

  return snapshot;
}
