import type { AdminUserSummary } from "@shared/adminUsers";

type Role = AdminUserSummary["role"];

const ROLE_STYLES: Record<Role, string> = {
  super_admin: "border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200",
  admin: "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  member: "border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)]",
};

const BADGE = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold";

/** The console role of an identity, as shown on the list and on the player's page. */
export function RoleBadge({ role }: { role: Role }) {
  return <span className={`${BADGE} ${ROLE_STYLES[role]}`}>{role === "super_admin" ? "Super Admin" : role.toUpperCase()}</span>;
}

/** Flags a guest, whose identity is created on first play and expires when idle. Members carry no flag. */
export function GuestBadge() {
  return (
    <span className={`${BADGE} border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)]`}>
      Guest account
    </span>
  );
}
