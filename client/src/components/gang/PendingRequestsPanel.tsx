/**
 * BHALYAM Gang — Pending Join Requests Panel
 *
 * Approve/decline join applications — only rendered when the Gang's
 * join-approval setting is on. Owners/admins only; the caller decides
 * whether to mount this at all (see GroupInfoModal's joinApproval toggle).
 *
 * Each row shows the name and avatar the applicant asked with (stored on the
 * request itself, since a requester isn't a member yet and has no membership
 * row to read them from). A request made before those were stored carries
 * neither, so it reads "Member" plus a short id rather than a bare uuid.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { UserCheck, Check, X } from "lucide-react";
import Modal from "../Modal.js";
import type { GangJoinRequestRecord } from "@shared/gang/types.js";
import { AlbumAvatar } from "./album/AlbumAvatar";

/** How many characters of an identity id to show when a request has no name. */
const SHORT_ID_LENGTH = 8;

/** What an admin reads for this applicant: their name, or "Member · a82d6ab1" for an old nameless request. */
export function requesterLabel(request: Pick<GangJoinRequestRecord, "requesterDisplayName" | "requesterIdentityId">): string {
  const name = request.requesterDisplayName?.trim();
  return name ? name : `Member · ${request.requesterIdentityId.slice(0, SHORT_ID_LENGTH)}`;
}

export interface PendingRequestsPanelProps {
  open: boolean;
  onClose: () => void;
  requests: GangJoinRequestRecord[];
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
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="pending-requests-title" panelClassName="w-full max-w-md">
      <div
        className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#27221e] bg-album-raised border border-stone-200 dark:border-stone-800 border-album-line shadow-2xl overflow-hidden"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-album-line shrink-0">
          <UserCheck className="w-4 h-4 text-album-foil" />
          <h2 id="pending-requests-title" className="text-base font-semibold text-album-ink">
            Join Requests {requests.length > 0 && `(${requests.length})`}
          </h2>
        </div>

        {error && (
          <p className="px-5 pt-3 text-[13px] text-album-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {requests.length === 0 ? (
            <p className="text-center text-[15px] text-album-ink3 py-8">
              No pending join requests.
            </p>
          ) : (
            requests.map((request) => {
              const isBusy = busyFor === request.id;
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 px-2.5 py-3 rounded-xl hover:bg-album-field transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AlbumAvatar avatar={request.requesterAvatar ?? undefined} name="" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-album-ink truncate">
                        {requesterLabel(request)}
                      </p>
                      <p className="text-[13px] text-album-ink3">
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decide(request.id, true)}
                      disabled={isBusy}
                      aria-label="Approve"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-album-success/15 text-album-success hover:bg-album-success/25 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(request.id, false)}
                      disabled={isBusy}
                      aria-label="Decline"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-album-danger/15 text-album-danger hover:bg-album-danger/25 disabled:opacity-50 cursor-pointer transition-colors"
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
