import React, { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { PRIVACY_CONTACT_EMAIL, GRIEVANCE_ACK_DAYS, GRIEVANCE_RESOLVE_DAYS } from "../lib/privacy/contact";

const SECTIONS = [
  { id: "who-we-are", title: "1. Who We Are" },
  { id: "info-we-collect", title: "2. Information We Collect" },
  { id: "how-we-use", title: "3. How We Use Information" },
  { id: "multiplayer-profile", title: "4. Multiplayer & Public Profile Visibility" },
  { id: "cookies-storage", title: "5. Cookies & Local Storage" },
  { id: "how-we-share", title: "6. How We Share Information" },
  { id: "data-retention", title: "7. Data Retention" },
  { id: "data-security", title: "8. Data Security & Seat Authentication" },
  { id: "children-privacy", title: "9. Children's Privacy & Age Policy" },
  { id: "privacy-rights", title: "10. Your Privacy Rights" },
  { id: "data-deletion", title: "11. Data Deletion & Account Purge" },
  { id: "international-transfers", title: "12. International Data Transfers" },
  { id: "policy-changes", title: "13. Changes to This Policy" },
  { id: "contact-us", title: "14. Contact Us" },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("who-we-are");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* ── Header ── */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-bold font-mono uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Trust & Data Protection</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Privacy at <span className="text-[#EA580C]">BHALYAM</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              We believe your childhood memories belong to you.
            </p>

            <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-medium pt-1">
              <span>Last updated: August 22, 2026</span>
              <span>•</span>
              <span>Effective from: August 22, 2026</span>
            </div>
          </div>

          {/* ── Quick Summary Cards (Before Legal Text) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* What we collect */}
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                What We Collect
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Account email and verified auth session (members only).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Public avatar choice and custom display name.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Gameplay moves, match duration, XP, and win records.</span>
                </li>
              </ul>
            </div>

            {/* Why we collect it */}
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Why We Collect It
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>To synchronize real-time multiplayer turns and scores.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>To hold seats during brief network drops (reconnect).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>To prevent automated abuse, spam, and cheating.</span>
                </li>
              </ul>
            </div>

            {/* What we don't do */}
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                What We Don't Do
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>We NEVER sell your personal data to advertisers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>We NEVER record or store peer-to-peer voice calls.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>We NEVER track you across third-party websites.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Document Layout: Sticky Sidebar TOC + Content ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sticky Table of Contents */}
            <div className="lg:col-span-4 sticky top-24 space-y-3 bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 shadow-xs">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Table of Contents
              </h3>
              <nav className="space-y-1 max-h-[70vh] overflow-y-auto [scrollbar-width:none]">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeSection === sec.id
                        ? "bg-amber-50 dark:bg-amber-950/40 text-[#EA580C] dark:text-amber-400 font-extrabold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {sec.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Document Content */}
            <div className="lg:col-span-8 bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-10 shadow-xs space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
              {/* Section 1 */}
              <section id="who-we-are" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  1. Who We Are
                </h2>
                <p>
                  BHALYAM ("we", "our", or "us") operates the web-based multiplayer gaming platform accessible at bhalyam.com. We are dedicated to recreating traditional Indian school-yard and living room games in a secure, server-authoritative digital environment.
                </p>
              </section>

              {/* Section 2 */}
              <section id="info-we-collect" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  2. Information We Collect
                </h2>
                <p>
                  We believe in minimal data collection. We only collect information strictly necessary to provide real-time multiplayer gaming:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Account Data:</strong> Email address and password hash (via encrypted Supabase authentication) when creating a Member account.</li>
                  <li><strong>Profile Information:</strong> Your chosen display name, avatar identifier, and optional regional flag.</li>
                  <li><strong>Game Telemetry:</strong> Match duration, move sequences, win/loss records, accumulated XP, and achievement unlock states.</li>
                  <li><strong>Technical & Connection Data:</strong> IP address (for WebSockets and WebRTC STUN signaling), device type, and client latency metrics.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="how-we-use" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  3. How We Use Information
                </h2>
                <p>
                  Your information is utilized solely to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Facilitate real-time room sessions, turns, and game state broadcasting.</li>
                  <li>Authenticate player seats using cryptographic HMAC seatTokens to prevent unauthorized hijack.</li>
                  <li>Track personal statistics, match history, and leaderboard rankings.</li>
                  <li>Diagnose connection latency, server bottlenecks, and game engine stability.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="multiplayer-profile" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  4. Multiplayer & Public Profile Visibility
                </h2>
                <p>
                  When you enter a room or match, other participants in that specific room can see your public display name, chosen avatar, and in-game moves. We do not expose email addresses or personal identifiers to other players.
                </p>
              </section>

              {/* Section 5 */}
              <section id="cookies-storage" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  5. Cookies & Local Storage
                </h2>
                <p>
                  BHALYAM uses browser `localStorage` solely for functional preferences:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>`mpg.seats`: Cryptographic seat authentication tokens to restore disconnected sessions.</li>
                  <li>`bhalyam.theme`: Your Dark / Light mode visual preference.</li>
                  <li>`bhalyam.audio`: Volume sliders and mute toggles.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="how-we-share" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  6. How We Share Information
                </h2>
                <p>
                  We do not sell, rent, or trade player information. We only transmit technical data to essential infrastructure providers:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Hosting Infrastructure:</strong> Cloud hosting partners (Vercel & Render) to run our client and game servers.</li>
                  <li><strong>Authentication:</strong> Supabase for secure account database storage.</li>
                  <li><strong>WebRTC STUN Signaling:</strong> Google public STUN servers for peer-to-peer voice channel discovery.</li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="data-retention" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  7. Data Retention
                </h2>
                <p>
                  In-memory room states and game boards are completely purged from memory when a match completes or all players leave. Match history records and profile stats are retained as long as your Member account remains active.
                </p>
              </section>

              {/* Section 8 */}
              <section id="data-security" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  8. Data Security & Seat Authentication
                </h2>
                <p>
                  All network communications are encrypted via HTTPS and WSS (WebSockets Secure). Player seat tokens are cryptographically signed with HMAC SHA-256 keys on the server to ensure zero seat hijacking.
                </p>
              </section>

              {/* Section 9 */}
              <section id="children-privacy" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  9. Children's Privacy & Age Policy
                </h2>
                <p>
                  While BHALYAM celebrates childhood nostalgia, players under 13 must play with parental guidance. We do not knowingly collect personal identifiable information from children without verified parental consent. If we discover that personal data of a child under 13 has been collected without parental consent, we will promptly delete it.
                </p>
              </section>

              {/* Section 10 */}
              <section id="privacy-rights" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  10. Your Privacy Rights
                </h2>
                <p>
                  You have the right to access, inspect, export, or correct your personal account details at any time directly through the Settings page (`/settings/security`).
                </p>
              </section>

              {/* Section 11 */}
              <section id="data-deletion" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  11. Data Deletion & Account Purge
                </h2>
                <p>
                  You can permanently delete your account, statistics, match history, and all stored credentials at any time. Simply visit your Security Settings (`/settings/security`) and choose "Delete Account & Purge Data".
                </p>
              </section>

              {/* Section 12 */}
              <section id="international-transfers" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  12. International Data Transfers
                </h2>
                <p>
                  Your information may be processed on servers located outside your country of residence. We ensure that our infrastructure providers maintain standard contractual clauses and robust cryptographic protections.
                </p>
              </section>

              {/* Section 13 */}
              <section id="policy-changes" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  13. Changes to This Policy
                </h2>
                <p>
                  We may update this Privacy Policy periodically to reflect platform updates or legal requirements. Material revisions will be posted with an updated "Last Updated" date at the top of this document.
                </p>
              </section>

              {/* Section 14 */}
              <section id="contact-us" className="space-y-3 scroll-mt-28 border-t border-[#EFEBE4] dark:border-[#222A44] pt-6">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  14. Contact Us
                </h2>
                <p>
                  If you have any questions, concerns, or data privacy requests, please contact our Data Protection team at:
                </p>
                {PRIVACY_CONTACT_EMAIL ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-[#F3EFE9] dark:border-[#202740] flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#EA580C]" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Email Privacy Team
                      </span>
                      <a
                        href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=BHALYAM%20privacy%20request`}
                        className="text-xs text-[#EA580C] hover:underline font-mono"
                      >
                        {PRIVACY_CONTACT_EMAIL}
                      </a>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        We reply within {GRIEVANCE_ACK_DAYS} days and aim to resolve within {GRIEVANCE_RESOLVE_DAYS} days.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-[#F3EFE9] dark:border-[#202740] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    A dedicated privacy contact email address has not been configured yet. Until it is live, you can manage and purge your data directly using our Privacy &amp; Lounge Visibility controls under <Link to="/settings" className="text-[#EA580C] font-semibold hover:underline">Settings</Link> or reach our team via the <Link to="/contact" className="text-[#EA580C] font-semibold hover:underline">Contact Us</Link> page.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
