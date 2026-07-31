import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { writeReviewReply } from "@/lib/gbp-write";
import { draftRepliesFor, type GoogleReview } from "@/lib/gbp-review-replies";

/**
 * Unanswered reviews, with drafted replies.
 *
 *   GET  → the reviews with no reply yet, each with a draft to edit
 *   POST → publish one reply the owner has read
 *
 * A draft is never published by this route unless the request carries the text
 * the owner is sending. Generation and publication are deliberately separate
 * calls: there is no path here where a model's output reaches a customer
 * without a human having seen it.
 */

export const dynamic = "force-dynamic";

const V4 = "https://mybusiness.googleapis.com/v4";
const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";

async function resolveConnection() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;

  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();

  if (!conn?.refresh_token) return { error: "No Google Business Profile is connected.", status: 404 } as const;
  const locationName: string | null =
    conn.selected_location ||
    (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);
  if (!locationName) return { error: "No location selected.", status: 409 } as const;

  try {
    const token = await gbpAccessToken(conn.refresh_token);
    const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    const accountName = accountsRes.ok ? (await accountsRes.json())?.accounts?.[0]?.name ?? null : null;
    return { ctx, token, locationName, accountName } as const;
  } catch (e: any) {
    return { error: `Could not reach Google: ${e?.message}`, status: 502 } as const;
  }
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName, accountName } = resolved;
  if (!accountName) {
    return NextResponse.json({ success: false, error: "Could not resolve your Google account." }, { status: 502 });
  }

  const headers = { Authorization: `Bearer ${token}` };
  const [reviewsRes, locRes] = await Promise.all([
    fetch(`${V4}/${accountName}/${locationName}/reviews?pageSize=50`, { headers, cache: "no-store" }),
    fetch(`${BIZ_INFO}/${locationName}?readMask=title`, { headers, cache: "no-store" }),
  ]);

  if (!reviewsRes.ok) {
    return NextResponse.json({ success: false, error: "Could not read your reviews." }, { status: 502 });
  }

  const body = await reviewsRes.json();
  const reviews: GoogleReview[] = body?.reviews || [];
  const businessName = locRes.ok ? (await locRes.json())?.title || "this business" : "this business";

  const drafts = await draftRepliesFor(reviews, businessName);

  return NextResponse.json({
    success: true,
    businessName,
    totalReviews: body?.totalReviewCount ?? reviews.length,
    averageRating: body?.averageRating ?? null,
    unansweredCount: reviews.filter((r) => !r.reviewReply?.comment).length,
    drafts,
  });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName } = resolved;

  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) {
    return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });
  }

  const body = await req.json().catch(() => ({}));
  const reviewName: string = String(body?.reviewName || "");
  const comment: string = String(body?.comment || "");
  // Kept only to learn whether owners actually edit what we generate — a prompt
  // that produces text people rewrite every time isn't working.
  const generatedDraft: string | null = body?.generatedDraft ? String(body.generatedDraft) : null;

  if (!reviewName.includes("/reviews/")) {
    return NextResponse.json({ success: false, error: "A review must be specified." }, { status: 400 });
  }
  if (!comment.trim()) {
    return NextResponse.json({ success: false, error: "The reply is empty." }, { status: 400 });
  }
  // The reply must belong to the location this member has connected. Without
  // this, a crafted reviewName would let one member reply on another's listing.
  if (!reviewName.includes(locationName)) {
    return NextResponse.json({ success: false, error: "That review isn't on your listing." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "reviews",
      proposed: { reviewName, comment, generatedDraft, edited: generatedDraft ? generatedDraft.trim() !== comment.trim() : null },
      origin: "owner-approved reply",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeReviewReply({
    token,
    reviewName,
    comment,
    locationName,
    memberId: ctx.memberId,
    note: "owner-approved review reply",
  });

  if (request?.id) {
    await (admin.from("gbp_change_requests") as any)
      .update(
        write.ok
          ? { status: "applied", applied_at: new Date().toISOString(), snapshot_id: write.snapshotId }
          : { status: "failed", error: write.error, snapshot_id: write.snapshotId ?? null }
      )
      .eq("id", request.id);
  }

  if (!write.ok) {
    return NextResponse.json({ success: false, error: write.error }, { status: 502 });
  }
  return NextResponse.json({ success: true, reviewName, snapshotId: write.snapshotId });
}
