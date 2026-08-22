import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  CheckCircle2,
  Gamepad2,
  Users,
  Wrench,
  Lightbulb,
  Shield,
  UploadCloud,
  X,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Clock,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";

type SupportTopic =
  | "gameplay"
  | "rooms"
  | "technical"
  | "feedback"
  | "safety"
  | "general";

interface HelpTopicMeta {
  id: SupportTopic;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  gradient: string;
  borderHover: string;
}

const HELP_TOPICS: HelpTopicMeta[] = [
  {
    id: "gameplay",
    title: "Game & Gameplay",
    subtitle: "Game rules, turns, scoring, rules & gameplay issues",
    icon: Gamepad2,
    accentColor: "text-amber-500",
    gradient: "from-amber-500/15 to-orange-500/10",
    borderHover: "hover:border-amber-500/50",
  },
  {
    id: "rooms",
    title: "Rooms & Multiplayer",
    subtitle: "Room codes, joining, hosting, bots & reconnecting",
    icon: Users,
    accentColor: "text-sky-500",
    gradient: "from-sky-500/15 to-indigo-500/10",
    borderHover: "hover:border-sky-500/50",
  },
  {
    id: "technical",
    title: "Technical Issue",
    subtitle: "Loading problems, WebRTC voice & browser/device glitches",
    icon: Wrench,
    accentColor: "text-rose-500",
    gradient: "from-rose-500/15 to-purple-500/10",
    borderHover: "hover:border-rose-500/50",
  },
  {
    id: "feedback",
    title: "Feedback & Suggestions",
    subtitle: "Ideas, game requests and improvements you'd love to see",
    icon: Lightbulb,
    accentColor: "text-yellow-500",
    gradient: "from-yellow-500/15 to-amber-500/10",
    borderHover: "hover:border-yellow-500/50",
  },
  {
    id: "safety",
    title: "Safety & Community",
    subtitle: "Report cheating, harassment or inappropriate behaviour",
    icon: Shield,
    accentColor: "text-emerald-500",
    gradient: "from-emerald-500/15 to-teal-500/10",
    borderHover: "hover:border-emerald-500/50",
  },
];

const GAMES_LIST = [
  { value: "general", label: "General / Lounge Platform" },
  { value: "handcricket", label: "Hand Cricket" },
  { value: "ludo", label: "Ludo" },
  { value: "snl", label: "Snakes & Ladders" },
  { value: "rummy", label: "Indian Rummy" },
  { value: "uno", label: "UNO" },
  { value: "rps", label: "Rock Paper Scissors" },
  { value: "wordbuilding", label: "Word Building" },
  { value: "dotsboxes", label: "Dots & Boxes" },
  { value: "stargame", label: "Star Game" },
  { value: "bingo", label: "Bingo" },
  { value: "chess", label: "Chess" },
  { value: "carrom", label: "Carrom" },
  { value: "snake", label: "Classic Snake" },
  { value: "spacewar", label: "Space War" },
  { value: "nokiacricket", label: "Nokia Cricket" },
  { value: "voice", label: "WebRTC Voice Chat" },
  { value: "party", label: "Smart TV Party Mode" },
  { value: "account", label: "Account / Profile / XP" },
];

