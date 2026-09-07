import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  Download,
  Search,
  Filter,
  FileCode,
  Landmark,
  RefreshCw,
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
import { operationalFetch, OperationalAuthError } from "../../../lib/operationalApi";

/**
 * Real audit trail: `GET /api/admin/audit` merges `settlement_events` (every
 * match settlement/refund/forfeiture state transition) with
 * `coin_ledger_entries` where `entry_type = 'ADMIN_ADJUSTMENT'` (manual
 * operator wallet top-ups) — see `server/src/admin/AuditController.ts`.
 *
 * Dropped rather than faked: feature-flag changes, moderation actions
 * (mutes/bans), and security/HMAC events have no backing table, so unlike
 * the previous `MOCK_AUDIT_LOGS` this never shows a row for them. Likewise
 * `actorName`/`actorRole`/`ipAddress` are gone — nothing upstream records a
 * human name or an IP against these writes, only an identity id (a Supabase
 * `userId`, or the literal `"ops-key"`), so that id is what renders instead
 * of a name that would have to be guessed.
 */

type AuditLogKind = "SETTLEMENT" | "WALLET_ADJUSTMENT";

interface AuditLogEntry {
  id: string;
  timestamp: number;
  kind: AuditLogKind;
  actionCode: string;
  initiatorKind: string;
  initiatorId: string | null;
  resourceId: string;
  detail: string;
  payload: Record<string, unknown>;
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

function kindLabel(kind: AuditLogKind): string {
  return kind === "SETTLEMENT" ? "Settlement" : "Wallet Adjustment";
}

function kindBadgeClass(kind: AuditLogKind): string {
  return kind === "SETTLEMENT"
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
}

export default function AdminAuditLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | AuditLogKind>("all");
  const [activeEntry, setActiveEntry] = useState<AuditLogEntry | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await operationalFetch<{ entries: AuditLogEntry[] }>("/api/admin/audit?limit=100");
      setEntries(res.entries);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allEntries = entries ?? [];
  const settlementCount = allEntries.filter((e) => e.kind === "SETTLEMENT").length;
  const adjustmentCount = allEntries.filter((e) => e.kind === "WALLET_ADJUSTMENT").length;

