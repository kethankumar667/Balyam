import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Home,
  Wrench,
  User,
  Trophy,
  Shield,
  Lightbulb,
  MoreHorizontal,
  Check,
  Info,
  Calendar,
  UploadCloud,
  X,
  Lock,
  Clock,
  HelpCircle,
  ArrowRight,
  Send,
  CheckCircle2,
  Copy,
  Mail,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";

type HelpCategory =
  | "gameplay"
  | "lounges"
  | "technical"
  | "account"
  | "tournaments"
  | "safety"
  | "feedback"
  | "other";

interface CategoryCardMeta {
  id: HelpCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const CATEGORY_CARDS: CategoryCardMeta[] = [
  {
    id: "gameplay",
    title: "Game & Gameplay",
    subtitle: "Rules, scoring, turns, result issues and more.",
    icon: Gamepad2,
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "lounges",
    title: "Lounges & Multiplayer",
    subtitle: "Room codes, joining, hosting, bots, reconnecting.",
    icon: Home,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "technical",
    title: "Technical Problem",
    subtitle: "Loading, connection, errors, performance.",
    icon: Wrench,
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "account",
    title: "Account & Profile",
    subtitle: "Profile, avatar, name, XP, achievements.",
    icon: User,
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "tournaments",
    title: "Tournaments",
    subtitle: "Tournament participation, results, rewards.",
    icon: Trophy,
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "safety",
    title: "Safety & Community",
    subtitle: "Report players, cheating, harassment, spam.",
    icon: Shield,
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "feedback",
    title: "Feedback & Ideas",
    subtitle: "Share suggestions and improvements.",
    icon: Lightbulb,
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "other",
    title: "Something Else",
    subtitle: "Other questions or concerns.",
    icon: MoreHorizontal,
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
];

const GAMES_OPTIONS = [
  { value: "handcricket", label: "🏏 Hand Cricket" },
  { value: "ludo", label: "🎲 Ludo" },
  { value: "snl", label: "🐍 Snakes & Ladders" },
  { value: "rummy", label: "🃏 Indian Rummy" },
  { value: "uno", label: "🎴 UNO" },
  { value: "rps", label: "✂️ Rock Paper Scissors" },
  { value: "wordbuilding", label: "🔤 Word Building" },
  { value: "dotsboxes", label: "📦 Dots & Boxes" },
  { value: "stargame", label: "⭐ Star Game" },
  { value: "bingo", label: "🎯 Bingo" },
  { value: "chess", label: "♟️ Chess" },
  { value: "carrom", label: "⚪ Carrom" },
  { value: "snake", label: "🕹️ Classic Snake" },
  { value: "spacewar", label: "🚀 Space War" },
  { value: "nokiacricket", label: "📱 Nokia Cricket" },
  { value: "general", label: "🌐 General / Lounge Platform" },
];

const ISSUE_TYPES_BY_CATEGORY: Record<HelpCategory, string[]> = {
  gameplay: [
    "Incorrect result",
    "Turn skipped or timer expired early",
    "Valid move rejected",
    "Scoring discrepancy",
    "Game froze / stuck turn",
    "Bot move glitch",
    "Other gameplay issue",
  ],
  lounges: [
    "Cannot join room with valid code",
    "Disconnected from room / lost seat",
    "Room host disconnected / failover issue",
    "Bot seat invite issue",
    "Pass & Play screen stuck",
    "Other room issue",
  ],
  technical: [
    "WebRTC voice chat not connecting / no audio",
    "High latency or reconnect loop",
    "Visual glitches / layout issue",
    "App failed to load or black screen",
    "Sound effects or haptics not working",
    "Other technical bug",
  ],
  account: [
    "XP points or level not updating",
    "Achievement not unlocked",
    "Cannot update display name or avatar",
    "Password reset email not received",
    "Login session expired unexpectedly",
    "Other account issue",
  ],
  tournaments: [
    "Tournament match result not registered",
    "Knockout bracket assignment issue",
    "Reward or badge missing",
    "Match start delay",
    "Other tournament issue",
  ],
  safety: [
    "Report cheating or exploit abuse",
    "Report harassment, offensive name or chat",
    "Report voice chat abuse",
    "Unfair bot behavior",
    "Other safety concern",
  ],
  feedback: [
    "New game suggestion",
    "Feature improvement idea",
    "UI/UX enhancement request",
    "Audio / music request",
    "General praise & feedback",
  ],
  other: [
    "General inquiry",
    "Partnership / press request",
    "Accessibility request",
    "Other question",
  ],
};

export default function ContactUsPage() {
  const userEmail = useAuthStore((s) => s.email) || "";

  const [category, setCategory] = useState<HelpCategory>("gameplay");
  const [selectedGame, setSelectedGame] = useState("handcricket");
  const [issueType, setIssueType] = useState("Incorrect result");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [matchId, setMatchId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([
    "/bhalyam-logo.png", // Initial preview mock
  ]);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);

  const handleCategoryChange = (newCat: HelpCategory) => {
    setCategory(newCat);
    const defaults = ISSUE_TYPES_BY_CATEGORY[newCat];
    if (defaults && defaults.length > 0) {
      setIssueType(defaults[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAttachedFiles((prev) => [...prev, url]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate backend ticket submission
    setTimeout(() => {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      setSubmittedTicket(`BHY-${randomNum}`);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  };

  const handleCopyTicket = () => {
    if (!submittedTicket) return;
    navigator.clipboard.writeText(submittedTicket);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper auth-shell py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          {/* ── Breadcrumb Navigation ── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Link to="/support" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Help &amp; Support
            </Link>
            <span>&gt;</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Contact Us</span>
          </nav>

          {/* ── Hero Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5 text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Contact BHALYAM <span className="text-[#EA580C]">Support</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                We're here to help you get back to playing.
              </p>
            </div>

            {/* 3D Mailbox / Letter Illustration */}
            <div className="hidden sm:flex items-center justify-center shrink-0 w-36 h-24 lg:w-44 lg:h-28 relative">
              <svg viewBox="0 0 160 120" className="w-full h-full drop-shadow-md" fill="none">
                <defs>
                  <linearGradient id="envGrad" x1="0" y1="0" x2="120" y2="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4C1D95" />
                    <stop offset="50%" stopColor="#2E1065" />
                    <stop offset="100%" stopColor="#1E1B4B" />
                  </linearGradient>
                  <linearGradient id="planeGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>

                {/* Letter Paper inside Envelope */}
                <rect x="35" y="15" width="70" height="60" rx="6" fill="#FAF5EE" stroke="#E2D9C8" strokeWidth="1.5" />
                <line x1="45" y1="28" x2="75" y2="28" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="45" y1="38" x2="95" y2="38" stroke="#E5D9C5" strokeWidth="2" strokeLinecap="round" />
                <line x1="45" y1="46" x2="88" y2="46" stroke="#E5D9C5" strokeWidth="2" strokeLinecap="round" />

                {/* Open Purple Envelope */}
                <path d="M20 48 L80 88 L140 48 L140 100 C140 106 135 110 128 110 L32 110 C25 110 20 106 20 100 Z" fill="url(#envGrad)" />
                <path d="M20 48 L80 88 L140 48" stroke="#7C3AED" strokeWidth="2" strokeOpacity="0.4" />

                {/* Purple Chat Bubble with 3 Dots */}
                <g transform="translate(10, 20)">
                  <rect width="32" height="24" rx="8" fill="#8B5CF6" />
                  <path d="M12 24 L8 30 L18 24 Z" fill="#8B5CF6" />
                  <circle cx="10" cy="12" r="1.75" fill="#FFFFFF" />
                  <circle cx="16" cy="12" r="1.75" fill="#FFFFFF" />
                  <circle cx="22" cy="12" r="1.75" fill="#FFFFFF" />
                </g>

                {/* Flying Gold Paper Airplane */}
                <g transform="translate(115, 8) rotate(15)">
                  <path d="M24 2 L2 14 L12 16 L14 24 L24 2 Z" fill="url(#planeGrad)" />
                </g>
              </svg>
            </div>
          </div>

          {submittedTicket ? (
            /* ── Success Screen ── */
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 shadow-md">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Message Received! 🎒
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                  Our engineering and support team has logged your report. We will inspect match telemetry and get back to you at{" "}
                  <strong className="text-slate-900 dark:text-white">{email}</strong> within 24 hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 max-w-xs mx-auto">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">
                    Ticket Reference ID
                  </span>
                  <p className="font-mono text-base font-black text-slate-900 dark:text-white">
                    {submittedTicket}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  title="Copy reference code"
                >
                  {copiedTicket ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedTicket(null);
                    setSummary("");
                    setDescription("");
                    setRoomCode("");
                    setMatchId("");
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Send another message
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition"
                >
                  Return to Lounge
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* ── STEP 1: What can we help you with? ── */}
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    What can we help you with?
                  </h2>
                </div>

                {/* 8 Topic Cards Grid (4x2 on Desktop, 2x4 on Tablet, 1x8 on Mobile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {CATEGORY_CARDS.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? "bg-white dark:bg-[#151A2E] border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-md"
                            : "bg-white dark:bg-[#151A2E] border-[#EFEBE4] dark:border-[#222A44] hover:border-amber-500/40 hover:shadow-xs"
                        }`}
                      >
                        {/* Checkmark Badge on Selected */}
                        {isSelected && (
                          <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <div className="space-y-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.iconBg} ${cat.iconColor}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="space-y-1 pr-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {cat.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                              {cat.subtitle}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── STEP 2: Tell us more about the issue ── */}
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Tell us more about the issue
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Form Inputs (~65%) */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Row 1: Game Dropdown & What Went Wrong */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Game (if applicable)
                        </label>
                        <select
                          value={selectedGame}
                          onChange={(e) => setSelectedGame(e.target.value)}
                          className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                        >
                          {GAMES_OPTIONS.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          What went wrong?
                        </label>
                        <select
                          value={issueType}
                          onChange={(e) => setIssueType(e.target.value)}
                          className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                        >
                          {(ISSUE_TYPES_BY_CATEGORY[category] || []).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Short summary */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Short summary
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Score was incorrect at the end of the match"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                      />
                    </div>

                    {/* Row 3: Describe the issue in detail */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Describe the issue in detail
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">
                          {description.length}/1000
                        </span>
                      </div>
                      <textarea
                        required
                        rows={4}
                        maxLength={1000}
                        placeholder="We played a 5 over match. My last ball was counted as 4 runs, but the final result showed 3 runs. Attaching a screenshot."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs font-medium leading-relaxed resize-y"
                      />
                    </div>

                    {/* Row 4: Match / Room details (optional) */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Match / Room details <span className="text-slate-400 font-normal">(optional)</span>
                      </label>

                      {/* Blue info callout strip */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 font-medium">
                        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>
                          These details help us investigate faster. You can find them in match summary.
                        </span>
                      </div>

                      {/* 3 Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Room Code
                          </span>
                          <input
                            type="text"
                            placeholder="ROOM-7X29"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 uppercase font-mono font-medium focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Match ID
                          </span>
                          <input
                            type="text"
                            placeholder="HC-8F42K"
                            value={matchId}
                            onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 uppercase font-mono font-medium focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Date &amp; Time
                          </span>
                          <div className="relative">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Aug 22, 2026 • 10:30 PM"
                              value={dateTime}
                              onChange={(e) => setDateTime(e.target.value)}
                              className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 5: Attachments (optional) */}
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Attachments <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Screenshots or videos help us understand the issue better.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Uploaded Thumbnails */}
                        {attachedFiles.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative w-28 h-20 rounded-xl overflow-hidden border border-[#EFEBE4] dark:border-[#222A44] bg-slate-900 group shadow-xs shrink-0"
                          >
                            <img
                              src={url}
                              alt="Attachment preview"
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition flex items-center justify-center cursor-pointer"
                              title="Remove attachment"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {/* Upload File Button Box */}
                        <label className="w-36 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500/60 bg-white/50 dark:bg-[#151A2E]/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition p-2 text-center shrink-0">
                          <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Upload file
                          </span>
                          <span className="text-[9px] text-slate-400 leading-tight">
                            PNG, JPG, WebP up to 5MB
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Row 6: Your email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Your email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        We'll use this email to reply to you.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 space-y-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] disabled:opacity-50 text-white font-black px-8 py-3.5 rounded-full text-xs sm:text-sm shadow-md hover:shadow-orange-500/25 transition min-h-[44px] cursor-pointer"
                      >
                        <span>{isSubmitting ? "Submitting Request..." : "Send Support Request"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Please don't include passwords, OTPs, payment details or other sensitive information.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sticky Sidebar (~35%) */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Card 1: What happens next? */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-4 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>What happens next?</span>
                      </div>

                      {/* Step Timeline */}
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-200 dark:before:bg-orange-950">
                        {/* Step 1 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#151A2E] border-2 border-orange-500 flex items-center justify-center text-[9px] font-bold text-orange-600 dark:text-orange-400">
                            1
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            We receive your request
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                            We'll review the details you have shared.
                          </p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#151A2E] border-2 border-orange-500 flex items-center justify-center text-[9px] font-bold text-orange-600 dark:text-orange-400">
                            2
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Our team investigates
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                            We may contact you if we need more information.
                          </p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#151A2E] border-2 border-orange-500 flex items-center justify-center text-[9px] font-bold text-orange-600 dark:text-orange-400">
                            3
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            We get back to you
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                            You'll receive a reply on your email as soon as possible.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Support hours */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-2 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <Clock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>Support hours</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Our support team is available
                      </p>
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Monday to Sunday
                        </p>
                        <p className="text-xs font-mono font-bold text-[#EA580C]">
                          9:00 AM – 9:00 PM (IST)
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Still need help? */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-3 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>Still need help?</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Explore FAQs or search for answers before contacting us.
                      </p>
                      <div className="pt-1">
                        <Link
                          to="/support"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-orange-500/50 text-[#EA580C] hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs font-bold transition min-h-[36px]"
                        >
                          <span>Browse FAQs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
