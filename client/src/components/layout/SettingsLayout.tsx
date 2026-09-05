import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, User, Sliders, Shield, Settings, Gamepad2 } from "lucide-react";
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

          {/* ── Settings Header Chassis (Executive Titanium & Gold Foil) ── */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/30 via-orange-500/20 to-purple-500/30 shadow-md">
            <div className="rounded-[22px] p-6 sm:p-7 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0b101e] dark:via-[#11192e] dark:to-[#070c16] border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Account &amp; Lounge Settings
                    </h1>
                    <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Settings
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 dark:text-slate-300 font-medium mt-0.5">
                    Fine-tune audio soundscapes, tactile haptics, theme aesthetics, language, and security tokens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating Segmented Control Tabs ── */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-stone-200/60 dark:bg-[#111827]/90 border border-stone-300/60 dark:border-white/5 backdrop-blur-md overflow-x-auto [scrollbar-width:none]">
            {SETTINGS_TABS.map((tab) => {
              const active = pathname === tab.path || (tab.path === "/settings/preferences" && pathname === "/settings");
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer ${
                    active
                      ? "bg-white dark:bg-[#1f293d] text-stone-900 dark:text-white shadow-sm border border-stone-200/80 dark:border-white/10 scale-[1.01]"
                      : "text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-amber-500" : "text-stone-400"}`} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Settings Sub-page Content */}
          <main>{children}</main>
        </div>
      </div>
    </AppLayout>
  );
}
