import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";
import {
  gbpAccessToken,
  gbpFetchLocations,
  gbpFetchPhotos,
  gbpFetchReviews,
  pickCoverPhoto,
  cacheGbpPhotos,
  type GbpLocation,
} from "@/lib/google-business";

/**
 * "Sync from Google" — refill a claimed listing from the owner's Google
 * Business Profile on demand.
 *
 * A published listing starts thin: the connect flow only knows what Google
 * returned at staging time, and the owner is left staring at a mostly empty
 * edit form. This pulls their location again and fills what's still blank.
 *
 * It only ever fills EMPTY fields. Anything the owner has typed into their
 * listing is theirs and outranks Google — a sync that quietly reverted their
 * edits would be worse than no sync at all.
 */

// Enrichment target columns per table, mirroring the publish handler's config.
// The schemas genuinely differ: only shop/salon have the broken-out address
// parts, a summary and an amenities column.
const SYNC_FIELDS: Record<
  string,
  { addressParts?: boolean; summary?: string; amenities?: string; hours?: string; reviewCount?: string }
> = {
  agent_barbershop_leads: { addressParts: true, summary: "ai_culture_summary", amenities: "custom_amenities", hours: "google_hours", reviewCount: "total_reviews" },
  agent_salon_leads: { addressParts: true, summary: "ai_culture_summary", amenities: "custom_amenities", hours: "google_hours", reviewCount: "total_reviews" },
  // Schools count reviews in google_review_count, not total_reviews — writing
  // the wrong name doesn't error, it's just silently skipped as "no such
  // column", so a school would never have shown a review count at all.
  agent_barber_school_leads: { hours: "google_hours", reviewCount: "google_review_count" },
  agent_cosmetology_school_leads: { hours: "google_hours", reviewCount: "google_review_count" },
  agent_barber_supply_store_leads: { hours: "google_hours", reviewCount: "total_reviews" },
  agent_beauty_supply_store_leads: { hours: "google_hours", reviewCount: "total_reviews" },
};

