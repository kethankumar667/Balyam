/**
 * BHALYAM Mandali — Leave dialog
 *
 * Any member may leave whenever they like: they are asked once, and go.
 * The host may not simply walk out — the group would be left with nobody in
 * charge — so they first choose who takes over. A host who is the only member
 * has nobody to choose, and is pointed at deleting the group instead.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets; shared bottom-sheet-on-mobile Modal.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useRef, useState } from "react";
import { LogOut, Loader2, Trash2 } from "lucide-react";
import Modal from "../Modal.js";

export interface HostCandidate {
  playerId: string;
  displayName: string;
  role: string;
}

export interface LeaveMandaliDialogProps {
  open: boolean;
  onClose: () => void;
  mandaliName: string;
  isOwner: boolean;
  /** The other active members the host could hand the group to. */
  candidates: HostCandidate[];
  /** Resolves with the outcome. For a host, `newHostId` is who takes over. */
  onLeave: (newHostId?: string) => Promise<{ success: boolean; error?: string }>;
  /** Offered to a host with nobody to hand over to. Omit and it is not offered. */
  onDeleteInstead?: () => void;
}

const SECONDARY_BUTTON =
  "flex-1 min-h-[44px] rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500";
const DANGER_BUTTON =
  "flex-1 min-h-[44px] rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400";

export default function LeaveMandaliDialog({
  open, onClose, mandaliName, isOwner, candidates, onLeave, onDeleteInstead,
}: LeaveMandaliDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A ref, not state: a double tap lands before the re-render that would disable the button. */
  const inFlight = useRef(false);

  useEffect(() => {
    if (open) return;
    setSelectedId(null);
    setError(null);
  }, [open]);

  // A choice only counts while that person is still in the group.
  const chosen = candidates.find((c) => c.playerId === selectedId) ?? null;
  const hostMustChoose = isOwner && candidates.length > 0;
  const hostIsAlone = isOwner && candidates.length === 0;

  const submit = async () => {
    if (inFlight.current || (hostMustChoose && !chosen)) return;
    inFlight.current = true;
    setIsLeaving(true);
    setError(null);
    try {
      const result = await onLeave(hostMustChoose ? chosen?.playerId : undefined);
      if (result.success) onClose();
      else setError(result.error ?? "Could not leave this Mandali.");
    } catch {
      setError("Could not leave this Mandali. Please try again.");
    } finally {
      inFlight.current = false;
      setIsLeaving(false);
    }
  };

  const title = hostMustChoose
    ? "Choose a new host"
    : hostIsAlone
      ? "You can't leave yet"
      : `Leave “${mandaliName}”?`;
  const confirmLabel = hostMustChoose ? (chosen ? `Make ${chosen.displayName} host & leave` : "Make host & leave") : "Leave";

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="leave-mandali-title">
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <LogOut className="w-4 h-4 text-rose-500" aria-hidden="true" />
          <h2 id="leave-mandali-title" className="text-base font-black text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>

        {!isOwner && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You&apos;ll stop receiving this Mandali&apos;s messages and won&apos;t see what is said after you go. You
            can join again later if the group allows it.
          </p>
        )}

        {hostMustChoose && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              You are the host, so you can&apos;t leave until someone else takes over. Pick who becomes the host of{" "}
              {mandaliName}; you will then leave.
            </p>
            <div role="radiogroup" aria-labelledby="leave-mandali-title" className="space-y-1.5 max-h-60 overflow-y-auto">
              {candidates.map((candidate) => (
                <label
                  key={candidate.playerId}
                  className={`flex items-center gap-3 min-h-[44px] px-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedId === candidate.playerId
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="new-host"
                    value={candidate.playerId}
                    checked={selectedId === candidate.playerId}
                    onChange={() => setSelectedId(candidate.playerId)}
                    disabled={isLeaving}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {candidate.displayName}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                      {candidate.role.toLowerCase()}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {hostIsAlone && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You are the only member, so there is nobody to hand {mandaliName} over to. You can delete it instead, or
            invite someone first.
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          {hostIsAlone ? (
            <>
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
                Close
              </button>
              {onDeleteInstead && (
                <button type="button" onClick={onDeleteInstead} className={DANGER_BUTTON}>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Delete Mandali…
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={isLeaving} className={SECONDARY_BUTTON}>
                {hostMustChoose ? "Cancel" : "Stay"}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isLeaving || (hostMustChoose && !chosen)}
                aria-busy={isLeaving}
                className={DANGER_BUTTON}
              >
                {isLeaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                )}
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
