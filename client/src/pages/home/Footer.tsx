import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Gamepad2,
  BookOpen,
  PlayCircle,
  Trophy,
  Shield,
  HelpCircle,
  Mail,
  Info,
  Heart,
  Palette,
  Monitor,
  Lock,
  FileText,
  ShieldCheck,
  Users2,
  ArrowRight,
  Globe,
  ChevronDown,
  Check,
  Star,
  MessageSquareText,
  Sun,
  Moon,
  Sparkles,
  Wifi,
  Activity,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { WhatsappGlyph } from "./icons";
import BhalyamLogo from "../../components/bhalyam/BhalyamLogo";
import { useTheme } from "../../lib/useTheme";
import { HapticsManager } from "../../services/HapticsManager";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [theme, toggleTheme] = useTheme();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      HapticsManager.getInstance().subtle();
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4500);
    }
  };

  const handleThemeToggle = () => {
    HapticsManager.getInstance().subtle();
    toggleTheme();
  };

  return (
    <footer className="w-full border-t border-amber-500/20 dark:border-slate-800/80 bg-[#FAF7F2]/95 dark:bg-[#07090E]/95 backdrop-blur-xl mt-12 sm:mt-16 pt-8 sm:pt-10 pb-8 text-slate-700 dark:text-slate-300 transition-colors">
      <RevealOnScroll as="div" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        {/* ── Section 1: Main Brand & 4-Column Directory Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
          {/* Brand & Mission Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              to="/"
              onClick={() => HapticsManager.getInstance().subtle()}
              className="inline-block group select-none"
            >
              <div className="flex items-center gap-3">
                <BhalyamLogo size={42} decorative />
                <div>
                  <h3 className="font-display font-black text-2xl tracking-tight text-slate-900 dark:text-white group-hover:text-[#EA580C] transition-colors leading-none">
                    BHALYAM
                  </h3>
                  <p className="text-xs font-script font-bold text-[#EA580C] mt-1">
                    Play Together. Remember Forever.
                  </p>
                </div>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal max-w-sm">
              BHALYAM is a server-authoritative multiplayer lounge for timeless nostalgic games, friendly banter, and fair competition with friends and family.
            </p>

            {/* Operational Telemetry Chip */}
            <div className="flex items-center gap-2">
              <Link
                to="/diagnostics"
                onClick={() => HapticsManager.getInstance().subtle()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition min-h-[32px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-mono">~24ms</span>
              </Link>
            </div>

            {/* Made with ❤️ for 90s Kids Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/25 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline mx-0.5" />
              <span>for 90s Kids</span>
            </div>
          </div>

          {/* Column 1: LOUNGE & GAMES (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Lounge &amp; Games
              </h4>
              <div className="w-5 h-0.5 bg-[#EA580C] rounded-full" />
            </div>
            <ul className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  to="/games"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>All Games Catalog</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/how-to-play"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Game Rules</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Global Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/tournaments"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Weekend Tournaments</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/social"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Users2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Social Hub</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: HELP & RULES (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Help &amp; Rules
              </h4>
              <div className="w-5 h-0.5 bg-[#EA580C] rounded-full" />
            </div>
            <ul className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  to="/how-to-play"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>How to Play</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/community-rules"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Community Rules</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Support &amp; FAQs</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 text-[#EA580C] font-bold min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Mail className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                  <span>Contact Us</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Safety Center</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/feedback"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <MessageSquareText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Leave Feedback</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: COMPANY & CODEX (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Company &amp; Codex
              </h4>
              <div className="w-5 h-0.5 bg-[#EA580C] rounded-full" />
            </div>
            <ul className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  to="/about"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>About BHALYAM</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/about#our-story"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Heart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Our Story</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/testimonials"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Star className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Player Testimonials</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/reviews/write"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Star className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Write a Review</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/design-system"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Design System</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/diagnostics"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Diagnostics Console</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: LEGAL & PRIVACY (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Legal &amp; Trust
              </h4>
              <div className="w-5 h-0.5 bg-[#EA580C] rounded-full" />
            </div>
            <ul className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Safety Center</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings/security"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Your Data Choices</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings/preferences"
                  className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-1.5 min-h-[28px] focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
                >
                  <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Cookie Preferences</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Section 2: The Veranda Dispatch (Executive Newsletter Strip) ── */}
        <div className="relative p-6 sm:p-8 rounded-3xl border border-amber-500/20 dark:border-amber-500/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                <Radio className="w-3.5 h-3.5" />
                <span>The Veranda Dispatch</span>
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Stay updated on new games, tournaments &amp; 90s nostalgia.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zero spam. Only new game releases, weekend cups, and feature updates. Unsubscribe anytime.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="flex-1 max-w-md">
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
                <Mail className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 px-2 py-1 focus:outline-none flex-1 min-w-0 font-medium"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition shadow-md hover:shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 min-h-[38px]"
                >
                  <span>Subscribe</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {subscribed && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 pl-4">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>You're in! Welcome to the Veranda Dispatch.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ── Section 3: Platform Integrity & Core Tenets Bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">Server Authoritative</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Zero client cheat vectors</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">Zero-Install SPA</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant play on any device</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">100% Free &amp; No Ads</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Zero real-money gambling</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">WebRTC Mesh Audio</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Encrypted low-latency voice</p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Utility Bar & Bottom Chrome ── */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          {/* Copyright & Slogan */}
          <div className="text-center md:text-left space-y-0.5">
            <div className="font-medium">© 2026 BHALYAM. All rights reserved.</div>
            <div className="text-xs text-[#EA580C] font-bold">
              Relive childhood. Make new memories. 🧡
            </div>
          </div>

          {/* Center Legal Quick Links */}
          <div className="flex items-center gap-3 flex-wrap justify-center font-medium">
            <Link to="/privacy" className="hover:text-[#EA580C] transition">
              Privacy Notice
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#EA580C] transition">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/settings/security" className="hover:text-[#EA580C] transition">
              Your Data Choices
            </Link>
            <span>•</span>
            <Link to="/settings/preferences" className="hover:text-[#EA580C] transition">
              Cookie Settings
            </Link>
          </div>

          {/* Right Controls: Language + Socials (Theme toggle removed per Issue 16 as it is in AppHeader) */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Language Selector Chip */}
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs min-h-[38px]">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>English (IN)</span>
            </div>

            {/* Social Icons with Touch Target Minimums */}
            <div className="flex items-center gap-1.5">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:text-[#EA580C] flex items-center justify-center transition shadow-2xs min-h-[38px] min-w-[38px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <InstagramGlyph className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:text-[#EA580C] flex items-center justify-center transition shadow-2xs min-h-[38px] min-w-[38px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <WhatsappGlyph className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@bhalyam.app"
                aria-label="Email Support"
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:text-[#EA580C] flex items-center justify-center transition shadow-2xs min-h-[38px] min-w-[38px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Mail className="w-4 h-4" />
              </a>
              <Link
                to="/games"
                aria-label="Games Lounge"
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:text-[#EA580C] flex items-center justify-center transition shadow-2xs min-h-[38px] min-w-[38px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Gamepad2 className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </footer>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
