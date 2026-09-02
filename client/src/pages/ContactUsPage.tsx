import React, { useState, useRef } from "react";
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
  ChevronDown,
  CheckCircle2,
  Copy,
  MessageSquare,
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
    iconBg: "bg-[#F3E8FF] dark:bg-purple-950/60",
    iconColor: "text-[#8B5CF6] dark:text-purple-400",
  },
  {
    id: "lounges",
    title: "Lounges & Multiplayer",
    subtitle: "Room codes, joining, hosting, bots, reconnecting.",
    icon: Home,
    iconBg: "bg-[#DCFCE7] dark:bg-emerald-950/60",
    iconColor: "text-[#10B981] dark:text-emerald-400",
  },
  {
    id: "technical",
    title: "Technical Problem",
    subtitle: "Loading, connection, errors, performance.",
    icon: Wrench,
    iconBg: "bg-[#E0F2FE] dark:bg-sky-950/60",
    iconColor: "text-[#0EA5E9] dark:text-sky-400",
  },
  {
    id: "account",
    title: "Account & Profile",
    subtitle: "Profile, avatar, name, XP, achievements.",
    icon: User,
    iconBg: "bg-[#F3E8FF] dark:bg-purple-950/60",
    iconColor: "text-[#A855F7] dark:text-purple-400",
  },
  {
    id: "tournaments",
    title: "Tournaments",
    subtitle: "Tournament participation, results, rewards.",
    icon: Trophy,
    iconBg: "bg-[#FEF3C7] dark:bg-amber-950/60",
    iconColor: "text-[#F59E0B] dark:text-amber-400",
  },
  {
    id: "safety",
    title: "Safety & Community",
    subtitle: "Report players, cheating, harassment, spam.",
    icon: Shield,
    iconBg: "bg-[#FFE4E6] dark:bg-rose-950/60",
    iconColor: "text-[#F43F5E] dark:text-rose-400",
  },
  {
    id: "feedback",
    title: "Feedback & Ideas",
    subtitle: "Share suggestions and improvements.",
    icon: Lightbulb,
    iconBg: "bg-[#FEF9C3] dark:bg-amber-950/60",
    iconColor: "text-[#EAB308] dark:text-amber-400",
  },
  {
    id: "other",
    title: "Something Else",
    subtitle: "Other questions or concerns.",
    icon: MoreHorizontal,
    iconBg: "bg-[#F1F5F9] dark:bg-slate-800",
    iconColor: "text-[#64748B] dark:text-slate-400",
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
  const [summary, setSummary] = useState("Score was incorrect at the end of the match");
  const [description, setDescription] = useState(
    "We played a 5 over match. My last ball was counted as 4 runs, but the final result showed 3 runs. Attaching a screenshot."
  );
  const [roomCode, setRoomCode] = useState("ROOM-7X29");
  const [matchId, setMatchId] = useState("HC-8F42K");
  const [dateTime, setDateTime] = useState("Aug 22, 2026 • 10:30 PM");
  const [email, setEmail] = useState(userEmail || "kethan@example.com");
  const [attachedFiles, setAttachedFiles] = useState<string[]>([
    "/bhalyam-logo.png",
  ]);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const categoryRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleCategoryChange = (newCat: HelpCategory) => {
    setCategory(newCat);
    const defaults = ISSUE_TYPES_BY_CATEGORY[newCat];
    if (defaults && defaults.length > 0) {
      setIssueType(defaults[0]);
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % CATEGORY_CARDS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (index - 1 + CATEGORY_CARDS.length) % CATEGORY_CARDS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = CATEGORY_CARDS.length - 1;
    }

    if (nextIndex !== null) {
      const nextCat = CATEGORY_CARDS[nextIndex];
      handleCategoryChange(nextCat.id);
      categoryRefs.current[nextIndex]?.focus();
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
      <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#0B0F19] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          {/* ── Breadcrumb Navigation ── */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium"
          >
            <Link
              to="/support"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Help &amp; Support
            </Link>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              Contact Us
            </span>
          </nav>

          {/* ── Hero Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Contact BHALYAM <span className="text-[#EA580C]">Support</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium">
                We're here to help you get back to playing.
              </p>
            </div>

            {/* 3D Envelope & Paper Plane Hero Illustration */}
            <div className="hidden sm:flex items-center justify-center shrink-0 w-44 h-32 relative select-none">
              <HeroEnvelopeIllustration />
            </div>
          </div>

          {submittedTicket ? (
            /* ── Success Screen ── */
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div role="status" aria-live="polite" className="space-y-2">
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
                  aria-label="Copy reference code"
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
                  <span className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    What can we help you with?
                  </h2>
                </div>

                {/* 8 Topic Cards Grid (4 columns on Desktop) */}
                <div role="radiogroup" aria-label="Help categories" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {CATEGORY_CARDS.map((cat, index) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        ref={(el) => {
                          categoryRefs.current[index] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        aria-label={`${cat.title}: ${cat.subtitle}`}
                        onClick={() => handleCategoryChange(cat.id)}
                        onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                        className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] ${
                          isSelected
                            ? "bg-white dark:bg-[#151A2E] border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-sm"
                            : "bg-white dark:bg-[#151A2E] border-[#EFEAE2] dark:border-[#222A44] hover:border-amber-500/40 hover:shadow-xs"
                        }`}
                      >
                        {/* Orange Checkmark Badge on Selected */}
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

                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {cat.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
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
                  <span className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Tell us more about the issue
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Form Inputs (~66%) */}
                  <div className="lg:col-span-8 space-y-5">
                    {/* Row 1: Game Dropdown & What Went Wrong */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="contact-game" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Game (if applicable)
                        </label>
                        <div className="relative">
                          <select
                            id="contact-game"
                            value={selectedGame}
                            onChange={(e) => setSelectedGame(e.target.value)}
                            className="w-full appearance-none bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
                          >
                            {GAMES_OPTIONS.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="contact-issue-type" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          What went wrong?
                        </label>
                        <div className="relative">
                          <select
                            id="contact-issue-type"
                            value={issueType}
                            onChange={(e) => setIssueType(e.target.value)}
                            className="w-full appearance-none bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
                          >
                            {(ISSUE_TYPES_BY_CATEGORY[category] || []).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Short summary */}
                    <div className="space-y-1.5">
                      <label htmlFor="contact-summary" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Short summary
                      </label>
                      <input
                        id="contact-summary"
                        type="text"
                        required
                        placeholder="Score was incorrect at the end of the match"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
                      />
                    </div>

                    {/* Row 3: Describe the issue in detail */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="contact-description" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Describe the issue in detail
                        </label>
                      </div>
                      <div className="relative">
                        <textarea
                          id="contact-description"
                          required
                          rows={4}
                          maxLength={1000}
                          placeholder="We played a 5 over match. My last ball was counted as 4 runs, but the final result showed 3 runs. Attaching a screenshot."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl p-3.5 pb-7 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium leading-relaxed resize-y"
                        />
                        <span className="text-[10px] font-mono text-slate-400 absolute right-3 bottom-2">
                          {description.length}/1000
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Match / Room details (optional) */}
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Match / Room details <span className="text-slate-400 font-normal">(optional)</span>
                      </span>

                      {/* Blue info callout strip */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EFF6FF] dark:bg-sky-950/40 border border-[#DBEAFE] dark:border-sky-900/40 text-xs text-[#1E40AF] dark:text-sky-300 font-medium">
                        <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span>
                          These details help us investigate faster. You can find them in match summary.
                        </span>
                      </div>

                      {/* 3 Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="contact-room-code" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Room Code
                          </label>
                          <input
                            id="contact-room-code"
                            type="text"
                            placeholder="ROOM-7X29"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 uppercase font-mono font-medium focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="contact-match-id" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Match ID
                          </label>
                          <input
                            id="contact-match-id"
                            type="text"
                            placeholder="HC-8F42K"
                            value={matchId}
                            onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 uppercase font-mono font-medium focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="contact-date-time" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Date &amp; Time
                          </label>
                          <div className="relative">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              id="contact-date-time"
                              type="text"
                              placeholder="Aug 22, 2026 • 10:30 PM"
                              value={dateTime}
                              onChange={(e) => setDateTime(e.target.value)}
                              className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                          Screenshots or videos help us understand the issue better.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Uploaded Thumbnails Mockup */}
                        {attachedFiles.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative w-32 h-20 rounded-xl overflow-hidden border border-[#EFEAE2] dark:border-[#222A44] bg-[#1E1B4B] group shadow-xs shrink-0"
                          >
                            {/* Inner Game Mockup Preview Graphic */}
                            <div className="w-full h-full flex flex-col items-center justify-center p-1 relative bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#0F172A]">
                              <div className="w-10 h-10 rounded-full border border-amber-400/40 bg-amber-500/20 flex items-center justify-center">
                                <Gamepad2 className="w-5 h-5 text-amber-300" />
                              </div>
                              <span className="text-[8px] font-mono text-amber-200/80 mt-1">Match Screenshot</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white hover:bg-rose-600 transition flex items-center justify-center cursor-pointer"
                              title="Remove attachment"
                              aria-label={`Remove attachment ${idx + 1}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {/* Upload File Button Box */}
                        <label className="w-36 h-20 rounded-xl border-2 border-dashed border-[#E2D9C8] dark:border-slate-700 hover:border-[#EA580C] dark:hover:border-orange-500 bg-white/60 dark:bg-[#151A2E]/50 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition p-2 text-center shrink-0">
                          <UploadCloud className="w-5 h-5 text-slate-500" />
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
                            aria-label="Upload file attachment"
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Row 6: Your email */}
                    <div className="space-y-1">
                      <label htmlFor="contact-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Your email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        We'll use this email to reply to you.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 space-y-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-full text-xs sm:text-sm shadow-sm hover:shadow-md transition min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] focus-visible:ring-offset-2"
                      >
                        <span>{isSubmitting ? "Submitting..." : "Send Support Request"}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Please don't include passwords, OTPs, payment details or other sensitive information.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sticky Sidebar (~34%) */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Card 1: What happens next? */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-4 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>What happens next?</span>
                      </div>

                      {/* Step Timeline */}
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#FED7AA] dark:before:bg-amber-950">
                        {/* Step 1 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded border border-[#EA580C] bg-white dark:bg-[#151A2E] flex items-center justify-center text-[9px] font-bold text-[#EA580C]">
                            <MessageSquare className="w-2.5 h-2.5" />
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            We receive your request
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-normal">
                            We'll review the details you have shared.
                          </p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border border-[#EA580C] bg-white dark:bg-[#151A2E] flex items-center justify-center text-[9px] font-bold text-[#EA580C]">
                            2
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Our team investigates
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-normal">
                            We may contact you if we need more information.
                          </p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative space-y-0.5">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border border-[#EA580C] bg-white dark:bg-[#151A2E] flex items-center justify-center text-[9px] font-bold text-[#EA580C]">
                            3
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            We get back to you
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-normal">
                            You'll receive a reply on your email as soon as possible.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Support hours */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-2 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <Clock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>Support hours</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        Our support team is available
                      </p>
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Monday to Sunday
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          9:00 AM – 9:00 PM (IST)
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Still need help? */}
                    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-2xl p-5 shadow-2xs space-y-3 text-left">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                        <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span>Still need help?</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                        Explore FAQs or search for answers before contacting us.
                      </p>
                      <div className="pt-0.5">
                        <Link
                          to="/support"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border border-[#EA580C] text-[#EA580C] hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs font-bold transition min-h-[32px]"
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

/** 3D Envelope & Paper Plane Hero Illustration matching reference image */
function HeroEnvelopeIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" fill="none" aria-hidden>
      {/* Background Sparkles */}
      <text x="140" y="80" fill="#C4B5FD" fontSize="14" fontWeight="bold">✦</text>
      <text x="30" y="25" fill="#C4B5FD" fontSize="10" opacity="0.6">✦</text>

      {/* Dotted Trajectory for Plane */}
      <path
        d="M95 65 C 110 50, 115 35, 135 25"
        stroke="#C4B5FD"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        fill="none"
      />

      {/* Dotted Trajectory for Bubble */}
      <path
        d="M45 40 C 35 45, 25 50, 20 60"
        stroke="#C4B5FD"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        fill="none"
      />

      {/* Letter Paper inside Envelope */}
      <rect
        x="42"
        y="12"
        width="66"
        height="50"
        rx="4"
        fill="#FAF5EE"
        stroke="#E8DFC8"
        strokeWidth="1.5"
      />
      <line x1="50" y1="22" x2="76" y2="22" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="30" x2="98" y2="30" stroke="#E2D9C8" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="38" x2="92" y2="38" stroke="#E2D9C8" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="46" x2="70" y2="46" stroke="#E2D9C8" strokeWidth="2" strokeLinecap="round" />

      {/* Open Purple Envelope Body */}
      <path
        d="M25 45 L75 80 L125 45 L125 92 C125 96 121 100 116 100 L34 100 C29 100 25 96 25 92 Z"
        fill="#431407"
        className="dark:fill-[#1E1B4B]"
      />
      {/* Front Fold */}
      <path
        d="M25 45 L75 80 L125 45 L75 100 Z"
        fill="#3B0764"
      />
      <path
        d="M25 100 L75 80 L125 100 Z"
        fill="#2E1065"
      />

      {/* Purple Speech Bubble (Left) */}
      <g transform="translate(10, 45)">
        <circle cx="16" cy="16" r="14" fill="#8B5CF6" />
        <path d="M8 24 L4 32 L16 28 Z" fill="#8B5CF6" />
        <circle cx="10" cy="16" r="1.5" fill="white" />
        <circle cx="16" cy="16" r="1.5" fill="white" />
        <circle cx="22" cy="16" r="1.5" fill="white" />
      </g>

      {/* Floating Purple Sphere (Top Right) */}
      <circle cx="130" cy="22" r="7" fill="#7C3AED" />
      <circle cx="128" cy="20" r="2" fill="white" opacity="0.6" />

      {/* Golden Flying Paper Airplane (Top Right) */}
      <g transform="translate(125, 10) rotate(15)">
        <path d="M22 2 L2 14 L11 16 L13 22 L22 2 Z" fill="#F59E0B" />
        <path d="M22 2 L11 16 L13 22 Z" fill="#D97706" />
        <path d="M22 2 L2 14 L11 16 Z" fill="#FBBF24" />
      </g>
    </svg>
  );
}
