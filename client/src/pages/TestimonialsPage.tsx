import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Quote, PenLine } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StarRating from "../components/StarRating";
import { getFeaturedReviews, type ReviewRecord } from "../lib/reviewsApi";
import { getGameById } from "../catalog/gameCatalog";
import { EconomySkeleton } from "../components/economy/EconomySkeleton";

function scopeLabel(review: ReviewRecord): string {
  if (!review.gameId) return "BHALYAM";
  return getGameById(review.gameId)?.name ?? review.gameId;
}

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFeaturedReviews({ limit: 50 })
      .then((res) => {
        if (!cancelled) setReviews(res.reviews);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load testimonials right now. Please try again later.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#0B0F19] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                What Players <span className="text-[#EA580C]">Say</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium">
                Real reviews from the BHALYAM community.
              </p>
            </div>
            <Link
              to="/reviews/write"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition"
            >
              <PenLine className="w-4 h-4" aria-hidden="true" />
              <span>Write a Review</span>
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          {!reviews && !error ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <EconomySkeleton variant="generic" className="h-40" count={6} />
            </div>
          ) : reviews && reviews.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
              No testimonials yet — be the first to share your experience.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews?.map((review) => (
                <article
                  key={review.id}
                  className="bg-white dark:bg-[#151A2E] border border-[#EFEAE2] dark:border-[#222A44] rounded-2xl p-5 shadow-sm space-y-3 flex flex-col"
                >
                  <Quote className="w-6 h-6 text-[#EA580C]/40" aria-hidden="true" />
                  <StarRating value={review.rating} readOnly size="sm" />
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed flex-1">{review.body}</p>
                  <div className="pt-2 border-t border-[#EFEAE2] dark:border-[#222A44] flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>A BHALYAM Player</span>
                    <span>{scopeLabel(review)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
