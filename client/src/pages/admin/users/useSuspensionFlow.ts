import { useEffect, useRef, useState } from "react";
import type { AdminSuspensionRequest, AdminSuspensionResponse, AdminUserSummary } from "@shared/adminUsers";
import { operationalPost } from "../../../lib/operationalApi";
import { useAuthStore } from "../../../store/authStore";
import { errorMessage } from "./errorMessage";
import type { ModerationOutcome } from "./UserInspection";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;
// Control characters have no place in an audit reason that is stored and shown back.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

interface SuspensionFlowOptions {
  userId: string;
  /** The identity as last loaded; absent until the details arrive. */
  user: AdminUserSummary | undefined;
  /** The role the page currently shows for this identity. */
  role: AdminUserSummary["role"];
  onUpdate: (user: AdminUserSummary) => void;
  onOutcome: (outcome: ModerationOutcome | null) => void;
  /** Called with the updated identity while the page is still open, to refresh what it shows. */
  onSaved: (user: AdminUserSummary) => void;
  reload: () => void;
}

/**
 * The suspend / resume flow for one identity: ask for a reason, confirm, send, report.
 *
 * A request can still be in flight when the operator leaves the page. The result is therefore always
 * handed to `onUpdate` and `onOutcome`, which outlive the page; only the on-screen state (the form,
 * the busy flag) is skipped once the page has gone.
 */
export function useSuspensionFlow({ userId, user, role, onUpdate, onOutcome, onSaved, reload }: SuspensionFlowOptions) {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const operatorId = useAuthStore((state) => state.userId);
  const operatorEmail = useAuthStore((state) => state.email);
  const [confirmation, setConfirmation] = useState<AdminSuspensionRequest["action"] | null>(null);
  const [reason, setReason] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const updateRef = useRef(onUpdate);
  const outcomeRef = useRef(onOutcome);
  const savedRef = useRef(onSaved);

  useEffect(() => {
    updateRef.current = onUpdate;
    outcomeRef.current = onOutcome;
    savedRef.current = onSaved;
  }, [onUpdate, onOutcome, onSaved]);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (confirmation) reasonRef.current?.focus();
  }, [confirmation]);

  const trimmedReason = reason.trim();
  const isReasonValid =
    trimmedReason.length >= MIN_REASON_LENGTH && trimmedReason.length <= MAX_REASON_LENGTH && !CONTROL_CHARACTERS.test(reason);
  const isProtected =
    userId === operatorId ||
    (Boolean(operatorEmail && user?.email) && operatorEmail?.toLowerCase() === user?.email.toLowerCase()) ||
    role === "super_admin" ||
    user?.role === "super_admin";
  const canSuspend = isSuperAdmin && !isProtected;

  const begin = () => {
    if (!user) return;
    setReason("");
    setConfirmation(user.suspension.isSuspended ? "resume" : "suspend");
  };

  const cancel = () => {
    if (busyRef.current) return;
    setConfirmation(null);
    setActionError(null);
    requestAnimationFrame(() => actionRef.current?.focus());
  };

  const submit = async () => {
    if (!confirmation || !isReasonValid || !user || !canSuspend || busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    setActionError(null);
    outcomeRef.current(null);
    const action = confirmation;
    const request: AdminSuspensionRequest = { action, reason: trimmedReason, expectedRevision: user.suspension.revision };
    try {
      const response = await operationalPost<AdminSuspensionResponse>(`/api/admin/users/${encodeURIComponent(userId)}/suspension`, request);
      if (!response.suspension || !Number.isInteger(response.suspension.revision)) {
        throw new Error("Invalid suspension response. Reload details before retrying.");
      }
      const updated = { ...user, role, suspension: response.suspension };
      updateRef.current(updated);
      outcomeRef.current({ message: action === "suspend" ? "Identity suspended." : "Identity resumed.", isError: false });
      if (!activeRef.current) return;
      savedRef.current(updated);
      setConfirmation(null);
      setReason("");
      reload();
    } catch (failure) {
      outcomeRef.current({ message: `Suspension update failed: ${errorMessage(failure)}`, isError: true });
      if (activeRef.current) setActionError(errorMessage(failure));
    } finally {
      busyRef.current = false;
      if (activeRef.current) setIsBusy(false);
    }
  };

  return {
    confirmation,
    reason,
    setReason,
    isReasonValid,
    isBusy,
    actionError,
    isProtected,
    canSuspend,
    reasonRef,
    actionRef,
    begin,
    cancel,
    submit,
    minReasonLength: MIN_REASON_LENGTH,
    maxReasonLength: MAX_REASON_LENGTH,
  };
}

export type SuspensionFlow = ReturnType<typeof useSuspensionFlow>;
