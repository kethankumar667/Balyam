import { useState } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "@shared/social/Report";
import ConfirmDialog from "./ConfirmDialog";

interface ReportPlayerDialogProps {
  playerName: string;
  /** Rejects to keep the dialog open and show why. */
  onReport: (reason: ReportReason) => Promise<void>;
  onClose: () => void;
}

/**
 * Pick one reason from the fixed list, then send.
 *
 * There is no free-text box on purpose — see `REPORT_REASONS`. The copy only
 * promises what is true: the report is saved, and the player is not told who
 * made it.
 */
export default function ReportPlayerDialog({ playerName, onReport, onClose }: ReportPlayerDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);

  return (
    <ConfirmDialog
      idPrefix="report"
      title="Report player"
      description={
        <>
          Tell us what is wrong with <strong className="text-[var(--auth-ink)]">{playerName}</strong>. Your
          report is saved for the BHALYAM team, and they are not told who sent it.
        </>
      }
      confirmLabel="Send report"
      busyLabel="Sending…"
      fallbackError="Couldn't send your report. Please try again."
      confirmDisabled={reason === null}
      onConfirm={() => (reason === null ? Promise.resolve() : onReport(reason))}
      onClose={onClose}
    >
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Reason for the report</legend>
        {REPORT_REASONS.map((r) => (
          <label
            key={r}
            className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] text-xs font-mono text-[var(--auth-ink)] cursor-pointer has-[:checked]:border-amber-500"
          >
            <input
              type="radio"
              name="report-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-amber-500"
            />
            {REPORT_REASON_LABELS[r]}
          </label>
        ))}
      </fieldset>
    </ConfirmDialog>
  );
}