export default function ContactUsPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const userEmail = useAuthStore((s) => s.email) || "";
  const currentName = useRoomStore((s) => s.playerName) || "";

  const [selectedTopic, setSelectedTopic] = useState<SupportTopic>("gameplay");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedGame, setSelectedGame] = useState("general");
  const [roomCode, setRoomCode] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectTopic = (topic: SupportTopic) => {
    setSelectedTopic(topic);
    // Smooth scroll down to the form
    const formElement = document.getElementById("support-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleMockAttachment = () => {
    if (attachments.length < 3) {
      const mockName = `screenshot-${Date.now().toString().slice(-4)}.png`;
      setAttachments((prev) => [...prev, mockName]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setIsSubmitting(true);
    // Generate deterministic ticket code BHY-XXXXXX
    setTimeout(() => {
      const randomId = Math.floor(100000 + Math.random() * 900000);
      const generatedTicket = `BHY-${randomId}`;
      setTicketRef(generatedTicket);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  };

  const handleCopyTicket = () => {
    if (ticketRef) {
      navigator.clipboard.writeText(ticketRef).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleResetForm = () => {
    setTicketRef(null);
    setSubject("");
    setMessage("");
    setRoomCode("");
    setAttachments([]);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper auth-shell py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between">
            <Link
              to="/support"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to FAQs</span>
            </Link>

            <Link
              to="/"
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] py-2 flex items-center"
            >
              Back to Lounge
            </Link>
          </div>

          {ticketRef ? (
            /* ── SUCCESS STATE ── */
            <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center space-y-6">
              {/* Ambient Glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-black font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Message Received! 🎒
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--auth-ink)] tracking-tight">
                  Thanks for reaching out!
                </h1>
                <p className="text-sm text-[var(--auth-ink-soft)] leading-relaxed">
                  Your message has been received by the BHALYAM team. We will review your inquiry and follow up at <strong className="text-[var(--auth-ink)]">{email}</strong> within 24 hours.
                </p>
              </div>

              {/* Ticket Reference Code Card */}
              <div className="max-w-md mx-auto bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-5 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--auth-ink-soft)]">
                    Support Reference ID
                  </span>
                  <button
                    onClick={handleCopyTicket}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-2xl font-black font-mono tracking-wider text-amber-600 dark:text-amber-400">
                  {ticketRef}
                </div>
                <p className="text-[11px] text-[var(--auth-ink-soft)]">
                  Save this reference code to track your request with support.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition shadow-md min-h-[44px]"
                >
                  Return to Lounge
                </Link>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--auth-control-bg)] hover:bg-[var(--auth-field)] text-[var(--auth-ink)] font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-mono border border-[var(--auth-field-edge)] transition min-h-[44px] cursor-pointer"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            /* ── CONTACT FORM VIEW ── */
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-black font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  BHALYAM Helpdesk
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-[var(--auth-ink)] tracking-tight">
                  We're here to help.
                </h1>
                <p className="text-sm sm:text-base text-[var(--auth-ink-soft)] max-w-xl mx-auto leading-relaxed">
                  Something not working? Have a question? Found a problem? Tell us what happened and our support team will assist you.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Usually responding within <strong>24 hours</strong></span>
                </div>
              </div>

              {/* Step 1: What can we help with? Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-[var(--auth-ink)] font-mono">
                    1. What can we help with?
                  </h2>
                  <span className="text-xs text-[var(--auth-ink-soft)]">
                    Pick a category to get started
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HELP_TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    const isSelected = selectedTopic === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleSelectTopic(topic.id)}
                        className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? "bg-[var(--auth-field)] border-amber-500 shadow-md ring-2 ring-amber-500/20"
                            : "bg-[var(--auth-card)] border-[var(--auth-card-edge)] hover:bg-[var(--auth-field)]"
                        } ${topic.borderHover}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center ${topic.accentColor}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            {isSelected && (
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-[var(--auth-ink)]">
                            {topic.title}
                          </h3>
                          <p className="text-xs text-[var(--auth-ink-soft)] leading-relaxed">
                            {topic.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Interactive Contact Form */}
              <div
                id="support-form-container"
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-10 shadow-xl space-y-6"
              >
                <div className="border-b border-[var(--auth-field-edge)] pb-4 space-y-1">
                  <h2 className="text-lg font-black text-[var(--auth-ink)] flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-500" />
                    <span>2. Tell us the details</span>
                  </h2>
                  <p className="text-xs text-[var(--auth-ink-soft)]">
                    Fill out the form below and we'll route your ticket to the right specialist.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Topic & Game Selector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Topic */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--auth-ink)] block">
                        Topic Category <span className="text-amber-500">*</span>
                      </label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value as SupportTopic)}
                        className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition font-medium"
                      >
                        {HELP_TOPICS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Game / Feature */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--auth-ink)] block">
                        Related Game or Feature
                      </label>
                      <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition font-medium"
                      >
                        {GAMES_LIST.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject & Optional Room Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-[var(--auth-ink)] block">
                        Subject / Summary <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Ludo roll stuck on 6, or Room connection dropped"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition placeholder:text-[var(--auth-ink-soft)]"
                      >
                      </input>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--auth-ink)] block">
                        Room Code (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. LUDO99"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition placeholder:text-[var(--auth-ink-soft)] font-mono uppercase font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Tell us what happened */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--auth-ink)] block">
                      Tell us what happened <span className="text-amber-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Please provide details about what happened, what device or browser you were using, and any error message displayed..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-4 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition placeholder:text-[var(--auth-ink-soft)] leading-relaxed"
                    />
                  </div>

                  {/* Screenshot Attachments */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--auth-ink)] block">
                      Attachments & Screenshots (Optional)
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-[var(--auth-ink)]"
                        >
                          <span>{file}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="hover:text-rose-500 transition cursor-pointer"
                            aria-label="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {attachments.length < 3 && (
                        <button
                          type="button"
                          onClick={handleMockAttachment}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--auth-field)] hover:bg-[var(--auth-control-bg)] border border-[var(--auth-field-edge)] text-xs font-bold text-[var(--auth-ink)] transition cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-amber-500" />
                          <span>+ Add screenshot</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Email & Submitter Info */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--auth-ink)] block">
                      Your Email Address <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition placeholder:text-[var(--auth-ink-soft)]"
                    />
                    <p className="text-[11px] text-[var(--auth-ink-soft)]">
                      We'll send our resolution and updates to this email address.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-black px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition shadow-lg min-h-[44px] cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Help & Community Rules Strip */}
              <div className="text-center pt-4 space-y-3">
                <p className="text-xs text-[var(--auth-ink-soft)]">
                  Prefer instant answers? Check our comprehensive rule guides:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Link to="/how-to-play" className="hover:underline">
                    How to Play Guide
                  </Link>
                  <span>•</span>
                  <Link to="/community-rules" className="hover:underline">
                    Community Rules
                  </Link>
                  <span>•</span>
                  <Link to="/safety" className="hover:underline">
                    Safety & Fair Play
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
