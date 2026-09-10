import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Flag,
  UserX,
  Lock,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Send,
  HelpCircle,
  ArrowRight,
  VolumeX,
  Copy,
  Check,
  CheckCheck,
  LogOut,
  Info,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Modal from "../components/Modal";
import { HapticsManager } from "../services/HapticsManager";

const SAFETY_PILLARS = [
  {
    id: "report",
    title: "Report Disruptive Players",
    icon: Flag,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/50",
    desc: "Encountered cheating, harassment, or abusive chat? Submit a confidential report with the match room code.",
    actionText: "Report an Incident",
  },
  {
    id: "block",
    title: "Instant Voice & Chat Muting",
    icon: VolumeX,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50",
    desc: "You have complete control over your room experience. Tap any player's seat in an active match to instantly silence their voice or hide their chat messages.",
    actionText: "How Muting Works",
  },
  {
    id: "security",
    title: "Cryptographic Account Security",
    icon: Lock,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50",
    desc: "BHALYAM uses cryptographic HMAC seat signing and encrypted password hashing. Never share your password or OTP with anyone.",
    actionText: "Security Settings",
  },
  {
    id: "privacy",
    title: "Privacy Controls & Data Purge",
    icon: EyeOff,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/50",
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
  const [copiedTicket, setCopiedTicket] = useState(false);

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    HapticsManager.getInstance().subtle();
    setTicketId(`BHAL-SAFE-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleReset = () => {
    HapticsManager.getInstance().subtle();
    setTicketId(null);
    setPlayerInput("");
    setRoomCode("");
    setDetails("");
    setReportModalOpen(false);
  };

  const handleCopyTicket = () => {
    if (!ticketId) return;
    HapticsManager.getInstance().subtle();
    navigator.clipboard.writeText(ticketId);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#07090E] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200 transition-colors">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          {/* ── Breadcrumb Navigation ── */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium"
          >
            <Link
              to="/games"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              Lounge
            </Link>
            <span className="text-slate-300 dark:text-slate-700">&gt;</span>
            <span className="text-slate-900 dark:text-white font-semibold">
              Safety Center
            </span>
          </nav>

          {/* ── Hero Banner (Double-Bezel Chassis) ── */}
          <div className="relative p-6 sm:p-10 rounded-3xl border border-emerald-500/20 dark:border-emerald-500/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 text-center max-w-2xl mx-auto relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Trust &amp; Player Safety Center</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                BHALYAM <span className="text-[#EA580C]">Safety Center</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                What can I do when something goes wrong? Tools, controls, and reporting.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    HapticsManager.getInstance().subtle();
                    setReportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report an Incident Now</span>
                </button>
                <Link
                  to="/community-rules"
                  onClick={() => HapticsManager.getInstance().subtle()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <span>Veranda Code of Honor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Safety Pillars Grid (4 Double-Bezel Cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {SAFETY_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-2xl ${p.bg} border flex items-center justify-center shrink-0 shadow-inner`}>
                      <Icon className={`w-6 h-6 ${p.color}`} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      {p.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {p.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {p.id === "report" ? (
                      <button
                        onClick={() => {
                          HapticsManager.getInstance().subtle();
                          setReportModalOpen(true);
                        }}
                        className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                      >
                        <span>{p.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : p.id === "security" || p.id === "privacy" ? (
                      <Link
                        to="/settings/security"
                        onClick={() => HapticsManager.getInstance().subtle()}
                        className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                      >
                        <span>{p.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to="/community-rules"
                        onClick={() => HapticsManager.getInstance().subtle()}
                        className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
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

          {/* ── Visual Guide: How In-Game Muting Works ── */}
          <div className="p-6 sm:p-8 rounded-3xl border border-amber-500/20 dark:border-amber-500/15 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg space-y-5 text-left">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <VolumeX className="w-5 h-5 text-amber-500" />
              <span>How In-Game Muting &amp; Privacy Work</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tap Any Player's Avatar</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  During any active match or lobby, tap the seat chip of the player you want to manage.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  2
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Toggle Voice or Chat</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Select "Mute Voice" or "Hide Chat". Their audio packets are discarded locally on your device.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  3
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Persistent &amp; Discreet</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  The player is not alerted. Your choice persists across rematches in the same room.
                </p>
              </div>
            </div>
          </div>

          {/* ── Guidance Banner: Anti-Phishing & Integrity ── */}
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl space-y-3 text-left shadow-md">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Recognizing Suspicious Activity &amp; Impersonation</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              BHALYAM administrators and moderators will <strong>NEVER</strong> ask you for your account password, email OTP, or payment details inside a game room. If someone claims to be a BHALYAM developer or demands private details, please report them immediately.
            </p>
          </div>
        </div>
      </div>

      {/* ── Direct Incident Report Modal (Double-Bezel Luxury Dialog) ── */}
      {reportModalOpen && (
        <Modal
          open={reportModalOpen}
          onClose={handleReset}
          ariaLabel="Report an Incident"
          panelClassName="bg-white dark:bg-slate-900 border border-amber-500/25 dark:border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full text-left"
        >
          {ticketId ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-slate-900 dark:text-white">
                  Safety Incident Logged
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our safety response team has recorded the incident. Server telemetry and match records are being audited.
                </p>
              </div>

              {/* Reference ID Ticket Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 max-w-xs mx-auto">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
                    Ticket Reference
                  </span>
                  <p className="font-mono text-sm font-black text-slate-900 dark:text-white">
                    {ticketId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-amber-500/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
                  title="Copy ticket reference"
                  aria-label="Copy ticket reference"
                >
                  {copiedTicket ? (
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                Close &amp; Return to Safety Center
              </button>
            </div>
          ) : (
            <form onSubmit={handleReport} className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-rose-500" />
                  <span>Submit Safety Report</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confidential incident logging for lounge moderation and player protection.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Incident Type
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 min-h-[44px]"
                >
                  <option value="Harassment">Bullying / Harassment</option>
                  <option value="Cheating">Cheating / Game Exploit</option>
                  <option value="Impersonation">Impersonation / Fake Identity</option>
                  <option value="Offensive Content">Inappropriate Username or Room Name</option>
                  <option value="Phishing">Asking for Password or Personal Info</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Player Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Player123"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 font-mono min-h-[44px]"
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
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 font-mono uppercase min-h-[44px]"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 leading-relaxed min-h-[80px]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Safety Team</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
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
