import React, { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Modal from "../components/Modal";
import { apiFetch } from "../lib/playerIdentity";

const COMMUNITY_RULES = [
  {
    num: "01",
    title: "Respect Everyone",
    icon: Heart,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40",
    summary: "Treat fellow players with kindness and sportsmanship.",
    prohibited: [
      "No bullying, belittling, or toxic behavior in in-room chat or voice.",
      "No harassment, stalker-like conduct, or persistent unwanted messaging.",
      "Zero tolerance for hate speech, slurs, discrimination, or threats of violence.",
    ],
  },
  {
    num: "02",
    title: "Play Fair",
    icon: Scale,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
    summary: "Winning is sweet only when achieved legitimately.",
    prohibited: [
      "No automated move macros, third-party cheat injectors, or network manipulation.",
      "No intentional exploitation of undiscovered software glitches to force unfair wins.",
      "No collusion or pre-arranged match fixing in competitive lounge matches.",
    ],
  },
  {
    num: "03",
    title: "Don't Pretend To Be Someone Else",
    icon: UserX,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/40",
    summary: "Authenticity and trust are the foundation of our lounge.",
    prohibited: [
      "Do not impersonate other community members, friends, or prominent players.",
      "Never claim to be a BHALYAM moderator, administrator, or game developer.",
      "Do not disguise automated software bots as human players.",
    ],
  },
  {
    num: "04",
    title: "Keep Rooms Comfortable",
    icon: Smile,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40",
    summary: "Every game room should feel warm, safe, and family-friendly.",
    prohibited: [
      "No spamming text chat, emoji flooding, or sound reaction abuse.",
      "No vulgar, abusive, sexually explicit, or offensive display names.",
      "No misleading, scam-related, or malicious room descriptions.",
    ],
  },
  {
    num: "05",
    title: "Protect Personal Information",
    icon: Lock,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
    summary: "Keep your and other players' private data private.",
    prohibited: [
      "Never ask another player for their account password, OTP, or email credentials.",
      "Do not request or broadcast private phone numbers, physical addresses, or financial data.",
      "No doxxing or publishing screenshots of private player conversations.",
    ],
  },
];

export default function CommunityRulesPage() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("Harassment");
  const [reportTarget, setReportTarget] = useState("");
  const [reportRoomCode, setReportRoomCode] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/support/reports", {
        method: "POST",
        body: JSON.stringify({
          category: reportCategory,
          targetName: reportTarget,
          roomCode: reportRoomCode,
          details: reportDetails,
        }),
      });
      if (!res.ok) throw new Error("Report submission failed");
      const data = await res.json();
      setSubmittedTicket(data.ticket);
    } catch {
      setSubmitError("Couldn't submit your report right now — please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setSubmitError(null);
    setReportTarget("");
    setReportRoomCode("");
    setReportDetails("");
    setReportModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* ── Hero ── */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold font-mono uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>Community Standards & Fair Play</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Play Like We <span className="text-[#EA580C]">Used To</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              BHALYAM is a place to play, laugh, compete and reconnect. Keep it fun and respectful for everyone.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setReportModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white dark:bg-[#151A2E] text-slate-800 dark:text-slate-200 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-rose-500" />
                <span>Something went wrong? Report an Issue</span>
              </button>
            </div>
          </div>

          {/* ── 5 Core Rules ── */}
          <div className="space-y-6">
            {COMMUNITY_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <div
                  key={rule.num}
                  className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs hover:border-amber-500/30 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl ${rule.iconBg} border flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-5 h-5 ${rule.iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#EA580C]">
                            RULE {rule.num}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs text-slate-400 font-medium">
                            {rule.summary}
                          </span>
                        </div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white mt-0.5">
                          {rule.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 sm:p-5 border border-[#F3EFE9] dark:border-[#202740] space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Prohibited Behavior:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {rule.prohibited.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Enforcement Process ── */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                How We Enforce Community Standards
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent, fair, and evidence-driven moderation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-[#F3EFE9] dark:border-[#202740] space-y-1.5 text-center">
                <span className="text-xl">📩</span>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">1. Report</h4>
                <p className="text-[11px] text-slate-400">A player flags a violation with match details.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-[#F3EFE9] dark:border-[#202740] space-y-1.5 text-center">
                <span className="text-xl">🔍</span>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">2. Telemetry Review</h4>
                <p className="text-[11px] text-slate-400">Moderators examine server logs, chat & moves.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-[#F3EFE9] dark:border-[#202740] space-y-1.5 text-center">
                <span className="text-xl">⚖️</span>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">3. Action Taken</h4>
                <p className="text-[11px] text-slate-400">Warnings, chat mutes, seat bans, or termination.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-[#F3EFE9] dark:border-[#202740] space-y-1.5 text-center">
                <span className="text-xl">🛡️</span>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">4. Fair Appeals</h4>
                <p className="text-[11px] text-slate-400">Contested decisions can be reviewed by support.</p>
              </div>
            </div>
          </div>

          {/* ── Quick Footer Links ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EFEBE4] dark:border-[#222A44]">
            <span className="text-xs text-slate-400">
              Questions about our rules? Reach out to support anytime.
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/how-to-play"
                className="text-xs font-bold text-[#EA580C] hover:underline"
              >
                How to Play Guide →
              </Link>
              <Link
                to="/support"
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Support Hub →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Reporting Modal ── */}
      {reportModalOpen && (
        <Modal
          open={reportModalOpen}
          onClose={handleResetForm}
          ariaLabel="Report a Player or Incident"
          panelClassName="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full text-left"
        >
          {submittedTicket ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Report Received
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Thank you for helping keep BHALYAM safe. Your report has been recorded on our servers for review.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">
                Ticket ID: {submittedTicket}
              </div>

              <button
                onClick={handleResetForm}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md cursor-pointer hover:from-amber-600 hover:to-orange-600 transition"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-rose-500" />
                  <span>Report a Player or Incident</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a category and provide details so our team has enough context to review it.
                </p>
              </div>

              {/* Category Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Violation Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Harassment",
                    "Cheating / Exploit",
                    "Offensive Content",
                    "Impersonation",
                    "Spam / Flooding",
                    "Other",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setReportCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                        reportCategory === cat
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-600 dark:text-rose-300 font-black"
                          : "bg-slate-50 dark:bg-slate-800/60 border-[#EFEBE4] dark:border-[#252D4A] text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Code & Player Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Player Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Player123"
                    value={reportTarget}
                    onChange={(e) => setReportTarget(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Room Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LUDO99"
                    value={reportRoomCode}
                    onChange={(e) => setReportRoomCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  What happened? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the incident, timestamp, or behavior observed..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {submitError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{submitError}</p>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting…" : "Submit Confidential Report"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </AppLayout>
  );
}
