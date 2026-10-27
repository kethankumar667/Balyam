import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, User, Sliders, Shield, Settings } from "lucide-react";
import { SURFACES, TYPOGRAPHY } from "../../design-system/dls";
import AppLayout from "./AppLayout";

interface SettingsLayoutProps {
  children: ReactNode;
}

const SETTINGS_TABS = [
  { path: "/settings/preferences", label: "Preferences", icon: Sliders, description: "Audio, theme, haptics & language" },
  { path: "/settings/security", label: "Security & Data", icon: Shield, description: "Credentials, privacy & data exports" },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { pathname } = useLocation();

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ── Top Lounge Utility Bar ── */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/games"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-slate-300 bg-white/80 dark:bg-[#151A2E]/80 border border-stone-200/80 dark:border-[#222A44] hover:bg-stone-100 dark:hover:bg-slate-800 transition shadow-xs min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Lounge</span>
            </Link>

            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition shadow-xs min-h-[44px]"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </Link>
          </div>

          <div className={SURFACES.cardElevated}>
            <div className="p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={TYPOGRAPHY.pageTitle}>
                      Account &amp; Lounge Settings
                    </h1>
                  </div>
                  <p className={`${TYPOGRAPHY.body} mt-1`}>
                    Make the lounge feel like home. Manage your sound, appearance, privacy and account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating Segmented Control Tabs ── */}
          <nav aria-label="Settings sections" className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-hairline)]">
            {SETTINGS_TABS.map((tab) => {
              const active = pathname === tab.path || (tab.path === "/settings/preferences" && pathname === "/settings");
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  aria-current={active ? "page" : undefined}
                  className={`min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 sm:px-4 py-3 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer ${
                    active
                      ? "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] shadow-sm border border-[var(--chrome-border)]"
                      : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-transparent"
                  }`}
                >
                  <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Settings Sub-page Content */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AppLayout>
  );
}