  const term = search.trim().toLowerCase();
  const filteredEntries = useMemo(
    () =>
      allEntries.filter((e) => {
        const matchesSearch =
          !term ||
          e.actionCode.toLowerCase().includes(term) ||
          e.resourceId.toLowerCase().includes(term) ||
          (e.initiatorId ?? "").toLowerCase().includes(term);
        const matchesKind = kindFilter === "all" || e.kind === kindFilter;
        return matchesSearch && matchesKind;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEntries, term, kindFilter],
  );

  const handleExportCSV = () => {
    setExportNotice("Not available yet — no file was downloaded.");
    setTimeout(() => setExportNotice(null), 3000);
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      kind: "property",
      key: "timestamp",
      header: "Timestamp",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      kind: "property",
      key: "kind",
      header: "Type",
      render: (row) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${kindBadgeClass(row.kind)}`}
        >
          {kindLabel(row.kind)}
        </span>
      ),
    },
    {
      kind: "property",
      key: "actionCode",
      header: "Action",
      render: (row) => (
        <span className="font-mono font-bold text-xs text-[var(--chrome-ink)]">{row.actionCode}</span>
      ),
    },
    {
      kind: "property",
      key: "initiatorId",
      header: "Initiator",
      render: (row) => (
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold uppercase text-[var(--chrome-ink-soft)]">{row.initiatorKind}</span>
          <span className="text-xs font-mono text-[var(--chrome-ink)] truncate max-w-[160px]">
            {row.initiatorId ?? "—"}
          </span>
        </div>
      ),
    },
    {
      kind: "property",
      key: "resourceId",
      header: "Resource",
      render: (row) => <span className="text-xs font-mono text-[var(--chrome-ink-soft)]">{row.resourceId}</span>,
    },
    {
      kind: "property",
      key: "detail",
      header: "Detail",
      render: (row) => (
        <span className="text-xs text-[var(--chrome-ink-soft)] truncate block max-w-[240px]" title={row.detail}>
          {row.detail}
        </span>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      id: "kind",
      label: "Type",
      value: kindFilter,
      options: [
        { label: "All Types", value: "all" },
        { label: "Settlement", value: "SETTLEMENT" },
        { label: "Wallet Adjustment", value: "WALLET_ADJUSTMENT" },
      ],
      onChange: (val) => setKindFilter(val as "all" | AuditLogKind),
    },
  ];

  const isSearchActive = term !== "";
  const isFilterActive = kindFilter !== "all";
  const resetFilters = () => setKindFilter("all");

  const emptyTitle = error
    ? "Audit data unavailable"
    : isSearchActive
      ? "No audit logs found"
      : isFilterActive
        ? "No logs match selected type"
        : "No audit events recorded yet";

  const emptyDesc = error
    ? error
    : isSearchActive
      ? `No audit logs match "${search}". Try a different action code, resource id, or initiator id.`
      : isFilterActive
        ? "No audit events match the active type filter."
        : "Settlement events and wallet adjustments will appear here as they happen.";

  const emptyIcon = isSearchActive ? (
    <Search className="w-6 h-6" />
  ) : isFilterActive ? (
    <Filter className="w-6 h-6" />
  ) : (
    <Shield className="w-6 h-6" />
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

  return (
    <AdminLayout>
      <PageHeader
        title="Security & System Audit Logs"
        description="Real settlement lifecycle events and manual operator wallet adjustments — the two write paths the platform already audits."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Logs" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--chrome-panel)] text-[var(--chrome-ink)] font-bold text-xs border border-[var(--chrome-border)] hover:bg-[var(--chrome-control)] transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          Audit data unavailable: {error}
        </div>
      )}

      {exportNotice && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{exportNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Events Loaded"
          value={entries ? String(allEntries.length) : "—"}
          icon={<Shield className="w-5 h-5 text-amber-500" />}
          subtitle="Most recent, this view"
        />
        <StatCard
          title="Settlement Events"
          value={entries ? String(settlementCount) : "—"}
          icon={<Shield className="w-5 h-5 text-amber-500" />}
          subtitle="Match lifecycle writes"
        />
        <StatCard
          title="Wallet Adjustments"
          value={entries ? String(adjustmentCount) : "—"}
          icon={<Landmark className="w-5 h-5 text-emerald-500" />}
          subtitle="Manual operator top-ups"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by action code, resource id, or initiator..."
          ariaLabel="Search audit logs"
        />
        <FilterBar filters={filters} onReset={resetFilters} />
      </div>

      {isLoading ? (
        <LoadingState variant="table" label="Loading audit data" />
      ) : (
        <DataTable
          columns={columns}
          data={filteredEntries}
          onRowClick={(row) => setActiveEntry(row)}
          getRowAriaLabel={(row) => `Open details for audit event ${row.actionCode}`}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        />
      )}

      <DetailDrawer
        isOpen={Boolean(activeEntry)}
        onClose={() => setActiveEntry(null)}
        title={activeEntry?.actionCode ?? "Audit Event"}
        subtitle={activeEntry ? `Logged ${new Date(activeEntry.timestamp).toLocaleString()}` : undefined}
        badge={
          activeEntry && (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${kindBadgeClass(activeEntry.kind)}`}
            >
              {kindLabel(activeEntry.kind)}
            </span>
          )
        }
      >
        {activeEntry && (
          <div className="space-y-6">
            <InfoCard
              title="Event Metadata"
              fields={[
                { label: "Log ID", value: activeEntry.id, isMono: true },
                { label: "Resource ID", value: activeEntry.resourceId, isMono: true },
                { label: "Initiator Kind", value: activeEntry.initiatorKind },
                { label: "Initiator ID", value: activeEntry.initiatorId ?? "—", isMono: true },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Detail
              </h4>
              <p className="text-xs text-[var(--chrome-ink)] leading-relaxed">{activeEntry.detail}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                  Raw JSON Event Payload
                </h4>
              </div>
              <pre className="p-4 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] text-xs font-mono overflow-x-auto border border-[var(--chrome-border)]">
                {JSON.stringify(activeEntry.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
