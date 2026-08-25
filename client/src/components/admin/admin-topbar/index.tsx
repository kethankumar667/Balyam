import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Home,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  ScrollText,
  HeartPulse,
  Flag,
} from "lucide-react";
import { useTheme } from "../../../lib/useTheme";
import StatusBadge from "../status-badge";
import SearchBar from "../search-bar";

interface AdminTopbarProps {
  onToggleSidebar?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  systemStatus?: "healthy" | "warning" | "critical";
  onlineSockets?: number;
  className?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: "info" | "warning" | "success";
  read: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    title: "Word Building Season 2 Tournament is now live",
    time: "5m ago",
    type: "info",
    read: false,
  },
  {
    id: "n-2",
    title: "1 Bot failover recovered seat in Room #RM4521",
    time: "15m ago",
    type: "warning",
    read: false,
  },
  {
    id: "n-3",
    title: "HMAC cryptographic key verification refreshed",
    time: "1h ago",
    type: "success",
    read: true,
  },
];

export default function AdminTopbar({
  onToggleSidebar,
  onRefresh,
  isRefreshing = false,
  systemStatus = "healthy",
  onlineSockets = 142,
  className = "",
}: AdminTopbarProps) {
  const [theme, toggleTheme] = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header
      className={`h-24 shrink-0 px-3.5 sm:px-6 lg:px-8 bg-[var(--chrome-panel)]/95 backdrop-blur-md border-b border-[var(--chrome-border)] flex items-center justify-between gap-3 sm:gap-4 sticky top-0 z-30 transition-all ${className}`}
    >
      {/* Left: Mobile Menu Toggle & Quick Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md lg:max-w-xl">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-11 h-11 rounded-xl bg-[var(--chrome-control)]/60 hover:bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] transition-colors cursor-pointer"
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:block w-full">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search commands, users, rooms, feature flags..."
            shortcut="⌘K"
          />
        </div>
      </div>

      {/* Right: Operational Status, Quick Actions, Dividers, SuperAdmin Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* System Health Status Indicator */}
        <div className="hidden md:flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)] shadow-2xs">
          <StatusBadge
            status={systemStatus}
            label={systemStatus === "healthy" ? "Operational" : systemStatus}
            size="sm"
          />
          <span className="text-xs font-mono font-bold text-[var(--chrome-ink-soft)]">
            {onlineSockets} sockets
          </span>
        </div>

        {/* Vertical Separator */}
        <div className="hidden md:block h-7 w-px bg-[var(--chrome-hairline)] mx-0.5" />

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-11 h-11 rounded-xl bg-[var(--chrome-control)]/60 hover:bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] transition-all cursor-pointer shadow-2xs"
            title="Refresh dashboard data"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`}
            />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-11 h-11 rounded-xl bg-[var(--chrome-control)]/60 hover:bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] transition-all cursor-pointer shadow-2xs relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--chrome-panel)]" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-[var(--chrome-hairline)] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-[var(--chrome-hairline)] max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs transition-colors flex items-start gap-2.5 ${
                      n.read ? "opacity-70" : "bg-amber-500/10 dark:bg-amber-500/15"
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      ) : n.type === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Radio className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--chrome-ink)] leading-snug">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono mt-0.5 block">
                        {n.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-11 h-11 rounded-xl bg-[var(--chrome-control)]/60 hover:bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] transition-all cursor-pointer shadow-2xs"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[var(--chrome-ink)]" />}
        </button>

        {/* Return to Public Lounge Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 h-11 px-3.5 text-xs font-bold rounded-xl text-[var(--chrome-ink)] bg-[var(--chrome-control)]/60 hover:bg-[var(--chrome-control)] border border-[var(--chrome-border)] transition-all shadow-2xs hover:border-amber-500/40"
          title="Back to Bhalyam Player Lounge"
        >
          <Home className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Lounge</span>
          <ExternalLink className="w-3 h-3 text-[var(--chrome-ink-soft)]" />
        </Link>

        {/* Vertical Separator */}
        <div className="h-7 w-px bg-[var(--chrome-hairline)] mx-0.5" />

        {/* SuperAdmin Profile Card Button */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-3 h-12 px-3 py-1.5 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)]/80 hover:bg-[var(--chrome-control)] hover:border-amber-500/60 transition-all cursor-pointer shadow-2xs active:scale-98"
            title="SuperAdmin Console Profile"
          >
            {/* Avatar Squircle */}
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 text-zinc-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4 text-zinc-950" />
              {/* Online Green Indicator Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--chrome-panel)]" />
            </div>

            {/* Profile Info Details */}
            <div className="hidden sm:flex flex-col text-left leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[var(--chrome-ink)] tracking-tight">
                  Super Admin
                </span>
                <span className="text-[8px] font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1 py-0.2 rounded font-mono">
                  ROOT
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] truncate max-w-[110px] mt-1">
                admin@bhalyam.io
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--chrome-ink-soft)] transition-transform duration-200 hidden sm:block ${
                profileMenuOpen ? "rotate-180 text-amber-500" : ""
              }`}
            />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              {/* SuperAdmin Card Header */}
              <div className="p-3 rounded-xl bg-[var(--chrome-control)]/80 border border-[var(--chrome-hairline)] mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-300 text-zinc-950 flex items-center justify-center font-black text-xs shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-zinc-950" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-[var(--chrome-ink)] truncate">
                      Super Admin (Root)
                    </span>
                    <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] truncate">
                      admin@bhalyam.io
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[var(--chrome-hairline)] flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Root Access Active
                  </span>
                  <span className="font-mono text-[var(--chrome-ink-soft)]">ID: SA-001</span>
                </div>
              </div>

              {/* Console Quick Nav Actions */}
              <div className="py-1 text-xs space-y-0.5">
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition-colors font-medium"
                >
                  <Settings className="w-4 h-4 text-amber-500" />
                  <span>Platform Settings</span>
                </Link>
                <Link
                  to="/admin/system-health"
                  onClick={() => setProfileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition-colors font-medium"
                >
                  <HeartPulse className="w-4 h-4 text-amber-500" />
                  <span>Subsystem Diagnostics</span>
                </Link>
                <Link
                  to="/admin/audit-logs"
                  onClick={() => setProfileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition-colors font-medium"
                >
                  <ScrollText className="w-4 h-4 text-amber-500" />
                  <span>Security Audit Logs</span>
                </Link>
                <Link
                  to="/admin/feature-flags"
                  onClick={() => setProfileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition-colors font-medium"
                >
                  <Flag className="w-4 h-4 text-amber-500" />
                  <span>Feature Flags & Rollouts</span>
                </Link>

                <div className="border-t border-[var(--chrome-hairline)] my-1" />

                <Link
                  to="/"
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Admin Console</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
