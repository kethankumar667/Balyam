import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import type { AdminUserSummary } from "@shared/adminUsers";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import Panel from "../../../components/admin/panel";
import StatusBadge from "../../../components/admin/status-badge";
import UserInspection from "./UserInspection";
import UserRoleElevation from "./UserRoleElevation";
import { GuestBadge, RoleBadge } from "./UserBadges";
import { maskEmail, PersonalDataProvider, usePersonalData } from "./personalData";
import { useModerationOutcomeStore } from "./moderationOutcomeStore";
import SeatFrame from "../../../components/cosmetics/frames/SeatFrame";

const UNNAMED_PLAYER = "Unnamed player";

/**
 * The list's query string, handed over by its Inspect link, so Back returns to the same page and
 * filters. Anything that is not a query string is ignored: the state is only a hint.
 */
function listQueryFrom(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("?") ? from : "";
}

function Avatar({ name, playerId }: { name: string; playerId: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-lg font-semibold uppercase text-[var(--chrome-ink)] sm:h-14 sm:w-14 sm:text-xl"
    >
      {Array.from(name.trim())[0] ?? "?"}
      <SeatFrame playerId={playerId} />
    </span>
  );
}

function PlayerBadges({ user }: { user: AdminUserSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RoleBadge role={user.role} />
      {user.accountKind === "guest" && <GuestBadge />}
      <StatusBadge status={user.suspension.isSuspended ? "critical" : "healthy"} label={user.suspension.isSuspended ? "Suspended" : "Active"} />
    </div>
  );
}

function WalletPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <Panel title="Wallet" description="Live balance, ledger history and manual top-ups.">
      <button
        type="button"
        onClick={onOpen}
        className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-amber-500 px-4 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <Coins className="h-4 w-4" aria-hidden="true" />
        <span>Top-Up Coins / Investigate Wallet</span>
      </button>
    </Panel>
  );
}

function UserDetailBody({ userId }: { userId: string }) {
  const { isRevealed } = usePersonalData();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const outcome = useModerationOutcomeStore((state) => state.outcome);
  const setOutcome = useModerationOutcomeStore((state) => state.setOutcome);

  const backTo = `/admin/users${listQueryFrom(location.state)}`;
  const shownOutcome = outcome?.userId === userId ? outcome : null;
  // A player who never set a display name is stored under their id; a 36-character id is no page title.
  const displayName = user ? (user.name === user.id ? UNNAMED_PLAYER : user.name) : null;

  return (
    <AdminLayout>
      <PageHeader
        title={displayName ?? "User profile"}
        description={user ? (user.email ? (isRevealed ? user.email : maskEmail(user.email)) : "No email recorded") : undefined}
        leading={displayName ? <Avatar name={displayName} playerId={userId} /> : undefined}
        badge={user ? <PlayerBadges user={user} /> : undefined}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: backTo },
          { label: displayName ?? "Player" },
        ]}
        actions={
          <Link
            to={backTo}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] px-4 py-2 text-sm font-semibold text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control-hi)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to users</span>
          </Link>
        }
      />

      {shownOutcome && (
        <div
          role={shownOutcome.isError ? "alert" : "status"}
          className="mb-6 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] px-4 py-3 text-sm font-medium text-[var(--chrome-ink)]"
        >
          {shownOutcome.message}
        </div>
      )}

      <UserInspection
        userId={userId}
        role={user?.role ?? "member"}
        onUpdate={setUser}
        onOutcome={(result) => setOutcome(result && { ...result, userId })}
      >
        {user && (
          <UserRoleElevation
            userId={userId}
            name={user.name}
            email={user.email}
            role={user.role}
            onRoleChanged={(role) => setUser((current) => (current ? { ...current, role } : current))}
          />
        )}
        <WalletPanel onOpen={() => navigate(`/admin/economy?tab=player&identityId=${encodeURIComponent(userId)}`)} />
      </UserInspection>
    </AdminLayout>
  );
}

/**
 * One player, on a page of their own: `/admin/users/:userId`.
 *
 * It replaces the drawer that opened over the Users list. A page can be opened in a new tab, shared,
 * refreshed and left with Back; the drawer could do none of that, and it was a cramped place to read a
 * record. The content is keyed by the id so that moving from one player to another starts from nothing:
 * a response still in flight for the previous player has nowhere to land.
 */
export default function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  return (
    <PersonalDataProvider key={userId} userId={userId}>
      <UserDetailBody userId={userId} />
    </PersonalDataProvider>
  );
}
