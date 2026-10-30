import { create } from "zustand";
import { apiJson, apiFetch, getPlayerCredential, peekPlayerCredential } from "../lib/playerIdentity";
import { enqueueScore, pendingScores, removeScore } from "../lib/scoreOutbox";
import { toast } from "../hooks/useToast";
import type {
  PlayerScorecardArchive,
  RecordScorePayload,
  RecordScoreResult,
  GhostPaceStatus,
  AllGameSlug,
} from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";
import { useNewRecordStore } from "./newRecordStore";

interface ScorecardState {
  archive: PlayerScorecardArchive | null;
  localArchive: PlayerScorecardArchive | null;
  loading: boolean;
  error: string | null;
  activeGhostPace: GhostPaceStatus | null;
  lastNewPB: RecordScoreResult | null;
  /** Results this player finished that the account has not confirmed yet. They are kept and sent again. */
  pendingScoreCount: number;

  fetchScorecards: (playerId: string) => Promise<void>;
  flushPendingScores: (playerId: string) => Promise<{ sent: number; remaining: number }>;
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

const SYNC_QUEUED_MESSAGE =
  "Your score could not be synced to your account yet. It is saved on this device and will be sent again automatically.";
const SYNC_FAILED_MESSAGE = "Your score could not be synced to your account. Check your connection and try again.";

/**
 * Whether a failed save is worth trying again. Only a result the server judged invalid (400, 422) never will be
 * accepted; a dropped connection, a server waking up, a 5xx, a rate limit or an expired sign-in all can be.
 * A response with no status is treated as retryable too, since keeping a score costs little and losing one is
 * the bug this queue exists to prevent.
 */
function isRetryableStatus(status: number | undefined): boolean {
  return status !== 400 && status !== 422;
}

const scoreEndpoint = (playerId: string) => `/api/profile/${playerId}/scorecards/record`;

/**
 * A result that was queued while the server was unreachable can still turn out to be a record when it finally
 * lands. The player earned it, so they get the popup then rather than never; a reply that cannot be read is skipped.
 */
async function announceSavedRecord(res: Response): Promise<void> {
  try {
    const data = (await res.json()) as { result?: RecordScoreResult };
    if (data?.result?.isNewPersonalBest) useNewRecordStore.getState().announce(data.result);
  } catch {
    // The score is saved either way; only the celebration is lost.
  }
}
const flushesInFlight = new Map<string, Promise<{ sent: number; remaining: number }>>();

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  archive: null,
  localArchive: null,
  loading: false,
  error: null,
  activeGhostPace: null,
  lastNewPB: null,
  pendingScoreCount: 0,

  /**
   * Send the results that could not be saved earlier, oldest first, stopping at the first one the server
   * cannot take so their order is kept. Only the signed-in player's own results are sent: a queued score
   * belongs to the account that earned it, and another account must never be asked to carry it.
   */
  flushPendingScores: (playerId: string) => {
    const running = flushesInFlight.get(playerId);
    if (running) return running;

    const run = (async () => {
      const queued = pendingScores(playerId);
      if (queued.length === 0 || peekPlayerCredential()?.playerId !== playerId) {
        set({ pendingScoreCount: queued.length });
        return { sent: 0, remaining: queued.length };
      }

      let sent = 0;
      for (const entry of queued) {
        try {
          const res = await apiFetch(scoreEndpoint(playerId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.payload),
          });
          if (res.ok || !isRetryableStatus(res.status)) {
            removeScore(playerId, entry.payload);
            if (res.ok) {
              sent += 1;
              await announceSavedRecord(res);
            }
            continue;
          }
        } catch (err) {
          console.warn("Could not resend a queued score:", err);
        }
        break;
      }

      const remaining = pendingScores(playerId).length;
      set({ pendingScoreCount: remaining });
      return { sent, remaining };
    })().finally(() => flushesInFlight.delete(playerId));

    flushesInFlight.set(playerId, run);
    return run;
  },

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

    // Results that could not be saved earlier go first, so the archive read below already includes them.
    // Nothing is awaited when nothing is queued, which is almost always.
    const waiting = pendingScores(playerId).length;
    set({ pendingScoreCount: waiting });
    if (waiting > 0) {
      await get().flushPendingScores(playerId);
      if (myGeneration !== scorecardFetchGeneration) return;
    }

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

    let retryable = true;
    try {
      const res = await apiFetch(scoreEndpoint(effectivePlayerId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        retryable = isRetryableStatus(res.status);
        throw new Error("Failed to record score");
      }
      const data = (await res.json()) as { result: RecordScoreResult };

      if (data?.result) {
        const result = data.result;

        // The record is a fact about this match, so it is announced before the staleness check below: that check
        // only protects the archive and the chip, and a refetch that began while this save was in flight (a
        // refocus, a sign-in sync) must not swallow the one popup the player is waiting for.
        if (result.isNewPersonalBest) {
          useNewRecordStore.getState().announce(result);
        }
        if (generation !== scorecardFetchGeneration) return result;

        if (result.isNewPersonalBest) set({ lastNewPB: result });

        // Re-fetch archive in background to update UI
        get().fetchScorecards(effectivePlayerId);
        return result;
      }
    } catch (err) {
      console.warn("Failed to record score:", err);
      // Keep the result instead of losing it: the game has already shown it as a record from its own save,
      // so nothing else will ever tell the account. It is sent again, with the same matchId, until it lands.
      const pending = retryable ? enqueueScore(effectivePlayerId, payload) : pendingScores(effectivePlayerId).length;
      if (retryable) {
        toast.warning("Score saved on this device. We'll add it to your account as soon as we can reach the server.");
      }
      if (generation === scorecardFetchGeneration) {
        set({ pendingScoreCount: pending, error: retryable ? SYNC_QUEUED_MESSAGE : SYNC_FAILED_MESSAGE });
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
      pendingScoreCount: 0,
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
