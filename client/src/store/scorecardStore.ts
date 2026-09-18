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

function loadCachedArchive(playerId: string): PlayerScorecardArchive | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${playerId}`);
    if (raw) return JSON.parse(raw) as PlayerScorecardArchive;
  } catch {
    // Ignore storage issues
  }
  return null;
}

function saveCachedArchive(playerId: string, archive: PlayerScorecardArchive): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}.${playerId}`, JSON.stringify(archive));
  } catch {
    // Ignore storage quota
  }
}

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  archive: null,
  loading: false,
  error: null,
  activeGhostPace: null,
  lastNewPB: null,

  fetchScorecards: async (playerId: string) => {
    if (!playerId) return;

    // Fast local optimistic load
    const cached = loadCachedArchive(playerId);
    if (cached && !get().archive) {
      set({ archive: cached });
    }

    set({ loading: !cached, error: null });

    try {
      const data = await apiJson<{ archive: PlayerScorecardArchive }>(
        `/api/profile/${playerId}/scorecards`
      );
      if (data?.archive) {
        saveCachedArchive(playerId, data.archive);
        set({ archive: data.archive, loading: false, error: null });
      } else {
        set({ loading: false });
      }
    } catch (err) {
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
    if (playerId) {
      try {
        localStorage.removeItem(`${STORAGE_KEY}.${playerId}`);
      } catch {}
    }
    set({
      archive: null,
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

