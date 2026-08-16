"use client";

import { useState } from "react";
import { PostConversionAccountOffer } from "@/components/account/post-conversion-offer";
import { useRouter } from "next/navigation";
import { Star, PenLine, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ReviewEntityType } from "@/lib/reviews";

// Rendered inside the "ShearQuery Reviews" section header on the shop/salon
// profile pages (spacing is owned by that container, so no margin here) —
// only those two entity types render this today, but the API/schema
// underneath (see the 20260722000000 migration) already supports all 6
// entity types, so this same component works unchanged if wired onto
// barber/cosmetologist/school/store pages later.
export function WriteReviewButton({ entityType, entityId, entityName }: { entityType: ReviewEntityType; entityId: string; entityName: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Non-null once a review has been written: switches the modal to its
  // thank-you step, which is where the account offer lives.
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewText, setReviewText] = useState("");

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setReviewerName("");
    setReviewerEmail("");
    setReviewText("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reviewerName, reviewerEmail, rating, reviewText }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Thanks for your review!");
      /*
       * The modal used to close here. It now holds a short thank-you instead,
       * because a toast is not somewhere an account offer can live — it is gone
       * in four seconds and cannot be interacted with. The form is reset either
       * way, so dismissing lands in exactly the old state.
       */
      setSubmittedId(data.review_id ?? null);
      resetForm();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
      >
        <PenLine className="w-4 h-4" />
        Write A Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            {submittedId !== null ? (
              <div className="py-2">
                <h3 className="text-lg font-black text-slate-900">Thanks — that helps.</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Your review is in. It shows up on the listing once it&apos;s been checked over.
                </p>
                <PostConversionAccountOffer source="review" id={submittedId} className="mt-4" />
                <button
                  type="button"
                  onClick={() => { setSubmittedId(null); setIsOpen(false); }}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Done
                </button>
              </div>
            ) : (
            <>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-black text-slate-900 mb-1">Write a Review</h2>
            <p className="text-sm text-slate-500 mb-6">Share your experience with {entityName}.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5"
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400 ml-1">Never shown publicly.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Review</label>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What was your experience like?"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-0 transition-all outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 text-sm font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>
            </form>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
