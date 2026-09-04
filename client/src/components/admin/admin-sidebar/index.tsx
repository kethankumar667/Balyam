import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Flag,
  Megaphone,
  Trophy,
  BarChart3,
  HeartPulse,
  ScrollText,
  Settings,
  X,
  Shield,
  Sparkles,
  Landmark,
} from "lucide-react";
import BhalyamLogo from "../../bhalyam/BhalyamLogo";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Economy", href: "/admin/economy", icon: Landmark },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Matches", href: "/admin/matches", icon: Gamepad2 },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Leaderboards", href: "/admin/leaderboards", icon: Trophy },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "System Health", href: "/admin/system-health", icon: HeartPulse },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function AdminSidebar({
  isOpen = false,
  onClose,
  className = "",
}: AdminSidebarProps) {
  const location = useLocation();

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--chrome-panel)] border-r border-[var(--chrome-border)] flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out lg:static lg:h-full lg:shrink-0 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${className}`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-24 px-6 border-b border-[var(--chrome-border)] flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3.5">
              <BhalyamLogo size={42} decorative />
              <div className="flex flex-col leading-none">
                <span className="bhalyam-display font-black text-lg text-[var(--chrome-ink)] tracking-tight">
                  BHALYAM
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 mt-1">
                  Command Center
                </span>
              </div>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 rounded-xl text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] border border-transparent hover:border-[var(--chrome-border)]"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="p-3 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isLinkActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    active
                      ? "bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/35 shadow-2xs font-bold"
                      : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-[var(--chrome-ink-soft)] group-hover:text-[var(--chrome-ink)]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info widget */}
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--chrome-ink)] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono">Bhalyam Ops v2.4</span>
          </div>
          <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
            Realtime in-memory room management engine active.
          </p>
        </div>
      </aside>
    </>
  );
}
