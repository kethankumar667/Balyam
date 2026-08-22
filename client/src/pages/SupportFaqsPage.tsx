import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Gamepad2,
  Users,
  Wifi,
  User,
  Trophy,
  Wrench,
  Shield,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS_CATALOG: FAQItem[] = [
  // ── Getting Started ──
  {
    id: "gs-1",
    category: "getting-started",
    question: "Do I need an account to play BHALYAM?",
    answer: "No! BHALYAM is open to all visitors. As a guest, you can immediately join any room code, play solo vs bots, run pass & play seats on your phone, and enjoy voice chat. Creating a free Member account unlocks hosting shareable rooms, tracking lifetime XP & achievements, and participating in weekly tournaments.",
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "How do I start my very first game?",
    answer: "From the Home page or Games catalog, click on any game tile (e.g. Hand Cricket or Ludo), choose 'Play Solo vs Bot' or 'Create Room', and you will enter your private lounge in less than two seconds.",
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "Can I play on my mobile phone browser?",
    answer: "Yes! BHALYAM is 100% responsive and optimized for mobile touchscreens (Chrome, Safari, Firefox). All touch targets meet the 44x44px accessibility standard, and games like Rummy include touch drag-and-drop card ordering.",
  },

  // ── Rooms & Multiplayer ──
  {
    id: "rm-1",
    category: "rooms",
    question: "How do I create and share a room with friends?",
    answer: "Click 'Create Room' on any game, pick your room settings (e.g. 2-player or 4-player), and you'll receive a 6-character room code. Tap 'Share Invite' to send a direct WhatsApp link or copy the room URL.",
  },
  {
    id: "rm-2",
    category: "rooms",
    question: "How do I join someone else's room?",
    answer: "Click 'Join Room' on the top navigation, type the 6-character room code (e.g. LUDO99), and you will immediately land in their lounge.",
  },
  {
    id: "rm-3",
    category: "rooms",
    question: "What happens if the room host leaves the match?",
    answer: "BHALYAM features automatic Host Failover. If the host disconnects or leaves, the server seamlessly promotes the next active human player in the lounge to host without interrupting gameplay.",
  },
  {
    id: "rm-4",
    category: "rooms",
    question: "Can I add bot players to fill empty seats?",
    answer: "Yes! In any lounge before the game starts, the host can click 'Add Bot' to fill empty seats with automated players with realistic human-like think delays.",
  },

  // ── Games & Turns ──
  {
    id: "gm-1",
    category: "games",
    question: "How do turn timers work?",
    answer: "Every player gets a fixed turn duration (typically 30–45 seconds depending on the game). A pulsing 10-second warning banner appears when your time is running low. If time expires, the server executes a default safe move (or auto-roll in Ludo) to keep the match moving.",
  },
  {
    id: "gm-2",
    category: "games",
    question: "What happens if I disconnect in the middle of a match?",
    answer: "Your seat is held for 600 seconds (10 minutes) via a server-signed cryptographic seatToken. Simply reopen the link or re-enter the room code on your device to immediately resume your turn and cards.",
  },
  {
    id: "gm-3",
    category: "games",
    question: "Can a bot replace me if my network drops?",
    answer: "Yes! While you are disconnected, a temporary background bot will keep your seat active so other players aren't forced to wait. The moment you reconnect, you regain full manual control of your seat.",
  },
  {
    id: "gm-4",
    category: "games",
    question: "How does 'Pass & Play' work on a single device?",
    answer: "Pass & Play lets multiple friends play on one shared phone or laptop. A privacy intermission screen ('Pass the phone to...') shields hidden hands between turns in games like Rummy and Hand Cricket.",
  },

  // ── Profile & Progression ──
  {
    id: "pf-1",
    category: "profile",
    question: "How do I earn Experience Points (XP) and level up?",
    answer: "You earn XP by completing matches, winning games, maintaining win streaks, and unlocking achievements. Leveling up unlocks prestigious profile borders and badges.",
  },
  {
    id: "pf-2",
    category: "profile",
    question: "How do achievements work?",
    answer: "BHALYAM features 25 childhood and competitive achievements across Progression, Skill, Resilience, and Social categories. Progress is automatically tracked on the server.",
  },
  {
    id: "pf-3",
    category: "profile",
    question: "Can I customize my display name and avatar?",
    answer: "Yes! Head to your Profile page (`/profile/personal`) or tap your avatar in the sidebar to choose from nostalgic Indian schoolboy and schoolgirl avatars or update your display name.",
  },

  // ── Technical & Safety ──
  {
    id: "tc-1",
    category: "technical",
    question: "How does in-room Voice Chat work?",
    answer: "BHALYAM uses peer-to-peer WebRTC mesh voice calling. Audio is transmitted directly between players and is NEVER recorded, stored, or processed on our servers.",
  },
  {
    id: "tc-2",
    category: "technical",
    question: "The game appears stuck or disconnected. What should I do?",
    answer: "First, check your internet connection. You can refresh your browser page at any time — the platform's ConnectionStateManager will automatically re-attach your seat to the active room.",
  },
  {
    id: "tc-3",
    category: "safety",
    question: "How do I report an abusive player or cheater?",
    answer: "Click 'Report' in the room menu or visit our Community Rules page (`/community-rules`) to submit a confidential report with match telemetry for moderator review.",
  },
  {
    id: "tc-4",
    category: "safety",
    question: "How do I block or mute someone in voice or chat?",
    answer: "Tap the player's name in the room player list and select 'Mute Voice' or 'Block Chat' to instantly silence their incoming audio and text messages for your device.",
  },
];

