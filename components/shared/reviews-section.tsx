import { Star, MessageSquareText } from "lucide-react";
import type { ShearQueryReview } from "@/lib/reviews";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

// Server-renderable — reviews are fetched server-side (lib/reviews.ts's
// getApprovedReviews) and passed in as plain props, same pattern as the
// rest of the shop/salon profile pages' data flow.
export function ReviewsSection({ reviews, averageRating }: { reviews: ShearQueryReview[]; averageRating: number | null }) {
  return (
    <div className="pb-10 border-b border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-black text-slate-900">ShearQuery Reviews</h2>
        {averageRating != null && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {averageRating.toFixed(1)}
            <span className="text-slate-400 font-medium">({reviews.length})</span>
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="flex items-center gap-3 text-slate-500">
          <MessageSquareText className="w-5 h-5 text-slate-300 shrink-0" />
          <p className="text-sm">No reviews yet — be the first to share your experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <p className="font-bold text-slate-900 text-sm">{review.reviewerName}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{timeAgo(review.createdAt)}</span>
                </div>
              </div>
              {review.reviewText && (
                <p className="text-sm text-slate-600 leading-relaxed">{review.reviewText}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
