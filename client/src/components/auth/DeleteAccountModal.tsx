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
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#121829] border border-rose-200 dark:border-rose-900/50 shadow-2xl p-6 overflow-hidden space-y-5 text-slate-900 dark:text-slate-100 font-sans">
        {/* Decorative Top Accent Glow */}
        <div
          className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-rose-500/15 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 dark:border-rose-900/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Delete BHALYAM Account
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Permanent &amp; Irreversible
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
            aria-label="Close delete account modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Consequences Warning Callout */}
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-2.5">
          <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-relaxed">
            Deleting your account completely removes your presence from BHALYAM. The following data will be erased forever:
          </p>

          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <UserX className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
              <span>Your username, email address, bio &amp; avatar</span>
            </li>
            <li className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>All unredeemed vouchers &amp; permanent coin balance</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
              <span>Match histories, tournament trophies &amp; ranking stats</span>
            </li>
          </ul>
        </div>

        {/* Verification Input Prompt */}
        <div className="space-y-2">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Type <span className="font-mono font-black text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/60 transition disabled:opacity-50"
          />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto flex-1 min-h-[44px] px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="w-full sm:w-auto flex-1 min-h-[44px] px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Deleting Account…</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Delete My Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
