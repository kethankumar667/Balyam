import { useCallback, useEffect, useState } from "react";
import { Check, Circle, ShieldCheck } from "lucide-react";
import { apiFetch } from "../../lib/playerIdentity";
import { ProfileErrorState, ProfilePanelSkeleton, ProfileSection } from "./ProfilePrimitives";

/**
 * The player's trust tier, as a checklist they can read.
 *
 * A number with no reason attached is exactly what makes a system feel arbitrary,
 * so this shows every criterion behind the tier — what earned the current one and
 * what the next still needs — and what the tier changes (how many coins can be
 * sent per day). It is built only from matches, account age and Mandali
 * membership: nothing about the device or the network is involved, and the card
 * says so.
 */

interface TrustReason {
  label: string;
  met: boolean;
  detail: string;
}

interface TrustResponse {
  trust: { tier: 1 | 2 | 3 | 4; reasons: TrustReason[] };
  transfer: { dailyCap: number; sentToday: number | null };
  standing: { state: "RESTRICTED" | "UNDER_REVIEW"; message: string } | null;
}

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; data: TrustResponse };

export function TrustTierCard({ playerId }: { playerId: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: "loading" });
    (async () => {
      try {
        const res = await apiFetch(`/api/rewards/${encodeURIComponent(playerId)}/trust`);
        if (!res.ok) throw new Error("trust unavailable");
        const data = (await res.json()) as TrustResponse;
        if (!cancelled) setLoad({ status: "ready", data });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <ProfileSection
      title="Trust tier"
      description="How far your account is trusted with rewards and coin transfers, and exactly why."
      icon={ShieldCheck}
      accent="green"
    >
      {load.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : null}
      {load.status === "error" ? (
        <ProfileErrorState title="Trust tier unavailable" description="We couldn't load your trust details. Your account is unaffected." onRetry={retry} />
      ) : null}
      {load.status === "ready" ? <TrustBody data={load.data} /> : null}
    </ProfileSection>
  );
}

function TrustBody({ data }: { data: TrustResponse }) {
  const { trust, transfer, standing } = data;
  return (
    <div className="space-y-4">
      {standing ? (
        <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {standing.message}
        </div>
      ) : null}

      <p className="text-2xl font-black text-ink-hi">
        Tier {trust.tier}
        <span className="ml-2 text-sm font-semibold text-ink-mid">of 4</span>
      </p>

      <ul className="space-y-2" aria-label="What each tier needs">
        {trust.reasons.map((reason) => (
          <li key={reason.label} className="flex items-start gap-3 text-sm">
            {reason.met ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-lo" aria-hidden="true" />
            )}
            <span className="min-w-0">
              <span className={reason.met ? "font-semibold text-ink-hi" : "text-ink-mid"}>{reason.label}</span>
              <span className="sr-only">{reason.met ? " — done" : " — not yet"}</span>
              <span className="ml-2 text-xs text-ink-lo">{reason.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink-mid">
        You can send up to <span className="font-bold text-ink-hi">{transfer.dailyCap.toLocaleString()}</span> coins a day
        {transfer.sentToday !== null ? <> — {transfer.sentToday.toLocaleString()} sent today</> : null}.
      </p>

      <p className="text-xs text-ink-lo">
        Tiers come from your matches, account age and Mandalis only — never your device or network.
      </p>
    </div>
  );
}
