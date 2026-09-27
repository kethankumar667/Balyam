import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Trash2,
  X,
  ShieldAlert,
  Loader2,
  Coins,
  Trophy,
  UserX,
} from "lucide-react";
import Modal from "../Modal";
import { executeAccountDeletion } from "../../lib/accountDeletion";
import { usePlayerId } from "../../lib/playerIdentity";

export interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteAccountModal({
  open,
  onClose,
  onSuccess,
}: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const { playerId: effectivePlayerId } = usePlayerId();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim().toUpperCase() === "DELETE";

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput("");
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await executeAccountDeletion(effectivePlayerId);
      if (!res.ok) {
        setErrorMessage(res.error ?? "Failed to delete account. Please try again.");
        setIsDeleting(false);
        return;
      }

      handleClose();
      onSuccess?.();
      navigate("/", { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred while deleting your account.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      ariaLabel="Delete BHALYAM Account"
      className="p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#1A1822] dark:to-[#0F0D14] border-2 border-rose-400 dark:border-rose-700/80 border-b-4 border-b-rose-600 dark:border-b-rose-950 shadow-[0_10px_0_rgba(15,23,42,0.9)] p-6 overflow-hidden space-y-5 text-slate-900 dark:text-slate-100 font-sans">
        {/* Decorative Top Accent Glow */}
        <div
          className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-rose-500/15 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-rose-200 dark:border-rose-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(159,18,57,0.9)] border-2 border-rose-300">
              <Trash2 className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Delete BHALYAM Account
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                Permanent &amp; Irreversible
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center border-b-2 border-slate-300 dark:border-slate-900 active:border-b-0 active:translate-y-0.5 transition cursor-pointer disabled:opacity-50"
            aria-label="Close delete account modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Consequences Warning Callout */}
        <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border-2 border-rose-300/80 dark:border-rose-900/60 space-y-2.5">
          <p className="text-xs font-black text-rose-900 dark:text-rose-200 leading-relaxed uppercase tracking-wide">
            Deleting your account completely removes your presence from BHALYAM. The following data will be erased forever:
          </p>

          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <li className="flex items-center gap-2">
              <UserX className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>Your username, email address, bio &amp; avatar</span>
            </li>
            <li className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>All unredeemed vouchers &amp; permanent coin balance</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>Match histories, tournament trophies &amp; ranking stats</span>
            </li>
          </ul>
        </div>

        {/* Verification Input Prompt */}
        <div className="space-y-2">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Type <span className="font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">DELETE</span> to confirm:
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={isDeleting}
            placeholder="DELETE"
            autoComplete="off"
            spellCheck="false"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/60 transition disabled:opacity-50"
          />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto flex-1 min-h-[44px] px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-b-4 border-slate-300 dark:border-slate-900 active:border-b-0 active:translate-y-1 transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="w-full sm:w-auto flex-1 min-h-[44px] px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-linear-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 shadow-[0_4px_0_rgba(159,18,57,0.8)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" aria-hidden="true" />
                <span>Deleting Account…</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                <span>Delete My Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
