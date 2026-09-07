import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Lightbulb, MoreHorizontal, Check, CheckCircle2, Send, Sparkles, MessageSquare, ArrowLeft } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { submitFeedback, type FeedbackCategory } from "../lib/feedbackApi";
import { toast } from "../hooks/useToast";
import { HapticsManager } from "../services/HapticsManager";

interface CategoryMeta {
  id: FeedbackCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "bug",
    title: "Report a Bug",
    subtitle: "Something isn't working right.",
    icon: Bug,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50",
  },
  {
    id: "suggestion",
    title: "Suggest an Idea",
    subtitle: "A feature or improvement you'd like.",
    icon: Lightbulb,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50",
  },
  {
    id: "other",
    title: "Something Else",
    subtitle: "Anything else on your mind.",
    icon: MoreHorizontal,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50",
  },
];

const MAX_MESSAGE_LENGTH = 2000;

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleCategorySelect = (catId: FeedbackCategory) => {
    HapticsManager.getInstance().subtle();
    setCategory(catId);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % CATEGORIES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (index - 1 + CATEGORIES.length) % CATEGORIES.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = CATEGORIES.length - 1;
    }
    if (nextIndex !== null) {
      handleCategorySelect(CATEGORIES[nextIndex].id);
      categoryRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length === 0) {
      setError("Please write a message before sending.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    HapticsManager.getInstance().subtle();

    try {
      await submitFeedback({ category, message: message.trim(), email: email.trim() || undefined });
      toast.success("Thanks for the feedback!");
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#07090E] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200 transition-colors">
        <div className="max-w-xl mx-auto space-y-8">
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
              Feedback
            </span>
          </nav>

          {/* ── Header ── */}
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Community Voice</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Leave us <span className="text-[#EA580C]">Feedback</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Found a bug, or have an idea? We read every message.
            </p>
          </div>

          {submitted ? (
            /* ── Success Card (Double-Bezel Luxury Receipt) ── */
            <div className="relative p-8 sm:p-10 rounded-3xl border border-amber-500/25 dark:border-amber-500/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-center space-y-6 shadow-2xl">
              <div className="w-18 h-18 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div role="status" aria-live="polite" className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Feedback received!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                  Thanks for helping us make BHALYAM better. Our engineering team reviews all community input.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    HapticsManager.getInstance().subtle();
                    setSubmitted(false);
                    setMessage("");
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer min-h-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  Send more feedback
                </button>
                <Link
                  to="/"
                  onClick={() => HapticsManager.getInstance().subtle()}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md hover:shadow-lg transition min-h-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  Return to Lounge
                </Link>
              </div>
            </div>
          ) : (
            /* ── Feedback Form with Double-Bezel Chassis ── */
            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl space-y-6 shadow-xl text-left"
            >
              {/* Category Radiogroup */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  What kind of feedback?
                </span>
                <div
                  role="radiogroup"
                  aria-label="Feedback category"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {CATEGORIES.map((cat, index) => {
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
                        onClick={() => handleCategorySelect(cat.id)}
                        onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative min-h-[110px] flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-amber-500 ${
                          isSelected
                            ? "bg-white dark:bg-slate-900 border-[#EA580C] ring-2 ring-[#EA580C]/25 shadow-md scale-[1.02]"
                            : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-amber-500/40 hover:bg-white dark:hover:bg-slate-850"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.iconBg} ${cat.iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 pt-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {cat.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {cat.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <label
                  htmlFor="feedback-message"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Your message
                </label>
                <div className="relative">
                  <textarea
                    id="feedback-message"
                    required
                    rows={5}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder="Tell us what happened, or what you'd like to see."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 pb-7 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 shadow-2xs font-medium leading-relaxed resize-y min-h-[130px]"
                  />
                  <span className="text-[10px] font-mono text-slate-400 absolute right-3 bottom-2">
                    {message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="feedback-email"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Your email <span className="text-slate-400 font-normal">(optional, if you'd like a reply)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 shadow-2xs font-medium min-h-[44px]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition min-h-[44px] cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{isSubmitting ? "Sending..." : "Send Feedback"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