const CATEGORY_TABS = [
  { id: "all", label: "All Questions", icon: HelpCircle },
  { id: "getting-started", label: "Getting Started", icon: Sparkles },
  { id: "rooms", label: "Lounges & Rooms", icon: Users },
  { id: "games", label: "Games & Turns", icon: Gamepad2 },
  { id: "profile", label: "Profile & XP", icon: User },
  { id: "technical", label: "Technical & Voice", icon: Wrench },
  { id: "safety", label: "Safety & Reports", icon: Shield },
];

export default function SupportFaqsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("gs-1");

  const filteredFaqs = FAQS_CATALOG.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
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

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* ── Page Hero ── */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#EA580C] text-xs font-bold font-mono uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help Center & Knowledge Base</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              How can we <span className="text-[#EA580C]">help you?</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              Find answers to room codes, game rules, reconnection, accounts, and safety.
            </p>

            {/* Search Input */}
            <div className="pt-2 max-w-lg mx-auto relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search BHALYAM help, rules, room codes, voice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm transition font-medium"
              />
            </div>
          </div>

          {/* ── Category Filter Pills ── */}
          <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-sm"
                      : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── FAQ Accordion Catalog ── */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              /* ── Search -> No Results Escalation ── */
              <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <Search className="w-8 h-8 opacity-70" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    No answers found for "{searchQuery}"
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Try another search or browse through our category sections.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("all");
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Browse All FAQs
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 max-w-sm mx-auto space-y-2.5">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Still can't find an answer?
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-600 text-white font-bold text-xs shadow-md transition"
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
                    className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl overflow-hidden shadow-xs transition"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                          isOpen ? "rotate-180 text-amber-500" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 border-t border-[#F3EFE9] dark:border-[#202740]">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Dedicated Support CTA Card ("Still need a hand?") ── */}
          <div className="mt-8 relative overflow-hidden rounded-3xl border border-[#D4A574]/40 dark:border-purple-500/30 bg-gradient-to-br from-[#FAF5EE] via-[#FDFBF7] to-[#F5EBE1] dark:from-[#13172B] dark:via-[#1A1F38] dark:to-[#0F1322] p-8 sm:p-12 text-center shadow-xl">
            {/* Ambient Flares */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl mx-auto space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-[11px] font-black font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Support Escalation
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Still need a hand?
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                  Didn't find what you were looking for? Our team is here to help you troubleshoot, report issues, or answer questions.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-black px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition shadow-lg hover:shadow-orange-500/25 min-h-[44px]"
                >
                  <span>Contact BHALYAM Support</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Usually we respond within <strong className="text-amber-600 dark:text-amber-400">24 hours</strong>.
              </p>
            </div>
          </div>

          {/* ── Helpful Quick Links Strip ── */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500">Helpful Links:</span>
            <Link to="/how-to-play" className="hover:text-amber-600 dark:hover:text-amber-400 transition">How to Play</Link>
            <span>•</span>
            <Link to="/community-rules" className="hover:text-amber-600 dark:hover:text-amber-400 transition">Community Rules</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-amber-600 dark:hover:text-amber-400 transition">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-amber-600 dark:hover:text-amber-400 transition">Terms of Service</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
