import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Flag,
  UserX,
  Lock,
  EyeOff,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
  Send,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Modal from "../components/Modal";

const SAFETY_PILLARS = [
  {
    id: "report",
    title: "Report Disruptive Players",
    icon: Flag,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40",
    desc: "Encountered cheating, harassment, or abusive chat? Submit a confidential report with the match room code.",
    actionText: "Report an Incident",
  },
  {
    id: "block",
    title: "Instant Voice & Chat Muting",
    icon: UserX,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
    desc: "You have complete control over your room experience. Tap any player's name during a match to silence their microphone or chat.",
    actionText: "How Muting Works",
  },
  {
    id: "security",
    title: "Account & Session Security",
    icon: Lock,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
    desc: "BHALYAM uses cryptographic seat signing and encrypted password hashing. Never share your password or OTP with anyone.",
    actionText: "Security Settings",
  },
  {
    id: "privacy",
    title: "Privacy Controls & Data Purge",
    icon: EyeOff,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40",
    desc: "Easily inspect your stored telemetry, export match records, or permanently purge your account and statistics at any time.",
    actionText: "Data Controls",
  },
];

export default function SafetyCenterPage() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [category, setCategory] = useState("Harassment");
  const [playerInput, setPlayerInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [details, setDetails] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketId(`BHAL-SAFE-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleReset = () => {
    setTicketId(null);
    setPlayerInput("");
    setRoomCode("");
    setDetails("");
    setReportModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* ── Page Hero ── */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trust & Player Safety Center</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              BHALYAM <span className="text-[#EA580C]">Safety Center</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              What can I do when something goes wrong? Tools, controls, and reporting.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setReportModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report an Incident Now</span>
              </button>
            </div>
          </div>

          {/* ── Safety Pillars Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SAFETY_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs flex flex-col justify-between group hover:border-amber-500/30 transition"
                >
                  <div className="space-y-3">
                    <div className={`w-11 h-11 rounded-2xl ${p.bg} border flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${p.color}`} />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>

                  <div className="pt-2">
                    {p.id === "report" ? (
                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{p.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : p.id === "security" || p.id === "privacy" ? (
                      <Link
                        to="/settings/security"
                        className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                      >
                        <span>{p.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to="/community-rules"
                        className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                      >
                        <span>{p.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Guidance Banner ── */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Recognizing Suspicious Activity & Impersonation</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              BHALYAM administrators and moderators will <strong>NEVER</strong> ask you for your account password, email OTP, or payment details inside a game room. If someone claims to be a BHALYAM developer or demands private details, please report them immediately.
            </p>
          </div>
        </div>
      </div>

      {/* ── Direct Incident Report Modal ── */}
      {reportModalOpen && (
        <Modal
          open={reportModalOpen}
          onClose={handleReset}
          ariaLabel="Report an Incident"
          panelClassName="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full text-left"
        >
          {ticketId ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Safety Incident Logged
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Our safety response team has recorded the incident. Server telemetry and match records are being audited.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">
                Ticket Reference: {ticketId}
              </div>
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleReport} className="space-y-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-500" />
                <span>Submit Safety Report</span>
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Incident Type
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Harassment">Bullying / Harassment</option>
                  <option value="Cheating">Cheating / Game Exploit</option>
                  <option value="Impersonation">Impersonation / Fake Identity</option>
                  <option value="Offensive Content">Inappropriate Username or Room Name</option>
                  <option value="Phishing">Asking for Password or Personal Info</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Player Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Player123"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Room Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LUDO99"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Incident Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the observed violation or behavior..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-[#EFEBE4] dark:border-[#252D4A] rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Safety Team</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
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
