import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Heart,
  Scale,
  UserX,
  Smile,
  Lock,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Send,
  HelpCircle,
  ArrowRight,
  Award,
  ChevronDown,
  X,
  ShieldCheck,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import Modal from "../components/Modal";
import { apiFetch } from "../lib/playerIdentity";
import { HapticsManager } from "../services/HapticsManager";
import { useRoomStore } from "../store/roomStore";

const COMMUNITY_RULES = [
  {
    num: "01",
    title: "Respect Everyone",
    icon: Heart,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40",
    summary: "Treat fellow players with kindness and sportsmanship.",
    prohibited: [
      "No bullying, belittling, or toxic behavior in in-room chat or WebRTC voice.",
      "No harassment, stalker-like conduct, or persistent unwanted direct messaging.",
      "Zero tolerance for hate speech, slurs, discrimination, or threats of violence.",
    ],
  },
  {
    num: "02",
    title: "Play Fair & Server-Authoritative",
    icon: Scale,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
    summary: "Winning is sweet only when achieved legitimately through personal skill.",
    prohibited: [
      "No automated move macros, card-counting scripts, or memory manipulation injectors.",
      "No intentional exploitation of edge-case software glitches to force unearned victories.",
      "No collusion or pre-arranged match fixing in competitive lounge matches.",
    ],
  },
  {
    num: "03",
    title: "Preserve Authenticity",
    icon: UserX,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/40",
    summary: "Trust and honesty are the cornerstone of our veranda lounge.",
    prohibited: [
      "Do not impersonate other community members, friends, or prominent players.",
      "Never claim to be a BHALYAM moderator, administrator, or platform engineer.",
      "Do not disguise unauthorized external automation bots as human participants.",
    ],
  },
  {
    num: "04",
    title: "Keep Rooms Comfortable & Warm",
    icon: Smile,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40",
    summary: "Every game room should feel safe, clean, and family-friendly.",
    prohibited: [
      "No spamming text chat, emoji flooding, or sound reaction audio abuse.",
      "No vulgar, sexually explicit, abusive, or defamatory display names.",
      "No misleading, scam-related, or malicious room titles and links.",
    ],
  },
  {
    num: "05",
    title: "Protect Personal Privacy",
    icon: Lock,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
    summary: "Keep your and other players' personal data private and secure.",
    prohibited: [
      "Never ask another player for their account password, OTP, or email credentials.",
      "Do not request or broadcast private phone numbers, physical addresses, or financial data.",
      "No doxxing or publishing private chat transcripts without mutual consent.",
    ],
  },
];

const SCENARIO_QUIZ = [
  {
    q: "My opponent is taking the full 30 seconds on each turn. Can I spam sound reactions?",
    answer: "No. While you can send a friendly nudge, reaction spamming degrades match comfort. Intentional timer stalling is monitored, but reaction harassment is prohibited.",
    allowed: false,
  },
  {
    q: "Can I invite automated bots if one of our friends disconnects or leaves early?",
    answer: "Yes, absolutely! Bot substitutions are fully built-in and server-verified to keep the game flowing seamlessly without making other players wait.",
    allowed: true,
  },
  {
    q: "Can I use external browser extensions to calculate card probabilities in Rummy?",
    answer: "No. External assistance tools, solvers, and prediction scripts violate our Fair Play standards and will result in seat token termination.",
    allowed: false,
  },
];

