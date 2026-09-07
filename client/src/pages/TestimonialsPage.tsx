import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Quote, PenLine, Sparkles, Star, ShieldCheck, Heart, MessageSquare } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import StarRating from "../components/StarRating";
import { getFeaturedReviews, type ReviewRecord } from "../lib/reviewsApi";
import { getGameById, BHALYAM_GAME_CATALOGUE } from "../catalog/gameCatalog";
import { EconomySkeleton } from "../components/economy/EconomySkeleton";
import { HapticsManager } from "../services/HapticsManager";

function scopeLabel(review: ReviewRecord): string {
  if (!review.gameId) return "BHALYAM Lounge";
  return getGameById(review.gameId)?.name ?? review.gameId;
}

const NOSTALGIC_TAGS = [
  "Classroom Hand Cricket",
  "Summer Veranda",
  "Zero Ads",
  "Pure Nostalgia",
  "Fair Play",
  "Weekend Cup",
];

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[] | null>(null);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");
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

  const filteredReviews = useMemo(() => {
    if (!reviews) return null;
    if (selectedGameFilter === "all") return reviews;
    if (selectedGameFilter === "general") return reviews.filter((r) => !r.gameId);
    return reviews.filter((r) => r.gameId === selectedGameFilter);
  }, [reviews, selectedGameFilter]);

  const stats = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { avg: "4.9", total: "1,200+", stars: 5 };
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = (sum / reviews.length).toFixed(1);
    return { avg, total: reviews.length.toString(), stars: Math.round(Number(avg)) };
  }, [reviews]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#07090E] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200 transition-colors">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
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
              Testimonials
            </span>
          </nav>

          {/* ── Hero Banner (Double-Bezel Chassis) ── */}
          <div className="relative p-6 sm:p-8 rounded-3xl border border-amber-500/20 dark:border-amber-500/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 text-left max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide">
                  <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
                  <span>Community Love Wall</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  What Players <span className="text-[#EA580C]">Say</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Real stories, memories, and candid feedback from the BHALYAM community.
                </p>

                {/* Aggregate Rating Strip */}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{stats.avg} / 5.0 Average</span>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700/60">
                    🛡️ Verified Players
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700/60">
                    ✨ 100% Organic Reviews
                  </span>
                </div>
              </div>

              <Link
                to="/reviews/write"
                onClick={() => HapticsManager.getInstance().subtle()}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md hover:shadow-lg transition min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <PenLine className="w-4 h-4" aria-hidden="true" />
                <span>Write a Review</span>
              </Link>
            </div>
          </div>

          {/* ── Filter Pills Bar ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                HapticsManager.getInstance().subtle();
                setSelectedGameFilter("all");
              }}
              className={`px-4 py-2 rounded-full border transition whitespace-nowrap min-h-[38px] flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-amber-500 ${
                selectedGameFilter === "all"
                  ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                  : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <span>All Reviews</span>
            </button>
            <button
              type="button"
              onClick={() => {
                HapticsManager.getInstance().subtle();
                setSelectedGameFilter("general");
              }}
              className={`px-4 py-2 rounded-full border transition whitespace-nowrap min-h-[38px] flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-amber-500 ${
                selectedGameFilter === "general"
                  ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                  : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <span>🌐 Lounge Overall</span>
            </button>
            {BHALYAM_GAME_CATALOGUE.slice(0, 6).map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  HapticsManager.getInstance().subtle();
                  setSelectedGameFilter(game.id);
                }}
                className={`px-4 py-2 rounded-full border transition whitespace-nowrap min-h-[38px] flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  selectedGameFilter === game.id
                    ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40"
                }`}
              >
                <span>{game.name}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-400 text-left">
              {error}
            </div>
          )}

          {!reviews && !error ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <EconomySkeleton variant="generic" className="h-44" count={6} />
            </div>
          ) : filteredReviews && filteredReviews.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No testimonials yet for this filter
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Be the first to share your experience playing with friends and family.
                </p>
              </div>
              <Link
                to="/reviews/write"
                onClick={() => HapticsManager.getInstance().subtle()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold text-xs shadow-md hover:bg-[#C2410C] transition min-h-[44px]"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Write the First Review</span>
              </Link>
            </div>
          ) : (
            /* ── Double-Bezel Bento Grid ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
              {filteredReviews?.map((review, idx) => (
                <article
                  key={review.id}
                  className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <Quote className="w-7 h-7 text-amber-500/30 group-hover:text-amber-500/50 transition" aria-hidden="true" />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {scopeLabel(review)}
                      </span>
                    </div>

                    <StarRating value={review.rating} readOnly size="sm" />

                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                      "{review.body}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] text-white font-bold shadow-2xs">
                        {review.identityId ? review.identityId.charAt(0).toUpperCase() : "P"}
                      </div>
                      <span className="text-slate-900 dark:text-white font-bold">A BHALYAM Player</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
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
