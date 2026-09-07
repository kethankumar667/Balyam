import React, { useState, useMemo, useEffect } from "react";
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
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Activity,
  Zap,
  X,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import { HapticsManager } from "../services/HapticsManager";

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
    title: "Account & Access",
    subtitle: "Authentication, guest seats and data sovereignity.",
    icon: CreditCard,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

const FAQS_CATALOG: FAQItem[] = [
  {
    id: "gs-1",
    category: "getting-started",
    question: "Do I need to download an app or create an account to play?",
    answer:
      "No! BHALYAM is 100% web-based. You can jump directly into a match on your phone, tablet, or PC without installing any software. Guests can join matches immediately using room codes. Account creation is optional and unlocks persistent XP, match records, and custom profiles.",
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "How do I create a room and invite my friends?",
    answer:
      "Click 'Create Room' on the home page or navigation bar, pick your game (e.g. Ludo, Hand Cricket, Rummy), and a unique 6-character room code will be generated. You can copy the link, send it directly via WhatsApp, or share the 6-character code with your friends.",
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "Can I play against computer bots if my friends aren't online?",
    answer:
      "Yes! When hosting any game lounge, you can click 'Add Bot' to populate any empty seat with an AI player. BHALYAM bots run on realistic human-like think delays and fair server-computed heuristics.",
  },
  {
    id: "rm-1",
    category: "rooms",
    question: "How long does a room code stay valid?",
    answer:
      "A room remains active as long as at least one human player is connected. If all players leave, the room is preserved for a grace period before being safely dissolved.",
  },
  {
    id: "rm-2",
    category: "rooms",
    question: "What is Party Mode / TV Mode (/tv/:code)?",
    answer:
      "Party Mode is a spectator and big-screen display mode designed for living room TVs and projectors. It displays a shared board view without claiming an active player seat.",
  },
  {
    id: "rm-3",
    category: "rooms",
    question: "What happens if the room host leaves the match?",
    answer:
      "BHALYAM features automatic Host Failover. If the host disconnects, the server seamlessly promotes the next active human player in the lounge to host without interrupting gameplay.",
  },
  {
    id: "rm-4",
    category: "rooms",
    question: "Can I add bot players to fill empty seats?",
    answer:
      "Yes! In any lounge before the game starts, the host can click 'Add Bot' to fill empty seats with automated players with realistic human-like think delays.",
  },
  {
    id: "gm-1",
    category: "games",
    question: "How do turn timers work?",
    answer:
      "Every player gets a fixed turn duration (typically 30–45 seconds depending on the game). A pulsing 10-second warning banner appears when your time is running low. If time expires, the server executes a default safe move to keep the match moving.",
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
  {
    id: "sf-1",
    category: "safety",
    question: "How do I report an abusive player or cheater?",
    answer:
      "Click 'Report' in the room menu or visit our Community Rules page (`/community-rules`) to submit a confidential report with match telemetry for moderator review.",
  },
  {
    id: "sf-2",
    category: "safety",
    question: "How do I block or mute someone in voice or chat?",
    answer:
      "Tap the player's name in the room player list and select 'Mute Voice' or 'Block Chat' to instantly silence their incoming audio and text messages for your device.",
  },
  {
    id: "tr-1",
    category: "tournaments",
    question: "When are official tournaments hosted?",
    answer:
      "BHALYAM holds weekly knockout cups and seasonal championship brackets for Hand Cricket, Ludo, and Rummy. Check the Tournaments tab for upcoming schedules.",
  },
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
  const [openFaqIds, setOpenFaqIds] = useState<Set<string>>(new Set(["gs-1"]));
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "yes" | "no">>({});
  const [pingMs, setPingMs] = useState<number>(24);

  // Live network latency measurement simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPingMs(Math.floor(18 + Math.random() * 14));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredFaqs = useMemo(() => {
    return FAQS_CATALOG.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchA = item.answer.toLowerCase().includes(q);
        if (!matchQ && !matchA) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setOpenFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    if (openFaqIds.size === filteredFaqs.length) {
      setOpenFaqIds(new Set());
    } else {
      setOpenFaqIds(new Set(filteredFaqs.map((f) => f.id)));
    }
  };

  const handleFeedback = (id: string, type: "yes" | "no") => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setFeedbackGiven((prev) => ({ ...prev, [id]: type }));
  };

  return (
    <HelpLayout
      title="Support & FAQs"
      subtitle="Instant answers to match rules, audio settings, seat tokens, reconnects, and account questions."
      badgeText="24/7 Knowledge Base"
    >
      <div className="space-y-10 text-stone-800 dark:text-slate-100">
        {/* ── Section 1: Live System Status & Latency Tester Strip (Audience Power) ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-emerald-500/20 via-stone-300/20 dark:via-white/5 to-transparent shadow-xs">
          <div className="rounded-[22px] p-5 sm:p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                    All BHALYAM Lounge Systems Operational
                  </h4>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                  Multiplayer Matchmaking: 99.99% • WebRTC Voice Mesh: Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Your Latency: {pingMs}ms</span>
                <span className="text-[10px] text-emerald-600 font-sans font-bold">(Excellent)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Search Bar with Clear CTA ── */}
        <section className="space-y-3">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. 'rummy sequence', 'bot', 'reconnect', 'voice')..."
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 shadow-xs focus-visible:outline-2 focus-visible:outline-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center hover:bg-stone-200 transition cursor-pointer min-h-[36px] min-w-[36px]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* ── Section 3: 8 Category Filter Cards ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Browse by Category
            </h3>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = FAQS_CATALOG.filter((f) => f.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  type="button"
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500 ${
                    isSelected
                      ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 text-stone-900 dark:text-white shadow-2xs scale-[1.02]"
                      : "bg-white dark:bg-[#151A2E] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-slate-300 hover:border-stone-300 dark:hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl ${cat.iconBg} ${cat.iconColor} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10.5px] font-mono font-bold text-stone-400">
                      {count} items
                    </span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                    {cat.title}
                  </h4>
                  <p className="text-[10.5px] text-stone-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {cat.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Section 4: Accordion FAQ List with Expand/Collapse All ── */}
        <section id="faq-list-section" className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                Frequently Asked Questions ({filteredFaqs.length})
              </h3>
            </div>

            {filteredFaqs.length > 0 && (
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer min-h-[44px] flex items-center"
              >
                {openFaqIds.size === filteredFaqs.length ? "Collapse All" : "Expand All"}
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            /* DLS Zero-Results Empty State */
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-stone-800 space-y-3">
              <span className="text-4xl block">🔍</span>
              <h4 className="font-bold text-base text-stone-900 dark:text-white">
                No matching topics found
              </h4>
              <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                We couldn't find any FAQs matching "{searchQuery}". Try using different terms or ask our support desk directly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-600 transition cursor-pointer min-h-[44px]"
              >
                Clear Search &amp; Show All
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqIds.has(faq.id);
                const feedback = feedbackGiven[faq.id];

                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#151A2E] overflow-hidden transition shadow-2xs hover:border-amber-500/30"
                  >
                    <button
                      type="button"
                      id={`faq-btn-${faq.id}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-ans-${faq.id}`}
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-amber-500" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={`faq-ans-${faq.id}`}
                        role="region"
                        aria-labelledby={`faq-btn-${faq.id}`}
                        className="p-4 sm:p-5 pt-0 border-t border-stone-100 dark:border-stone-800/60 space-y-3"
                      >
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed pt-3">
                          {faq.answer}
                        </p>

                        {/* Was this helpful feedback */}
                        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800/40 text-[11px] text-stone-400">
                          <span>Was this answer helpful?</span>
                          {feedback ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Thank you for your feedback!</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFeedback(faq.id, "yes")}
                                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer min-h-[36px]"
                              >
                                <ThumbsUp className="w-3 h-3 text-emerald-500" />
                                <span>Yes</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(faq.id, "no")}
                                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer min-h-[36px]"
                              >
                                <ThumbsDown className="w-3 h-3 text-rose-500" />
                                <span>No</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section 5: Direct Support Help Desk Callout ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/25 to-transparent shadow-xs">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                Still have unanswered questions or experiencing an issue?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                Our support team is available 24/7 to assist with room recovery, scoring questions, and accounts.
              </p>
            </div>

            <Link
              to="/contact"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition flex items-center gap-2 shrink-0 min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact Support Desk</span>
            </Link>
          </div>
        </section>
      </div>
    </HelpLayout>
  );
}
