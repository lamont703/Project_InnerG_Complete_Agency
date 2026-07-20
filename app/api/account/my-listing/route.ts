import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOwnedEntity } from "@/lib/account/resolve-owned-entity";

// Fields a member is allowed to self-edit on their own linked entity.
// Deliberately excludes anything Google-sourced (rating, total_reviews,
// business_status) or system-managed (slug, claimed_at) — same public/
// private boundary reasoning as lib/public-columns.ts, just for "what's
// writable" instead of "what's readable". google_images has its own
// dedicated endpoint (my-listing/images) since it's a 5-slot upload flow,
// not a plain text field.
const EDITABLE_FIELDS = [
  "shop_name",
  "owner_name",
  "phone",
  "email",
  "website",
  "formatted_address",
  "hiring_need",
  "rent_type",
  "rent_rate",
  "booth_count_available",
  "specialty_desired",
  "ai_culture_summary",
] as const;

export async function GET() {
  const resolved = await resolveOwnedEntity();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: true, data: null });
  }

  const admin = createAdminClient();
  const { data: entity, error } = await (admin
    .from(resolved.table as any) as any)
    .select([...EDITABLE_FIELDS, "id", "slug", "google_images"].join(", "))
    .eq("id", resolved.link.entity_id)
    .maybeSingle();

  if (error || !entity) {
    return NextResponse.json({ success: false, error: error?.message || "Linked entity not found." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { entityType: resolved.link.entity_type, ...entity } });
}

export async function PATCH(req: Request) {
  const resolved = await resolveOwnedEntity();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No linked business to update." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No editable fields provided." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await (admin
      .from(resolved.table as any) as any)
      .update(updates)
      .eq("id", resolved.link.entity_id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[my-listing PATCH] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