const isBlank = (v: any) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Please sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ success: false, error: "No membership found." }, { status: 404 });
  const memberId = (member as any).id;

  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, entity_type, entity_id, status")
    .eq("community_member_id", memberId)
    .maybeSingle();

  if (!conn?.refresh_token) {
    return NextResponse.json(
      { success: false, error: "Google isn't connected. Connect it first." },
      { status: 400 }
    );
  }
  if (conn.status === "revoked") {
    return NextResponse.json(
      { success: false, error: "Access to your Google account was removed. Reconnect to sync again." },
      { status: 400 }
    );
  }
  if (!conn.entity_type || !conn.entity_id) {
    return NextResponse.json(
      { success: false, error: "No published listing is linked to this connection yet." },
      { status: 400 }
    );
  }

  const cfg = CLAIM_ENTITY_TYPES.find((t) => t.key === conn.entity_type);
  const fields = cfg ? SYNC_FIELDS[cfg.table] : undefined;
  if (!cfg || !fields) {
    return NextResponse.json({ success: false, error: "That listing type can't be synced." }, { status: 400 });
  }

  let locations: GbpLocation[] = [];
  let accessToken = "";
  try {
    accessToken = await gbpAccessToken(conn.refresh_token);
    locations = await gbpFetchLocations(accessToken);
  } catch (e: any) {
    console.error("[gbp sync] fetch failed:", e?.message);
    return NextResponse.json(
      { success: false, error: "Couldn't reach Google just now. Please try again." },
      { status: 502 }
    );
  }

  const loc =
    locations.find((l) => l.name === conn.selected_location) ||
    (locations.length === 1 ? locations[0] : null);
  if (!loc) {
    return NextResponse.json(
      { success: false, error: "Couldn't find that location on your Google account anymore." },
      { status: 404 }
    );
  }

  const { data: entity } = await (admin.from(cfg.table) as any)
    .select("*")
    .eq("id", conn.entity_id)
    .maybeSingle();
  if (!entity) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });

  // candidate column → value from Google, filtered to columns this table has
  // and values the owner hasn't already filled in.
  const candidates: Record<string, any> = {
    phone: loc.phone,
    website: loc.website,
    formatted_address: loc.address,
    city: loc.city,
    latitude: loc.lat,
    longitude: loc.lng,
    place_id: loc.placeId,
  };
  if (fields.addressParts) {
    candidates.street_address = loc.street;
    candidates.address_city = loc.city;
    candidates.address_state = loc.state;
    candidates.address_zip = loc.postalCode;
  }
  // Photos and reviews live on the legacy v4 API, which is separately enabled.
  // When it's off these come back flagged rather than throwing, so the rest of
  // the sync still completes and the owner is told what's missing and why.
  const notes: string[] = [];
  const imagesField = "google_images" in entity ? "google_images" : "google_photos" in entity ? "google_photos" : null;

  // Google's lh3 links aren't durable, so a listing already holding them counts
  // as needing photos even though the column isn't empty — otherwise the rows
  // synced before caching existed would keep expiring links forever.
  const holdsGoogleUrls =
    !!imagesField &&
    Array.isArray(entity[imagesField]) &&
    entity[imagesField].some((u: any) => typeof u === "string" && u.includes("googleusercontent.com"));
  const needsPhotos = !!imagesField && (isBlank(entity[imagesField]) || holdsGoogleUrls);
  const needsHero = "shop_image_url" in entity && isBlank(entity.shop_image_url);
  if (needsPhotos || needsHero) {
    const media = await gbpFetchPhotos(accessToken, loc.name, loc.account);
    if (media.disabled) {
      notes.push("Photos need the Google My Business API enabled on the Cloud project.");
    } else if (media.photos.length) {
      // Cover first, so the profile hero is the image the owner chose as their
      // cover rather than whatever happened to come back first.
      const cover = pickCoverPhoto(media.photos);
      const ordered = [
        ...(cover ? [cover] : []),
        ...media.photos.map((p) => p.url).filter((u) => u !== cover),
      ];
      const durable = await cacheGbpPhotos(admin, conn.entity_id, ordered);
      if (durable.length) {
        if (needsPhotos && imagesField) candidates[imagesField] = durable;
        if (needsHero) candidates.shop_image_url = durable[0];
      } else {
        notes.push("Couldn't copy the Google photos into storage — none were saved.");
      }
    }
  }
  const reviewCountField = fields.reviewCount;
  if (isBlank(entity.rating) || (reviewCountField && isBlank(entity[reviewCountField]))) {
    const reviews = await gbpFetchReviews(accessToken, loc.name, loc.account);
    if (reviews.disabled) {
      if (!notes.length) notes.push("Ratings need the Google My Business API enabled on the Cloud project.");
    } else {
      if (reviews.rating != null) candidates.rating = reviews.rating;
      if (reviews.count != null && reviewCountField) candidates[reviewCountField] = reviews.count;
    }
  }

  if (fields.summary) candidates[fields.summary] = loc.description;
  if (fields.amenities) candidates[fields.amenities] = loc.services?.length ? loc.services : null;
  if (fields.hours) candidates[fields.hours] = loc.hours;

  // Columns allowed to overwrite an existing value. Only the image list, and
  // only to replace expiring Google URLs with our own copies — everything else
  // stays fill-only, because the owner's edits outrank Google.
  const overwritable = new Set<string>(holdsGoogleUrls && imagesField ? [imagesField] : []);

  const patch: Record<string, any> = {};
  for (const [column, value] of Object.entries(candidates)) {
    if (isBlank(value)) continue;
    if (!(column in entity)) continue;      // table doesn't have it
    if (!isBlank(entity[column]) && !overwritable.has(column)) continue; // owner already filled it
    patch[column] = value;
  }

  if (Object.keys(patch).length === 0) {
    await (admin.from("gbp_connections") as any)
      .update({ last_synced_at: new Date().toISOString() })
      .eq("community_member_id", memberId);
    return NextResponse.json({
      success: true,
      filled: [],
      notes,
      message: notes.length
        ? `Nothing new to fill. ${notes.join(" ")}`
        : "Everything Google has is already on your listing.",
    });
  }

  const { error: updErr } = await (admin.from(cfg.table) as any).update(patch).eq("id", conn.entity_id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  await (admin.from("gbp_connections") as any)
    .update({ last_synced_at: new Date().toISOString() })
    .eq("community_member_id", memberId);

  const filled = Object.keys(patch);
  return NextResponse.json({
    success: true,
    filled,
    notes,
    message:
      `Filled ${filled.length} field${filled.length === 1 ? "" : "s"} from Google.` +
      (notes.length ? ` ${notes.join(" ")}` : ""),
  });
}
