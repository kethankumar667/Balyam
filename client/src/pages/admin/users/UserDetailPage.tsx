import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import type { AdminUserSummary } from "@shared/adminUsers";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import UserInspection from "./UserInspection";
import UserRoleElevation from "./UserRoleElevation";
import { useModerationOutcomeStore } from "./moderationOutcomeStore";

/**
 * The list's query string, handed over by its Inspect link, so Back returns to the same page and
 * filters. Anything that is not a query string is ignored: the state is only a hint.
 */
function listQueryFrom(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("?") ? from : "";
}

function PlayerEconomyCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        <Coins className="w-4 h-4" />
        Player Economy & Coins
      </h4>
      <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
        Inspect this player's live coin wallet balance, audit transaction ledger history, or manually top up virtual coins.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full min-h-[44px] mt-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <Coins className="w-4 h-4" />
        <span>Top-Up Coins / Investigate Wallet</span>
      </button>
    </div>
  );
}

function UserDetailContent({ userId }: { userId: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const outcome = useModerationOutcomeStore((state) => state.outcome);
  const setOutcome = useModerationOutcomeStore((state) => state.setOutcome);

  const backTo = `/admin/users${listQueryFrom(location.state)}`;
  const shownOutcome = outcome?.userId === userId ? outcome : null;

  return (
    <AdminLayout>
      <PageHeader
        title={user?.name ?? "User profile"}
        description={user ? user.email || "No email recorded" : undefined}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: backTo },
          { label: user?.name ?? "Player" },
        ]}
        actions={
          <Link
            to={backTo}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-bold text-xs hover:bg-[var(--chrome-control-hi)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to users</span>
          </Link>
        }
      />

      {shownOutcome && (
        <div
          role={shownOutcome.isError ? "alert" : "status"}
          className="mb-4 p-3 rounded-xl border border-[var(--chrome-border)] text-[var(--chrome-ink)] text-xs font-bold"
        >
          {shownOutcome.message}
        </div>
      )}

      <div className="max-w-3xl">
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
          <PlayerEconomyCard onOpen={() => navigate(`/admin/economy?tab=player&identityId=${encodeURIComponent(userId)}`)} />
        </UserInspection>
      </div>
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
  return <UserDetailContent key={userId} userId={userId} />;
}
