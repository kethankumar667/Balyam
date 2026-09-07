import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import DetailDrawer from "../../../../components/admin/detail-drawer";
import InfoCard from "../../../../components/admin/info-card";
import StatusBadge from "../../../../components/admin/status-badge";
import {
  reconcileTerminalIntent,
  retryTerminalIntent,
  requeueTerminalIntent,
  type TerminalIntentRecord,
  type SettlementReconciliation,
} from "../../../../lib/economyApi";

interface TerminalIntentDrawerProps {
  intentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a retry/requeue actually changes the intent's status, so the parent list can refetch. */
  onChanged: () => void;
}

/** `TerminalIntentStatus` -> the shared `StatusBadge` vocabulary. */
function statusBadgeStatus(status: TerminalIntentRecord["status"]): string {
  switch (status) {
    case "FAILED":
      return "failed";
    case "COMPLETED":
      return "completed";
    case "PROCESSING":
      return "active";
    case "RETRYABLE":
      return "warning";
    default:
      return "pending";
  }
}

function formatTimestamp(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleString();
}

/**
 * Reconciliation + operator action panel for one durable terminal intent
 * (Blocker 06's async settlement/refund/forfeiture job queue). This is the
 * only place these five endpoints are consumed — previously wired
 * server-side with zero client references.
 *
 * Retry and requeue are the ONLY writes exposed here, mirroring exactly
 * what `retryTerminalIntent`/`requeueExpiredTerminalIntentClaim` allow at
 * the repository layer: FAILED -> PENDING, or a PROCESSING claim whose
 * lease expired (or is explicitly force-overridden) -> PENDING. Nothing
 * here accepts a wallet amount or invents a new state transition.
 */
export default function TerminalIntentDrawer({
  intentId,
  isOpen,
  onClose,
  onChanged,
}: TerminalIntentDrawerProps) {
  const [intent, setIntent] = useState<TerminalIntentRecord | null>(null);
  const [reconciliation, setReconciliation] = useState<SettlementReconciliation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !intentId) return;
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);
    setReason("");
    setForce(false);
    setActionError(null);
    setActionSuccess(null);
    reconcileTerminalIntent(intentId)
      .then((res) => {
        if (!isMounted) return;
        setIntent(res.intent);
        setReconciliation(res.reconciliation);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load terminal intent.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, intentId]);

  async function handleRetry() {
    if (!intentId) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await retryTerminalIntent(intentId, reason.trim() || undefined);
      setIntent(res.intent);
      setActionSuccess(
        res.updated
          ? "Retry queued — intent moved back to PENDING for reprocessing."
          : "No change: this intent was no longer FAILED by the time the request reached the server.",
      );
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequeue() {
    if (!intentId) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await requeueTerminalIntent(intentId, force);
      setIntent(res.intent);
      setActionSuccess(
        res.updated
          ? "Reclaimed — intent moved back to PENDING for reprocessing."
          : "No change: this intent was no longer PROCESSING by the time the request reached the server.",
      );
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Requeue failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={intent ? `Intent ${intent.id.slice(0, 8)}…` : "Terminal Intent"}
      subtitle={intent ? `${intent.operationKind} for match ${intent.matchId}` : undefined}
      badge={intent && <StatusBadge status={statusBadgeStatus(intent.status)} label={intent.status} size="sm" />}
    >
      {isLoading && (
        <div className="py-10 text-center text-xs text-[var(--chrome-ink-soft)]">Loading intent…</div>
      )}

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          {loadError}
        </div>
      )}

      {intent && reconciliation && (
        <div className="space-y-6">
          <InfoCard
            title="Intent State"
            fields={[
              { label: "Match ID", value: intent.matchId, isMono: true },
              { label: "Operation", value: intent.operationKind },
              { label: "Attempt Count", value: intent.attemptCount },
              { label: "Last Error Code", value: intent.lastErrorCode ?? "—", isMono: true },
              { label: "Last Error Category", value: intent.lastErrorCategory ?? "—" },
              { label: "Claim Owner", value: intent.claimOwner ?? "—", isMono: true },
              { label: "Lease Expires", value: formatTimestamp(intent.leaseExpiresAt) },
              { label: "Next Attempt At", value: formatTimestamp(intent.nextAttemptAt) },
              { label: "Created", value: formatTimestamp(intent.createdAt) },
              { label: "Updated", value: formatTimestamp(intent.updatedAt) },
            ]}
          />

          <InfoCard
            title="Settlement Reconciliation"
            icon={
              reconciliation.isConserved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" aria-hidden="true" />
              )
            }
            fields={[
              { label: "Conserved", value: reconciliation.isConserved ? "Yes" : "No — discrepancy detected" },
              { label: "Committed Total", value: reconciliation.committedTotal, isMono: true },
              { label: "Actual Debited", value: reconciliation.actualDebited, isMono: true },
              { label: "Actual Credited", value: reconciliation.actualCredited, isMono: true },
              { label: "Discrepancy", value: reconciliation.discrepancy, isMono: true },
            ]}
          />
          {reconciliation.detail && (
            <p className="text-xs text-[var(--chrome-ink-soft)] -mt-3">{reconciliation.detail}</p>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {actionError}
            </div>
          )}

          {intent.status === "FAILED" && (
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Retry This Intent
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Moves this intent back to PENDING with the same recorded payload — the worker will reprocess it on
                its next pass. This is recorded against your operator id as an audited action.
              </p>
              <label htmlFor="retry-reason" className="block text-[11px] font-bold text-[var(--chrome-ink-soft)] uppercase">
                Reason (required)
              </label>
              <textarea
                id="retry-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Confirmed upstream wallet service outage has been resolved."
                className="w-full px-3 py-2 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={isSubmitting || reason.trim().length === 0}
                className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {isSubmitting ? "Retrying…" : "Confirm Retry"}
              </button>
            </div>
          )}

          {intent.status === "PROCESSING" && (
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Requeue This Intent
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Reclaims a stuck PROCESSING claim back to PENDING. Safe once its lease has expired (
                {formatTimestamp(intent.leaseExpiresAt)}); overriding an active lease can race a worker that is
                still genuinely processing it.
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--chrome-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                Override active lease (force)
              </label>
              <button
                type="button"
                onClick={() => void handleRequeue()}
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                {isSubmitting ? "Requeuing…" : force ? "Confirm Forced Requeue" : "Confirm Requeue"}
              </button>
            </div>
          )}

          {(intent.status === "PENDING" || intent.status === "RETRYABLE" || intent.status === "COMPLETED") && (
            <p className="text-xs text-[var(--chrome-ink-soft)] italic">
              {intent.status === "COMPLETED"
                ? "This operation already completed — no operator action available."
                : "This intent is already progressing on its own schedule — no operator action needed right now."}
            </p>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
