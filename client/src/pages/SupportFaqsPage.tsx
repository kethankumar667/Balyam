import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Rocket,
  Home,
  Gamepad2,
  User,
  Mic,
  Shield,
  Trophy,
  CreditCard,
  HelpCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  Scale,
  Users2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

interface CategoryMeta {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    subtitle: "New to BHALYAM? Learn the basics.",
    icon: Rocket,
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "rooms",
    title: "Lounges & Rooms",
    subtitle: "Create, join, and manage rooms with friends.",
    icon: Home,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "games",
    title: "Games & Turns",
    subtitle: "Game rules, turns, scoring and gameplay.",
    icon: Gamepad2,
    iconBg: "bg-orange-100 dark:bg-orange-950/60",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "profile",
    title: "Profile & XP",
    subtitle: "Profile, XP, level up, achievements and more.",
    icon: User,
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "technical",
    title: "Technical & Voice",
    subtitle: "Fix technical issues and voice chat problems.",
    icon: Mic,
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "safety",
    title: "Safety & Reports",
    subtitle: "Reporting, blocking and community safety.",
    icon: Shield,
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "tournaments",
    title: "Tournaments",
    subtitle: "Tournaments, rewards and leaderboards.",
    icon: Trophy,
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "account",
    title: "Account & Billing",
    subtitle: "Account, password and billing related help.",
    icon: CreditCard,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

const FAQS_CATALOG: FAQItem[] = [
  // ── Getting Started ──
  {
    id: "gs-1",
    category: "getting-started",
    question: "Do I need an account to play BHALYAM?",
    answer:
      "No! BHALYAM is open to all visitors. As a guest, you can immediately join any room code, play solo vs bots, run pass & play seats on your phone, and enjoy voice chat. Creating a free Member account unlocks hosting shareable rooms, tracking lifetime XP & achievements, and participating in weekly tournaments.",
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "How do I start my very first game?",
    answer:
      "From the Home page or Games catalog, click on any game tile (e.g. Hand Cricket or Ludo), choose 'Play Solo vs Bot' or 'Create Room', and you will enter your private lounge in less than two seconds.",
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "Can I play on my mobile phone browser?",
    answer:
      "Yes! BHALYAM is 100% responsive and optimized for mobile touchscreens (Chrome, Safari, Firefox). All touch targets meet the 44x44px accessibility standard, and games like Rummy include touch drag-and-drop card ordering.",
  },

  // ── Lounges & Rooms ──
  {
    id: "rm-1",
    category: "rooms",
    question: "How do I create and share a room with friends?",
    answer:
      "Click 'Create Room' on any game, pick your room settings (e.g. 2-player or 4-player), and you'll receive a 6-character room code. Tap 'Share Invite' to send a direct WhatsApp link or copy the room URL.",
  },
  {
    id: "rm-2",
    category: "rooms",
    question: "How do I join someone else's room?",
    answer:
      "Click 'Join Room' on the top navigation, type the 6-character room code (e.g. LUDO99), and you will immediately land in their lounge.",
  },
  {
    id: "rm-3",
    category: "rooms",
    question: "What happens if the room host leaves the match?",
    answer:
      "BHALYAM features automatic Host Failover. If the host disconnects or leaves, the server seamlessly promotes the next active human player in the lounge to host without interrupting gameplay.",
  },
  {
    id: "rm-4",
    category: "rooms",
    question: "Can I add bot players to fill empty seats?",
    answer:
      "Yes! In any lounge before the game starts, the host can click 'Add Bot' to fill empty seats with automated players with realistic human-like think delays.",
  },

  // ── Games & Turns ──
  {
    id: "gm-1",
    category: "games",
    question: "How do turn timers work?",
    answer:
      "Every player gets a fixed turn duration (typically 30–45 seconds depending on the game). A pulsing 10-second warning banner appears when your time is running low. If time expires, the server executes a default safe move (or auto-roll in Ludo) to keep the match moving.",
  },
  {
    id: "gm-2",
    category: "games",
    question: "What happens if I disconnect in the middle of a match?",
    answer:
      "Your seat is held for 600 seconds (10 minutes) via a server-signed cryptographic seatToken. Simply reopen the link or re-enter the room code on your device to immediately resume your turn and cards.",
  },
  {
    id: "gm-3",
    category: "games",
    question: "Can a bot replace me if my network drops?",
    answer:
      "Yes! While you are disconnected, a temporary background bot will keep your seat active so other players aren't forced to wait. The moment you reconnect, you regain full manual control of your seat.",
  },
  {
    id: "gm-4",
    category: "games",
    question: "How does 'Pass & Play' work on a single device?",
    answer:
      "Pass & Play lets multiple friends play on one shared phone or laptop. A privacy intermission screen ('Pass the phone to...') shields hidden hands between turns in games like Rummy and Hand Cricket.",
  },

  // ── Profile & XP ──
  {
    id: "pf-1",
    category: "profile",
    question: "How do I earn Experience Points (XP) and level up?",
    answer:
      "You earn XP by completing matches, winning games, maintaining win streaks, and unlocking achievements. Leveling up unlocks prestigious profile borders and badges.",
  },
  {
    id: "pf-2",
    category: "profile",
    question: "How do achievements work?",
    answer:
      "BHALYAM features 25 childhood and competitive achievements across Progression, Skill, Resilience, and Social categories. Progress is automatically tracked on the server.",
  },
  {
    id: "pf-3",
    category: "profile",
    question: "Can I customize my display name and avatar?",
    answer:
      "Yes! Head to your Profile page (`/profile/personal`) or tap your avatar in the sidebar to choose from nostalgic Indian schoolboy and schoolgirl avatars or update your display name.",
  },

  // ── Technical & Voice ──
  {
    id: "tc-1",
    category: "technical",
    question: "How does in-room Voice Chat work?",
    answer:
      "BHALYAM uses peer-to-peer WebRTC mesh voice calling. Audio is transmitted directly between players and is NEVER recorded, stored, or processed on our servers.",
  },
  {
    id: "tc-2",
    category: "technical",
    question: "The game appears stuck or disconnected. What should I do?",
    answer:
      "First, check your internet connection. You can refresh your browser page at any time — the platform's ConnectionStateManager will automatically re-attach your seat to the active room.",
  },

  // ── Safety & Reports ──
  {
    id: "sf-1",
    category: "safety",
    question: "How do I report an abusive player or cheater?",
    answer:
      "Click 'Report' in the room menu or visit our Contact Us page (`/contact`) to submit a confidential report with match telemetry for moderator review.",
  },
  {
    id: "sf-2",
    category: "safety",
    question: "How do I block or mute someone in voice or chat?",
    answer:
      "Tap the player's name in the room player list and select 'Mute Voice' or 'Block Chat' to instantly silence their incoming audio and text messages for your device.",
  },

  // ── Tournaments ──
  {
    id: "tr-1",
    category: "tournaments",
    question: "When are official tournaments hosted?",
    answer:
      "BHALYAM holds weekly knockout cups and seasonal championship brackets for Hand Cricket, Ludo, and Rummy. Check the Tournaments tab for upcoming schedules.",
  },

  // ── Account & Billing ──
  {
    id: "ac-1",
    category: "account",
    question: "Is BHALYAM free to play?",
    answer:
      "Yes, 100% free! All 16+ multiplayer and retro games, lobbies, bots, and voice chat are completely free for all players.",
  },
  {
    id: "ac-2",
    category: "account",
    question: "How do I reset my password?",
    answer:
      "Visit the Forgot Password page (`/forgot-password`), enter your registered email, and you'll receive a secure password reset link within seconds.",
  },
];

export default function SupportFaqsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("gs-1");

