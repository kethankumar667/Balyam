import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdminUserSummary } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";
import CopyButton from "./CopyButton";
import { maskEmail, usePersonalData } from "./personalData";

const NOT_RECORDED = "Not recorded";

function Unrecorded() {
  return <span className="text-sm font-medium text-[var(--chrome-ink-soft)]">{NOT_RECORDED}</span>;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--chrome-ink-soft)]">{label}</dt>
      <dd className="mt-1 break-words text-xl font-semibold tabular-nums text-[var(--chrome-ink)]">{children}</dd>
    </div>
  );
}

/** Figures read from sections the page already holds; absent when that section has none. */
export interface PlayerStatsExtras {
  balance?: number;
  level?: number;
}

/** How this identity has played, as recorded: the figures an operator reads first. */
export function PlayerStats({ user, extras = {} }: { user: AdminUserSummary; extras?: PlayerStatsExtras }) {
  return (
    <Panel title="Recorded Statistics">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <Stat label="Matches">{user.matchesPlayed}</Stat>
        <Stat label="Win rate">{user.winRate || <Unrecorded />}</Stat>
        <Stat label="Rating">{user.rating}</Stat>
        <Stat label="Favorite game">{user.favoriteGame || <Unrecorded />}</Stat>
        {extras.level !== undefined && <Stat label="Level">{extras.level.toLocaleString()}</Stat>}
        {extras.balance !== undefined && <Stat label="Wallet balance">{extras.balance.toLocaleString()}</Stat>}
      </dl>
    </Panel>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="pt-0.5 text-xs text-[var(--chrome-ink-soft)]">{label}</dt>
      <dd className={`min-w-0 break-words text-[var(--chrome-ink)] ${mono ? "font-mono text-xs leading-5" : "text-sm"}`}>
        {children}
      </dd>
    </div>
  );
}

/** The one control that shows or hides this page's personal data (see `personalData.tsx`). */
function PersonalDataToggle() {
  const { isRevealed, isRevealing, reveal, hide } = usePersonalData();
  const Icon = isRevealed ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-pressed={isRevealed}
      disabled={isRevealing}
      onClick={isRevealed ? hide : reveal}
      className="min-h-[44px] inline-flex items-center gap-2 rounded-lg border border-[var(--chrome-border)] px-3 text-xs font-semibold text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
    >
      <Icon size={14} aria-hidden="true" />
      {isRevealed ? "Hide personal data" : "Show personal data"}
    </button>
  );
}

/** Who this identity is: the fields that name and place it. */
export function PlayerIdentity({ user }: { user: AdminUserSummary }) {
  const { isRevealed, error } = usePersonalData();
  return (
    <Panel title="Recorded Identity" actions={<PersonalDataToggle />}>
      <dl className="divide-y divide-[var(--chrome-hairline)]">
        <Row label="User ID" mono>
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 break-all">{user.id}</span>
            <CopyButton value={user.id} label="Copy user ID" />
          </span>
        </Row>
        <Row label="Account">{user.accountKind === "guest" ? "Guest" : "Member"}</Row>
        <Row label="Email">{user.email ? (isRevealed ? user.email : maskEmail(user.email)) : <Unrecorded />}</Row>
        <Row label="Joined">{user.joinedAt === null ? <Unrecorded /> : new Date(user.joinedAt).toLocaleDateString()}</Row>
        <Row label="Last active">
          {user.lastActiveAt === null ? <Unrecorded /> : new Date(user.lastActiveAt).toLocaleString()}
        </Row>
      </dl>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </Panel>
  );
}

/** What the data below does and does not cover, as the server reports it. */
export function CoveragePanel({ notes }: { notes: string[] }) {
  return (
    <Panel title="Data coverage">
      {notes.length ? (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--chrome-ink)]">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--chrome-ink-soft)]">No additional coverage information supplied.</p>
      )}
    </Panel>
  );
}
