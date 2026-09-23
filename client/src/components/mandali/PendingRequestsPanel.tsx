/**
 * BHALYAM Mandali — Pending Join Requests Panel
 *
 * Approve/decline join applications — only rendered when the Mandali's
 * join-approval setting is on. Owners/admins only; the caller decides
 * whether to mount this at all (see GroupInfoModal's joinApproval toggle).
 *
 * Known gap: `mandali_join_requests` stores only the requester's identity
 * id, not a display name/avatar (a requester isn't a member yet, so there's
 * no membership row to read one from). Until the schema carries a snapshot
 * name, this shows the raw id — good enough to approve/decline by, not a
 * finished admin UX. Follow-up, not blocking.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { UserCheck, Check, X } from "lucide-react";
import Modal from "../Modal.js";
import type { MandaliJoinRequestRecord } from "@shared/mandali/types.js";

export interface PendingRequestsPanelProps {
  open: boolean;
  onClose: () => void;
  requests: MandaliJoinRequestRecord[];
  onDecide: (requestId: string, approve: boolean) => Promise<{ success: boolean; error?: string }>;
}

export default function PendingRequestsPanel({ open, onClose, requests, onDecide }: PendingRequestsPanelProps) {
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (requestId: string, approve: boolean) => {
    setBusyFor(requestId);
    setError(null);
    const result = await onDecide(requestId, approve);
    setBusyFor(null);
    if (!result.success) setError(result.error ?? "Could not decide this request.");
  };

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="pending-requests-title">
      <div className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <UserCheck className="w-4 h-4 text-amber-500" />
          <h2 id="pending-requests-title" className="text-base font-black text-slate-900 dark:text-white">
            Join Requests {requests.length > 0 && `(${requests.length})`}
          </h2>
        </div>

        {error && (
          <p className="px-5 pt-3 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {requests.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
              No pending join requests.
            </p>
          ) : (
            requests.map((request) => {
              const isBusy = busyFor === request.id;
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 px-2.5 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {request.requesterIdentityId}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decide(request.id, true)}
                      disabled={isBusy}
                      aria-label="Approve"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(request.id, false)}
                      disabled={isBusy}
                      aria-label="Decline"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
