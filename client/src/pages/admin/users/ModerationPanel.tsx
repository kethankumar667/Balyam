import { Ban, Check } from "lucide-react";
import type { AdminUserSummary } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";
import type { SuspensionFlow } from "./useSuspensionFlow";

const BUTTON =
  "min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";
const NEUTRAL = `${BUTTON} border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]`;
const DANGER_OUTLINE = `${BUTTON} border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300`;
const DANGER_SOLID = `${BUTTON} border-transparent bg-rose-600 text-white hover:bg-rose-700`;
const PRIMARY = `${BUTTON} border-transparent bg-amber-500 text-amber-950 hover:bg-amber-400`;

interface ModerationPanelProps {
  user: AdminUserSummary;
  flow: SuspensionFlow;
  onReload: () => void;
}

/**
 * Whether this identity may play, and the one action that changes it.
 *
 * Suspending asks for a reason and a confirmation in place: the panel swaps its body for the form and the
 * rest of the dashboard stays where it is, so the operator can still read the record they are acting on.
 */
export default function ModerationPanel({ user, flow, onReload }: ModerationPanelProps) {
  const { confirmation, reason, isReasonValid, isBusy, actionError, isProtected, canSuspend } = flow;
  const { suspension } = user;
  const isSuspending = confirmation === "suspend";

  if (confirmation) {
    return (
      <Panel title="Moderation" busy={isBusy}>
        <form
          className="space-y-3"
          aria-busy={isBusy}
          onSubmit={(event) => {
            event.preventDefault();
            void flow.submit();
          }}
        >
          <h3 className="text-sm font-semibold text-[var(--chrome-ink)]">
            {isSuspending ? "Confirm suspension" : "Confirm resumption"}
          </h3>
          <p className="text-sm text-[var(--chrome-ink)]">
            {isSuspending ? "Suspend" : "Resume"} {user.name} ({user.id})? Recorded data and moderation evidence will be preserved.
          </p>
          <label className="block text-sm font-semibold text-[var(--chrome-ink)]" htmlFor="suspension-reason">
            Suspension reason
          </label>
          <textarea
            ref={flow.reasonRef}
            id="suspension-reason"
            required
            aria-required="true"
            minLength={flow.minReasonLength}
            maxLength={flow.maxReasonLength}
            disabled={isBusy}
            value={reason}
            onChange={(event) => flow.setReason(event.target.value)}
            aria-describedby={actionError ? "suspension-error" : undefined}
            className="min-h-[88px] w-full rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-control)] p-3 text-sm text-[var(--chrome-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
          {actionError && (
            <p id="suspension-error" role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {actionError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={NEUTRAL} disabled={isBusy} onClick={flow.cancel}>
              Cancel
            </button>
            <button type="submit" className={isSuspending ? DANGER_SOLID : PRIMARY} disabled={isBusy || !isReasonValid}>
              <Check size={16} aria-hidden="true" />
              {isBusy ? "Saving..." : isSuspending ? "Confirm suspension" : "Confirm resumption"}
            </button>
            {actionError && (
              <button
                type="button"
                className={NEUTRAL}
                disabled={isBusy}
                onClick={() => {
                  flow.cancel();
                  onReload();
                }}
              >
                Reload details
              </button>
            )}
          </div>
        </form>
      </Panel>
    );
  }

  return (
    <Panel title="Moderation">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-[var(--chrome-ink)]">
            {suspension.isSuspended
              ? `Suspended${suspension.updatedAt ? ` on ${new Date(suspension.updatedAt).toLocaleDateString()}` : ""}.`
              : "No restrictions are applied to this identity."}
          </p>
          {suspension.isSuspended && (
            <p className="text-sm text-[var(--chrome-ink-soft)]">Reason: {suspension.reason || "Not recorded"}</p>
          )}
        </div>
        {canSuspend ? (
          <button
            ref={flow.actionRef}
            type="button"
            className={suspension.isSuspended ? NEUTRAL : DANGER_OUTLINE}
            onClick={flow.begin}
          >
            <Ban size={16} aria-hidden="true" />
            {suspension.isSuspended ? "Resume identity" : "Suspend identity"}
          </button>
        ) : (
          <p className="text-sm text-[var(--chrome-ink-soft)]">
            {isProtected ? "This identity is protected from suspension." : "Suspension requires superadmin access."}
          </p>
        )}
      </div>
    </Panel>
  );
}
