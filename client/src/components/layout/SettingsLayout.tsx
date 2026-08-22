import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, User, Sliders, Shield, Settings } from "lucide-react";
import AppLayout from "./AppLayout";

interface SettingsLayoutProps {
  children: ReactNode;
}

const SETTINGS_TABS = [
  { path: "/settings/preferences", label: "Preferences", icon: Sliders },
  { path: "/settings/security", label: "Security & Data", icon: Shield },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { pathname } = useLocation();

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Quick Links */}
          <div className="flex items-center justify-end">
            <Link
              to="/profile"
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] py-2 inline-flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </Link>
          </div>

          {/* Settings Section Header */}
          <div className="border-b border-[var(--auth-card-edge)] pb-4 space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--auth-ink)]">
                Account Settings
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] font-medium pl-0.5">
              Customize how BHALYAM feels, sounds, and behaves, and protect your account data.
            </p>
          </div>

          {/* Settings Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[var(--auth-card-edge)] pb-3">
            {SETTINGS_TABS.map((tab) => {
              const active = pathname === tab.path || (tab.path === "/settings/preferences" && pathname === "/settings");
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition min-h-[44px] border ${
                    active
                      ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs"
                      : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)] hover:border-amber-500/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
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
