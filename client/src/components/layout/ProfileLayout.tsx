import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  UserCheck,
  BarChart3,
  History,
  Award,
  Trophy,
  Settings,
  Flame,
  Shield,
} from "lucide-react";
import ProfileHeader from "../../features/profile/ProfileHeader";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

interface ProfileLayoutProps {
  children: ReactNode;
  profile?: PlayerProfile | null;
  isMember?: boolean;
  onEditName?: () => void;
  name?: string;
  avatar?: string | null;
  favoriteGame?: string;
  badgeLabel?: string;
  compactHeader?: boolean;
}

const PROFILE_TABS = [
  { path: "/profile", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { path: "/profile/matches", label: "Battle Log", shortLabel: "Battles", icon: History },
  { path: "/profile/achievements", label: "Trophy Road", shortLabel: "Trophies", icon: Award },
  { path: "/profile/statistics", label: "Game Mastery", shortLabel: "Mastery", icon: BarChart3 },
  { path: "/profile/scorecards", label: "Scorecards", shortLabel: "Cards", icon: Trophy },
  { path: "/profile/personal", label: "Holo ID & Bio", shortLabel: "ID & Bio", icon: UserCheck },
];

export default function ProfileLayout({
  children,
  profile,
  isMember = true,
  onEditName,
  name,
  avatar,
  favoriteGame,
  badgeLabel,
  compactHeader,
}: ProfileLayoutProps) {
  const { pathname } = useLocation();
  const { play } = useAudio();
  const isCompact = compactHeader ?? (pathname !== "/profile" && pathname !== "/profile/personal");

  const handleTabClick = (isActive: boolean) => {
    if (!isActive) {
      play(AUDIO.UI_TOGGLE);
      HapticsManager.getInstance().subtle();
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white py-4 sm:py-6 lg:py-8 px-3.5 sm:px-6 lg:px-8 xl:px-10 pb-28 lg:pb-12 relative overflow-hidden select-none">
      {/* Background Arcade Atmosphere & Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-48 right-1/4 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="max-w-7xl w-full mx-auto space-y-6 relative z-10">
        {/* Top Lounge Bar: Back Button, Server & League Indicator, Settings */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/games"
            onClick={() => play(AUDIO.UI_CLICK)}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-all min-h-[44px] py-2 px-3.5 rounded-2xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-2 border-amber-500/30 hover:border-amber-400/60 shadow-[0_4px_12px_rgba(0,0,0,0.5)] active:translate-y-0.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span>Game Lounge</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Live Lounge Server Chip */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A]/90 border border-slate-700/80 text-[11px] font-mono font-bold text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>Lounge: IN-South · 22ms</span>
            </div>

            {/* League Rank / Tier Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider text-amber-300 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Pro League</span>
            </div>

            <Link
              to="/settings/preferences"
              onClick={() => play(AUDIO.UI_CLICK)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-all min-h-[44px] py-2 px-3 rounded-2xl bg-[#0F172A]/80 hover:bg-[#1E293B] border border-slate-700/60 hover:border-slate-500 shadow-sm cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </div>

        {/* Profile Hero Header Banner (Supercell / Miniclip Style) */}
        {profile && (
          <ProfileHeader
            profile={profile}
            isMember={isMember}
            onEditName={onEditName}
            name={name}
            avatar={avatar}
            compact={isCompact}
            favoriteGame={favoriteGame}
            badgeLabel={badgeLabel}
          />
        )}

        {/* ── Supercell Segmented 3D Battle Tab Bar (Visible on ALL devices) ── */}
        <nav
          aria-label="Profile navigation sections"
          className="w-full bg-[#0D1424]/95 backdrop-blur-xl border-2 border-slate-700/60 rounded-2xl sm:rounded-3xl p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
        >
          <ul className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0.5">
            {PROFILE_TABS.map((tab) => {
              const active = pathname === tab.path;
              const Icon = tab.icon;

              return (
                <li key={tab.path} className="flex-1 shrink-0">
                  <Link
                    to={tab.path}
                    onClick={() => handleTabClick(active)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 min-h-[44px] w-full select-none cursor-pointer border ${
                      active
                        ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.45)] border-b-4 border-b-amber-800 scale-[1.02]"
                        : "bg-[#131D31]/80 text-slate-300 border-slate-700/50 hover:bg-[#1A2640] hover:text-white hover:border-slate-600"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        active
                          ? "text-stone-950 scale-110 drop-shadow-xs"
                          : "text-amber-400/80 group-hover:text-amber-300"
                      }`}
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Dedicated Sub-Page Content Container */}
        <main className="min-h-[500px]">{children}</main>
      </div>

      {/* ── Floating Mobile Console Dock (Thumb reach navigation on mobile phones) ── */}
      <nav
        aria-label="Mobile gaming quick dock"
        className="lg:hidden fixed bottom-3 inset-x-3 max-w-md mx-auto z-40 bg-[#090E1A]/95 backdrop-blur-2xl border-2 border-amber-500/40 rounded-2xl p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)]"
      >
        <ul className="flex items-center justify-around gap-1">
          {PROFILE_TABS.map((tab) => {
            const active = pathname === tab.path;
            const Icon = tab.icon;

            return (
              <li key={tab.path} className="flex-1">
                <Link
                  to={tab.path}
                  onClick={() => handleTabClick(active)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-black min-h-[44px] w-full transition-all duration-200 select-none ${
                    active
                      ? "bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 shadow-[0_2px_10px_rgba(245,158,11,0.5)] border-b-2 border-b-amber-700 scale-105"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-0.5 transition-transform ${
                      active ? "text-stone-950 scale-110" : "text-amber-400/80"
                    }`}
                  />
                  <span className="truncate max-w-[50px] text-center font-mono">
                    {tab.shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
