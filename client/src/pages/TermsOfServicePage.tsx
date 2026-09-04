import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Scale,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";

const TERMS_SECTIONS = [
  { id: "about", title: "1. About BHALYAM" },
  { id: "eligibility", title: "2. Eligibility & Age Requirements" },
  { id: "account", title: "3. User Accounts & Responsibilities" },
  { id: "content", title: "4. User Content & Names" },
  { id: "gameplay", title: "5. Games & Server Authority" },
  { id: "multiplayer", title: "6. Multiplayer Rooms, Hosts & Bots" },
  { id: "progress", title: "7. Achievements, XP & Non-Monetary Honors" },
  { id: "tournaments", title: "8. Tournaments & Rankings" },
  { id: "prohibited", title: "9. Prohibited Conduct" },
  { id: "ip", title: "10. Intellectual Property" },
  { id: "third-party", title: "11. Third-Party Integrations" },
  { id: "termination", title: "12. Suspension & Termination" },
  { id: "disclaimers", title: "13. Disclaimers" },
  { id: "liability", title: "14. Limitation of Liability" },
  { id: "changes", title: "15. Changes to Terms" },
  { id: "governing-law", title: "16. Governing Law" },
  { id: "contact", title: "17. Contact & Legal Notices" },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("about");

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#EA580C] text-xs font-bold font-mono uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5" />
              <span>Terms & Conditions</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              BHALYAM <span className="text-[#EA580C]">Terms of Service</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              The rules for playing together in our digital lounge.
            </p>

            <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-medium pt-1">
              <span>Last updated: August 22, 2026</span>
              <span>•</span>
              <span>Effective from: August 22, 2026</span>
            </div>
          </div>

          {/* ── Document Layout: Sticky Sidebar TOC + Content ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sticky Table of Contents */}
            <div className="lg:col-span-4 sticky top-24 space-y-3 bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 shadow-xs">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Terms Sections
              </h2>
              <nav className="space-y-1 max-h-[70vh] overflow-y-auto [scrollbar-width:none]">
                {TERMS_SECTIONS.map((sec) => (
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
              {/* 1 */}
              <section id="about" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  1. About BHALYAM
                </h2>
                <p>
                  Welcome to BHALYAM! By accessing, creating rooms, or participating in matches on our web platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these Terms, please do not use the Service.
                </p>
              </section>

              {/* 2 */}
              <section id="eligibility" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  2. Eligibility & Age Requirements
                </h2>
                <p>
                  You must be at least 13 years of age to register an independent account. Visitors under 13 must use the platform with the direct guidance and permission of a parent or legal guardian.
                </p>
              </section>

              {/* 3 */}
              <section id="account" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  3. User Accounts & Responsibilities
                </h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account.
                </p>
              </section>

              {/* 4 */}
              <section id="content" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  4. User Content & Names
                </h2>
                <p>
                  Usernames, display names, custom avatar choices, and room names must adhere to our Community Rules. We reserve the right to sanitize, reset, or remove any offensive or infringing names.
                </p>
              </section>

              {/* 5 */}
              <section id="gameplay" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  5. Games & Server Authority
                </h2>
                <p>
                  All game states, turn timers, dice rolls, card shuffles, and victory validations are computed strictly on our backend servers. The server's determination of game events and winner outcomes is final and binding.
                </p>
              </section>

              {/* 6 */}
              <section id="multiplayer" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  6. Multiplayer Rooms, Hosts & Bots
                </h2>
                <p>
                  Room hosts configure match options. If a host leaves, host permissions automatically failover to another human participant. Disconnected players have their seats reserved for 600 seconds with automated bot assistance.
                </p>
              </section>

              {/* 7 */}
              <section id="progress" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  7. Achievements, XP & Non-Monetary Honors
                </h2>
                <p>
                  Experience Points (XP), levels, badges, and achievements have zero cash value and cannot be redeemed, traded, or transferred for real-world currency or goods.
                </p>
              </section>

              {/* 8 */}
              <section id="tournaments" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  8. Tournaments & Rankings
                </h2>
                <p>
                  Tournament rankings and weekly leaderboards are determined strictly through legitimate gameplay telemetry. Any evidence of match manipulation or collusion will result in immediate disqualification.
                </p>
              </section>

              {/* 9 */}
              <section id="prohibited" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  9. Prohibited Conduct
                </h2>
                <p>
                  You agree NOT to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Use unauthorized automated bots, hacks, or cheat software.</li>
                  <li>Harass, threaten, or abuse other players in chat or voice.</li>
                  <li>Attempt to decompile, reverse-engineer, or tamper with BHALYAM game engines.</li>
                  <li>Overload or launch denial-of-service attacks against platform servers.</li>
                </ul>
              </section>

              {/* 10 */}
              <section id="ip" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  10. Intellectual Property
                </h2>
                <p>
                  All software code, visual designs, board layouts, audio assets, logos, and branding on BHALYAM are the exclusive property of BHALYAM and protected under copyright and trademark law.
                </p>
              </section>

              {/* 11 */}
              <section id="third-party" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  11. Third-Party Integrations
                </h2>
                <p>
                  Our WebRTC voice signaling relies on standard STUN protocols. We are not responsible for the privacy practices of external network providers or third-party links.
                </p>
              </section>

              {/* 12 */}
              <section id="termination" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  12. Suspension & Termination
                </h2>
                <p>
                  We reserve the right to temporarily suspend or permanently terminate access for accounts that repeatedly violate these Terms or our Community Rules.
                </p>
              </section>

              {/* 13 */}
              <section id="disclaimers" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  13. Disclaimers
                </h2>
                <p>
                  The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied, regarding uninterrupted availability or uptime.
                </p>
              </section>

              {/* 14 */}
              <section id="liability" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  14. Limitation of Liability
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, BHALYAM shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the platform.
                </p>
              </section>

              {/* 15 */}
              <section id="changes" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  15. Changes to Terms
                </h2>
                <p>
                  We may revise these Terms from time to time. Your continued use of the platform following the posting of revised Terms constitutes your acceptance of the changes.
                </p>
              </section>

              {/* 16 */}
              <section id="governing-law" className="space-y-3 scroll-mt-28">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  16. Governing Law
                </h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of India, without giving effect to any principles of conflicts of law.
                </p>
              </section>

              {/* 17 */}
              <section id="contact" className="space-y-3 scroll-mt-28 border-t border-[#EFEBE4] dark:border-[#222A44] pt-6">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  17. Contact & Legal Notices
                </h2>
                <p>
                  For formal legal notices or inquiries regarding these Terms, please contact our Legal Counsel at:
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-[#F3EFE9] dark:border-[#202740] flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#EA580C]" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Email Legal Counsel
                    </span>
                    <a
                      href="mailto:legal@bhalyam.com"
                      className="text-xs text-[#EA580C] hover:underline font-mono"
                    >
                      legal@bhalyam.com
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
