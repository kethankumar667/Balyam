import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Sparkles, Quote, Star, Award, ShieldCheck } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StarRating from "../components/StarRating";
import { BHALYAM_GAME_CATALOGUE, getGameById } from "../catalog/gameCatalog";
import { submitReview, ReviewsClientError } from "../lib/reviewsApi";
import { toast } from "../hooks/useToast";
import { HapticsManager } from "../services/HapticsManager";
import { useRoomStore } from "../store/roomStore";

const MAX_BODY_LENGTH = 2000;

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Needs improvement",
  2: "Fair, has potential",
  3: "Good casual fun",
  4: "Great experience!",
  5: "Nostalgic Masterpiece! 🏆",
};

export default function WriteReviewPage() {
  const [gameId, setGameId] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerName = useRoomStore((s) => s.playerName) || "A BHALYAM Player";
  const selectedGameMeta = gameId ? getGameById(gameId) : null;

  const handleRatingChange = (newRating: number) => {
    HapticsManager.getInstance().subtle();
    setRating(newRating);
    if (error && newRating > 0) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    if (body.trim().length === 0) {
      setError("Please write a few words about your experience.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    HapticsManager.getInstance().subtle();

    try {
      await submitReview({ rating, body: body.trim(), gameId: gameId || null });
      toast.success("Thanks for the review! It'll appear once our team approves it.");
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ReviewsClientError && err.code === "AlreadyReviewed") {
        toast.info("You've already reviewed this — thanks for sharing your thoughts!");
        setSubmitted(true);
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
        toast.error(message);
      }
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
              to="/testimonials"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              Testimonials
            </Link>
            <span className="text-slate-300 dark:text-slate-700">&gt;</span>
            <span className="text-slate-900 dark:text-white font-semibold">
              Write Review
            </span>
          </nav>

          {/* ── Header ── */}
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Player Voice</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Write a <span className="text-[#EA580C]">Review</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Tell other players what you think of BHALYAM, or of a specific game.
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
                  Review submitted!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                  Our team reviews every submission before it goes public. Thanks for taking the time to share your experience.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/testimonials"
                  onClick={() => HapticsManager.getInstance().subtle()}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer min-h-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  View Testimonials
                </Link>
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
            <div className="space-y-6">
              {/* ── Review Form (Double-Bezel Chassis) ── */}
              <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl space-y-6 shadow-xl text-left"
              >
                {/* Game Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="review-game"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    What are you reviewing?
                  </label>
                  <div className="relative">
                    <select
                      id="review-game"
                      value={gameId}
                      onChange={(e) => {
                        HapticsManager.getInstance().subtle();
                        setGameId(e.target.value);
                      }}
                      className="w-full appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 shadow-2xs font-medium min-h-[44px]"
                    >
                      <option value="">BHALYAM overall</option>
                      {BHALYAM_GAME_CATALOGUE.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Rating Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Your rating
                    </span>
                    {rating > 0 && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {RATING_DESCRIPTIONS[rating] || ""}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center">
                    <StarRating
                      value={rating}
                      onChange={handleRatingChange}
                      size="lg"
                      label="Your rating"
                    />
                  </div>
                </div>

                {/* Review Body */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="review-body"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Your review
                  </label>
                  <div className="relative">
                    <textarea
                      id="review-body"
                      required
                      rows={5}
                      maxLength={MAX_BODY_LENGTH}
                      placeholder="What did you like? What could be better?"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 pb-7 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] focus-visible:outline-2 focus-visible:outline-amber-500 shadow-2xs font-medium leading-relaxed resize-y min-h-[130px]"
                    />
                    <span className="text-[10px] font-mono text-slate-400 absolute right-3 bottom-2">
                      {body.length}/{MAX_BODY_LENGTH}
                    </span>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition min-h-[44px] cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Review"}</span>
                </button>
              </form>

              {/* ── Live Card Preview ── */}
              {rating > 0 && body.trim().length > 0 && (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Quote className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live Lounge Wall Preview</span>
                  </div>
                  <article className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <StarRating value={rating} readOnly size="sm" />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {selectedGameMeta ? selectedGameMeta.name : "BHALYAM"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">
                      "{body.trim()}"
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        {playerName}
                      </span>
                      <span>Just now</span>
                    </div>
                  </article>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
