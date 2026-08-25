import { useState } from "react";
import {
  Shield,
  Download,
  AlertTriangle,
  Info,
  ShieldAlert,
  Search,
  CheckCircle2,
  FileCode,
  Calendar,
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

interface AuditLogEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionCode: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  severity: "info" | "warning" | "critical";
  details: string;
  rawPayload: Record<string, unknown>;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-901",
    timestamp: "2026-08-24 22:15:30",
    actorName: "Kethan Kumar",
    actorRole: "SuperAdmin",
    actionCode: "FEATURE_FLAG.UPDATE",
    resourceType: "FeatureFlag",
    resourceId: "bhalyam.voice.webrtc_mesh",
    ipAddress: "192.168.1.10",
    severity: "info",
    details: "Toggled rollout percentage from 80% to 100% in production tier.",
    rawPayload: { flagKey: "bhalyam.voice.webrtc_mesh", previous: 80, updated: 100, clusterTarget: "all" },
  },
  {
    id: "aud-902",
    timestamp: "2026-08-24 22:10:14",
    actorName: "Teacher Padma",
    actorRole: "Moderator",
    actionCode: "USER.MUTE",
    resourceType: "PlayerAccount",
    resourceId: "u-116 (Rohan Kapoor)",
    ipAddress: "103.21.244.18",
    severity: "warning",
    details: "Enforced 24h voice and chat mute due to spam violation report.",
    rawPayload: { targetUserId: "u-116", reason: "spam_chat", durationHours: 24, channel: "Lobby" },
  },
  {
    id: "aud-903",
    timestamp: "2026-08-24 21:58:45",
    actorName: "SecurityEngine",
    actorRole: "AutomatedBot",
    actionCode: "AUTH.HMAC_FAIL",
    resourceType: "SeatToken",
    resourceId: "seat-rm-402",
    ipAddress: "45.12.89.201",
    severity: "critical",
    details: "Seat HMAC signature mismatch rejected during room reconnection.",
    rawPayload: { roomCode: "RM4521", providedHash: "e3b0c442...", expectedSignature: "a18f29...", actionTaken: "DISCONNECT" },
  },
  {
    id: "aud-904",
    timestamp: "2026-08-24 21:40:00",
    actorName: "Master Ravi",
    actorRole: "Moderator",
    actionCode: "MATCH.TERMINATE",
    resourceType: "GameRoom",
    resourceId: "room-SL2201",
    ipAddress: "115.110.20.9",
    severity: "warning",
    details: "Force terminated idle room after 15 minutes of inactivity.",
    rawPayload: { roomCode: "SL2201", idleSeconds: 920, seatsRefunded: 4 },
  },
  {
    id: "aud-905",
    timestamp: "2026-08-24 21:15:22",
    actorName: "SuperAdmin",
    actorRole: "SuperAdmin",
    actionCode: "SETTINGS.UPDATE",
    resourceType: "SystemConfig",
    resourceId: "turn_timer_pacing",
    ipAddress: "192.168.1.10",
    severity: "info",
    details: "Set global player turn grace period to 15,000 milliseconds.",
    rawPayload: { setting: "turn_timer_pacing", oldValue: 20000, newValue: 15000 },
  },
];

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry[] | null>(null);
  const [activeLog, setActiveLog] = useState<AuditLogEntry | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredLogs = MOCK_AUDIT_LOGS.filter((l) => {
    const matchesSearch =
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.actionCode.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceId.toLowerCase().includes(search.toLowerCase()) ||
      l.ipAddress.includes(search);
    const matchesSeverity = severityFilter === "all" || l.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleExportCSV = () => {
    setExportNotice("Not available in this preview — no file was downloaded. This page shows local demonstration data only.");
    setTimeout(() => setExportNotice(null), 3000);
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (row) => <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">{row.timestamp}</span>,
    },
    {
      key: "actorName",
      header: "Actor",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[var(--chrome-ink)]">{row.actorName}</span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">{row.actorRole}</span>
        </div>
      ),
    },
    {
      key: "actionCode",
      header: "Action Event",
      render: (row) => (
        <span className="font-mono font-bold text-xs text-amber-500 dark:text-amber-400">
          {row.actionCode}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (row) => (
        <StatusBadge
          status={
            row.severity === "critical"
              ? "critical"
              : row.severity === "warning"
              ? "warning"
              : "active"
          }
          label={row.severity}
          size="sm"
        />
      ),
    },
    {
      key: "resourceId",
      header: "Resource Target",
      render: (row) => <span className="text-xs font-mono text-[var(--chrome-ink-soft)]">{row.resourceId}</span>,
    },
    {
      key: "ipAddress",
      header: "IP Address",
      align: "right",
      render: (row) => <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">{row.ipAddress}</span>,
    },
  ];

  const filters: FilterOption[] = [
    {
      id: "severity",
      label: "Severity",
      value: severityFilter,
      options: [
        { label: "All Severities", value: "all" },
        { label: "Info", value: "info" },
        { label: "Warning", value: "warning" },
        { label: "Critical", value: "critical" },
      ],
      onChange: setSeverityFilter,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Security & System Audit Logs"
        description="Immutable record of administrative actions, moderation events, HMAC cryptographic verifications, and feature flag changes."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Logs" }]}
        actions={
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--chrome-panel)] text-[var(--chrome-ink)] font-bold text-xs border border-[var(--chrome-border)] hover:bg-[var(--chrome-control)] transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Export CSV</span>
          </button>
        }
      />

      <MockDataBanner kind="mock" />

      {exportNotice && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {exportNotice}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Audit Events (24h)"
          value="1,420 Events"
          icon={<Shield className="w-5 h-5 text-amber-500" />}
          subtitle="100% audit log retention"
        />
        <StatCard
          title="Security Interceptions"
          value="1 Blocked"
          icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
          subtitle="Invalid HMAC token dropped"
        />
        <StatCard
          title="Admin Actions Recorded"
          value="14 Changes"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          subtitle="Zero unauthenticated attempts"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by actor, action code, IP, or resource..."
        />
        <FilterBar
          filters={filters}
          onReset={() => setSeverityFilter("all")}
        />
      </div>

      {/* Audit Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        onRowClick={(row) => setActiveLog(row)}
      />

      {/* Event Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(activeLog)}
        onClose={() => setActiveLog(null)}
        title={activeLog?.actionCode ?? "Audit Event"}
        subtitle={`Logged on ${activeLog?.timestamp} by ${activeLog?.actorName}`}
        badge={
          activeLog && (
            <StatusBadge
              status={
                activeLog.severity === "critical"
                  ? "critical"
                  : activeLog.severity === "warning"
                  ? "warning"
                  : "active"
              }
              label={activeLog.severity}
              size="sm"
            />
          )
        }
      >
        {activeLog && (
          <div className="space-y-6">
            <InfoCard
              title="Event Metadata"
              fields={[
                { label: "Log ID", value: activeLog.id, isMono: true },
                { label: "Resource Type", value: activeLog.resourceType },
                { label: "Resource Target", value: activeLog.resourceId, isMono: true },
                { label: "Origin IP", value: activeLog.ipAddress, isMono: true },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Action Summary
              </h4>
              <p className="text-xs text-[var(--chrome-ink)] leading-relaxed">
                {activeLog.details}
              </p>
            </div>

            {/* Raw JSON Payload Box */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                  Raw JSON Event Payload
                </h4>
              </div>
              <pre className="p-4 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] text-xs font-mono overflow-x-auto border border-[var(--chrome-border)]">
                {JSON.stringify(activeLog.rawPayload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
