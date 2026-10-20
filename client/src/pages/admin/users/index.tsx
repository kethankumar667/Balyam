import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { AdminUserSummary, AdminUsersResponse } from "@shared/adminUsers";
import ThemedSelect from "../../../components/ThemedSelect";
import {
  Users,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch } from "../../../lib/operationalApi";
import { formatTimeAgo } from "../../../lib/formatTimeAgo";
import { errorMessage } from "./errorMessage";
import { useModerationOutcomeStore } from "./moderationOutcomeStore";

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
  accountKind?: AdminUserSummary["accountKind"];
  suspension?: AdminUserSummary["suspension"];
  isBanned?: boolean;
  isMuted?: boolean;
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const KIND_VALUES = ["member", "guest"] as const;
const ROLE_VALUES = ["super_admin", "admin", "member"] as const;

function readPage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** One of the values the list knows, or "all" for anything else a hand-edited address might carry. */
function readChoice(raw: string | null, allowed: readonly string[]): string {
  return allowed.find((value) => value === raw) ?? "all";
}

/** What a control changed. Anything other than a page move starts the list again from page 1. */
interface ListQueryPatch {
  page?: number;
  kind?: string;
  role?: string;
  q?: string;
}

export default function AdminUsersPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [directory, setDirectory] = useState<AdminUsersResponse | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const moderationOutcome = useModerationOutcomeStore((state) => state.outcome);
  const setModerationOutcome = useModerationOutcomeStore((state) => state.setOutcome);

  // The page, search and filters live in the address, so Back from a player's page returns to the
  // same view, and a view can be linked to.
  const page = readPage(params.get("page"));
  const kindFilter = readChoice(params.get("kind"), KIND_VALUES);
  const roleFilter = readChoice(params.get("role"), ROLE_VALUES);
  const urlSearch = (params.get("q") ?? "").trim();

  const updateList = useCallback(
    (patch: ListQueryPatch) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const write = (key: string, value: string, isDefault: boolean) => {
            if (isDefault) next.delete(key);
            else next.set(key, value);
          };
          if (patch.kind !== undefined) write("kind", patch.kind, patch.kind === "all");
          if (patch.role !== undefined) write("role", patch.role, patch.role === "all");
          if (patch.q !== undefined) write("q", patch.q, patch.q === "");
          const nextPage = patch.page ?? 1;
          write("page", String(nextPage), nextPage === 1);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // A result reported here is shown once: it is cleared when the operator leaves the list.
  useEffect(() => () => useModerationOutcomeStore.getState().setOutcome(null), []);

  // The search box follows the address when it changes underneath it (Back, Forward, a pasted link).
  useEffect(() => {
    setSearch((current) => (current.trim() === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = search.trim();
      if (typed !== urlSearch) updateList({ q: typed });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, urlSearch, updateList]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    if (search.trim() !== urlSearch) return () => { active = false; };
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search: urlSearch, kind: kindFilter, role: roleFilter });
    void operationalFetch<AdminUsersResponse>(`/api/admin/users?${query}`).then((response) => {
      if (!Array.isArray(response.users) || !Number.isFinite(response.total) || !response.page || !response.pageSize) throw new Error("Invalid user directory response.");
      if (active) {
        setDirectory(response);
        setUsers(response.users);
      }
    }).catch((err: unknown) => {
      if (active) { setError(errorMessage(err)); setUsers(null); setDirectory(null); }
    }).finally(() => {
      if (active) { setIsLoading(false); setIsRefreshing(false); }
    });
    return () => { active = false; };
  }, [page, urlSearch, kindFilter, roleFilter, refreshKey, search]);

  const usersList = users ?? [];
  const pageSize = directory?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.ceil((directory?.total ?? 0) / pageSize);

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
              <span className="text-xs text-[var(--chrome-ink-soft)]">{row.accountKind === "guest" ? "Guest" : "Member"}</span>
              {row.suspension?.isSuspended && <span className="text-xs text-rose-600 dark:text-rose-400">Suspended</span>}
            </div>
            <span className="text-xs text-[var(--chrome-ink-soft)] font-mono truncate">{row.email || "Not recorded"}</span>
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
    {
      kind: "computed", key: "inspect", header: "Inspect",
      // A real link to the player's own page: it can be opened in a new tab, shared, and left with Back.
      // The list's query string rides along so "Back to users" returns to the same page and filters.
      render: (row) => (
        <Link
          to={`/admin/users/${encodeURIComponent(row.id)}`}
          state={{ from: location.search }}
          aria-label={`Inspect ${row.name}`}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Inspect
        </Link>
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
      onChange: (value) => updateList({ role: value }),
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = roleFilter !== "all" || kindFilter !== "all";
  const resetFilters = () => updateList({ kind: "all", role: "all" });

  const emptyTitle = error
    ? "User data unavailable"
    : isSearchActive
        ? "No search results found"
        : isFilterActive
          ? "No users match selected filters"
          : "No player identities found";

  const emptyDesc = error
    ? error
    : isSearchActive
        ? `No users match "${search}". Try searching with a different name or email.`
        : isFilterActive
          ? "No players meet the active role filter criteria."
          : "No recorded identities match this directory request.";

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
        description="Members and created guests"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setIsRefreshing(true); setRefreshKey((value) => value + 1); }}
              disabled={isRefreshing}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
        <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          User data unavailable: {error}
        </div>
      )}

      {moderationOutcome && (
        <div
          role={moderationOutcome.isError ? "alert" : "status"}
          className="mb-4 p-3 rounded-xl border border-[var(--chrome-border)] text-[var(--chrome-ink)] text-xs font-bold flex items-center justify-between gap-3"
        >
          <span>{moderationOutcome.message}</span>
          <button
            type="button"
            onClick={() => setModerationOutcome(null)}
            aria-label="Dismiss message"
            className="shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Matching Identities"
          value={directory ? String(directory.total) : "—"}
          icon={<Users className="w-5 h-5 text-amber-500" />}
          subtitle="Members and created guests"
        />
        <StatCard
          title="Played On This Page"
          value={users ? String(playedCohort) : "—"}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtitle="Real gameplay stats on record"
        />
        <StatCard
          title="Administrators On This Page"
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
        <FilterBar onReset={resetFilters} activeCount={Number(roleFilter !== "all") + Number(kindFilter !== "all")}>
          <ThemedSelect ariaLabel="Identity kind" variant="inline" value={kindFilter} options={[{ label: "All identities", value: "all" }, { label: "Members", value: "member" }, { label: "Guests", value: "guest" }]} onChange={(value) => updateList({ kind: value })} />
          <ThemedSelect ariaLabel="Filter by Role" variant="inline" value={roleFilter} options={filters[0].options} onChange={filters[0].onChange} />
        </FilterBar>
      </div>

      {/* Users Data Table */}
      {isLoading ? (
        <LoadingState variant="table" label="Loading user accounts" />
      ) : (
        <DataTable
          columns={columns}
          data={usersList}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
          pagination={{
            currentPage: directory?.page ?? page,
            totalPages: totalPages || 1,
            pageSize: pageSize,
            totalItems: directory?.total ?? 0,
            onPageChange: (next) => updateList({ page: next }),
          }}
        />
      )}
    </AdminLayout>
  );
}
