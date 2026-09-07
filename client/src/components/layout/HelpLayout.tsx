import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Info,
  BookOpen,
  Shield,
  HelpCircle,
  FileText,
  Lock,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import AppLayout from "./AppLayout";
import { HapticsManager } from "../../services/HapticsManager";

interface HelpLayoutProps {
  children: ReactNode;
  /** Optional custom hero title */
  title?: string;
  /** Optional custom hero subtitle */
  subtitle?: string;
  /** Optional badge text */
  badgeText?: string;
}

const HELP_TABS = [
  { path: "/about", label: "About Bhalyam", icon: Info },
  { path: "/how-to-play", label: "How to Play", icon: BookOpen },
  { path: "/community-rules", label: "Community Rules", icon: Shield },
  { path: "/support", label: "Support & FAQs", icon: HelpCircle },
  { path: "/privacy", label: "Privacy Policy", icon: FileText },
  { path: "/terms", label: "Terms of Service", icon: Lock },
];

export default function HelpLayout({
  children,
  title = "Help, Rules & Legal Codex",
  subtitle = "Everything you need to know about our digital veranda, fair play standards, and player protections.",
  badgeText = "Veranda Guide",
}: HelpLayoutProps) {
  const { pathname } = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTabClick = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
  };

  return (
    <AppLayout showFallingPetals={pathname === "/how-to-play" || pathname === "/about"}>
      <div className="min-h-screen bhalyam-paper py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ── Top Lounge Utility Bar ── */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/games"
              onClick={handleTabClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-slate-300 bg-white/80 dark:bg-[#151A2E]/80 border border-stone-200/80 dark:border-[#222A44] hover:bg-stone-100 dark:hover:bg-slate-800 transition shadow-2xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lounge</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                onClick={handleTabClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition shadow-2xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2"
              >
                <User className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </Link>
            </div>
          </div>

          {/* ── Executive Titanium & Gold Foil Chassis Header ── */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/30 via-orange-500/20 to-purple-500/30 shadow-md">
            <div className="rounded-[22px] p-5 sm:p-7 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0b101e] dark:via-[#11192e] dark:to-[#070c16] border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                      {title}
                    </h1>
                    <span className="inline-flex text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {badgeText}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 dark:text-slate-300 font-medium mt-0.5 max-w-2xl leading-relaxed">
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating Segmented Control Tabs (6 Routes) ── */}
          <nav
            aria-label="Help and Legal sections"
            className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-200/60 dark:bg-[#111827]/90 border border-stone-300/60 dark:border-white/5 backdrop-blur-md overflow-x-auto [scrollbar-width:none] touch-pan-x"
          >
            {HELP_TABS.map((tab) => {
              const active =
                pathname === tab.path ||
                (tab.path === "/support" &&
                  (pathname === "/faqs" || pathname === "/faq" || pathname.startsWith("/help/support"))) ||
                (tab.path === "/community-rules" && pathname === "/rules") ||
                (tab.path === "/how-to-play" && pathname.startsWith("/help/how-to-play"));
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  onClick={handleTabClick}
                  className={`flex-1 min-w-[130px] sm:min-w-[150px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 ${
                    active
                      ? "bg-white dark:bg-[#1f293d] text-stone-900 dark:text-white shadow-2xs border border-stone-200/80 dark:border-white/10 scale-[1.01]"
                      : "text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-amber-500" : "text-stone-400"}`} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sub-page Content */}
          <main id="help-page-content" tabIndex={-1}>
            {children}
          </main>

          {/* Floating Back to Top Button */}
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              type="button"
              aria-label="Back to top of page"
              className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-stone-900/90 dark:bg-amber-500 text-amber-400 dark:text-stone-950 shadow-xl border border-amber-500/30 hover:scale-110 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
