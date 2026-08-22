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
} from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { WhatsappGlyph } from "./icons";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-14 pb-10 pt-4 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-[#5C3717] dark:text-slate-300">
      <RevealOnScroll as="div" className="space-y-6">
        {/* ── Main Outer Frame Card ── */}
        <div
          className="bhalyam-footer-card relative rounded-[32px] sm:rounded-[40px] border border-[#E8DFC8] dark:border-[#222A44]
                     bg-[#FAF5EE] dark:bg-[#11162A] p-6 sm:p-10 lg:p-12 shadow-sm space-y-8 text-left"
        >
          {/* ── Top Section: Brand + 4 Navigation Columns ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6 items-start">
            {/* Column 1: Brand & Bio (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="inline-block group select-none">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xs bg-amber-500/10 flex items-center justify-center p-1 border border-amber-500/20">
                    <img
                      src="/bhalyam-logo.png"
                      alt="BHALYAM"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-3xl tracking-tight text-slate-900 dark:text-white group-hover:text-[#EA580C] transition-colors leading-none">
                      BHALYAM
                    </h3>
                    <p className="text-xs font-script font-bold text-[#EA580C] mt-1">
                      Play Together. Remember Forever.
                    </p>
                  </div>
                </div>
              </Link>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-sm">
                BHALYAM is your digital playground for timeless games, friendly competition, and
                unforgettable memories with friends and family.
              </p>

              {/* Made with ❤️ for 90s Kids Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D4A574]/40 dark:border-amber-500/30 bg-white/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-2xs">
                <span>☆</span>
                <span>Made with</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline mx-0.5" />
                <span>for 90s Kids</span>
              </div>
            </div>

            {/* Column 2: EXPLORE (2 Cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="border-t-2 border-[#EA580C] w-7 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  EXPLORE
                </h4>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/games"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Gamepad2 className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>All Games</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/games"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Rooms</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/how-to-play"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <PlayCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>How It Works</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leaderboard"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Trophy className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Leaderboard</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: HELP & SUPPORT (2 Cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="border-t-2 border-[#EA580C] w-7 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  HELP &amp; SUPPORT
                </h4>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/how-to-play"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>How to Play</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/community-rules"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Community Rules</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/support"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Support &amp; FAQs</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 text-[#EA580C] font-bold min-h-[36px]"
                  >
                    <Mail className="w-4 h-4 text-[#EA580C] shrink-0" />
                    <span>Contact Us</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: COMPANY (2 Cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="border-t-2 border-[#EA580C] w-7 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  COMPANY
                </h4>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>About BHALYAM</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Heart className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Our Story</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/design-system"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Palette className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Design System</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/diagnostics"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Diagnostics</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: LEGAL (2 Cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="border-t-2 border-[#EA580C] w-7 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  LEGAL
                </h4>
              </div>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/safety"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2.5 min-h-[36px]"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Safety Center</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Middle Section: Two Wide Action Cards Side-by-Side (50% / 50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            {/* Left Card: NEED A HAND? (Warm Peach / Amber Card) */}
            <div className="bg-gradient-to-br from-[#FFF9F0] via-[#FFF3E3] to-[#FFE8CC] dark:from-[#1E1B4B]/35 dark:via-[#1A1835]/40 dark:to-[#0F172A]/40 border border-[#FED7AA] dark:border-amber-800/40 rounded-3xl p-6 sm:p-8 flex flex-row items-center gap-5 shadow-2xs">
              {/* Left: Envelope Circle Icon */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-[#FDDBB4] dark:bg-orange-900/40 flex items-center justify-center text-[#EA580C]">
                  <EnvelopeIllustration />
                </div>
                {/* Speech bubble with dots */}
                <div className="absolute -top-2 -right-2 w-8 h-5 rounded-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 flex items-center justify-center shadow-xs">
                  <span className="text-[8px] font-black text-orange-500 leading-none tracking-tight">•••</span>
                </div>
              </div>

              {/* Center: Text Stack */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#EA580C]">
                  NEED A HAND?
                </p>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  We're here when<br className="hidden sm:block" /> you need us.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">
                  Our team is ready to help you<br /> with any questions or issues.
                </p>
              </div>

              {/* Right: CTA Button */}
              <div className="shrink-0">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm px-6 py-3 rounded-full shadow-sm hover:shadow-md transition whitespace-nowrap min-h-[46px]"
                >
                  <span>Contact BHALYAM</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Card: STAY IN THE LOOP (Lilac / Lavender Card) */}
            <div className="bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#E0E7FF] dark:from-[#1E1B4B]/40 dark:via-[#1A1835]/40 dark:to-[#172554]/30 border border-[#DDD6FE] dark:border-purple-900/40 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-2xs relative overflow-hidden">
              {/* Airplane Trail Background Accent */}
              <div className="absolute top-3 right-4 rotate-12 opacity-80 pointer-events-none">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="#C4B5FD"
                    fillOpacity="0.4"
                  />
                </svg>
              </div>

              <div className="space-y-1">
                <h5 className="text-xs font-black uppercase tracking-wider text-[#7C3AED] dark:text-[#A78BFA]">
                  STAY IN THE LOOP
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight">
                  Get updates about new games, events and awesome 90s vibes.
                </p>
              </div>

              <form onSubmit={handleSubscribe} className="relative">
                <div className="flex items-center bg-white dark:bg-[#151A2E] rounded-full p-1.5 border border-[#DDD6FE] dark:border-purple-900/50 shadow-2xs">
                  <Mail className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 px-3 focus:outline-none flex-1 min-w-0 font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-bold rounded-full px-5 py-2 transition-all shadow-xs flex-shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Subscribe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {subscribed && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block flex items-center gap-1">
                    <Check className="w-3 h-3" /> Subscribed successfully!
                  </span>
                )}
              </form>

              {/* Micro-tags */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300 pt-0.5">
                <span>🎮 New Games</span>
                <span>•</span>
                <span>🏆 Events</span>
                <span>•</span>
                <span>🎒 90s Vibes</span>
              </div>
            </div>
          </div>

          {/* ── Middle Values & Trust Strip (Framed Card with 4 Pillars) ── */}
          <div className="rounded-2xl border border-[#E8DFC8] dark:border-slate-800 bg-white/70 dark:bg-[#151A2E]/60 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8DFC8] dark:divide-slate-800">
            {/* 1. Safe & Friendly */}
            <div className="flex items-center gap-3 sm:px-3 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Safe &amp; Friendly</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                  We keep BHALYAM safe and fun for everyone.
                </p>
              </div>
            </div>

            {/* 2. Fair Play */}
            <div className="flex items-center gap-3 sm:px-3 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Users2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Fair Play</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                  Cheating has no place here. Let's play fair and square.
                </p>
              </div>
            </div>

            {/* 3. Respect Everyone */}
            <div className="flex items-center gap-3 sm:px-3 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Respect Everyone</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                  Be kind, supportive and enjoy together.
                </p>
              </div>
            </div>

            {/* 4. Have Fun! */}
            <div className="flex items-center gap-3 sm:px-3 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Have Fun!</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                  Games are better when we play together.
                </p>
              </div>
            </div>
          </div>

          {/* ── Bottom Bar: Copyright & Legal & Socials & Language ── */}
          <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {/* Copyright & Slogan */}
            <div className="text-left space-y-0.5">
              <div>© 2026 BHALYAM. All rights reserved.</div>
              <div className="text-[11px] text-[#EA580C] font-medium">
                Relive childhood. Make new memories. 🧡
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-3.5 flex-wrap justify-center text-[11.5px]">
              <Link to="/privacy" className="hover:text-[#EA580C] transition-colors">
                Privacy Notice
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-[#EA580C] transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link to="/profile/security" className="hover:text-[#EA580C] transition-colors">
                Your Data Choices
              </Link>
              <span>•</span>
              <Link to="/profile/preferences" className="hover:text-[#EA580C] transition-colors">
                Cookie Settings
              </Link>
            </div>

            {/* Social Icons & Language Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#5C3717] dark:text-slate-300 hover:bg-[#FBE7C6] flex items-center justify-center transition shadow-2xs"
                >
                  <InstagramGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#5C3717] dark:text-slate-300 hover:bg-[#FBE7C6] flex items-center justify-center transition shadow-2xs"
                >
                  <WhatsappGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="mailto:hello@bhalyam.app"
                  aria-label="Email"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#5C3717] dark:text-slate-300 hover:bg-[#FBE7C6] flex items-center justify-center transition shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/games"
                  aria-label="Games"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#5C3717] dark:text-slate-300 hover:bg-[#FBE7C6] flex items-center justify-center transition shadow-2xs"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Language Selector Chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-[#D9C4A3] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>English</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
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

/** Friendly envelope illustration matching the reference design */
function EnvelopeIllustration() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36" aria-hidden>
      {/* Envelope body */}
      <rect x="4" y="14" width="40" height="28" rx="4" fill="#F97316" fillOpacity="0.9" />
      {/* Envelope flap (open top, triangles) */}
      <path d="M4 18 L24 30 L44 18" stroke="#EA580C" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Top fold lines */}
      <path d="M4 14 L24 26 L44 14" fill="#FDBA74" />
      {/* White shine lines */}
      <rect x="10" y="32" width="12" height="2" rx="1" fill="white" fillOpacity="0.4" />
      <rect x="10" y="37" width="8" height="2" rx="1" fill="white" fillOpacity="0.3" />
    </svg>
  );
}

