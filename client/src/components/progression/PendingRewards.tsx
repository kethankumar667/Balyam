import { useCallback, useEffect, useState } from "react";
import { Clock, Coins, ShieldAlert } from "lucide-react";
import { apiFetch } from "../../lib/playerIdentity";
import { formatArrival } from "./formatArrival";

/**
 * Rewards that have been earned and are on their way to the wallet.
 *
 * A reward vests for a day before it is paid, and "claimed but no coins yet" with
 * no explanation reads as a bug. This shows exactly what is coming and when. It
 * draws nothing when nothing is pending, so it costs an empty screen no space.
 *
 * If the player's account is restricted or under review the server says so and
 * this repeats it in plain words with what to do — the one place the app tells a
 * player their rewards are being held, rather than leaving them to wonder.
 */

export interface PendingReward {
  rewardId: string;
  amount: number;
  status: "PENDING" | "RELEASING" | "RELEASED" | "VOIDED";
  vestingUntil: number;
  description: string;
  sourceId?: string;
}

interface Standing {
  state: "RESTRICTED" | "UNDER_REVIEW";
  message: string;
}

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rewards: PendingReward[]; standing: Standing | null };

export interface PendingRewardsProps {
  playerId: string;
  /** Told what the server holds each time it loads, so a caller can show arrival times elsewhere. */
  onLoaded?: (rewards: ReadonlyArray<PendingReward>) => void;
  /** Bump to refetch, e.g. right after a claim. */
  refreshKey?: number;
  /** Injectable for tests. */
  now?: () => number;
}

export function PendingRewards({ playerId, onLoaded, refreshKey = 0, now = Date.now }: PendingRewardsProps) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Keep what is on screen while a refetch runs, so the block does not collapse
    // and reopen (a layout shift) right after every claim.
    setLoad((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    (async () => {
      try {
        const res = await apiFetch(`/api/rewards/${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error("rewards unavailable");
        const body = (await res.json()) as { rewards?: PendingReward[]; standing?: Standing | null };
        if (cancelled) return;
        const rewards = Array.isArray(body.rewards) ? body.rewards : [];
        setLoad({ status: "ready", rewards, standing: body.standing ?? null });
        onLoaded?.(rewards);
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, refreshKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (load.status === "loading") return null;

  if (load.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-stone-900/60 px-3.5 py-2.5 text-xs font-mono text-stone-300">
        <span>Couldn&apos;t load your pending rewards.</span>
        <button
          type="button"
          onClick={retry}
          className="min-h-[44px] rounded-lg px-3 font-bold text-amber-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const onItsWay = load.rewards.filter((r) => r.status === "PENDING" || r.status === "RELEASING");
  if (onItsWay.length === 0 && !load.standing) return null;

  return (
    <section aria-label="Rewards on their way" className="space-y-2.5">
      {load.standing ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{load.standing.message}</p>
        </div>
      ) : null}
      {onItsWay.length > 0 ? (
        <ul className="space-y-2">
          {onItsWay.map((reward) => (
            <li
              key={reward.rewardId}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-stone-900/60 px-3.5 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs font-mono">
                <Coins className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span className="font-bold text-amber-300">+{reward.amount.toLocaleString()} coins</span>
                <span className="truncate text-stone-400">{reward.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-mono font-bold text-stone-300">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatArrival(reward.vestingUntil, now())}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
