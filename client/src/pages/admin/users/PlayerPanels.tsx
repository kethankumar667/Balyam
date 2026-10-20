import type { ReactNode } from "react";
import type { AdminUserSummary } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";

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

/** How this identity has played, as recorded: the figures an operator reads first. */
export function PlayerStats({ user }: { user: AdminUserSummary }) {
  return (
    <Panel title="Recorded Statistics">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="Matches">{user.matchesPlayed}</Stat>
        <Stat label="Win rate">{user.winRate || <Unrecorded />}</Stat>
        <Stat label="Rating">{user.rating}</Stat>
        <Stat label="Favorite game">{user.favoriteGame || <Unrecorded />}</Stat>
      </dl>
    </Panel>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3 first:pt-0 last:pb-0">
      <dt className="pt-0.5 text-xs text-[var(--chrome-ink-soft)]">{label}</dt>
      <dd className={`min-w-0 break-words text-[var(--chrome-ink)] ${mono ? "font-mono text-xs leading-5" : "text-sm"}`}>
        {children}
      </dd>
    </div>
  );
}

/** Who this identity is: the fields that name and place it. */
export function PlayerIdentity({ user }: { user: AdminUserSummary }) {
  return (
    <Panel title="Recorded Identity">
      <dl className="divide-y divide-[var(--chrome-hairline)]">
        <Row label="User ID" mono>
          {user.id}
        </Row>
        <Row label="Account">{user.accountKind === "guest" ? "Guest" : "Member"}</Row>
        <Row label="Email">{user.email || <Unrecorded />}</Row>
        <Row label="Joined">{user.joinedAt === null ? <Unrecorded /> : new Date(user.joinedAt).toLocaleDateString()}</Row>
        <Row label="Last active">
          {user.lastActiveAt === null ? <Unrecorded /> : new Date(user.lastActiveAt).toLocaleString()}
        </Row>
      </dl>
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
