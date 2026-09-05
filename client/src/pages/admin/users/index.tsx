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
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Plus,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";
import { operationalFetch, operationalPost } from "../../../lib/operationalApi";
import { useAuthStore } from "../../../store/authStore";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "super_admin" | "admin" | "member";
  status: "active" | "warning" | "inactive" | "critical";
  matchesPlayed: number;
  winRate: string;
  eloRating: number;
  joinedDate: string;
  lastActive: string;
  favoriteGame: string;
  isBanned?: boolean;
  isMuted?: boolean;
  isReal?: boolean;
}

const MOCK_25_USERS: UserRow[] = [
  { id: "u-101", name: "Kethan Kumar", email: "kethan@bhalyam.io", role: "super_admin", status: "active", matchesPlayed: 142, winRate: "68%", eloRating: 1850, joinedDate: "Jan 12, 2026", lastActive: "Just now", favoriteGame: "Word Building" },
  { id: "u-102", name: "Teacher Padma (పద్మ)", email: "padma@bhalyam.io", role: "admin", status: "active", matchesPlayed: 88, winRate: "54%", eloRating: 1620, joinedDate: "Feb 01, 2026", lastActive: "10 mins ago", favoriteGame: "Word Building" },
  { id: "u-103", name: "Venkatasubramanian Ramaswamy Krishnamurthy", email: "v.ramaswamy.krishnamurthy@enterprise.co.in", role: "member", status: "active", matchesPlayed: 45, winRate: "42%", eloRating: 1420, joinedDate: "Feb 14, 2026", lastActive: "2 hrs ago", favoriteGame: "Rummy" },
  { id: "u-104", name: "Sir Krishna", email: "krishna@bhalyam.io", role: "member", status: "warning", matchesPlayed: 19, winRate: "35%", eloRating: 1200, joinedDate: "Feb 18, 2026", lastActive: "1 day ago", favoriteGame: "Dots & Boxes" },
  { id: "u-105", name: "राजेश कुमार Sharma 🎯", email: "rajesh.kumar.sharma@gmail.com", role: "member", status: "active", matchesPlayed: 64, winRate: "58%", eloRating: 1540, joinedDate: "Jan 20, 2026", lastActive: "5 mins ago", favoriteGame: "Ludo" },
  { id: "u-106", name: "Rahul Verma", email: "rahul@verma.net", role: "member", status: "active", matchesPlayed: 92, winRate: "61%", eloRating: 1690, joinedDate: "Jan 15, 2026", lastActive: "1 hr ago", favoriteGame: "Ludo" },
  { id: "u-107", name: "Miss Lakshmi", email: "lakshmi@bhalyam.io", role: "admin", status: "active", matchesPlayed: 110, winRate: "63%", eloRating: 1710, joinedDate: "Jan 08, 2026", lastActive: "3 mins ago", favoriteGame: "UNO" },
  { id: "u-108", name: "Élodie Müller-François 🎮", email: "elodie.mueller@paris-gaming.fr", role: "member", status: "active", matchesPlayed: 34, winRate: "50%", eloRating: 1380, joinedDate: "Feb 05, 2026", lastActive: "4 hrs ago", favoriteGame: "Snakes & Ladders" },
  { id: "u-109", name: "Vikram Malhotra", email: "vikram@outlook.com", role: "member", status: "active", matchesPlayed: 248, winRate: "59%", eloRating: 1720, joinedDate: "Mar 14, 2023", lastActive: "Yesterday", favoriteGame: "Rummy" },
  { id: "u-110", name: "Sneha Reddy", email: "sneha.r@gmail.com", role: "member", status: "active", matchesPlayed: 51, winRate: "47%", eloRating: 1350, joinedDate: "Feb 10, 2026", lastActive: "30 mins ago", favoriteGame: "Word Building" },
  { id: "u-111", name: "Player_4412 (Casual)", email: "player-4412@bhalyam.io", role: "member", status: "inactive", matchesPlayed: 0, winRate: "0%", eloRating: 1000, joinedDate: "Jan 02, 2024", lastActive: "Never", favoriteGame: "Ludo" },
  { id: "u-112", name: "Player_8831 (Dormant)", email: "player-8831@bhalyam.io", role: "member", status: "inactive", matchesPlayed: 2, winRate: "0%", eloRating: 980, joinedDate: "Nov 12, 2025", lastActive: "N/A", favoriteGame: "Dots & Boxes" },
  { id: "u-113", name: "Arjun Das", email: "arjun.das@corp.com", role: "member", status: "active", matchesPlayed: 85, winRate: "55%", eloRating: 1580, joinedDate: "Jan 18, 2026", lastActive: "20 mins ago", favoriteGame: "Word Building" },
  { id: "u-114", name: "Deepak Choudhury", email: "deepak@live.in", role: "member", status: "active", matchesPlayed: 42, winRate: "45%", eloRating: 1310, joinedDate: "Feb 08, 2026", lastActive: "2 days ago", favoriteGame: "Rummy" },
  { id: "u-115", name: "Meera Nair", email: "meera.nair@kerala.org", role: "member", status: "active", matchesPlayed: 97, winRate: "64%", eloRating: 1740, joinedDate: "Jan 10, 2026", lastActive: "15 mins ago", favoriteGame: "Ludo" },
  { id: "u-116", name: "Rohan Kapoor (Suspended)", email: "rohan.k@delhi.in", role: "member", status: "critical", matchesPlayed: 28, winRate: "21%", eloRating: 1110, joinedDate: "Feb 12, 2026", lastActive: "3 months ago", favoriteGame: "UNO", isBanned: true, isMuted: true },
  { id: "u-117", name: "Kavita Rao", email: "kavita.rao@blr.in", role: "member", status: "active", matchesPlayed: 60, winRate: "53%", eloRating: 1470, joinedDate: "Jan 28, 2026", lastActive: "50 mins ago", favoriteGame: "Dots & Boxes" },
  { id: "u-118", name: "Suresh Menon", email: "suresh@menon.com", role: "member", status: "active", matchesPlayed: 39, winRate: "41%", eloRating: 1290, joinedDate: "Feb 11, 2026", lastActive: "Yesterday", favoriteGame: "Snakes & Ladders" },
  { id: "u-119", name: "Divya Balan", email: "divya.balan@chennai.in", role: "member", status: "active", matchesPlayed: 78, winRate: "59%", eloRating: 1610, joinedDate: "Jan 22, 2026", lastActive: "12 mins ago", favoriteGame: "Word Building" },
  { id: "u-120", name: "Manish Tiwari", email: "manish.tiwari@up.in", role: "member", status: "warning", matchesPlayed: 15, winRate: "33%", eloRating: 1150, joinedDate: "Feb 17, 2026", lastActive: "1 day ago", favoriteGame: "Ludo" },
  { id: "u-121", name: "Player_9921 (New Arrival)", email: "player-9921@bhalyam.io", role: "member", status: "active", matchesPlayed: 1, winRate: "100%", eloRating: 1050, joinedDate: "Just now", lastActive: "2 mins ago", favoriteGame: "RPS" },
  { id: "u-122", name: "Aditi Sen", email: "aditi.sen@kolkata.in", role: "member", status: "active", matchesPlayed: 56, winRate: "48%", eloRating: 1390, joinedDate: "Feb 03, 2026", lastActive: "40 mins ago", favoriteGame: "UNO" },
  { id: "u-123", name: "Tanmay Joshi", email: "tanmay.j@pune.in", role: "member", status: "active", matchesPlayed: 81, winRate: "57%", eloRating: 1590, joinedDate: "Jan 19, 2026", lastActive: "25 mins ago", favoriteGame: "Rummy" },
  { id: "u-124", name: "సూర్య ప్రకాష్ (Surya 👑)", email: "surya.prakash@hyderabad.in", role: "member", status: "active", matchesPlayed: 112, winRate: "67%", eloRating: 1795, joinedDate: "Jan 03, 2026", lastActive: "Just now", favoriteGame: "Word Building" },
  { id: "u-125", name: "Swathi Pillai", email: "swathi.pillai@trivandrum.in", role: "member", status: "active", matchesPlayed: 104, winRate: "66%", eloRating: 1780, joinedDate: "Jan 05, 2026", lastActive: "5 mins ago", favoriteGame: "Word Building" },
];

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [mockUsers, setMockUsers] = useState<UserRow[]>(MOCK_25_USERS);
  const [realUsers, setRealUsers] = useState<UserRow[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(true);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState("");

  const currentAuth = useAuthStore((s) => ({
    userId: s.userId,
    email: s.email,
    kind: s.kind,
    isAdmin: s.isAdmin,
    isSuperAdmin: s.isSuperAdmin,
  }));

  // Fetch real users from backend API on mount
  const loadRealUsers = async () => {
    setIsLoadingReal(true);
    try {
      const res = await operationalFetch<{ users: UserRow[]; total: number }>("/api/admin/users");
      if (res?.users && Array.isArray(res.users)) {
        setRealUsers(res.users);
      }
    } catch (err) {
      console.warn("Could not fetch real users from /api/admin/users:", err);
    } finally {
      setIsLoadingReal(false);
    }
  };

  useEffect(() => {
    loadRealUsers();
  }, []);

  // Merge: Real users on top, then mock users below
  const usersList = useMemo(() => {
    const list: UserRow[] = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    // Add real registered users from server first
    for (const r of realUsers) {
      list.push(r);
      seenIds.add(r.id);
      seenEmails.add(r.email.toLowerCase());
    }

    // Append mock preview records
    for (const mock of mockUsers) {
      if (!seenIds.has(mock.id) && !seenEmails.has(mock.email.toLowerCase())) {
        list.push(mock);
      }
    }

    return list;
  }, [realUsers, mockUsers]);

  const pageSize = 10;

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.favoriteGame.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleToggleMute = (user: UserRow) => {
    const updated = { ...user, isMuted: !user.isMuted };
    setRealUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setMockUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isMuted ? "muted" : "unmuted"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3500);
  };

  const handleToggleBan = (user: UserRow) => {
    const updated = { ...user, isBanned: !user.isBanned, status: (!user.isBanned ? "critical" : "active") as UserRow["status"] };
    setRealUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setMockUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isBanned ? "banned" : "unbanned"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3500);
  };

  // Super Admin feature: Promote/demote user roles from the UI
  const handleUpdateUserRole = async (user: UserRow, newRole: "super_admin" | "admin" | "member") => {
    if (user.role === newRole) return;
    setIsUpdatingRole(true);
    try {
      const reason = roleChangeReason.trim() || `Role updated to ${newRole} from Admin Console UI`;
      await operationalPost<{ success: boolean; role: string }>("/api/admin/users/role", {
        userId: user.id,
        role: newRole,
        reason,
      }).catch((err) => {
        console.warn("Backend role update notification:", err);
      });

      const updated = { ...user, role: newRole };
      setRealUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setMockUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
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
              {row.isReal && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black px-1.5 py-0.5 rounded-full border border-emerald-500/30 tracking-wider">
                  REAL ACCOUNT
                </span>
              )}
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
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} size="sm" />,
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
      key: "eloRating",
      header: "ELO Rating",
      align: "right",
      render: (row) => (
        <span className="font-mono font-bold text-amber-500 dark:text-amber-400">
          {row.eloRating}
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
      key: "lastActive",
      header: "Last Active",
      align: "right",
      render: (row) => <span className="text-xs text-[var(--chrome-ink-soft)] font-mono">{row.lastActive}</span>,
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
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Warning", value: "warning" },
        { label: "Critical", value: "critical" },
        { label: "Inactive", value: "inactive" },
      ],
      onChange: setStatusFilter,
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = roleFilter !== "all" || statusFilter !== "all";

  const emptyTitle = usersList.length === 0
    ? "No player accounts registered"
    : isSearchActive
    ? "No search results found"
    : isFilterActive
    ? "No users match selected filters"
    : "No records found";

  const emptyDesc = usersList.length === 0
    ? "There are currently no registered users in the database."
    : isSearchActive
    ? `No users match "${search}". Try searching with a different name or email.`
    : isFilterActive
    ? "No players meet the active role and status filter criteria."
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
      onClick={() => {
        setRoleFilter("all");
        setStatusFilter("all");
      }}
      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Reset Filters
    </button>
  ) : undefined;

  const realCount = usersList.filter((u) => u.isReal).length;

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
              onClick={() => loadRealUsers()}
              disabled={isLoadingReal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Refresh registered users from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReal ? "animate-spin" : ""}`} />
              <span>Refresh Real Users</span>
            </button>
            <button
              type="button"
              aria-disabled="true"
              aria-describedby="invite-moderator-unavailable"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs shadow-xs transition-all opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Moderator</span>
            </button>
          </div>
        }
      />
      <span id="invite-moderator-unavailable" className="sr-only">
        Not available in this preview — this page uses local demonstration data only, and no invitation can be sent.
      </span>

      <MockDataBanner kind="mock" />

      {actionAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{actionAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Registered Accounts"
          value={String(usersList.length)}
          icon={<Users className="w-5 h-5 text-amber-500" />}
          subtitle={realCount > 0 ? `${realCount} real account${realCount > 1 ? "s" : ""} on top` : "Includes mock preview cohort"}
          trend={{ value: 12.3, direction: "up", label: "vs last month" }}
        />
        <StatCard
          title="Active Matchmaking Cohort"
          value={String(usersList.filter((u) => u.status === "active").length)}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtitle="Verified Supabase sessions & active members"
        />
        <StatCard
          title="Administrative Accounts"
          value={String(usersList.filter((u) => u.role === "super_admin" || u.role === "admin").length)}
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
        <FilterBar
          filters={filters}
          onReset={() => {
            setRoleFilter("all");
            setStatusFilter("all");
          }}
        />
      </div>

      {/* Users Data Table */}
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

      {/* User Detail Slide-Over Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.name ?? "User Profile"}
        subtitle={selectedUser?.email}
        badge={selectedUser && <StatusBadge status={selectedUser.status} size="sm" />}
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
            {/* Super Admin Feature: Role Management from UI */}
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
                { label: "Account Type", value: selectedUser.isReal ? "Verified Registered Account" : "Demonstration Preview" },
                { label: "Joined Date", value: selectedUser.joinedDate },
                { label: "Last Session", value: selectedUser.lastActive },
              ]}
            />

            <InfoCard
              title="Multiplayer Career Statistics"
              fields={[
                { label: "Matches Completed", value: selectedUser.matchesPlayed },
                { label: "Win Rate", value: selectedUser.winRate },
                { label: "Current ELO Rating", value: selectedUser.eloRating, isMono: true },
                { label: "Favorite Game Tile", value: selectedUser.favoriteGame },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-2">
                Recent Player Activity Stream
              </h4>
              <ul className="space-y-2 text-xs text-[var(--chrome-ink-soft)]">
                <li className="flex items-center justify-between">
                  <span>Joined Match #{selectedUser.favoriteGame.substring(0, 2).toUpperCase()}-4092</span>
                  <span className="text-[11px] font-mono">10m ago</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Earned +25 ELO Points in {selectedUser.favoriteGame}</span>
                  <span className="text-[11px] font-mono">1h ago</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Created Custom Room with 4 Seats</span>
                  <span className="text-[11px] font-mono">Yesterday</span>
                </li>
              </ul>
            </div>

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
