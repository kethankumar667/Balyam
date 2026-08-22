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
import BhalyamLogo from "../../components/bhalyam/BhalyamLogo";

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
          className="bhalyam-footer-card relative rounded-[28px] sm:rounded-[32px] border border-[#E8DFC8] dark:border-[#222A44]
                     bg-[#FAF5EE] dark:bg-[#11162A] p-5 sm:p-7 lg:p-8 shadow-sm space-y-5 text-left"
        >
          {/* ── Top Section: Brand + 4 Navigation Columns ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-4 items-start">
            {/* Column 1: Brand & Bio (4 Cols) */}
            <div className="lg:col-span-4 space-y-2.5">
              <Link to="/" className="inline-block group select-none">
                <div className="flex items-center gap-2.5">
                  <BhalyamLogo size={40} decorative />
                  <div>
                    <h3 className="font-display font-black text-2xl tracking-tight text-slate-900 dark:text-white group-hover:text-[#EA580C] transition-colors leading-none">
                      BHALYAM
                    </h3>
                    <p className="text-[11px] font-script font-bold text-[#EA580C] mt-0.5">
                      Play Together. Remember Forever.
                    </p>
                  </div>
                </div>
              </Link>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-xs">
                BHALYAM is your digital playground for timeless games, friendly competition, and
                unforgettable memories with friends and family.
              </p>

              {/* Made with ❤️ for 90s Kids Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#D4A574]/40 dark:border-amber-500/30 bg-white/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-[11px] font-bold shadow-2xs">
                <span>☆</span>
                <span>Made with</span>
                <Heart className="w-3 h-3 text-rose-500 fill-current inline mx-0.5" />
                <span>for 90s Kids</span>
              </div>
            </div>

            {/* Column 2: EXPLORE (2 Cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="border-t-2 border-[#EA580C] w-6 pt-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  EXPLORE
                </h4>
              </div>
              <ul className="space-y-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/games"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>All Games</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/games"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Rooms</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/how-to-play"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>How It Works</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leaderboard"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Leaderboard</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: HELP & SUPPORT (2 Cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="border-t-2 border-[#EA580C] w-6 pt-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  HELP &amp; SUPPORT
                </h4>
              </div>
              <ul className="space-y-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/how-to-play"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>How to Play</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/community-rules"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Community Rules</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/support"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Support &amp; FAQs</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 text-[#EA580C] font-bold min-h-[28px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                    <span>Contact Us</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: COMPANY (2 Cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="border-t-2 border-[#EA580C] w-6 pt-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  COMPANY
                </h4>
              </div>
              <ul className="space-y-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>About BHALYAM</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Heart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Our Story</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/design-system"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Design System</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/diagnostics"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Diagnostics</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: LEGAL (2 Cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="border-t-2 border-[#EA580C] w-6 pt-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  LEGAL
                </h4>
              </div>
              <ul className="space-y-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/safety"
                    className="hover:text-[#EA580C] dark:hover:text-amber-400 transition flex items-center gap-2 min-h-[28px]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Safety Center</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Middle Section: Two Wide Action Cards Side-by-Side (50% / 50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Card: NEED A HAND? */}
            <div className="bg-[#FFF8EE] dark:bg-[#1A1210]/80 border border-[#FAD9A8] dark:border-amber-900/40 rounded-2xl overflow-hidden flex flex-row items-stretch shadow-2xs">
              {/* Left: envelope illustration area */}
              <div className="relative flex items-center justify-center p-4 shrink-0 w-[130px] sm:w-[150px]">
                {/* Sparkle decorations */}
                <span className="absolute top-4 left-4 text-[#F97316] text-lg select-none">✦</span>
                <span className="absolute bottom-8 left-8 text-[#F97316]/40 text-sm select-none">✦</span>
                {/* Large open envelope SVG illustration */}
                <EnvelopeWithPlane />
              </div>

              {/* Right: Text + Button */}
              <div className="flex-1 flex flex-col justify-center gap-2.5 py-4 pr-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#EA580C]">
                    NEED A HAND?
                  </p>
                  <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    We're here when you need us.
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Our team is ready to help you with any questions or issues.
                  </p>
                </div>
                <Link
                  to="/contact"
                  className="self-start inline-flex items-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition whitespace-nowrap"
                >
                  <span>Contact BHALYAM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Card: STAY IN THE LOOP */}
            <div className="bg-[#EEE9FF] dark:bg-[#18134A]/80 border border-[#D1C4F8] dark:border-purple-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-2xs relative overflow-hidden">
              {/* Paper airplane top-right decoration */}
              <div className="absolute top-4 right-4 pointer-events-none">
                <PurplePlaneIllustration />
              </div>

              {/* Top: Title & desc */}
              <div className="space-y-1 pr-14">
                <h5 className="text-sm font-black uppercase tracking-wider text-[#5B21B6] dark:text-[#A78BFA]">
                  STAY IN THE LOOP
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-snug">
                  Get updates about new games, events and awesome 90s vibes.
                </p>
              </div>

              {/* Subscribe form */}
              <form onSubmit={handleSubscribe}>
                <div className="flex items-center bg-white dark:bg-[#151A2E] rounded-full p-1 border border-[#DDD6FE] dark:border-purple-900/50 shadow-2xs">
                  <Mail className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="bg-transparent text-[11px] text-slate-900 dark:text-white placeholder-slate-400 px-2.5 focus:outline-none flex-1 min-w-0 font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-[11px] font-bold rounded-full px-4 py-2 transition-all shadow-xs flex-shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Subscribe</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {subscribed && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
                    ✓ Subscribed successfully!
                  </span>
                )}
              </form>

              {/* Micro-tags */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                <Gamepad2 className="w-3 h-3 shrink-0" />
                <span>New Games</span>
                <span>•</span>
                <Trophy className="w-3 h-3 shrink-0" />
                <span>Events</span>
                <span>•</span>
                <span>🎒</span>
                <span>90s Vibes</span>
              </div>
            </div>
          </div>

          {/* ── Middle Values & Trust Strip ── */}
          <div className="rounded-xl border border-[#E8DFC8] dark:border-slate-800 bg-white/70 dark:bg-[#151A2E]/60 p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 divide-y-0 sm:divide-x divide-[#E8DFC8] dark:divide-slate-800">
            {/* 1. Safe & Friendly */}
            <div className="flex items-center gap-2.5 sm:px-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Safe &amp; Friendly</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  We keep BHALYAM safe and fun for everyone.
                </p>
              </div>
            </div>

            {/* 2. Fair Play */}
            <div className="flex items-center gap-2.5 sm:px-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Users2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Fair Play</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  Cheating has no place here. Let's play fair and square.
                </p>
              </div>
            </div>

            {/* 3. Respect Everyone */}
            <div className="flex items-center gap-2.5 sm:px-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Respect Everyone</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  Be kind, supportive and enjoy together.
                </p>
              </div>
            </div>

            {/* 4. Have Fun! */}
            <div className="flex items-center gap-2.5 sm:px-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Have Fun!</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
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

/** Large open envelope with a paper airplane flying out — matches reference NEED A HAND card */
function EnvelopeWithPlane() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="120" height="120" aria-hidden>
      {/* ── Open envelope body ── */}
      <rect x="10" y="42" width="80" height="58" rx="7" fill="#FDBA74" />
      {/* Envelope bottom shading */}
      <rect x="10" y="75" width="80" height="25" rx="7" fill="#FB923C" fillOpacity="0.5" />

      {/* ── Open flap (pointing upward) ── */}
      <path d="M10 52 L50 76 L90 52" fill="#FED7AA" />
      <path d="M10 42 L50 66 L90 42" fill="#FEF3C7" />

      {/* ── White envelope shine lines ── */}
      <rect x="20" y="80" width="24" height="4" rx="2" fill="white" fillOpacity="0.45" />
      <rect x="20" y="89" width="16" height="4" rx="2" fill="white" fillOpacity="0.3" />

      {/* ── Speech bubble (top-left of envelope) ── */}
      <rect x="4" y="18" width="34" height="20" rx="8" fill="white" stroke="#FED7AA" strokeWidth="1.5" />
      <path d="M14 38 L10 44 L18 40" fill="white" stroke="#FED7AA" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dots inside bubble */}
      <circle cx="14" cy="28" r="2.5" fill="#FB923C" />
      <circle cx="21" cy="28" r="2.5" fill="#FB923C" />
      <circle cx="28" cy="28" r="2.5" fill="#FB923C" />

      {/* ── Paper airplane flying out to top-right ── */}
      {/* Dotted curved trail */}
      <path d="M72 62 Q82 46 90 34" stroke="#FB923C" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" fill="none" />
      {/* Plane body */}
      <path d="M86 26 L74 36 L78 42 L86 26Z" fill="#F97316" />
      <path d="M86 26 L96 38 L78 42 L86 26Z" fill="#FDBA74" />
      <path d="M86 26 L74 36 L96 38 L86 26Z" fill="#FB923C" />
    </svg>
  );
}

/** Purple paper airplane for STAY IN THE LOOP card top-right */
function PurplePlaneIllustration() {
  return (
    <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="72" aria-hidden>
      {/* Dotted curved trail */}
      <path d="M10 60 Q28 42 44 24" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" fill="none" />
      {/* Small sparkle top-left */}
      <circle cx="6" cy="52" r="2" fill="#C4B5FD" fillOpacity="0.6" />
      {/* Plane */}
      <path d="M52 16 L34 30 L40 38 L52 16Z" fill="#7C3AED" />
      <path d="M52 16 L68 30 L40 38 L52 16Z" fill="#C4B5FD" />
      <path d="M52 16 L34 30 L68 30 L52 16Z" fill="#8B5CF6" />
    </svg>
  );
}


