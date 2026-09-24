/**
 * BHALYAM Mandali — Group Info & Settings Modal
 *
 * "Group Info & Details" (name, emblem, description, rules) and "Group
 * Settings & Permissions" (who may edit info / send messages, join
 * approval toggle) in one sheet — matches how WhatsApp groups bundle both
 * under one "Group info" screen.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Info, Save, Loader2, Trash2, AlertTriangle } from "lucide-react";
import Modal from "../Modal.js";
import type { Mandali } from "@shared/mandali/types.js";

export interface GroupInfoModalProps {
  open: boolean;
  onClose: () => void;
  mandali: Mandali;
  /** Only owners/admins get editable fields — everyone else sees a read-only view. */
  canEditInfo: boolean;
  /** Only the owner can change settings, regardless of canEditInfo. */
  isOwner: boolean;
  onSave: (patch: {
    name?: string; description?: string; rules?: string;
    editPermission?: "ADMIN" | "ALL"; sendPermission?: "ADMIN" | "ALL"; joinApproval?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  /**
   * Owner only. Deletes the whole Mandali; the argument is the handle the owner
   * typed to confirm. Omit it and the delete control is not offered at all.
   */
  onDelete?: (confirmHandle: string) => Promise<{ success: boolean; error?: string }>;
}

/** What someone types to confirm: case, spacing and a leading @ are not part of the handle. */
const normaliseHandle = (typed: string): string => typed.trim().toLowerCase().replace(/^@/, "");

function SettingToggle({
  label, description, value, onChange, disabled,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void; disabled: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 py-2.5 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          value ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function GroupInfoModal({ open, onClose, mandali, canEditInfo, isOwner, onSave, onDelete }: GroupInfoModalProps) {
  const [name, setName] = useState(mandali.name);
  const [description, setDescription] = useState(mandali.description);
  const [rules, setRules] = useState(mandali.rules ?? "");
  const [editPermission, setEditPermission] = useState<"ADMIN" | "ALL">(mandali.editPermission ?? "ADMIN");
  const [sendPermission, setSendPermission] = useState<"ADMIN" | "ALL">(mandali.sendPermission ?? "ALL");
  const [joinApproval, setJoinApproval] = useState(mandali.joinApproval ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [typedHandle, setTypedHandle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  /** A ref, not state: a double click lands before the re-render that would disable the button. */
  const deleteInFlight = useRef(false);
  const canConfirmDelete = normaliseHandle(typedHandle) === mandali.handle.toLowerCase();

  // Tied to `open` alone, not to `mandali`: live updates hand this sheet a fresh
  // Mandali object all the time, and that must not wipe a half-typed confirmation.
  useEffect(() => {
    if (open) return;
    setConfirmingDelete(false);
    setTypedHandle("");
    setDeleteError(null);
  }, [open]);

  useEffect(() => {
    if (confirmingDelete) deleteInputRef.current?.focus();
  }, [confirmingDelete]);

  useEffect(() => {
    if (!open) return;
    setName(mandali.name);
    setDescription(mandali.description);
    setRules(mandali.rules ?? "");
    setEditPermission(mandali.editPermission ?? "ADMIN");
    setSendPermission(mandali.sendPermission ?? "ALL");
    setJoinApproval(mandali.joinApproval ?? false);
    setError(null);
  }, [open, mandali]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const result = await onSave({
      name: canEditInfo ? name : undefined,
      description: canEditInfo ? description : undefined,
      rules: canEditInfo ? rules : undefined,
      editPermission: isOwner ? editPermission : undefined,
      sendPermission: isOwner ? sendPermission : undefined,
      joinApproval: isOwner ? joinApproval : undefined,
    });
    setIsSaving(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "Could not save changes.");
    }
  };

  const cancelDelete = () => {
    setConfirmingDelete(false);
    setTypedHandle("");
    setDeleteError(null);
  };

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!onDelete || !canConfirmDelete || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await onDelete(typedHandle);
      if (result.success) {
        onClose();
      } else {
        setDeleteError(result.error ?? "Could not delete this Mandali.");
      }
    } catch {
      setDeleteError("Could not delete this Mandali. Please try again.");
    } finally {
      deleteInFlight.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="group-info-title">
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-amber-500" />
          <h2 id="group-info-title" className="text-base font-black text-slate-900 dark:text-white">
            Group Info
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="mandali-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              id="mandali-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEditInfo}
              maxLength={60}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-white disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="mandali-description" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="mandali-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEditInfo}
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white disabled:opacity-60 resize-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="mandali-rules" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Group Rules
            </label>
            <textarea
              id="mandali-rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              disabled={!canEditInfo}
              maxLength={1000}
              rows={3}
              placeholder="e.g. Be respectful, no spam, English/Telugu chat"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-60 resize-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Permissions {!isOwner && <span className="normal-case font-normal">(owner only)</span>}
          </h3>
          <SettingToggle
            label="Edit group info"
            description={editPermission === "ADMIN" ? "Only admins" : "All members"}
            value={editPermission === "ALL"}
            onChange={(v) => setEditPermission(v ? "ALL" : "ADMIN")}
            disabled={!isOwner}
          />
          <SettingToggle
            label="Send messages"
            description={sendPermission === "ADMIN" ? "Only admins (announcement mode)" : "All members"}
            value={sendPermission === "ALL"}
            onChange={(v) => setSendPermission(v ? "ALL" : "ADMIN")}
            disabled={!isOwner}
          />
          <SettingToggle
            label="Approve new members"
            description={joinApproval ? "Admin approval required to join" : "Anyone with the link joins instantly"}
            value={joinApproval}
            onChange={setJoinApproval}
            disabled={!isOwner}
          />
        </div>

        {isOwner && onDelete && (
          <div className="mt-5 pt-4 border-t border-rose-200 dark:border-rose-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
              Danger zone
            </h3>
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full min-h-[44px] rounded-xl font-semibold text-sm border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete Mandali…
              </button>
            ) : (
              <form
                onSubmit={handleDelete}
                className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3.5 space-y-3"
              >
                <div role="alert" className="flex gap-2 text-xs text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    This is permanent and cannot be undone. Every message in “{mandali.name}” is erased and every
                    member is removed from the Mandali. Coins already sent between members are not returned or
                    affected.
                  </p>
                </div>
                <div>
                  <label htmlFor="mandali-delete-confirm" className="block text-xs font-semibold text-rose-900 dark:text-rose-100 mb-1">
                    Type <strong className="font-black">{mandali.handle}</strong> to confirm
                  </label>
                  <input
                    id="mandali-delete-confirm"
                    ref={deleteInputRef}
                    value={typedHandle}
                    onChange={(e) => setTypedHandle(e.target.value)}
                    disabled={isDeleting}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                  />
                </div>
                {deleteError && (
                  <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
                    {deleteError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    disabled={isDeleting}
                    className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Keep Mandali
                  </button>
                  <button
                    type="submit"
                    disabled={!canConfirmDelete || isDeleting}
                    aria-busy={isDeleting}
                    className="flex-1 min-h-[44px] rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                    Delete forever
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {(canEditInfo || isOwner) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 min-h-[44px] rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
