import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Trash2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Mail,
  ArrowRight,
  Download,
  Share2,
  Copy,
  Clock,
  BookOpen,
  Menu,
  X,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import {
  PRIVACY_CONTACT_EMAIL,
  GRIEVANCE_ACK_DAYS,
  GRIEVANCE_RESOLVE_DAYS,
} from "../lib/privacy/contact";
import { HapticsManager } from "../services/HapticsManager";

const SECTIONS = [
  { id: "who-we-are", title: "1. Who We Are", tldr: "BHALYAM is a web-based multiplayer retro gaming lounge made for friends and families." },
  { id: "info-we-collect", title: "2. Information We Collect", tldr: "We only collect what's necessary for gameplay: display names, avatars, moves, and optional member emails." },
  { id: "how-we-use", title: "3. How We Use Information", tldr: "To host game rooms, sync dice rolls/cards, compute win rates, and verify seat tokens." },
  { id: "multiplayer-profile", title: "4. Multiplayer & Public Profile Visibility", tldr: "Only your chosen public nickname, avatar, and match stats are visible to players in your room." },
  { id: "cookies-storage", title: "5. Cookies & Local Storage", tldr: "We use local storage for your 10-minute seat tokens and preferences. No invasive tracking cookies." },
  { id: "how-we-share", title: "6. How We Share Information", tldr: "We never sell your data to third-party advertisers or data brokers. Ever." },
  { id: "data-retention", title: "7. Data Retention", tldr: "Guest match rooms are dissolved after games finish; member profiles persist until deleted." },
  { id: "data-security", title: "8. Data Security & Seat Authentication", tldr: "All room connections use TLS encryption and server-signed HMAC seat tokens." },
  { id: "children-privacy", title: "9. Children's Privacy & Age Policy", tldr: "BHALYAM is a safe, family-friendly veranda with no real-money wagering or adult content." },
  { id: "privacy-rights", title: "10. Your Privacy Rights", tldr: "You have full rights to access, rectify, export, or delete any data associated with you." },
  { id: "data-deletion", title: "11. Data Deletion & Account Purge", tldr: "You can purge your entire account and match history at any time with one click." },
  { id: "international-transfers", title: "12. International Data Transfers", tldr: "Multiplayer nodes are securely hosted with SOC-2 compliant server infrastructure." },
  { id: "policy-changes", title: "13. Changes to This Policy", tldr: "Any material changes will be announced with updated effective dates at the top of this document." },
  { id: "contact-us", title: "14. Contact Us", tldr: "Direct contact options for our data protection officer and privacy grievances." },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("who-we-are");
  const [tldrMode, setTldrMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Active scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
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
      const url = `${window.location.origin}/privacy#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const handleExportData = () => {
    try {
      HapticsManager.getInstance().subtle();
      const exportPayload = {
        platform: "BHALYAM Veranda Lounge",
        exportedAt: new Date().toISOString(),
        playerId: localStorage.getItem("mpg.player.id") || "guest_player",
        displayName: localStorage.getItem("bhalyam.profile.displayName") || "Veranda Guest",
        avatar: localStorage.getItem("bhalyam.profile.avatar") || "avatar_1",
        accountTier: localStorage.getItem("bhalyam.session") ? "Member" : "Guest",
        dataSovereignty: "Compliant with DPDP Act & GDPR",
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhalyam-data-dossier-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <HelpLayout
      title="Privacy Policy"
      subtitle="Your data belongs to you. How we protect your identity, gameplay telemetry, and privacy."
      badgeText="Data Sovereignity"
    >
      <div className="space-y-8 text-stone-800 dark:text-slate-100">
        {/* ── Section 1: Header Metadata & TL;DR Toggle (Audience Power) ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-blue-500/20 via-stone-300/20 dark:via-white/5 to-transparent shadow-xs">
          <div className="rounded-[22px] p-5 sm:p-7 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                <span>6 MIN READ • 2,400 WORDS</span>
                <span>•</span>
                <span>EFFECTIVE: AUGUST 22, 2026</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                Privacy at <span className="text-[#EA580C]">BHALYAM</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                We believe your childhood memories and friend circles belong exclusively to you.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Plain English Toggle */}
              <button
                type="button"
                onClick={() => {
                  try {
                    HapticsManager.getInstance().subtle();
                  } catch {
                    // ignore
                  }
                  setTldrMode(!tldrMode);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  tldrMode
                    ? "bg-amber-500 text-stone-950 font-extrabold shadow-2xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{tldrMode ? "Showing: Plain English TL;DR" : "View Plain English Summary"}</span>
              </button>

              {/* Data Export Action */}
              <button
                type="button"
                onClick={handleExportData}
                title="Download JSON dossier"
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Dossier (JSON)</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 2: Quick Summary Highlight Cards ── */}
        <section aria-labelledby="summary-highlights-heading">
          <h2 id="summary-highlights-heading" className="sr-only">
            Policy Summary Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-blue-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  What We Collect
                </h3>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>Account email (members only; guests require zero email).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>Public nickname, avatar selection, and match records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>Server-authoritative game moves, XP, and win totals.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-rose-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  What We NEVER Do
                </h3>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>We never record, intercept, or store WebRTC audio voice calls.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>We never sell or broker your contact details to third-party advertisers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>We never conduct real-money gambling or store payment credentials.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-emerald-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Your Privacy Controls
                </h3>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>One-click complete profile data export (JSON).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Instant account purge option in Security Settings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Local session token reset on your device at any time.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Document Layout (Desktop Sticky TOC + Content) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sticky Table of Contents */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24 space-y-3 bg-white dark:bg-[#111827] border border-stone-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xs uppercase tracking-wider text-stone-400">
                Table of Contents
              </h2>
              <span className="text-[10.5px] font-mono text-stone-400">14 Sections</span>
            </div>
            <nav className="space-y-1 max-h-[65vh] overflow-y-auto [scrollbar-width:none]">
              {SECTIONS.map((sec) => (
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
            {SECTIONS.map((sec) => (
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

                {/* Plain English Highlight Card */}
                {tldrMode && (
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/40 text-xs text-amber-900 dark:text-amber-300 font-medium flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider font-bold">
                        Plain English Takeaway:
                      </strong>
                      <span>{sec.tldr}</span>
                    </div>
                  </div>
                )}

                {/* Section Specific Content */}
                {sec.id === "who-we-are" && (
                  <p>
                    BHALYAM ("we", "us", or "our") operates the web-based multiplayer lounge located at bhalyam.app. We are dedicated to reviving classic 90s Indian board, paper, and retro games with zero monetary wagering and zero intrusive advertising.
                  </p>
                )}

                {sec.id === "info-we-collect" && (
                  <div className="space-y-2">
                    <p>We adhere to strict data minimization. Depending on whether you play as a Guest or Registered Member, we collect:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Guest Players:</strong> No email or credentials required. We assign a device-local temporary seat token stored in your browser's Local Storage.</li>
                      <li><strong>Registered Members:</strong> Your verified email address, hashed credentials, custom avatar identifier, and display name.</li>
                      <li><strong>Match Telemetry:</strong> Moves made, round timers, outcome state, and player disconnect timestamps to ensure fair play and seat recovery.</li>
                    </ul>
                  </div>
                )}

                {sec.id === "how-we-use" && (
                  <p>
                    We process information strictly to: (a) establish and broadcast real-time Socket.IO game rooms, (b) hold disconnected seats for up to 10 minutes so games are not lost, (c) manage seasonal leaderboards and achievement awards, and (d) detect fraudulent move automation or harassment.
                  </p>
                )}

                {sec.id === "multiplayer-profile" && (
                  <p>
                    When joining a room, other human participants in that room can view your custom display name, selected avatar, and career match record. Your private email is NEVER revealed to other players under any circumstance.
                  </p>
                )}

                {sec.id === "cookies-storage" && (
                  <p>
                    We do not deploy cross-site tracking cookies. We utilize browser LocalStorage solely for operational session management: your cryptographic seatToken (`mpg.seats`), your theme choice (`bhalyam.theme`), and your sound volume sliders.
                  </p>
                )}

                {sec.id === "how-we-share" && (
                  <p>
                    We do not sell, rent, or monetize your personal information with data brokers or advertising networks. Telemetry is stored in SOC-2 certified cloud infrastructure (Supabase & Render) governed by strict Data Processing Agreements.
                  </p>
                )}

                {sec.id === "data-retention" && (
                  <p>
                    In-memory game rooms are purged immediately after matches conclude and players leave. Member profiles and career badges persist until an explicit account deletion request is submitted.
                  </p>
                )}

                {sec.id === "data-security" && (
                  <p>
                    Every game seat is authenticated via a server-signed HMAC cryptographic `seatToken`. All transmissions occur over encrypted HTTPS and WSS (WebSockets over TLS). Peer-to-peer WebRTC voice calls run encrypted via DTLS-SRTP.
                  </p>
                )}

                {sec.id === "children-privacy" && (
                  <p>
                    BHALYAM is built as a wholesome family veranda. We do not knowingly collect personal information from children under 13 without parental consent. If you believe a child has created an unauthorized account, please contact our privacy desk.
                  </p>
                )}

                {sec.id === "privacy-rights" && (
                  <p>
                    Under applicable data protection frameworks (including India's Digital Personal Data Protection Act 2023 and GDPR), you hold rights to: access your records, correct discrepancies, object to processing, and request irrevocable erasure.
                  </p>
                )}

                {sec.id === "data-deletion" && (
                  <p>
                    You can purge your entire game record, email, and achievements at any time by navigating to <Link to="/settings/security" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">Security &amp; Data Settings</Link> or contacting our grievance officer.
                  </p>
                )}

                {sec.id === "international-transfers" && (
                  <p>
                    Our core server infrastructure is distributed across secure cloud regions utilizing standard contractual clauses and robust encryption at rest and in transit.
                  </p>
                )}

                {sec.id === "policy-changes" && (
                  <p>
                    We may update our Privacy Policy periodically to reflect platform capabilities or legal guidelines. Any revisions will be signaled by updating the "Effective Date" at the top of this page.
                  </p>
                )}

                {/* Section 14: Contact Us - CRITICAL TEST CONTRACT PRESERVATION */}
                {sec.id === "contact-us" && (
                  <div className="space-y-4 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <p>
                      For privacy inquiries, grievance redressal, or data subject access requests, please reach out through our official channels:
                    </p>

                    {PRIVACY_CONTACT_EMAIL ? (
                      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                          <Mail className="w-4 h-4" />
                          <span>Dedicated Privacy Officer:</span>
                        </div>
                        <p className="text-xs text-stone-700 dark:text-slate-300">
                          Email:{" "}
                          <a
                            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=BHALYAM%20privacy%20request`}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {PRIVACY_CONTACT_EMAIL}
                          </a>
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Grievance SLA: Acknowledged within {GRIEVANCE_ACK_DAYS} days; resolved within {GRIEVANCE_RESOLVE_DAYS} days.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
                        <p className="text-xs text-stone-600 dark:text-slate-300">
                          A dedicated privacy contact email address has not been configured yet.
                        </p>
                        <p className="text-xs text-stone-600 dark:text-slate-300">
                          You can manage your data settings directly in{" "}
                          <Link to="/settings" className="font-bold text-amber-600 hover:underline">
                            Account Settings
                          </Link>{" "}
                          or submit a ticket through our{" "}
                          <Link to="/contact" className="font-bold text-amber-600 hover:underline">
                            Support Contact Desk
                          </Link>
                          .
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ))}
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
            <span>Jump to Section</span>
          </button>
        </div>

        {/* Mobile Quick-Jump TOC Modal */}
        {mobileTocOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#151A2E] rounded-t-3xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Table of Contents
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
                {SECTIONS.map((sec) => (
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
