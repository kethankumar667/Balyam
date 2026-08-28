import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import SearchBar from "../../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../../components/admin/filter-bar";
import StatusBadge from "../../../../components/admin/status-badge";
import DataTable, { type Column } from "../../../../components/admin/data-table";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import ConservationBadge from "./ConservationBadge";
import type { MatchEconomySettlementRecord } from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

interface SettlementMonitorTabProps {
  settlements: MatchEconomySettlementRecord[];
  isLoading: boolean;
  onSelectMatch: (matchId: string) => void;
}

export function SettlementMonitorTab({
  settlements,
  isLoading,
  onSelectMatch,
}: SettlementMonitorTabProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter & Search Logic
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      // Status filter
      if (selectedStatus !== "ALL" && s.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchIdMatches = s.matchId.toLowerCase().includes(q);
        const roomCodeMatches = s.roomCode ? s.roomCode.toLowerCase().includes(q) : false;
        const hostMatches = s.hostIdentityId ? s.hostIdentityId.toLowerCase().includes(q) : false;
        if (!matchIdMatches && !roomCodeMatches && !hostMatches) {
          return false;
        }
      }

      return true;
    });
  }, [settlements, selectedStatus, searchQuery]);

  // Sort Logic
  const sortedSettlements = useMemo(() => {
    const list = [...filteredSettlements];
    if (sortBy === "newest") {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === "oldest") {
      list.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === "amount_desc") {
      list.sort((a, b) => BigInt(b.totalCollected) > BigInt(a.totalCollected) ? 1 : -1);
    } else if (sortBy === "amount_asc") {
      list.sort((a, b) => BigInt(a.totalCollected) > BigInt(b.totalCollected) ? 1 : -1);
    }
    return list;
  }, [filteredSettlements, sortBy]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sortedSettlements.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSettlements.slice(start, start + pageSize);
  }, [sortedSettlements, currentPage, pageSize]);

  const filterConfig: FilterOption[] = [
    {
      id: "status",
      label: "Status",
      value: selectedStatus,
      options: [
        { label: "All Statuses", value: "ALL" },
        { label: "Settled", value: "SETTLED" },
        { label: "Refunded", value: "REFUNDED" },
        { label: "Committed", value: "COMMITTED" },
        { label: "Forfeited", value: "ABANDONMENT_FORFEITED" },
      ],
      onChange: (val: string) => {
        setSelectedStatus(val);
        setCurrentPage(1);
      },
    },
  ];

  const columns: Column<MatchEconomySettlementRecord>[] = [
    {
      key: "matchId",
      header: "Match ID & Room",
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-xs text-[var(--chrome-ink)] block">
            {item.matchId}
          </span>
          <span className="text-[11px] text-[var(--chrome-ink-soft)] font-mono">
            Room {item.roomCode || "—"} • Host: {item.hostIdentityId?.slice(0, 12)}...
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={
            item.status === "SETTLED"
              ? "healthy"
              : item.status === "REFUNDED"
              ? "completed"
              : item.status === "COMMITTED"
              ? "warning"
              : "critical"
          }
          label={item.status}
          size="sm"
        />
      ),
    },
    {
      key: "seats",
      header: "Seat Config",
      render: (item) => (
        <div className="text-xs">
          <span className="font-bold text-[var(--chrome-ink)] block">{item.seatCount} Seats</span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">
            {item.humanSeatCount} Human / {item.botSeatCount} Bot
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Total Collected",
      align: "right",
      render: (item) => (
        <div className="text-right">
          <CoinAmount amount={item.totalCollected} size="sm" className="font-bold text-[var(--chrome-ink)]" />
          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono block">
            @{item.costPerSeat} 🪙/seat
          </span>
        </div>
      ),
    },
    {
      key: "conservation",
      header: "Conservation",
      render: (item) => (
        // Not actually verified here — this list has no per-row
        // reconciliation data (that requires a separate call per match,
        // via `reconcileMatchSettlement`, made only in Match Audit).
        // "UNAUDITED" is the honest label until that call is made, not an
        // assumed pass just because the terminal status looks final.
        <ConservationBadge isConserved={null} size="sm" />
      ),
    },
    {
      key: "createdAt",
      header: "Created / Settled",
      align: "right",
      render: (item) => (
        <div className="text-right text-[11px] font-mono text-[var(--chrome-ink-soft)]">
          <span className="block text-[var(--chrome-ink)] font-medium">{formatTimeAgo(item.createdAt)}</span>
          <span className="text-[10px] opacity-75">
            {item.settledAt ? `Settled ${formatTimeAgo(item.settledAt)}` : "In Progress"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Status Filter, Sort */}
      <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            placeholder="Search by match ID, room code, or host..."
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filterConfig} />

          <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--chrome-ink-soft)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              aria-label="Sort match settlements"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Settlement Data Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        loading={isLoading}
        emptyMessage="No Match Settlements Found"
        emptyDescription="No match settlements matched the specified filters or search query."
        onRowClick={(item) => onSelectMatch(item.matchId)}
        getRowAriaLabel={(item) =>
          `Inspect settlement for match ${item.matchId}`
        }
        pagination={{
          currentPage,
          totalPages,
          pageSize,
          totalItems: sortedSettlements.length,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
}

export default SettlementMonitorTab;