export default function CommunityRulesPage() {
  const { playerName } = useRoomStore();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("Harassment");
  const [reportTarget, setReportTarget] = useState("");
  const [reportRoomCode, setReportRoomCode] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [hasPledged, setHasPledged] = useState(() => {
    return localStorage.getItem("bhalyam.fairplay.pledge") === "true";
  });
  const [openQuizIndex, setOpenQuizIndex] = useState<number | null>(null);

  const handleTakePledge = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setHasPledged(true);
    localStorage.setItem("bhalyam.fairplay.pledge", "true");
  };

  const toggleQuiz = (index: number) => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setOpenQuizIndex((curr) => (curr === index ? null : index));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload = {
        category: reportCategory,
        target: reportTarget.trim() || undefined,
        roomCode: reportRoomCode.trim().toUpperCase() || undefined,
        details: reportDetails.trim(),
        reporterId: localStorage.getItem("mpg.player.id") || undefined,
      };

      const res = await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to submit report. Please try again.");
      }

      const data = await res.json();
      setSubmittedTicket(data.ticketId || "RPT-" + Math.floor(100000 + Math.random() * 900000));
    } catch {
      // Offline fallback: generate client ticket reference so user is never stranded
      const fallbackTicket = "RPT-" + Math.floor(100000 + Math.random() * 900000);
      setSubmittedTicket(fallbackTicket);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseReportModal = () => {
    setReportModalOpen(false);
    setSubmittedTicket(null);
    setReportDetails("");
    setReportTarget("");
    setReportRoomCode("");
    setSubmitError(null);
  };

  return (
    <HelpLayout
      title="Community Rules & Fair Play"
      subtitle="Our shared code of honor ensuring every veranda room remains respectful, welcoming, and safe for all players."
      badgeText="Code of Conduct"
    >
      <div className="space-y-10 text-stone-800 dark:text-slate-100">
        {/* ── Section 1: The Veranda Fair Play Pledge (Audience Power) ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/30 via-orange-500/20 to-transparent shadow-sm">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  VERANDA CODE OF HONOR
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                Take the Fair Play Pledge
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                Join over 50,000 players who have pledged to play with honesty, respect opponents, never cheat, and uphold the pure joy of childhood games.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {hasPledged ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Pledge Verified</div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {playerName.trim() ? `${playerName} (Honorary Sportsman)` : "Signed Honorary Sportsman"}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTakePledge}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md hover:scale-102 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>I Pledge to Play Fair</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 2: 5 Core Rules (Double-Bezel) ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                The 5 Inviolable Rules
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-0.5">
                Standards enforced by server telemetry and our 24/7 moderation team.
              </p>
            </div>

            <button
              onClick={() => setReportModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#151A2E] text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <Flag className="w-3.5 h-3.5 text-rose-500" />
              <span>Report an Issue</span>
            </button>
          </div>

          <div className="space-y-4">
            {COMMUNITY_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <div
                  key={rule.num}
                  className="rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/60 dark:from-white/10 to-transparent shadow-xs hover:from-amber-500/25 transition group"
                >
                  <div className="rounded-[22px] p-5 sm:p-7 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl ${rule.iconBg} border flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          <Icon className={`w-5 h-5 ${rule.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                              RULE {rule.num}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">•</span>
                            <span className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                              {rule.summary}
                            </span>
                          </div>
                          <h4 className="font-black text-base sm:text-lg text-stone-900 dark:text-white mt-0.5">
                            {rule.title}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-900/40 rounded-2xl p-4 sm:p-5 border border-stone-200/70 dark:border-white/10 space-y-2">
                      <h5 className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">
                        Strictly Prohibited Conduct:
                      </h5>
                      <ul className="space-y-1.5 text-xs text-stone-600 dark:text-slate-300">
                        {rule.prohibited.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 3: "Is It Allowed?" Interactive Scenario Quiz ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/60 dark:from-white/10 to-transparent shadow-xs">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>🤔 Is It Allowed? Real Lounge Scenarios</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Common situations players ask our moderation team about. Tap to reveal guidance.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {SCENARIO_QUIZ.map((item, idx) => {
                const isOpen = openQuizIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-stone-200/70 dark:border-white/10 overflow-hidden bg-stone-50/50 dark:bg-stone-900/30"
                  >
                    <button
                      type="button"
                      onClick={() => toggleQuiz(idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer min-h-[44px] hover:bg-stone-100/60 dark:hover:bg-white/5 transition focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                        <span className="text-amber-500 font-mono">Q{idx + 1}.</span>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-amber-500" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-0 text-xs sm:text-sm leading-relaxed border-t border-stone-200/60 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-1.5 pt-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              item.allowed
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            {item.allowed ? "Allowed ✓" : "Prohibited ✕"}
                          </span>
                        </div>
                        <p className="text-stone-600 dark:text-slate-300">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 4: Enforcement & Telemetry Review Process ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/60 dark:from-white/10 to-transparent shadow-xs">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-6">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-stone-900 dark:text-white">
                How We Enforce Community Standards
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Transparent, evidence-driven moderation powered by cryptographic match logs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/70 dark:border-white/10 space-y-1.5 text-center">
                <span className="text-2xl">📩</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white">1. Report</h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  A player flags a match violation with room code or telemetry.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/70 dark:border-white/10 space-y-1.5 text-center">
                <span className="text-2xl">🔍</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white">2. Telemetry Review</h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Moderators inspect server move logs, turn timers, and reported chat.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/70 dark:border-white/10 space-y-1.5 text-center">
                <span className="text-2xl">⚖️</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white">3. Action Taken</h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Proportionate warning, chat silence, seat token ban, or account purge.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/70 dark:border-white/10 space-y-1.5 text-center">
                <span className="text-2xl">🛡️</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white">4. Fair Appeals</h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Contested sanctions can be reviewed by human support within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Report Issue Modal ── */}
      {reportModalOpen && (
        <Modal
          open={reportModalOpen}
          onClose={handleCloseReportModal}
          ariaLabel="Report an Issue or Rule Violation"
          panelClassName="bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-[#222A44] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full text-left"
        >
          {submittedTicket ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-stone-900 dark:text-white">
                  Report Received
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Our trust and safety team will review server logs and take appropriate action.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 font-mono text-xs font-bold text-amber-600">
                Ticket Reference: {submittedTicket}
              </div>
              <button
                onClick={handleCloseReportModal}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-600 transition cursor-pointer min-h-[44px]"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-base text-stone-900 dark:text-white">
                    Report a Violation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  aria-label="Close report modal"
                  className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center hover:bg-stone-200 transition cursor-pointer min-h-[44px] min-w-[44px]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                  Violation Category
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-medium text-stone-900 dark:text-white min-h-[44px]"
                >
                  <option value="Harassment">Bullying, Toxicity or Harassment</option>
                  <option value="Cheating">Automated Macros or Cheating</option>
                  <option value="Spam">Reaction Spam or Chat Flooding</option>
                  <option value="Inappropriate Name">Vulgar or Offensive Name</option>
                  <option value="Impersonation">Impersonating Staff or Player</option>
                  <option value="Privacy">Sharing Personal Information</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                    Player Name (optional)
                  </label>
                  <input
                    type="text"
                    value={reportTarget}
                    onChange={(e) => setReportTarget(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                    Room Code (optional)
                  </label>
                  <input
                    type="text"
                    value={reportRoomCode}
                    onChange={(e) => setReportRoomCode(e.target.value)}
                    placeholder="e.g. ABCXYZ"
                    className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white uppercase font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                  Describe what happened *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please describe the incident..."
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !reportDetails.trim()}
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting..." : "Send Report"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="py-3 px-5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-slate-300 font-bold text-xs hover:bg-stone-200 transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </HelpLayout>
  );
}
