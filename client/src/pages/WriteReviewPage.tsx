import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StarRating from "../components/StarRating";
import { BHALYAM_GAME_CATALOGUE } from "../catalog/gameCatalog";
import { submitReview, ReviewsClientError } from "../lib/reviewsApi";
import { toast } from "../hooks/useToast";

const MAX_BODY_LENGTH = 2000;

export default function WriteReviewPage() {
  const [gameId, setGameId] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#0B0F19] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="space-y-2 text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Write a <span className="text-[#EA580C]">Review</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Tell other players what you think of BHALYAM, or of a specific game.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div role="status" aria-live="polite" className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Review submitted!</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                  Our team reviews every submission before it goes public. Thanks for taking the time.
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
              <div className="space-y-1.5">
                <label htmlFor="review-game" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  What are you reviewing?
                </label>
                <div className="relative">
                  <select
                    id="review-game"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full appearance-none bg-white dark:bg-[#0F1424] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium"
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

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Your rating</span>
                <StarRating value={rating} onChange={setRating} size="lg" label="Your rating" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="review-body" className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                    className="w-full bg-white dark:bg-[#0F1424] border border-[#EFEAE2] dark:border-[#222A44] rounded-xl p-3.5 pb-7 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] shadow-2xs font-medium leading-relaxed resize-y"
                  />
                  <span className="text-[10px] font-mono text-slate-400 absolute right-3 bottom-2">
                    {body.length}/{MAX_BODY_LENGTH}
                  </span>
                </div>
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
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>{isSubmitting ? "Submitting..." : "Submit Review"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
