import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOwnedEntity } from "@/lib/account/resolve-owned-entity";
import { splitOwnerName, parseFormattedAddress, composeOwnerName, composeFormattedAddress } from "@/lib/account/address-parsing";

// Fields a member is allowed to self-edit on their own linked entity.
// Deliberately excludes anything Google-sourced (rating, total_reviews,
// business_status) or system-managed (slug, claimed_at) — same public/
// private boundary reasoning as lib/public-columns.ts, just for "what's
// writable" instead of "what's readable". google_images has its own
// dedicated endpoint (my-listing/images) since it's a 5-slot upload flow,
// not a plain text field.
//
// owner_name/formatted_address are NOT directly editable here — they're
// derived from the structured fields below on every save (see PATCH) so
// the ~45 other files that still read those two flat columns keep working
// unchanged. See the 20260721000000 migration's comment for the full
// reasoning.
const EDITABLE_FIELDS = [
  "shop_name",
  "owner_first_name",
  "owner_last_name",
  "phone",
  "email",
  "website",
  "street_address",
  "address_city",
  "address_state",
  "address_zip",
  "hiring_need",
  "rent_type",
  "rent_rate",
  "booth_count_available",
  "specialty_desired",
  "ai_culture_summary",
  "custom_amenities",
] as const;

// Per explicit direction: only name, address, and contact info are
// required — the business-detail fields (rent terms, specialty, hiring
// toggle, about-your-shop) stay optional. website is intentionally left
// out too — not every claimed business has one.
const REQUIRED_FIELDS = [
  "owner_first_name",
  "owner_last_name",
  "street_address",
  "address_city",
  "address_state",
  "address_zip",
  "phone",
  "email",
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
    .select([...EDITABLE_FIELDS, "id", "slug", "google_images", "owner_name", "formatted_address"].join(", "))
    .eq("id", resolved.link.entity_id)
    .maybeSingle();

  if (error || !entity) {
    return NextResponse.json({ success: false, error: error?.message || "Linked entity not found." }, { status: 500 });
  }

  // First time an entity goes through this form, its structured fields
  // are empty — seed them from the legacy flat fields (real, often messy
  // scraped data) so the member starts from a reasonable pre-fill instead
  // of a blank form. Every field stays editable, so this is a starting
  // point, not a guarantee.
  if (!entity.owner_first_name && !entity.owner_last_name && entity.owner_name) {
    const { firstName, lastName } = splitOwnerName(entity.owner_name);
    entity.owner_first_name = firstName;
    entity.owner_last_name = lastName;
  }
  if (!entity.street_address && !entity.address_city && entity.formatted_address) {
    const { street, city, state, zip } = parseFormattedAddress(entity.formatted_address);
    entity.street_address = street;
    entity.address_city = city;
    entity.address_state = state || "TX";
    entity.address_zip = zip;
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

    const missing = REQUIRED_FIELDS.filter((field) => {
      const value = field in updates ? updates[field] : undefined;
      return value == null || String(value).trim() === "";
    });
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Re-derive the flat legacy fields from the structured ones on every
    // save — this is what keeps formatted_address/owner_name valid for
    // every other consumer without them ever needing to change.
    updates.owner_name = composeOwnerName(updates.owner_first_name, updates.owner_last_name);
    updates.formatted_address = composeFormattedAddress(
      updates.street_address,
      updates.address_city,
      updates.address_state,
      updates.address_zip
    );
    // city is a separate, historically-unreliable column read by some
    // city-matching queries elsewhere — a claimed entity's own clean city
    // value is strictly better than whatever it held before.
    if (updates.address_city) updates.city = updates.address_city;

    const admin = createAdminClient();
    const { error } = await (admin
      .from(resolved.table as any) as any)
      .update(updates)
      .eq("id", resolved.link.entity_id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updates });
  } catch (err: any) {
    console.error("[my-listing PATCH] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
