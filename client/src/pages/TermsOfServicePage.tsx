import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Scale,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Mail,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Search,
  Menu,
  X,
  ShieldCheck,
  Gamepad2,
  Users,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import { HapticsManager } from "../services/HapticsManager";

const TERMS_SECTIONS = [
  { id: "about", title: "1. About BHALYAM", summary: "Web-based nostalgic multiplayer gaming lounge operating on zero real-money stakes." },
  { id: "eligibility", title: "2. Eligibility & Age Requirements", summary: "Open to players of all ages; under-13 require guardian consent." },
  { id: "account", title: "3. User Accounts & Responsibilities", summary: "Guests can play immediately; members receive persistent cloud profiles." },
  { id: "content", title: "4. User Content & Names", summary: "Player nicknames and avatars must remain wholesome and family-friendly." },
  { id: "gameplay", title: "5. Games & Server Authority", summary: "All turns, rolls, and cards are computed authoritatively on our secure server." },
  { id: "multiplayer", title: "6. Multiplayer Rooms, Hosts & Bots", summary: "Hosts manage room options; automated bots can fill empty seats on request." },
  { id: "progress", title: "7. Achievements, XP & Non-Monetary Honors", summary: "XP, trophies, and badges carry purely commemorative and social value." },
  { id: "tournaments", title: "8. Tournaments & Rankings", summary: "Community knockout cups are skill-based and free to enter." },
  { id: "prohibited", title: "9. Prohibited Conduct", summary: "Zero tolerance for automated move bots, hate speech, toxicity, and chat abuse." },
  { id: "ip", title: "10. Intellectual Property", summary: "BHALYAM platform code, logos, and artwork are protected proprietary assets." },
  { id: "third-party", title: "11. Third-Party Integrations", summary: "Optional Supabase auth and WebRTC signaling protocols." },
  { id: "termination", title: "12. Suspension & Termination", summary: "We reserve the right to sanction or ban seats violating community standards." },
  { id: "disclaimers", title: "13. Disclaimers", summary: "Platform provided on an 'as-is' and 'as-available' operational basis." },
  { id: "liability", title: "14. Limitation of Liability", summary: "Standard limitations covering free recreation services." },
  { id: "changes", title: "15. Changes to Terms", summary: "Revisions signaled via effective date updates at the top of this agreement." },
  { id: "governing-law", title: "16. Governing Law", summary: "Governed by the applicable laws of India." },
  { id: "contact", title: "17. Contact & Legal Notices", summary: "Official communication channels for legal and administrative inquiries." },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("about");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Active scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (let i = TERMS_SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TERMS_SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(TERMS_SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setActiveSection(id);
    setMobileTocOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCopySectionLink = (id: string) => {
    try {
      HapticsManager.getInstance().subtle();
      const url = `${window.location.origin}/terms#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    window.print();
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return TERMS_SECTIONS;
    const q = searchQuery.toLowerCase();
    return TERMS_SECTIONS.filter(
      (sec) => sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <HelpLayout
      title="Terms of Service"
      subtitle="The rules for playing together in our digital lounge. 100% free, zero monetary wagering."
      badgeText="Platform Terms"
    >
      <div className="space-y-8 text-stone-800 dark:text-slate-100">
        {/* ── Section 1: Header Metadata & Print Button ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 via-stone-300/20 dark:via-white/5 to-transparent shadow-xs">
          <div className="rounded-[22px] p-5 sm:p-7 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>8 MIN READ • 3,200 WORDS</span>
                <span>•</span>
                <span>EFFECTIVE: AUGUST 22, 2026</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                BHALYAM <span className="text-[#EA580C]">Terms of Service</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                Clear, straightforward agreements for all veranda table guests and members.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Copy</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 2: The 4 Non-Negotiables Executive Strip (Audience Power) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 space-y-1.5">
              <span className="text-2xl">🎮</span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">100% Free Forever</h4>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                Zero entry fees, zero microtransactions, and zero monetary wagering.
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-emerald-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 space-y-1.5">
              <span className="text-2xl">🛡️</span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Server Authority</h4>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                Client devices never compute valid moves locally. Cheating is mathematically impossible.
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-sky-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 space-y-1.5">
              <span className="text-2xl">🤝</span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Sportsmanship First</h4>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                Toxicity, bullying, and abusive names trigger immediate seat token bans.
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-purple-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 space-y-1.5">
              <span className="text-2xl">❤️</span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Family Safe</h4>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                Wholesome recreation suitable for school alumni, cousins, and friends.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 3: Clause Search Bar ── */}
        <section className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clauses (e.g. 'bot', 'refund', 'seat token', 'termination')..."
            className="w-full pl-11 pr-11 py-2.5 rounded-2xl bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 shadow-2xs focus-visible:outline-2 focus-visible:outline-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center hover:bg-stone-200 transition cursor-pointer min-h-[36px] min-w-[36px]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </section>

        {/* ── Section 4: Document Layout (Desktop Sticky TOC + Content) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sticky Table of Contents */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24 space-y-3 bg-white dark:bg-[#111827] border border-stone-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xs uppercase tracking-wider text-stone-400">
                Terms Sections
              </h2>
              <span className="text-[10.5px] font-mono text-stone-400">{filteredSections.length} of 17</span>
            </div>
            <nav className="space-y-1 max-h-[65vh] overflow-y-auto [scrollbar-width:none]">
              {filteredSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  type="button"
                  className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] flex items-center justify-between ${
                    activeSection === sec.id
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border-l-2 border-amber-500"
                      : "text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Legal Document Content */}
          <div className="lg:col-span-8 bg-white dark:bg-[#111827] border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-xs space-y-10 text-stone-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
            {filteredSections.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <span className="text-3xl block">📑</span>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">
                  No matching clauses found
                </h4>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  No terms clauses matched "{searchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-600 transition cursor-pointer min-h-[44px]"
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => (
                <section key={sec.id} id={sec.id} className="space-y-3 scroll-mt-28">
                  <div className="flex items-center justify-between group">
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                      {sec.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopySectionLink(sec.id)}
                      title="Copy direct section link"
                      className="opacity-60 group-hover:opacity-100 text-stone-400 hover:text-amber-500 transition cursor-pointer p-1"
                    >
                      {copiedLink === sec.id ? (
                        <span className="text-[10px] text-emerald-500 font-bold">Copied!</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Summary pill */}
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 text-xs text-stone-600 dark:text-slate-300">
                    <strong className="font-bold text-stone-900 dark:text-white">Executive Summary: </strong>
                    <span>{sec.summary}</span>
                  </div>

                  {/* Body Content */}
                  {sec.id === "about" && (
                    <p>
                      BHALYAM provides real-time, browser-accessible multiplayer versions of nostalgic 90s Indian board games (including Ludo, Hand Cricket, Classic Rummy, Snakes & Ladders, UNO, Dots & Boxes, Word Building, and Bingo). All games operate for purely recreational enjoyment with zero financial stakes.
                    </p>
                  )}

                  {sec.id === "eligibility" && (
                    <p>
                      You must be of legal age in your jurisdiction or possess parental/guardian consent to use BHALYAM. By accessing our services, you affirm that your participation complies with all applicable local laws.
                    </p>
                  )}

                  {sec.id === "account" && (
                    <p>
                      Guest players are assigned a local device seatToken (`mpg.seats`). Registered members authenticate through Supabase sessions. You are solely responsible for maintaining the confidentiality of your credentials and all activities occurring under your seat.
                    </p>
                  )}

                  {sec.id === "content" && (
                    <p>
                      You retain ownership of any nickname, profile avatar, or chat messages you submit. However, you grant BHALYAM a royalty-free license to transmit this content in active match rooms. Display names deemed offensive, defamatory, or vulgar will be immediately overwritten.
                    </p>
                  )}

                  {sec.id === "gameplay" && (
                    <p>
                      All game rules, turn timers, dice outcomes, and card deck shuffles are computed authoritatively by our Node.js game engine. In the event of network latency or browser desynchronization, the server state shall prevail as the sole source of truth.
                    </p>
                  )}

                  {sec.id === "multiplayer" && (
                    <p>
                      Room hosts control table capacity and options. Disconnecting players are granted a 600-second (10-minute) cryptographic grace period to reconnect. Temporary background bots may execute safe moves during disconnections to prevent stalling.
                    </p>
                  )}

                  {sec.id === "progress" && (
                    <p>
                      Experience Points (XP), levels, match history, and unlocked achievements hold no real-world monetary value and cannot be exchanged, bartered, or redeemed for currency.
                    </p>
                  )}

                  {sec.id === "tournaments" && (
                    <p>
                      Tournament cups and leaderboard ranks are free and skill-based. Collusion, intentional disconnecting to preserve ratings, or using multiple accounts to manipulate tournament brackets will result in disqualification.
                    </p>
                  )}

                  {sec.id === "prohibited" && (
                    <p>
                      Users agree not to: (a) deploy automated bots, scrapers, or memory injectors, (b) harass or insult participants in chat or WebRTC voice, (c) reverse-engineer server protocols, or (d) publish private match information without consent.
                    </p>
                  )}

                  {sec.id === "ip" && (
                    <p>
                      All software, audio themes, visual assets, SVG boards, and logos comprising BHALYAM are the intellectual property of BHALYAM and its licensors, protected by copyright and intellectual property laws.
                    </p>
                  )}

                  {sec.id === "third-party" && (
                    <p>
                      Our services may reference third-party software (such as Supabase for database authentication and Google STUN servers for WebRTC). We are not responsible for the independent performance or policies of third-party vendors.
                    </p>
                  )}

                  {sec.id === "termination" && (
                    <p>
                      We reserve the right to suspend or permanently terminate any user account or cryptographic seat token immediately and without prior notice upon detection of cheating, toxic conduct, or violation of these Terms.
                    </p>
                  )}

                  {sec.id === "disclaimers" && (
                    <p>
                      BHALYAM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO UNINTERRUPTED ACCESSIBILITY OR FITNESS FOR A PARTICULAR PURPOSE.
                    </p>
                  )}

                  {sec.id === "liability" && (
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, BHALYAM AND ITS FOUNDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE PLATFORM.
                    </p>
                  )}

                  {sec.id === "changes" && (
                    <p>
                      We may revise these Terms of Service periodically. Continuing to access BHALYAM following posted updates constitutes full acceptance of the revised Terms.
                    </p>
                  )}

                  {sec.id === "governing-law" && (
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                    </p>
                  )}

                  {sec.id === "contact" && (
                    <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <p>
                        For legal questions, notices, or platform governance inquiries, please submit a communication via our{" "}
                        <Link to="/contact" className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
                          Support Desk
                        </Link>{" "}
                        or reach our administrators.
                      </p>
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        </div>

        {/* ── Mobile Floating Quick-Jump TOC Drawer Button (Audience Power) ── */}
        <div className="lg:hidden fixed bottom-6 left-6 z-40">
          <button
            type="button"
            onClick={() => setMobileTocOpen(true)}
            className="px-4 py-2.5 rounded-full bg-stone-900/90 dark:bg-amber-500 text-white dark:text-stone-950 font-bold text-xs shadow-xl border border-amber-500/30 flex items-center gap-2 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <Menu className="w-4 h-4" />
            <span>Jump to Clause</span>
          </button>
        </div>

        {/* Mobile Quick-Jump TOC Modal */}
        {mobileTocOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#151A2E] rounded-t-3xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Terms Clauses
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileTocOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center min-h-[44px] min-w-[44px]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-1 flex-1 [scrollbar-width:none]">
                {filteredSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition flex items-center justify-between min-h-[44px] ${
                      activeSection === sec.id
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold"
                        : "text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <span>{sec.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </HelpLayout>
  );
}
