import { create } from "zustand";
import { apiJson, apiFetch, getPlayerCredential } from "../lib/playerIdentity";
import type {
  PlayerScorecardArchive,
  RecordScorePayload,
  RecordScoreResult,
  GhostPaceStatus,
  AllGameSlug,
} from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";

interface ScorecardState {
  archive: PlayerScorecardArchive | null;
  localArchive: PlayerScorecardArchive | null;
  loading: boolean;
  error: string | null;
  activeGhostPace: GhostPaceStatus | null;
  lastNewPB: RecordScoreResult | null;

  fetchScorecards: (playerId: string) => Promise<void>;
  recordScore: (playerId: string, payload: RecordScorePayload) => Promise<RecordScoreResult | null>;
  updateLivePace: (game: AllGameSlug, modeId: string, currentScore: number) => void;
  dismissPBModal: () => void;
  clearScorecards: (playerId?: string) => void;
}

const STORAGE_KEY = "bhalyam.scorecards.cache";

interface CachedScorecards {
  version: 2;
  archive: PlayerScorecardArchive | null;
  localArchive: PlayerScorecardArchive | null;
}

function loadCachedArchive(playerId: string): CachedScorecards {
  const empty: CachedScorecards = { version: 2, archive: null, localArchive: null };
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${playerId}`);
    if (raw) {
      const cached = JSON.parse(raw) as PlayerScorecardArchive | CachedScorecards;
      if (!cached || typeof cached !== "object") return empty;
      if ("version" in cached && cached.version === 2) {
        return {
          version: 2,
          archive: cached.archive?.playerId === playerId ? cached.archive : null,
          localArchive: cached.localArchive?.playerId === playerId ? cached.localArchive : null,
        };
      }
      if ("playerId" in cached && cached.playerId === playerId) {
        return { version: 2, archive: cached, localArchive: cached };
      }
    }
  } catch {
    // Ignore storage issues
  }
  return empty;
}

function saveCachedArchive(playerId: string, archive: PlayerScorecardArchive, localArchive: PlayerScorecardArchive | null): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}.${playerId}`, JSON.stringify({ version: 2, archive, localArchive }));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Monotonic request generation for fetchScorecards. Without this, a slow
 * request for User A that resolves AFTER User B has already logged in (and
 * fetched B's own archive) would overwrite the store with A's data —
 * B's UI would silently show A's scorecards/personal bests. Every call
 * captures the generation at the start; only the response matching the
 * CURRENT generation is allowed to commit, so any newer call (same user
 * refetching, or a different user logging in) always wins.
 */
let scorecardFetchGeneration = 0;

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  archive: null,
  localArchive: null,
  loading: false,
  error: null,
  activeGhostPace: null,
  lastNewPB: null,

  fetchScorecards: async (playerId: string) => {
    if (!playerId) return;

    const myGeneration = ++scorecardFetchGeneration;

    // Fast local optimistic load
    const cached = loadCachedArchive(playerId);
    const current = get().archive;
    const localArchive = get().localArchive?.playerId === playerId ? get().localArchive : cached.localArchive;
    set({
      archive: current?.playerId === playerId ? current : cached.archive,
      localArchive,
      loading: true, error: null,
      ...(current?.playerId !== playerId ? { lastNewPB: null, activeGhostPace: null } : {}),
    });

    try {
      const data = await apiJson<{ archive: PlayerScorecardArchive }>(
        `/api/profile/${playerId}/scorecards`
      );
      // A newer fetchScorecards call (a different user logging in, or a
      // refetch) started while this one was in flight — its result already
      // won, so this stale response must not overwrite it.
      if (myGeneration !== scorecardFetchGeneration) return;
      if (data?.archive && data.archive.playerId === playerId) {
        saveCachedArchive(playerId, data.archive, localArchive);
        set({ archive: data.archive, loading: false, error: null });
      } else {
        set({ loading: false, error: "Could not load records. Please try again." });
      }
    } catch (err) {
      if (myGeneration !== scorecardFetchGeneration) return;
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load scorecards",
      });
    }
  },

  recordScore: async (playerId: string, payload: RecordScorePayload) => {
    let effectivePlayerId = playerId;
    if (!effectivePlayerId || effectivePlayerId === "guest") {
      const cred = await getPlayerCredential();
      if (cred?.playerId) {
        effectivePlayerId = cred.playerId;
      }
    }
    if (!effectivePlayerId) return null;
    const generation = scorecardFetchGeneration;

    try {
      const res = await apiFetch(`/api/profile/${effectivePlayerId}/scorecards/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to record score");
      const data = (await res.json()) as { result: RecordScoreResult };

      if (data?.result) {
        const result = data.result;
        if (generation !== scorecardFetchGeneration) return result;

        // If new personal best, queue celebratory overdrive modal
        if (result.isNewPersonalBest) {
          set({ lastNewPB: result });
        }

        // Re-fetch archive in background to update UI
        get().fetchScorecards(effectivePlayerId);
        return result;
      }
    } catch (err) {
      console.warn("Failed to record score:", err);
      if (generation === scorecardFetchGeneration) {
        set({ error: "Your score could not be synced to your account. Check your connection and try again." });
      }
    }
    return null;
  },

  updateLivePace: (game: AllGameSlug, modeId: string, currentScore: number) => {
    const archive = get().archive;
    const gameConfig = getGameModeConfig(game);
    const modeDef =
      gameConfig.modes.find((m) => m.modeId === modeId) ??
      gameConfig.modes[0] ?? {
        modeId,
        displayName: modeId,
        description: "",
        scoringDirection: "HIGHER_IS_BETTER" as const,
        unit: "pts",
      };

    const personalBest = archive?.games[game]?.modes[modeId]?.bestScore ?? 0;
    const scoringDirection = modeDef.scoringDirection;

    let delta = 0;
    let isAhead = false;
    let isOverdrive = false;

    if (scoringDirection === "HIGHER_IS_BETTER") {
      delta = currentScore - personalBest;
      isAhead = delta >= 0;
      isOverdrive = personalBest > 0 && currentScore > personalBest;
    } else {
      delta = personalBest - currentScore;
      isAhead = delta >= 0;
      isOverdrive = personalBest > 0 && currentScore < personalBest;
    }

    set({
      activeGhostPace: {
        game,
        modeId,
        personalBest,
        scoringDirection,
        currentScore,
        delta,
        isAhead,
        isOverdrive,
      },
    });
  },

  dismissPBModal: () => set({ lastNewPB: null }),
  clearScorecards: (playerId?: string) => {
    // Invalidate any fetch still in flight from before this clear so it can
    // never land afterward and resurrect the outgoing user's data.
    scorecardFetchGeneration++;
    if (playerId) {
      try {
        localStorage.removeItem(`${STORAGE_KEY}.${playerId}`);
      } catch {}
    }
    set({
      archive: null,
      localArchive: null,
      lastNewPB: null,
      activeGhostPace: null,
      error: null,
      loading: false,
    });
  },
}));

/**
 * Universal helper for solo and arcade games to record personal best scores
 * into the Chrono-Scorecard and Leaderboard system.
 */
export async function recordSoloScore(
  game: AllGameSlug,
  modeId: string,
  score: number,
  secondaryMetrics?: Record<string, number | string>
): Promise<RecordScoreResult | null> {
  const cred = await getPlayerCredential();
  const effectiveId = cred?.playerId || "guest";

  return useScorecardStore.getState().recordScore(effectiveId, {
    game,
    modeId,
    score,
    context: "SOLO",
    matchId: `solo_${game}_${modeId}_${Date.now()}`,
    secondaryMetrics,
  });
}