  const filteredFaqs = FAQS_CATALOG.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQ = item.question.toLowerCase().includes(q);
      const matchA = item.answer.toLowerCase().includes(q);
      if (!matchQ && !matchA) return false;
    }
    return true;
  });

  const toggleFaq = (id: string) => {
    setOpenFaqId((curr) => (curr === id ? null : id));
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
    // Scroll down to the FAQs section
    const faqSection = document.getElementById("faq-list-section");
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper auth-shell py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12">
          {/* ── 1. HERO CARD (Dark Navy Gradient with 3D Support Illustration) ── */}
          <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-r from-[#0C1022] via-[#161D3A] to-[#1E1738] p-6 sm:p-10 lg:p-12 shadow-2xl border border-slate-800">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Left Column: Heading + Subtitle + Search */}
              <div className="max-w-xl text-left space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-white tracking-tight leading-tight">
                  How can we <span className="text-[#F97316]">help</span> you?
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-md">
                  Find answers to room codes, game rules, accounts, voice chat, and more.
                </p>

                {/* White Rounded Search Box */}
                <div className="pt-2 relative max-w-md">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search BHALYAM help, rules, room codes, voice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white text-slate-900 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-md transition"
                  />
                </div>
              </div>

              {/* Right Column: 3D Headset Support Graphic */}
              <div className="hidden md:flex flex-shrink-0 relative items-center justify-center w-52 h-44 lg:w-64 lg:h-52">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Floating Paper Airplane with Dash Trail */}
                  <div className="absolute -top-2 right-4 rotate-12 z-20 drop-shadow-md">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                        stroke="#FBBF24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="#F59E0B"
                        fillOpacity="0.2"
                      />
                    </svg>
                  </div>

                  {/* 3D Headset Illustration SVG */}
                  <svg
                    viewBox="0 0 200 200"
                    className="w-44 h-44 lg:w-52 lg:h-52 drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="bandGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#4C1D95" />
                        <stop offset="50%" stopColor="#2E1065" />
                        <stop offset="100%" stopColor="#1E1B4B" />
                      </linearGradient>
                      <linearGradient id="bubbleGrad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FB923C" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                      <linearGradient id="cupGrad" x1="0" y1="0" x2="40" y2="60" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#581C87" />
                        <stop offset="100%" stopColor="#1E1B4B" />
                      </linearGradient>
                      <linearGradient id="goldRim" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>
                    </defs>

                    {/* Headband Arc */}
                    <path
                      d="M36 110 C36 45, 164 45, 164 110"
                      stroke="url(#bandGrad)"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M36 110 C36 48, 164 48, 164 110"
                      stroke="#A855F7"
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />

                    {/* Left Earcup */}
                    <rect x="22" y="96" width="30" height="52" rx="15" fill="url(#cupGrad)" stroke="url(#goldRim)" strokeWidth="2.5" />
                    <rect x="27" y="104" width="12" height="36" rx="6" fill="#172554" />

                    {/* Right Earcup */}
                    <rect x="148" y="96" width="30" height="52" rx="15" fill="url(#cupGrad)" stroke="url(#goldRim)" strokeWidth="2.5" />
                    <rect x="161" y="104" width="12" height="36" rx="6" fill="#172554" />

                    {/* Microphone Stem */}
                    <path
                      d="M152 140 C140 170, 115 175, 95 168"
                      stroke="url(#goldRim)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <circle cx="92" cy="167" r="7" fill="#EA580C" stroke="#FDE68A" strokeWidth="1.5" />

                    {/* Glowing Orange Chat Bubble in the middle */}
                    <g transform="translate(68, 76)">
                      <rect width="64" height="46" rx="14" fill="url(#bubbleGrad)" filter="drop-shadow(0 6px 16px rgba(234, 88, 12, 0.45))" />
                      <path d="M22 46 L18 55 L32 46 Z" fill="#EA580C" />
                      {/* 3 Message dots */}
                      <circle cx="20" cy="23" r="3.5" fill="#FFFFFF" />
                      <circle cx="32" cy="23" r="3.5" fill="#FFFFFF" />
                      <circle cx="44" cy="23" r="3.5" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. BROWSE BY CATEGORY SECTION ── */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base">
              <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center text-[#F97316]">
                <Users2 className="w-3.5 h-3.5" />
              </div>
              <span>Browse by category</span>
            </div>

            {/* 8 Category Cards Grid (4x2 on Desktop, 2x4 on Tablet, 1x8 on Mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group flex flex-col justify-between ${
                      isSelected
                        ? "bg-white dark:bg-[#151A2E] border-amber-500 ring-2 ring-amber-500/20 shadow-md"
                        : "bg-white dark:bg-[#151A2E] border-[#EFEBE4] dark:border-[#222A44] hover:border-amber-500/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.iconBg} ${cat.iconColor} transition-transform group-hover:scale-105`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {cat.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. FREQUENTLY ASKED QUESTIONS SECTION ── */}
          <div id="faq-list-section" className="space-y-4 text-left pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base">
                <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center text-[#F97316]">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>Frequently asked questions</span>
                {selectedCategory && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.title}
                  </span>
                )}
              </div>

              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View all FAQs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Accordion List */}
            <div className="space-y-2.5">
              {filteredFaqs.length === 0 ? (
                /* No Results State */
                <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <Search className="w-7 h-7 opacity-70" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      No answers found for "{searchQuery}"
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Try another search or browse through our category sections.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Browse All FAQs
                    </button>
                    <Link
                      to="/contact"
                      className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      <span>Contact Support</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl overflow-hidden shadow-2xs transition"
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full p-4 sm:p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#EA580C] flex items-center justify-center shrink-0">
                            <Users2 className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {faq.question}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                            isOpen ? "rotate-180 text-amber-500" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-[#F5F2EC] dark:border-[#202740]">
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium pl-10">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Lightbulb Hint */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-xs text-slate-600 dark:text-slate-400">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Can't find what you're looking for? Try different keywords or browse by category.
              </span>
            </div>
          </div>

          {/* ── 4. STILL NEED A HAND? SUPPORT BANNER CARD ── */}
          <div className="relative overflow-hidden rounded-[28px] border border-[#DDD6FE]/70 dark:border-purple-800/30 bg-gradient-to-r from-[#EDE9FE]/80 via-[#F3E8FF]/60 to-[#E0E7FF]/70 dark:from-[#1E1B4B]/35 dark:via-[#1A1835]/40 dark:to-[#0F172A]/40 p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            {/* Left Column: Envelope 3D Graphic + Text */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left">
              {/* Mail / Envelope Icon Graphic */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 relative">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7.00005C4 5.89548 4.89543 5.00005 6 5.00005H18C19.1046 5.00005 20 5.89548 20 7.00005V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7.00005Z"
                    fill="#8B5CF6"
                    fillOpacity="0.25"
                    stroke="#8B5CF6"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M4 7L12 13L20 7"
                    stroke="#8B5CF6"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  1
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Still need a hand?
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md">
                  Our support team is ready to help you. Reach out and we'll get back to you soon.
                </p>
              </div>
            </div>

            {/* Right Column: Orange Pill CTA Button + Response Time */}
            <div className="flex flex-col items-center md:items-end shrink-0 space-y-1.5 w-full sm:w-auto">
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-black px-7 py-3 rounded-full text-xs sm:text-sm shadow-md hover:shadow-orange-500/25 transition min-h-[44px]"
              >
                <span>Contact BHALYAM Support</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>We usually reply within 24 hours</span>
              </div>
            </div>
          </div>

          {/* ── 5. BOTTOM 4-ITEM TRUST & SAFETY GRID ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-[#E8DFC8] dark:border-slate-800 text-left">
            {/* 1. Safe & Friendly Community */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#EA580C] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Safe & Friendly Community
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  We keep BHALYAM fun and safe for everyone.
                </p>
              </div>
            </div>

            {/* 2. Fair Play */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#EA580C] shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Fair Play
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  Cheating is not allowed. Let's play fair and square.
                </p>
              </div>
            </div>

            {/* 3. Respect Everyone */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#EA580C] shrink-0">
                <Users2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Respect Everyone
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  Be kind, supportive and enjoy together.
                </p>
              </div>
            </div>

            {/* 4. Need urgent help? */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#EA580C] shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Need urgent help?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                  For safety issues, report a player immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
