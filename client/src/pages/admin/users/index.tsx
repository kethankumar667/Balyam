import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  ShieldAlert,
  UserX,
  Plus,
  Ban,
  VolumeX,
  Award,
  Shield,
  Clock,
  Gamepad2,
  Mail,
  Calendar,
  Search,
  Filter,
  Coins,
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

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "moderator" | "member" | "guest";
  status: "active" | "warning" | "inactive" | "critical";
  matchesPlayed: number;
  winRate: string;
  eloRating: number;
  joinedDate: string;
  lastActive: string;
  favoriteGame: string;
  isBanned?: boolean;
  isMuted?: boolean;
}

const MOCK_25_USERS: UserRow[] = [
  { id: "u-101", name: "Kethan Kumar", email: "kethan@bhalyam.io", role: "admin", status: "active", matchesPlayed: 142, winRate: "68%", eloRating: 1850, joinedDate: "Jan 12, 2026", lastActive: "Just now", favoriteGame: "Word Building" },
  { id: "u-102", name: "Teacher Padma (పద్మ)", email: "padma@bhalyam.io", role: "moderator", status: "active", matchesPlayed: 88, winRate: "54%", eloRating: 1620, joinedDate: "Feb 01, 2026", lastActive: "10 mins ago", favoriteGame: "Word Building" },
  { id: "u-103", name: "Venkatasubramanian Ramaswamy Krishnamurthy", email: "v.ramaswamy.krishnamurthy@enterprise.co.in", role: "member", status: "active", matchesPlayed: 45, winRate: "42%", eloRating: 1420, joinedDate: "Feb 14, 2026", lastActive: "2 hrs ago", favoriteGame: "Rummy" },
  { id: "u-104", name: "Sir Krishna", email: "krishna@bhalyam.io", role: "member", status: "warning", matchesPlayed: 19, winRate: "35%", eloRating: 1200, joinedDate: "Feb 18, 2026", lastActive: "1 day ago", favoriteGame: "Dots & Boxes" },
  { id: "u-105", name: "राजेश कुमार Sharma 🎯", email: "rajesh.kumar.sharma@gmail.com", role: "member", status: "active", matchesPlayed: 64, winRate: "58%", eloRating: 1540, joinedDate: "Jan 20, 2026", lastActive: "5 mins ago", favoriteGame: "Ludo" },
  { id: "u-106", name: "Rahul Verma", email: "rahul@verma.net", role: "member", status: "active", matchesPlayed: 92, winRate: "61%", eloRating: 1690, joinedDate: "Jan 15, 2026", lastActive: "1 hr ago", favoriteGame: "Ludo" },
  { id: "u-107", name: "Miss Lakshmi", email: "lakshmi@bhalyam.io", role: "moderator", status: "active", matchesPlayed: 110, winRate: "63%", eloRating: 1710, joinedDate: "Jan 08, 2026", lastActive: "3 mins ago", favoriteGame: "UNO" },
  { id: "u-108", name: "Élodie Müller-François 🎮", email: "elodie.mueller@paris-gaming.fr", role: "member", status: "active", matchesPlayed: 34, winRate: "50%", eloRating: 1380, joinedDate: "Feb 05, 2026", lastActive: "4 hrs ago", favoriteGame: "Snakes & Ladders" },
  { id: "u-109", name: "Vikram Malhotra", email: "vikram@outlook.com", role: "member", status: "active", matchesPlayed: 248, winRate: "59%", eloRating: 1720, joinedDate: "Mar 14, 2023", lastActive: "Yesterday", favoriteGame: "Rummy" },
  { id: "u-110", name: "Sneha Reddy", email: "sneha.r@gmail.com", role: "member", status: "active", matchesPlayed: 51, winRate: "47%", eloRating: 1350, joinedDate: "Feb 10, 2026", lastActive: "30 mins ago", favoriteGame: "Word Building" },
  { id: "u-111", name: "Guest_4412 (Unverified)", email: "guest-4412@temp.mpg", role: "guest", status: "inactive", matchesPlayed: 0, winRate: "0%", eloRating: 1000, joinedDate: "Jan 02, 2024", lastActive: "Never", favoriteGame: "Ludo" },
  { id: "u-112", name: "Guest_8831 (Dormant)", email: "guest-8831@temp.mpg", role: "guest", status: "inactive", matchesPlayed: 2, winRate: "0%", eloRating: 980, joinedDate: "Nov 12, 2025", lastActive: "N/A", favoriteGame: "Dots & Boxes" },
  { id: "u-113", name: "Arjun Das", email: "arjun.das@corp.com", role: "member", status: "active", matchesPlayed: 85, winRate: "55%", eloRating: 1580, joinedDate: "Jan 18, 2026", lastActive: "20 mins ago", favoriteGame: "Word Building" },
  { id: "u-114", name: "Deepak Choudhury", email: "deepak@live.in", role: "member", status: "active", matchesPlayed: 42, winRate: "45%", eloRating: 1310, joinedDate: "Feb 08, 2026", lastActive: "2 days ago", favoriteGame: "Rummy" },
  { id: "u-115", name: "Meera Nair", email: "meera.nair@kerala.org", role: "member", status: "active", matchesPlayed: 97, winRate: "64%", eloRating: 1740, joinedDate: "Jan 10, 2026", lastActive: "15 mins ago", favoriteGame: "Ludo" },
  { id: "u-116", name: "Rohan Kapoor (Suspended)", email: "rohan.k@delhi.in", role: "member", status: "critical", matchesPlayed: 28, winRate: "21%", eloRating: 1110, joinedDate: "Feb 12, 2026", lastActive: "3 months ago", favoriteGame: "UNO", isBanned: true, isMuted: true },
  { id: "u-117", name: "Kavita Rao", email: "kavita.rao@blr.in", role: "member", status: "active", matchesPlayed: 60, winRate: "53%", eloRating: 1470, joinedDate: "Jan 28, 2026", lastActive: "50 mins ago", favoriteGame: "Dots & Boxes" },
  { id: "u-118", name: "Suresh Menon", email: "suresh@menon.com", role: "member", status: "active", matchesPlayed: 39, winRate: "41%", eloRating: 1290, joinedDate: "Feb 11, 2026", lastActive: "Yesterday", favoriteGame: "Snakes & Ladders" },
  { id: "u-119", name: "Divya Balan", email: "divya.balan@chennai.in", role: "member", status: "active", matchesPlayed: 78, winRate: "59%", eloRating: 1610, joinedDate: "Jan 22, 2026", lastActive: "12 mins ago", favoriteGame: "Word Building" },
  { id: "u-120", name: "Manish Tiwari", email: "manish.tiwari@up.in", role: "member", status: "warning", matchesPlayed: 15, winRate: "33%", eloRating: 1150, joinedDate: "Feb 17, 2026", lastActive: "1 day ago", favoriteGame: "Ludo" },
  { id: "u-121", name: "Guest_9921 (New Arrival)", email: "guest-9921@temp.mpg", role: "guest", status: "active", matchesPlayed: 1, winRate: "100%", eloRating: 1050, joinedDate: "Just now", lastActive: "2 mins ago", favoriteGame: "RPS" },
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
  const [usersList, setUsersList] = useState<UserRow[]>(MOCK_25_USERS);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

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
    setUsersList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isMuted ? "muted" : "unmuted"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleToggleBan = (user: UserRow) => {
    const updated = { ...user, isBanned: !user.isBanned, status: (!user.isBanned ? "critical" : "active") as UserRow["status"] };
    setUsersList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name} would be ${updated.isBanned ? "banned" : "unbanned"}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleElevateRole = (user: UserRow) => {
    const nextRole = user.role === "member" ? "moderator" : "member";
    const updated = { ...user, role: nextRole as UserRow["role"] };
    setUsersList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    setSelectedUser(updated);
    setActionAlert(
      `Preview updated locally — ${user.name}'s role would change to ${nextRole}. No changes were sent to the server.`,
    );
    setTimeout(() => setActionAlert(null), 3000);
  };

  const columns: Column<UserRow>[] = [
    {
      kind: "property",
      key: "name",
      header: "Player Account",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center flex-shrink-0">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
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
            row.role === "admin"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-2xs"
              : row.role === "moderator"
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : row.role === "member"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]"
          }`}
        >
          {row.role}
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
        { label: "Admin", value: "admin" },
        { label: "Moderator", value: "moderator" },
        { label: "Member", value: "member" },
        { label: "Guest", value: "guest" },
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

  return (
    <AdminLayout>
      <PageHeader
        title="User Accounts & Moderation"
        description="Inspect registered player profiles, evaluate ELO standings, manage roles, and enforce moderation policies."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
        actions={
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
        }
      />
      <span id="invite-moderator-unavailable" className="sr-only">
        Not available in this preview — this page uses local demonstration data only, and no invitation can be sent.
      </span>

      <MockDataBanner kind="mock" />

      {actionAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {actionAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Registered Accounts"
          value="1,248"
          icon={<Users className="w-5 h-5 text-amber-500" />}
          trend={{ value: 12.3, direction: "up", label: "vs last month" }}
        />
        <StatCard
          title="Active Matchmaking Cohort"
          value="892"
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtitle="Verified Supabase sessions"
        />
        <StatCard
          title="Moderation Actions (24h)"
          value="3 Flags"
          icon={<ShieldAlert className="w-5 h-5 text-orange-500" />}
          subtitle="All reports resolved"
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
                onClick={() => handleElevateRole(selectedUser)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>{selectedUser.role === "member" ? "Promote Moderator" : "Demote to Member"}</span>
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
            <InfoCard
              title="Player Credentials & Account"
              fields={[
                { label: "User ID", value: selectedUser.id, isMono: true },
                { label: "Account Role", value: selectedUser.role.toUpperCase() },
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
