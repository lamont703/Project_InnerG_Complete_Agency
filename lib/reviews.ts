import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewEntityType = "shop" | "salon" | "barber" | "cosmetologist" | "school" | "store";

export interface ShearQueryReview {
  id: string;
  reviewerName: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

export interface ReviewStats {
  count: number;
  averageRating: number | null;
}

// shearquery_reviews is locked to service-role-only RLS (see the
// 20260722000000 migration) specifically so reviewer_email can never be
// reached via a direct anon-key REST call — this function is the one
// place that ever reads the table, and it never selects or returns
// email, by construction rather than by RLS column policy (Postgres RLS
// is row-level only).
export async function getApprovedReviews(entityType: ReviewEntityType, entityId: string): Promise<ShearQueryReview[]> {
  const admin = createAdminClient();
  const { data, error } = await (admin
    .from("shearquery_reviews") as any)
    .select("id, reviewer_name, rating, review_text, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("[getApprovedReviews] Error:", error);
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    reviewerName: r.reviewer_name,
    rating: r.rating,
    reviewText: r.review_text,
    createdAt: r.created_at,
  }));
}

export function computeReviewStats(reviews: ShearQueryReview[]): ReviewStats {
  if (reviews.length === 0) return { count: 0, averageRating: null };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { count: reviews.length, averageRating: sum / reviews.length };
}
