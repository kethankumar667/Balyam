import { useId, useState } from "react";
import {
  Radio,
  Plus,
  Send,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
  Wrench,
  CheckCircle2,
  Trash2,
  Eye,
  Search,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import SearchBar from "../../../components/admin/search-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "maintenance" | "event";
  targetAudience: "all" | "lobby" | "in-game";
  status: "published" | "scheduled" | "draft";
  publishedAt?: string;
  scheduledFor?: string;
  author: string;
  dismissible: boolean;
}

const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-1",
    title: "Word Building Season 2 Kickoff!",
    message: "New 250k vocabulary index live with double ELO weekend bonus for all multiplayer rooms!",
    type: "event",
    targetAudience: "all",
    status: "published",
    publishedAt: "Today, 18:00",
    author: "Kethan Kumar",
    dismissible: true,
  },
  {
    id: "ann-2",
    title: "Scheduled Maintenance Window",
    message: "Server worker maintenance scheduled for Tuesday 03:00 AM IST. Matchmaking will pause for 10 minutes.",
    type: "maintenance",
    targetAudience: "lobby",
    status: "scheduled",
    scheduledFor: "Tomorrow, 03:00 AM",
    author: "SuperAdmin",
    dismissible: false,
  },
  {
    id: "ann-3",
    title: "WebRTC Voice Chat Performance Patch",
    message: "Voice STUN relay updated for faster peer connection negotiation on mobile networks.",
    type: "info",
    targetAudience: "in-game",
    status: "published",
    publishedAt: "Feb 20, 2026",
    author: "Teacher Padma",
    dismissible: true,
  },
  {
    id: "ann-4",
    title: "Upcoming Ludo Grand Championship",
    message: "Register your 4-seat team for the Sunday lounge tournament with exclusive profile badges.",
    type: "event",
    targetAudience: "lobby",
    status: "draft",
    author: "Master Ravi",
    dismissible: true,
  },
];

