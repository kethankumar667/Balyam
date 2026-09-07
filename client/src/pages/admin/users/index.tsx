import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  ShieldAlert,
  Crown,
  Ban,
  VolumeX,
  Shield,
  Search,
  Filter,
  Coins,
  RefreshCw,
  Plus,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch, operationalPost, OperationalAuthError } from "../../../lib/operationalApi";
import { formatTimeAgo } from "../../../lib/formatTimeAgo";
import { useAuthStore } from "../../../store/authStore";

/**
 * Real registered accounts (`GET /api/admin/users`, merging Supabase
 * `profiles` with the progression store) plus real per-player gameplay
 * stats (`matchesPlayed`/`winRate`/`rating`/`favoriteGame`) from the same
 * `ProfileService` source the public Leaderboard reads — see
 * `server/src/admin/AdminUsersController.ts`'s own doc comment.
 *
 * Previously this page padded the real list with 25 hand-written mock rows
 * (indistinguishable from real ones — same columns, no marker) and showed
 * a "nothing is saved... sent to a server" banner that was already false
 * for the real user list AND the real role-change action. Both are gone.
 * Mute/Ban stay as clearly-disclosed local-preview toggles — there is no
 * real moderation endpoint behind either yet — and the fabricated "Recent
 * Player Activity Stream" (invented for every user, real or mock) is
 * dropped rather than kept.
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "super_admin" | "admin" | "member";
  matchesPlayed: number;
  winRate: string;
  rating: number;
  joinedAt: number | null;
  lastActiveAt: number | null;
  favoriteGame: string;
  isBanned?: boolean;
  isMuted?: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState("");

  const loadUsers = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await operationalFetch<{ users: UserRow[]; total: number }>("/api/admin/users");
      setUsers(res.users ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const usersList = users ?? [];
  const pageSize = 10;

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.favoriteGame.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleToggleMute = (user: UserRow) => {
    const updated = { ...user, isMuted: !user.isMuted };
    setUsers((prev) => (prev ?? []).map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isMuted ? "muted" : "unmuted"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3500);
  };

  const handleToggleBan = (user: UserRow) => {
    const updated = { ...user, isBanned: !user.isBanned };
    setUsers((prev) => (prev ?? []).map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isBanned ? "banned" : "unbanned"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3500);
  };

  // Super Admin feature: Promote/demote user roles from the UI — real, hits /api/admin/users/role.
  const handleUpdateUserRole = async (user: UserRow, newRole: "super_admin" | "admin" | "member") => {
    if (user.role === newRole) return;
    setIsUpdatingRole(true);
    try {
      const reason = roleChangeReason.trim() || `Role updated to ${newRole} from Admin Console UI`;
      await operationalPost<{ success: boolean; role: string }>("/api/admin/users/role", {
        userId: user.id,
        role: newRole,
        reason,
      });

      const updated = { ...user, role: newRole };
      setUsers((prev) => (prev ?? []).map((u) => (u.id === user.id ? updated : u)));
      setSelectedUser(updated);

      // If modifying current logged-in user, immediately sync authStore in the browser
      const auth = useAuthStore.getState();
      if (
        auth.userId === user.id ||
        (auth.email && auth.email.toLowerCase() === user.email.toLowerCase())
      ) {
        if (newRole === "super_admin") {
          auth.signInSuperAdmin();
        } else if (newRole === "admin") {
          auth.grantAdminAccess({ userId: user.id, email: user.email });
        } else {
          auth.setSuperAdmin(false);
        }
      }

      setActionAlert(
        `✓ Successfully updated ${user.name}'s role to ${newRole === "super_admin" ? "SUPER ADMIN" : newRole.toUpperCase()}!`,
      );
      setRoleChangeReason("");
      setTimeout(() => setActionAlert(null), 4000);
    } catch (err) {
      setActionAlert(`Role update failed: ${errorMessage(err)}`);
      setTimeout(() => setActionAlert(null), 4000);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const columns: Column<UserRow>[] = [
    {
      kind: "property",
      key: "name",
      header: "Player Account",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[var(--chrome-ink)] truncate">{row.name}</span>
              {row.isBanned && <span className="text-[10px] bg-rose-500 text-white font-black px-1.5 py-0.2 rounded-full">BANNED</span>}
              {row.isMuted && <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full">MUTED</span>}
            </div>
            <span className="text-xs text-[var(--chrome-ink-soft)] font-mono truncate">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      kind: "property",
      key: "role",
      header: "Role",
      render: (row) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            row.role === "super_admin"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-2xs border border-amber-600"
              : row.role === "admin"
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]"
          }`}
        >
          {row.role === "super_admin" ? "Super Admin" : row.role.toUpperCase()}
        </span>
      ),
    },
    {
      kind: "property",
      key: "matchesPlayed",
      header: "Matches",
      align: "center",
      render: (row) => <span className="font-bold text-[var(--chrome-ink)]">{row.matchesPlayed}</span>,
    },
    {
      kind: "property",
      key: "rating",
      header: "Rating",
      align: "right",
      render: (row) => (
        <span className="font-mono font-bold text-amber-500 dark:text-amber-400">
          {row.rating}
        </span>
      ),
    },
    {
      kind: "property",
      key: "favoriteGame",
      header: "Favorite",
      render: (row) => <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">{row.favoriteGame}</span>,
    },
    {
      kind: "property",
      key: "lastActiveAt",
      header: "Last Active",
      align: "right",
      render: (row) => (
        <span className="text-xs text-[var(--chrome-ink-soft)] font-mono">
          {row.lastActiveAt === null ? "—" : formatTimeAgo(row.lastActiveAt)}
        </span>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      id: "role",
      label: "Role",
      value: roleFilter,
      options: [
        { label: "All Roles", value: "all" },
        { label: "Super Admin", value: "super_admin" },
        { label: "Admin", value: "admin" },
        { label: "Member", value: "member" },
      ],
      onChange: setRoleFilter,
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = roleFilter !== "all";
  const resetFilters = () => setRoleFilter("all");

  const emptyTitle = error
    ? "User data unavailable"
    : usersList.length === 0
      ? "No player accounts registered"
      : isSearchActive
        ? "No search results found"
        : isFilterActive
          ? "No users match selected filters"
          : "No records found";

  const emptyDesc = error
    ? error
    : usersList.length === 0
      ? "There are currently no registered users in the database."
      : isSearchActive
        ? `No users match "${search}". Try searching with a different name or email.`
        : isFilterActive
          ? "No players meet the active role filter criteria."
          : "There are currently no items matching your criteria.";

  const emptyIcon = isSearchActive ? (
    <Search className="w-6 h-6" />
  ) : isFilterActive ? (
    <Filter className="w-6 h-6" />
  ) : (
    <Users className="w-6 h-6" />
  );

  const emptyAction = isSearchActive ? (
    <button
      type="button"
      onClick={() => setSearch("")}
      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Clear Search
    </button>
  ) : isFilterActive ? (
    <button
      type="button"
      onClick={resetFilters}
      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Reset Filters
    </button>
  ) : undefined;

  const playedCohort = usersList.filter((u) => u.matchesPlayed > 0).length;
  const adminCohort = usersList.filter((u) => u.role === "super_admin" || u.role === "admin").length;

  return (
    <AdminLayout>
      <PageHeader
        title="User Accounts & Moderation"
        description="Inspect registered player profiles, promote Super Admins & Admins, monitor activity, and manage platform members."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadUsers(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              type="button"
              aria-disabled="true"
              aria-describedby="invite-moderator-unavailable"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-black text-xs shadow-xs transition-all opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Moderator</span>
            </button>
          </div>
        }
      />
      <span id="invite-moderator-unavailable" className="sr-only">
        Not available yet — moderator invitations are not implemented, so no invitation can be sent.
      </span>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          User data unavailable: {error}
        </div>
      )}

      {actionAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{actionAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Registered Accounts"
          value={users ? String(usersList.length) : "—"}
          icon={<Users className="w-5 h-5 text-amber-500" />}
          subtitle="Supabase profiles + progression store"
        />
        <StatCard
          title="Played At Least One Match"
          value={users ? String(playedCohort) : "—"}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtitle="Real gameplay stats on record"
        />
        <StatCard
          title="Administrative Accounts"
          value={users ? String(adminCohort) : "—"}
          icon={<ShieldAlert className="w-5 h-5 text-orange-500" />}
          subtitle="Super Admins & Admins with console access"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or favorite game..."
          ariaLabel="Search users"
        />
        <FilterBar filters={filters} onReset={resetFilters} />
      </div>

      {/* Users Data Table */}
      {isLoading ? (
        <LoadingState variant="table" label="Loading user accounts" />
      ) : (
        <DataTable
          columns={columns}
          data={paginatedUsers}
          onRowClick={(row) => setSelectedUser(row)}
          getRowAriaLabel={(row) => `Open details for user ${row.name}`}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            pageSize: pageSize,
            totalItems: filteredUsers.length,
            onPageChange: setPage,
          }}
        />
      )}

      {/* User Detail Slide-Over Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.name ?? "User Profile"}
        subtitle={selectedUser?.email}
        footer={
          selectedUser && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleMute(selectedUser)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedUser.isMuted
                    ? "bg-amber-500 text-zinc-950 border-amber-600 font-black shadow-xs"
                    : "bg-[var(--chrome-control)] text-[var(--chrome-ink)] border-[var(--chrome-border)] hover:bg-[var(--chrome-control-hi)]"
                }`}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{selectedUser.isMuted ? "Unmute Voice/Chat" : "Mute Player"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleBan(selectedUser)}
                className={`px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedUser.isBanned ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{selectedUser.isBanned ? "Lift Ban" : "Ban Account"}</span>
              </button>
            </div>
          )
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Super Admin Feature: Role Management from UI — real, hits /api/admin/users/role */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-2 border-amber-500/40 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Super Admin Role Elevation</span>
                </h4>
                <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-900 dark:text-amber-200 font-extrabold border border-amber-500/30">
                  Current: {selectedUser.role.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
                Super Admins can grant or revoke administrative roles directly from this console. Permissions and console access take effect immediately.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdateUserRole(selectedUser, "super_admin")}
                  disabled={selectedUser.role === "super_admin" || isUpdatingRole}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedUser.role === "super_admin"
                      ? "bg-amber-500 text-zinc-950 opacity-60 cursor-not-allowed shadow-inner"
                      : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 active:scale-95"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateUserRole(selectedUser, "admin")}
                  disabled={selectedUser.role === "admin" || isUpdatingRole}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedUser.role === "admin"
                      ? "bg-emerald-500 text-zinc-950 opacity-60 cursor-not-allowed shadow-inner"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 active:scale-95"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateUserRole(selectedUser, "member")}
                  disabled={selectedUser.role === "member" || isUpdatingRole}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedUser.role === "member"
                      ? "bg-[var(--chrome-control)] text-[var(--chrome-ink)] opacity-60 cursor-not-allowed shadow-inner"
                      : "bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] active:scale-95"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Member</span>
                </button>
              </div>

              <div className="pt-1">
                <label htmlFor="role-change-reason" className="block text-[11px] font-bold text-[var(--chrome-ink-soft)] mb-1">
                  Elevation Reason / Audit Note (Optional)
                </label>
                <input
                  id="role-change-reason"
                  type="text"
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  placeholder="e.g. Approved operator elevation via console"
                  className="w-full h-9 px-3 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <InfoCard
              title="Player Credentials & Account"
              fields={[
                { label: "User ID", value: selectedUser.id, isMono: true },
                { label: "Account Role", value: selectedUser.role === "super_admin" ? "SUPER ADMIN" : selectedUser.role.toUpperCase() },
                { label: "Joined Date", value: formatDate(selectedUser.joinedAt) },
                {
                  label: "Last Session",
                  value: selectedUser.lastActiveAt === null ? "—" : formatTimeAgo(selectedUser.lastActiveAt),
                },
              ]}
            />

            <InfoCard
              title="Multiplayer Career Statistics"
              fields={[
                { label: "Matches Completed", value: selectedUser.matchesPlayed },
                { label: "Win Rate", value: selectedUser.winRate },
                { label: "Competitive Rating", value: selectedUser.rating, isMono: true },
                { label: "Favorite Game", value: selectedUser.favoriteGame },
              ]}
            />

            {/* Player Economy & Coins Top-Up Action */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Player Economy & Coins
                </h4>
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
                Inspect this player's live coin wallet balance, audit transaction ledger history, or manually top up virtual coins.
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate(`/admin/economy?tab=player&identityId=${encodeURIComponent(selectedUser.id)}`)
                }
                className="w-full h-10 mt-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Coins className="w-4 h-4" />
                <span>Top-Up Coins / Investigate Wallet</span>
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
