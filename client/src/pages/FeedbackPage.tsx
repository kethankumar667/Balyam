import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Lightbulb, MoreHorizontal, Check, CheckCircle2, Send } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { submitFeedback, type FeedbackCategory } from "../lib/feedbackApi";
import { toast } from "../hooks/useToast";

interface CategoryMeta {
  id: FeedbackCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  { id: "bug", title: "Report a Bug", subtitle: "Something isn't working right.", icon: Bug },
  { id: "suggestion", title: "Suggest an Idea", subtitle: "A feature or improvement you'd like.", icon: Lightbulb },
  { id: "other", title: "Something Else", subtitle: "Anything else on your mind.", icon: MoreHorizontal },
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
      setCategory(CATEGORIES[nextIndex].id);
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
      <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#0B0F19] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="space-y-2 text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Leave us <span className="text-[#EA580C]">Feedback</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Found a bug, or have an idea? We read every message.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div role="status" aria-live="polite" className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Feedback received!</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                  Thanks for helping us make BHALYAM better.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition"
              >
                Return to Lounge
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">What kind of feedback?</span>
                <div role="radiogroup" aria-label="Feedback category" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        onClick={() => setCategory(cat.id)}
                        onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative min-h-[100px] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] ${
                          isSelected
                            ? "bg-white dark:bg-[#0F1424] border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-sm"
                            : "bg-white dark:bg-[#0F1424] border-[#EFEAE2] dark:border-[#222A44] hover:border-amber-500/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#EA580C] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <Icon className="w-5 h-5 text-[#EA580C]" />
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">{cat.title}</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{cat.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-message" className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                    className="w-full bg-white dark:bg-[#0F1424] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl p-3.5 pb-7 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium leading-relaxed resize-y"
                  />
                  <span className="text-[10px] font-mono text-slate-400 absolute right-3 bottom-2">
                    {message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your email <span className="text-slate-400 font-normal">(optional, if you'd like a reply)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-[#0F1424] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm shadow-sm hover:shadow-md transition min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] focus-visible:ring-offset-2"
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
