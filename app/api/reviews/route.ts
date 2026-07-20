import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReviewEntityType } from "@/lib/reviews";

const VALID_ENTITY_TYPES: ReviewEntityType[] = ["shop", "salon", "barber", "cosmetologist", "school", "store"];

// "school" and "store" each actually span two underlying tables (barber
// vs. cosmetology school; barber vs. beauty supply store) — an id could
// belong to either, so the existence check below tries every candidate
// table for that type rather than assuming one.
const ENTITY_TABLES: Record<ReviewEntityType, string[]> = {
  shop: ["agent_barbershop_leads"],
  salon: ["agent_salon_leads"],
  barber: ["agent_barber_leads"],
  cosmetologist: ["agent_cosmetologist_leads"],
  school: ["agent_barber_school_leads", "agent_cosmetology_school_leads"],
  store: ["agent_barber_supply_store_leads", "agent_beauty_supply_store_leads"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public submission endpoint — no auth required (any site visitor can
// leave a ShearQuery review, same as most public review products).
// Reviews default to status='approved' (shown immediately, no moderation
// queue yet — see the 20260722000000 migration's comment on why that
// column still exists for a later moderation workflow).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityType, entityId, reviewerName, reviewerEmail, rating, reviewText } = body;

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ success: false, error: "Invalid entity type." }, { status: 400 });
    }
    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json({ success: false, error: "entityId is required." }, { status: 400 });
    }
    if (!reviewerName || typeof reviewerName !== "string" || !reviewerName.trim()) {
      return NextResponse.json({ success: false, error: "Your name is required." }, { status: 400 });
    }
    if (!reviewerEmail || typeof reviewerEmail !== "string" || !EMAIL_RE.test(reviewerEmail.trim())) {
      return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5 stars." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Confirm the entity actually exists before attaching a review to it
    // — prevents orphaned reviews from a stale/tampered entityId.
    const candidateTables = ENTITY_TABLES[entityType as ReviewEntityType];
    let entityExists = false;
    for (const table of candidateTables) {
      const { data: entity } = await admin.from(table).select("id").eq("id", entityId).maybeSingle();
      if (entity) { entityExists = true; break; }
    }
    if (!entityExists) {
      return NextResponse.json({ success: false, error: "That listing could not be found." }, { status: 404 });
    }

    const { error } = await (admin.from("shearquery_reviews") as any).insert({
      entity_type: entityType,
      entity_id: entityId,
      reviewer_name: reviewerName.trim(),
      reviewer_email: reviewerEmail.trim(),
      rating: numericRating,
      review_text: typeof reviewText === "string" ? reviewText.trim() || null : null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[reviews POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