export default function AdminAnnouncementsPage() {
  // ADMIN Phase 2 §8: real id/htmlFor pairs for the create-announcement
  // form's labels, instead of a <label> that sits next to its input
  // visually but is never programmatically tied to it.
  const titleFieldId = useId();
  const messageFieldId = useId();
  const categoryFieldId = useId();
  const audienceFieldId = useId();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(MOCK_ANNOUNCEMENTS);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "scheduled" | "draft">("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<AnnouncementItem["type"]>("info");
  const [newAudience, setNewAudience] = useState<AnnouncementItem["targetAudience"]>("all");
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      a.author.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || a.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const isSearchActive = search.trim() !== "";
  const isFilterActive = activeTab !== "all";

  const emptyTitle = announcements.length === 0
    ? "No announcements created"
    : isSearchActive
    ? "No announcements found"
    : isFilterActive
    ? `No ${activeTab} announcements`
    : "No records found";

  const emptyDesc = announcements.length === 0
    ? "There are currently no broadcasts or system notices configured."
    : isSearchActive
    ? `No announcements match "${search}". Try searching by a different title or keyword.`
    : isFilterActive
    ? `There are currently no announcements in the ${activeTab} state.`
    : "There are currently no items matching your criteria.";

  const emptyAction = isSearchActive ? (
    <button
      type="button"
      onClick={() => setSearch("")}
      className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
    >
      Clear Search
    </button>
  ) : isFilterActive ? (
    <button
      type="button"
      onClick={() => setActiveTab("all")}
      className="px-3.5 py-1.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] transition-colors cursor-pointer"
    >
      Show All Announcements
    </button>
  ) : undefined;

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const created: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: newTitle,
      message: newMessage,
      type: newType,
      targetAudience: newAudience,
      status: "published",
      publishedAt: "Just now",
      author: "You (Admin)",
      dismissible: true,
    };

    setAnnouncements([created, ...announcements]);
    setIsCreating(false);
    setNewTitle("");
    setNewMessage("");
    setActionAlert("Preview created locally — this announcement was not broadcast to any players.");
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleDelete = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setSelectedAnnouncement(null);
    setActionAlert("Preview updated locally — this announcement was removed from your view only.");
    setTimeout(() => setActionAlert(null), 3000);
  };

  const columns: Column<AnnouncementItem>[] = [
    {
      key: "title",
      header: "Announcement Content",
      render: (row) => (
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              row.type === "maintenance"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : row.type === "event"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                : row.type === "warning"
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            }`}
          >
            {row.type === "maintenance" ? (
              <Wrench className="w-4 h-4" />
            ) : row.type === "event" ? (
              <Sparkles className="w-4 h-4" />
            ) : row.type === "warning" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--chrome-ink)] text-sm truncate">
                {row.title}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
                {row.targetAudience}
              </span>
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] line-clamp-1 mt-0.5">
              {row.message}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "published"
              ? "active"
              : row.status === "scheduled"
              ? "pending"
              : "draft"
          }
          label={row.status}
          size="sm"
        />
      ),
    },
    {
      key: "author",
      header: "Author",
      render: (row) => <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">{row.author}</span>,
    },
    {
      key: "publishedAt",
      header: "Timestamp",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-[var(--chrome-ink-soft)]">
          {row.publishedAt ?? row.scheduledFor ?? "Draft"}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Broadcast Announcements"
        description="Publish lobby alerts, scheduled maintenance banners, and tournament notifications across all active players."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Announcements" }]}
        actions={
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        }
      />

      <MockDataBanner kind="mock" />

      {actionAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {actionAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Active Live Banners"
          value="2 Published"
          icon={<Radio className="w-5 h-5 text-amber-500" />}
          subtitle="Broadcasting across 142 players"
        />
        <StatCard
          title="Scheduled Notices"
          value="1 Pending"
          icon={<Calendar className="w-5 h-5 text-amber-500" />}
          subtitle="Auto-trigger at target time"
        />
        <StatCard
          title="Avg Player Reach"
          value="98.2%"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          subtitle="Lobby banner impressions"
        />
      </div>

      {/* Live Preview Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-amber-500/35 mb-6 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Eye className="w-4 h-4 text-amber-500" />
            <span>Player In-Game Banner Preview</span>
          </div>
          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">Simulated Top Banner</span>
        </div>

        <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] uppercase shadow-xs">
              {announcements[0]?.type ?? "EVENT"}
            </span>
            <span className="font-bold text-[var(--chrome-ink)]">{announcements[0]?.title}</span>
            <span className="text-[var(--chrome-ink-soft)] hidden sm:inline">— {announcements[0]?.message}</span>
          </div>
          <button
            type="button"
            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex-shrink-0"
          >
            Learn More →
          </button>
        </div>
      </div>

      {/* Toolbar: Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search announcements by title, message, author..."
          ariaLabel="Search announcements"
        />

        {/* Tabs */}
        <div className="flex items-center gap-1.5 border-b sm:border-b-0 border-[var(--chrome-hairline)] pb-2 sm:pb-0 overflow-x-auto">
          {(["all", "published", "scheduled", "draft"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black shadow-xs"
                  : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Table */}
      <DataTable
        columns={columns}
        data={filteredAnnouncements}
        onRowClick={(row) => setSelectedAnnouncement(row)}
        getRowAriaLabel={(row) => `Open details for announcement ${row.title}`}
        emptyMessage={emptyTitle}
        emptyDescription={emptyDesc}
        emptyIcon={isSearchActive ? <Search className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
        emptyAction={emptyAction}
      />

      {/* Announcement Detail & Create Drawers */}
      <DetailDrawer
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title ?? "Announcement Details"}
        subtitle={`Created by ${selectedAnnouncement?.author}`}
        badge={
          selectedAnnouncement && (
            <StatusBadge
              status={selectedAnnouncement.status === "published" ? "active" : "pending"}
              label={selectedAnnouncement.status}
              size="sm"
            />
          )
        }
        footer={
          selectedAnnouncement && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDelete(selectedAnnouncement.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Announcement</span>
              </button>
            </div>
          )
        }
      >
        {selectedAnnouncement && (
          <div className="space-y-6">
            <InfoCard
              title="Broadcast Configuration"
              fields={[
                { label: "Notification Category", value: selectedAnnouncement.type.toUpperCase() },
                { label: "Target Audience Scope", value: selectedAnnouncement.targetAudience.toUpperCase() },
                { label: "Dismissible by Player", value: selectedAnnouncement.dismissible ? "Yes" : "No (Mandatory)" },
                { label: "Broadcast Time", value: selectedAnnouncement.publishedAt ?? selectedAnnouncement.scheduledFor ?? "Draft" },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Full Message Body
              </h4>
              <p className="text-xs text-[var(--chrome-ink)] leading-relaxed">
                {selectedAnnouncement.message}
              </p>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Create Announcement Drawer */}
      <DetailDrawer
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create Broadcast Announcement"
        subtitle="Compose in-game banner or scheduled notice"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--chrome-control)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAnnouncement}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Now</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label htmlFor={titleFieldId} className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
              Banner Headline
            </label>
            <input
              id={titleFieldId}
              type="text"
              required
              aria-required="true"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Word Building Weekend Championship"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div>
            <label htmlFor={messageFieldId} className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
              Detailed Description
            </label>
            <textarea
              id={messageFieldId}
              required
              aria-required="true"
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Provide exact details for players..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={categoryFieldId} className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
                Category
              </label>
              <select
                id={categoryFieldId}
                value={newType}
                onChange={(e) => setNewType(e.target.value as AnnouncementItem["type"])}
                className="w-full px-3 py-2 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]"
              >
                <option value="info">Info</option>
                <option value="event">Special Event</option>
                <option value="maintenance">Maintenance</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            <div>
              <label htmlFor={audienceFieldId} className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
                Target Audience
              </label>
              <select
                id={audienceFieldId}
                value={newAudience}
                onChange={(e) => setNewAudience(e.target.value as AnnouncementItem["targetAudience"])}
                className="w-full px-3 py-2 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]"
              >
                <option value="all">All Players (Global)</option>
                <option value="lobby">Lobby Only</option>
                <option value="in-game">In-Game Active Seats</option>
              </select>
            </div>
          </div>
        </form>
      </DetailDrawer>
    </AdminLayout>
  );
}
