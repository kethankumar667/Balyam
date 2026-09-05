import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import StarRating from "../StarRating";
import { submitReview, getMyReviews, ReviewsClientError } from "../../lib/reviewsApi";
import { getGameById } from "../../catalog/gameCatalog";

interface RateThisGameCTAProps {
  gameId: string;
}

/**
 * Compact "rate this game" prompt for the post-match result screen. A
 * review needs both a rating AND a few words (the schema requires a
 * non-empty body), so this expands from a bare star row into a short
 * textarea only once the player picks a star — no separate page, no
 * friction until they've already signaled intent to rate.
 */
export default function RateThisGameCTA({ gameId }: RateThisGameCTAProps) {
  const [status, setStatus] = useState<"checking" | "unrated" | "already-rated" | "submitted">("checking");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyReviews()
      .then((res) => {
        if (cancelled) return;
        setStatus(res.reviews.some((r) => r.gameId === gameId) ? "already-rated" : "unrated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unrated");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (status === "checking" || status === "already-rated") return null;

  const gameName = getGameById(gameId)?.name ?? "this game";

  if (status === "submitted") {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-emerald-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="text-xs sm:text-sm font-bold">Thanks for rating {gameName}!</span>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1 || body.trim().length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitReview({ gameId, rating, body: body.trim() });
      setStatus("submitted");
    } catch (err) {
      if (err instanceof ReviewsClientError && err.code === "AlreadyReviewed") {
        setStatus("already-rated");
      } else {
        setError(err instanceof Error ? err.message : "Couldn't submit your rating. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#EADFC7] bg-[#FFFDF6] px-4 py-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-bold text-[#3E2C1E]">How was {gameName}?</span>
        <StarRating value={rating} onChange={setRating} size="md" label={`Rate ${gameName}`} />
      </div>
      {rating > 0 && (
        <div className="space-y-2">
          <textarea
            rows={2}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A few words about your experience..."
            className="w-full bg-white border border-[#EADFC7] rounded-xl p-2.5 text-xs text-[#3E2C1E] placeholder-[#B8A98C] focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-none"
          />
          {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
          <button
            type="button"
            disabled={isSubmitting || body.trim().length === 0}
            onClick={handleSubmit}
            className="w-full py-2 rounded-xl font-bold text-xs text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 transition cursor-pointer"
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      )}
    </div>
  );
}
