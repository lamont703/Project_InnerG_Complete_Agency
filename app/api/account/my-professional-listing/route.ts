import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOwnedProfessional } from "@/lib/account/resolve-owned-entity";

/**
 * Self-edit for a claimed barber or cosmetologist profile — the person-shaped
 * counterpart to /api/account/my-listing.
 *
 * Separate route rather than a branch inside that one: the business route
 * composes owner_name, rebuilds formatted_address from its parts and geocodes
 * the result. None of those columns exist on a person, so sharing the handler
 * would mean a growing set of "unless it's a human" exceptions around writes
 * that must never reach these tables.
 *
 * Excluded from editing on purpose:
 *   • phone — it's the UNIQUE key both tables dedupe on (unique_phone /
 *     unique_cosmetologist_phone). Letting someone edit it into another
 *     professional's number fails with a raw 23505, and letting them edit it
 *     freely breaks the "are you already listed?" check that keeps duplicates
 *     out. Changing a number is a support action, not a form field.
 *   • slug — system-managed; changing it would break every link already
 *     published to that profile.
 *   • booksy_* and passport_* — sourced from elsewhere, not the member's to
 *     rewrite.
 */
const EDITABLE_FIELDS = [
  "name",
  "email",
  "website_url",
  "address",
  "metro_area",
  "specialty_type",
  "licensure_status",
  "school_name",
  "instagram_handle",
  "desired_pay_structure",
  "is_actively_looking",
] as const;

// Returned to the form but not writable here: portfolio_images has its own
// upload/delete endpoint (my-professional-listing/images), exactly as
// google_images does on the business route, and phone/slug are locked for the
// reasons above.
const READ_ONLY_FIELDS = ["id", "slug", "phone", "portfolio_images"] as const;

// A profile with no name or metro area isn't findable, which defeats the point
// of having one. Everything else is genuinely optional — a barber renting a
// chair may have no address, no website and no Instagram.
const REQUIRED_FIELDS = ["name", "metro_area"] as const;

export async function GET() {
  const resolved = await resolveOwnedProfessional();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) return NextResponse.json({ success: true, data: null });

  const admin = createAdminClient();
  const { data: entity, error } = await (admin.from(resolved.table as any) as any)
    .select([...EDITABLE_FIELDS, ...READ_ONLY_FIELDS].join(", "))
    .eq("id", resolved.link.entity_id)
    .maybeSingle();

  if (error || !entity) {
    return NextResponse.json(
      { success: false, error: error?.message || "Linked profile not found." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { entityType: resolved.link.entity_type, ...entity },
  });
}

export async function PATCH(req: Request) {
  const resolved = await resolveOwnedProfessional();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  if (!resolved.link) {
    return NextResponse.json({ success: false, error: "No professional profile is linked to this account." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};

  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    if (field === "is_actively_looking") {
      update[field] = !!value;
      continue;
    }
    const trimmed = typeof value === "string" ? value.trim() : value;
    update[field] = trimmed === "" ? null : trimmed;
  }

  // Normalise the handle so the profile page doesn't render "@@name" for
  // someone who typed the @ themselves.
  if (typeof update.instagram_handle === "string") {
    update.instagram_handle = update.instagram_handle.replace(/^@+/, "") || null;
  }

  const missing = REQUIRED_FIELDS.filter((f) => f in update && !update[f]);
  if (missing.length) {
    return NextResponse.json(
      { success: false, error: `${missing.join(" and ")} can't be empty.` },
      { status: 400 }
    );
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "Nothing to update." }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data: saved, error } = await (admin.from(resolved.table as any) as any)
    .update(update)
    .eq("id", resolved.link.entity_id)
    .select([...EDITABLE_FIELDS, ...READ_ONLY_FIELDS].join(", "))
    .maybeSingle();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: { entityType: resolved.link.entity_type, ...saved },
  });
}
