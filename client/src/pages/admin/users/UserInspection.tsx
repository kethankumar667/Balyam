import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminRecordSection, AdminSuspensionRequest, AdminSuspensionResponse, AdminUserDetails, AdminUserSummary } from "@shared/adminUsers";
import { Ban, Check, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import InfoCard from "../../../components/admin/info-card";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch, operationalPost } from "../../../lib/operationalApi";
import { useAuthStore } from "../../../store/authStore";

const CONTROL = "min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 px-3 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function recordedValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function RecordSection({ userId, initial }: { userId: string; initial: AdminRecordSection }) {
  const [section, setSection] = useState(initial);
  const [page, setPage] = useState(initial.page);
  const [retry, setRetry] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (page === initial.page && retry === 0) {
      setSection(initial);
      setError(null);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    void operationalFetch<AdminRecordSection>(`/api/admin/users/${encodeURIComponent(userId)}/records/${encodeURIComponent(initial.key)}?page=${page}&pageSize=20`).then((response) => {
      if (!Array.isArray(response.records) || response.key !== initial.key) throw new Error("Invalid recorded section response.");
      if (active) setSection(response);
    }).catch((failure: unknown) => { if (active) setError(message(failure)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId, initial, page, retry]);

  return (
    <section className="space-y-3 border-t border-[var(--chrome-border)] pt-4" aria-label={`${initial.title} records`} aria-busy={isLoading}>
      <h3 className="text-sm font-bold">{initial.title}</h3>
      {isLoading ? <LoadingState label={`Loading ${initial.title} records`} /> : error ? (
        <div role="alert"><p>{error}</p><button type="button" className={CONTROL} onClick={() => setRetry((value) => value + 1)}>Retry records</button></div>
      ) : section.unavailable ? <p role="status" className="text-sm text-[var(--chrome-ink-soft)]">{section.unavailable}</p> : section.records.length === 0 ? (
        <p className="text-sm text-[var(--chrome-ink-soft)]">No retained records in this section.</p>
      ) : section.records.map((record, index) => (
        <dl key={`${section.page}-${index}`} className="border-b border-[var(--chrome-border)] pb-3 space-y-2 text-sm">
          {Object.entries(record).map(([field, value]) => (
            <div key={field} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-1 sm:gap-3">
              <dt className="text-[var(--chrome-ink-soft)] break-words">{field.replace(/_/g, " ")}</dt>
              <dd className="min-w-0 break-words">{typeof value === "object" && value !== null ? <pre className="whitespace-pre-wrap break-all font-mono text-xs max-h-64 overflow-auto">{recordedValue(value)}</pre> : recordedValue(value)}</dd>
            </div>
          ))}
        </dl>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={CONTROL} aria-label={`Previous ${initial.title} records`} disabled={isLoading || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span role="status" className="text-xs">Page {page}{section.total === null ? " - retained records" : ` - ${section.total} recorded`}</span>
        <button type="button" className={CONTROL} aria-label={`Next ${initial.title} records`} disabled={isLoading || Boolean(error) || Boolean(section.unavailable) || !section.hasMore} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </section>
  );
}

export type ModerationOutcome = { message: string; isError: boolean };

type InspectionProps = {
  userId: string;
  role: AdminUserSummary["role"];
  onUpdate: (user: AdminUserSummary) => void;
  onOutcome: (outcome: ModerationOutcome | null) => void;
  children: ReactNode;
};

export default function UserInspection({ userId, role, onUpdate, onOutcome, children }: InspectionProps) {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const operatorId = useAuthStore((state) => state.userId);
  const operatorEmail = useAuthStore((state) => state.email);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
  useEffect(() => { updateRef.current = onUpdate; outcomeRef.current = onOutcome; }, [onUpdate, onOutcome]);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void operationalFetch<AdminUserDetails>(`/api/admin/users/${encodeURIComponent(userId)}`).then((response) => {
      if (response.user?.id !== userId || !Array.isArray(response.sections) || !Array.isArray(response.coverage)) throw new Error("Invalid user details response.");
      if (active) { setDetails(response); updateRef.current(response.user); }
    }).catch((failure: unknown) => { if (active) { setError(message(failure)); setDetails(null); } })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId, reload]);
  useEffect(() => {
    if (confirmation) reasonRef.current?.focus();
  }, [confirmation]);

  const user = details?.user;
  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= MIN_REASON_LENGTH && trimmedReason.length <= MAX_REASON_LENGTH && !/[\u0000-\u001f\u007f]/.test(reason);
  const isProtected = userId === operatorId || (Boolean(operatorEmail && user?.email) && operatorEmail?.toLowerCase() === user?.email.toLowerCase()) || role === "super_admin" || user?.role === "super_admin";
  const canSuspend = isSuperAdmin && !isProtected;
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
      if (!response.suspension || !Number.isInteger(response.suspension.revision)) throw new Error("Invalid suspension response. Reload details before retrying.");
      const updated = { ...user, role, suspension: response.suspension };
      updateRef.current(updated);
      outcomeRef.current({ message: action === "suspend" ? "Identity suspended." : "Identity resumed.", isError: false });
      if (!activeRef.current) return;
      setDetails((current) => current ? { ...current, user: updated } : current);
      setConfirmation(null);
      setReason("");
      setReload((value) => value + 1);
    } catch (failure) {
      outcomeRef.current({ message: `Suspension update failed: ${message(failure)}`, isError: true });
      if (activeRef.current) setActionError(message(failure));
    } finally {
      busyRef.current = false;
      if (activeRef.current) setIsBusy(false);
    }
  };

  if (confirmation && user) return (
    <form className="space-y-4" aria-busy={isBusy} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h3 className="text-base font-bold">{confirmation === "suspend" ? "Confirm suspension" : "Confirm resumption"}</h3>
      <p className="text-sm">{confirmation === "suspend" ? "Suspend" : "Resume"} {user.name} ({user.id})? Recorded data and moderation evidence will be preserved.</p>
      <label className="block text-sm font-bold" htmlFor="suspension-reason">Suspension reason</label>
      <textarea ref={reasonRef} id="suspension-reason" required aria-required="true" minLength={MIN_REASON_LENGTH} maxLength={MAX_REASON_LENGTH} disabled={isBusy} value={reason} onChange={(event) => setReason(event.target.value)} aria-describedby={actionError ? "suspension-error" : undefined} className="min-h-[88px] w-full p-3 rounded-lg bg-[var(--chrome-control)] border border-[var(--chrome-border)] focus-visible:ring-2 focus-visible:ring-amber-500" />
      {actionError && <p id="suspension-error" role="alert">{actionError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={CONTROL} disabled={isBusy} onClick={cancel}>Cancel</button>
        <button type="submit" className={CONTROL} disabled={isBusy || !isReasonValid}><Check size={16} aria-hidden="true" />{isBusy ? "Saving..." : confirmation === "suspend" ? "Confirm suspension" : "Confirm resumption"}</button>
        {actionError && <button type="button" className={CONTROL} disabled={isBusy} onClick={() => { cancel(); setReload((value) => value + 1); }}>Reload details</button>}
      </div>
    </form>
  );

  return (
    <div className="space-y-5">
      {isLoading ? <LoadingState label="Loading recorded identity data" /> : error ? (
        <div role="alert"><p>User details unavailable: {error}</p><button type="button" className={CONTROL} onClick={() => setReload((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />Retry details</button></div>
      ) : user && details ? <>
        <InfoCard title="Recorded Identity" fields={[
          { label: "User ID", value: user.id, isMono: true },
          { label: "Identity kind", value: user.accountKind === "guest" ? "Guest" : "Member" },
          { label: "Email", value: user.email || "Not recorded" },
          { label: "Status", value: user.suspension.isSuspended ? "Suspended" : "Active" },
          { label: "Suspension reason", value: user.suspension.reason || "Not recorded" },
          { label: "Joined", value: user.joinedAt === null ? "Not recorded" : new Date(user.joinedAt).toLocaleDateString() },
          { label: "Last active", value: user.lastActiveAt === null ? "Not recorded" : new Date(user.lastActiveAt).toLocaleString() },
        ]} />
        <InfoCard title="Recorded Statistics" fields={[
          { label: "Matches", value: user.matchesPlayed }, { label: "Win rate", value: user.winRate || "Not recorded" },
          { label: "Rating", value: user.rating }, { label: "Favorite game", value: user.favoriteGame || "Not recorded" },
        ]} />
        <section aria-label="Data coverage" className="space-y-2 text-sm">
          <h3 className="font-bold">Data coverage</h3>
          {details.coverage.length ? <ul className="list-disc pl-5 space-y-1">{details.coverage.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p>No additional coverage information supplied.</p>}
        </section>
        {canSuspend ? <button ref={actionRef} type="button" className={CONTROL} onClick={() => { setReason(""); setConfirmation(user.suspension.isSuspended ? "resume" : "suspend"); }}><Ban size={16} aria-hidden="true" />{user.suspension.isSuspended ? "Resume identity" : "Suspend identity"}</button> : <p className="text-sm text-[var(--chrome-ink-soft)]">{isProtected ? "This identity is protected from suspension." : "Suspension requires superadmin access."}</p>}
        {details.sections.length ? details.sections.map((section) => <RecordSection key={`${reload}-${section.key}`} userId={userId} initial={section} />) : <p className="text-sm text-[var(--chrome-ink-soft)]">No record sections supplied.</p>}
        {children}
      </> : null}
    </div>
  );
}